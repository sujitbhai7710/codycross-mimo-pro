export interface CodyClue {
  direction: 'across' | 'down';
  number: number;
  clue: string;
  answer: string;
  position: { row: number; col: number };
}

export interface PuzzleGroup {
  id: string;
  groupName: string;
  theme: string;
  clues: CodyClue[];
  secretWord: string;
  difficulty: string;
}

export interface DailyCrossword {
  date: string;
  puzzleGroups: PuzzleGroup[];
  month: number;
  year: number;
  dayOfYear: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: string;
  source: 'api' | 'cache' | 'fallback';
}

export interface ArchiveEntry {
  date: string;
  groupCount: number;
  theme: string;
}
