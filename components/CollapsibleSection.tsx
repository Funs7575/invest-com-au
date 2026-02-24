"use client";

import { useState, useRef, useEffect } from "react";

interface CollapsibleSectionProps {
  /** Max height in px when collapsed on mobile. Content beyond this is clipped with a fade. */
  collapsedHeight?: number;
  /** Total item count shown in the "Show all" button */
  totalCount: number;
  /** Label for the "Show all" button, e.g. "reviews", "stories", "changes" */
  itemLabel: string;
  children: React.ReactNode;
}

export default function CollapsibleSection({
  collapsedHeight = 400,
  totalCount,
  itemLabel,
  children,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsCollapse, setNeedsCollapse] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Check if content is tall enough to need collapsing
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const checkHeight = () => {
      // Only collapse on mobile (< 768px)
      const isMobile = window.matchMedia("(max-width: 767px)").matches;
      setNeedsCollapse(isMobile && el.scrollHeight > collapsedHeight + 80);
    };

    checkHeight();
    window.addEventListener("resize", checkHeight);
    return () => window.removeEventListener("resize", checkHeight);
  }, [collapsedHeight, children]);

  // If content is short enough, just render normally
  if (!needsCollapse || isExpanded) {
    return (
      <div ref={contentRef}>
        {children}
        {needsCollapse && isExpanded && (
          <button
            onClick={() => setIsExpanded(false)}
            className="w-full mt-3 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Show less
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        ref={contentRef}
        className="relative overflow-hidden"
        style={{ maxHeight: `${collapsedHeight}px` }}
      >
        {children}
        {/* Gradient fade overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none" />
      </div>
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full mt-2 py-2.5 text-sm font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center gap-1.5"
      >
        Show all {totalCount} {itemLabel}
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
}
