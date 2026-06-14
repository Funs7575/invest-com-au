"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import LeadScoreBadge from "@/components/LeadScoreBadge";
import { PROFESSIONAL_TYPE_LABELS } from "@/lib/types";
import type { Advisor, Stats, Lead, ProfileCompleteness, Review, ViewDay, WeeklyEnquiry, ViewType } from "./types";
import type { BillingSummary } from "./billing/types";
import PinnedBillingWidget from "./billing/PinnedBillingWidget";
import AnnualBillingPrompt from "./billing/AnnualBillingPrompt";
import AvailabilityWidget from "./AvailabilityWidget";
import LeadCapBanner from "./LeadCapBanner";
import AdvisorTrustScoreCard from "@/components/AdvisorTrustScoreCard";
import OnboardingWizard from "./OnboardingWizard";
import { deriveProfileCompleteness, type WizardStepId } from "@/lib/advisor-portal/profile-completeness";
import {
  SectionCard,
  StatCard,
  EmptyState,
  ProgressBar,
  StatusPill,
  MiniBarChart,
  SectionEyebrow,
} from "./ui/primitives";

type LeaderboardRank =
  | {
      rank: number;
      score: number;
      total: number;
      percentile: number | null;
    }
  | { rank: null };

function YourRankWidget() {
  const [data, setData] = useState<LeaderboardRank | null>(null);

  useEffect(() => {
    fetch("/api/advisor-auth/leaderboard")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: LeaderboardRank | null) => {
        if (d) setData(d);
      })
      .catch(() => {
        /* fail silently */
      });
  }, []);

  if (!data) return null;

  if (!data.rank) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100">
            <Icon name="award" size={16} className="text-slate-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Leaderboard rank</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Complete your profile and earn leads to appear on the{" "}
              <Link href="/advisors/leaderboard" className="font-medium text-indigo-600 hover:underline">
                monthly leaderboard
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100">
          <Icon name="award" size={18} className="text-indigo-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Leaderboard rank</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {data.percentile != null
              ? `Top ${100 - data.percentile}% of advisors this month`
              : `Score: ${data.score}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="flex items-baseline justify-end gap-0.5">
            <span className="text-xs font-semibold text-slate-400">#</span>
            <span className="text-3xl font-bold tabular-nums tracking-tight text-indigo-600">{data.rank}</span>
          </div>
          <div className="text-xs text-slate-400">of {data.total}</div>
        </div>
        <Link
          href="/advisors/leaderboard"
          className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          View →
        </Link>
      </div>
    </div>
  );
}

type Props = {
  advisor: Advisor | null;
  stats: Stats | null;
  leads: Lead[];
  profileCompleteness: ProfileCompleteness | null;
  reviews: Review[];
  viewsByDay: ViewDay[];
  weeklyEnquiries: WeeklyEnquiry[];
  dismissedOnboarding: boolean;
  isPending: boolean;
  onNavigate: (v: ViewType) => void;
  onDismissOnboarding: () => void;
  /** Pre-fetched summary; widget renders a free-leads pill if absent. */
  billingSummary?: BillingSummary | null;
  dataLoadedAt?: Date | null;
  onRefresh?: () => void;
  /** Lets the onboarding wizard sync saved profile edits back into portal state. */
  onAdvisorChange?: (a: Advisor) => void;
};

function useRelativeTime(date: Date | null | undefined): string {
  const [label, setLabel] = useState("");
  useEffect(() => {
    if (!date) return;
    const update = () => {
      const mins = Math.floor((Date.now() - date.getTime()) / 60000);
      setLabel(mins < 1 ? "just now" : mins === 1 ? "1 min ago" : `${mins} min ago`);
    };
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [date]);
  return label;
}

export default function DashboardTab({
  advisor,
  stats,
  leads,
  profileCompleteness,
  reviews,
  viewsByDay,
  weeklyEnquiries,
  dismissedOnboarding,
  isPending,
  onNavigate,
  onDismissOnboarding,
  billingSummary,
  dataLoadedAt,
  onRefresh,
  onAdvisorChange,
}: Props) {
  const refreshLabel = useRelativeTime(dataLoadedAt);
  // Guided onboarding wizard — null = closed, otherwise the step to open at.
  const [wizardStep, setWizardStep] = useState<WizardStepId | null | "closed">("closed");
  const [expandedLeadId, setExpandedLeadId] = useState<number | null>(null);

  const toggleLead = useCallback((id: number) => {
    setExpandedLeadId((prev) => (prev === id ? null : id));
  }, []);

  const avgRatingDisplay =
    stats?.avgRating || (advisor?.rating ? Number(advisor.rating).toFixed(1) : "—");

  return (
    <>
      {/* Header */}
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Welcome{isPending ? "" : " back"}, {advisor?.name?.split(" ")[0]}
        </h1>
        {refreshLabel && onRefresh && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Updated {refreshLabel}</span>
            <button
              onClick={onRefresh}
              aria-label="Refresh data"
              className="text-slate-400 transition-colors hover:text-slate-600"
            >
              <Icon name="refresh-cw" size={13} />
            </button>
          </div>
        )}
      </div>
      <p className="mb-5 text-sm text-slate-500">
        {advisor?.firm_name ||
          PROFESSIONAL_TYPE_LABELS[advisor?.type as keyof typeof PROFESSIONAL_TYPE_LABELS]}
      </p>

      <AvailabilityWidget advisor={advisor} />

      {advisor?.profile_complete && !advisor?.booking_link && (
        <div className="mb-5 flex flex-col items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center">
          <Icon name="calendar" size={20} className="shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">
              Add a booking link so investors can schedule with you
            </p>
            <p className="mt-0.5 text-xs text-amber-800">
              Your profile is ready, but there&rsquo;s no way to book yet. Paste a Calendly, SavvyCal
              or any scheduling URL.
            </p>
          </div>
          <button
            onClick={() => onNavigate("profile")}
            className="whitespace-nowrap rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-900 transition-colors hover:bg-amber-600"
          >
            Add booking link
          </button>
        </div>
      )}

      {/* KPI row */}
      <SectionEyebrow>Last 30 days</SectionEyebrow>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Profile views" value={(stats?.totalViews30d ?? 0).toLocaleString()} icon="eye" sub="last 30 days" />
        <StatCard label="Enquiries" value={(stats?.leads30d ?? 0).toLocaleString()} icon="inbox" sub="last 30 days" />
        <StatCard label="Booking clicks" value={(stats?.bookingClicks30d ?? 0).toLocaleString()} icon="calendar" sub="last 30 days" />
        <StatCard
          label="Avg rating"
          value={avgRatingDisplay}
          icon="star"
          sub={`${stats?.reviewCount || advisor?.review_count || 0} reviews`}
        />
      </div>

      <div className="mb-3">
        <YourRankWidget />
      </div>
      <div className="mb-6">
        <AdvisorTrustScoreCard />
      </div>

      {/* Free-leads notice (advisor still on the launch trial) */}
      {(advisor?.free_leads_used ?? 0) < 3 && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div>
            <p className="text-sm font-semibold text-emerald-900">
              {3 - (advisor?.free_leads_used ?? 0)} free trial leads remaining
            </p>
            <p className="mt-0.5 text-xs text-emerald-700">
              Your first 3 leads are on us — convert one to unlock discounted lead pricing.
            </p>
          </div>
          <button
            onClick={() => onNavigate("billing")}
            className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-emerald-700"
          >
            See pricing
          </button>
        </div>
      )}

      {/* Monthly lead-cap upsell — factual usage vs tier allowance. */}
      <LeadCapBanner />

      {/* Annual-billing nudge for paid-tier advisors. */}
      <AnnualBillingPrompt advisorTier={advisor?.advisor_tier ?? null} />

      {/* Unified billing widget. */}
      {billingSummary ? (
        <PinnedBillingWidget summary={billingSummary} />
      ) : (advisor?.credit_balance_cents ?? 0) > 0 ? (
        <PinnedBillingWidget
          summary={{
            balance_cents: advisor?.credit_balance_cents ?? 0,
            lifetime_credit_cents: advisor?.lifetime_credit_cents ?? 0,
            lifetime_spend_cents: advisor?.lifetime_lead_spend_cents ?? 0,
            expiring_soon_cents: 0,
            free_leads_used: advisor?.free_leads_used ?? 0,
            free_leads_remaining: Math.max(0, 3 - (advisor?.free_leads_used ?? 0)),
            lead_price_cents: advisor?.lead_price_cents ?? 4900,
            advisor_tier: "free",
            pending_tier: null,
            pending_tier_effective_at: null,
            has_payment_method: false,
            has_stripe_customer: false,
            ledger_first_page: [],
            ledger_total: 0,
          }}
        />
      ) : null}

      {/* Onboarding checklist — driven by the shared completeness lib. */}
      {(!profileCompleteness || profileCompleteness.score < 80) &&
        !dismissedOnboarding &&
        (() => {
          const local = deriveProfileCompleteness(advisor as unknown as Record<string, unknown> | null);
          const steps = profileCompleteness?.steps ?? local.steps;
          const score = profileCompleteness?.score ?? local.score;
          const nextStep = steps.find((s) => !s.complete) ?? null;
          return (
            <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50/50 p-5">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Get your profile ready</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {nextStep ? (
                      <>
                        {score}% complete — next: <strong className="text-slate-700">{nextStep.title.toLowerCase()}</strong>
                      </>
                    ) : (
                      "Complete these steps to start receiving leads"
                    )}
                  </p>
                </div>
                <button
                  onClick={onDismissOnboarding}
                  aria-label="Dismiss setup checklist"
                  className="-mr-2 -mt-2 flex min-h-11 min-w-11 items-center justify-center text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
              <div className="mb-4 space-y-1">
                {steps.map((step) => (
                  <button
                    key={step.id}
                    onClick={step.complete ? undefined : () => setWizardStep(step.id)}
                    disabled={step.complete}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-lg p-2.5 text-left ${
                      step.complete ? "opacity-60" : "cursor-pointer hover:bg-white"
                    }`}
                  >
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        step.complete ? "bg-emerald-500" : "border-2 border-indigo-300 bg-white"
                      }`}
                      aria-hidden="true"
                    >
                      {step.complete && (
                        <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-sm font-medium ${step.complete ? "text-slate-400 line-through" : "text-slate-700"}`}>
                      {step.title}
                      {!step.complete && step.missing.length > 0 && (
                        <span className="mt-0.5 block text-xs font-normal text-slate-500">{step.missing.join(" · ")}</span>
                      )}
                    </span>
                    {!step.complete && (
                      <Icon name="chevron-right" size={15} className="ml-auto shrink-0 text-indigo-400" />
                    )}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <ProgressBar value={score} className="flex-1" />
                <span className="text-xs font-bold tabular-nums text-indigo-700">{score}%</span>
                <button
                  onClick={() => setWizardStep(nextStep?.id ?? null)}
                  className="whitespace-nowrap rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                >
                  Continue setup →
                </button>
              </div>
            </div>
          );
        })()}

      {/* Guided onboarding wizard */}
      {wizardStep !== "closed" && advisor && (
        <OnboardingWizard
          advisor={advisor}
          initialStep={wizardStep}
          onAdvisorChange={(a) => onAdvisorChange?.(a)}
          onClose={() => {
            setWizardStep("closed");
            onRefresh?.();
          }}
        />
      )}

      {/* Profile completeness (compact, post-onboarding) */}
      {profileCompleteness &&
        profileCompleteness.score < 100 &&
        (profileCompleteness.score >= 80 || dismissedOnboarding) && (
          <SectionCard
            title="Profile completeness"
            action={
              <span
                className={`text-sm font-bold tabular-nums ${
                  profileCompleteness.score >= 80
                    ? "text-emerald-600"
                    : profileCompleteness.score >= 50
                      ? "text-amber-600"
                      : "text-red-500"
                }`}
              >
                {profileCompleteness.score}%
              </span>
            }
            className="mb-6"
          >
            <ProgressBar value={profileCompleteness.score} className="mb-3" />
            {profileCompleteness.missingFields.length > 0 && (
              <div>
                <span className="mb-1.5 block text-xs text-slate-500">Missing</span>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-1.5">
                  {profileCompleteness.missingFields.map((f) => (
                    <button
                      key={f}
                      onClick={() => onNavigate("profile")}
                      className="flex min-h-11 w-full items-center rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 sm:min-h-0 sm:w-auto sm:rounded-full sm:px-2.5 sm:py-1"
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>
        )}

      <SectionEyebrow>Performance</SectionEyebrow>

      {/* Enquiries per week */}
      <SectionCard title="Enquiries per week" className="mb-6">
        <p className="mb-4 text-xs text-slate-400">Last 8 weeks</p>
        <MiniBarChart
          data={weeklyEnquiries.map((w) => ({ label: w.weekLabel, value: w.count }))}
          emptyLabel="No enquiries yet — they'll appear here once investors reach out."
        />
      </SectionCard>

      {/* Profile views */}
      <SectionCard title="Profile views" className="mb-6">
        <p className="mb-4 text-xs text-slate-400">Daily views over the last 30 days</p>
        <MiniBarChart
          data={viewsByDay.map((d) => ({ label: d.view_date, value: d.view_count }))}
          height={80}
          showValues={false}
          showLabels={false}
          emptyLabel="No profile views recorded yet."
        />
      </SectionCard>

      {/* Recent enquiries */}
      <SectionCard
        title="Recent enquiries"
        action={
          <button onClick={() => onNavigate("leads")} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
            View all →
          </button>
        }
        className="mb-6"
        bodyClassName=""
      >
        {leads.length === 0 ? (
          <EmptyState icon="inbox" title="No enquiries yet">
            They&apos;ll appear here when investors contact you.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <caption className="sr-only">Recent enquiries</caption>
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th scope="col" className="px-5 py-2.5">Name</th>
                  <th scope="col" className="px-3 py-2.5">Date</th>
                  <th scope="col" className="px-3 py-2.5 text-center">Quality</th>
                  <th scope="col" className="px-3 py-2.5">Status</th>
                  <th scope="col" className="px-3 py-2.5">Message</th>
                  <th scope="col" className="w-8 px-3 py-2.5"><span className="sr-only">Expand</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.slice(0, 8).map((lead) => {
                  const isExpanded = expandedLeadId === lead.id;
                  return (
                    <React.Fragment key={lead.id}>
                      <tr
                        onClick={() => toggleLead(lead.id)}
                        className={`cursor-pointer select-none text-sm transition-colors ${
                          isExpanded ? "bg-indigo-50/60" : lead.status === "new" ? "bg-indigo-50/30 hover:bg-indigo-50/60" : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="px-5 py-3">
                          <div className="font-semibold text-slate-900">{lead.user_name}</div>
                          <div className="text-xs text-slate-400">{lead.user_email}</div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-500">
                          {new Date(lead.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {lead.quality_score != null ? (
                            <LeadScoreBadge score={lead.quality_score} signals={lead.quality_signals} tier={lead.lead_tier} compact />
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <StatusPill status={lead.status} />
                        </td>
                        <td className="max-w-[200px] truncate px-3 py-3 text-xs text-slate-500">
                          {lead.message ? lead.message.slice(0, 80) + (lead.message.length > 80 ? "…" : "") : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-3 text-right text-slate-400">
                          <Icon name={isExpanded ? "chevron-up" : "chevron-down"} size={14} />
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${lead.id}-expanded`} className="bg-indigo-50/40">
                          <td colSpan={6} className="px-5 pb-4 pt-1">
                            {lead.message && (
                              <p className="mb-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-600">
                                {lead.message}
                              </p>
                            )}
                            <button
                              onClick={() => onNavigate("leads")}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-50"
                            >
                              <Icon name="external-link" size={12} />
                              Manage in Leads
                            </button>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Latest reviews */}
      <SectionCard
        title="Latest reviews"
        action={
          reviews.length > 0 ? (
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-amber-400">{"★".repeat(Math.round(Number(stats?.avgRating || advisor?.rating || 0)))}</span>
              <span className="text-xs font-bold text-slate-700">{avgRatingDisplay}</span>
              <span className="text-xs text-slate-400">({stats?.reviewCount || 0})</span>
            </div>
          ) : undefined
        }
        className="mb-6"
      >
        {reviews.length === 0 ? (
          <EmptyState
            icon="star"
            title="No reviews yet"
            cta={{ label: "Share your review link", href: `/advisor/${advisor?.slug}`, external: true }}
          >
            Ask happy clients to leave a review on your profile.
          </EmptyState>
        ) : (
          <div className="space-y-3">
            {reviews.slice(0, 4).map((r) => (
              <div key={r.id} className="rounded-lg border border-slate-100 p-3 transition-colors hover:bg-slate-50/60">
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                      {r.reviewer_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-slate-900">{r.reviewer_name}</span>
                      <div className="text-xs text-slate-400">
                        {new Date(r.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span key={s} className={`text-sm ${s <= r.rating ? "text-amber-400" : "text-slate-200"}`}>★</span>
                    ))}
                  </div>
                </div>
                {r.title && <div className="mb-1 text-sm font-semibold text-slate-800">{r.title}</div>}
                {r.body && <p className="text-xs leading-relaxed text-slate-600">{r.body.slice(0, 200)}{r.body.length > 200 ? "…" : ""}</p>}
                {(r.communication_rating || r.expertise_rating || r.value_for_money_rating) && (
                  <div className="mt-2 flex gap-3">
                    {r.communication_rating && <span className="text-xs text-slate-500">Communication <strong className="text-slate-600">{r.communication_rating}/5</strong></span>}
                    {r.expertise_rating && <span className="text-xs text-slate-500">Expertise <strong className="text-slate-600">{r.expertise_rating}/5</strong></span>}
                    {r.value_for_money_rating && <span className="text-xs text-slate-500">Value <strong className="text-slate-600">{r.value_for_money_rating}/5</strong></span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Quick actions */}
      <SectionEyebrow>Quick actions</SectionEyebrow>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <button
          onClick={() => onNavigate("profile")}
          className="rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-slate-300 hover:shadow-sm"
        >
          <Icon name="user" size={18} className="mb-2 text-indigo-600" />
          <div className="text-sm font-semibold text-slate-900">Edit profile</div>
          <div className="text-xs text-slate-500">Update bio, fees, specialties</div>
        </button>
        <Link
          href={`/advisor/${advisor?.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-slate-300 hover:shadow-sm"
        >
          <Icon name="external-link" size={18} className="mb-2 text-indigo-600" />
          <div className="text-sm font-semibold text-slate-900">View public profile</div>
          <div className="text-xs text-slate-500">See how investors see you</div>
        </Link>
        <button
          onClick={() => onNavigate("billing")}
          className="rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-slate-300 hover:shadow-sm"
        >
          <Icon name="credit-card" size={18} className="mb-2 text-indigo-600" />
          <div className="text-sm font-semibold text-slate-900">Billing</div>
          <div className="text-xs text-slate-500">
            {stats?.pendingBilledCents ? `$${(stats.pendingBilledCents / 100).toFixed(0)} pending` : "No charges yet"}
          </div>
        </button>
      </div>
    </>
  );
}
