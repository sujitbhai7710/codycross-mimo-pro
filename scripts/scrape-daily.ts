/**
 * CodyCross Daily Answers Scraper
 *
 * Fetches daily crossword answers from codycross.info using z-ai-web-dev-sdk
 * and saves them to data/daily-answers.json
 *
 * Usage:
 *   npx tsx scripts/scrape-daily.ts
 *   npx tsx scripts/scrape-daily.ts 2026-03-30
 *   npx tsx scripts/scrape-daily.ts yesterday
 */

import ZAI from 'z-ai-web-dev-sdk';
import * as fs from 'fs';
import * as path from 'path';

const CODYCROSS_INFO_BASE = 'https://codycross.info/en/daily-archive';
const DATA_FILE = path.resolve(__dirname, '../data/daily-answers.json');

interface ClueAnswer {
  number: number;
  clue: string;
  answer: string;
}

interface DailyAnswers {
  date: string;
  title: string;
  clues: ClueAnswer[];
  totalClues: number;
  scrapedAt: string;
  source: 'live' | 'cached';
}

type AnswersStore = Record<string, DailyAnswers>;

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

function formatDateForUrl(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDate();
  const month = MONTH_NAMES[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatDateTitle(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const month = MONTH_NAMES[date.getMonth()];
  const monthCapitalized = month.charAt(0).toUpperCase() + month.slice(1);
  return `CodyCross Small Crossword - ${monthCapitalized} ${date.getDate()}, ${date.getFullYear()}`;
}

function parseHtmlToClues(html: string): ClueAnswer[] {
  const clues: ClueAnswer[] = [];
  const pattern =
    /<a href="[^"]*">([^<]+)<\/a>\s*<\/p>\s*<div class="alert alert-success"[^>]*>([^<]+)<\/div>/g;

  let match;
  while ((match = pattern.exec(html)) !== null) {
    let clueText = match[1].trim();
    const answer = match[2].trim();

    // Remove trailing period
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

function loadExistingData(): AnswersStore {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (error) {
    console.warn('Warning: Could not load existing data file, starting fresh.');
  }
  return {};
}

function saveData(store: AnswersStore): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

async function scrapeDate(dateStr: string): Promise<DailyAnswers | null> {
  const urlSlug = formatDateForUrl(dateStr);
  const url = `${CODYCROSS_INFO_BASE}/${urlSlug}-small-crossword`;

  console.log(`Fetching: ${url}`);

  try {
    const zai = await ZAI.create();
    const result = await zai.functions.invoke('page_reader', { url });

    const html = result?.data?.html;
    if (!html) {
      console.error(`  No HTML content returned for ${dateStr}`);
      return null;
    }

    const clues = parseHtmlToClues(html);
    if (clues.length === 0) {
      console.error(`  No clues found for ${dateStr}. Puzzle may not exist yet.`);
      return null;
    }

    console.log(`  Found ${clues.length} clues`);

    return {
      date: dateStr,
      title: formatDateTitle(dateStr),
      clues,
      totalClues: clues.length,
      scrapedAt: new Date().toISOString(),
      source: 'live',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`  Error: ${message}`);
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  let targetDate: string;

  if (args.length > 0) {
    const arg = args[0];
    if (arg === 'yesterday') {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      targetDate = d.toISOString().split('T')[0];
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(arg)) {
      targetDate = arg;
    } else {
      console.error('Invalid date format. Use YYYY-MM-DD or "yesterday".');
      process.exit(1);
    }
  } else {
    targetDate = new Date().toISOString().split('T')[0];
  }

  console.log(`=== CodyCross Daily Answers Scraper ===`);
  console.log(`Target date: ${targetDate}`);
  console.log('');

  const store = loadExistingData();
  const result = await scrapeDate(targetDate);

  if (result) {
    store[result.date] = result;
    saveData(store);
    console.log('');
    console.log(`Successfully saved ${result.totalClues} clues for ${result.date}`);
    console.log(`Data file: ${DATA_FILE}`);

    // Print clues
    console.log('');
    console.log(`--- ${result.title} ---`);
    for (const clue of result.clues) {
      console.log(`  ${clue.number}. ${clue.clue} = ${clue.answer}`);
    }
  } else {
    console.error('');
    console.error(`Failed to scrape data for ${targetDate}`);
    process.exit(1);
  }
}

main();
