'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  CalendarIcon,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Grid3X3,
  Lock,
  Unlock,
  Search,
  Shield,
  Code,
  Database,
  Globe,
  Cpu,
  Key,
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  BookOpen,
  Trophy,
  Star,
} from 'lucide-react';
import { format, subDays, addDays } from 'date-fns';

// Types
interface CodyClue {
  direction: 'across' | 'down';
  number: number;
  clue: string;
  answer: string;
  position: { row: number; col: number };
}

interface PuzzleGroup {
  id: string;
  groupName: string;
  theme: string;
  clues: CodyClue[];
  secretWord: string;
  difficulty: string;
}

interface DailyCrossword {
  date: string;
  puzzleGroups: PuzzleGroup[];
  month: number;
  year: number;
  dayOfYear: number;
}

// ---- Clue Card Component ----
function ClueCard({ clue, isRevealed, onToggle }: { clue: CodyClue; isRevealed: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-start gap-3 py-3 px-4 rounded-lg border border-border/50 hover:bg-accent/50 transition-all duration-200 group">
      <div className="flex-shrink-0 mt-0.5">
        <Badge variant={clue.direction === 'across' ? 'default' : 'secondary'} className="text-xs font-bold">
          {clue.number}{clue.direction === 'across' ? '→' : '↓'}
        </Badge>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground leading-relaxed">{clue.clue}</p>
        {isRevealed ? (
          <div className="mt-2 flex items-center gap-2">
            <span className="font-mono text-lg font-bold tracking-[0.3em] text-primary">
              {clue.answer}
            </span>
            <Unlock className="h-3.5 w-3.5 text-emerald-500" />
          </div>
        ) : (
          <div className="mt-2 flex items-center gap-2">
            <span className="font-mono text-lg tracking-[0.3em] text-muted-foreground/40">
              {'●'.repeat(clue.answer.length)}
            </span>
            <Lock className="h-3.5 w-3.5 text-muted-foreground/30" />
          </div>
        )}
      </div>
      <Button variant="ghost" size="sm" onClick={onToggle} className="flex-shrink-0 h-8 w-8 p-0">
        {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  );
}

// ---- Puzzle Group Card ----
function PuzzleGroupCard({ group, index }: { group: PuzzleGroup; index: number }) {
  const [revealedAnswers, setRevealedAnswers] = useState<Set<string>>(new Set());
  const [allRevealed, setAllRevealed] = useState(false);

  const acrossClues = group.clues.filter(c => c.direction === 'across');
  const downClues = group.clues.filter(c => c.direction === 'down');

  const toggleAnswer = (id: string) => {
    setRevealedAnswers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const revealAll = () => {
    if (allRevealed) {
      setRevealedAnswers(new Set());
      setAllRevealed(false);
    } else {
      setRevealedAnswers(new Set(group.clues.map(c => `${c.direction}-${c.number}`)));
      setAllRevealed(true);
    }
  };

  const difficultyColor = {
    Easy: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    Medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    Hard: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
  };

  return (
    <Card className="overflow-hidden border-border/60 shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg shadow-md">
              {index + 1}
            </div>
            <div>
              <CardTitle className="text-lg">{group.groupName}</CardTitle>
              <CardDescription className="text-sm">{group.theme}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={difficultyColor[group.difficulty as keyof typeof difficultyColor]}>
              {group.difficulty}
            </Badge>
            <Badge variant="outline" className="font-mono">
              🤫 {group.secretWord}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Grid3X3 className="h-4 w-4" />
              <span>{group.clues.length} clues</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Star className="h-4 w-4" />
              <span>{group.clues.filter(c => revealedAnswers.has(`${c.direction}-${c.number}`)).length}/{group.clues.length} revealed</span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={revealAll} className="gap-1.5">
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

        {acrossClues.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <ChevronRight className="h-3 w-3 rotate-0" /> Across
            </h4>
            <div className="space-y-1">
              {acrossClues.map(clue => (
                <ClueCard
                  key={`across-${clue.number}`}
                  clue={clue}
                  isRevealed={revealedAnswers.has(`across-${clue.number}`)}
                  onToggle={() => toggleAnswer(`across-${clue.number}`)}
                />
              ))}
            </div>
          </div>
        )}

        {downClues.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <ChevronDown className="h-3 w-3" /> Down
            </h4>
            <div className="space-y-1">
              {downClues.map(clue => (
                <ClueCard
                  key={`down-${clue.number}`}
                  clue={clue}
                  isRevealed={revealedAnswers.has(`down-${clue.number}`)}
                  onToggle={() => toggleAnswer(`down-${clue.number}`)}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Loading Skeleton ----
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map(i => (
        <Card key={i} className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-60" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            {[1, 2, 3, 4].map(j => (
              <div key={j} className="flex items-center gap-3 py-2">
                <Skeleton className="h-6 w-10" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---- Reverse Engineering Info Dialog ----
function ReInfoDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Shield className="h-4 w-4" />
          RE Findings
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
              (C# compiled to native ARM64). The game logic resides in <code className="bg-background px-1 py-0.5 rounded text-xs">libil2cpp.so</code> (83MB) 
              with metadata in <code className="bg-background px-1 py-0.5 rounded text-xs">global-metadata.dat</code> (17MB).
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" /> API Endpoints Discovered
            </h3>
            <p className="text-muted-foreground mb-2">Base URL: <code className="bg-background px-1 py-0.5 rounded text-xs font-mono">https://game.codycross-game.com/</code></p>
            <ul className="space-y-1 text-muted-foreground">
              <li className="flex items-center gap-2"><Code className="h-3 w-3" /> <code className="text-xs">/TodaysCrossword</code> — Daily crossword data</li>
              <li className="flex items-center gap-2"><Code className="h-3 w-3" /> <code className="text-xs">/DDR/Daily/Date({'{date}'})</code> — Date-based puzzle</li>
              <li className="flex items-center gap-2"><Code className="h-3 w-3" /> <code className="text-xs">/GetPuzzle</code> — Fetch puzzle data</li>
              <li className="flex items-center gap-2"><Code className="h-3 w-3" /> <code className="text-xs">/GetCifras</code> — Crossword grid data</li>
              <li className="flex items-center gap-2"><Code className="h-3 w-3" /> <code className="text-xs">/GetMundo</code> — World/map data</li>
              <li className="flex items-center gap-2"><Code className="h-3 w-3" /> <code className="text-xs">/GetPuzzleSettings</code> — Configuration</li>
              <li className="flex items-center gap-2"><Code className="h-3 w-3" /> <code className="text-xs">/v2/*</code> — API v2 endpoints</li>
            </ul>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Key className="h-4 w-4 text-primary" /> Encryption & Authentication
            </h3>
            <ul className="space-y-1 text-muted-foreground">
              <li><strong>Encryption:</strong> PuzzleCrypto class (AES-128/256) with PuzzleCryptoContent</li>
              <li><strong>Hashing:</strong> MD5 via MD5Helper class for data integrity</li>
              <li><strong>Response:</strong> ApiResponseModelEncrypted for encrypted responses</li>
              <li><strong>Auth:</strong> Token-based (auth_token_string, accessToken headers)</li>
              <li><strong>CDN:</strong> Addressables at addressables.codycross-game.com</li>
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
              <li>Fanatee.CodyCross.Service.Util.Api.Crypto</li>
            </ul>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> Game Structure
            </h3>
            <ul className="space-y-1 text-muted-foreground">
              <li><strong>Worlds:</strong> 104 worlds (map_00 through map_103)</li>
              <li><strong>Puzzle Groups:</strong> ~20 groups per world with 3-6 clues each</li>
              <li><strong>Daily Rotation:</strong> TcYearMonth-based deterministic selection</li>
              <li><strong>Secret Word:</strong> palavraSecreta — main answer formed from first letters</li>
              <li><strong>Addressables:</strong> Content delivery via Unity Addressables system</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- Main Page Component ----
export default function CodyCrossPage() {
  const [activeTab, setActiveTab] = useState('today');
  const [data, setData] = useState<DailyCrossword | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [archiveDate, setArchiveDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAnswers(format(selectedDate, 'yyyy-MM-dd'));
  }, [selectedDate]);

  const fetchAnswers = async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/today?date=${date}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setSource(json.source);
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
    try {
      const res = await fetch(`/api/archive?date=${date}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setSource(json.source);
      } else {
        setError(json.error || 'Failed to load archive');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = data?.puzzleGroups.filter(g =>
    g.theme.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.groupName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.clues.some(c => c.clue.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const navigateDate = (days: number) => {
    const newDate = addDays(selectedDate, days);
    setSelectedDate(newDate);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">
                  <span className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">CodyCross</span>{' '}
                  <span className="text-muted-foreground font-normal">Answers</span>
                </h1>
                <p className="text-xs text-muted-foreground">Reverse-Engineered Daily Solutions</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ReInfoDialog />
              <Badge variant="outline" className="hidden sm:flex items-center gap-1 text-xs">
                <Zap className="h-3 w-3 text-amber-500" />
                RE-Powered
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-teal-500" />
              <span className="text-xs text-muted-foreground">Date</span>
            </div>
            <p className="text-lg font-bold mt-1">{format(selectedDate, 'MMM dd, yyyy')}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">World</span>
            </div>
            <p className="text-lg font-bold mt-1">
              {data ? `#${((data.dayOfYear) % 104) + 1}` : '--'}
            </p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Grid3X3 className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Puzzles</span>
            </div>
            <p className="text-lg font-bold mt-1">{data?.puzzleGroups.length || '--'}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Source</span>
            </div>
            <p className="text-lg font-bold mt-1 capitalize">{source || '--'}</p>
          </Card>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <Button variant="outline" size="sm" onClick={() => navigateDate(-1)} className="gap-1">
            <ChevronRight className="h-4 w-4 rotate-180" />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 min-w-[180px] justify-start">
                <CalendarIcon className="h-4 w-4" />
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                disabled={(d) => d > new Date() || d < new Date(2024, 0, 1)}
              />
            </PopoverContent>
          </Popover>

          {format(selectedDate, 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd') && (
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())} className="gap-1">
              <Clock className="h-4 w-4" />
              Today
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateDate(1)}
            disabled={format(selectedDate, 'yyyy-MM-dd') >= format(new Date(), 'yyyy-MM-dd')}
            className="gap-1"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="today" className="gap-1.5">
              <Zap className="h-4 w-4" />
              Today&apos;s Answers
            </TabsTrigger>
            <TabsTrigger value="archive" className="gap-1.5">
              <BookOpen className="h-4 w-4" />
              Archive
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today">
            {/* Source Notice */}
            {source === 'fallback' && (
              <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200">Using fallback puzzle generation</p>
                  <p className="text-amber-600 dark:text-amber-400 mt-0.5">
                    The game API requires authentication tokens. Showing deterministic puzzles based on date using the TcYearMonth rotation algorithm discovered during reverse engineering.
                  </p>
                </div>
              </div>
            )}

            {source === 'api' && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-emerald-800 dark:text-emerald-200">Live data from game API</p>
                  <p className="text-emerald-600 dark:text-emerald-400 mt-0.5">
                    Successfully fetched today&apos;s crossword data from the reverse-engineered CodyCross API endpoint.
                  </p>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clues, themes, or groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Puzzle Groups */}
            {loading ? (
              <LoadingSkeleton />
            ) : error ? (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground">{error}</p>
                <Button variant="outline" className="mt-3" onClick={() => fetchAnswers(format(selectedDate, 'yyyy-MM-dd'))}>
                  <RefreshCw className="h-4 w-4 mr-1" /> Retry
                </Button>
              </Card>
            ) : filteredGroups && filteredGroups.length > 0 ? (
              <div className="space-y-4">
                {filteredGroups.map((group, i) => (
                  <PuzzleGroupCard key={group.id} group={group} index={i} />
                ))}
              </div>
            ) : (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground">No puzzles found matching your search.</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="archive">
            <div className="mb-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 min-w-[250px] justify-start">
                    <CalendarIcon className="h-4 w-4" />
                    {format(archiveDate, 'MMMM d, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={archiveDate}
                    onSelect={(d) => d && setArchiveDate(d)}
                    disabled={(d) => d > new Date() || d < new Date(2024, 0, 1)}
                  />
                </PopoverContent>
              </Popover>
              <Button
                onClick={() => fetchArchive(format(archiveDate, 'yyyy-MM-dd'))}
                className="ml-2 gap-1.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700"
              >
                <Search className="h-4 w-4" /> Load Archive
              </Button>
            </div>

            {/* Quick Date Links */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[0, 1, 2, 3, 5, 7, 14, 30].map(days => {
                const d = subDays(new Date(), days);
                const label = days === 0 ? 'Today' : days === 1 ? 'Yesterday' : format(d, 'MMM d');
                return (
                  <Button
                    key={days}
                    variant={format(archiveDate, 'yyyy-MM-dd') === format(d, 'yyyy-MM-dd') ? 'default' : 'outline'}
                    size="sm"
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

            {loading ? (
              <LoadingSkeleton />
            ) : data && activeTab === 'archive' ? (
              <div className="space-y-4">
                <div className="text-center mb-2">
                  <p className="text-sm text-muted-foreground">
                    Showing answers for <strong>{format(archiveDate, 'MMMM d, yyyy')}</strong>
                  </p>
                  {source && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      Source: {source}
                    </Badge>
                  )}
                </div>
                {data.puzzleGroups.map((group, i) => (
                  <PuzzleGroupCard key={group.id} group={group} index={i} />
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Select a date to view past CodyCross answers.</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>College Project: Reverse Engineering Analysis</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs">CodyCross v2.8.1 | IL2CPP Analysis</span>
              <Badge variant="secondary" className="text-xs">Educational Purpose Only</Badge>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
