"use client";

import { useState, useEffect, useCallback } from "react";
import { DailyPuzzle, ApiResponse } from "@/lib/types";

interface UseCodyCrossOptions {
  autoFetch?: boolean;
}

interface UseCodyCrossReturn {
  data: DailyPuzzle | null;
  loading: boolean;
  error: string | null;
  source: string;
  message: string;
  refetch: () => Promise<void>;
}

export function useTodayAnswers(options: UseCodyCrossOptions = {}) {
  const { autoFetch = true } = options;
  const [data, setData] = useState<DailyPuzzle | null>(null);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const fetchToday = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/today");
      const json: ApiResponse = await res.json();
      if (json.success && json.data) {
        setData(json.data as DailyPuzzle);
        setSource(json.source ?? "unknown");
        setMessage(json.message ?? "");
      } else {
        setError(json.error ?? "Failed to fetch today's answers");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchToday();
    }
  }, [autoFetch, fetchToday]);

  return { data, loading, error, source, message, refetch: fetchToday };
}

export function useArchiveAnswers() {
  const [data, setData] = useState<DailyPuzzle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");

  const fetchByDate = useCallback(async (date: string) => {
    if (!date) return;
    setCurrentDate(date);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/archive?date=${date}`);
      const json: ApiResponse = await res.json();
      if (json.success && json.data) {
        setData(json.data as DailyPuzzle);
        setSource(json.source ?? "unknown");
        setMessage(json.message ?? "");
      } else {
        setError(json.error ?? `No answers found for ${date}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, source, message, currentDate, fetchByDate };
}

export function usePuzzleDetails() {
  const [data, setData] = useState<DailyPuzzle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPuzzle = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/puzzle?id=${id}`);
      const json: ApiResponse = await res.json();
      if (json.success && json.data) {
        setData(json.data as DailyPuzzle);
      } else {
        setError(json.error ?? "Puzzle not found");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, fetchPuzzle };
}
