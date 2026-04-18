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
import Fastify from 'fastify';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
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
import { DuplicateEmailError } from './repositories/types';
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

const authRateLimitMax = 5;
const rateLimitWindowMs = 60_000;
const apiContentSecurityPolicy =
  "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const repository = options.repository ?? createPrismaRepository();
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

      callback(null, false);
    },
    credentials: true,
  });

  const signupRateLimit = createFixedWindowRateLimiter(
    authRateLimitMax,
    rateLimitWindowMs,
    buildAuthRateLimitKey,
  );
  const loginRateLimit = createFixedWindowRateLimiter(
    authRateLimitMax,
    rateLimitWindowMs,
    buildAuthRateLimitKey,
  );
  const completionRateLimit = createFixedWindowRateLimiter(
    options.config.rateLimitMax,
    rateLimitWindowMs,
    buildAttemptRateLimitKey,
  );

  app.addHook('onRequest', async (_request, reply) => {
    applyApiSecurityHeaders(reply, options.config.nodeEnv);
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
      preHandler: ensureAllowedWriteOrigin(options.config),
      preValidation: [signupRateLimit],
    },
    async (request, reply) => {
      const body = signupRequestSchema.parse(request.body);

      let user: StoredUser;

      try {
        const passwordHash = await hashPassword(body.password);
        user = await repository.createUser({
          email: body.email,
          displayName: body.displayName,
          passwordHash,
        });
      } catch (error) {
        if (error instanceof DuplicateEmailError) {
          app.log.info('Rejected duplicate signup attempt.');
          return reply.code(400).send({ error: 'Could not create account.' });
        }

        throw error;
      }

      await createAndSetSession(repository, user.id, reply, options.config, now());

      return authSessionSchema.parse(toAuthSession(user));
    },
  );

  app.post(
    '/auth/login',
    {
      preHandler: ensureAllowedWriteOrigin(options.config),
      preValidation: [loginRateLimit],
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

  app.post(
    '/auth/logout',
    {
      preHandler: ensureAllowedWriteOrigin(options.config),
    },
    async (request, reply) => {
      if (request.sessionTokenHash) {
        await repository.deleteSession(request.sessionTokenHash);
      }

      clearSessionCookie(reply);
      return reply.code(204).send();
    },
  );

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
      preHandler: [ensureAllowedWriteOrigin(options.config), completionRateLimit],
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

function buildAuthRateLimitKey(request: FastifyRequest): string {
  return `auth:${request.ip}:${extractNormalizedEmail(request.body)}`;
}

function buildAttemptRateLimitKey(request: FastifyRequest): string {
  return request.authUser?.id ? `attempt:${request.authUser.id}` : `attempt:${request.ip}`;
}

function extractNormalizedEmail(body: unknown): string {
  if (!body || typeof body !== 'object' || !('email' in body)) {
    return 'unknown';
  }

  const email = body.email;

  return typeof email === 'string' ? email.trim().toLowerCase() : 'unknown';
}

function ensureAllowedWriteOrigin(config: AppConfig) {
  return async function allowedWriteOriginGuard(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    if (config.nodeEnv === 'test') {
      return;
    }

    const requestOrigin = extractRequestOrigin(request);

    if (requestOrigin && config.webOrigins.includes(requestOrigin)) {
      return;
    }

    reply.code(403).send({ error: 'Origin not allowed.' });
  };
}

function extractRequestOrigin(request: FastifyRequest): string | null {
  const explicitOrigin = readOriginHeader(request.headers.origin);

  if (explicitOrigin) {
    return explicitOrigin;
  }

  return readRefererOrigin(request.headers.referer);
}

function readOriginHeader(value: string | string[] | undefined): string | null {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function readRefererOrigin(value: string | string[] | undefined): string | null {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function applyApiSecurityHeaders(reply: FastifyReply, nodeEnv: AppConfig['nodeEnv']): void {
  reply.header('Content-Security-Policy', apiContentSecurityPolicy);
  reply.header(
    'Permissions-Policy',
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
  );
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'DENY');

  if (nodeEnv === 'production') {
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
}

function createFixedWindowRateLimiter(
  max: number,
  timeWindowMs: number,
  keyGenerator: (request: FastifyRequest) => string,
) {
  const counters = new Map<string, { count: number; resetsAt: number }>();

  return async function fixedWindowRateLimiter(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const key = keyGenerator(request);
    const currentTime = Date.now();
    const existingCounter = counters.get(key);

    if (!existingCounter || existingCounter.resetsAt <= currentTime) {
      counters.set(key, {
        count: 1,
        resetsAt: currentTime + timeWindowMs,
      });
      return;
    }

    existingCounter.count += 1;

    if (existingCounter.count <= max) {
      return;
    }

    reply.header(
      'Retry-After',
      Math.max(1, Math.ceil((existingCounter.resetsAt - currentTime) / 1000)).toString(),
    );
    reply.code(429).send({ error: 'Too many requests.' });
  };
}
