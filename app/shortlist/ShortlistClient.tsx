"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useShortlist } from "@/lib/hooks/useShortlist";
import { createClient } from "@/lib/supabase/client";
import { trackClick, getAffiliateLink, renderStars, AFFILIATE_REL } from "@/lib/tracking";
import Icon from "@/components/Icon";
import type { Broker } from "@/lib/types";

const NOTES_STORAGE_KEY = "invest_shortlist_notes";

/** Read notes from localStorage */
function getStoredNotes(): Record<string, string> {
  try {
    const stored = localStorage.getItem(NOTES_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {};
}

/** Persist notes to localStorage */
function setStoredNotes(notes: Record<string, string>) {
  try {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  } catch {}
}

export default function ShortlistClient() {
  const { slugs, count, toggle, clear } = useShortlist();
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState("");

  // Sharing state
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Shared view state
  const [isSharedView, setIsSharedView] = useState(false);
  const [sharedBrokers, setSharedBrokers] = useState<Broker[]>([]);
  const [sharedViewCount, setSharedViewCount] = useState(0);
  const [importedShared, setImportedShared] = useState(false);

  const searchParams = useSearchParams();

  // Load notes from localStorage
  useEffect(() => {
    setNotes(getStoredNotes());
  }, []);

  // Check for shared shortlist code in URL
  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) return;

    setIsSharedView(true);
    setLoading(true);

    fetch(`/api/shortlist?code=${encodeURIComponent(code)}`)
      .then((res) => res.json())
      .then(async (data) => {
        if (data.error) {
          setLoading(false);
          return;
        }

        setSharedViewCount(data.view_count || 0);

        if (data.slugs && data.slugs.length > 0) {
          const supabase = createClient();
          const { data: brokerData } = await supabase
            .from("brokers")
            .select("*")
            .in("slug", data.slugs)
            .eq("status", "active");

          if (brokerData) {
            const sorted = data.slugs
              .map((slug: string) => brokerData.find((b: Broker) => b.slug === slug))
              .filter(Boolean) as Broker[];
            setSharedBrokers(sorted);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [searchParams]);

  // Load own brokers
  useEffect(() => {
    if (isSharedView) return; // Don't load own brokers in shared view

    if (slugs.length === 0) {
      setBrokers([]);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    supabase
      .from("brokers")
      .select("*")
      .in("slug", slugs)
      .eq("status", "active")
      .then(({ data }) => {
        if (data) {
          const sorted = slugs
            .map((slug) => data.find((b) => b.slug === slug))
            .filter(Boolean) as Broker[];
          setBrokers(sorted);
        }
        setLoading(false);
      }, () => {
        setLoading(false);
      });
  }, [slugs, isSharedView]);

  // ─── Note handlers ───
  const startEditNote = (slug: string) => {
    setEditingNote(slug);
    setNoteValue(notes[slug] || "");
  };

  const saveNote = (slug: string) => {
    const updated = { ...notes };
    if (noteValue.trim()) {
      updated[slug] = noteValue.trim();
    } else {
      delete updated[slug];
    }
    setNotes(updated);
    setStoredNotes(updated);
    setEditingNote(null);
    setNoteValue("");
  };

  // ─── Share handler ───
  const handleShare = async () => {
    if (slugs.length === 0) return;
    setSharing(true);

    try {
      const res = await fetch("/api/shortlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs }),
      });
      const data = await res.json();

      if (data.url) {
        const fullUrl = `${window.location.origin}${data.url}`;
        setShareUrl(fullUrl);

        // Try native share API first
        if (navigator.share) {
          try {
            await navigator.share({
              title: "My Broker Shortlist",
              text: `Check out my shortlist of ${slugs.length} Australian brokers on Invest.com.au`,
              url: fullUrl,
            });
          } catch {
            // User cancelled or not supported — that's fine, URL is still shown
          }
        }
      }
    } catch {
      // Silently fail
    }

    setSharing(false);
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  // ─── Import shared to own shortlist ───
  const handleImportShared = () => {
    sharedBrokers.forEach((b) => {
      if (!slugs.includes(b.slug)) {
        toggle(b.slug);
      }
    });
    setImportedShared(true);
    setTimeout(() => setImportedShared(false), 3000);
  };

  // ─── Shared View ───
  if (isSharedView) {
    if (loading) {
      return (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      );
    }

    if (sharedBrokers.length === 0) {
      return (
        <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-12 text-center">
          <svg className="w-8 h-8 md:w-12 md:h-12 mx-auto text-slate-300 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
            <path d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
          </svg>
          <h2 className="text-base md:text-lg font-bold text-slate-900 mb-1.5">Link expired or invalid</h2>
          <p className="text-xs md:text-sm text-slate-500 mb-4 md:mb-6">
            This shared shortlist may have expired or the link is incorrect.
          </p>
          <Link
            href="/shortlist"
            className="inline-block px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors text-sm"
          >
            View My Shortlist &rarr;
          </Link>
        </div>
      );
    }

    return (
      <div>
        {/* Shared view banner */}
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-semibold text-purple-900">Shared Shortlist</p>
              <p className="text-xs text-purple-600">
                {sharedBrokers.length} broker{sharedBrokers.length !== 1 ? "s" : ""} &middot; Viewed {sharedViewCount} time{sharedViewCount !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={handleImportShared}
              disabled={importedShared}
              className="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 min-h-[36px]"
            >
              {importedShared ? "Added to My Shortlist!" : "Import to My Shortlist"}
            </button>
          </div>
        </div>

        {/* Shared broker rows */}
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {sharedBrokers.map((broker) => (
            <div key={broker.id} className="flex items-center gap-2.5 md:gap-4 px-3 md:px-5 py-3 md:py-4 hover:bg-slate-50/50 transition-colors">
              <Link
                href={`/broker/${broker.slug}`}
                className="w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center text-xs md:text-sm font-bold shrink-0"
                style={{ background: `${broker.color}20`, color: broker.color }}
              >
                {broker.icon || broker.name.charAt(0)}
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/broker/${broker.slug}`} className="font-bold text-sm text-slate-900 hover:underline truncate">
                    {broker.name}
                  </Link>
                  {broker.deal && (
                    <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 border border-amber-200/80 rounded text-[0.62rem] text-amber-700 font-semibold shrink-0">
                      <Icon name="flame" size={10} className="text-amber-500" />
                      Deal
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 md:gap-3 mt-0.5">
                  <span className="text-[0.69rem] text-amber-500">{renderStars(broker.rating || 0)}</span>
                  <span className="text-[0.62rem] md:text-[0.69rem] text-slate-400">{broker.rating}/5</span>
                  <span className="text-slate-200 hidden sm:inline">|</span>
                  <span className="text-[0.62rem] md:text-[0.69rem] text-slate-400 hidden sm:inline">ASX {broker.asx_fee || "N/A"}</span>
                </div>
              </div>
              <a
                href={getAffiliateLink(broker)}
                target="_blank"
                rel={AFFILIATE_REL}
                onClick={() => trackClick(broker.slug, broker.name, "shared-shortlist", "/shortlist", "compare")}
                className="px-2.5 md:px-3 py-1.5 md:py-2 bg-amber-600 text-white text-[0.69rem] md:text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors min-h-[36px] inline-flex items-center"
                style={{ backgroundColor: '#d97706' }}
              >
                <span className="hidden sm:inline">Visit Broker</span>
                <span className="sm:hidden">Visit</span>
              </a>
            </div>
          ))}
        </div>

        {/* CTA: Build your own */}
        <div className="mt-6 text-center">
          <Link
            href="/shortlist"
            className="inline-block px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors text-sm"
          >
            Build My Own Shortlist &rarr;
          </Link>
        </div>
      </div>
    );
  }

  // ─── Normal view (own shortlist) ───

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-12 text-center">
        <svg className="w-8 h-8 md:w-12 md:h-12 mx-auto text-slate-300 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <h2 className="text-base md:text-lg font-bold text-slate-900 mb-1.5">No brokers saved yet</h2>
        <p className="text-xs md:text-sm text-slate-500 mb-4 md:mb-6">
          Tap the heart icon on any broker to save it here.
        </p>
        <Link
          href="/compare"
          className="inline-block px-5 py-2.5 md:px-6 md:py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors text-sm"
        >
          Browse Brokers &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header bar */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs md:text-sm text-slate-500">
          {count} broker{count !== 1 ? "s" : ""} saved
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            disabled={sharing}
            className="text-xs font-medium text-purple-600 hover:text-purple-800 transition-colors px-2 py-1 min-h-[36px] inline-flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            {sharing ? "Sharing..." : "Share"}
          </button>
          <button
            onClick={clear}
            className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors px-2 py-1 min-h-[36px]"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Share URL banner */}
      {shareUrl && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-purple-900 mb-0.5">Share link created!</p>
            <p className="text-[0.65rem] text-purple-600 truncate">{shareUrl}</p>
          </div>
          <button
            onClick={handleCopyLink}
            className="px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 transition-colors shrink-0 min-h-[36px]"
          >
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
      )}

      {/* Compact broker rows */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {brokers.map((broker) => (
          <div key={broker.id} className="px-3 md:px-5 py-3 md:py-4 hover:bg-slate-50/50 transition-colors">
            <div className="flex items-center gap-2.5 md:gap-4">
              {/* Broker icon */}
              <Link
                href={`/broker/${broker.slug}`}
                className="w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center text-xs md:text-sm font-bold shrink-0"
                style={{ background: `${broker.color}20`, color: broker.color }}
              >
                {broker.icon || broker.name.charAt(0)}
              </Link>

              {/* Name + rating + key fee */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/broker/${broker.slug}`}
                    className="font-bold text-sm text-slate-900 hover:underline truncate"
                  >
                    {broker.name}
                  </Link>
                  {broker.deal && (
                    <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 border border-amber-200/80 rounded text-[0.62rem] md:text-[0.69rem] text-amber-700 font-semibold shrink-0">
                      <Icon name="flame" size={10} className="text-amber-500" />
                      Deal
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 md:gap-3 mt-0.5">
                  <span className="text-[0.69rem] text-amber-500">{renderStars(broker.rating || 0)}</span>
                  <span className="text-[0.62rem] md:text-[0.69rem] text-slate-400">{broker.rating}/5</span>
                  <span className="text-slate-200 hidden sm:inline">|</span>
                  <span className="text-[0.62rem] md:text-[0.69rem] text-slate-400 hidden sm:inline">
                    ASX {broker.asx_fee || "N/A"}
                  </span>
                  {broker.us_fee && (
                    <>
                      <span className="text-slate-200 hidden md:inline">|</span>
                      <span className="text-[0.69rem] text-slate-400 hidden md:inline">
                        US {broker.us_fee}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                {/* Note button */}
                <button
                  onClick={() => startEditNote(broker.slug)}
                  className={`w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-lg transition-colors min-h-[36px] ${
                    notes[broker.slug]
                      ? "text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                      : "text-slate-300 hover:text-slate-500 hover:bg-slate-50"
                  }`}
                  aria-label={`Add note for ${broker.name}`}
                  title={notes[broker.slug] || "Add note"}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>

                {/* Visit broker CTA */}
                <a
                  href={getAffiliateLink(broker)}
                  target="_blank"
                  rel={AFFILIATE_REL}
                  onClick={() => trackClick(broker.slug, broker.name, "shortlist", "/shortlist", "compare")}
                  className="px-2.5 md:px-3 py-1.5 md:py-2 bg-amber-600 text-white text-[0.69rem] md:text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors min-h-[36px] inline-flex items-center"
                  style={{ backgroundColor: '#d97706' }}
                >
                  <span className="hidden sm:inline">Visit Broker</span>
                  <span className="sm:hidden">Visit</span>
                </a>

                {/* Remove button */}
                <button
                  onClick={() => toggle(broker.slug)}
                  className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors min-h-[36px]"
                  aria-label={`Remove ${broker.name} from shortlist`}
                  title="Remove"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Note display */}
            {notes[broker.slug] && editingNote !== broker.slug && (
              <div
                onClick={() => startEditNote(broker.slug)}
                className="mt-2 ml-[2.875rem] md:ml-14 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800 cursor-pointer hover:bg-blue-100 transition-colors"
              >
                <span className="font-medium">Note:</span> {notes[broker.slug]}
              </div>
            )}

            {/* Note editor */}
            {editingNote === broker.slug && (
              <div className="mt-2 ml-[2.875rem] md:ml-14 flex items-center gap-2">
                <input
                  type="text"
                  value={noteValue}
                  onChange={(e) => setNoteValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveNote(broker.slug);
                    if (e.key === "Escape") { setEditingNote(null); setNoteValue(""); }
                  }}
                  placeholder="Add a note about this broker..."
                  autoFocus
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-h-[36px]"
                  maxLength={200}
                />
                <button
                  onClick={() => saveNote(broker.slug)}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors min-h-[36px]"
                >
                  Save
                </button>
                <button
                  onClick={() => { setEditingNote(null); setNoteValue(""); }}
                  className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors min-h-[36px]"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Compare CTA */}
      {count >= 2 && (
        <div className="mt-4 md:mt-6 space-y-3">
          <Link
            href={`/versus?vs=${brokers.slice(0, 4).map((b) => b.slug).join(",")}`}
            className="flex items-center justify-center gap-2 w-full px-6 py-3 md:py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Compare {Math.min(count, 4)} Brokers Side-by-Side &rarr;
          </Link>
          <Link
            href={`/shortlist/compare?brokers=${brokers.map((b) => b.slug).join(",")}`}
            className="flex items-center justify-center gap-2 w-full px-6 py-3 md:py-3.5 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Detailed Comparison Table &rarr;
          </Link>
        </div>
      )}

      {count === 1 && (
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-400 mb-2">Save one more broker to compare side-by-side</p>
          <Link
            href="/compare"
            className="inline-block px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors min-h-[36px]"
          >
            Browse More Brokers &rarr;
          </Link>
        </div>
      )}

      {/* Quick links */}
      <div className="mt-4 md:mt-6 flex flex-wrap gap-2">
        <Link
          href="/compare"
          className="text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors px-3 py-1.5 bg-slate-50 rounded-lg min-h-[36px] inline-flex items-center"
        >
          + Add more brokers
        </Link>
        <Link
          href="/quiz"
          className="text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors px-3 py-1.5 bg-slate-50 rounded-lg min-h-[36px] inline-flex items-center"
        >
          Not sure? Take the quiz
        </Link>
      </div>
    </div>
  );
}
