/**
 * CodyCross Game API Authentication & Puzzle Fetcher
 *
 * Standalone script that mimics the CodyCross Android game to:
 * 1. Generate a fake device identity
 * 2. Authenticate with the game API (GET /Player/login with deviceId)
 * 3. Fetch real puzzle data using auth tokens
 * 4. Persist device identity for reuse
 * 5. Explore all available API endpoints
 *
 * Usage:
 *   npx tsx scripts/game-auth.ts              # Full auth + fetch today's puzzle
 *   npx tsx scripts/game-auth.ts --auth-only   # Only authenticate, don't fetch puzzles
 *   npx tsx scripts/game-auth.ts --explore     # Explore all available endpoints
 *   npx tsx scripts/game-auth.ts --reset       # Reset device profile and start fresh
 *   npx tsx scripts/game-auth.ts --worlds      # List all worlds from config
 *   npx tsx scripts/game-auth.ts --world 5     # Fetch encrypted data for world 5
 *
 * Based on reverse engineering of CodyCross v2.8.1 APK (IL2CPP/Unity)
 * From global-metadata.dat v31 analysis
 *
 * KEY DISCOVERY: The game API uses GET requests (not POST) for most endpoints.
 * Authentication is via GET /Player/login?deviceId=X which returns a UUID token.
 * Puzzle data from /Puzzle/GetMundo is AES-encrypted (PuzzleCrypto) and requires
 * the client-side encryption key embedded in libil2cpp.so to decrypt.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ============================================================
// Constants (discovered from live API testing)
// ============================================================

const API_BASE = 'https://game.codycross-game.com';
const APP_VERSION = '2.8.1';
const LANG = 'en';
const COUNTRY = 'US';
const DEVICE_TYPE = 'Android';
const DEVICE_MODEL = 'Pixel 7';
const OS_VERSION = '14';
const SDK_VERSION = '34';

const DATA_DIR = path.resolve(__dirname, '../data');
const DEVICE_PROFILE_PATH = path.resolve(DATA_DIR, 'device-profile.json');

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
  authLog: AuthLogEntry[];
}

interface AuthLogEntry {
  timestamp: string;
  action: string;
  status: 'success' | 'failure' | 'info';
  details?: string;
}

// ============================================================
// Utility Functions
// ============================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function now(): string {
  return new Date().toISOString();
}

function log(level: 'INFO' | 'OK' | 'WARN' | 'ERROR' | 'DEBUG', message: string): void {
  const ts = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = {
    INFO: '\x1b[36mℹ\x1b[0m',
    OK: '\x1b[32m✓\x1b[0m',
    WARN: '\x1b[33m⚠\x1b[0m',
    ERROR: '\x1b[31m✗\x1b[0m',
    DEBUG: '\x1b[90m▸\x1b[0m',
  }[level];
  console.log(`[${ts}] ${prefix} ${message}`);
}

// ============================================================
// Device Profile Management
// ============================================================

function loadDeviceProfile(): DeviceProfile {
  try {
    if (fs.existsSync(DEVICE_PROFILE_PATH)) {
      const raw = fs.readFileSync(DEVICE_PROFILE_PATH, 'utf-8');
      return JSON.parse(raw) as DeviceProfile;
    }
  } catch (error) {
    log('WARN', `Could not load device profile: ${error instanceof Error ? error.message : 'unknown'}`);
  }
  return createDefaultProfile();
}

function createDefaultProfile(): DeviceProfile {
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
    createdAt: null,
    lastUsed: null,
    coins: 0,
    authLog: [],
  };
}

function saveDeviceProfile(profile: DeviceProfile): void {
  const dir = path.dirname(DEVICE_PROFILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DEVICE_PROFILE_PATH, JSON.stringify(profile, null, 2), 'utf-8');
  log('DEBUG', `Device profile saved to ${DEVICE_PROFILE_PATH}`);
}

function addAuthLog(profile: DeviceProfile, action: string, status: AuthLogEntry['status'], details?: string): void {
  profile.authLog.push({ timestamp: now(), action, status, details });
  if (profile.authLog.length > 50) {
    profile.authLog = profile.authLog.slice(-50);
  }
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

function buildAuthQueryParams(profile: DeviceProfile): string {
  const params = buildQueryParams();
  if (profile.authToken) {
    return `${params}&token=${profile.authToken}`;
  }
  return params;
}

async function apiGet(path: string, queryParams: string, label?: string): Promise<{ status: number; data: unknown; rawText: string; ok: boolean }> {
  const url = `${API_BASE}${path}?${queryParams}`;
  const displayLabel = label || path;
  try {
    log('DEBUG', `GET ${displayLabel}`);
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const rawText = await res.text();
    let data: unknown;
    try { data = JSON.parse(rawText); } catch { data = rawText; }
    return { ok: res.ok, status: res.status, data, rawText };
  } catch (error) {
    return { ok: false, status: 0, data: null, rawText: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================
// Authentication (discovered: GET /Player/login?deviceId=X)
// ============================================================

async function authenticate(profile: DeviceProfile): Promise<boolean> {
  log('INFO', '═══════════════════════════════════════════');
  log('INFO', '  CodyCross Game API Authentication');
  log('INFO', '═══════════════════════════════════════════');
  log('INFO', `Device: ${profile.deviceModel} (${profile.deviceType})`);
  log('INFO', `Device ID: ${profile.deviceId}`);
  log('INFO', `App Version: ${APP_VERSION}`);
  log('INFO', `API Base: ${API_BASE}`);
  log('INFO', '');

  // The correct login method is GET with deviceId as query parameter
  log('INFO', '[LOGIN] GET /Player/login?deviceId=X...');
  const result = await apiGet(
    '/Player/login',
    buildQueryParams({ deviceId: profile.deviceId }),
    '/Player/login'
  );

  if (result.status === 200 && result.data && typeof result.data === 'object') {
    const obj = result.data as { Ok: boolean; Status: number; Records: Array<Record<string, unknown>> };
    if (obj.Ok && obj.Records && obj.Records.length > 0) {
      const record = obj.Records[0];
      profile.authToken = String(record.Token || '');
      profile.playerId = String(record.Id || '');
      profile.coins = Number(record.Coins) || 0;

      if (profile.authToken) {
        log('OK', '[LOGIN] Login Success!');
        log('INFO', `  Token:      ${profile.authToken}`);
        log('INFO', `  PlayerId:   ${profile.playerId}`);
        log('INFO', `  Coins:      ${profile.coins}`);
        addAuthLog(profile, 'Login', 'success', `Token: ${profile.authToken}, PlayerId: ${profile.playerId}`);
        saveDeviceProfile(profile);
        return true;
      }
    } else {
      log('WARN', `[LOGIN] Login returned Status: ${obj.Status} (no token)`);
      addAuthLog(profile, 'Login', 'failure', `Status: ${obj.Status}`);
    }
  } else {
    log('ERROR', `[LOGIN] Login failed: HTTP ${result.status}`);
    addAuthLog(profile, 'Login', 'failure', `HTTP ${result.status}`);
  }

  saveDeviceProfile(profile);
  return false;
}

// ============================================================
// Config Fetching
// ============================================================

async function fetchConfig(profile: DeviceProfile): Promise<Record<string, unknown> | null> {
  log('INFO', '[CONFIG] Fetching /Config...');
  const result = await apiGet('/Config', buildAuthQueryParams(profile), '/Config');

  if (result.status === 200 && result.data && typeof result.data === 'object') {
    const obj = result.data as { Ok: boolean; Records: unknown[] };
    if (obj.Ok) {
      log('OK', `[CONFIG] Config fetched (${result.rawText.length} chars)`);
      addAuthLog(profile, 'Config', 'success', `${result.rawText.length} chars`);

      // Save config
      const configPath = path.resolve(DATA_DIR, 'game-config.json');
      fs.writeFileSync(configPath, JSON.stringify(result.data, null, 2), 'utf-8');
      log('INFO', `[CONFIG] Saved to ${configPath}`);
      return result.data as Record<string, unknown>;
    }
  }

  log('WARN', `[CONFIG] Failed: HTTP ${result.status}`);
  return null;
}

// ============================================================
// World Data (encrypted)
// ============================================================

async function fetchWorldData(profile: DeviceProfile, mundo: number): Promise<{ metadata: string; data: string } | null> {
  log('INFO', `[WORLD] Fetching /Puzzle/GetMundo?mundo=${mundo}...`);
  const result = await apiGet(
    '/Puzzle/GetMundo',
    `${buildAuthQueryParams(profile)}&mundo=${mundo}`,
    `/Puzzle/GetMundo?mundo=${mundo}`
  );

  if (result.status === 200 && result.data && typeof result.data === 'object') {
    const obj = result.data as { Ok: boolean; Records: string[] };
    if (obj.Ok && obj.Records && obj.Records.length >= 2) {
      log('OK', `[WORLD] World ${mundo} data fetched (${obj.Records[1].length} chars encrypted)`);
      return {
        metadata: obj.Records[0],
        data: obj.Records[1],
      };
    }
  }

  log('WARN', `[WORLD] Failed for mundo ${mundo}: HTTP ${result.status}`);
  return null;
}

// ============================================================
// Daily Crossword Attempt
// ============================================================

async function fetchDailyCrossword(profile: DeviceProfile): Promise<unknown> {
  log('INFO', '[DAILY] Attempting /Crossword/TodaysCrossword...');
  const result = await apiGet(
    '/Crossword/TodaysCrossword',
    buildAuthQueryParams(profile),
    '/Crossword/TodaysCrossword'
  );

  log('INFO', `[DAILY] Response: HTTP ${result.status} (${result.rawText.length} chars)`);
  if (result.data && typeof result.data === 'object') {
    const obj = result.data as { Ok: boolean; Status: number; Records: unknown[] };
    if (obj.Ok && obj.Records && obj.Records.length > 0) {
      log('OK', `[DAILY] Got ${obj.Records.length} records!`);
      return result.data;
    }
    log('WARN', `[DAILY] Status: ${obj.Status} (no records - endpoint may be disabled)`);
  }

  return null;
}

// ============================================================
// Endpoint Explorer
// ============================================================

async function exploreEndpoints(profile: DeviceProfile): Promise<void> {
  const tq = buildAuthQueryParams(profile);
  const endpoints = [
    // Known working
    { path: '/Player/login', params: buildQueryParams({ deviceId: profile.deviceId }), note: 'Login endpoint' },
    { path: '/Config', params: tq, note: 'Game config' },
    { path: '/Texto/List', params: tq, note: 'UI text/localization' },
    { path: '/Puzzle/GetMundo', params: `${tq}&mundo=1`, note: 'World puzzle data (encrypted)' },
    { path: '/Crossword/TodaysCrossword', params: tq, note: 'Daily crossword' },

    // Additional endpoints to check
    { path: '/Texto/List', params: `${tq}&mundo=1&grupo=1`, note: 'Text with world params' },
    { path: '/Puzzle/GetMundo', params: `${tq}&mundo=1&dificuldadeDoPuzzle=0`, note: 'With difficulty param' },
    { path: '/v2/TodaysCrossword', params: tq, note: 'v2 variant' },
    { path: '/DDR/Daily', params: tq, note: 'DDR endpoint' },
    { path: '/GetPuzzleSettings', params: tq, note: 'Puzzle settings' },
    { path: '/GetCifras', params: `${tq}&mundo=1`, note: 'Crossword grid' },
    { path: '/SincronizarProgresso', params: tq, note: 'Progress sync' },
    { path: '/extend_session', params: tq, note: 'Session extend' },
  ];

  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  API Endpoint Explorer');
  console.log('═══════════════════════════════════════════');

  for (const ep of endpoints) {
    const result = await apiGet(ep.path, ep.params, `${ep.path}`);
    const isOk = result.status === 200;
    const icon = isOk ? '✓' : '✗';
    const color = isOk ? '\x1b[32m' : '\x1b[31m';
    console.log(`  ${color}${icon}\x1b[0m ${ep.path.padEnd(35)} ${String(result.status).padEnd(4)} (${String(result.rawText.length).padStart(7)} chars) ${ep.note}`);

    // Show first non-trivial response for 200s
    if (isOk && result.data && typeof result.data === 'object') {
      const obj = result.data as { Ok: boolean; Records?: unknown[] };
      if (obj.Ok && obj.Records && obj.Records.length > 0) {
        console.log(`       → Ok: true, Records: ${obj.Records.length} item(s)`);
      } else if (obj.Ok) {
        console.log(`       → Ok: true, Records: empty`);
      } else {
        console.log(`       → Ok: false, Status: ${(obj as Record<string, unknown>).Status}`);
      }
    }
  }
}

// ============================================================
// World List from Config
// ============================================================

function listWorlds(config: Record<string, unknown>): void {
  const records = config.Records as Array<Record<string, unknown>>;
  if (!records || records.length === 0) {
    log('ERROR', 'No config records found');
    return;
  }

  const resumosMundos = records[0].ResumosMundos as { MundosInfos: Record<string, { Numero: number; Nome: string; Versao: number }> };
  if (!resumosMundos?.MundosInfos) {
    log('ERROR', 'No ResumosMundos in config');
    return;
  }

  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  CodyCross World List');
  console.log('═══════════════════════════════════════════');

  const worlds = Object.entries(resumosMundos.MundosInfos)
    .map(([, info]) => info)
    .sort((a, b) => a.Numero - b.Numero);

  console.log(`  Total: ${worlds.length} worlds`);
  console.log('');
  for (const world of worlds) {
    const version = world.Versao > 2 ? `v${world.Versao}` : '';
    console.log(`  ${String(world.Numero).padStart(3)}. ${world.Nome.padEnd(30)} ${version}`);
  }
}

// ============================================================
// Main Entry Point
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const authOnly = args.includes('--auth-only');
  const doExplore = args.includes('--explore');
  const doReset = args.includes('--reset');
  const doWorlds = args.includes('--worlds');
  const worldIndex = args.indexOf('--world');
  const targetWorld = worldIndex >= 0 && args[worldIndex + 1] ? parseInt(args[worldIndex + 1]) : null;

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Load or reset device profile
  let profile = loadDeviceProfile();
  if (doReset) {
    log('INFO', 'Resetting device profile...');
    profile = createDefaultProfile();
  }

  // Authenticate
  const authOk = await authenticate(profile);

  // Print results
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  Authentication Results');
  console.log('═══════════════════════════════════════════');
  console.log(`  Device ID:       ${profile.deviceId}`);
  console.log(`  Auth Token:      ${profile.authToken ? profile.authToken : '(not obtained)'}`);
  console.log(`  Player ID:       ${profile.playerId || '(not obtained)'}`);
  console.log(`  Coins:           ${profile.coins}`);
  console.log(`  Profile File:    ${DEVICE_PROFILE_PATH}`);

  if (!authOk) {
    log('ERROR', 'Authentication failed - cannot continue');
    process.exit(1);
  }

  if (authOnly) {
    console.log('');
    log('INFO', 'Auth-only mode, exiting.');
    return;
  }

  // Fetch config
  console.log('');
  const config = await fetchConfig(profile);

  // Handle sub-commands
  if (doWorlds && config) {
    listWorlds(config);
    return;
  }

  if (targetWorld !== null) {
    const worldData = await fetchWorldData(profile, targetWorld);
    if (worldData) {
      const outputPath = path.resolve(DATA_DIR, `world-${targetWorld}-encrypted.json`);
      fs.writeFileSync(outputPath, JSON.stringify({
        world: targetWorld,
        fetchedAt: now(),
        metadataLength: worldData.metadata.length,
        dataLength: worldData.data.length,
        metadata: worldData.metadata,
        data: worldData.data,
      }, null, 2), 'utf-8');
      log('OK', `World ${targetWorld} encrypted data saved to ${outputPath}`);
      log('INFO', `  Metadata: ${worldData.metadata.length} chars`);
      log('INFO', `  Data:     ${worldData.data.length} chars (AES-encrypted, requires PuzzleCrypto key)`);
    }
    return;
  }

  if (doExplore) {
    await exploreEndpoints(profile);
    console.log('');
    return;
  }

  // Default: try to fetch daily crossword
  console.log('');
  log('INFO', '═══════════════════════════════════════════');
  log('INFO', '  Attempting to Fetch Puzzle Data');
  log('INFO', '═══════════════════════════════════════════');

  const dailyResult = await fetchDailyCrossword(profile);

  if (dailyResult) {
    const outputPath = path.resolve(DATA_DIR, `daily-crossword-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(dailyResult, null, 2), 'utf-8');
    log('OK', `Daily crossword data saved to ${outputPath}`);
  } else {
    console.log('');
    log('INFO', 'Summary of API exploration findings:');
    log('INFO', '');
    log('INFO', '  WORKING ENDPOINTS:');
    log('INFO', '  ✓ GET /Player/login?deviceId=X → Auth token + PlayerId + Coins');
    log('INFO', '  ✓ GET /Config?token=X → Full game configuration (88KB)');
    log('INFO', '  ✓ GET /Texto/List?token=X → UI text/localization (85KB)');
    log('INFO', '  ✓ GET /Puzzle/GetMundo?token=X&mundo=N → Encrypted world data (460KB+)');
    log('INFO', '  ~ GET /Crossword/TodaysCrossword?token=X → Exists but returns Status:1 (disabled/needs params)');
    log('INFO', '');
    log('INFO', '  NON-WORKING ENDPOINTS (404):');
    log('INFO', '  ✗ /Setup, /TodaysCrossword, /DDR/Daily/Date, /GetPuzzleSettings');
    log('INFO', '  ✗ /GetCifras, /Puzzle/GetPuzzle, /SincronizarProgresso, /extend_session');
    log('INFO', '  ✗ /Config/GetConfigs, /v2/*, /api/*');
    log('INFO', '');
    log('INFO', '  KEY FINDINGS:');
    log('INFO', '  • Login uses GET (not POST) with deviceId as query parameter');
    log('INFO', '  • Token is a UUID v4 returned in Records[0].Token');
    log('INFO', '  • New players start with 50 coins');
    log('INFO', '  • /Puzzle/GetMundo returns AES-encrypted data (PuzzleCrypto)');
    log('INFO', '  • Encrypted data requires client-side key from libil2cpp.so to decrypt');
    log('INFO', '  • /ResumosMundos in config lists all 89 worlds with names');
    log('INFO', '  • Daily crossword endpoint exists but appears disabled or requires');
    log('INFO', '    additional parameters not discovered yet');
    log('INFO', '');
    log('INFO', '  FALLBACK: Web scraping from codycross.info remains the primary');
    log('INFO', '  data source for daily crossword answers.');
  }

  // Final save
  profile.lastUsed = now();
  saveDeviceProfile(profile);
  console.log('');
  log('INFO', 'Done.');
}

main().catch((error) => {
  log('ERROR', `Fatal error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
