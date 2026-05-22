"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";

interface OrgApplication {
  id: number;
  organisation_name: string;
  organisation_type: string;
  abn: string | null;
  website: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  bio: string | null;
  cpd_provider_number: string | null;
  status: string;
  applied_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  training_provider: "Training Provider",
  cpd_provider: "CPD Provider",
  compliance: "Compliance",
  fintech: "Fintech",
  industry_body: "Industry Body",
  law_firm: "Law Firm",
  accounting_firm: "Accounting Firm",
  other: "Other",
};

export default function OrgModerationPage() {
  const [applications, setApplications] = useState<OrgApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState<Record<number, string>>({});
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [refreshKey, setRefreshKey] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("organisation_applications")
        .select("*")
        .eq("status", tab)
        .order("applied_at", { ascending: false });
      if (cancelled) return;
      setApplications((data as OrgApplication[]) || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [supabase, tab, refreshKey]);

  const act = async (applicationId: number, action: "approve" | "reject") => {
    setActing(applicationId);
    const res = await fetch("/api/admin/org-moderation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicationId,
        action,
        rejection_reason: action === "reject" ? (rejectionReason[applicationId] ?? "") : undefined,
      }),
    });
    const data = await res.json() as { success?: boolean; error?: string };
    if (data.success) {
      setRefreshKey(k => k + 1);
    } else {
      alert("Error: " + (data.error ?? "Unknown error"));
    }
    setActing(null);
  };

  return (
    <AdminShell title="Organisation Moderation">
      <div className="space-y-6">
        {/* Tab bar */}
        <div className="flex gap-2 border-b border-slate-200">
          {(["pending", "approved", "rejected"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
                tab === t
                  ? "border-teal-600 text-teal-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : applications.length === 0 ? (
          <p className="text-slate-500 text-sm">No {tab} applications.</p>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div key={app.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-lg">{app.organisation_name}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">
                        {TYPE_LABELS[app.organisation_type] ?? app.organisation_type}
                      </span>
                      {app.cpd_provider_number && (
                        <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                          CPD #{app.cpd_provider_number}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    {new Date(app.applied_at).toLocaleDateString("en-AU")}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-slate-400 block">Contact</span>
                    <span className="text-slate-700">{app.contact_name}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Email</span>
                    <a href={`mailto:${app.contact_email}`} className="text-teal-600 hover:underline">
                      {app.contact_email}
                    </a>
                  </div>
                  {app.contact_phone && (
                    <div>
                      <span className="text-xs text-slate-400 block">Phone</span>
                      <span className="text-slate-700">{app.contact_phone}</span>
                    </div>
                  )}
                  {app.abn && (
                    <div>
                      <span className="text-xs text-slate-400 block">ABN</span>
                      <span className="text-slate-700">{app.abn}</span>
                    </div>
                  )}
                  {app.website && (
                    <div>
                      <span className="text-xs text-slate-400 block">Website</span>
                      <a href={app.website} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline truncate block max-w-[180px]">
                        {app.website}
                      </a>
                    </div>
                  )}
                </div>

                {app.bio && (
                  <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{app.bio}</p>
                )}

                {tab === "pending" && (
                  <div className="flex items-start gap-3 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => void act(app.id, "approve")}
                      disabled={acting === app.id}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                      {acting === app.id ? "Processing…" : "Approve"}
                    </button>
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Rejection reason (optional)"
                        value={rejectionReason[app.id] ?? ""}
                        onChange={(e) => setRejectionReason(prev => ({ ...prev, [app.id]: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                      />
                      <button
                        onClick={() => void act(app.id, "reject")}
                        disabled={acting === app.id}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 disabled:opacity-50 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}

                {tab === "rejected" && (app as OrgApplication & { rejection_reason?: string }).rejection_reason && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
                    Reason: {(app as OrgApplication & { rejection_reason?: string }).rejection_reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
