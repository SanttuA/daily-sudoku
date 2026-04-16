import { z } from 'zod';

const utcDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const boardPattern = /^[0-9]{81}$/;
const solvedBoardPattern = /^[1-9]{81}$/;

export const puzzleDateSchema = z
  .string()
  .regex(utcDatePattern, 'Expected a UTC date in YYYY-MM-DD format.')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);

    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Expected a real UTC calendar date.');

export const boardStringSchema = z
  .string()
  .regex(boardPattern, 'Expected an 81-character Sudoku string containing digits 0-9.');

export const solvedBoardStringSchema = z
  .string()
  .regex(
    solvedBoardPattern,
    'Expected an 81-character solved Sudoku string containing digits 1-9.',
  );

export const emailSchema = z.string().trim().email().max(254);
export const displayNameSchema = z.string().trim().min(2).max(32);
export const passwordSchema = z.string().min(8).max(72);

export const difficultySchema = z.enum(['easy', 'medium', 'hard']);

export const userSchema = z.object({
  id: z.string(),
  email: emailSchema,
  displayName: displayNameSchema,
  createdAt: z.string().datetime(),
});

export const authSessionSchema = z.object({
  user: userSchema.nullable(),
});

export const signupRequestSchema = z.object({
  email: emailSchema,
  displayName: displayNameSchema,
  password: passwordSchema,
});

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const dailyPuzzleSchema = z.object({
  puzzleDate: puzzleDateSchema,
  puzzleId: z.string(),
  difficulty: difficultySchema,
  givens: boardStringSchema,
  editableCellCount: z.number().int().min(0).max(81),
});

export const dailyPuzzleResponseSchema = z.object({
  puzzle: dailyPuzzleSchema,
});

export const leaderboardEntrySchema = z.object({
  rank: z.number().int().positive(),
  userId: z.string(),
  displayName: displayNameSchema,
  puzzleDate: puzzleDateSchema,
  puzzleId: z.string(),
  elapsedSeconds: z.number().int().positive(),
  completedAt: z.string().datetime(),
});

export const dailyLeaderboardResponseSchema = z.object({
  puzzleDate: puzzleDateSchema,
  entries: z.array(leaderboardEntrySchema),
  currentUserEntry: leaderboardEntrySchema.nullable(),
});

export const completeAttemptRequestSchema = z.object({
  puzzleDate: puzzleDateSchema,
  elapsedSeconds: z
    .number()
    .int()
    .positive()
    .max(24 * 60 * 60),
  finalGrid: solvedBoardStringSchema,
});

export const completionAttemptSchema = z.object({
  id: z.string(),
  userId: z.string(),
  displayName: displayNameSchema,
  puzzleDate: puzzleDateSchema,
  puzzleId: z.string(),
  elapsedSeconds: z.number().int().positive(),
  finalGrid: solvedBoardStringSchema,
  completedAt: z.string().datetime(),
});

export const completeAttemptResponseSchema = z.object({
  attempt: completionAttemptSchema,
  leaderboardEntry: leaderboardEntrySchema,
});

export const historyResponseSchema = z.object({
  attempts: z.array(completionAttemptSchema),
});

export const apiErrorSchema = z.object({
  error: z.string(),
});

export type PuzzleDate = z.infer<typeof puzzleDateSchema>;
export type BoardString = z.infer<typeof boardStringSchema>;
export type SolvedBoardString = z.infer<typeof solvedBoardStringSchema>;
export type Difficulty = z.infer<typeof difficultySchema>;
export type User = z.infer<typeof userSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type SignupRequest = z.infer<typeof signupRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type DailyPuzzle = z.infer<typeof dailyPuzzleSchema>;
export type DailyPuzzleResponse = z.infer<typeof dailyPuzzleResponseSchema>;
export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;
export type DailyLeaderboardResponse = z.infer<typeof dailyLeaderboardResponseSchema>;
export type CompleteAttemptRequest = z.infer<typeof completeAttemptRequestSchema>;
export type CompletionAttempt = z.infer<typeof completionAttemptSchema>;
export type CompleteAttemptResponse = z.infer<typeof completeAttemptResponseSchema>;
export type HistoryResponse = z.infer<typeof historyResponseSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
