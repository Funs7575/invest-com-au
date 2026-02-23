"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function QuizPromptBar() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const pathname = usePathname();

  // Don't show on quiz page itself, or admin pages
  const isHidden = pathname === "/quiz" || pathname.startsWith("/admin");

  useEffect(() => {
    if (isHidden) return;
    if (typeof window !== "undefined") {
      if (localStorage.getItem("quizPromptDismissed") === "true") {
        setDismissed(true);
        return;
      }
    }

    const handleScroll = () => {
      const scrollPct =
        window.scrollY /
        (document.documentElement.scrollHeight - window.innerHeight);
      setVisible(scrollPct > 0.25);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHidden]);

  if (isHidden || dismissed || !visible) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("quizPromptDismissed", "true");
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] safe-area-inset-bottom bounce-in-up">
      <div className="container-custom py-3 flex items-center justify-between gap-3">
        {/* Desktop: text + CTA side by side */}
        <p className="text-sm text-slate-600 hidden sm:block">
          Not sure which broker? <strong className="text-slate-900">Take our 60-sec quiz</strong> to find your match.
        </p>

        {/* Mobile: full-width CTA, no text clutter */}
        <Link
          href="/quiz"
          className="sm:hidden flex-1 text-center py-3 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 active:scale-[0.98] transition-all min-h-[48px] flex items-center justify-center"
        >
          Find My Broker — 60sec Quiz &rarr;
        </Link>

        {/* Desktop CTA */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <Link
            href="/quiz"
            className="px-5 py-2.5 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 active:scale-[0.97] transition-all"
          >
            Take Quiz &rarr;
          </Link>
          <button
            onClick={handleDismiss}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors rounded-lg"
            aria-label="Dismiss quiz prompt"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mobile dismiss — small X in corner */}
        <button
          onClick={handleDismiss}
          className="sm:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors rounded-lg shrink-0"
          aria-label="Dismiss quiz prompt"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
