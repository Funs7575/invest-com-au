"use client";

import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { BRIEF_TEMPLATE_LABELS } from "@/lib/briefs/templates";
import type { BriefTemplate } from "@/lib/briefs/types";

interface StandingOrder {
  id: number;
  status: "active" | "paused";
  paused_until: string | null;
  brief_templates: string[];
  states: string[];
  budget_bands: string[];
  max_credits_per_accept: number;
  weekly_accept_cap: number;
  weekly_used: number;
  last_triggered_at: string | null;
  created_at: string;
}

interface RunRow {
  id: number;
  standing_order_id: number | null;
  brief_id: number;
  accepted: boolean;
  reason: string;
  credits_spent: number;
  created_at: string;
}

interface PanelData {
  orders: StandingOrder[];
  runs: RunRow[];
  execution_enabled: boolean;
  max_orders: number;
}

const AU_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;

const BAND_LABELS: Record<string, string> = {
  under_500: "Under $500",
  "500_2k": "$500–$2k",
  "2k_5k": "$2k–$5k",
  "5k_10k": "$5k–$10k",
  "10k_plus": "$10k+",
  not_sure: "Not sure yet",
};

const TEMPLATE_OPTIONS = Object.entries(BRIEF_TEMPLATE_LABELS) as [BriefTemplate, string][];

function Chip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
        active
          ? "bg-slate-900 text-white border-slate-900"
          : "bg-white text-slate-600 border-slate-300 hover:border-slate-500"
      }`}
    >
      {label}
    </button>
  );
}

function filterSummary(o: StandingOrder): string {
  const parts: string[] = [];
  parts.push(
    o.brief_templates.length === 0
      ? "Any brief type"
      : o.brief_templates
          .map((t) => (BRIEF_TEMPLATE_LABELS as Record<string, string>)[t] ?? t)
          .join(", "),
  );
  parts.push(o.states.length === 0 ? "any state" : o.states.join("/"));
  parts.push(
    o.budget_bands.length === 0
      ? "any budget"
      : o.budget_bands.map((b) => BAND_LABELS[b] ?? b).join(", "),
  );
  return parts.join(" · ");
}

export default function StandingOrdersPanel() {
  const [data, setData] = useState<PanelData | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Create-form state
  const [templates, setTemplates] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [bands, setBands] = useState<string[]>([]);
  const [maxCredits, setMaxCredits] = useState(10);
  const [weeklyCap, setWeeklyCap] = useState(3);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/advisor-auth/standing-orders");
      if (!res.ok) return; // panel is additive — fail quiet, inbox still works
      setData((await res.json()) as PanelData);
    } catch {
      /* fail quiet */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function toggle(list: string[], value: string, set: (v: string[]) => void) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function createOrder() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/advisor-auth/standing-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief_templates: templates,
          states,
          budget_bands: bands,
          max_credits_per_accept: maxCredits,
          weekly_accept_cap: weeklyCap,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Could not save standing order");
      setShowForm(false);
      setTemplates([]);
      setStates([]);
      setBands([]);
      setMaxCredits(10);
      setWeeklyCap(3);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save standing order");
    } finally {
      setBusy(false);
    }
  }

  async function patchOrder(id: number, body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/advisor-auth/standing-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Could not update standing order");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update standing order");
    } finally {
      setBusy(false);
    }
  }

  async function deleteOrder(id: number) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/advisor-auth/standing-orders/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Could not delete standing order");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete standing order");
    } finally {
      setBusy(false);
    }
  }

  // Render nothing until the API answers — the panel is an enhancement on
  // top of the inbox, never a blocker.
  if (!data) return null;

  const acceptedRuns = data.runs.filter((r) => r.accepted);

  return (
    <section className="mb-6 bg-white border border-slate-200 rounded-2xl">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <Icon name="zap" className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-sm font-bold text-slate-900">
              Standing orders — Instant Match
            </span>
            <span className="block text-xs text-slate-500">
              {data.orders.length === 0
                ? "Auto-accept matching briefs the moment they go live"
                : `${data.orders.length} rule${data.orders.length === 1 ? "" : "s"} · ${acceptedRuns.length} auto-accept${acceptedRuns.length === 1 ? "" : "s"} recently`}
            </span>
          </span>
        </span>
        <Icon
          name="chevron-down"
          className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-slate-100">
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            A standing order accepts matching briefs for you instantly — the same
            credit charge as a manual accept, and the consumer is notified you
            accepted, so only keep rules on while you can respond fast. Caps and
            pause apply any time.
          </p>

          {!data.execution_enabled && (
            <p className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
              Instant Match execution is not switched on platform-wide yet. Your
              rules are saved and will start matching automatically when it goes
              live.
            </p>
          )}

          {error && (
            <p role="alert" className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          {/* Existing rules */}
          {data.orders.length > 0 && (
            <ul className="mt-4 space-y-2.5">
              {data.orders.map((o) => (
                <li
                  key={o.id}
                  className="rounded-xl border border-slate-200 px-3.5 py-3 flex flex-wrap items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-slate-800">
                      {filterSummary(o)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Up to {o.max_credits_per_accept} credits per accept ·{" "}
                      {o.weekly_used}/{o.weekly_accept_cap} used this week ·{" "}
                      {o.status === "active" ? (
                        <span className="text-emerald-600 font-medium">Active</span>
                      ) : (
                        <span className="text-slate-500 font-medium">Paused</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        patchOrder(o.id, {
                          status: o.status === "active" ? "paused" : "active",
                          paused_until: null,
                        })
                      }
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {o.status === "active" ? "Pause" : "Resume"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => deleteOrder(o.id)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Create */}
          {showForm ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-700 mb-1.5">
                Brief types <span className="font-normal text-slate-400">(none = any)</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATE_OPTIONS.map(([value, label]) => (
                  <Chip
                    key={value}
                    active={templates.includes(value)}
                    label={label}
                    onClick={() => toggle(templates, value, setTemplates)}
                  />
                ))}
              </div>

              <p className="text-xs font-semibold text-slate-700 mt-3.5 mb-1.5">
                States <span className="font-normal text-slate-400">(none = any)</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {AU_STATES.map((s) => (
                  <Chip
                    key={s}
                    active={states.includes(s)}
                    label={s}
                    onClick={() => toggle(states, s, setStates)}
                  />
                ))}
              </div>

              <p className="text-xs font-semibold text-slate-700 mt-3.5 mb-1.5">
                Budget bands <span className="font-normal text-slate-400">(none = any)</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(BAND_LABELS).map(([value, label]) => (
                  <Chip
                    key={value}
                    active={bands.includes(value)}
                    label={label}
                    onClick={() => toggle(bands, value, setBands)}
                  />
                ))}
              </div>

              <div className="mt-3.5 grid grid-cols-2 gap-3 max-w-sm">
                <label className="block text-xs font-semibold text-slate-700">
                  Max credits per accept
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={maxCredits}
                    onChange={(e) => setMaxCredits(Number(e.target.value) || 1)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-normal"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  Max accepts per week
                  <input
                    type="number"
                    min={1}
                    max={25}
                    value={weeklyCap}
                    onChange={(e) => setWeeklyCap(Number(e.target.value) || 1)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-normal"
                  />
                </label>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={createOrder}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Save standing order"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setShowForm(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            data.orders.length < data.max_orders && (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-dashed border-slate-300 text-xs font-semibold text-slate-600 hover:border-slate-500 hover:text-slate-800"
              >
                <Icon name="plus" className="h-3.5 w-3.5" />
                New standing order
              </button>
            )
          )}

          {/* Recent activity */}
          {data.runs.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-semibold text-slate-700 mb-2">Recent activity</p>
              <ul className="space-y-1.5">
                {data.runs.slice(0, 8).map((r) => (
                  <li key={r.id} className="text-[11.5px] text-slate-500">
                    {r.accepted ? (
                      <>
                        <span className="text-emerald-600 font-medium">Auto-accepted</span>{" "}
                        brief #{r.brief_id} · {r.credits_spent} credit
                        {r.credits_spent === 1 ? "" : "s"} ·{" "}
                        {new Date(r.created_at).toLocaleDateString("en-AU")}
                      </>
                    ) : (
                      <>
                        <span className="text-slate-400 font-medium">Skipped</span> brief #
                        {r.brief_id} · {r.reason.replace(/_/g, " ")} ·{" "}
                        {new Date(r.created_at).toLocaleDateString("en-AU")}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
