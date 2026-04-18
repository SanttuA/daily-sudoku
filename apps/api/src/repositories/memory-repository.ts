import { randomUUID } from 'node:crypto';

import type {
  CreateSessionInput,
  CreateUserInput,
  Repository,
  SaveCompletionInput,
  SessionUser,
  StoredCompletion,
  StoredUser,
} from './types';
import { DuplicateEmailError as DuplicateEmailErrorImpl } from './types';

type StoredSession = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
};

export function createMemoryRepository(): Repository {
  const users = new Map<string, StoredUser>();
  const usersByEmail = new Map<string, string>();
  const sessions = new Map<string, StoredSession>();
  const completions = new Map<string, StoredCompletion>();

  return {
    async createUser(input: CreateUserInput) {
      if (usersByEmail.has(input.email.toLowerCase())) {
        throw new DuplicateEmailErrorImpl();
      }

      const user: StoredUser = {
        id: randomUUID(),
        email: input.email.toLowerCase(),
        displayName: input.displayName,
        passwordHash: input.passwordHash,
        createdAt: new Date(),
      };

      users.set(user.id, user);
      usersByEmail.set(user.email, user.id);

      return user;
    },

    async findUserByEmail(email: string) {
      const userId = usersByEmail.get(email.toLowerCase());

      return userId ? (users.get(userId) ?? null) : null;
    },

    async createSession(input: CreateSessionInput) {
      sessions.set(input.tokenHash, {
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
      });
    },

    async findSessionUser(tokenHash: string, now: Date): Promise<SessionUser | null> {
      const session = sessions.get(tokenHash);

      if (!session) {
        return null;
      }

      if (session.expiresAt <= now) {
        sessions.delete(tokenHash);
        return null;
      }

      const user = users.get(session.userId);

      return user ? { user, expiresAt: session.expiresAt } : null;
    },

    async deleteSession(tokenHash: string) {
      sessions.delete(tokenHash);
    },

    async saveCompletionIfBetter(input: SaveCompletionInput) {
      const key = `${input.userId}:${input.puzzleDate}`;
      const existing = completions.get(key);
      const user = users.get(input.userId);

      if (!user) {
        throw new Error(`Unknown user ${input.userId}`);
      }

      if (
        existing &&
        (existing.elapsedSeconds < input.elapsedSeconds ||
          (existing.elapsedSeconds === input.elapsedSeconds &&
            existing.completedAt <= input.completedAt))
      ) {
        return existing;
      }

      const attempt: StoredCompletion = {
        id: existing?.id ?? randomUUID(),
        userId: input.userId,
        displayName: user.displayName,
        puzzleDate: input.puzzleDate,
        puzzleId: input.puzzleId,
        elapsedSeconds: input.elapsedSeconds,
        finalGrid: input.finalGrid,
        completedAt: input.completedAt,
      };

      completions.set(key, attempt);

      return attempt;
    },

    async listDailyCompletions(puzzleDate: string) {
      return [...completions.values()]
        .filter((attempt) => attempt.puzzleDate === puzzleDate)
        .sort(sortCompletions);
    },

    async listUserHistory(userId: string) {
      return [...completions.values()]
        .filter((attempt) => attempt.userId === userId)
        .sort((left, right) => right.puzzleDate.localeCompare(left.puzzleDate));
    },

    async close() {
      return undefined;
    },
  };
}

function sortCompletions(left: StoredCompletion, right: StoredCompletion): number {
  if (left.elapsedSeconds !== right.elapsedSeconds) {
    return left.elapsedSeconds - right.elapsedSeconds;
  }

  return left.completedAt.getTime() - right.completedAt.getTime();
}
