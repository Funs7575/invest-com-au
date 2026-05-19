"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface ConnectionStatus {
  configured: boolean;
  connected: boolean;
  connectedAt: string | null;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
}

interface SyncResponse {
  inserted?: number;
  skippedAsDuplicate?: number;
  errors?: { holdingId: number | null; ticker: string | null; reason: string }[];
  error?: string;
  message?: string;
}

interface Props {
  initialStatus: ConnectionStatus;
}

/**
 * Sharesight connect / sync / disconnect control block, mounted under the
 * CSV import on /account/holdings. Three states:
 *
 *   - configured=false (env vars missing in prod): shows a quiet
 *     "Sharesight sync coming soon" line and nothing else. The PR can land
 *     before the founder fills in env vars; the rest of the holdings page
 *     keeps working.
 *   - configured=true, connected=false: "Connect Sharesight" button →
 *     redirects to /api/account/holdings/sharesight/connect → Sharesight
 *     authorize → callback.
 *   - configured=true, connected=true: "Sync now" + "Disconnect" buttons,
 *     plus a small status line ("Last synced 5 min ago").
 *
 * Picks up `?sharesight=connected` / `?sharesight=error&reason=...` from
 * the callback and flashes a banner.
 */
export default function SharesightConnectButton({ initialStatus }: Props) {
  const router = useRouter();
  const search = useSearchParams();
  const [status, setStatus] = useState<ConnectionStatus>(initialStatus);
  const [busy, setBusy] = useState<"sync" | "disconnect" | null>(null);
  const [result, setResult] = useState<SyncResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  useEffect(() => {
    const param = search.get("sharesight");
    if (param === "connected") {
      setFlash({ kind: "ok", text: "Sharesight connected." });
    } else if (param === "error") {
      const reason = search.get("reason") ?? "unknown";
      setFlash({
        kind: "err",
        text: `Sharesight connection failed (${reason}).`,
      });
    }
  }, [search]);

  if (!status.configured) {
    return (
      <p className="text-xs text-slate-500">
        Sharesight sync coming soon.
      </p>
    );
  }

  const handleSync = async () => {
    setError(null);
    setResult(null);
    setBusy("sync");
    try {
      const res = await fetch("/api/account/holdings/sharesight/sync", {
        method: "POST",
      });
      const json = (await res.json().catch(() => ({}))) as SyncResponse;
      if (!res.ok) {
        setError(json.message ?? json.error ?? `Sync failed (${res.status}).`);
        return;
      }
      setResult(json);
      setStatus((s) => ({
        ...s,
        lastSyncedAt: new Date().toISOString(),
        lastSyncError: null,
      }));
      if ((json.inserted ?? 0) > 0) {
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setBusy(null);
    }
  };

  const handleDisconnect = async () => {
    setError(null);
    setResult(null);
    setBusy("disconnect");
    try {
      const res = await fetch("/api/account/holdings/sharesight/disconnect", {
        method: "POST",
      });
      if (!res.ok) {
        setError(`Disconnect failed (${res.status}).`);
        return;
      }
      setStatus({
        configured: true,
        connected: false,
        connectedAt: null,
        lastSyncedAt: null,
        lastSyncError: null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Disconnect failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-2">
      {flash && (
        <div
          className={
            flash.kind === "ok"
              ? "text-xs px-3 py-2 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "text-xs px-3 py-2 rounded-md bg-rose-50 text-rose-900 border border-rose-200"
          }
        >
          {flash.text}
        </div>
      )}

      {status.connected ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSync}
            disabled={busy !== null}
            className="text-sm font-medium text-emerald-700 hover:text-emerald-900 underline underline-offset-2 disabled:opacity-50"
          >
            {busy === "sync" ? "Syncing…" : "Sync Sharesight now"}
          </button>
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={busy !== null}
            className="text-sm text-slate-600 hover:text-slate-800 underline underline-offset-2 disabled:opacity-50"
          >
            {busy === "disconnect" ? "Disconnecting…" : "Disconnect"}
          </button>
          <p className="text-xs text-slate-500">
            {status.lastSyncedAt
              ? `Last synced ${relTime(status.lastSyncedAt)}.`
              : "Connected. No sync yet."}
          </p>
        </div>
      ) : (
        <a
          href="/api/account/holdings/sharesight/connect"
          className="inline-flex items-center text-sm font-medium text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
        >
          Connect Sharesight
        </a>
      )}

      {error && (
        <p className="text-xs text-rose-700">{error}</p>
      )}

      {result && (
        <p className="text-xs text-slate-600">
          Imported {result.inserted ?? 0} new
          {(result.skippedAsDuplicate ?? 0) > 0
            ? ` · ${result.skippedAsDuplicate} already present`
            : ""}
          {(result.errors?.length ?? 0) > 0
            ? ` · ${result.errors!.length} skipped (see Sharesight notes below)`
            : ""}
          .
        </p>
      )}
      {result?.errors && result.errors.length > 0 && (
        <details className="text-xs text-slate-500">
          <summary className="cursor-pointer">Skipped rows</summary>
          <ul className="mt-1 space-y-0.5 pl-4 list-disc">
            {result.errors.slice(0, 20).map((e, i) => (
              <li key={i}>
                {e.ticker ?? "(no ticker)"}: {e.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function relTime(iso: string): string {
  const diffMs = Date.now() - Date.parse(iso);
  if (!Number.isFinite(diffMs)) return "just now";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
