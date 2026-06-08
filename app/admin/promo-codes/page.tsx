/**
 * /admin/promo-codes — admin minting + listing UI for the brief
 * marketplace promo-code system.
 *
 * Talks to /api/admin/promo-codes (POST mint, GET list, DELETE by id).
 * Codes are admin-only because they affect marketplace pricing; the
 * page itself is gated by the standard admin layout's ADMIN_EMAILS
 * check + the same gate on the API.
 *
 * Three code kinds:
 *   free_brief         — brief is free regardless of normal cost
 *   percent_off_accept — N% off the accept_credits_cost
 *   fixed_credits      — N credits added to brief poster's balance
 *
 * The redemption flow itself (consuming codes inside /briefs/new) is
 * out of scope for this PR — admins can mint codes now in preparation.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { useToast } from "@/components/Toast";

type Kind = "free_brief" | "percent_off_accept" | "fixed_credits";

interface PromoCode {
  id: number;
  code: string;
  kind: Kind;
  value: number | null;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  notes: string | null;
  createdByAdmin: string | null;
  createdAt: string;
}

const KIND_LABEL: Record<Kind, string> = {
  free_brief: "Free brief",
  percent_off_accept: "% off accept",
  fixed_credits: "Fixed credits",
};

function describeValue(kind: Kind, value: number | null): string {
  if (kind === "free_brief") return "Brief is free";
  if (value === null) return "—";
  if (kind === "percent_off_accept") return `${value}% off`;
  if (kind === "fixed_credits") return `+${value} credits`;
  return `${value}`;
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

export default function PromoCodesAdminPage() {
  const { toast } = useToast();
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);

  // Mint form state.
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<Kind>("percent_off_accept");
  const [value, setValue] = useState<string>("");
  const [maxUses, setMaxUses] = useState<string>("1");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/promo-codes", { method: "GET" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { codes: PromoCode[] };
      setCodes(body.codes);
    } catch (e) {
      toast(
        `Failed to load codes: ${e instanceof Error ? e.message : "Unknown error."}`,
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function mint(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        code: code.trim(),
        kind,
        max_uses: Number(maxUses) || 1,
      };
      if (kind !== "free_brief") {
        const n = Number(value);
        if (!Number.isFinite(n) || n <= 0) {
          toast("Value must be a positive number.", "error");
          return;
        }
        body.value = n;
      }
      if (expiresAt.trim()) {
        body.expires_at = new Date(expiresAt).toISOString();
      }
      if (notes.trim()) body.notes = notes.trim();

      const res = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      toast(`Code ${code.trim()} is live.`, "success");
      setCode("");
      setValue("");
      setNotes("");
      setExpiresAt("");
      setMaxUses("1");
      await refresh();
    } catch (e) {
      toast(
        `Mint failed: ${e instanceof Error ? e.message : "Unknown error."}`,
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: number) {
    setPendingDeleteId(null);
    const res = await fetch(`/api/admin/promo-codes?id=${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      toast(`Delete failed: ${j.error ?? `HTTP ${res.status}`}`, "error");
      return;
    }
    toast("Deleted.", "success");
    await refresh();
  }

  return (
    <AdminShell>
      <div className="container-custom max-w-5xl py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900">
            Brief promo codes
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Mint codes for the brief marketplace. Codes affect pricing at
            brief creation — keep them scoped (max_uses, expiry).
          </p>
        </header>

        {/* Mint form */}
        <form
          onSubmit={mint}
          className="bg-white border border-slate-200 rounded-2xl p-5 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="md:col-span-2">
            <h2 className="text-sm font-bold text-slate-900 mb-3">Mint code</h2>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-slate-700">
              Code (case-sensitive)
            </span>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              minLength={3}
              maxLength={48}
              pattern="^[A-Za-z0-9_-]+$"
              placeholder="LAUNCH2026"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Kind</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as Kind)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="percent_off_accept">% off accept</option>
              <option value="fixed_credits">Fixed credits</option>
              <option value="free_brief">Free brief</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-700">
              Value{" "}
              {kind === "percent_off_accept"
                ? "(1–100, percent)"
                : kind === "fixed_credits"
                  ? "(credits to grant)"
                  : "(ignored)"}
            </span>
            <input
              type="number" inputMode="decimal"
              min={kind === "free_brief" ? undefined : 1}
              max={kind === "percent_off_accept" ? 100 : undefined}
              step="1"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={kind === "free_brief"}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-700">
              Max uses
            </span>
            <input
              type="number" inputMode="decimal"
              min={1}
              max={10000}
              step="1"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-700">
              Expires at (optional)
            </span>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="text-xs font-semibold text-slate-700">
              Notes (internal, not shown to redeemers)
            </span>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              placeholder="e.g. Marketing email batch 2026-05"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold px-5 py-2.5"
            >
              {submitting ? "Minting…" : "Mint code"}
            </button>
          </div>
        </form>

        {/* List */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-900">All codes</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Newest first. Codes with redemptions can&apos;t be deleted —
              expire them instead by editing the expires_at column directly
              in Supabase, or rely on max_uses to exhaust them.
            </p>
          </div>
          {loading ? (
            <p className="px-5 py-8 text-sm text-slate-500">Loading…</p>
          ) : codes.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-500">
              No codes yet. Mint one above.
            </p>
          ) : (
            <table className="w-full text-sm" aria-label="Promo codes">
              <thead className="text-xs uppercase text-slate-500 bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">Code</th>
                  <th className="text-left px-4 py-2 font-semibold">Kind</th>
                  <th className="text-left px-4 py-2 font-semibold">Value</th>
                  <th className="text-left px-4 py-2 font-semibold">Uses</th>
                  <th className="text-left px-4 py-2 font-semibold">Expires</th>
                  <th className="text-left px-4 py-2 font-semibold">Notes</th>
                  <th className="text-right px-4 py-2 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {codes.map((c) => {
                  const expired = isExpired(c.expiresAt);
                  const exhausted = c.usedCount >= c.maxUses;
                  return (
                    <tr
                      key={c.id}
                      className={
                        expired || exhausted ? "bg-slate-50/50 opacity-60" : ""
                      }
                    >
                      <td className="px-4 py-2 font-mono font-semibold text-slate-900">
                        {c.code}
                      </td>
                      <td className="px-4 py-2 text-slate-700">
                        {KIND_LABEL[c.kind]}
                      </td>
                      <td className="px-4 py-2 text-slate-700">
                        {describeValue(c.kind, c.value)}
                      </td>
                      <td className="px-4 py-2 text-slate-700">
                        {c.usedCount} / {c.maxUses}
                        {exhausted && (
                          <span className="ml-2 text-[10px] font-semibold uppercase text-rose-600">
                            Exhausted
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-slate-700">
                        {c.expiresAt ? (
                          <>
                            {new Date(c.expiresAt).toLocaleString()}
                            {expired && (
                              <span className="ml-2 text-[10px] font-semibold uppercase text-rose-600">
                                Expired
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-400">Never</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-500 max-w-xs truncate">
                        {c.notes ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {pendingDeleteId === c.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-xs text-red-600 font-medium">Delete?</span>
                            <button type="button" onClick={() => void remove(c.id)} className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded">Yes</button>
                            <button type="button" onClick={() => setPendingDeleteId(null)} className="text-xs border border-slate-300 text-slate-600 hover:bg-slate-50 font-semibold px-2 py-1 rounded">No</button>
                          </div>
                        ) : (
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(c.id)}
                          className="text-xs text-rose-600 hover:text-rose-700 hover:underline"
                          disabled={c.usedCount > 0}
                          title={
                            c.usedCount > 0
                              ? "Code has redemptions; cannot delete."
                              : "Delete code"
                          }
                        >
                          Delete
                        </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
