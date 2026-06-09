"use client";

import Icon from "@/components/Icon";
import { Button } from "@/components/ui/Button";

/**
 * Brief Studio success state. Celebratory, and — crucially — orients the user
 * to the next action: responses are coming, compare them and choose. Handles
 * the compliance-review hold path too.
 */

export interface BriefSuccessProps {
  slug: string;
  contactEmail: string;
  riskReviewStatus: string;
}

const NEXT_STEPS = [
  {
    icon: "eye",
    title: "Pros review your brief",
    desc: "Matching verified pros are notified now and see your masked brief.",
  },
  {
    icon: "bell",
    title: "Responses come to you",
    desc: "We email you the moment a pro responds — usually within hours.",
  },
  {
    icon: "user-check",
    title: "Compare & choose",
    desc: "Line up the responses, pick the pro that fits. Your details stay private until you do.",
  },
];

export default function BriefSuccess({
  slug,
  contactEmail,
  riskReviewStatus,
}: BriefSuccessProps) {
  const heldForReview = riskReviewStatus === "pending_review";

  return (
    <div
      className="mx-auto max-w-2xl rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm"
      style={{ animation: "resultCardIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
    >
      <div
        className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 celebrate-emoji"
        aria-hidden="true"
      >
        <Icon
          name={heldForReview ? "clock" : "party-popper"}
          size={32}
          className="text-emerald-600"
        />
      </div>

      <h2 className="mb-2 text-2xl font-extrabold text-slate-900">
        {heldForReview ? "Brief received — quick review first" : "Your brief is live 🎉"}
      </h2>
      <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-slate-600">
        {heldForReview
          ? "Your brief mentions topics that need a quick compliance review before verified pros can see it. We'll email you the moment it's cleared."
          : "We're notifying matching verified pros now. The responses come to you — compare them and choose who to work with."}
      </p>

      {!heldForReview && (
        <ol className="mb-7 space-y-3 text-left">
          {NEXT_STEPS.map((step, i) => (
            <li key={step.title} className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                  <Icon name={step.icon} size={14} className="text-amber-500" />
                  {step.title}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                  {step.desc}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <Button
          href={`/briefs/${slug}?email=${encodeURIComponent(contactEmail)}`}
          variant="primary"
          icon={<Icon name="arrow-right" size={16} />}
        >
          {heldForReview ? "View your brief status" : "Track responses"}
        </Button>
        <Button href="/advisors" variant="secondary">
          Browse verified pros
        </Button>
      </div>

      <p className="mt-5 text-xs leading-relaxed text-slate-400">
        Invest.com.au provides general information only — the professional, firm
        or team you engage delivers the service under their own licence.
      </p>
    </div>
  );
}
