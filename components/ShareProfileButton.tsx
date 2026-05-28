"use client";

import { useCallback, useState } from "react";

interface TokenRecord {
  id: string;
  created_at: string;
  expires_at: string;
  consumed_at: string | null;
}

interface Props {
  /** Pre-loaded list of existing share tokens (server-rendered on first paint) */
  initialTokens?: TokenRecord[];
}

export default function ShareProfileButton({ initialTokens = [] }: Props) {
  const [tokens, setTokens] = useState<TokenRecord[]>(initialTokens);
  const [creating, setCreating] = useState(false);
  const [newShareUrl, setNewShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async () => {
    setCreating(true);
    setError(null);
    setNewShareUrl(null);
    try {
      const res = await fetch("/api/account/profile-share", { method: "POST" });
      const json = (await res.json()) as {
        share_url?: string;
        token?: string;
        expires_at?: string;
        error?: string;
      };
      if (!res.ok || !json.share_url) throw new Error(json.error ?? "Could not create share link.");
      setNewShareUrl(json.share_url);
      // Refresh the token list
      const listRes = await fetch("/api/account/profile-share");
      const listJson = (await listRes.json()) as { tokens?: TokenRecord[] };
      if (listJson.tokens) setTokens(listJson.tokens);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create share link.");
    } finally {
      setCreating(false);
    }
  }, []);

  const copy = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback — select the text
    }
  }, []);

  const activeTokens = tokens.filter(
    (t) => new Date(t.expires_at) > new Date(),
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-800 mb-1">Share profile with advisor</h2>
      <p className="text-sm text-slate-500 mb-4">
        Generate a read-only link to share your goals, quiz result, watchlist, and health score
        with a financial advisor. Links expire after 30 days.
      </p>

      {newShareUrl && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <p className="text-xs font-semibold text-emerald-800 mb-2">Share link created</p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={newShareUrl}
              aria-label="Shareable profile link"
              className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 select-all"
              onFocus={(e) => e.target.select()}
            />
            <button
              onClick={() => copy(newShareUrl)}
              className="text-xs font-semibold bg-emerald-700 text-white px-3 py-2 rounded-lg hover:bg-emerald-800 transition-colors shrink-0"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mb-4 text-sm text-red-600">{error}</p>
      )}

      <button
        onClick={create}
        disabled={creating}
        className="text-sm font-semibold bg-violet-700 text-white px-4 py-2.5 rounded-xl hover:bg-violet-800 transition-colors disabled:opacity-50"
      >
        {creating ? "Creating…" : "Generate share link"}
      </button>

      {activeTokens.length > 0 && (
        <div className="mt-5">
          <p className="text-xs uppercase tracking-wide text-slate-400 font-medium mb-2">
            Active links ({activeTokens.length})
          </p>
          <ul className="space-y-2">
            {activeTokens.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2"
              >
                <span>
                  Created {new Date(t.created_at).toLocaleDateString("en-AU")} ·{" "}
                  expires {new Date(t.expires_at).toLocaleDateString("en-AU")}
                </span>
                <span
                  className={
                    t.consumed_at
                      ? "text-emerald-700 font-medium"
                      : "text-slate-400"
                  }
                >
                  {t.consumed_at ? "Viewed" : "Not yet viewed"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400">
        Links contain only what you&apos;ve set in your investor profile — no financial account data.
        General information only; not personal advice.
      </p>
    </div>
  );
}
