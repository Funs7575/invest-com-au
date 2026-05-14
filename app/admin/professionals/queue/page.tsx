"use client";

/**
 * /admin/professionals/queue — verification queue for /pros/join submissions.
 *
 * Lists professionals with verification_status='pending'. For each:
 *   - shows submitted credentials (AFSL / ASIC / ABN / firm / specialties)
 *   - mints a short-lived signed URL to preview the uploaded verification doc
 *   - one-click Approve (calls /api/admin/professionals/[id]/approve)
 *   - one-click Reject with reason (calls /api/admin/professionals/[id]/reject)
 *
 * Admin auth is handled by app/admin/layout.tsx (AdminAuthGuard); admin API
 * calls additionally verify via requireAdmin() server-side.
 */

import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { createClient } from "@/lib/supabase/client";
import {
  PROFESSIONAL_TYPE_LABELS,
  type Professional,
  type ProfessionalType,
} from "@/lib/types";

interface PendingPro extends Professional {
  verification_status?: string;
  verification_doc_url?: string | null;
  payout_bsb?: string | null;
  payout_account_last4?: string | null;
  accepts_briefs?: boolean;
}

export default function ProfessionalsQueuePage() {
  const [items, setItems] = useState<PendingPro[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data, error: queryError } = await supabase
      .from("professionals")
      .select("*")
      .eq("verification_status", "pending")
      .order("created_at", { ascending: false });
    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }
    setItems((data as PendingPro[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleApprove = async (id: number) => {
    if (!confirm("Approve this provider? They will start accepting Match Requests immediately.")) {
      return;
    }
    setActing(id);
    try {
      const res = await fetch(`/api/admin/professionals/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grant_starter_credits: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Approve failed");
        return;
      }
      await load();
    } finally {
      setActing(null);
    }
  };

  const handleReject = async (id: number) => {
    if (rejectReason.trim().length < 4) {
      alert("Reason must be at least 4 characters.");
      return;
    }
    setActing(id);
    try {
      const res = await fetch(`/api/admin/professionals/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Reject failed");
        return;
      }
      setRejectingId(null);
      setRejectReason("");
      await load();
    } finally {
      setActing(null);
    }
  };

  const handlePreview = async (id: number) => {
    setPreviewUrl(null);
    const res = await fetch(`/api/admin/professionals/${id}/doc-url`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || "Could not load preview");
      return;
    }
    setPreviewUrl(data.signed_url);
    // Open in a new tab so the admin can keep working in the queue.
    window.open(data.signed_url, "_blank", "noopener,noreferrer");
  };

  return (
    <AdminShell>
      <div className="p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            Provider Verification Queue
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pending /pros/join submissions awaiting credential verification.
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-slate-400 text-sm py-12 text-center">
            Loading queue…
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              Queue is clear
            </h2>
            <p className="text-sm text-slate-500">
              No pending provider applications to review.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((p) => (
              <QueueCard
                key={p.id}
                pro={p}
                onApprove={() => handleApprove(p.id)}
                onPreview={() => handlePreview(p.id)}
                onStartReject={() => {
                  setRejectingId(p.id);
                  setRejectReason("");
                }}
                acting={acting === p.id}
                rejecting={rejectingId === p.id}
                rejectReason={rejectReason}
                setRejectReason={setRejectReason}
                onConfirmReject={() => handleReject(p.id)}
                onCancelReject={() => {
                  setRejectingId(null);
                  setRejectReason("");
                }}
              />
            ))}
          </div>
        )}

        {previewUrl && (
          <p className="sr-only">
            Verification document opened at {previewUrl}.
          </p>
        )}
      </div>
    </AdminShell>
  );
}

interface QueueCardProps {
  pro: PendingPro;
  onApprove: () => void;
  onPreview: () => void;
  onStartReject: () => void;
  acting: boolean;
  rejecting: boolean;
  rejectReason: string;
  setRejectReason: (v: string) => void;
  onConfirmReject: () => void;
  onCancelReject: () => void;
}

function QueueCard({
  pro,
  onApprove,
  onPreview,
  onStartReject,
  acting,
  rejecting,
  rejectReason,
  setRejectReason,
  onConfirmReject,
  onCancelReject,
}: QueueCardProps) {
  const specialties = (pro.specialties as ProfessionalType[]) || [];
  return (
    <article className="bg-white border border-slate-200 rounded-xl p-4 md:p-5">
      <div className="flex flex-wrap items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-slate-900">{pro.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {pro.email}
            {pro.phone ? ` • ${pro.phone}` : ""}
          </p>
          {pro.firm_name && (
            <p className="text-xs text-slate-500 mt-0.5">
              <span className="font-semibold">Firm:</span> {pro.firm_name}
            </p>
          )}
        </div>
        <span className="text-[0.65rem] px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-bold uppercase tracking-wider">
          Pending
        </span>
      </div>

      <dl className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-xs">
        <CredField label="Primary type" value={PROFESSIONAL_TYPE_LABELS[pro.type] || pro.type} />
        <CredField label="AFSL" value={pro.afsl_number} />
        <CredField label="ASIC / TPB" value={pro.registration_number} />
        <CredField label="ABN" value={pro.abn} />
        <CredField label="Location" value={pro.location_display || pro.location_state} />
        <CredField label="Payout BSB" value={pro.payout_bsb} />
        <CredField
          label="Account (last4)"
          value={pro.payout_account_last4 ? `••••${pro.payout_account_last4}` : null}
        />
        <CredField
          label="Submitted"
          value={new Date(pro.created_at).toLocaleDateString("en-AU", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        />
      </dl>

      {specialties.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {specialties.map((s) => (
            <span
              key={s}
              className="text-[0.65rem] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium"
            >
              {PROFESSIONAL_TYPE_LABELS[s] || s}
            </span>
          ))}
        </div>
      )}

      {rejecting ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
          <label className="block text-xs font-semibold text-red-800 mb-1">
            Rejection reason (sent to applicant)
          </label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={2}
            className="w-full px-2.5 py-1.5 border border-red-200 rounded text-xs bg-white"
            placeholder="e.g. AFSL number could not be verified against ASIC public register."
            maxLength={500}
          />
          <div className="mt-2 flex gap-2 justify-end">
            <button
              type="button"
              onClick={onCancelReject}
              className="text-xs px-3 py-1.5 text-slate-600 hover:text-slate-900 font-semibold"
              disabled={acting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirmReject}
              disabled={acting || rejectReason.trim().length < 4}
              className="text-xs px-3 py-1.5 bg-red-600 text-white font-bold rounded hover:bg-red-700 disabled:opacity-50"
            >
              {acting ? "Sending…" : "Confirm rejection"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            type="button"
            onClick={onPreview}
            disabled={!pro.verification_doc_url}
            className="text-xs font-semibold text-slate-700 px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pro.verification_doc_url ? "Preview doc ↗" : "No doc uploaded"}
          </button>
          <button
            type="button"
            onClick={onApprove}
            disabled={acting}
            className="text-xs font-bold text-white px-3.5 py-1.5 bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            {acting ? "Working…" : "Approve"}
          </button>
          <button
            type="button"
            onClick={onStartReject}
            disabled={acting}
            className="text-xs font-bold text-red-700 px-3.5 py-1.5 bg-white border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
          >
            Reject with reason…
          </button>
        </div>
      )}
    </article>
  );
}

function CredField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </dt>
      <dd className="text-xs text-slate-700 font-medium truncate">
        {value || "—"}
      </dd>
    </div>
  );
}
