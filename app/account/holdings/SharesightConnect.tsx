"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export interface SharesightConnectStatus {
  /** Whether the OAuth app is configured server-side. */
  configured: boolean;
  /** Whether the current user has tokens stored. */
  connected: boolean;
  /** ISO timestamp of most recent successful import, or null. */
  lastImportedAt: string | null;
  /** Most recent import error message, or null. */
  lastImportError: string | null;
}

interface ImportResponse {
  inserted?: number;
  updated?: number;
  skipped_non_sharesight?: number;
  errors?: Array<{ holdingId: string; reason: string }>;
  error?: string;
  message?: string;
}

function formatAgo(iso: string | null): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "never";
  const seconds = Math.max(1, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function SharesightConnect({ initial }: { initial: SharesightConnectStatus }) {
  const router = useRouter();
  const search = useSearchParams();
  const [status, setStatus] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const banner = search.get("sharesight");
  const reason = search.get("reason");

  useEffect(() => {
    if (banner === "connected") {
      setStatus((s) => ({ ...s, connected: true }));
    }
  }, [banner]);

  if (!status.configured) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Sharesight sync</h2>
          <span className="text-xs font-medium text-slate-500">Coming soon</span>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          One-click import of your full portfolio from Sharesight is on the way.
          For now, use CSV import or add holdings manually.
        </p>
      </div>
    );
  }

  const handleImport = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/account/sharesight/import", { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as ImportResponse;
      if (!res.ok) {
        setError(json.message ?? json.error ?? `Import failed (${res.status}).`);
        return;
      }
      setResult(json);
      setStatus((s) => ({
        ...s,
        lastImportedAt: new Date().toISOString(),
        lastImportError: null,
      }));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/sharesight/disconnect", { method: "DELETE" });
      if (!res.ok) {
        setError(`Disconnect failed (${res.status}).`);
        return;
      }
      setStatus((s) => ({
        ...s,
        connected: false,
        lastImportedAt: null,
        lastImportError: null,
      }));
      setResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h2 className="text-base font-semibold text-slate-900">Sharesight sync</h2>
        {status.connected ? (
          <span className="text-xs font-medium text-emerald-700">Connected</span>
        ) : (
          <span className="text-xs font-medium text-slate-500">Not connected</span>
        )}
      </div>

      {banner === "connected" && (
        <p className="text-sm text-emerald-800 mb-3" role="status">
          Sharesight connected. Click <strong>Sync now</strong> to import your
          portfolio.
        </p>
      )}
      {banner === "error" && (
        <p className="text-sm text-red-700 mb-3" role="alert">
          Sharesight connect failed{reason ? ` — ${reason.replace(/_/g, " ")}` : ""}.
        </p>
      )}

      {!status.connected ? (
        <>
          <p className="text-sm text-slate-600 mb-3">
            Link your Sharesight account and we&apos;ll pull your holdings in
            automatically. Read-only — we never place trades.
          </p>
          <a
            href="/api/account/sharesight/connect"
            className="inline-block px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg"
          >
            Connect Sharesight
          </a>
        </>
      ) : (
        <>
          <p className="text-sm text-slate-600 mb-3">
            Last synced: <strong>{formatAgo(status.lastImportedAt)}</strong>.
            Re-running fetches any portfolio changes since the last sync.
          </p>
          {status.lastImportError && (
            <p className="text-xs text-amber-800 mb-3" role="status">
              Last import error: {status.lastImportError}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleImport}
              disabled={busy}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {busy ? "Syncing…" : "Sync now"}
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={busy}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-medium rounded-lg disabled:opacity-50"
            >
              Disconnect
            </button>
          </div>
        </>
      )}

      {error && (
        <p className="text-sm text-red-700 mt-3" role="alert">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-emerald-800">
            {result.inserted ?? 0} added · {result.updated ?? 0} updated
            {result.skipped_non_sharesight
              ? ` · ${result.skipped_non_sharesight} kept (manually managed)`
              : ""}
          </p>
          {result.errors && result.errors.length > 0 && (
            <details className="text-xs text-amber-900 border border-amber-200 bg-amber-50 rounded-lg p-3">
              <summary className="cursor-pointer font-semibold">
                {result.errors.length} row{result.errors.length === 1 ? "" : "s"} skipped
              </summary>
              <ul className="mt-2 space-y-1">
                {result.errors.map((e) => (
                  <li key={`${e.holdingId}-${e.reason}`} className="font-mono">
                    <span className="font-semibold">{e.holdingId}:</span> {e.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <p className="text-xs text-slate-500 mt-4">
        Read-only OAuth — we can only see your portfolio, never place trades.
        Disconnect any time to revoke access.
      </p>
    </div>
  );
}
