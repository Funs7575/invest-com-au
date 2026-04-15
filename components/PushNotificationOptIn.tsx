"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Browser push opt-in flow.
 *
 * Wave 5 shipped /api/push/subscribe (the server endpoint that
 * stores the Web Push subscription keyed to a set of topic
 * preferences). This component is the UI that actually asks the
 * browser for permission and POSTs the subscription.
 *
 * Flow:
 *   1. Check support (navigator.serviceWorker + Notification API)
 *   2. If dismissed in localStorage, don't show
 *   3. Button opens a small dialog with topic checkboxes
 *   4. User submits → we request Notification.permission → if
 *      granted, call sw.pushManager.subscribe() and POST to
 *      /api/push/subscribe with the keys + chosen topics
 *   5. Success: stamp "subscribed" in localStorage and hide
 *      the opt-in until localStorage is cleared
 *
 * Respects user choice: if they dismiss, we don't re-prompt for
 * at least 7 days.
 */

const TOPICS = [
  { value: "fee_changes", label: "Broker fee changes" },
  { value: "deals", label: "Broker deals + promotions" },
  { value: "articles", label: "New articles + guides" },
  { value: "price_drops", label: "Price drop alerts (watchlist)" },
];

const LS_KEY = "push_optin_state";
const LS_DISMISS_DAYS = 7;

type OptInState =
  | { status: "subscribed"; at: number }
  | { status: "dismissed"; at: number };

export default function PushNotificationOptIn() {
  const [supported, setSupported] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [topics, setTopics] = useState<Record<string, boolean>>({
    fee_changes: true,
    deals: false,
    articles: true,
    price_drops: false,
  });
  const [status, setStatus] = useState<
    "idle" | "requesting" | "subscribing" | "done" | "denied" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isSupported =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(isSupported);
    if (!isSupported) return;

    // Already subscribed? Hide.
    if (Notification.permission === "granted") {
      setHidden(true);
      return;
    }
    // Already denied? Hide — asking again is rude and useless.
    if (Notification.permission === "denied") {
      setHidden(true);
      return;
    }

    try {
      const raw = window.localStorage.getItem(LS_KEY);
      if (raw) {
        const state = JSON.parse(raw) as OptInState;
        if (state.status === "subscribed") {
          setHidden(true);
          return;
        }
        const days = (Date.now() - state.at) / (1000 * 60 * 60 * 24);
        if (days < LS_DISMISS_DAYS) {
          setHidden(true);
          return;
        }
      }
    } catch {
      // ignore
    }
    setHidden(false);
  }, []);

  const dismiss = useCallback(() => {
    setHidden(true);
    setDialogOpen(false);
    try {
      window.localStorage.setItem(
        LS_KEY,
        JSON.stringify({ status: "dismissed", at: Date.now() } satisfies OptInState),
      );
    } catch {
      // ignore
    }
  }, []);

  const toggleTopic = useCallback((t: string) => {
    setTopics((prev) => ({ ...prev, [t]: !prev[t] }));
  }, []);

  const subscribe = useCallback(async () => {
    setError(null);
    setStatus("requesting");
    try {
      if (!("serviceWorker" in navigator) || !("Notification" in window)) {
        throw new Error("Your browser doesn't support push notifications");
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      setStatus("subscribing");
      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        throw new Error("Push is not configured");
      }
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // Cast to BufferSource — the DOM types in Next 16 narrow
        // to a strict ArrayBuffer view; the Web Push spec accepts
        // the Uint8Array returned by urlBase64ToUint8Array.
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as BufferSource,
      });

      const selectedTopics = Object.entries(topics)
        .filter(([, on]) => on)
        .map(([t]) => t);

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          topics: selectedTopics,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setStatus("done");
      try {
        window.localStorage.setItem(
          LS_KEY,
          JSON.stringify({ status: "subscribed", at: Date.now() } satisfies OptInState),
        );
      } catch {
        // ignore
      }
      setTimeout(() => {
        setHidden(true);
        setDialogOpen(false);
      }, 1600);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Subscription failed");
    }
  }, [topics]);

  if (!supported || hidden) return null;

  return (
    <>
      {/* Floating banner prompt */}
      {!dialogOpen && (
        <div className="fixed bottom-4 left-4 z-[9997] max-w-sm bg-white border border-slate-200 rounded-xl shadow-lg p-4 print:hidden">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <span aria-hidden="true">🔔</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900">
                Get fee change alerts
              </p>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Browser notifications when brokers change fees or run deals.
                No spam — pick which topics interest you.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setDialogOpen(true)}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-900 text-white hover:bg-slate-800"
                >
                  Choose topics
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  className="px-3 py-1.5 text-xs font-semibold rounded text-slate-600 hover:bg-slate-100"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Topic dialog */}
      {dialogOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="push-dialog-title"
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4 print:hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDialogOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5">
            <h2 id="push-dialog-title" className="text-lg font-bold text-slate-900 mb-1">
              Notification topics
            </h2>
            <p className="text-xs text-slate-600 mb-4">
              Pick the topics you want alerts for. You can change
              these any time from the footer.
            </p>

            {status === "done" ? (
              <div role="status" className="bg-emerald-50 border border-emerald-200 rounded px-3 py-3 text-sm text-emerald-800 text-center">
                ✓ Subscribed. We&apos;ll only ping you about the topics you picked.
              </div>
            ) : status === "denied" ? (
              <div role="alert" className="bg-amber-50 border border-amber-200 rounded px-3 py-3 text-sm text-amber-900">
                <p>
                  You declined in the browser prompt. To subscribe
                  later, you&apos;ll need to re-enable notifications
                  for this site in your browser settings.
                </p>
                <button
                  type="button"
                  onClick={dismiss}
                  className="mt-3 px-3 py-1 text-xs font-semibold rounded bg-white border border-slate-300 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <fieldset className="space-y-2 mb-4">
                  <legend className="sr-only">Topics</legend>
                  {TOPICS.map((t) => (
                    <label
                      key={t.value}
                      className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${
                        topics[t.value]
                          ? "border-amber-400 bg-amber-50"
                          : "border-slate-200"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!!topics[t.value]}
                        onChange={() => toggleTopic(t.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-slate-800">{t.label}</span>
                    </label>
                  ))}
                </fieldset>

                {error && (
                  <p role="alert" className="text-xs text-red-700 mb-2">
                    {error}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={subscribe}
                    disabled={
                      status === "requesting" || status === "subscribing" || Object.values(topics).every((v) => !v)
                    }
                    className="flex-1 py-2 rounded bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 disabled:opacity-50"
                  >
                    {status === "requesting"
                      ? "Requesting permission…"
                      : status === "subscribing"
                        ? "Subscribing…"
                        : "Enable notifications"}
                  </button>
                  <button
                    type="button"
                    onClick={dismiss}
                    className="py-2 px-3 rounded border border-slate-300 text-slate-700 text-sm hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Convert a base64 VAPID public key to Uint8Array for
 * PushManager.subscribe. Standard snippet from the Web Push spec.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = typeof window !== "undefined" ? window.atob(base64) : "";
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}
