export type StoredUser = {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  createdAt: Date;
};

export type StoredCompletion = {
  id: string;
  userId: string;
  displayName: string;
  puzzleDate: string;
  puzzleId: string;
  elapsedSeconds: number;
  finalGrid: string;
  completedAt: Date;
};

export type SessionUser = {
  user: StoredUser;
  expiresAt: Date;
};

export type CreateUserInput = {
  email: string;
  displayName: string;
  passwordHash: string;
};

export type CreateSessionInput = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
};

export type SaveCompletionInput = {
  userId: string;
  puzzleDate: string;
  puzzleId: string;
  elapsedSeconds: number;
  finalGrid: string;
  completedAt: Date;
};

export interface Repository {
  createUser(input: CreateUserInput): Promise<StoredUser>;
  findUserByEmail(email: string): Promise<StoredUser | null>;
  createSession(input: CreateSessionInput): Promise<void>;
  findSessionUser(tokenHash: string, now: Date): Promise<SessionUser | null>;
  deleteSession(tokenHash: string): Promise<void>;
  saveCompletionIfBetter(input: SaveCompletionInput): Promise<StoredCompletion>;
  listDailyCompletions(puzzleDate: string): Promise<StoredCompletion[]>;
  listUserHistory(userId: string): Promise<StoredCompletion[]>;
  close(): Promise<void>;
}
