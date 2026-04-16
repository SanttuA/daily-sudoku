type StoredPuzzleProgress = {
  puzzleDate: string;
  board: string;
  startedAt: string;
  completedAt?: string;
};

function getStorageKey(puzzleDate: string): string {
  return `daily-sudoku/progress/${puzzleDate}`;
}

export function loadProgress(puzzleDate: string): StoredPuzzleProgress | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(getStorageKey(puzzleDate));

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as StoredPuzzleProgress;
  } catch {
    return null;
  }
}

export function saveProgress(progress: StoredPuzzleProgress): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(getStorageKey(progress.puzzleDate), JSON.stringify(progress));
}

export function clearProgress(puzzleDate: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(getStorageKey(puzzleDate));
}
