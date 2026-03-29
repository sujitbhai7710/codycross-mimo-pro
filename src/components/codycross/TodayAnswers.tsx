"use client";

import { useState } from "react";
import { ClueCard } from "./ClueCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyPuzzle, PuzzleGroup } from "@/lib/types";
import { Calendar, Globe, Wifi, WifiOff, Database, Sparkles, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TodayAnswersProps {
  data: DailyPuzzle | null;
  loading: boolean;
  error: string | null;
  source: string;
  message: string;
}

const SOURCE_CONFIG = {
  live: {
    icon: Wifi,
    label: "Live Data",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    borderColor: "border-emerald-200 dark:border-emerald-800",
  },
  cached: {
    icon: Database,
    label: "Cached",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  sample: {
    icon: Sparkles,
    label: "Sample Data",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-amber-200 dark:border-amber-800",
  },
  unknown: {
    icon: WifiOff,
    label: "Unknown",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    borderColor: "border-border",
  },
};

export function TodayAnswers({ data, loading, error, source, message }: TodayAnswersProps) {
  const [showAllAnswers, setShowAllAnswers] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [revealedClues, setRevealedClues] = useState<Set<string>>(new Set());

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const revealAll = () => {
    setShowAllAnswers(true);
    if (data) {
      const allClueIds = new Set<string>();
      data.groups.forEach((g) =>
        g.clues.forEach((c) => allClueIds.add(c.id))
      );
      setRevealedClues(allClueIds);
    }
  };

  const hideAll = () => {
    setShowAllAnswers(false);
    setRevealedClues(new Set());
  };

  const toggleClue = (clueId: string) => {
    setRevealedClues((prev) => {
      const next = new Set(prev);
      if (next.has(clueId)) next.delete(clueId);
      else next.add(clueId);
      return next;
    });
  };

  if (loading) {
    return <TodayAnswersSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto">
        <WifiOff className="h-4 w-4" />
        <AlertTitle>Error Loading Answers</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) return null;

  const sourceConfig = SOURCE_CONFIG[source as keyof typeof SOURCE_CONFIG] ?? SOURCE_CONFIG.unknown;
  const SourceIcon = sourceConfig.icon;
  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Date and source info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">{formattedDate}</span>
          </div>
          <Separator orientation="vertical" className="h-4 hidden sm:block" />
          <div className="flex items-center gap-2 text-muted-foreground">
            <Globe className="h-4 w-4" />
            <span className="text-sm font-medium">World {data.worldNumber}: {data.worldName}</span>
          </div>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${sourceConfig.bgColor} ${sourceConfig.color} ${sourceConfig.borderColor}`}>
          <SourceIcon className="h-3.5 w-3.5" />
          {sourceConfig.label}
        </div>
      </div>

      {/* Source message */}
      {message && source !== "live" && (
        <div className={`rounded-lg border p-3 ${sourceConfig.bgColor} ${sourceConfig.borderColor}`}>
          <p className="text-xs text-muted-foreground">{message}</p>
        </div>
      )}

      {/* Reveal All / Hide All buttons */}
      <div className="flex items-center gap-2">
        {!showAllAnswers ? (
          <Button
            variant="outline"
            size="sm"
            onClick={revealAll}
            className="gap-1.5 text-teal-600 border-teal-300 hover:bg-teal-50 dark:text-teal-400 dark:border-teal-700 dark:hover:bg-teal-950/30"
          >
            <Eye className="h-3.5 w-3.5" />
            Reveal All Answers
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={hideAll}
            className="gap-1.5"
          >
            <EyeOff className="h-3.5 w-3.5" />
            Hide All Answers
          </Button>
        )}
        <Badge variant="outline" className="text-xs">
          {data.groups.reduce((sum, g) => sum + g.clues.length, 0)} clues across {data.groups.length} groups
        </Badge>
      </div>

      {/* Puzzle Groups */}
      <div className="space-y-4">
        {data.groups.map((group, index) => (
          <PuzzleGroupCard
            key={group.id}
            group={group}
            index={index}
            isExpanded={expandedGroups.has(group.id)}
            onToggle={() => toggleGroup(group.id)}
            revealedClues={revealedClues}
            onToggleClue={toggleClue}
          />
        ))}
      </div>
    </div>
  );
}

function PuzzleGroupCard({
  group,
  index,
  isExpanded,
  onToggle,
  revealedClues,
  onToggleClue,
}: {
  group: PuzzleGroup;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  revealedClues: Set<string>;
  onToggleClue: (id: string) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold text-sm">
              {String.fromCharCode(65 + index)}
            </div>
            <div>
              <CardTitle className="text-base">{group.groupName}</CardTitle>
              {group.theme && (
                <p className="text-xs text-muted-foreground mt-0.5">{group.theme}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {group.secretWord && (
              <Badge variant="secondary" className="text-xs gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                <Sparkles className="h-3 w-3" />
                Secret: {group.secretWord}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {group.clues.length} clues
            </Badge>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-0">
          <Separator className="mb-4" />
          <div className="grid gap-3 sm:grid-cols-2">
            {group.clues.map((clue) => (
              <ClueCard
                key={clue.id}
                clue={clue}
                isRevealed={revealedClues.has(clue.id)}
                onToggle={() => onToggleClue(clue.id)}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function TodayAnswersSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="space-y-1.5">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {[1, 2, 3, 4].map((j) => (
                  <Skeleton key={j} className="h-20 rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
