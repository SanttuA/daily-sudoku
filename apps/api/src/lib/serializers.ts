import type {
  AuthSession,
  CompletionAttempt,
  DailyLeaderboardResponse,
  DailyPuzzleResponse,
  LeaderboardEntry,
  User,
} from '@daily-sudoku/contracts';

import type { StoredCompletion, StoredUser } from '../repositories/types';

export function toUserContract(user: StoredUser): User {
  return {
    displayName: user.displayName,
  };
}

export function toAuthSession(user: StoredUser | null): AuthSession {
  return {
    user: user ? toUserContract(user) : null,
  };
}

export function toDailyPuzzleResponse(input: {
  puzzleDate: string;
  puzzleId: string;
  difficulty: 'easy' | 'medium' | 'hard';
  givens: string;
  editableCellCount: number;
}): DailyPuzzleResponse {
  return {
    puzzle: {
      puzzleDate: input.puzzleDate,
      puzzleId: input.puzzleId,
      difficulty: input.difficulty,
      givens: input.givens,
      editableCellCount: input.editableCellCount,
    },
  };
}

export function rankEntries(
  entries: StoredCompletion[],
  currentUserId: string | null,
): LeaderboardEntry[] {
  return entries.map((entry, index) => ({
    rank: index + 1,
    displayName: entry.displayName,
    puzzleDate: entry.puzzleDate,
    puzzleId: entry.puzzleId,
    elapsedSeconds: entry.elapsedSeconds,
    completedAt: entry.completedAt.toISOString(),
    isCurrentUser: currentUserId === entry.userId,
  }));
}

export function toCompletionAttempt(entry: StoredCompletion): CompletionAttempt {
  return {
    id: entry.id,
    userId: entry.userId,
    displayName: entry.displayName,
    puzzleDate: entry.puzzleDate,
    puzzleId: entry.puzzleId,
    elapsedSeconds: entry.elapsedSeconds,
    finalGrid: entry.finalGrid,
    completedAt: entry.completedAt.toISOString(),
  };
}

export function toLeaderboardResponse(
  puzzleDate: string,
  entries: StoredCompletion[],
  currentUserId: string | null,
): DailyLeaderboardResponse {
  const rankedEntries = rankEntries(entries, currentUserId);
  const currentUserEntry = currentUserId
    ? (rankedEntries.find((entry) => entry.isCurrentUser) ?? null)
    : null;

  return {
    puzzleDate,
    entries: rankedEntries,
    currentUserEntry,
  };
}
