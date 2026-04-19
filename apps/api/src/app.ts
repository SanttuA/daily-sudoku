import {
  authSessionSchema,
  completeAttemptRequestSchema,
  completeAttemptResponseSchema,
  dailyLeaderboardResponseSchema,
  dailyPuzzleResponseSchema,
  historyResponseSchema,
  loginRequestSchema,
  puzzleDateSchema,
  signupRequestSchema,
} from '@daily-sudoku/contracts';
import {
  getPuzzleForUtcDate,
  normalizeUtcDate,
  validateSubmittedSolution,
} from '@daily-sudoku/puzzles';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';

import {
  buildSessionExpiry,
  clearSessionCookie,
  createSessionToken,
  hashPassword,
  hashSessionToken,
  sessionCookieName,
  setSessionCookie,
  verifyPassword,
} from './lib/auth';
import type { AppConfig } from './lib/config';
import {
  toAuthSession,
  toCompletionAttempt,
  toDailyPuzzleResponse,
  toLeaderboardResponse,
} from './lib/serializers';
import { createPrismaRepository } from './repositories/prisma-repository';
import type { Repository, StoredUser } from './repositories/types';

declare module 'fastify' {
  interface FastifyRequest {
    authUser: StoredUser | null;
    sessionTokenHash: string | null;
  }
}

type BuildAppOptions = {
  config: AppConfig;
  repository?: Repository;
  now?: () => Date;
};

const dateQuerySchema = z.object({
  date: puzzleDateSchema.optional(),
});

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const repository = options.repository ?? createPrismaRepository(options.config.databaseUrl);
  const now = options.now ?? (() => new Date());

  const app = Fastify({
    logger: {
      level: options.config.nodeEnv === 'production' ? 'info' : 'warn',
    },
  });

  app.decorateRequest('authUser', null);
  app.decorateRequest('sessionTokenHash', null);

  void app.register(cookie);
  void app.register(cors, {
    origin(origin, callback) {
      if (!origin || options.config.webOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed by CORS.'), false);
    },
    credentials: true,
  });
  void app.register(rateLimit, {
    global: false,
  });

  app.addHook('preHandler', async (request) => {
    const sessionToken = request.cookies[sessionCookieName];

    if (!sessionToken) {
      request.authUser = null;
      request.sessionTokenHash = null;
      return;
    }

    const tokenHash = hashSessionToken(sessionToken, options.config.sessionSecret);
    const session = await repository.findSessionUser(tokenHash, now());

    request.authUser = session?.user ?? null;
    request.sessionTokenHash = tokenHash;
  });

  app.get('/health', async () => ({ ok: true }));

  app.get('/auth/me', async (request) => authSessionSchema.parse(toAuthSession(request.authUser)));

  app.post(
    '/auth/signup',
    {
      config: {
        rateLimit: {
          max: options.config.rateLimitMax,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const body = signupRequestSchema.parse(request.body);
      const existingUser = await repository.findUserByEmail(body.email);

      if (existingUser) {
        return reply.code(409).send({ error: 'An account with that email already exists.' });
      }

      const passwordHash = await hashPassword(body.password);
      const user = await repository.createUser({
        email: body.email,
        displayName: body.displayName,
        passwordHash,
      });

      await createAndSetSession(repository, user.id, reply, options.config, now());

      return authSessionSchema.parse(toAuthSession(user));
    },
  );

  app.post(
    '/auth/login',
    {
      config: {
        rateLimit: {
          max: options.config.rateLimitMax,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const body = loginRequestSchema.parse(request.body);
      const user = await repository.findUserByEmail(body.email);

      if (!user || !(await verifyPassword(user.passwordHash, body.password))) {
        return reply.code(401).send({ error: 'Invalid email or password.' });
      }

      await createAndSetSession(repository, user.id, reply, options.config, now());

      return authSessionSchema.parse(toAuthSession(user));
    },
  );

  app.post('/auth/logout', async (request, reply) => {
    if (request.sessionTokenHash) {
      await repository.deleteSession(request.sessionTokenHash);
    }

    clearSessionCookie(reply);
    return reply.code(204).send();
  });

  app.get('/daily-puzzle', async (request) => {
    const query = dateQuerySchema.parse(request.query ?? {});
    const effectiveDate = resolvePuzzleDate(query.date, options.config.fixedUtcDate, now);
    const puzzle = getPuzzleForUtcDate(effectiveDate);
    const response = toDailyPuzzleResponse({
      puzzleDate: puzzle.puzzleDate,
      puzzleId: puzzle.id,
      difficulty: puzzle.difficulty,
      givens: puzzle.givens,
      editableCellCount: puzzle.editableCellCount,
    });

    return dailyPuzzleResponseSchema.parse(response);
  });

  app.get('/leaderboards/daily', async (request) => {
    const query = dateQuerySchema.parse(request.query ?? {});
    const effectiveDate = resolvePuzzleDate(query.date, options.config.fixedUtcDate, now);
    const entries = await repository.listDailyCompletions(effectiveDate);
    const response = toLeaderboardResponse(effectiveDate, entries, request.authUser?.id ?? null);

    return dailyLeaderboardResponseSchema.parse(response);
  });

  app.post(
    '/attempts/complete',
    {
      config: {
        rateLimit: {
          max: options.config.rateLimitMax,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      if (!request.authUser) {
        return reply.code(401).send({ error: 'Sign in to submit an official score.' });
      }

      const body = completeAttemptRequestSchema.parse(request.body);
      const puzzle = getPuzzleForUtcDate(body.puzzleDate);

      if (!validateSubmittedSolution(puzzle.givens, puzzle.solution, body.finalGrid)) {
        return reply.code(400).send({ error: 'Submitted grid is not a valid solution.' });
      }

      const savedAttempt = await repository.saveCompletionIfBetter({
        userId: request.authUser.id,
        puzzleDate: body.puzzleDate,
        puzzleId: puzzle.id,
        elapsedSeconds: body.elapsedSeconds,
        finalGrid: body.finalGrid,
        completedAt: now(),
      });

      const ranked = toLeaderboardResponse(
        body.puzzleDate,
        await repository.listDailyCompletions(body.puzzleDate),
        request.authUser.id,
      );
      const leaderboardEntry = ranked.currentUserEntry;

      if (!leaderboardEntry) {
        return reply.code(500).send({ error: 'Could not determine leaderboard placement.' });
      }

      return completeAttemptResponseSchema.parse({
        attempt: toCompletionAttempt(savedAttempt),
        leaderboardEntry,
      });
    },
  );

  app.get('/me/history', async (request, reply) => {
    if (!request.authUser) {
      return reply.code(401).send({ error: 'Sign in to view your history.' });
    }

    const attempts = await repository.listUserHistory(request.authUser.id);
    const response = {
      attempts: attempts.map(toCompletionAttempt),
    };

    return historyResponseSchema.parse(response);
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({
        error: error.issues[0]?.message ?? 'Invalid request.',
      });
    }

    app.log.error(error);
    return reply.code(500).send({ error: 'Internal server error.' });
  });

  app.addHook('onClose', async () => {
    await repository.close();
  });

  return app;
}

async function createAndSetSession(
  repository: Repository,
  userId: string,
  reply: FastifyReply,
  config: AppConfig,
  currentTime: Date,
): Promise<void> {
  const token = createSessionToken();
  const tokenHash = hashSessionToken(token, config.sessionSecret);

  await repository.createSession({
    userId,
    tokenHash,
    expiresAt: buildSessionExpiry(currentTime, config.sessionTtlDays),
  });

  setSessionCookie(reply, token, config);
}

function resolvePuzzleDate(
  requestedDate: string | undefined,
  fixedUtcDate: string | undefined,
  now: () => Date,
): string {
  return normalizeUtcDate(requestedDate ?? fixedUtcDate ?? now());
}
