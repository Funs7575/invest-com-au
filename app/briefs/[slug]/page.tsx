import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
// eslint-disable-next-line no-restricted-imports -- the consumer brief tracker is an anonymous email-link surface; accept-flow briefs (and brief_messages / brief_outcomes) are service-role-only under RLS, so the page reads via admin and gates ALL PII display by emailMatches — the same email-as-key model the brief write routes (withdraw/accept/book) use. The lone viewer-session check below stays on createClient (it needs the caller's JWT).
import { createAdminClient } from "@/lib/supabase/admin";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { BRIEF_TEMPLATE_LABELS } from "@/lib/briefs/templates";
import type { BriefRow, TrackerStatus } from "@/lib/briefs/types";
import {
  getSlot,
  listBookingsForBrief,
  type AvailabilitySlot,
  type ConsultationBooking,
} from "@/lib/consultations";
import {
  DISPUTE_STALE_DAYS,
  getDisputeForBrief,
  type DisputeMessageRow,
  type DisputeRow,
} from "@/lib/disputes";

import { listMessagesForBrief, type BriefMessageRow } from "@/lib/brief-messages";
import {
  getBriefActivity,
  getMedianAcceptHours,
  type BriefActivity,
} from "@/lib/briefs/activity";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import DirectoryHero from "@/components/directory/DirectoryHero";
import Icon from "@/components/Icon";
import DecisionKit from "@/components/decision-kit/DecisionKit";
import { loadDecisionKit } from "@/lib/decision-kit/load";

import { getMemberPoolView } from "@/lib/briefs/demand-pools-actions";

import BookConsultationPanel from "./BookConsultationPanel";
import BriefChatPanel from "./BriefChatPanel";
import WithdrawBriefButton from "./WithdrawBriefButton";
import MarkCompleteButton from "./MarkCompleteButton";
import DisputePanel from "./DisputePanel";
import { isBookingV2Enabled } from "@/lib/booking-v2";
import PoolOffersPanel from "./PoolOffersPanel";

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
  const admin = createAdminClient();
  const { data } = await admin
    .from("advisor_auctions")
    .select("job_title")
    .eq("slug", slug)
    .eq("flow_type", "accept")
    .maybeSingle();
  const title = data?.job_title || "Match Request";
  return {
    title: `${title} — Your Quote Status (${CURRENT_YEAR})`,
    robots: "noindex, nofollow",
    alternates: { canonical: `${SITE_URL}/briefs/${slug}` },
  };
}

interface AcceptedInfo {
  professional?: { name: string; slug: string | null; email: string | null };
  team?: { name: string; slug: string };
}

async function loadAccepted(brief: BriefRow): Promise<AcceptedInfo> {
  const admin = createAdminClient();
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

  const admin = createAdminClient();
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

  // Dispute panel — only render once the brief has been accepted and either:
  //   - an outcome has been submitted (consumer reviewed), OR
  //   - 30+ days have elapsed since acceptance (the timeout window).
  let disputeRow: DisputeRow | null = null;
  let disputeMessages: DisputeMessageRow[] = [];
  let canOpenDispute = false;
  if (brief.accepted_at && emailMatches) {
    const existing = await getDisputeForBrief(brief.id, email);
    if (existing) {
      disputeRow = existing.dispute;
      disputeMessages = existing.messages;
    } else {
      // Check whether the brief is in a state where opening a dispute is allowed.
      const adminRead = createAdminClient();
      const { data: outcomeRow } = await adminRead
        .from("brief_outcomes")
        .select("submitted_at")
        .eq("brief_id", brief.id)
        .maybeSingle();
      const hasSubmittedOutcome = !!outcomeRow?.submitted_at;
      const acceptedMs = new Date(brief.accepted_at).getTime();
      const staleMs = DISPUTE_STALE_DAYS * 24 * 60 * 60 * 1000;
      const isStale = Date.now() - acceptedMs >= staleMs;
      canOpenDispute = hasSubmittedOutcome || isStale;
    }
  }

  // Intake-question prompt: pros/teams can publish 1-5 questions the
  // consumer should answer post-accept. Surface a banner when the brief
  // has unanswered required questions so the consumer doesn't need to
  // discover the /intake page on their own. Count via service-role —
  // questions are public-readable but answers are owner-scoped.
  let intakeOutstanding = 0;
  if (brief.accepted_at) {
    try {
      const intakeAdmin = createAdminClient();
      const targetTeam = brief.accepted_by_team_id;
      const targetPro = brief.accepted_by_professional_id;
      let questionFilter = intakeAdmin
        .from("pro_intake_questions")
        .select("id", { count: "exact", head: true })
        .eq("enabled", true);
      if (targetTeam) questionFilter = questionFilter.eq("team_id", targetTeam);
      else if (targetPro) questionFilter = questionFilter.eq("professional_id", targetPro);
      else questionFilter = questionFilter.eq("id", -1);
      const { count: questionCount } = await questionFilter;
      const { count: answeredCount } = await intakeAdmin
        .from("pro_intake_answers")
        .select("id", { count: "exact", head: true })
        .eq("brief_id", brief.id);
      intakeOutstanding = Math.max(0, (questionCount ?? 0) - (answeredCount ?? 0));
    } catch {
      /* silent — banner just doesn't render */
    }
  }

  // Unread message count from the consumer's perspective — pros / team
  // members who posted to brief_messages without the consumer having
  // marked-read. Drives a small badge next to the "accepted by" panel.
  let unreadFromPro = 0;
  if (brief.accepted_at && emailMatches) {
    try {
      const msgAdmin = createAdminClient();
      const { count } = await msgAdmin
        .from("brief_messages")
        .select("id", { count: "exact", head: true })
        .eq("brief_id", brief.id)
        .in("sender_kind", ["professional", "team"])
        .is("read_by_consumer_at", null);
      unreadFromPro = count ?? 0;
    } catch {
      /* silent */
    }
  }

  // Outcome review prompt — once the cron has issued a brief_outcomes row
  // (4 weeks post-accept by default) we show a "rate the engagement" CTA
  // pointing the consumer at /review/<token>. The form itself already
  // exists at app/review/[token]/page.tsx + app/api/outcomes/submit.
  let outcomeReviewToken: string | null = null;
  if (brief.accepted_at && (brief.tracker_status === "won" || emailMatches)) {
    try {
      const outcomeAdmin = createAdminClient();
      const { data: outcomeRow } = await outcomeAdmin
        .from("brief_outcomes")
        .select("review_token, submitted_at")
        .eq("brief_id", brief.id)
        .maybeSingle();
      if (outcomeRow && !outcomeRow.submitted_at) {
        outcomeReviewToken = outcomeRow.review_token as string;
      }
    } catch {
      /* silent */
    }
  }

  const stepIndex = STATUS_ORDER.indexOf(brief.tracker_status);

  // ── Trust Centre activity (owner-only, pre-acceptance) ──────────────
  // Aggregate counts only — adviser identities are never shown before
  // acceptance. Median accept time is suppressed below a minimum sample.
  let activity: BriefActivity | null = null;
  let medianHours: number | null = null;
  if (
    emailMatches &&
    !brief.accepted_at &&
    brief.status !== "closed" &&
    brief.status !== "withdrawn"
  ) {
    [activity, medianHours] = await Promise.all([
      getBriefActivity(brief.id),
      getMedianAcceptHours(brief.brief_template ?? null),
    ]);
  }
  const medianLabel =
    medianHours === null
      ? null
      : medianHours < 48
        ? `${medianHours} hour${medianHours === 1 ? "" : "s"}`
        : `${Math.round(medianHours / 24)} days`;

  // Load chat messages when the brief is accepted and the viewer is one
  // of the two parties: the consumer (emailMatches) or the accepted pro.
  // We determine "is accepted pro" server-side by checking whether the
  // session user's id matches accepted_by_professional_id.  Because the
  // brief page also serves unauthenticated consumers (email-link flow),
  // we guard with a try/catch so a missing session never breaks the page.
  let chatMessages: BriefMessageRow[] = [];
  let viewerIsAdvisor = false;
  if (brief.accepted_at) {
    if (emailMatches) {
      // Consumer side — always load when accepted + email verified.
      try {
        chatMessages = await listMessagesForBrief(brief.id);
      } catch {
        /* non-critical — panel just renders empty */
      }
    } else {
      // Check if the authenticated user is the accepted professional.
      try {
        const sessionClient = await createClient();
        const { data: session } = await sessionClient.auth.getUser();
        if (session?.user?.id && brief.accepted_by_professional_id) {
          const proCheck = await sessionClient
            .from("professionals")
            .select("id")
            .eq("id", brief.accepted_by_professional_id)
            .eq("auth_user_id", session.user.id)
            .maybeSingle();
          if (proCheck.data) {
            viewerIsAdvisor = true;
            chatMessages = await listMessagesForBrief(brief.id);
          }
        }
      } catch {
        /* non-critical */
      }
    }
  }

  const showChat = brief.accepted_at !== null && (emailMatches || viewerIsAdvisor);

  // Decision Kit — accept-flow briefs are claimed by a single provider, so the
  // respondent comparison shows that one accepted adviser's signals alongside
  // intro-call scripts and (flag-gated, owner-only) a post-call scorecard. The
  // kit helps the consumer run a structured intro call and decide whether to
  // proceed. Only assembled for the verified owner of an accepted brief; fails
  // soft (an empty kit doesn't render). Briefs carry no per-provider quote, so
  // the amount column is omitted (amountCents = null → honest gap).
  let decisionKit: Awaited<ReturnType<typeof loadDecisionKit>> | null = null;
  if (emailMatches && brief.accepted_by_professional_id) {
    decisionKit = await loadDecisionKit({
      briefId: brief.id,
      ownerEmail: email,
      serviceType: brief.brief_template ?? brief.advisor_types?.[0] ?? null,
      inputs: [
        {
          professionalId: brief.accepted_by_professional_id,
          amountCents: null,
          bidId: null,
        },
      ],
    });
  }

  // booking-v2 "propose times" in chat — fail-closed. Keyed off the accepting
  // adviser's email so the flag's allowlist can target specific advisers.
  const bookingV2Enabled = showChat
    ? await isBookingV2Enabled(accepted.professional?.email ?? null)
    : false;

  // ── Group Briefs (idea #17) — pool status for the verified owner ────
  // Flag-gated + fail-soft inside getMemberPoolView; returns null when the
  // demand_pools flag is off, the brief isn't pooled, or on any error, so the
  // section simply doesn't render. Only the verified owner sees it.
  const poolView = emailMatches ? await getMemberPoolView(brief.id) : null;

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
        <DirectoryHero
          tone="light"
          breadcrumbLabel="Quote status"
          headlineLead={brief.job_title}
          subtitle={
            <>
              {brief.brief_template ? BRIEF_TEMPLATE_LABELS[brief.brief_template] : ""}
              {brief.location ? ` · ${brief.location}` : ""}
            </>
          }
        />

        <div className="container-custom max-w-6xl pb-12 pt-3 md:pt-4">
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-5">
            {/* ── Status rail — first on mobile (the page's headline answer),
                  sticky right column on desktop. ── */}
            <aside className="space-y-3 lg:order-2 lg:sticky lg:top-20">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Status
                </p>
                <h2 className="mb-3 text-lg font-bold text-slate-900">
                  {brief.status === "closed"
                    ? "Closed"
                    : STATUS_LABELS[brief.tracker_status] ?? brief.tracker_status}
                </h2>

                {brief.risk_review_status === "pending_review" && (
                  <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Your brief mentions topics that need a quick compliance review
                    before verified providers can see it. We&apos;ll email you once it&apos;s cleared.
                  </div>
                )}

                <ol className="grid grid-cols-5 gap-1.5">
                  {STATUS_ORDER.map((s, idx) => {
                    const reached = idx <= stepIndex;
                    return (
                      <li key={s} className="text-center">
                        <div
                          className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                            reached
                              ? "bg-amber-500 text-slate-900"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {idx + 1}
                        </div>
                        <p
                          className={`mt-1 text-[9px] leading-tight ${
                            reached ? "font-semibold text-slate-700" : "text-slate-500"
                          }`}
                        >
                          {STATUS_LABELS[s]}
                        </p>
                      </li>
                    );
                  })}
                </ol>

                {emailMatches &&
                  !accepted.professional &&
                  brief.status !== "closed" &&
                  brief.status !== "withdrawn" && (
                    <>
                      {activity && activity.reached > 0 && (
                        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs leading-relaxed text-emerald-900">
                          <span className="font-semibold">Activity:</span> Your
                          request has reached{" "}
                          <strong>
                            {activity.reached} adviser
                            {activity.reached === 1 ? "" : "s"}
                          </strong>
                          {activity.viewed > 0 && (
                            <>
                              {" "}
                              — <strong>{activity.viewed}</strong> opened the full
                              details
                            </>
                          )}
                          .
                        </div>
                      )}
                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
                        <span className="font-semibold text-slate-700">What happens next:</span>{" "}
                        Verified providers who match your request are reviewing it now. You&apos;ll
                        get an email the moment one accepts — their contact details then appear
                        here and you can message them or book a call.{" "}
                        {medianLabel
                          ? `Similar requests are typically accepted within about ${medianLabel}.`
                          : "Most requests see a response within a couple of business days."}
                      </div>
                    </>
                  )}

                {/* Accepted-but-no-booking nudge (B6) — once a provider accepts,
                    the generic guidance above disappears; keep the rail pointing
                    at the single next action instead of going quiet. */}
                {emailMatches &&
                  brief.accepted_at &&
                  !existingBooking &&
                  brief.status !== "closed" &&
                  brief.status !== "withdrawn" && (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900">
                      <span className="font-semibold">Next step:</span>{" "}
                      {accepted.professional?.slug ? (
                        <>
                          {intakeOutstanding > 0
                            ? "answer your provider's prep questions, then book your intro call."
                            : "book your intro call — pick a time that suits you."}{" "}
                          <a
                            href="#book"
                            className="font-semibold underline underline-offset-2 hover:text-amber-700"
                          >
                            Go to booking →
                          </a>
                        </>
                      ) : (
                        <>message your provider in the chat below to arrange your first call.</>
                      )}
                    </div>
                  )}
              </div>

              {/* Withdraw — the verified owner can close an open request (AJ-3).
                  Email-as-key auth on the route; hidden once closed/withdrawn. */}
              {emailMatches &&
                brief.status !== "closed" &&
                brief.status !== "withdrawn" && (
                  <WithdrawBriefButton slug={slug} contactEmail={email} />
                )}

              {/* Consumer "mark complete" → opens the review immediately (AJ-6),
                  shown only to the verified owner of an accepted brief that doesn't
                  already have a review request (else the banner covers it). */}
              {emailMatches &&
                !outcomeReviewToken &&
                (accepted.professional || accepted.team) && (
                  <MarkCompleteButton slug={slug} contactEmail={email} />
                )}

              {/* Email-key reveal */}
              {emailMatches ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs leading-relaxed text-emerald-800">
                  You&apos;re viewing your request status. We&apos;ll email{" "}
                  <strong>{brief.contact_email}</strong> when a verified pro responds
                  or anything changes.
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3.5 text-xs leading-relaxed text-slate-600">
                  Looking for the full owner view? Use the link we emailed you, or
                  add <code>?email=&lt;your-email&gt;</code> to this page.
                </div>
              )}
            </aside>

            {/* ── Main column ── */}
            <div className="space-y-4 lg:order-1">
              {/* Group Briefs (idea #17) — pool status + group offers for the
                  verified owner. Rendered only when the brief is in a pool and
                  the demand_pools flag is on (poolView is null otherwise). */}
              {poolView && (
                <PoolOffersPanel slug={slug} email={email} data={poolView} />
              )}

              {/* Intake-question prompt — surfaces unanswered required questions
                  that the accepting provider published. Skipped silently when
                  questions are zero or all answered. */}
              {intakeOutstanding > 0 && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
                  <Icon name="edit-3" size={20} className="mt-0.5 shrink-0 text-amber-600" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-amber-900">
                      Your provider has {intakeOutstanding} quick question
                      {intakeOutstanding === 1 ? "" : "s"} before your first call
                    </p>
                    <p className="mt-1 text-xs text-amber-800">
                      Answering these now means the first call lands with the context they need.
                    </p>
                    <Link
                      href={`/briefs/${brief.slug}/intake${email ? `?email=${encodeURIComponent(email)}` : ""}`}
                      className="mt-2.5 inline-block rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-amber-400"
                    >
                      Answer now →
                    </Link>
                  </div>
                </div>
              )}

              {/* Outcome review prompt — once the 4-week cron has issued a
                  review_token for this brief, surface a small banner so the
                  consumer can submit feedback. Drives provider_outcome_scores. */}
              {outcomeReviewToken && (
                <div className="flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4">
                  <Icon name="star" size={20} className="mt-0.5 shrink-0 text-violet-600" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-violet-900">
                      How did your engagement go?
                    </p>
                    <p className="mt-1 text-xs text-violet-800">
                      A two-minute review helps other investors and bumps your provider on their scoreboard.
                    </p>
                    <Link
                      href={`/review/${outcomeReviewToken}`}
                      className="mt-2.5 inline-block rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500"
                    >
                      Leave a review →
                    </Link>
                  </div>
                </div>
              )}

              {/* Accepted provider */}
              {(accepted.professional || accepted.team) && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Accepted by
                    </p>
                    {unreadFromPro > 0 && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700"
                        title="Unread messages from your provider"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden />
                        {unreadFromPro} new message{unreadFromPro === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                  {accepted.team && (
                    <p className="text-base font-bold text-slate-900">
                      {accepted.team.name}{" "}
                      <Link
                        href={`/teams/${accepted.team.slug}`}
                        className="ml-1 text-xs text-amber-600 hover:underline"
                      >
                        View team
                      </Link>
                    </p>
                  )}
                  {accepted.professional && (
                    <p className="mt-1 text-sm text-slate-700">
                      Lead contact:{" "}
                      <span className="font-semibold">{accepted.professional.name}</span>
                      {accepted.professional.slug && (
                        <Link
                          href={`/advisor/${accepted.professional.slug}`}
                          className="ml-1 text-xs text-amber-600 hover:underline"
                        >
                          View profile
                        </Link>
                      )}
                    </p>
                  )}
                  <p className="mt-2.5 text-xs text-slate-500">
                    Advice and services are provided by the professional, firm or
                    team you engage — under their own licence and terms.
                  </p>
                </div>
              )}

              {/* Decision Kit — intro-call questions + (flag-gated) a post-call
                  scorecard for the accepted provider, so the consumer can run a
                  structured first call before committing. Owner-only. */}
              {decisionKit && decisionKit.respondents.length > 0 && (
                <DecisionKit
                  slug={brief.slug}
                  contactEmail={emailMatches ? email : null}
                  respondents={decisionKit.respondents}
                  script={decisionKit.script}
                  amountLabel="Estimate"
                  scorecardsEnabled={decisionKit.scorecardsEnabled}
                  initialScorecards={decisionKit.initialScorecards}
                />
              )}

              {/* Book consultation — only shown once the brief is accepted.
                  id="book" is the rail nudge's anchor target. */}
              {accepted.professional?.slug && (
                <div id="book" className="scroll-mt-24">
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

              {/* Chat — visible to the brief owner and the accepted advisor only.
                   A general-advice compliance notice is shown above the panel per
                   AFSL obligations: messages may contain general information but
                   no personal advice is given via this channel. */}
              {showChat && (
                <div>
                  <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                    <strong>General information only.</strong>{" "}
                    {GENERAL_ADVICE_WARNING} Messages sent here do not constitute
                    personal financial advice.
                  </div>
                  <BriefChatPanel
                    slug={brief.slug}
                    briefId={brief.id}
                    initialMessages={chatMessages}
                    viewerSide={viewerIsAdvisor ? "pro" : "consumer"}
                    viewerName={
                      viewerIsAdvisor
                        ? (accepted.professional?.name ?? "You")
                        : "You"
                    }
                    counterpartyName={
                      viewerIsAdvisor
                        ? "Client"
                        : (accepted.professional?.name ??
                          accepted.team?.name ??
                          "Your advisor")
                    }
                    proposeTimesEnabled={bookingV2Enabled}
                    consumerEmail={!viewerIsAdvisor && emailMatches ? email : null}
                  />
                </div>
              )}

              {/* Dispute / mediation panel */}
              {emailMatches && brief.accepted_at && (disputeRow || canOpenDispute) && (
                <DisputePanel
                  slug={brief.slug}
                  briefId={brief.id}
                  initialDispute={disputeRow}
                  initialMessages={disputeMessages}
                  canViewerOpen={canOpenDispute}
                  viewerName="You"
                />
              )}

              {/* Brief summary */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Brief summary
                </p>
                <p className="whitespace-pre-line break-words text-sm text-slate-700">
                  {brief.job_description}
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-600">
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
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
