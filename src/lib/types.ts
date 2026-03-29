export interface ClueAnswer {
  number: number;
  clue: string;
  answer: string;
}

export interface DailyAnswers {
  date: string;
  title: string;
  clues: ClueAnswer[];
  totalClues: number;
  scrapedAt: string;
  source: 'live' | 'cached';
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: string;
  source?: 'live' | 'cached';
}

// Keep RE info type for the findings dialog
export interface ReverseEngineeringInfo {
  version: string;
  package: string;
  apiBase: string;
  cdnBase: string;
  endpoints: string[];
  encryption: Record<string, string>;
  authentication: Record<string, string | string[]>;
  architecture: string;
  worldCount: number;
  keyClasses: string[];
}
