"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { createClient } from "@/lib/supabase/client";

/**
 * Admin: broker cold-outreach composer.
 *
 * Pitches /advertise/featured-placement at a specific broker contact.
 * Form submits to /api/broker-outreach which handles auth, rate limit,
 * Resend send, and writes an audit row to broker_outreach_log so
 * duplicate sends to the same address are easy to spot.
 */

interface LogRow {
  id: number;
  broker_name: string;
  contact_email: string;
  contact_name: string;
  sent_at: string;
  sent_by: string;
  broker_slug: string | null;
}

interface BrokerOption {
  slug: string;
  name: string;
}

export default function BrokerOutreachPage() {
  const [brokers, setBrokers] = useState<BrokerOption[]>([]);
  const [brokerSlug, setBrokerSlug] = useState("");
  const [brokerName, setBrokerName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [recent, setRecent] = useState<LogRow[]>([]);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "ok"; email: string }
    | { kind: "err"; msg: string }
  >({ kind: "idle" });

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const [{ data: brokerRows }, { data: logRows }] = await Promise.all([
        supabase
          .from("brokers")
          .select("slug, name")
          .eq("status", "active")
          .order("name", { ascending: true }),
        supabase
          .from("broker_outreach_log")
          .select("id, broker_name, contact_email, contact_name, sent_at, sent_by, broker_slug")
          .order("sent_at", { ascending: false })
          .limit(20),
      ]);
      setBrokers((brokerRows ?? []) as BrokerOption[]);
      setRecent((logRows ?? []) as LogRow[]);
    })();
  }, []);

  function onBrokerChange(slug: string) {
    setBrokerSlug(slug);
    const found = brokers.find((b) => b.slug === slug);
    if (found) setBrokerName(found.name);
  }

  async function onSend() {
    if (!brokerName || !contactName || !contactEmail) {
      setStatus({ kind: "err", msg: "Broker, contact name and email are all required." });
      return;
    }
    setSending(true);
    setStatus({ kind: "idle" });
    try {
      const res = await fetch("/api/broker-outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_email: contactEmail,
          to_name: contactName,
          broker_name: brokerName,
          broker_slug: brokerSlug || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setStatus({ kind: "err", msg: body.error ?? `Send failed (${res.status})` });
        return;
      }
      setStatus({ kind: "ok", email: contactEmail });
      setContactEmail("");
      setContactName("");

      // Optimistically prepend the new row
      setRecent((r) => [
        {
          id: Date.now(),
          broker_name: brokerName,
          broker_slug: brokerSlug || null,
          contact_email: contactEmail,
          contact_name: contactName,
          sent_at: new Date().toISOString(),
          sent_by: "you",
        },
        ...r.slice(0, 19),
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <AdminShell
      title="Broker cold outreach"
      subtitle="Pitch Featured Partner placement to a broker contact"
    >
      <div className="max-w-3xl grid gap-6 md:grid-cols-[1fr_1.2fr]">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Broker
            </label>
            <select
              value={brokerSlug}
              onChange={(e) => onBrokerChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="">Select broker…</option>
              {brokers.map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Broker name (override)
            </label>
            <input
              type="text"
              value={brokerName}
              onChange={(e) => setBrokerName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="e.g. CommSec"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Contact name *
            </label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="Sarah Kim"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Contact email *
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="sarah@broker.com.au"
            />
          </div>
          <button
            onClick={onSend}
            disabled={sending}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold rounded-lg text-sm transition-colors"
          >
            {sending ? "Sending…" : "Send pitch email"}
          </button>
          {status.kind === "ok" && (
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2">
              Sent to {status.email}.
            </p>
          )}
          {status.kind === "err" && (
            <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">
              {status.msg}
            </p>
          )}
          <p className="text-[11px] text-slate-500 leading-relaxed">
            The email links to <code>/advertise/featured-placement</code> so a
            recipient can book + pay without a sales call. Duplicates to the
            same address show up in the log below — check before sending.
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-extrabold text-slate-900">Recent sends</h2>
          </div>
          {recent.length === 0 ? (
            <div className="p-6 text-sm text-slate-500 text-center">No outreach sent yet.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((r) => (
                <li key={r.id} className="px-4 py-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">
                      {r.broker_name}
                    </span>
                    <span className="text-slate-500">
                      {new Date(r.sent_at).toLocaleString("en-AU", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  <div className="text-slate-600 mt-0.5">
                    {r.contact_name} — {r.contact_email}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
