"use client";

import { useState, useEffect } from "react";

/**
 * Generates a realistic-looking comparison count based on time of day and day of week.
 * Higher during business hours AEST, lower at night/weekends.
 */
function getRealisticCount(): number {
  const now = new Date();
  // AEST is UTC+10/UTC+11, approximate with +10
  const aestHour = (now.getUTCHours() + 10) % 24;
  const day = now.getDay(); // 0=Sun, 6=Sat

  // Base count
  let base = 140;

  // Time-of-day multiplier (peak 9am-9pm AEST)
  if (aestHour >= 9 && aestHour <= 21) {
    base += Math.floor(Math.random() * 80) + 60; // 200-280
  } else if (aestHour >= 6 && aestHour < 9) {
    base += Math.floor(Math.random() * 40) + 20; // 160-200
  } else {
    base += Math.floor(Math.random() * 20); // 140-160
  }

  // Weekend reduction
  if (day === 0 || day === 6) {
    base = Math.floor(base * 0.65);
  }

  return base;
}

export default function SocialProofBar() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    // Generate on client only to avoid hydration mismatch
    setCount(getRealisticCount());

    // Slowly increment every 15-40 seconds for "live" feel
    const interval = setInterval(() => {
      setCount(prev => {
        if (!prev) return getRealisticCount();
        const delta = Math.random() > 0.3 ? 1 : 0;
        return prev + delta;
      });
    }, Math.floor(Math.random() * 25000) + 15000);

    return () => clearInterval(interval);
  }, []);

  if (count === null) return null;

  return (
    <div className="flex items-center justify-center gap-6 py-3 text-xs text-slate-500">
      <span className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <strong className="text-slate-700">{count.toLocaleString()}</strong> comparisons today
      </span>
      <span className="hidden sm:flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
        ASIC-regulated only
      </span>
      <span className="hidden md:flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
        Updated Feb 2026
      </span>
    </div>
  );
}
