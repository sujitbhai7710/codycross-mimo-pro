export interface ClueAnswer {
  number: number;
  clue: string;
  answer: string;
}

export type DataSource = 'live' | 'cached' | 'game-api' | 'fallback';

export interface DailyAnswers {
  date: string;
  title: string;
  clues: ClueAnswer[];
  totalClues: number;
  scrapedAt: string;
  source: DataSource;
  dataSource?: 'game-api' | 'web-scrape';
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: string;
  source?: DataSource;
  dataSource?: 'game-api' | 'web-scrape';
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

// Game API auth status
export interface GameApiStatus {
  isAvailable: boolean;
  hasAuth: boolean;
  deviceId: string | null;
  playerId: string | null;
  lastAuthTimestamp: string | null;
  authMethod: string | null;
}
