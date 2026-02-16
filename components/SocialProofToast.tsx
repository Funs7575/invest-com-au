"use client";

import { useState, useEffect } from "react";

const BROKER_NAMES = [
  "Stake", "SelfWealth", "CommSec", "CMC Markets", "Moomoo",
  "Interactive Brokers", "Superhero", "Tiger Brokers", "Swyftx", "CoinSpot",
];

const CITIES = [
  "Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide",
  "Gold Coast", "Canberra", "Hobart", "Darwin", "Newcastle",
];

const ACTIONS = [
  "just compared brokers",
  "took the broker quiz",
  "opened an account with",
  "compared fees on",
];

function generateNotification() {
  const city = CITIES[Math.floor(Math.random() * CITIES.length)];
  const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
  const broker = BROKER_NAMES[Math.floor(Math.random() * BROKER_NAMES.length)];
  const minutesAgo = Math.floor(Math.random() * 12) + 1;

  // Some actions include broker name, some don't
  const needsBroker = action.includes("with") || action.includes("on");
  const text = needsBroker
    ? `Someone in ${city} ${action} ${broker}`
    : `Someone in ${city} ${action}`;

  return { text, minutesAgo };
}

export default function SocialProofToast() {
  const [notification, setNotification] = useState<{ text: string; minutesAgo: number } | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show on admin pages
    if (window.location.pathname.startsWith("/admin")) return;
    // Don't show if dismissed this session
    if (sessionStorage.getItem("socialProofDismissed") === "true") return;

    // Show first notification after 8-15 seconds
    const initialDelay = Math.floor(Math.random() * 7000) + 8000;

    const showNotification = () => {
      const notif = generateNotification();
      setNotification(notif);
      setVisible(true);

      // Auto-hide after 5 seconds
      setTimeout(() => {
        setVisible(false);
      }, 5000);
    };

    const initialTimer = setTimeout(() => {
      showNotification();

      // Show subsequent notifications every 30-60 seconds
      const interval = setInterval(() => {
        // Max 3 per session
        const shown = parseInt(sessionStorage.getItem("socialProofCount") || "0", 10);
        if (shown >= 3) {
          clearInterval(interval);
          return;
        }
        sessionStorage.setItem("socialProofCount", String(shown + 1));
        showNotification();
      }, Math.floor(Math.random() * 30000) + 30000);

      // Cleanup interval
      return () => clearInterval(interval);
    }, initialDelay);

    return () => clearTimeout(initialTimer);
  }, []);

  if (!notification || !visible) return null;

  return (
    <div className="fixed bottom-20 left-4 z-50 animate-in slide-in-from-left fade-in duration-500 max-w-xs">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-3 flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-700 leading-snug">{notification.text}</p>
          <p className="text-[0.6rem] text-slate-400 mt-0.5">{notification.minutesAgo} min ago</p>
        </div>
        <button
          onClick={() => {
            setVisible(false);
            sessionStorage.setItem("socialProofDismissed", "true");
          }}
          className="shrink-0 text-slate-300 hover:text-slate-500 transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}
