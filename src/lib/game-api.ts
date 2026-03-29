/**
 * CodyCross Game API Module
 *
 * Server-side module that provides authenticated access to the CodyCross game API.
 * Falls back to web scraping (codycross.info) when the game API is unavailable.
 *
 * KEY DISCOVERY: Login uses GET /Player/login?deviceId=X (not POST).
 * Token is a UUID returned in Records[0].Token.
 * Puzzle data from /Puzzle/GetMundo is AES-encrypted (PuzzleCrypto).
 * Daily crossword endpoint exists (/Crossword/TodaysCrossword) but returns Status:1.
 *
 * Based on reverse engineering of CodyCross v2.8.1 APK (IL2CPP/Unity)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { DailyAnswers, ApiResponse } from './types';
import { fetchDailyAnswers } from './codycross-api';

// ============================================================
// Constants
// ============================================================

const API_BASE = 'https://game.codycross-game.com';
const APP_VERSION = '2.8.1';
const LANG = 'en';
const COUNTRY = 'US';
const DEVICE_TYPE = 'Android';
const DEVICE_MODEL = 'Pixel 7';
const OS_VERSION = '14';
const SDK_VERSION = '34';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DEVICE_PROFILE_PATH = path.resolve(DATA_DIR, 'device-profile.json');

const REQUEST_TIMEOUT_MS = 10000;

// In-memory cache
const gameApiCache = new Map<string, { data: DailyAnswers; timestamp: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Auth state
let authInitialized = false;
let authInProgress = false;
let lastAuthAttempt = 0;
const AUTH_COOLDOWN_MS = 30 * 60 * 1000; // 30 min between auth attempts

// ============================================================
// Types
// ============================================================

interface DeviceProfile {
  deviceId: string;
  deviceModel: string;
  deviceType: string;
  deviceInfo: {
    ram: string;
    osVersion: string;
    sdkVersion: string;
    brand: string;
    manufacturer: string;
    screenResolution: string;
    isPhysicalDevice: boolean;
  };
  authToken: string;
  accessToken: string;
  userLoginToken: string;
  playerId: string;
  appVersion: string;
  lang: string;
  country: string;
  createdAt: string | null;
  lastUsed: string | null;
  coins: number;
  authLog: Array<{ timestamp: string; action: string; status: string; details?: string }>;
}

// ============================================================
// Profile Management
// ============================================================

function loadProfile(): DeviceProfile | null {
  try {
    if (fs.existsSync(DEVICE_PROFILE_PATH)) {
      const raw = fs.readFileSync(DEVICE_PROFILE_PATH, 'utf-8');
      return JSON.parse(raw) as DeviceProfile;
    }
  } catch {
    // Silently fail
  }
  return null;
}

function saveProfile(profile: DeviceProfile): void {
  try {
    const dir = path.dirname(DEVICE_PROFILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DEVICE_PROFILE_PATH, JSON.stringify(profile, null, 2), 'utf-8');
  } catch {
    // Silently fail
  }
}

function createProfile(): DeviceProfile {
  return {
    deviceId: crypto.randomBytes(8).toString('hex'),
    deviceModel: DEVICE_MODEL,
    deviceType: DEVICE_TYPE,
    deviceInfo: {
      ram: '8GB',
      osVersion: OS_VERSION,
      sdkVersion: SDK_VERSION,
      brand: 'Google',
      manufacturer: 'Google',
      screenResolution: '1080x2400',
      isPhysicalDevice: true,
    },
    authToken: '',
    accessToken: '',
    userLoginToken: '',
    playerId: '',
    appVersion: APP_VERSION,
    lang: LANG,
    country: COUNTRY,
    createdAt: new Date().toISOString(),
    lastUsed: new Date().toISOString(),
    coins: 0,
    authLog: [],
  };
}

function hasValidAuth(profile: DeviceProfile | null): boolean {
  if (!profile) return false;
  return !!(profile.authToken);
}

// ============================================================
// HTTP Helpers
// ============================================================

function buildQueryParams(extra: Record<string, string> = {}): string {
  const params = new URLSearchParams({
    deviceType: DEVICE_TYPE,
    appVersion: APP_VERSION,
    androidLang: LANG,
    lang: LANG,
    country: COUNTRY,
    ...extra,
  });
  return params.toString();
}

function buildAuthQueryParams(profile: DeviceProfile | null): string {
  const params = buildQueryParams();
  if (profile?.authToken) {
    return `${params}&token=${profile.authToken}`;
  }
  return params;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = REQUEST_TIMEOUT_MS): Promise<{ ok: boolean; status: number; data: unknown; rawText: string }> {
  try {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(timeout),
    });
    const rawText = await response.text();
    let data: unknown;
    try { data = JSON.parse(rawText); } catch { data = rawText; }
    return { ok: response.ok, status: response.status, data, rawText };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      rawText: error instanceof Error ? error.message : 'Request failed',
    };
  }
}

// ============================================================
// Authentication
// ============================================================

async function performAuth(): Promise<DeviceProfile | null> {
  if (authInProgress) {
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 500));
      if (!authInProgress) {
        const profile = loadProfile();
        return hasValidAuth(profile) ? profile : null;
      }
    }
    return null;
  }

  if (Date.now() - lastAuthAttempt < AUTH_COOLDOWN_MS) {
    const profile = loadProfile();
    return hasValidAuth(profile) ? profile : null;
  }

  authInProgress = true;
  lastAuthAttempt = Date.now();

  try {
    let profile = loadProfile() || createProfile();

    // GET /Player/login?deviceId=X is the correct login method
    const loginUrl = `${API_BASE}/Player/login?${buildQueryParams({ deviceId: profile.deviceId })}`;
    const result = await fetchWithTimeout(loginUrl);

    if (result.status === 200 && result.data && typeof result.data === 'object') {
      const obj = result.data as { Ok: boolean; Status: number; Records: Array<Record<string, unknown>> };
      if (obj.Ok && obj.Records && obj.Records.length > 0) {
        profile.authToken = String(obj.Records[0].Token || '');
        profile.playerId = String(obj.Records[0].Id || '');
        profile.coins = Number(obj.Records[0].Coins) || 0;
        profile.lastUsed = new Date().toISOString();
        saveProfile(profile);
        authInitialized = true;
        console.log(`[GameAPI] Auth success: token=${profile.authToken}, player=${profile.playerId}`);
        return profile;
      }
    }

    profile.lastUsed = new Date().toISOString();
    saveProfile(profile);
    console.log('[GameAPI] Auth completed but no token obtained');
    return null;
  } catch (error) {
    console.log(`[GameAPI] Auth error: ${error instanceof Error ? error.message : 'Unknown'}`);
    return null;
  } finally {
    authInProgress = false;
  }
}

// ============================================================
// Game API Data Fetching
// ============================================================

async function fetchFromGameApi(dateStr: string): Promise<DailyAnswers | null> {
  let profile = loadProfile();
  if (!hasValidAuth(profile)) {
    profile = await performAuth();
  }

  if (!profile) {
    console.log('[GameAPI] No auth available, skipping game API');
    return null;
  }

  // Try /Crossword/TodaysCrossword (exists but currently returns Status:1)
  try {
    const result = await fetchWithTimeout(
      `${API_BASE}/Crossword/TodaysCrossword?${buildAuthQueryParams(profile)}`
    );

    if (result.status === 200 && result.data && typeof result.data === 'object') {
      const obj = result.data as { Ok: boolean; Status: number; Records: unknown[] };
      if (obj.Ok && obj.Records && obj.Records.length > 0) {
        console.log(`[GameAPI] Crossword/TodaysCrossword returned ${obj.Records.length} records`);
        // Parse the records - format is unknown, try generic extraction
        const clues = extractCluesFromResponse(result.data);
        if (clues.length > 0) {
          return {
            date: dateStr,
            title: `CodyCross Daily - ${dateStr} (Game API)`,
            clues: clues.map((c, i) => ({ number: i + 1, clue: c.clue, answer: c.answer })),
            totalClues: clues.length,
            scrapedAt: new Date().toISOString(),
            source: 'game-api',
            dataSource: 'game-api',
          };
        }
      }
      console.log(`[GameAPI] Crossword/TodaysCrossword: Status=${obj.Status} (disabled or needs params)`);
    }
  } catch {
    // Continue to fallback
  }

  console.log('[GameAPI] Game API did not return puzzle clues, falling back to web scraping');
  return null;
}

function extractCluesFromResponse(data: unknown, depth = 0, maxDepth = 6): Array<{ clue: string; answer: string }> {
  if (depth > maxDepth || !data || typeof data !== 'object') return [];

  const results: Array<{ clue: string; answer: string }> = [];
  const obj = data as Record<string, unknown>;

  const cluePatterns = ['clue', 'Clue', 'pergunta', 'Pergunta', 'dica', 'Dica', 'text', 'Text', 'texto', 'Texto', 'question', 'Question'];
  const answerPatterns = ['answer', 'Answer', 'resposta', 'Resposta', 'palavra', 'Palavra', 'word', 'Word'];

  let foundClue = '';
  let foundAnswer = '';
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value !== 'string') continue;
    for (const cp of cluePatterns) {
      if (key.toLowerCase().includes(cp.toLowerCase())) { foundClue = value; break; }
    }
    for (const ap of answerPatterns) {
      if (key.toLowerCase().includes(ap.toLowerCase())) { foundAnswer = value; break; }
    }
  }
  if (foundClue && foundAnswer) {
    results.push({ clue: foundClue, answer: foundAnswer });
    return results;
  }

  if (Array.isArray(data)) {
    for (const item of data) results.push(...extractCluesFromResponse(item, depth + 1, maxDepth));
  } else {
    for (const value of Object.values(obj)) {
      if (value && typeof value === 'object') results.push(...extractCluesFromResponse(value, depth + 1, maxDepth));
    }
  }
  return results;
}

// ============================================================
// Public API
// ============================================================

/**
 * Fetch daily answers - tries game API first, falls back to web scraping
 */
export async function getDailyAnswersWithGameApi(dateStr: string): ApiResponse<DailyAnswers> {
  // Check cache
  const cached = gameApiCache.get(dateStr);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { success: true, data: { ...cached.data, source: 'cached' }, source: 'cached' };
  }

  // Try game API first
  try {
    const gameData = await fetchFromGameApi(dateStr);
    if (gameData && gameData.totalClues > 0) {
      gameApiCache.set(dateStr, { data: gameData, timestamp: Date.now() });
      return { success: true, data: gameData, source: 'live', dataSource: 'game-api' };
    }
  } catch (error) {
    console.log(`[GameAPI] Error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  // Fallback to web scraping
  console.log('[GameAPI] Falling back to web scraping (codycross.info)...');
  const scrapeResult = await fetchDailyAnswers(dateStr);
  return {
    ...scrapeResult,
    dataSource: 'web-scrape',
  };
}

/**
 * Get auth status for UI display
 */
export function getGameApiStatus(): {
  isAvailable: boolean;
  hasAuth: boolean;
  lastAuthAttempt: number;
  deviceId: string | null;
  playerId: string | null;
} {
  const profile = loadProfile();
  return {
    isAvailable: true,
    hasAuth: hasValidAuth(profile),
    lastAuthAttempt,
    deviceId: profile?.deviceId || null,
    playerId: profile?.playerId || null,
  };
}

/**
 * Force re-authentication
 */
export async function reAuthenticate(): Promise<boolean> {
  lastAuthAttempt = 0;
  const profile = await performAuth();
  return hasValidAuth(profile);
}
