"use client";

import { useEffect, useState } from "react";

/**
 * Compact countdown badge used on the /quotes index card list. Computed on
 * the client so the cached server render stays pure.
 */

interface Props {
  endsAt: string;
}

function formatLeft(ms: number): string {
  if (ms <= 0) return "Closed";
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours < 1) return "<1h left";
  if (hours < 24) return `${hours}h left`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h left`;
}

export default function CountdownBadge({ endsAt }: Props) {
  const [label, setLabel] = useState<string>("…");

  useEffect(() => {
    function update() {
      setLabel(formatLeft(new Date(endsAt).getTime() - Date.now()));
    }
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [endsAt]);

  return (
    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full whitespace-nowrap">
      {label}
    </span>
  );
}
