"use client";

import { DailyPuzzle, Clue } from "@/lib/types";
import { useMemo } from "react";

interface CrosswordGridProps {
  puzzle: DailyPuzzle;
}

export function CrosswordGrid({ puzzle }: CrosswordGridProps) {
  // Build a grid from all clues
  const gridData = useMemo(() => {
    const allClues = puzzle.groups.flatMap((g) => g.clues);
    
    // Find grid dimensions
    let maxRow = 0;
    let maxCol = 0;
    allClues.forEach((c) => {
      const endRow = c.row + (c.direction === "down" ? c.answer.length - 1 : 0);
      const endCol = c.col + (c.direction === "across" ? c.answer.length - 1 : 0);
      maxRow = Math.max(maxRow, endRow);
      maxCol = Math.max(maxCol, endCol);
    });

    const rows = maxRow + 2;
    const cols = maxCol + 2;

    // Create grid
    const grid: {
      letter: string;
      clueNumbers: number[];
      isActive: boolean;
      direction?: "across" | "down";
    }[][] = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({
        letter: "",
        clueNumbers: [],
        isActive: false,
      }))
    );

    // Fill grid with clues
    allClues.forEach((clue) => {
      for (let i = 0; i < clue.answer.length; i++) {
        const r = clue.direction === "down" ? clue.row + i : clue.row;
        const c = clue.direction === "across" ? clue.col + i : clue.col;
        if (r < rows && c < cols) {
          grid[r][c].letter = clue.answer[i];
          grid[r][c].isActive = true;
          grid[r][c].direction = clue.direction;
          if (i === 0 && !grid[r][c].clueNumbers.includes(clue.clueNumber)) {
            grid[r][c].clueNumbers.push(clue.clueNumber);
          }
        }
      }
    });

    return { grid, rows, cols };
  }, [puzzle]);

  // Limit grid display size
  const maxDisplayCols = 15;
  const maxDisplayRows = 12;
  const displayCols = Math.min(gridData.cols, maxDisplayCols);
  const displayRows = Math.min(gridData.rows, maxDisplayRows);

  const cellSize = Math.max(20, Math.min(28, Math.floor(400 / displayCols)));

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
        Crossword Grid Preview
      </div>
      <div
        className="inline-grid gap-[1px] bg-border rounded-lg overflow-hidden p-[1px]"
        style={{
          gridTemplateColumns: `repeat(${displayCols}, ${cellSize}px)`,
        }}
      >
        {Array.from({ length: displayRows }).map((_, row) =>
          Array.from({ length: displayCols }).map((_, col) => {
            const cell = gridData.grid[row]?.[col];
            const active = cell?.isActive ?? false;

            return (
              <div
                key={`${row}-${col}`}
                className={`relative flex items-center justify-center font-bold transition-colors ${
                  active
                    ? "bg-white dark:bg-gray-900 text-teal-700 dark:text-teal-300"
                    : "bg-gray-200 dark:bg-gray-800"
                }`}
                style={{
                  width: cellSize,
                  height: cellSize,
                  fontSize: cellSize * 0.5,
                }}
              >
                {active && cell?.clueNumbers?.[0] && (
                  <span className="absolute top-[1px] left-[2px] text-[8px] font-medium text-gray-500 dark:text-gray-400 leading-none">
                    {cell.clueNumbers[0]}
                  </span>
                )}
                {active && cell?.letter && <span>{cell.letter}</span>}
              </div>
            );
          })
        )}
      </div>
      <div className="text-[10px] text-muted-foreground">
        {displayRows * displayCols} cells displayed
      </div>
    </div>
  );
}
