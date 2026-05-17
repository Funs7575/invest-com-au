"use client";
import { useState, useCallback, useEffect } from "react";

export interface CalculatorHistoryEntry<T = unknown> {
  id: string;
  timestamp: number;
  label: string;
  inputs: T;
  summary: string;
}

const MAX_ENTRIES = 10;

export function useCalculatorHistory<T = unknown>(calcName: string) {
  const key = `invest-calc-history-${calcName}`;
  const [entries, setEntries] = useState<CalculatorHistoryEntry<T>[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(key);
      if (raw) setEntries(JSON.parse(raw) as CalculatorHistoryEntry<T>[]);
    } catch {
      // corrupt storage — ignore
    }
  }, [key]);

  const addEntry = useCallback(
    (inputs: T, label: string, summary: string) => {
      const entry: CalculatorHistoryEntry<T> = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
        label,
        inputs,
        summary,
      };
      setEntries((prev) => {
        const next = [entry, ...prev].slice(0, MAX_ENTRIES);
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // storage full — skip silently
        }
        return next;
      });
    },
    [key],
  );

  const clearHistory = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    setEntries([]);
  }, [key]);

  return { entries, addEntry, clearHistory };
}
