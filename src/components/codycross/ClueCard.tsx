"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clue } from "@/lib/types";
import { ArrowRight, Eye, EyeOff, Grid3x3 } from "lucide-react";

interface ClueCardProps {
  clue: Clue;
  isRevealed: boolean;
  onToggle: () => void;
}

export function ClueCard({ clue, isRevealed, onToggle }: ClueCardProps) {
  const directionLabel = clue.direction === "across" ? "→" : "↓";
  const directionColor = clue.direction === "across"
    ? "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400"
    : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400";

  return (
    <Card className={`group transition-all hover:shadow-md ${isRevealed ? "border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/20" : ""}`}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-2.5">
          {/* Direction indicator */}
          <div className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${directionColor}`}>
            {clue.clueNumber}{directionLabel}
          </div>

          {/* Clue content */}
          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-sm leading-relaxed">{clue.clue}</p>

            {/* Answer area */}
            <div className="flex items-center gap-2">
              {isRevealed ? (
                <div className="flex items-center gap-2">
                  <AnswerTiles answer={clue.answer} />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {clue.answer.split("").map((_, i) => (
                      <div
                        key={i}
                        className="w-6 h-6 sm:w-7 sm:h-7 rounded bg-muted border border-border flex items-center justify-center"
                      >
                        <span className="text-xs text-muted-foreground">?</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reveal button */}
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            {isRevealed ? (
              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <Eye className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AnswerTiles({ answer }: { answer: string }) {
  return (
    <div className="flex gap-0.5 flex-wrap">
      {answer.split("").map((letter, i) => (
        <div
          key={i}
          className="w-6 h-6 sm:w-7 sm:h-7 rounded bg-teal-500 text-white flex items-center justify-center text-xs sm:text-sm font-bold shadow-sm"
        >
          {letter}
        </div>
      ))}
    </div>
  );
}
