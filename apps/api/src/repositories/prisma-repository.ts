import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import type {
  CreateSessionInput,
  CreateUserInput,
  Repository,
  SaveCompletionInput,
  SessionUser,
  StoredCompletion,
} from './types';

export function createPrismaRepository(
  databaseUrl: string,
  prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  }),
): Repository {
  return {
    async createUser(input: CreateUserInput) {
      return prisma.user.create({
        data: {
          email: input.email.toLowerCase(),
          displayName: input.displayName,
          passwordHash: input.passwordHash,
        },
      });
    },

    async findUserByEmail(email: string) {
      return prisma.user.findUnique({
        where: {
          email: email.toLowerCase(),
        },
      });
    },

    async createSession(input: CreateSessionInput) {
      await prisma.session.create({
        data: input,
      });
    },

    async findSessionUser(tokenHash: string, now: Date): Promise<SessionUser | null> {
      const session = await prisma.session.findUnique({
        where: {
          tokenHash,
        },
        include: {
          user: true,
        },
      });

      if (!session) {
        return null;
      }

      if (session.expiresAt <= now) {
        await prisma.session.delete({
          where: {
            tokenHash,
          },
        });

        return null;
      }

      return {
        user: session.user,
        expiresAt: session.expiresAt,
      };
    },

    async deleteSession(tokenHash: string) {
      await prisma.session.deleteMany({
        where: {
          tokenHash,
        },
      });
    },

    async saveCompletionIfBetter(input: SaveCompletionInput) {
      return prisma.$transaction(async (transaction) => {
        const existing = await transaction.completionAttempt.findUnique({
          where: {
            userId_puzzleDate: {
              userId: input.userId,
              puzzleDate: input.puzzleDate,
            },
          },
          include: {
            user: true,
          },
        });

        if (
          existing &&
          (existing.elapsedSeconds < input.elapsedSeconds ||
            (existing.elapsedSeconds === input.elapsedSeconds &&
              existing.completedAt <= input.completedAt))
        ) {
          return mapCompletion(existing);
        }

        const saved = existing
          ? await transaction.completionAttempt.update({
              where: {
                userId_puzzleDate: {
                  userId: input.userId,
                  puzzleDate: input.puzzleDate,
                },
              },
              data: {
                puzzleId: input.puzzleId,
                elapsedSeconds: input.elapsedSeconds,
                finalGrid: input.finalGrid,
                completedAt: input.completedAt,
              },
              include: {
                user: true,
              },
            })
          : await transaction.completionAttempt.create({
              data: input,
              include: {
                user: true,
              },
            });

        return mapCompletion(saved);
      });
    },

    async listDailyCompletions(puzzleDate: string) {
      const attempts = await prisma.completionAttempt.findMany({
        where: {
          puzzleDate,
        },
        orderBy: [
          {
            elapsedSeconds: 'asc',
          },
          {
            completedAt: 'asc',
          },
        ],
        include: {
          user: true,
        },
      });

      return attempts.map(mapCompletion);
    },

    async listUserHistory(userId: string) {
      const attempts = await prisma.completionAttempt.findMany({
        where: {
          userId,
        },
        orderBy: [
          {
            puzzleDate: 'desc',
          },
        ],
        include: {
          user: true,
        },
      });

      return attempts.map(mapCompletion);
    },

    async close() {
      await prisma.$disconnect();
    },
  };
}

function mapCompletion(attempt: {
  id: string;
  userId: string;
  puzzleDate: string;
  puzzleId: string;
  elapsedSeconds: number;
  finalGrid: string;
  completedAt: Date;
  user: {
    displayName: string;
  };
}): StoredCompletion {
  return {
    id: attempt.id,
    userId: attempt.userId,
    displayName: attempt.user.displayName,
    puzzleDate: attempt.puzzleDate,
    puzzleId: attempt.puzzleId,
    elapsedSeconds: attempt.elapsedSeconds,
    finalGrid: attempt.finalGrid,
    completedAt: attempt.completedAt,
  };
}
