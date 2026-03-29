'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  Search,
  Shield,
  Code,
  Database,
  Globe,
  Cpu,
  Key,
  RefreshCw,
  CheckCircle2,
  Clock,
  Zap,
  BookOpen,
  AlertTriangle,
  Wifi,
  WifiOff,
  Layers,
} from 'lucide-react';
import { format, subDays, addDays, isToday, isBefore, startOfDay } from 'date-fns';

// ---- Types ----
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

// ---- Clue Card Component ----
function ClueCard({ clue, isRevealed, onToggle }: { clue: ClueAnswer; isRevealed: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-start gap-3 py-3 px-4 rounded-lg border border-border/50 hover:bg-accent/50 transition-all duration-200 group">
      <div className="flex-shrink-0 mt-0.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white text-xs font-bold shadow-sm">
          {clue.number}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-relaxed">{clue.clue}</p>
        {isRevealed ? (
          <div className="mt-1.5 flex items-center gap-2">
            <span className="font-mono text-base font-bold tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
              {clue.answer}
            </span>
          </div>
        ) : (
          <div className="mt-1.5 flex items-center gap-2">
            <span className="font-mono text-base tracking-[0.2em] text-muted-foreground/40 select-none">
              {'●'.repeat(Math.min(clue.answer.length, 20))}
            </span>
          </div>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="flex-shrink-0 h-8 w-8 p-0 hover:bg-accent"
        aria-label={isRevealed ? 'Hide answer' : 'Reveal answer'}
      >
        {isRevealed ? (
          <EyeOff className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Eye className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>
    </div>
  );
}

// ---- Loading Skeleton ----
function LoadingSkeleton() {
  return (
    <Card className="overflow-hidden border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="h-7 w-7 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ---- Reverse Engineering Info Dialog ----
function ReInfoDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Shield className="h-4 w-4" />
          <span className="hidden sm:inline">RE Findings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Reverse Engineering Analysis Report
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 text-sm">
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" /> App Architecture
            </h3>
            <p className="text-muted-foreground">
              CodyCross v2.8.1 (com.fanatee.cody) is built with Unity using IL2CPP compilation
              (C# compiled to native ARM64). The game logic resides in{' '}
              <code className="bg-background px-1 py-0.5 rounded text-xs">libil2cpp.so</code> (83MB){' '}
              with metadata in{' '}
              <code className="bg-background px-1 py-0.5 rounded text-xs">global-metadata.dat</code>{' '}
              (17MB).
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" /> API Endpoints Discovered
            </h3>
            <p className="text-muted-foreground mb-2">
              Base URL:{' '}
              <code className="bg-background px-1 py-0.5 rounded text-xs font-mono">
                https://game.codycross-game.com/
              </code>
            </p>
            <ul className="space-y-1 text-muted-foreground">
              <li className="flex items-center gap-2">
                <Code className="h-3 w-3" /> <code className="text-xs">/TodaysCrossword</code> —
                Daily crossword data
              </li>
              <li className="flex items-center gap-2">
                <Code className="h-3 w-3" /> <code className="text-xs">/DDR/Daily/Date({'{date}'})</code>{' '}
                — Date-based puzzle
              </li>
              <li className="flex items-center gap-2">
                <Code className="h-3 w-3" /> <code className="text-xs">/GetPuzzle</code> — Fetch
                puzzle data
              </li>
              <li className="flex items-center gap-2">
                <Code className="h-3 w-3" /> <code className="text-xs">/GetCifras</code> —
                Crossword grid data
              </li>
              <li className="flex items-center gap-2">
                <Code className="h-3 w-3" /> <code className="text-xs">/GetMundo</code> — World/map
                data
              </li>
            </ul>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Key className="h-4 w-4 text-primary" /> Encryption & Authentication
            </h3>
            <ul className="space-y-1 text-muted-foreground">
              <li>
                <strong>Encryption:</strong> PuzzleCrypto class (AES-128/256) with PuzzleCryptoContent
              </li>
              <li>
                <strong>Hashing:</strong> MD5 via MD5Helper class for data integrity
              </li>
              <li>
                <strong>Response:</strong> ApiResponseModelEncrypted for encrypted responses
              </li>
              <li>
                <strong>Auth:</strong> Token-based (auth_token_string, accessToken headers)
              </li>
            </ul>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" /> Key Classes Found
            </h3>
            <ul className="space-y-1 text-muted-foreground text-xs font-mono">
              <li>Fanatee.CodyCross.Service.Util.Api.ApiCaller</li>
              <li>Fanatee.CodyCross.Domain.Crypto.PuzzleCrypto</li>
              <li>Fanatee.CodyCross.Domain.TodaysCrossword.TcYearMonth</li>
              <li>Fanatee.CodyCross.Domain.TodaysCrossword.TcDailyPuzzles</li>
              <li>Fanatee.CodyCross.Util.Hash.MD5Helper</li>
            </ul>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> Data Source
            </h3>
            <p className="text-muted-foreground">
              After discovering that the game API requires authentication tokens, we found that{' '}
              <a
                href="https://codycross.info"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-primary/80 inline-flex items-center gap-1"
              >
                codycross.info <ExternalLink className="h-3 w-3" />
              </a>{' '}
              publishes all daily answers publicly. This site is now used as the live data source via
              web scraping with z-ai-web-dev-sdk page_reader.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- Main Page Component ----
export default function CodyCrossPage() {
  const [activeTab, setActiveTab] = useState('today');
  const [data, setData] = useState<DailyAnswers | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [archiveDate, setArchiveDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [revealedAnswers, setRevealedAnswers] = useState<Set<number>>(new Set());
  const [allRevealed, setAllRevealed] = useState(false);

  useEffect(() => {
    fetchAnswers(format(selectedDate, 'yyyy-MM-dd'));
    setRevealedAnswers(new Set());
    setAllRevealed(false);
    setSearchQuery('');
  }, [selectedDate]);

  const fetchAnswers = async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/today?date=${date}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || 'Failed to load answers');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchArchive = async (date: string) => {
    setLoading(true);
    setError(null);
    setRevealedAnswers(new Set());
    setAllRevealed(false);
    try {
      const res = await fetch(`/api/archive?date=${date}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || 'Failed to load archive');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredClues = useMemo(() => {
    if (!data) return [];
    if (!searchQuery.trim()) return data.clues;
    const q = searchQuery.toLowerCase();
    return data.clues.filter(
      (c) =>
        c.clue.toLowerCase().includes(q) ||
        c.answer.toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  const toggleAnswer = (num: number) => {
    setRevealedAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num);
      else next.add(num);
      return next;
    });
  };

  const revealAll = () => {
    if (!data) return;
    if (allRevealed) {
      setRevealedAnswers(new Set());
      setAllRevealed(false);
    } else {
      setRevealedAnswers(new Set(data.clues.map((c) => c.number)));
      setAllRevealed(true);
    }
  };

  const navigateDate = (days: number) => {
    const newDate = addDays(selectedDate, days);
    setSelectedDate(newDate);
  };

  const revealedCount = data
    ? data.clues.filter((c) => revealedAnswers.has(c.number)).length
    : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <span className="text-white font-bold text-base sm:text-lg">C</span>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight">
                  <span className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                    CodyCross
                  </span>{' '}
                  <span className="text-muted-foreground font-normal">Daily Answers</span>
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Real answers scraped from codycross.info
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {data && data.source === 'live' && (
                <Badge
                  variant="outline"
                  className="hidden sm:flex items-center gap-1 text-xs border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400"
                >
                  <Wifi className="h-3 w-3" />
                  Live
                </Badge>
              )}
              {data && data.source === 'cached' && (
                <Badge
                  variant="outline"
                  className="hidden sm:flex items-center gap-1 text-xs"
                >
                  <WifiOff className="h-3 w-3" />
                  Cached
                </Badge>
              )}
              <ReInfoDialog />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 sm:py-6 max-w-3xl flex-1">
        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
          <Card className="p-2.5 sm:p-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <CalendarIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-teal-500" />
              <span className="text-[10px] sm:text-xs text-muted-foreground">Date</span>
            </div>
            <p className="text-sm sm:text-lg font-bold mt-0.5 sm:mt-1">
              {format(selectedDate, 'MMM d')}
            </p>
          </Card>
          <Card className="p-2.5 sm:p-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
              <span className="text-[10px] sm:text-xs text-muted-foreground">Clues</span>
            </div>
            <p className="text-sm sm:text-lg font-bold mt-0.5 sm:mt-1">
              {data?.totalClues ?? '--'}
            </p>
          </Card>
          <Card className="p-2.5 sm:p-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-500" />
              <span className="text-[10px] sm:text-xs text-muted-foreground">Revealed</span>
            </div>
            <p className="text-sm sm:text-lg font-bold mt-0.5 sm:mt-1">
              {revealedCount}/{data?.totalClues ?? '--'}
            </p>
          </Card>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateDate(-1)}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 min-w-[160px] sm:min-w-[220px] justify-start text-xs sm:text-sm">
                <CalendarIcon className="h-4 w-4" />
                {format(selectedDate, 'EEEE, MMM d, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                disabled={(d) => isAfterToday(d)}
              />
            </PopoverContent>
          </Popover>

          {!isToday(selectedDate) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date())}
              className="gap-1"
            >
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Today</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateDate(1)}
            disabled={isToday(selectedDate)}
            className="gap-1"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6">
            <TabsTrigger value="today" className="gap-1.5 text-xs sm:text-sm">
              <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Today&apos;s Answers
            </TabsTrigger>
            <TabsTrigger value="archive" className="gap-1.5 text-xs sm:text-sm">
              <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Archive
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today">
            {/* Source Status Banner */}
            {data && data.source === 'live' && (
              <div className="mb-4 p-2.5 sm:p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs sm:text-sm">
                  <p className="font-medium text-emerald-800 dark:text-emerald-200">
                    Live data from codycross.info
                  </p>
                  <p className="text-emerald-600 dark:text-emerald-400 mt-0.5">
                    Successfully scraped {data.totalClues} real clues from the public archive.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 p-2.5 sm:p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs sm:text-sm">
                  <p className="font-medium text-rose-800 dark:text-rose-200">
                    Unable to load answers
                  </p>
                  <p className="text-rose-600 dark:text-rose-400 mt-0.5">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 gap-1 text-xs"
                    onClick={() => fetchAnswers(format(selectedDate, 'yyyy-MM-dd'))}
                  >
                    <RefreshCw className="h-3 w-3" /> Retry
                  </Button>
                </div>
              </div>
            )}

            {/* Search & Controls */}
            {data && !error && (
              <>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search clues or answers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 text-sm"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={revealAll}
                    className="gap-1.5 shrink-0"
                  >
                    {allRevealed ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5" /> Hide All
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5" /> Reveal All
                      </>
                    )}
                  </Button>
                </div>

                {/* Clues Card */}
                {loading ? (
                  <LoadingSkeleton />
                ) : filteredClues.length > 0 ? (
                  <Card className="overflow-hidden border-border/60 shadow-lg">
                    <CardHeader className="pb-3 bg-gradient-to-r from-teal-500/5 to-emerald-500/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-bold text-lg shadow-md">
                            CC
                          </div>
                          <div>
                            <CardTitle className="text-base sm:text-lg">{data.title}</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                              {data.totalClues} clues &middot; Scraped{' '}
                              {format(new Date(data.scrapedAt), 'HH:mm:ss')}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {data.source === 'live' ? (
                            <Badge
                              variant="outline"
                              className="text-xs border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400"
                            >
                              <Wifi className="h-3 w-3 mr-1" /> Live
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <WifiOff className="h-3 w-3 mr-1" /> Cached
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4">
                      <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                        {filteredClues.map((clue) => (
                          <ClueCard
                            key={clue.number}
                            clue={clue}
                            isRevealed={revealedAnswers.has(clue.number)}
                            onToggle={() => toggleAnswer(clue.number)}
                          />
                        ))}
                      </div>
                      {searchQuery && filteredClues.length === 0 && (
                        <div className="text-center py-8">
                          <Search className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                          <p className="text-sm text-muted-foreground">
                            No clues match &quot;{searchQuery}&quot;
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="p-6 text-center">
                    <Search className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-muted-foreground">No clues found matching your search.</p>
                  </Card>
                )}
              </>
            )}

            {loading && !data && <LoadingSkeleton />}
          </TabsContent>

          <TabsContent value="archive">
            <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 min-w-[200px] sm:min-w-[250px] justify-start text-xs sm:text-sm">
                    <CalendarIcon className="h-4 w-4" />
                    {format(archiveDate, 'MMMM d, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={archiveDate}
                    onSelect={(d) => d && setArchiveDate(d)}
                    disabled={(d) => isAfterToday(d)}
                  />
                </PopoverContent>
              </Popover>
              <Button
                onClick={() => fetchArchive(format(archiveDate, 'yyyy-MM-dd'))}
                className="gap-1.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 shrink-0"
              >
                <Search className="h-4 w-4" /> Load Answers
              </Button>
            </div>

            {/* Quick Date Links */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-6">
              {[0, 1, 2, 3, 5, 7, 14, 30].map((days) => {
                const d = subDays(new Date(), days);
                const label =
                  days === 0 ? 'Today' : days === 1 ? 'Yesterday' : format(d, 'MMM d');
                return (
                  <Button
                    key={days}
                    variant={
                      format(archiveDate, 'yyyy-MM-dd') === format(d, 'yyyy-MM-dd')
                        ? 'default'
                        : 'outline'
                    }
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setArchiveDate(d);
                      fetchArchive(format(d, 'yyyy-MM-dd'));
                    }}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>

            {activeTab === 'archive' && data && (
              <>
                {/* Search & Controls */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search clues or answers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 text-sm"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={revealAll}
                    className="gap-1.5 shrink-0"
                  >
                    {allRevealed ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5" /> Hide All
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5" /> Reveal All
                      </>
                    )}
                  </Button>
                </div>

                <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
                  {(searchQuery
                    ? filteredClues
                    : data.clues
                  ).map((clue) => (
                    <ClueCard
                      key={clue.number}
                      clue={clue}
                      isRevealed={revealedAnswers.has(clue.number)}
                      onToggle={() => toggleAnswer(clue.number)}
                    />
                  ))}
                </div>
              </>
            )}

            {activeTab === 'archive' && !data && !loading && (
              <Card className="p-8 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">
                  Select a date to view past CodyCross answers.
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto">
        <div className="container mx-auto px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5" />
              <span>College Project: Reverse Engineering Analysis</span>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <span className="text-[10px] sm:text-xs">CodyCross v2.8.1 | IL2CPP Analysis</span>
              <Badge variant="secondary" className="text-[10px] sm:text-xs">
                Educational Purpose Only
              </Badge>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ---- Helpers ----
function isAfterToday(d: Date): boolean {
  return startOfDay(d) > startOfDay(new Date());
}
