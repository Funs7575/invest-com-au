"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function QuizPromptBar() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed or completed quiz
    if (typeof window !== 'undefined') {
      if (localStorage.getItem('quizPromptDismissed') === 'true') {
        setDismissed(true);
        return;
      }
    }

    const handleScroll = () => {
      const scrollPct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
      setVisible(scrollPct > 0.3);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (dismissed || !visible) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('quizPromptDismissed', 'true');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 text-white border-t border-slate-700">
      <div className="container-custom py-3 flex items-center justify-between gap-4">
        <p className="text-sm">
          <span className="hidden sm:inline">Not sure which broker to pick? </span>
          <strong>Take our 60-second quiz</strong> to find your best match.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/quiz"
            className="px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded-lg hover:bg-green-800 transition-colors"
          >
            Take Quiz →
          </Link>
          <button
            onClick={handleDismiss}
            className="p-2 text-slate-400 hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
