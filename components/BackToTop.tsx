"use client";

import { useState, useEffect } from "react";

export default function BackToTop() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;
      setProgress(pct);
      setVisible(scrollTop > 400);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // SVG circle params
  const R = 18;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - progress);

  if (!visible) return null;

  return (
    <button
      onClick={handleClick}
      aria-label="Back to top"
      className="fixed bottom-24 sm:bottom-6 right-4 sm:right-6 z-40 w-11 h-11 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-transform motion-safe:animate-[fadeIn_0.3s_ease-out]"
    >
      {/* Progress ring */}
      <svg className="absolute inset-0 w-11 h-11 -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={R} fill="none" stroke="#e2e8f0" strokeWidth="2" />
        <circle
          cx="22"
          cy="22"
          r={R}
          fill="none"
          stroke="#15803d"
          strokeWidth="2"
          strokeDasharray={C}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-200"
        />
      </svg>
      {/* Arrow icon */}
      <svg className="w-4 h-4 text-slate-600 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
      </svg>
    </button>
  );
}
