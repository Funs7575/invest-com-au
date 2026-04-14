"use client";

import { useState } from "react";

/**
 * Manually trigger a cron endpoint from the admin dashboard.
 *
 * Posts to /api/admin/automation/trigger with the cron name. The
 * server-side route is admin-authed and forwards to the actual
 * cron route with the right CRON_SECRET bearer token, so the
 * browser never sees the secret.
 *
 * Disables itself while in-flight and shows a success / error
 * flash afterwards.
 */
export default function CronTriggerButton({
  cronName,
  label,
}: {
  cronName: string;
  label?: string;
}) {
  const [status, setStatus] = useState<"idle" | "running" | "ok" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  const handleClick = async () => {
    if (status === "running") return;
    setStatus("running");
    setMessage("");

    try {
      const res = await fetch("/api/admin/automation/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cron: cronName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage(data?.error || `HTTP ${res.status}`);
        return;
      }
      setStatus("ok");
      setMessage(data?.summary || "Completed");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="inline-flex flex-col items-start">
      <button
        onClick={handleClick}
        disabled={status === "running"}
        className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {status === "running" ? "Running…" : label || `Run ${cronName} now`}
      </button>
      {status === "ok" && <span className="text-[0.65rem] text-emerald-700 mt-1">✓ {message}</span>}
      {status === "error" && <span className="text-[0.65rem] text-red-700 mt-1">✗ {message}</span>}
    </div>
  );
}
