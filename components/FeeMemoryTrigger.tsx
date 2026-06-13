"use client";

import { useEffect } from "react";

export interface FeeMemoryEntry {
  slug: string;
  name: string;
  asx: number | null;
  ts: number;
}

const KEY = "iv_fee_memory";
const MAX_ENTRIES = 10;
const REFRESH_GAP_MS = 60 * 60 * 1000; // don't churn the stamp within an hour

export function readFeeMemory(): FeeMemoryEntry[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is FeeMemoryEntry =>
        !!e && typeof e === "object" && typeof (e as FeeMemoryEntry).slug === "string" &&
        typeof (e as FeeMemoryEntry).ts === "number",
    );
  } catch {
    return [];
  }
}

export function writeFeeMemory(entries: FeeMemoryEntry[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    /* ignore */
  }
}

/**
 * Invisible recorder (Northstar D10): remembers the fee a visitor SAW on a
 * broker page so the homepage can later say "this changed since you were
 * here" — the anonymous, zero-schema slice of the platform's memory.
 */
export default function FeeMemoryTrigger({
  slug,
  name,
  asxFee,
}: {
  slug: string;
  name: string;
  asxFee: number | null;
}) {
  useEffect(() => {
    const entries = readFeeMemory();
    const existing = entries.find((e) => e.slug === slug);
    if (existing && Date.now() - existing.ts < REFRESH_GAP_MS) return;
    const next: FeeMemoryEntry = { slug, name, asx: asxFee, ts: Date.now() };
    writeFeeMemory([next, ...entries.filter((e) => e.slug !== slug)]);
  }, [slug, name, asxFee]);

  return null;
}
