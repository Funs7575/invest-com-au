"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { renderStars } from "@/lib/tracking";
import type { Broker } from "@/lib/types";

const STORAGE_KEY = "invest_recently_viewed";
const MAX_ITEMS = 6;

type RecentItem = { slug: string; name: string; rating: number; platform_type: string; color: string; asx_fee: string };

export function trackView(broker: Broker) {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const items: RecentItem[] = raw ? JSON.parse(raw) : [];
    const filtered = items.filter(i => i.slug !== broker.slug);
    filtered.unshift({ slug: broker.slug, name: broker.name, rating: broker.rating || 0, platform_type: broker.platform_type || "", color: broker.color || "#666", asx_fee: broker.asx_fee || "" });
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_ITEMS)));
  } catch {}
}

export default function RecentlyViewed({ currentSlug }: { currentSlug?: string }) {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: RecentItem[] = JSON.parse(raw);
        setItems(parsed.filter(i => i.slug !== currentSlug).slice(0, 4));
      }
    } catch {}
  }, [currentSlug]);

  if (items.length === 0) return null;

  return (
    <div className="mt-6 md:mt-8">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Recently Viewed</h3>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
        {items.map(item => (
          <Link
            key={item.slug}
            href={`/broker/${item.slug}`}
            className="shrink-0 bg-white border border-slate-200 rounded-lg px-3 py-2 hover:shadow-md hover:border-slate-300 transition-all flex items-center gap-2 min-w-[140px]"
          >
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-[0.5rem] font-bold text-white shrink-0"
              style={{ backgroundColor: item.color || "#666" }}
            >
              {item.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">{item.name}</div>
              <div className="text-[0.56rem] text-amber-500">{renderStars(item.rating)} {item.rating}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
