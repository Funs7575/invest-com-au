"use client";

import { useState, useEffect, useRef } from "react";

interface TocItem {
  id: string;
  label: string;
}

export default function OnThisPage({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (items.length === 0) return;

    // Set initial active
    setActiveId(items[0].id);

    // IntersectionObserver to track which section is in view
    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible section
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-80px 0px -60% 0px",
        threshold: 0,
      }
    );

    items.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current!.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [items]);

  const handleClick = (id: string) => {
    setActiveId(id);
    setIsExpanded(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (items.length < 2) return null;

  return (
    <>
      {/* Desktop: sticky sidebar TOC — shown on large screens */}
      <nav
        className="hidden xl:block fixed top-24 right-4 w-52 max-h-[calc(100vh-120px)] overflow-y-auto z-30"
        aria-label="On this page"
      >
        <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-400 mb-2">
          On this page
        </p>
        <ul className="space-y-0.5 border-l-2 border-slate-100">
          {items.map(({ id, label }) => (
            <li key={id}>
              <button
                onClick={() => handleClick(id)}
                className={`block w-full text-left pl-3 py-1 text-xs leading-snug transition-all duration-200 ${
                  activeId === id
                    ? "text-blue-700 font-semibold border-l-2 border-blue-700 -ml-[2px]"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobile: expandable bottom pill */}
      <div className="xl:hidden fixed bottom-4 left-4 right-4 z-40">
        {/* Collapsed pill */}
        {!isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur border border-slate-200 rounded-full shadow-lg text-sm font-medium text-slate-700 motion-safe:animate-[fadeInUp_0.3s_ease-out]"
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              On this page
            </span>
            <span className="text-xs text-slate-400">
              {items.find((i) => i.id === activeId)?.label?.slice(0, 25)}
              {(items.find((i) => i.id === activeId)?.label?.length ?? 0) > 25 ? "..." : ""}
            </span>
          </button>
        )}

        {/* Expanded panel */}
        {isExpanded && (
          <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-2xl shadow-xl p-4 motion-safe:animate-[fadeInUp_0.2s_ease-out]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                On this page
              </p>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
                aria-label="Close navigation"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ul className="space-y-1 max-h-60 overflow-y-auto">
              {items.map(({ id, label }) => (
                <li key={id}>
                  <button
                    onClick={() => handleClick(id)}
                    className={`block w-full text-left px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                      activeId === id
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
