"use client";

import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/Icon";

/**
 * Adviser Push Command Centre — supply-side web push opt-in.
 *
 * Mirrors the consumer `PushNotificationOptIn` flow (browser permission →
 * pushManager.subscribe → POST keys) but against the advisor-session route
 * `/api/advisor-portal/push-subscription`, and adds per-event preference
 * toggles.
 *
 * Self-contained on purpose: this is a "use client" component, so it must
 * never value-import a module that pulls in lib/supabase/server|admin. The
 * event keys + labels are duplicated here rather than imported from
 * lib/advisor-push (which value-imports the admin client). The list is small
 * and the route validates the keys server-side, so drift is caught at the API.
 *
 * Dormancy: the whole panel hides unless GET reports `enabled:true` (the
 * `advisor_push` flag, resolved server-side). Flag off ⇒ nothing renders.
 */

type AdvisorPushEvent = "new_brief" | "new_message" | "dispute" | "sla_warning";

const EVENT_COPY: { key: AdvisorPushEvent; label: string; desc: string }[] = [
  {
    key: "new_brief",
    label: "New matching brief",
    desc: "Hear about new briefs you can accept in seconds — beat slower advisers to the response.",
  },
  {
    key: "new_message",
    label: "New consumer message",
    desc: "A consumer replied in a brief chat. Answer from your phone before they cool off.",
  },
  {
    key: "dispute",
    label: "Dispute opened",
    desc: "A dispute was raised on one of your accepted briefs — respond promptly.",
  },
  {
    key: "sla_warning",
    label: "Response SLA warning",
    desc: "You're approaching the 24-hour first-response deadline on an accepted brief.",
  },
];

type Prefs = Record<AdvisorPushEvent, boolean>;

const DEFAULT_PREFS: Prefs = {
  new_brief: true,
  new_message: true,
  dispute: true,
  sla_warning: true,
};

function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export default function PushCommandCentre() {
  // null = still loading the feature flag; false = feature dark (render nothing).
  const [featureEnabled, setFeatureEnabled] = useState<boolean | null>(null);
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [permission, setPermission] = useState<NotificationPermission | "unknown">("unknown");
  const [busy, setBusy] = useState(false);
  const [savedPrefs, setSavedPrefs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSupported(isPushSupported());
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
    let cancelled = false;
    fetch("/api/advisor-portal/push-subscription")
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (d: { enabled?: boolean; subscribed?: boolean; preferences?: Partial<Prefs> } | null) => {
          if (cancelled || !d) {
            if (!cancelled) setFeatureEnabled(false);
            return;
          }
          setFeatureEnabled(d.enabled === true);
          setSubscribed(d.subscribed === true);
          if (d.preferences) setPrefs({ ...DEFAULT_PREFS, ...d.preferences });
        },
      )
      .catch(() => {
        if (!cancelled) setFeatureEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const togglePref = useCallback((key: AdvisorPushEvent) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
    setSavedPrefs(false);
  }, []);

  const enablePush = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      if (!isPushSupported()) {
        throw new Error("This browser doesn't support push notifications.");
      }
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setBusy(false);
        return;
      }

      // Ensure the SW is registered (the consumer prompt registers /sw.js at
      // scope "/"; reuse it). `ready` resolves once an active SW controls us.
      await navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
      const reg = await navigator.serviceWorker.ready;

      const vapidMeta = document.querySelector('meta[name="vapid-key"]');
      const vapidKey =
        vapidMeta?.getAttribute("content") ||
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        "";
      if (!vapidKey) {
        throw new Error("Push is not configured yet. Please try again later.");
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as BufferSource,
      });

      const res = await fetch("/api/advisor-portal/push-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON(), preferences: prefs }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      setSubscribed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't enable notifications.");
    } finally {
      setBusy(false);
    }
  }, [prefs]);

  const savePrefs = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/advisor-portal/push-subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: prefs }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      setSavedPrefs(true);
      setTimeout(() => setSavedPrefs(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save preferences.");
    } finally {
      setBusy(false);
    }
  }, [prefs]);

  const disablePush = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/advisor-portal/push-subscription", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe().catch(() => {});
      }
      setSubscribed(false);
    } catch {
      // Best-effort — leave subscribed true if we genuinely couldn't reach it.
    } finally {
      setBusy(false);
    }
  }, []);

  // Feature dark, still loading, or genuinely unknown → render nothing.
  if (featureEnabled !== true) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
          <Icon name="bell" size={16} className="text-violet-700" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900">Push notifications</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Hear about new matching briefs in seconds — answer from your phone lock screen.
            Response speed is the metric that wins leads.
          </p>
        </div>
      </div>

      {!supported ? (
        <div role="status" className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs text-slate-600">
          This browser doesn&apos;t support push notifications. Open the portal in Chrome,
          Edge, or Safari on your phone and add it to your home screen.
        </div>
      ) : permission === "denied" ? (
        <div role="alert" className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-900">
          Notifications are blocked for this site in your browser settings. Re-enable them
          there, then reload to turn on push.
        </div>
      ) : (
        <>
          {/* Per-event preference toggles */}
          <fieldset className="space-y-4">
            <legend className="sr-only">Which events to be notified about</legend>
            {EVENT_COPY.map(({ key, label, desc }) => (
              <div key={key} className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">{label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => togglePref(key)}
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                    prefs[key] ? "bg-violet-600" : "bg-slate-200"
                  }`}
                  role="switch"
                  aria-checked={prefs[key]}
                  aria-label={label}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
                      prefs[key] ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            ))}
          </fieldset>

          {error && (
            <p role="alert" className="text-xs text-red-600 mt-3">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-5 pt-4 border-t border-slate-100">
            {!subscribed ? (
              <button
                type="button"
                onClick={enablePush}
                disabled={busy}
                aria-busy={busy}
                className="px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {busy ? "Enabling…" : "Enable push notifications"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={savePrefs}
                  disabled={busy}
                  aria-busy={busy}
                  className="px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {busy ? "Saving…" : "Save preferences"}
                </button>
                {savedPrefs && (
                  <span role="status" className="text-sm text-emerald-600 font-medium">
                    Saved!
                  </span>
                )}
                <button
                  type="button"
                  onClick={disablePush}
                  disabled={busy}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 underline underline-offset-2"
                >
                  Turn off on this device
                </button>
              </>
            )}
          </div>

          {subscribed && (
            <p className="text-xs text-emerald-700 mt-2 flex items-center gap-1.5">
              <Icon name="check-circle" size={13} />
              Push is on for this device.
            </p>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Convert a base64url VAPID public key to Uint8Array for
 * PushManager.subscribe. Standard Web Push spec snippet (same as the
 * consumer opt-in).
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = typeof window !== "undefined" ? window.atob(base64) : "";
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}
