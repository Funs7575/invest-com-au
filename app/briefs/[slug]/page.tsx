import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { BRIEF_TEMPLATE_LABELS } from "@/lib/briefs/templates";
import type { BriefRow, TrackerStatus } from "@/lib/briefs/types";
import {
  getSlot,
  listBookingsForBrief,
  type AvailabilitySlot,
  type ConsultationBooking,
} from "@/lib/consultations";

import BookConsultationPanel from "./BookConsultationPanel";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<TrackerStatus, string> = {
  new: "New",
  contacted: "Contacted",
  call_booked: "Call booked",
  proposal_sent: "Proposal sent",
  won: "Engagement confirmed",
  lost: "Did not proceed",
  withdrawn: "Withdrawn",
};

const STATUS_ORDER: TrackerStatus[] = [
  "new",
  "contacted",
  "call_booked",
  "proposal_sent",
  "won",
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const admin = await createClient();
  const { data } = await admin
    .from("advisor_auctions")
    .select("job_title")
    .eq("slug", slug)
    .eq("flow_type", "accept")
    .maybeSingle();
  const title = data?.job_title || "Match Request";
  return {
    title: `${title} — Your Quote Status (${CURRENT_YEAR})`,
    robots: { index: false, follow: false },
    alternates: { canonical: `${SITE_URL}/briefs/${slug}` },
  };
}

interface AcceptedInfo {
  professional?: { name: string; slug: string | null; email: string | null };
  team?: { name: string; slug: string };
}

async function loadAccepted(brief: BriefRow): Promise<AcceptedInfo> {
  const admin = await createClient();
  const info: AcceptedInfo = {};
  if (brief.accepted_by_professional_id) {
    const { data } = await admin
      .from("professionals")
      .select("name, slug, email")
      .eq("id", brief.accepted_by_professional_id)
      .maybeSingle();
    if (data) {
      info.professional = {
        name: data.name as string,
        slug: (data.slug as string) ?? null,
        email: (data.email as string) ?? null,
      };
    }
  }
  if (brief.accepted_by_team_id) {
    const { data } = await admin
      .from("expert_teams")
      .select("name, slug")
      .eq("id", brief.accepted_by_team_id)
      .maybeSingle();
    if (data) {
      info.team = {
        name: data.name as string,
        slug: data.slug as string,
      };
    }
  }
  return info;
}

export default async function BriefTrackerPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = (await searchParams) ?? {};
  const email = typeof sp.email === "string" ? sp.email.toLowerCase().trim() : "";

  const admin = await createClient();
  const { data } = await admin
    .from("advisor_auctions")
    .select("*")
    .eq("slug", slug)
    .eq("flow_type", "accept")
    .maybeSingle();

  if (!data) notFound();
  const brief = data as unknown as BriefRow;

  const emailMatches =
    !!email && (brief.contact_email ?? "").toLowerCase() === email;

  const accepted = await loadAccepted(brief);

  // Load any existing consultation booking for this brief (latest non-cancelled).
  let existingBooking: ConsultationBooking | null = null;
  let existingSlot: AvailabilitySlot | null = null;
  if (accepted.professional) {
    const bookings = await listBookingsForBrief(brief.id);
    const active = bookings.find(
      (b) => b.status === "pending" || b.status === "confirmed",
    );
    if (active) {
      existingBooking = active;
      existingSlot = await getSlot(active.slot_id);
    }
  }

  const stepIndex = STATUS_ORDER.indexOf(brief.tracker_status);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Match Requests", url: `${SITE_URL}/briefs` },
    { name: brief.job_title },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <div className="min-h-screen bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
            <Link href="/" className="hover:text-slate-700">
              Home
            </Link>
            <span>/</span>
            <Link href="/briefs/new" className="hover:text-slate-700">
              Match Requests
            </Link>
            <span>/</span>
            <span className="text-slate-700">Quote Status</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1">
            {brief.job_title}
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            {brief.brief_template ? BRIEF_TEMPLATE_LABELS[brief.brief_template] : ""}
            {brief.location ? ` · ${brief.location}` : ""}
          </p>

          {/* Status banner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
            <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">
              Status
            </p>
            <h2 className="text-lg font-bold text-slate-900 mb-3">
              {brief.status === "closed"
                ? "Closed"
                : STATUS_LABELS[brief.tracker_status] ?? brief.tracker_status}
            </h2>

            {brief.risk_review_status === "pending_review" && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-800">
                Your brief mentions topics that need a quick compliance review
                before verified providers can see it. We&apos;ll email you once it&apos;s cleared.
              </div>
            )}

            <ol className="mt-4 grid grid-cols-5 gap-2">
              {STATUS_ORDER.map((s, idx) => {
                const reached = idx <= stepIndex;
                return (
                  <li key={s} className="text-center">
                    <div
                      className={`w-7 h-7 rounded-full mx-auto flex items-center justify-center text-[10px] font-bold ${
                        reached
                          ? "bg-amber-500 text-slate-900"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <p
                      className={`text-[10px] mt-1 ${
                        reached ? "text-slate-700 font-semibold" : "text-slate-400"
                      }`}
                    >
                      {STATUS_LABELS[s]}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Accepted provider */}
          {(accepted.professional || accepted.team) && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
              <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">
                Accepted by
              </p>
              {accepted.team && (
                <p className="text-base font-bold text-slate-900">
                  {accepted.team.name}{" "}
                  <Link
                    href={`/teams/${accepted.team.slug}`}
                    className="text-xs text-amber-600 ml-1 hover:underline"
                  >
                    View team
                  </Link>
                </p>
              )}
              {accepted.professional && (
                <p className="text-sm text-slate-700 mt-1">
                  Lead contact:{" "}
                  <span className="font-semibold">{accepted.professional.name}</span>
                  {accepted.professional.slug && (
                    <Link
                      href={`/advisor/${accepted.professional.slug}`}
                      className="text-xs text-amber-600 ml-1 hover:underline"
                    >
                      View profile
                    </Link>
                  )}
                </p>
              )}
              <p className="text-xs text-slate-500 mt-3">
                Advice and services are provided by the professional, firm or
                team you engage — under their own licence and terms.
              </p>
            </div>
          )}

          {/* Book consultation — only shown once the brief is accepted */}
          {accepted.professional?.slug && (
            <div className="mb-6">
              <BookConsultationPanel
                briefSlug={brief.slug}
                proSlug={accepted.professional.slug}
                proName={accepted.professional.name}
                contactEmail={emailMatches ? email : null}
                existingBooking={existingBooking}
                existingSlot={existingSlot}
              />
            </div>
          )}

          {/* Brief summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
            <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">
              Brief summary
            </p>
            <p className="text-sm text-slate-700 whitespace-pre-line">
              {brief.job_description}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-600">
              <dt className="font-semibold">Template</dt>
              <dd>
                {brief.brief_template
                  ? BRIEF_TEMPLATE_LABELS[brief.brief_template]
                  : "—"}
              </dd>
              <dt className="font-semibold">Provider preference</dt>
              <dd>{brief.provider_preference ?? "—"}</dd>
              <dt className="font-semibold">Routing mode</dt>
              <dd>{brief.routing_mode ?? "—"}</dd>
              <dt className="font-semibold">Budget band</dt>
              <dd>{brief.budget_band}</dd>
              <dt className="font-semibold">Accept cost</dt>
              <dd>
                {brief.accept_credits_cost
                  ? `${brief.accept_credits_cost} credits`
                  : "—"}
              </dd>
            </dl>
          </div>

          {/* Email-key reveal */}
          {emailMatches && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-800">
              You&apos;re viewing your Match Request status. We&apos;ll
              email <strong>{brief.contact_email}</strong> when a verified pro responds or anything changes.
            </div>
          )}
          {!emailMatches && (
            <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600">
              Looking for the full owner view? Use the link we emailed you, or
              add <code>?email=&lt;your-email&gt;</code> to this page.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
