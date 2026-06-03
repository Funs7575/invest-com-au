/**
 * FindingStore — collects, deduplicates and aggregates findings.
 *
 * Pure module. Used two ways:
 *   1. Per-session: each bot adds findings as it discovers them.
 *   2. Aggregation: shards from many parallel bots are merged into one store
 *      to produce the final report (see findings/report.ts).
 */

import {
  type Finding,
  type FindingInput,
  type Severity,
  SEVERITY_ORDER,
  findingSignature,
} from "./types";

const MAX_SAMPLES = 15;

function pushCapped(arr: string[], value: string | undefined): void {
  if (!value) return;
  if (arr.includes(value)) return;
  if (arr.length < MAX_SAMPLES) arr.push(value);
}

/** Pick the more severe of two severities. */
function moreSevere(a: Severity, b: Severity): Severity {
  return SEVERITY_ORDER[a] <= SEVERITY_ORDER[b] ? a : b;
}

export class FindingStore {
  private readonly map = new Map<string, Finding>();

  add(input: FindingInput, now: Date = new Date()): Finding {
    const id = findingSignature(input);
    const existing = this.map.get(id);
    if (existing) {
      existing.occurrences += 1;
      existing.severity = moreSevere(existing.severity, input.severity);
      pushCapped(existing.sampleUrls, input.url);
      pushCapped(existing.personas, input.persona);
      return existing;
    }
    const finding: Finding = {
      id,
      severity: input.severity,
      category: input.category,
      title: input.title,
      detail: input.detail,
      url: input.url,
      persona: input.persona,
      evidence: input.evidence,
      occurrences: 1,
      firstSeenAt: now.toISOString(),
      sampleUrls: input.url ? [input.url] : [],
      personas: input.persona ? [input.persona] : [],
    };
    this.map.set(id, finding);
    return finding;
  }

  addAll(inputs: FindingInput[], now: Date = new Date()): void {
    for (const input of inputs) this.add(input, now);
  }

  /** Merge already-aggregated findings (e.g. from a shard) into this store. */
  merge(findings: Finding[]): void {
    for (const f of findings) {
      const existing = this.map.get(f.id);
      if (existing) {
        existing.occurrences += f.occurrences;
        existing.severity = moreSevere(existing.severity, f.severity);
        for (const u of f.sampleUrls) pushCapped(existing.sampleUrls, u);
        for (const p of f.personas) pushCapped(existing.personas, p);
      } else {
        this.map.set(f.id, { ...f, sampleUrls: [...f.sampleUrls], personas: [...f.personas] });
      }
    }
  }

  /** All findings, sorted by severity then occurrence count (desc). */
  all(): Finding[] {
    return [...this.map.values()].sort((a, b) => {
      const s = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      if (s !== 0) return s;
      return b.occurrences - a.occurrences;
    });
  }

  get size(): number {
    return this.map.size;
  }

  summary(): Record<Severity, number> & { total: number; distinct: number } {
    const counts: Record<Severity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };
    let total = 0;
    for (const f of this.map.values()) {
      counts[f.severity] += f.occurrences;
      total += f.occurrences;
    }
    return { ...counts, total, distinct: this.map.size };
  }

  toJSON(): Finding[] {
    return this.all();
  }
}
