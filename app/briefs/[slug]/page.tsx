import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
// eslint-disable-next-line no-restricted-imports -- The email-key tracker path has no advisor JWT but still needs to detect whether the signed-in user is the accepted pro / a member of the accepted team (expert_team_members is deny-all-anon). Per CLAUDE.md § "Two Supabase clients", cross-table membership lookups that can't be scoped to auth.uid() are a legitimate service-role use case.
import { createAdminClient } from "@/lib/supabase/admin";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { BRIEF_TEMPLATE_LABELS } from "@/lib/briefs/templates";
import type { BriefRow, TrackerStatus } from "@/lib/briefs/types";
import { listMessagesForBrief } from "@/lib/brief-messages";

import BriefChatPanel from "./BriefChatPanel";

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

interface ChatBlock {
  initialMessages: Awaited<ReturnType<typeof listMessagesForBrief>>;
  viewerSide: "consumer" | "pro";
  viewerName: string;
  counterpartyName: string;
}

/**
 * Detect which side of the conversation the signed-in viewer is on
 * and pre-load the message history for SSR. Returns null if the viewer
 * isn't on either side (anonymous / wrong account) — caller hides the
 * chat panel in that case.
 *
 * Email-key access (`?email=…`) is enough for *visibility* of the
 * tracker, but the chat panel writes via authenticated API routes that
 * gate on auth.users / advisor session. We render the panel for the
 * email-key consumer path because the API will 401 if they aren't
 * actually signed-in — better to show the input + a clear error than
 * silently hide the chat from the brief owner.
 */
async function loadChatContext(
  brief: BriefRow,
  emailMatches: boolean,
  accepted: AcceptedInfo,
): Promise<ChatBlock | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const proName =
    accepted.team?.name ?? accepted.professional?.name ?? "Your provider";
  const consumerName = brief.contact_name?.trim() || "You";

  let viewerSide: "consumer" | "pro" | null = null;

  // Pro side: signed-in user matches the accepted professional (by email
  // — pros log in via Supabase auth, and the professionals.email column
  // is the same address). Membership lookups on expert_team_members are
  // deny-all-anon so we use the service-role admin client for those reads.
  if (user?.email) {
    const admin = createAdminClient();
    const { data: pro } = await admin
      .from("professionals")
      .select("id")
      .eq("email", user.email)
      .maybeSingle();
    if (pro) {
      if (
        brief.accepted_by_professional_id !== null &&
        (pro.id as number) === brief.accepted_by_professional_id
      ) {
        viewerSide = "pro";
      } else if (brief.accepted_by_team_id !== null) {
        const { data: membership } = await admin
          .from("expert_team_members")
          .select("id")
          .eq("team_id", brief.accepted_by_team_id)
          .eq("professional_id", pro.id as number)
          .eq("status", "active")
          .maybeSingle();
        if (membership) viewerSide = "pro";
      }
    }
  }

  // Consumer side: signed-in email matches contact_email, OR the
  // email-key query string matched (covers the magic-link path before
  // a full auth session is established).
  if (
    viewerSide === null &&
    ((user?.email &&
      brief.contact_email &&
      user.email.toLowerCase() === brief.contact_email.toLowerCase()) ||
      emailMatches)
  ) {
    viewerSide = "consumer";
  }

  if (viewerSide === null) return null;

  let initialMessages: Awaited<ReturnType<typeof listMessagesForBrief>> = [];
  try {
    initialMessages = await listMessagesForBrief(brief.id);
  } catch {
    // Non-fatal — render an empty chat. Error logged in the helper.
  }

  return {
    initialMessages,
    viewerSide,
    viewerName: viewerSide === "consumer" ? consumerName : proName,
    counterpartyName: viewerSide === "consumer" ? proName : consumerName,
  };
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

  // ── Chat-panel visibility ──────────────────────────────────────────
  // Only render the chat panel once a provider has accepted the brief.
  // We also need to know which "side" the viewer is on so the bubble
  // alignment + mark-read column match. Anonymous viewers (no JWT, no
  // email match) don't see the panel at all.
  const chatBlock = brief.accepted_at
    ? await loadChatContext(brief, emailMatches, accepted)
    : null;

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

            {/* 5 status dots side-by-side. Labels can wrap to 2 lines on
                narrow viewports — `break-words` prevents the longest label
                ("Engagement confirmed") from forcing horizontal overflow. */}
            <ol className="mt-4 grid grid-cols-5 gap-1.5 sm:gap-2">
              {STATUS_ORDER.map((s, idx) => {
                const reached = idx <= stepIndex;
                return (
                  <li key={s} className="text-center min-w-0">
                    <div
                      className={`w-7 h-7 rounded-full mx-auto flex items-center justify-center text-[11px] font-bold ${
                        reached
                          ? "bg-amber-500 text-slate-900"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <p
                      className={`text-[10px] sm:text-[11px] mt-1 leading-tight break-words ${
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

          {/* Chat panel — only renders once a provider has accepted */}
          {chatBlock && (
            <BriefChatPanel
              slug={brief.slug}
              briefId={brief.id}
              initialMessages={chatBlock.initialMessages}
              viewerSide={chatBlock.viewerSide}
              viewerName={chatBlock.viewerName}
              counterpartyName={chatBlock.counterpartyName}
            />
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
              add <code className="break-all">?email=&lt;your-email&gt;</code> to this page.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
