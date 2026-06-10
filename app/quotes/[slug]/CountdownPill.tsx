"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";

/**
 * Live "Xh left" countdown pill rendered next to the job title. Computed on
 * the client so the server render stays pure and so the time stays accurate
 * even on cached pages.
 */

interface Props {
  endsAt: string;
  status: string;
}

function formatLeft(ms: number): string {
  if (ms <= 0) return "Closed";
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours < 1) return "<1h left";
  if (hours < 24) return `${hours}h left`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h left`;
}

export default function CountdownPill({ endsAt, status }: Props) {
  const [label, setLabel] = useState<string>("…");

  useEffect(() => {
    function update() {
      if (status === "awarded") return setLabel("Awarded");
      if (status !== "open") return setLabel("Closed");
      const ms = new Date(endsAt).getTime() - Date.now();
      setLabel(formatLeft(ms));
    }
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [endsAt, status]);

  const isClosed = status !== "open" || label === "Closed";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full font-semibold ${
        isClosed
          ? "bg-slate-100 text-slate-500 border border-slate-200"
          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
      }`}
    >
      <Icon name="clock" size={12} className="inline mr-1" />
      {label}
    </span>
  );
}
