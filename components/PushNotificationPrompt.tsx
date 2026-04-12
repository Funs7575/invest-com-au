"use client";

import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/Icon";

const TOPICS = [
  { id: "fee_changes", label: "Fee Changes", desc: "When a broker changes their fees" },
  { id: "deals", label: "New Deals", desc: "Exclusive sign-up offers and promos" },
  { id: "price_drops", label: "Price Drops", desc: "Brokerage fee reductions" },
  { id: "articles", label: "New Articles", desc: "Guides, reviews, and analysis" },
] as const;

const LS_KEY = "inv_push_dismissed";
const LS_SUBSCRIBED_KEY = "inv_push_subscribed";

function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export default function PushNotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<"banner" | "topics" | "done">("banner");
  const [selectedTopics, setSelectedTopics] = useState<string[]>(["fee_changes", "deals"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPushSupported()) return;
    // Don't show if already dismissed or subscribed
    const dismissed = localStorage.getItem(LS_KEY);
    const subscribed = localStorage.getItem(LS_SUBSCRIBED_KEY);
    if (dismissed || subscribed) return;
    // Don't show if permission already denied
    if (Notification.permission === "denied") return;
    // Show after a short delay
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(LS_KEY, "1");
  }, []);

  function toggleTopic(id: string) {
    setSelectedTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  async function subscribe() {
    if (selectedTopics.length === 0) {
      setError("Select at least one topic.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Notification permission was denied. You can enable it in your browser settings.");
        setLoading(false);
        return;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register("/sw-push.js");
      await navigator.serviceWorker.ready;

      // Get VAPID public key from meta tag or hardcoded
      const vapidMeta = document.querySelector('meta[name="vapid-key"]');
      const vapidKey = vapidMeta?.getAttribute("content") || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

      if (!vapidKey) {
        setError("Push notifications are not configured yet. Please try again later.");
        setLoading(false);
        return;
      }

      // Subscribe via Push API
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as ArrayBuffer,
      });

      // Send subscription to our backend
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          topics: selectedTopics,
        }),
      });

      if (!res.ok) {
        throw new Error("Subscription failed");
      }

      localStorage.setItem(LS_SUBSCRIBED_KEY, "1");
      setStep("done");
    } catch (err) {
      console.error("Push subscribe error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 animate-in slide-in-from-bottom-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
        {/* Banner step */}
        {step === "banner" && (
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <Icon name="bell" size={18} className="text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-slate-900">Get notified when broker fees change</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Stay ahead with instant alerts on fee changes, new deals, and more.
                </p>
              </div>
              <button
                onClick={dismiss}
                className="text-slate-400 hover:text-slate-600 shrink-0 -mt-1 -mr-1 p-1"
                aria-label="Dismiss"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setStep("topics")}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Enable Notifications
              </button>
              <button
                onClick={dismiss}
                className="px-4 py-2 text-slate-500 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
        )}

        {/* Topics step */}
        {step === "topics" && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-sm text-slate-900">What do you want to hear about?</p>
              <button onClick={dismiss} className="text-slate-400 hover:text-slate-600 p-1" aria-label="Close">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-2 mb-4">
              {TOPICS.map((topic) => {
                const active = selectedTopics.includes(topic.id);
                return (
                  <label
                    key={topic.id}
                    className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      active
                        ? "border-emerald-300 bg-emerald-50/50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleTopic(topic.id)}
                      className="mt-0.5 accent-emerald-600"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900">{topic.label}</p>
                      <p className="text-[0.69rem] text-slate-500">{topic.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
            {error && (
              <p className="text-xs text-red-600 mb-2">{error}</p>
            )}
            <button
              onClick={subscribe}
              disabled={loading || selectedTopics.length === 0}
              className="w-full px-4 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Subscribing..." : "Subscribe"}
            </button>
          </div>
        )}

        {/* Done step */}
        {step === "done" && (
          <div className="p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-2">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-bold text-sm text-slate-900 mb-1">You&apos;re subscribed!</p>
            <p className="text-xs text-slate-500 mb-3">We&apos;ll notify you when something important happens.</p>
            <button
              onClick={() => setVisible(false)}
              className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Convert a base64-encoded VAPID public key to a Uint8Array
 * for use with PushManager.subscribe().
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
