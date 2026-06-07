"use client";

/**
 * PushOptIn — browser push notification opt-in widget.
 *
 * Rendered on /account/alerts. When the user clicks "Enable", we:
 *   1. Register the service worker (sw.js — the unified caching + push worker).
 *   2. Subscribe via PushManager.subscribe with the site's VAPID public key.
 *   3. POST the subscription to /api/push/subscribe with topic "fee_changes".
 *   4. POST { browser_push: true } to /api/notification-preferences so the
 *      dispatch helper knows the user has opted in.
 *
 * When the user clicks "Disable", we reverse step 4 (set browser_push:false).
 * The browser subscription itself is left intact — the user can re-enable
 * without needing to re-subscribe at the browser level.
 *
 * AFSL note: this controls delivery of factual rate/fee data alerts only.
 * No personal advice is triggered or implied.
 */

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";

type PermissionState = "default" | "granted" | "denied" | "unsupported" | "loading";

interface Props {
  /** Current server-side preference value (from notification_preferences row). */
  initialEnabled: boolean;
}

export default function PushOptIn({ initialEnabled }: Props) {
  const [permission, setPermission] = useState<PermissionState>("loading");
  const [enabled, setEnabled] = useState(initialEnabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect browser push support + current permission post-mount. PushManager /
  // Notification are browser-only (absent during SSR), so this can't run in render;
  // the "loading" initial state keeps server + client markup in sync until it does.
  // The one-shot setState is intentional (single detection, not a render loop).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("PushManager" in window) ||
      !("serviceWorker" in navigator)
    ) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as PermissionState);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleEnable = async () => {
    setBusy(true);
    setError(null);
    try {
      // 1. Register / retrieve service worker
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      // 2. Request browser permission + subscribe
      const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublic) {
        setError("Push notifications are not configured. Please try again later.");
        setBusy(false);
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // applicationServerKey accepts BufferSource; we pass the ArrayBuffer
        // extracted from the Uint8Array to satisfy the stricter TS type.
        applicationServerKey: urlBase64ToUint8Array(vapidPublic).buffer as ArrayBuffer,
      });

      setPermission("granted");

      const subJson = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      // 3. Persist subscription in push_subscriptions (with user_id set by cookie)
      const subRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subJson,
          topics: ["fee_changes"],
        }),
      });
      if (!subRes.ok) {
        setError("Failed to save push subscription. Please try again.");
        setBusy(false);
        return;
      }

      // 4. Set browser_push preference to true
      await fetch("/api/notification-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ browser_push: true }),
      });

      setEnabled(true);
    } catch (err) {
      if (err instanceof Error && err.name === "NotAllowedError") {
        setPermission("denied");
        setError("Browser permission denied. Enable notifications in your browser settings.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
    setBusy(false);
  };

  const handleDisable = async () => {
    setBusy(true);
    setError(null);
    try {
      await fetch("/api/notification-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ browser_push: false }),
      });
      setEnabled(false);
    } catch {
      setError("Failed to update preference. Please try again.");
    }
    setBusy(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (permission === "loading") return null;

  if (permission === "unsupported") {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        Browser push notifications are not supported in this browser.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
          <Icon name="bell" size={18} className="text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900">Browser push notifications</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Get instant alerts in your browser when a rate or fee crosses your
            threshold — even when you&apos;re not on the site.
          </p>
          {error && (
            <p role="alert" className="mt-1.5 text-xs text-red-600">{error}</p>
          )}
          {permission === "denied" && !error && (
            <p className="mt-1.5 text-xs text-amber-600">
              Notifications are blocked in your browser settings.
            </p>
          )}
          <p className="mt-2 text-[0.65rem] text-slate-400">
            Factual rate/fee data alerts only — not personal financial advice.
          </p>
        </div>
        <div className="shrink-0">
          {enabled ? (
            <button
              type="button"
              disabled={busy}
              aria-busy={busy}
              onClick={handleDisable}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-red-200 hover:text-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? "Saving…" : "Disable"}
            </button>
          ) : (
            <button
              type="button"
              disabled={busy || permission === "denied"}
              aria-busy={busy}
              onClick={handleEnable}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? "Enabling…" : "Enable"}
            </button>
          )}
        </div>
      </div>

      {enabled && (
        <div className="mt-2 flex items-center gap-1.5 text-[0.65rem] text-emerald-600 font-medium pl-12">
          <Icon name="check-circle" size={12} />
          Push notifications active
        </div>
      )}
    </div>
  );
}

// ── VAPID key conversion ───────────────────────────────────────────────────────

/**
 * Convert a URL-safe base64 VAPID public key to a Uint8Array for
 * PushManager.subscribe({ applicationServerKey }).
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
