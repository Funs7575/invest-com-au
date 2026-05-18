"use client";

import { useEffect, useState } from "react";

/**
 * Sharesight connect / sync / disconnect UI for /account/holdings.
 *
 * Rendered next to the CSV-import card. Three modes:
 *
 *   - not_connected: shows a "Connect Sharesight" button that fires off
 *     the OAuth flow (a server-side redirect chain).
 *   - connected:     shows last-synced timestamp + "Sync now" + "Disconnect".
 *   - not_configured: shows a passive helper line so the founder can
 *     spot a missing env var in dev without the button silently breaking.
 *
 * The `?sharesight=<reason>` query param surfaced by the OAuth callback
 * is read once on mount, displayed inline, then stripped from the URL
 * via history.replaceState so a hard refresh doesn't replay the toast.
 */

export interface SharesightConnectProps {
  initialState: SharesightConnectionState;
  configured: boolean;
}

export interface SharesightConnectionState {
  connected: boolean;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
}

type SyncResult =
  | { ok: true; inserted: number; skipped: number; errors: number }
  | { ok: false; error: string };

const REASON_MESSAGES: Record<string, string> = {
  connected: "Sharesight connected. Hit “Sync now” to import your holdings.",
  not_configured: "Sharesight isn't configured on this environment yet.",
  state_mismatch: "Sharesight sign-in failed (security check). Please try again.",
  token_exchange_failed: "Sharesight rejected the sign-in. Please try again.",
  portfolio_fetch_failed: "Connected, but we couldn't read your Sharesight portfolios.",
  no_portfolios: "No portfolios found on your Sharesight account.",
  encryption_failed: "Couldn't securely store your Sharesight session. Please try again.",
  storage_failed: "Couldn't save your Sharesight connection. Please try again.",
  missing_code: "Sharesight didn't return a sign-in code. Please try again.",
};

export default function SharesightConnect({ initialState, configured }: SharesightConnectProps) {
  const [state, setState] = useState<SharesightConnectionState>(initialState);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const reason = url.searchParams.get("sharesight");
    if (reason) {
      const msg = REASON_MESSAGES[reason] ?? `Sharesight: ${reason}`;
      if (reason === "connected") setMessage(msg);
      else setError(msg);
      url.searchParams.delete("sharesight");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const onSync = async () => {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/account/holdings/sharesight/sync", { method: "POST" });
      const json: SyncResult = res.ok
        ? { ok: true, ...(await res.json()) }
        : { ok: false, error: ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "sync_failed" };
      if (!json.ok) {
        setError(syncErrorLabel(json.error));
        setBusy(false);
        return;
      }
      const parts = [`${json.inserted} new holding${json.inserted === 1 ? "" : "s"} imported`];
      if (json.skipped > 0) parts.push(`${json.skipped} already in your list`);
      if (json.errors > 0) parts.push(`${json.errors} row${json.errors === 1 ? "" : "s"} skipped`);
      setMessage(parts.join(" · "));
      setState((prev) => ({ ...prev, lastSyncedAt: new Date().toISOString(), lastSyncError: null }));
      // Soft-refresh so newly-inserted rows appear in the table without a full reload.
      if (json.inserted > 0) {
        // location.reload() rather than a router refresh because the server
        // page re-fetches prices in parallel — easiest correct state.
        window.location.reload();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setBusy(false);
    }
  };

  const onDisconnect = async () => {
    if (!confirm("Disconnect Sharesight? Your existing imported holdings stay.")) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/account/holdings/sharesight/disconnect", { method: "POST" });
      if (!res.ok) throw new Error("disconnect_failed");
      setState({ connected: false, lastSyncedAt: null, lastSyncError: null });
      setMessage("Sharesight disconnected.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not disconnect.");
    } finally {
      setBusy(false);
    }
  };

  if (!configured) {
    return (
      <section className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <h2 className="text-base font-semibold text-slate-900">Sharesight import</h2>
        <p className="text-sm text-slate-600 mt-1">
          Sharesight integration is coming soon. We&apos;ll let you connect your portfolio
          and import all holdings with one click.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
        <h2 className="text-base font-semibold text-indigo-900">Sharesight import</h2>
        {state.connected && state.lastSyncedAt && (
          <p className="text-xs text-indigo-800/80">
            Last synced {timeAgo(state.lastSyncedAt)}
          </p>
        )}
      </div>
      {!state.connected ? (
        <>
          <p className="text-sm text-indigo-900/90 mb-3">
            Already track your portfolio on Sharesight? Connect and import every
            holding in one click. Read-only — we never place trades.
          </p>
          <a
            href="/api/account/holdings/sharesight/connect"
            className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            Connect Sharesight
          </a>
        </>
      ) : (
        <>
          <p className="text-sm text-indigo-900/90 mb-3">
            New positions sync into the list below. Dedups against what you already have.
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={onSync}
              disabled={busy}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg"
            >
              {busy ? "Syncing…" : "Sync now"}
            </button>
            <button
              type="button"
              onClick={onDisconnect}
              disabled={busy}
              className="border border-indigo-300 text-indigo-900 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-100 disabled:opacity-60"
            >
              Disconnect
            </button>
          </div>
        </>
      )}
      {message && (
        <p className="text-sm text-emerald-800 mt-3" role="status">{message}</p>
      )}
      {error && (
        <p className="text-sm text-red-700 mt-3" role="alert">{error}</p>
      )}
    </section>
  );
}

function syncErrorLabel(code: string): string {
  switch (code) {
    case "not_connected":
      return "Sharesight isn't connected. Connect first, then sync.";
    case "refresh_required_but_no_token":
    case "refresh_failed":
      return "Your Sharesight session has expired. Disconnect and reconnect.";
    case "no_portfolio_linked":
      return "No portfolio is linked to your connection. Reconnect to pick one.";
    case "fetch_failed":
      return "Sharesight didn't respond. Try again in a minute.";
    case "sharesight_not_configured":
      return "Sharesight isn't configured on this environment yet.";
    default:
      return `Sync failed: ${code}`;
  }
}

function timeAgo(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "recently";
  const delta = Math.max(0, Date.now() - t);
  const mins = Math.floor(delta / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
