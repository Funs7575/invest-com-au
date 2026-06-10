"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";

/**
 * Advisor→advisor client referral UI:
 *  - <ReferLeadButton/> — per-lead "Refer to a colleague" affordance in the
 *    LeadsTab (for enquiries outside the advisor's scope).
 *  - <IncomingReferralsBanner/> — pending referrals addressed to the calling
 *    advisor with accept/decline (accept creates the lead, free of charge).
 *  - <ClientReferralsSection/> — sent-referral history for the EarnTab.
 */

interface ReferralRow {
  id: number;
  direction: "sent" | "received";
  counterpart_name: string | null;
  client_name: string;
  status: "pending" | "accepted" | "declined" | "expired" | "converted";
  bonus_cents: number;
  note: string | null;
  created_at: string;
}

export function ReferLeadButton({
  leadId,
  clientName,
  clientEmail,
  clientPhone,
}: {
  leadId: number;
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [toEmail, setToEmail] = useState("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function sendReferral() {
    if (!toEmail.trim() || state === "sending") return;
    setState("sending");
    setMessage("");
    try {
      const res = await fetch("/api/advisor-auth/lead-referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: toEmail.trim(),
          clientName,
          clientEmail,
          clientPhone: clientPhone ?? null,
          note: note.trim() || null,
          sourceLeadId: leadId,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setState("error");
        setMessage(json.error ?? "Couldn't send the referral.");
        return;
      }
      setState("sent");
    } catch {
      setState("error");
      setMessage("Couldn't send the referral.");
    }
  }

  if (state === "sent") {
    return (
      <span className="text-xs font-semibold text-emerald-700 px-2 py-1">
        Referred ✓ — your colleague will see it in their portal
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 inline-flex items-center gap-1"
      >
        <Icon name="share-2" size={12} /> Refer to a colleague
      </button>
      {open && (
        <div className="w-full mt-2 border border-slate-200 bg-slate-50 rounded-xl p-3 space-y-2">
          <p className="text-[11px] text-slate-500 m-0">
            Out of scope for you? Send this enquiry to a colleague on
            Invest.com.au — they receive it as a free lead, and the client&rsquo;s
            details go only to them.
          </p>
          <input
            type="email"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="colleague@firm.com.au"
            aria-label="Colleague's advisor account email"
            value={toEmail}
            onChange={(e) => {
              setToEmail(e.target.value);
              if (state !== "idle") setState("idle");
            }}
            className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
          />
          <textarea
            rows={2}
            maxLength={500}
            placeholder="Optional context — what does the client need? (factual only)"
            aria-label="Referral note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs resize-none"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={sendReferral}
              disabled={state === "sending" || !toEmail.trim()}
              className="text-xs font-bold bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg"
            >
              {state === "sending" ? "Sending…" : "Send referral"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
            {state === "error" && <span className="text-[11px] text-red-600">{message}</span>}
          </div>
        </div>
      )}
    </>
  );
}

export function IncomingReferralsBanner() {
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const [acceptedNote, setAcceptedNote] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/advisor-auth/lead-referrals")
      .then((r) => (r.ok ? r.json() : { referrals: [] }))
      .then((data: { referrals?: ReferralRow[] }) =>
        setReferrals((data.referrals ?? []).filter((r) => r.direction === "received" && r.status === "pending")),
      )
      .catch(() => {});
  }, []);

  async function respond(referralId: number, accept: boolean) {
    setRespondingId(referralId);
    try {
      const res = await fetch("/api/advisor-auth/lead-referrals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referralId, accept }),
      });
      if (res.ok) {
        setReferrals((prev) => prev.filter((r) => r.id !== referralId));
        if (accept) {
          setAcceptedNote("Lead added — it will appear in your list on the next refresh.");
        }
      }
    } finally {
      setRespondingId(null);
    }
  }

  if (referrals.length === 0 && !acceptedNote) return null;

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
      <h3 className="text-sm font-bold text-emerald-900 mb-2 flex items-center gap-1.5">
        <Icon name="inbox" size={14} /> Referred clients from colleagues
      </h3>
      {acceptedNote && <p className="text-xs font-semibold text-emerald-700 mb-2">{acceptedNote}</p>}
      <ul className="space-y-2">
        {referrals.map((r) => (
          <li key={r.id} className="bg-white border border-emerald-100 rounded-lg px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-700 m-0">
                <strong>{r.counterpart_name ?? "A fellow advisor"}</strong> referred{" "}
                <strong>{r.client_name}</strong> to you
              </p>
              <span className="flex gap-1.5">
                <button
                  type="button"
                  disabled={respondingId === r.id}
                  onClick={() => respond(r.id, true)}
                  className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg"
                >
                  Accept lead (free)
                </button>
                <button
                  type="button"
                  disabled={respondingId === r.id}
                  onClick={() => respond(r.id, false)}
                  className="text-xs font-semibold border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-600 px-3 py-1.5 rounded-lg"
                >
                  Decline
                </button>
              </span>
            </div>
            {r.note && <p className="text-[11px] text-slate-500 mt-1 mb-0">&ldquo;{r.note}&rdquo;</p>}
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-emerald-700 mt-2 mb-0">
        Accepting adds the client to your leads at no charge. Client details are
        only visible to you and the referring advisor.
      </p>
    </div>
  );
}

const REFERRAL_STATUS_STYLES: Record<ReferralRow["status"], string> = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-blue-100 text-blue-700",
  converted: "bg-emerald-100 text-emerald-700",
  declined: "bg-slate-100 text-slate-500",
  expired: "bg-slate-100 text-slate-400",
};

export function ClientReferralsSection() {
  const [referrals, setReferrals] = useState<ReferralRow[] | null>(null);

  useEffect(() => {
    fetch("/api/advisor-auth/lead-referrals")
      .then((r) => (r.ok ? r.json() : { referrals: [] }))
      .then((data: { referrals?: ReferralRow[] }) =>
        setReferrals((data.referrals ?? []).filter((r) => r.direction === "sent")),
      )
      .catch(() => setReferrals([]));
  }, []);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <h3 className="text-sm font-bold text-slate-900 mb-1">Client referrals to colleagues</h3>
      <p className="text-xs text-slate-500 mb-3">
        Enquiries you&rsquo;ve passed to other advisors from your Leads tab.
        Referral bonuses (when active) are flat platform credits — never a
        share of any advice fee.
      </p>
      {referrals === null ? (
        <p className="text-xs text-slate-400">Loading…</p>
      ) : referrals.length === 0 ? (
        <p className="text-xs text-slate-400">
          No referrals yet. When an enquiry is outside your scope, use
          &ldquo;Refer to a colleague&rdquo; on the lead.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {referrals.map((r) => (
            <li key={r.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 m-0">
                  {r.client_name} → {r.counterpart_name ?? "advisor"}
                </p>
                <p className="text-[10px] text-slate-400 m-0">
                  {new Date(r.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <span className="flex items-center gap-2">
                {r.bonus_cents > 0 && (
                  <span className="text-[11px] font-bold text-emerald-700">
                    +${(r.bonus_cents / 100).toFixed(2)} credit
                  </span>
                )}
                <span className={`text-[0.56rem] font-bold px-2 py-0.5 rounded-full ${REFERRAL_STATUS_STYLES[r.status]}`}>
                  {r.status}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
