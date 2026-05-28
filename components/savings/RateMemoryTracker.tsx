"use client";

import { useEffect, useState } from "react";

interface Props {
  brokerId: number;
  productKind: "savings_account" | "term_deposit";
  currentRateBps: number;
  brokerName: string;
}

function bpsToPercent(bps: number): string {
  return (bps / 100).toFixed(2) + "%";
}

export default function RateMemoryTracker({ brokerId, productKind, currentRateBps, brokerName }: Props) {
  const [delta, setDelta] = useState<{ previous: number; current: number } | null>(null);

  useEffect(() => {
    fetch("/api/rate-memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brokerId, productKind, currentRateBps }),
    })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json() as { previousRateBps: number | null; currentRateBps: number };
        if (data.previousRateBps !== null && data.previousRateBps !== data.currentRateBps) {
          setDelta({ previous: data.previousRateBps, current: data.currentRateBps });
        }
      })
      .catch(() => {});
  }, [brokerId, productKind, currentRateBps]);

  if (!delta) return null;

  const moved = delta.current - delta.previous;
  const isUp = moved > 0;
  const color = isUp ? "#16a34a" : "#dc2626";
  const bg = isUp ? "#f0fdf4" : "#fef2f2";
  const arrow = isUp ? "↑" : "↓";
  const absPct = bpsToPercent(Math.abs(moved));

  return (
    <div
      role="status"
      style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: bg, border: `1px solid ${isUp ? "#bbf7d0" : "#fecaca"}`, fontSize: 13, color, marginBottom: 12 }}
    >
      <span style={{ fontWeight: 700, fontSize: 15 }}>{arrow}</span>
      <span>
        <strong>{brokerName}</strong> rate {isUp ? "increased" : "decreased"} by {absPct} to{" "}
        <strong>{bpsToPercent(delta.current)} p.a.</strong> since your last visit
        {" "}(was {bpsToPercent(delta.previous)})
      </span>
    </div>
  );
}
