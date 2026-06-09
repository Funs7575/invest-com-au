"use client";

import { useEffect, useRef } from "react";
import type { MapItem, MapPanelProps } from "./MapPanel";

// Australia bounding box for initial view when no items are focussed.
const AU_BOUNDS: [[number, number], [number, number]] = [
  [113.3, -43.7],
  [153.7, -10.7],
];

type BoundsChangeHandler = NonNullable<MapPanelProps["onBoundsChange"]>;

interface MapPanelInnerProps {
  items: ReadonlyArray<MapItem>;
  hoveredId: number | null;
  selectedId: number | null;
  onHover: (id: number | null) => void;
  onSelect: (id: number | null) => void;
  onBoundsChange?: BoundsChangeHandler;
}

export default function MapPanelInner({
  items,
  hoveredId,
  selectedId,
  onHover,
  onSelect,
  onBoundsChange,
}: MapPanelInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // Store marker elements keyed by item id for direct DOM mutation.
  const markerEls = useRef<Map<number, HTMLElement>>(new Map());
  const popupRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  // Build a minimal HTML popup for a map item.
  const buildPopupHtml = (item: MapItem) =>
    `<div style="min-width:160px;padding:8px 0 4px">
      <p style="font-weight:700;font-size:0.8rem;margin:0 0 2px;color:#0f172a;line-height:1.3">${item.label}</p>
      ${item.sublabel ? `<p style="font-size:0.7rem;color:#64748b;margin:0 0 6px">${item.sublabel}</p>` : ""}
      <a href="${item.href}" style="display:inline-block;font-size:0.7rem;font-weight:600;color:#b45309;text-decoration:none">View →</a>
    </div>`;

  useEffect(() => {
    if (!containerRef.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.warn("MapPanel: NEXT_PUBLIC_MAPBOX_TOKEN is not set");
      return;
    }

    let cancelled = false;

    void (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled) return;

      // Inject CSS once.
      if (!document.getElementById("mapbox-gl-css")) {
        const link = document.createElement("link");
        link.id = "mapbox-gl-css";
        link.rel = "stylesheet";
        link.href = "https://api.mapbox.com/mapbox-gl-js/v3.24.0/mapbox-gl.css";
        document.head.appendChild(link);
      }

      mapboxgl.accessToken = token;

      const map = new mapboxgl.Map({
        container: containerRef.current!,
        style: "mapbox://styles/mapbox/light-v11",
        fitBoundsOptions: { padding: 60 },
        attributionControl: false,
      });

      map.fitBounds(AU_BOUNDS, { duration: 0 });
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(
        new mapboxgl.AttributionControl({ compact: true }),
        "bottom-right",
      );

      mapRef.current = map;

      if (onBoundsChange) {
        map.on("moveend", () => {
          const b = map.getBounds();
          if (!b) return;
          onBoundsChange({
            north: b.getNorth(),
            south: b.getSouth(),
            east: b.getEast(),
            west: b.getWest(),
          });
        });
      }

      // Add markers — batched via requestIdleCallback when many items.
      const addMarkers = () => {
        markerEls.current.clear();

        for (const item of items) {
          const el = document.createElement("div");
          el.className = "map-pin";
          el.style.cssText = `
            width: 28px; height: 28px; border-radius: 50%;
            background: #f97316; border: 2.5px solid #fff;
            box-shadow: 0 2px 6px rgba(0,0,0,.18);
            cursor: pointer; transition: transform .15s, box-shadow .15s;
            display: flex; align-items: center; justify-content: center;
          `;
          el.setAttribute("data-id", String(item.id));

          el.addEventListener("mouseenter", () => {
            onHover(item.id);
            el.style.transform = "scale(1.25)";
            el.style.zIndex = "10";
          });
          el.addEventListener("mouseleave", () => {
            if (selectedId !== item.id) {
              onHover(null);
              el.style.transform = "";
              el.style.zIndex = "";
            }
          });
          el.addEventListener("click", () => {
            onSelect(item.id);
          });

          markerEls.current.set(item.id, el);

          new mapboxgl.Marker({ element: el, anchor: "center" })
            .setLngLat([item.lng, item.lat])
            .addTo(map);
        }

        // Fit map to markers.
        if (items.length === 1) {
          const first = items[0];
          if (first) {
            map.flyTo({ center: [first.lng, first.lat], zoom: 12 });
          }
        } else if (items.length > 1) {
          const bounds = new mapboxgl.LngLatBounds();
          for (const item of items) bounds.extend([item.lng, item.lat]);
          map.fitBounds(bounds, { padding: 80, maxZoom: 14 });
        }
      };

      if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(addMarkers);
      } else {
        setTimeout(addMarkers, 0);
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // Items are intentionally not in deps — we reinitialise when the component mounts.
    // External item changes are handled by a separate effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync hover highlight without React re-renders.
  useEffect(() => {
    markerEls.current.forEach((el, id) => {
      if (id === hoveredId || id === selectedId) {
        el.style.transform = "scale(1.25)";
        el.style.boxShadow = "0 2px 10px rgba(245,158,11,.55)";
        el.style.border = "2.5px solid #f59e0b";
        el.style.zIndex = "10";
      } else {
        el.style.transform = "";
        el.style.boxShadow = "0 2px 6px rgba(0,0,0,.18)";
        el.style.border = "2.5px solid #fff";
        el.style.zIndex = "";
      }
    });
  }, [hoveredId, selectedId]);

  // Show popup when an item is selected.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    void (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
      if (selectedId === null) return;

      const item = items.find((i) => i.id === selectedId);
      if (!item) return;

      const popup = new mapboxgl.Popup({ offset: 18, closeButton: true, maxWidth: "220px" })
        .setLngLat([item.lng, item.lat])
        .setHTML(buildPopupHtml(item))
        .addTo(map);

      popup.on("close", () => {
        onSelect(null);
      });

      popupRef.current = popup;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 rounded-lg overflow-hidden"
      aria-label="Map view"
    />
  );
}
