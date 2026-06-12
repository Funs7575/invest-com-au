"use client";

/**
 * Advisor "Prospects" tab client — anonymised prospect cards + filters + the
 * pitch composer. Talks to:
 *   GET  /api/advisor-portal/prospects        (list, with filters)
 *   POST /api/advisor-portal/prospects/pitch  (send one pitch, debit credits)
 *
 * Compliance: the composer copy reminds advisers a pitch is a GENERAL capability
 * statement (no specific recommendations / price targets / guarantees) — the
 * server enforces this via moderation. Cards leak NO consumer identity.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";

const PITCH_MAX = 300;

interface Snapshot {
  advisorType: string | null;
  advisorTypeLabel: string | null;
  goal: string | null;
  state: string | null;
  budgetBand: "small" | "medium" | "large" | "whale" | null;
  timeline: "asap" | "weeks" | "research" | null;
  experience: "beginner" | "intermediate" | "pro" | null;
  crossBorder: boolean;
  vertical: string | null;
}

interface ProspectCard {
  prospectId: string;
  snapshot: Snapshot;
  listedAt: string;
  alreadyPitched: boolean;
  estimatedPitchCost: number;
}

const BUDGET_LABELS: Record<NonNullable<Snapshot["budgetBand"]>, string> = {
  small: "Up to ~$100k",
  medium: "~$100k–$500k",
  large: "~$500k–$2M",
  whale: "$2M+",
};
const TIMELINE_LABELS: Record<NonNullable<Snapshot["timeline"]>, string> = {
  asap: "ASAP",
  weeks: "1–2 months",
  research: "Researching",
};

const ADVISOR_TYPE_OPTIONS = [
  { value: "mortgage-broker", label: "Mortgage Broker" },
  { value: "buyers-agent", label: "Buyer's Agent" },
  { value: "financial-planner", label: "Financial Planner" },
  { value: "smsf-accountant", label: "SMSF Accountant" },
  { value: "tax-agent", label: "Tax Agent" },
  { value: "insurance-broker", label: "Insurance Broker" },
  { value: "estate-planner", label: "Estate Planner" },
  { value: "aged-care-advisor", label: "Aged Care Advisor" },
  { value: "conveyancer", label: "Conveyancer" },
];
const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const BUDGET_BANDS = [
  { value: "small", label: "Up to $100k" },
  { value: "medium", label: "$100k–$500k" },
  { value: "large", label: "$500k–$2M" },
  { value: "whale", label: "$2M+" },
];

export default function ProspectsClient() {
  const [cards, setCards] = useState<ProspectCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<{ advisorType: string; state: string; budgetBand: string }>(
    { advisorType: "", state: "", budgetBand: "" },
  );
  const [composerFor, setComposerFor] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const q = new URLSearchParams();
    if (filters.advisorType) q.set("advisorType", filters.advisorType);
    if (filters.state) q.set("state", filters.state);
    if (filters.budgetBand) q.set("budgetBand", filters.budgetBand);
    return q.toString();
  }, [filters]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/advisor-portal/prospects?${queryString}`);
      if (res.status === 401) {
        setError("Please sign in to the advisor portal.");
        setCards([]);
        return;
      }
      if (!res.ok) {
        setCards([]);
        return;
      }
      const data = await res.json();
      setCards((data.prospects ?? []) as ProspectCard[]);
    } catch {
      setError("Failed to load prospects.");
      setCards([]);
    }
  }, [queryString]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- on-mount/filter-change data load; load() only setState()s synchronously to clear the prior error before its await.
    void load();
  }, [load]);

  const onPitched = useCallback((prospectId: string) => {
    setComposerFor(null);
    setCards((prev) =>
      prev ? prev.map((c) => (c.prospectId === prospectId ? { ...c, alreadyPitched: true } : c)) : prev,
    );
  }, []);

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <FilterSelect
          label="Type"
          value={filters.advisorType}
          onChange={(v) => setFilters((f) => ({ ...f, advisorType: v }))}
          options={ADVISOR_TYPE_OPTIONS}
        />
        <FilterSelect
          label="State"
          value={filters.state}
          onChange={(v) => setFilters((f) => ({ ...f, state: v }))}
          options={STATES.map((s) => ({ value: s, label: s }))}
        />
        <FilterSelect
          label="Budget"
          value={filters.budgetBand}
          onChange={(v) => setFilters((f) => ({ ...f, budgetBand: v }))}
          options={BUDGET_BANDS}
        />
        {(filters.advisorType || filters.state || filters.budgetBand) && (
          <button
            type="button"
            onClick={() => setFilters({ advisorType: "", state: "", budgetBand: "" })}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700"
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {cards === null ? (
        <p className="text-sm text-slate-400">Loading prospects…</p>
      ) : cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <span className="mx-auto mb-2 inline-flex rounded-full bg-slate-100 p-2 text-slate-400">
            <Icon name="users" size={18} />
          </span>
          <p className="text-sm font-semibold text-slate-700">No prospects match</p>
          <p className="mt-1 text-xs text-slate-500">
            Try widening your filters, or check back as more investors open to offers.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {cards.map((c) => (
            <li
              key={c.prospectId}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-800">
                  {c.snapshot.advisorTypeLabel ?? "General enquiry"}
                </span>
                {c.snapshot.crossBorder && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                    <Icon name="globe" size={10} /> Cross-border
                  </span>
                )}
              </div>
              {c.snapshot.goal && (
                <p className="text-sm font-semibold text-slate-800">{c.snapshot.goal}</p>
              )}
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600">
                <Meta label="State" value={c.snapshot.state ?? "—"} />
                <Meta
                  label="Budget"
                  value={c.snapshot.budgetBand ? BUDGET_LABELS[c.snapshot.budgetBand] : "—"}
                />
                <Meta
                  label="Timeline"
                  value={c.snapshot.timeline ? TIMELINE_LABELS[c.snapshot.timeline] : "—"}
                />
                <Meta label="Experience" value={c.snapshot.experience ?? "—"} />
              </dl>

              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-500">
                  Pitch cost:{" "}
                  <span className="font-bold text-slate-800">
                    {c.estimatedPitchCost} credit{c.estimatedPitchCost === 1 ? "" : "s"}
                  </span>
                </span>
                {c.alreadyPitched ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                    <Icon name="check" size={12} /> Pitched
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setComposerFor((cur) => (cur === c.prospectId ? null : c.prospectId))
                    }
                    className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
                  >
                    {composerFor === c.prospectId ? "Cancel" : "Pitch"}
                  </button>
                )}
              </div>

              {composerFor === c.prospectId && !c.alreadyPitched && (
                <PitchComposer
                  prospectId={c.prospectId}
                  cost={c.estimatedPitchCost}
                  onSent={() => onPitched(c.prospectId)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-700">{value}</dd>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-semibold text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function PitchComposer({
  prospectId,
  cost,
  onSent,
}: {
  prospectId: string;
  cost: number;
  onSent: () => void;
}) {
  const [body, setBody] = useState("");
  const [feeBand, setFeeBand] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remaining = PITCH_MAX - body.length;

  async function send() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/advisor-portal/prospects/pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospectId,
          body: body.trim(),
          feeBand: feeBand.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Could not send pitch.");
        return;
      }
      onSent();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50/50 p-3">
      <label className="mb-1 block text-xs font-semibold text-slate-700">
        Your pitch (general capability only)
      </label>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, PITCH_MAX))}
        rows={3}
        maxLength={PITCH_MAX}
        placeholder="e.g. I help SMSF trustees set up and run compliant funds. Happy to walk you through the setup, costs and ongoing obligations on a free intro call."
        className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
      />
      <div className="mt-1 flex items-center justify-between text-[11px]">
        <span className="text-slate-500">
          No specific recommendations, price targets, or guarantees.
        </span>
        <span className={remaining < 0 ? "text-red-600" : "text-slate-400"}>{remaining}</span>
      </div>

      <label className="mb-1 mt-2 block text-xs font-semibold text-slate-700">
        Fee estimate (optional)
      </label>
      <input
        type="text"
        value={feeBand}
        onChange={(e) => setFeeBand(e.target.value.slice(0, 60))}
        placeholder="e.g. $1,500–$2,500 setup"
        maxLength={60}
        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
      />

      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={send}
        disabled={sending || body.trim().length === 0}
        aria-busy={sending}
        className="mt-3 w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
      >
        {sending ? "Sending…" : `Send pitch — ${cost} credit${cost === 1 ? "" : "s"}`}
      </button>
    </div>
  );
}
