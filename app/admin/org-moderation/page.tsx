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
  rejection_reason?: string | null;
}

interface Organisation {
  id: number;
  name: string;
  email: string;
  organisation_type: string;
  verification_status: string;
  status: string;
  slug: string;
  cpd_provider_number: string | null;
  created_at: string;
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
  const [orgs, setOrgs] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);
  const [verifying, setVerifying] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState<Record<number, string>>({});
  const [tab, setTab] = useState<"pending" | "approved" | "rejected" | "organisations">("pending");
  const [refreshKey, setRefreshKey] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      if (tab === "organisations") {
        const { data } = await supabase
          .from("organisations")
          .select("id, name, email, organisation_type, verification_status, status, slug, cpd_provider_number, created_at")
          .order("created_at", { ascending: false });
        if (cancelled) return;
        setOrgs((data as Organisation[]) || []);
      } else {
        const { data } = await supabase
          .from("organisation_applications")
          .select("*")
          .eq("status", tab)
          .order("applied_at", { ascending: false });
        if (cancelled) return;
        setApplications((data as OrgApplication[]) || []);
      }
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
      setActionError("Error: " + (data.error ?? "Unknown error"));
    }
    setActing(null);
  };

  const verify = async (organisationId: number, action: "verify" | "unverify") => {
    setVerifying(organisationId);
    const res = await fetch("/api/admin/org-verify", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organisationId, action }),
    });
    const data = await res.json() as { success?: boolean; error?: string };
    if (data.success) {
      setRefreshKey(k => k + 1);
    } else {
      setActionError("Error: " + (data.error ?? "Unknown error"));
    }
    setVerifying(null);
  };

  return (
    <AdminShell title="Organisation Moderation">
      <div className="space-y-6">
        {/* Tab bar */}
        <div className="flex gap-2 border-b border-slate-200">
          {(["pending", "approved", "rejected", "organisations"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
                tab === t
                  ? "border-teal-600 text-teal-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t === "organisations" ? "Live Orgs" : t}
            </button>
          ))}
        </div>

        {actionError && (
          <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{actionError}</p>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : tab === "organisations" ? (
          orgs.length === 0 ? (
            <p className="text-slate-500 text-sm">No organisations yet.</p>
          ) : (
            <div className="space-y-4">
              {orgs.map((org) => (
                <div key={org.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-slate-900 text-lg">{org.name}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">
                          {TYPE_LABELS[org.organisation_type] ?? org.organisation_type}
                        </span>
                        {org.cpd_provider_number && (
                          <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                            CPD #{org.cpd_provider_number}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          org.verification_status === "verified"
                            ? "bg-green-50 text-green-700"
                            : "bg-amber-50 text-amber-700"
                        }`}>
                          {org.verification_status === "verified" ? "✓ Verified" : "Unverified"}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          org.status === "active" ? "bg-slate-100 text-slate-600" : "bg-red-50 text-red-600"
                        }`}>
                          {org.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-slate-500">{new Date(org.created_at).toLocaleDateString("en-AU")}</span>
                      <a
                        href={`/providers/${org.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-teal-600 hover:underline"
                      >
                        View ↗
                      </a>
                    </div>
                  </div>

                  <div className="text-sm text-slate-500">
                    <span className="font-medium text-slate-700">Email:</span>{" "}
                    <a href={`mailto:${org.email}`} className="text-teal-600 hover:underline">{org.email}</a>
                  </div>

                  <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                    {org.verification_status === "verified" ? (
                      <button
                        onClick={() => void verify(org.id, "unverify")}
                        disabled={verifying === org.id}
                        className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200 disabled:opacity-50 transition-colors"
                      >
                        {verifying === org.id ? "Processing…" : "Remove Verification"}
                      </button>
                    ) : (
                      <button
                        onClick={() => void verify(org.id, "verify")}
                        disabled={verifying === org.id}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        {verifying === org.id ? "Processing…" : "Verify Organisation"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
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
                  <span className="text-xs text-slate-500 flex-shrink-0">
                    {new Date(app.applied_at).toLocaleDateString("en-AU")}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-slate-500 block">Contact</span>
                    <span className="text-slate-700">{app.contact_name}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Email</span>
                    <a href={`mailto:${app.contact_email}`} className="text-teal-600 hover:underline">
                      {app.contact_email}
                    </a>
                  </div>
                  {app.contact_phone && (
                    <div>
                      <span className="text-xs text-slate-500 block">Phone</span>
                      <span className="text-slate-700">{app.contact_phone}</span>
                    </div>
                  )}
                  {app.abn && (
                    <div>
                      <span className="text-xs text-slate-500 block">ABN</span>
                      <span className="text-slate-700">{app.abn}</span>
                    </div>
                  )}
                  {app.website && (
                    <div>
                      <span className="text-xs text-slate-500 block">Website</span>
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

                {tab === "rejected" && app.rejection_reason && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
                    Reason: {app.rejection_reason}
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
