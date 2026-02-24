"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useShortlist } from "@/lib/hooks/useShortlist";

export default function QuizPromptBar() {
  const [desktopVisible, setDesktopVisible] = useState(false);
  const [mobileVisible, setMobileVisible] = useState(false);
  const [desktopDismissed, setDesktopDismissed] = useState(false);
  const pathname = usePathname();
  const { count: shortlistCount } = useShortlist();

  // Pages where the mobile bottom bar should hide (page-specific CTAs exist)
  const isHiddenMobile =
    pathname === "/quiz" ||
    pathname === "/compare" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/broker/") ||
    pathname.startsWith("/versus");

  // Pages where the desktop scroll-triggered bar should hide
  const isHiddenDesktop =
    pathname === "/quiz" || pathname.startsWith("/admin");

  // Mobile: show after user scrolls past first viewport
  useEffect(() => {
    if (isHiddenMobile) return;
    const handleScroll = () => {
      setMobileVisible(window.scrollY > window.innerHeight * 0.5);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHiddenMobile]);

  useEffect(() => {
    if (isHiddenDesktop) return;
    if (typeof window !== "undefined") {
      if (localStorage.getItem("quizPromptDismissed") === "true") {
        setDesktopDismissed(true);
        return;
      }
    }

    const handleScroll = () => {
      const scrollPct =
        window.scrollY /
        (document.documentElement.scrollHeight - window.innerHeight);
      setDesktopVisible(scrollPct > 0.25);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHiddenDesktop]);

  const handleDesktopDismiss = () => {
    setDesktopDismissed(true);
    localStorage.setItem("quizPromptDismissed", "true");
  };

  const showDesktop = !isHiddenDesktop && !desktopDismissed && desktopVisible;
  const showMobile = !isHiddenMobile && mobileVisible;

  // If neither should render, bail out
  if (!showDesktop && !showMobile) return null;

  return (
    <>
      {/* ── Mobile: Persistent 2-button bottom bar ── */}
      {showMobile && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] safe-area-inset-bottom animate-sheet-up">
          <div className="flex items-center gap-2.5 px-4 py-2.5">
            {shortlistCount > 0 && (
              <Link
                href="/shortlist"
                className="relative w-12 shrink-0 flex items-center justify-center py-3 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all min-h-[48px]"
                aria-label={`My shortlist (${shortlistCount})`}
              >
                <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[0.6rem] font-bold rounded-full flex items-center justify-center">
                  {shortlistCount}
                </span>
              </Link>
            )}
            <Link
              href="/quiz"
              className="flex-1 text-center py-3 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 active:scale-[0.98] transition-all min-h-[48px] flex items-center justify-center"
            >
              Find My Broker
            </Link>
            <Link
              href="/compare"
              className="flex-1 text-center py-3 bg-white text-slate-700 text-sm font-bold rounded-xl border border-slate-300 hover:bg-slate-50 active:scale-[0.98] transition-all min-h-[48px] flex items-center justify-center"
            >
              Compare
            </Link>
          </div>
        </div>
      )}

      {/* ── Desktop: Scroll-triggered bar (unchanged behaviour) ── */}
      {showDesktop && (
        <div className="hidden sm:block fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] bounce-in-up">
          <div className="container-custom py-3 flex items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              Not sure which broker?{" "}
              <strong className="text-slate-900">
                Take our 60-sec quiz
              </strong>{" "}
              to find your match.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/quiz"
                className="px-5 py-2.5 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 active:scale-[0.97] transition-all"
              >
                Take Quiz &rarr;
              </Link>
              <button
                onClick={handleDesktopDismiss}
                className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors rounded-lg"
                aria-label="Dismiss quiz prompt"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
