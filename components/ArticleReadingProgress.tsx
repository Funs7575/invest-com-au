"use client";

// ADV-170: Reading progress indicator — thin fixed bar that fills as user scrolls.
// Attaches to an element via articleId (defaults to the main article column).

import { useEffect, useRef, useState } from "react";
import { celebrateMilestone } from "@/lib/celebrate";

export default function ArticleReadingProgress({ articleId = "article-body" }: { articleId?: string }) {
  const [progress, setProgress] = useState(0);
  const firedRef = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      const el = document.getElementById(articleId);
      if (!el) {
        // Fallback: measure full document scroll
        const docH = document.documentElement.scrollHeight - window.innerHeight;
        if (docH <= 0) { setProgress(100); return; }
        setProgress(Math.min(100, Math.round((window.scrollY / docH) * 100)));
        return;
      }
      const rect = el.getBoundingClientRect();
      const elTop = rect.top + window.scrollY;
      const elH = el.offsetHeight;
      const scrolled = window.scrollY - elTop + window.innerHeight * 0.1;
      const pct = Math.min(100, Math.max(0, Math.round((scrolled / elH) * 100)));
      setProgress(pct);
      // First guide genuinely read to the end (Northstar D7) — fires once
      // ever via the milestone registry; scroll-to-90% is the signal.
      if (pct >= 90 && !firedRef.current) {
        firedRef.current = true;
        celebrateMilestone("first_article");
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // initialise on mount
    return () => window.removeEventListener("scroll", handleScroll);
  }, [articleId]);

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-50 h-[3px] pointer-events-none"
      style={{ background: "transparent" }}
    >
      <div
        className="h-full bg-gradient-to-r from-teal-500 to-blue-500 transition-[width] duration-100 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
