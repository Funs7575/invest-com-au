"use client";

import { type ReactNode } from "react";
import dynamic from "next/dynamic";
import EmptyState from "@/components/directory/EmptyState";

export interface MapItem {
  id: number;
  lat: number;
  lng: number;
  label: string;
  sublabel?: string;
  href: string;
  badgeColor?: string;
}

export interface MapPanelProps {
  items: ReadonlyArray<MapItem>;
  hoveredId: number | null;
  selectedId: number | null;
  onHover: (id: number | null) => void;
  onSelect: (id: number | null) => void;
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  children: ReactNode;
  className?: string;
}

// Inner map component — only loaded client-side (no SSR) to avoid mapbox-gl
// accessing window on the server. The outer MapPanel shell renders immediately.
const MapInner = dynamic(() => import("./MapPanelInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full animate-pulse bg-slate-100 rounded-lg" />
  ),
});

export default function MapPanel({
  items,
  hoveredId,
  selectedId,
  onHover,
  onSelect,
  onBoundsChange,
  children,
  className = "",
}: MapPanelProps) {
  return (
    <div className={`flex flex-col md:flex-row h-[calc(100vh-160px)] min-h-[500px] gap-0 ${className}`}>
      {/* Result list — scrollable left column */}
      <div className="relative md:w-[420px] lg:w-[480px] shrink-0 overflow-y-auto border-r border-slate-100">
        {children}
      </div>

      {/* Map — sticky right column */}
      <div className="flex-1 relative">
        {items.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <EmptyState
              icon="map"
              title="No results on map"
              body="Try adjusting your filters to see results here."
            />
          </div>
        ) : (
          <MapInner
            items={items}
            hoveredId={hoveredId}
            selectedId={selectedId}
            onHover={onHover}
            onSelect={onSelect}
            onBoundsChange={onBoundsChange}
          />
        )}
      </div>
    </div>
  );
}
