import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
 
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminEmails } from "@/lib/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Licensing tracker — Admin",
  robots: { index: false, follow: false },
};

// FIN_NOTEBOOK pre-launch tracker: surface the licensing state Agent #13
// maintains in agent_memory + compliance_tasks. Read-only today; admin
// actions (filing approvals, marking AFSL granted) still flow through
// existing routes per the agent spec.
//
// Sections:
//   1. AFSL grant gate — single row read of agent_memory:licensing:afsl_granted_at.
//      This is the gate that unlocks Agent #18 (Product Layer); showing it here
//      makes the binary state visible at a glance.
//   2. ACL grant marker — same shape, no consumer agent yet (forward-compat).
//   3. Active threads — Sophie Grace / AFSL House / Connective state from
//      agent_memory:licensing:threads.
//   4. Open compliance tasks against the licensing surface.
//   5. AR / CR appointment counts.
//
// What this page DOESN'T do (deliberately):
//   - Allow editing the grant rows (those flow through ceo_approvals
//     per Agent #13's spec — see app/admin/ceo-approvals).
//   - Schedule the next ASIC outbound (the agent does this; admin
//     reviews via ceo_approvals).

interface AgentMemoryValue {
  granted_at?: string;
  afsl_number?: string;
  acl_number?: string;
  active?: boolean;
  granted_by_asic_letter_id?: string;
  [key: string]: unknown;
}

interface ThreadEntry {
  party?: string;
  status?: string;
  next_action?: string;
  next_action_date?: string;
  notes?: string;
}

export default async function LicensingTrackerPage() {
  // Admin-page gate. requireAdmin() returns a NextResponse on failure
  // which page components can't return; use redirect() + getUser() +
  // ADMIN_EMAILS instead.
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user || !user.email || !getAdminEmails().includes(user.email.toLowerCase())) {
    redirect("/admin/login?redirect=/admin/licensing");
  }

  const supabase = createAdminClient();

  const [afslRow, aclRow, threadsRow, complianceTasks, arRows, crRows] = await Promise.all([
    supabase
      .from("agent_memory")
      .select("value, updated_at")
      .eq("agent_name", "licensing")
      .eq("key", "afsl_granted_at")
      .maybeSingle(),
    supabase
      .from("agent_memory")
      .select("value, updated_at")
      .eq("agent_name", "licensing")
      .eq("key", "acl_granted_at")
      .maybeSingle(),
    supabase
      .from("agent_memory")
      .select("value, updated_at")
      .eq("agent_name", "licensing")
      .eq("key", "threads")
      .maybeSingle(),
    supabase
      .from("compliance_tasks")
      .select("id, title, severity, status, created_at, due_date")
      .neq("status", "resolved")
      .order("severity", { ascending: false })
      .limit(20),
    supabase.from("authorised_representatives").select("id, status").limit(500),
    supabase.from("credit_representatives").select("id, status").limit(500),
  ]);

  const afsl = (afslRow.data?.value ?? null) as AgentMemoryValue | null;
  const acl = (aclRow.data?.value ?? null) as AgentMemoryValue | null;
  const threadsRaw = (threadsRow.data?.value ?? null) as Record<string, ThreadEntry> | null;
  const threads = threadsRaw ? Object.entries(threadsRaw) : [];

  const arCounts = countByStatus(arRows.data ?? []);
  const crCounts = countByStatus(crRows.data ?? []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Admin · Pre-launch</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Licensing tracker</h1>
        <p className="mt-1 text-sm text-slate-600">
          Read-only view of what Agent #13 is maintaining in agent_memory + compliance_tasks. Admin actions
          (file approvals, accept grant letters) still flow through{" "}
          <Link href="/admin/ceo-approvals" className="underline">
            /admin/ceo-approvals
          </Link>
          .
        </p>
      </header>

      <Section title="AFSL grant gate" subtitle="The single row that unlocks Agent #18 (Product Layer)">
        {afsl ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm">
              <strong className="text-emerald-900">AFSL granted</strong>{" "}
              <span className="text-emerald-800">
                {afsl.granted_at} · AFSL {afsl.afsl_number ?? "(number pending)"}
              </span>
            </p>
            {afsl.granted_by_asic_letter_id && (
              <p className="mt-1 text-xs text-emerald-700">
                ASIC letter ref: {afsl.granted_by_asic_letter_id}
              </p>
            )}
          </div>
        ) : (
          <EmptyState
            kind="pending"
            label="AFSL not granted yet"
            detail="Agent #13 writes this row only after ASIC confirms the grant letter and Fin approves via ceo_approvals (request_type=afsl_grant_verification)."
          />
        )}
      </Section>

      <Section title="ACL grant marker" subtitle="Forward-compat — no consumer agent today">
        {acl ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm">
              <strong className="text-emerald-900">ACL granted</strong>{" "}
              <span className="text-emerald-800">
                {acl.granted_at} · ACL {acl.acl_number ?? "(number pending)"}
              </span>
            </p>
          </div>
        ) : (
          <EmptyState
            kind="pending"
            label="ACL not granted yet"
            detail="ACL is held under Connective's licence today; this row would be written if the platform applies for its own ACL post-AFSL."
          />
        )}
      </Section>

      <Section
        title="Active partner threads"
        subtitle="Sophie Grace · AFSL House · Connective · ASIC — what's open right now"
      >
        {threads.length > 0 ? (
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
            {threads.map(([slug, t]) => (
              <li key={slug} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{t.party ?? slug}</p>
                    {t.next_action && (
                      <p className="mt-0.5 truncate text-xs text-slate-600">
                        Next: {t.next_action}
                        {t.next_action_date && ` (by ${t.next_action_date})`}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-semibold text-slate-700">
                    {t.status ?? "open"}
                  </span>
                </div>
                {t.notes && <p className="mt-1 text-xs text-slate-500">{t.notes}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            kind="empty"
            label="No active threads"
            detail="agent_memory:licensing:threads is empty. Agent #13 populates it after the first outbound to Sophie Grace / AFSL House / Connective."
          />
        )}
      </Section>

      <Section title="Open compliance tasks" subtitle="Anything Agent #13 has flagged but not yet resolved">
        {complianceTasks.data && complianceTasks.data.length > 0 ? (
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
            {complianceTasks.data.map((t) => (
              <li key={t.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{t.title}</p>
                    {t.due_date && (
                      <p className="mt-0.5 text-xs text-slate-600">Due {t.due_date}</p>
                    )}
                  </div>
                  <SeverityChip severity={t.severity} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState kind="empty" label="No open compliance tasks" detail="Quiet is good." />
        )}
      </Section>

      <Section title="AR + CR registers" subtitle="Counts by status">
        <div className="grid gap-3 sm:grid-cols-2">
          <StatusCard label="Authorised Representatives" counts={arCounts} />
          <StatusCard label="Credit Representatives" counts={crCounts} />
        </div>
      </Section>
    </div>
  );
}

function countByStatus(rows: ReadonlyArray<{ status: string | null }>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const k = r.status ?? "unknown";
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function EmptyState({
  kind,
  label,
  detail,
}: {
  kind: "empty" | "pending";
  label: string;
  detail: string;
}) {
  const colour =
    kind === "pending"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-slate-200 bg-slate-50 text-slate-700";
  return (
    <div className={`rounded-lg border p-4 ${colour}`}>
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-1 text-xs">{detail}</p>
    </div>
  );
}

function SeverityChip({ severity }: { severity: string | null }) {
  const palette: Record<string, string> = {
    critical: "bg-red-100 text-red-800 border-red-200",
    high: "bg-orange-100 text-orange-800 border-orange-200",
    medium: "bg-amber-100 text-amber-800 border-amber-200",
    low: "bg-slate-100 text-slate-700 border-slate-200",
  };
  const s = severity ?? "medium";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold capitalize ${
        palette[s] ?? palette.medium
      }`}
    >
      {s}
    </span>
  );
}

function StatusCard({ label, counts }: { label: string; counts: Record<string, number> }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{total}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {Object.entries(counts).map(([status, n]) => (
          <span
            key={status}
            className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] text-slate-700"
          >
            {status}: {n}
          </span>
        ))}
      </div>
    </div>
  );
}
