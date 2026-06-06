"use client";

import { useEffect, useState, useTransition } from "react";

interface EndpointRow {
  id: number;
  url: string;
  enabled: boolean;
  event_subscriptions: string[];
}

interface Props {
  /** Pre-fetched endpoints from the server page to avoid an extra
   * round-trip on first render. Client-side refresh keeps it in sync
   * after mutations. */
  initialEndpoints: EndpointRow[];
  /** Whitelisted event names from the API route. */
  allowedEvents: readonly string[];
}

/**
 * Self-serve outbound-webhook manager for the advisor portal.
 *
 * Adds endpoints, lists current ones, lets the pro toggle them off.
 * Signing secret is shown ONCE at creation time — copy-to-clipboard,
 * with a "I've saved it" confirm before we dismiss the modal.
 */
export default function WebhooksClient({
  initialEndpoints,
  allowedEvents,
}: Props) {
  const [endpoints, setEndpoints] = useState(initialEndpoints);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [url, setUrl] = useState("");
  const [subs, setSubs] = useState<string[]>([]);
  const [revealedSecret, setRevealedSecret] = useState<{
    url: string;
    secret: string;
  } | null>(null);

  async function refresh() {
    try {
      const res = await fetch("/api/advisor-portal/webhooks");
      const body = (await res.json()) as { endpoints?: EndpointRow[] };
      if (body.endpoints) setEndpoints(body.endpoints);
    } catch {
      /* silent */
    }
  }

  async function submit() {
    setError(null);
    if (!url.trim()) {
      setError("Endpoint URL is required.");
      return;
    }
    if (subs.length === 0) {
      setError("Pick at least one event to subscribe to.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/advisor-portal/webhooks", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: url.trim(), eventSubscriptions: subs }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          endpoint?: EndpointRow;
          signingSecret?: string;
          error?: string;
        };
        if (!res.ok || !body.endpoint || !body.signingSecret) {
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        setRevealedSecret({ url: body.endpoint.url, secret: body.signingSecret });
        setUrl("");
        setSubs([]);
        setCreating(false);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create endpoint.");
      }
    });
  }

  async function remove(id: number) {
    if (!confirm("Disable this endpoint? You can add a new one later.")) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/advisor-portal/webhooks?id=${id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to disable.");
      }
    });
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div className="space-y-6">
      {error && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 text-rose-800 text-sm p-3">
          {error}
        </div>
      )}

      {revealedSecret && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 space-y-3">
          <p className="text-sm font-bold text-amber-900">
            Save this signing secret — it&apos;s only shown once.
          </p>
          <p className="text-xs text-amber-800">
            Endpoint: <code className="text-[11px]">{revealedSecret.url}</code>
          </p>
          <div className="flex gap-2 items-center">
            <code className="flex-1 break-all text-xs bg-white border border-amber-200 rounded-md px-2 py-1.5">
              {revealedSecret.secret}
            </code>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(revealedSecret.secret);
              }}
              className="text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-900 px-3 py-1.5 rounded-md"
            >
              Copy
            </button>
          </div>
          <button
            type="button"
            onClick={() => setRevealedSecret(null)}
            className="text-xs font-semibold text-amber-900 underline"
          >
            I&apos;ve saved it — dismiss
          </button>
        </div>
      )}

      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Your webhook endpoints
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Subscribe to brief events so your CRM / Slack / Zapier reacts
              automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreating((s) => !s)}
            className="text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white px-3 py-2 rounded-md"
          >
            {creating ? "Cancel" : "Add endpoint"}
          </button>
        </div>

        {creating && (
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-4 space-y-3">
            <label className="block">
              <span className="text-xs font-semibold text-violet-900">
                Endpoint URL
              </span>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/hooks/invest"
                className="mt-1 w-full rounded-md border border-violet-300 bg-white text-sm px-3 py-2"
              />
            </label>
            <div>
              <p className="text-xs font-semibold text-violet-900 mb-1.5">
                Events to receive
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {allowedEvents.map((ev) => (
                  <label
                    key={ev}
                    className="flex items-center gap-2 text-xs text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={subs.includes(ev)}
                      onChange={(e) => {
                        setSubs((s) =>
                          e.target.checked
                            ? [...s, ev]
                            : s.filter((x) => x !== ev),
                        );
                      }}
                      className="rounded border-violet-400"
                    />
                    <code className="text-[11px]">{ev}</code>
                  </label>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="rounded-md bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-2"
            >
              {pending ? "Saving…" : "Save endpoint"}
            </button>
          </div>
        )}

        {endpoints.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">
            No endpoints yet. Add one to start receiving signed POSTs when
            briefs change.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {endpoints.map((ep) => (
              <li
                key={ep.id}
                className="py-3 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 break-all">
                    {ep.url}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {ep.event_subscriptions.length} event
                    {ep.event_subscriptions.length === 1 ? "" : "s"}:{" "}
                    <code className="text-[10px]">
                      {ep.event_subscriptions.join(", ")}
                    </code>
                  </p>
                  {!ep.enabled && (
                    <p className="text-[11px] text-rose-600 mt-1 font-semibold">
                      Disabled
                    </p>
                  )}
                </div>
                {ep.enabled && (
                  <button
                    type="button"
                    onClick={() => remove(ep.id)}
                    disabled={pending}
                    className="text-xs text-rose-600 hover:text-rose-800 font-semibold shrink-0 px-2 py-1.5"
                  >
                    Disable
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-2">
          Verifying signatures
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Each POST includes <code className="text-[11px]">X-Invest-Signature: t=&lt;unix_ts&gt;,v1=&lt;hex_hmac&gt;</code>.
          Verify by computing <code className="text-[11px]">HMAC-SHA256(secret, `${"{t}"}.${"{body}"}`)</code>
          and comparing constant-time. Reject if the timestamp is more than 5
          minutes old.
        </p>
      </section>
    </div>
  );
}
