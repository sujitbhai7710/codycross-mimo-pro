import ZAI from 'z-ai-web-dev-sdk';
import { ApiResponse, DailyAnswers, ClueAnswer, ReverseEngineeringInfo } from './types';
import { format } from 'date-fns';

const CODYCROSS_INFO_BASE = 'https://codycross.info/en/daily-archive';

// In-memory cache to avoid repeated scraping
const cache = new Map<string, DailyAnswers>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Format a date string (YYYY-MM-DD) into the URL format used by codycross.info
 * e.g. "2026-03-30" -> "30-march-2026"
 */
function formatDateForUrl(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDate();
  const month = format(date, 'MMMM').toLowerCase();
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Format a date string into a readable title
 */
function formatDateTitle(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return `CodyCross Small Crossword - ${format(date, 'MMMM d, yyyy')}`;
}

/**
 * Parse the HTML from codycross.info to extract clue-answer pairs
 */
function parseHtmlToClues(html: string): ClueAnswer[] {
  const clues: ClueAnswer[] = [];

  // Pattern: clue text inside <a> tag, answer inside <div class="alert alert-success">
  // The HTML structure is:
  // <a href="...">Clue text.</a></p><div class="alert alert-success" ...>Answer</div>
  const pattern = /<a href="[^"]*">([^<]+)<\/a>\s*<\/p>\s*<div class="alert alert-success"[^>]*>([^<]+)<\/div>/g;

  let match;
  while ((match = pattern.exec(html)) !== null) {
    let clueText = match[1].trim();
    const answer = match[2].trim();

    // Remove trailing period from clue
    if (clueText.endsWith('.')) {
      clueText = clueText.slice(0, -1);
    }

    // Decode HTML entities
    clueText = clueText
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&rsquo;/g, "'")
      .replace(/&lsquo;/g, "'")
      .replace(/&ndash;/g, '–')
      .replace(/&mdash;/g, '—');

    if (clueText && answer) {
      clues.push({
        number: clues.length + 1,
        clue: clueText,
        answer,
      });
    }
  }

  return clues;
}

/**
 * Fetch and parse daily answers from codycross.info using z-ai-web-dev-sdk
 */
export async function fetchDailyAnswers(dateStr: string): Promise<ApiResponse<DailyAnswers>> {
  // Check cache first
  const cached = cache.get(dateStr);
  if (cached && Date.now() - new Date(cached.scrapedAt).getTime() < CACHE_TTL_MS) {
    return { success: true, data: { ...cached, source: 'cached' }, source: 'cached' };
  }

  try {
    const urlSlug = formatDateForUrl(dateStr);
    const url = `${CODYCROSS_INFO_BASE}/${urlSlug}-small-crossword`;

    const zai = await ZAI.create();
    const result = await zai.functions.invoke('page_reader', { url });

    const html = result?.data?.html;
    if (!html) {
      return {
        success: false,
        data: null,
        error: `No HTML content returned from codycross.info for ${dateStr}`,
      };
    }

    const clues = parseHtmlToClues(html);

    if (clues.length === 0) {
      return {
        success: false,
        data: null,
        error: `No clues found for ${dateStr}. The puzzle may not exist yet or the page structure has changed.`,
      };
    }

    const dailyAnswers: DailyAnswers = {
      date: dateStr,
      title: formatDateTitle(dateStr),
      clues,
      totalClues: clues.length,
      scrapedAt: new Date().toISOString(),
      source: 'live',
    };

    // Store in cache
    cache.set(dateStr, dailyAnswers);

    return { success: true, data: dailyAnswers, source: 'live' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, data: null, error: `Failed to fetch answers: ${message}` };
  }
}

/**
 * Get today's answers (or a specific date)
 */
export async function getTodayAnswers(dateStr?: string): Promise<ApiResponse<DailyAnswers>> {
  const today = dateStr || new Date().toISOString().split('T')[0];
  return fetchDailyAnswers(today);
}

/**
 * Get archive answers for a specific date
 */
export async function getArchiveAnswers(date: string): Promise<ApiResponse<DailyAnswers>> {
  return fetchDailyAnswers(date);
}

/**
 * Get reverse engineering info for the RE Findings dialog
 */
export function getReverseEngineeringInfo(): ReverseEngineeringInfo {
  return {
    version: '2.8.1',
    package: 'com.fanatee.cody',
    apiBase: 'https://game.codycross-game.com/',
    cdnBase: 'https://addressables.codycross-game.com/',
    endpoints: [
      '/TodaysCrossword',
      '/DDR/Daily/Date({date})',
      '/GetPuzzle',
      '/GetCifras',
      '/GetMundo',
      '/GetPuzzleSettings',
      '/v2/Chest/Collect',
    ],
    encryption: {
      method: 'PuzzleCrypto (AES-128/256 based)',
      hashing: 'MD5 (MD5Helper class)',
      responseEncryption: 'ApiResponseModelEncrypted',
    },
    authentication: {
      type: 'Token-based',
      headers: ['X-Client-Version', 'auth_token_string', 'accessToken'],
    },
    architecture: 'Unity IL2CPP (C# compiled to native ARM64)',
    worldCount: 104,
    keyClasses: [
      'Fanatee.CodyCross.Service.Util.Api.ApiCaller',
      'Fanatee.CodyCross.Domain.Crypto.PuzzleCrypto',
      'Fanatee.CodyCross.Domain.TodaysCrossword.TcYearMonth',
      'Fanatee.CodyCross.Domain.TodaysCrossword.TcDailyPuzzles',
      'Fanatee.CodyCross.Util.Hash.MD5Helper',
    ],
  };
}
