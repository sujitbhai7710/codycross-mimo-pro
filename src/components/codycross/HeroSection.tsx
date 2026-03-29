"use client";

import { useEffect, useSyncExternalStore, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Moon, Sun, ChevronDown } from "lucide-react";

function getThemeSnapshot() {
  if (typeof document === "undefined") return "light";
  const stored = localStorage.getItem("theme");
  if (stored === "dark") return "dark";
  if (stored === "light") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getServerThemeSnapshot() {
  return "light";
}

function subscribeToTheme(callback: () => void) {
  // Listen for storage events and media query changes
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", callback);
  window.addEventListener("storage", callback);
  return () => {
    mq.removeEventListener("change", callback);
    window.removeEventListener("storage", callback);
  };
}

export function HeroSection() {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    // Apply theme class to document on mount
    const currentTheme = getThemeSnapshot();
    if (currentTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    // Trigger re-render by dispatching storage event
    window.dispatchEvent(new StorageEvent("storage"));
  }, [theme]);

  return (
    <section className="relative overflow-hidden border-b">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-600/10 via-emerald-600/5 to-cyan-600/10 dark:from-teal-900/20 dark:via-emerald-900/10 dark:to-cyan-900/20" />
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230d9488' fill-opacity='1'%3E%3Crect x='1' y='1' width='8' height='8' rx='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative container mx-auto px-4 py-8 sm:py-12">
        <div className="flex flex-col gap-6">
          {/* Top bar with theme toggle */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-sm bg-teal-500" />
                <div className="w-3 h-3 rounded-sm bg-amber-400" />
                <div className="w-3 h-3 rounded-sm bg-rose-400" />
              </div>
            </div>
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-9 w-9 rounded-full"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>

          {/* Main hero content */}
          <div className="text-center space-y-4">
            {/* Logo area */}
            <div className="flex justify-center items-center gap-3 mb-4">
              <div className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/25">
                  <CrosswordIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-[10px] font-bold text-amber-900">✦</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                <span className="text-teal-600 dark:text-teal-400">Cody</span>
                <span className="text-foreground">Cross</span>
                <span className="text-muted-foreground font-normal text-lg sm:text-xl ml-2">Daily Answers</span>
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
                Your daily source for CodyCross crossword puzzle answers — 
                powered by <Badge variant="outline" className="text-teal-600 dark:text-teal-400 border-teal-300 dark:border-teal-700 font-mono text-xs">reverse engineering</Badge>
              </p>
            </div>

            {/* Tech badges */}
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <Badge variant="secondary" className="gap-1 text-xs">
                <Code2 className="h-3 w-3" />
                APK Decompilation
              </Badge>
              <Badge variant="secondary" className="gap-1 text-xs">
                <Brain className="h-3 w-3" />
                API Discovery
              </Badge>
              <Badge variant="secondary" className="gap-1 text-xs">
                <Shield className="h-3 w-3" />
                Protocol Analysis
              </Badge>
              <Badge variant="secondary" className="gap-1 text-xs">
                <Search className="h-3 w-3" />
                104 Worlds Mapped
              </Badge>
            </div>

            {/* Scroll hint */}
            <div className="animate-bounce pt-2">
              <ChevronDown className="h-5 w-5 mx-auto text-muted-foreground/50" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Code2({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/>
    </svg>
  );
}

function Brain({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/>
      <path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/>
      <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/>
      <path d="M3.477 10.896a4 4 0 0 1 .585-.396"/>
      <path d="M19.938 10.5a4 4 0 0 1 .585.396"/>
      <path d="M6 18a4 4 0 0 1-1.967-.516"/>
      <path d="M19.967 17.484A4 4 0 0 1 18 18"/>
    </svg>
  );
}

function Shield({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  );
}

function Search({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
    </svg>
  );
}

function CrosswordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="8" height="8" rx="1" />
      <rect x="10" y="2" width="8" height="8" rx="1" />
      <rect x="2" y="10" width="8" height="8" rx="1" />
      <rect x="14" y="14" width="8" height="8" rx="1" />
      <rect x="10" y="10" width="4" height="4" rx="0.5" />
      <rect x="18" y="10" width="4" height="4" rx="0.5" />
      <rect x="2" y="18" width="4" height="4" rx="0.5" />
    </svg>
  );
}
