import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOutcomeByToken } from "@/lib/outcomes";
import { SITE_URL } from "@/lib/seo";
import OutcomeForm from "./OutcomeForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Share your outcome — Invest.com.au",
  description: "Tell us how it went with your verified pro.",
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE_URL}/outcome` },
};

export default async function OutcomePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const outcome = await getOutcomeByToken(token);
  if (!outcome) notFound();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-xl mx-auto px-4 py-10 sm:py-16">
        <p className="text-amber-600 text-[11px] font-bold uppercase tracking-widest mb-2">
          One-time review
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
          How did it go?
        </h1>
        <p className="text-sm text-slate-600 mb-6">
          You used Invest.com.au a few weeks ago to send a Match Request. We&apos;d love a quick update — it takes 30 seconds and helps other Australians find the right pro. Your response is confidential unless you choose to share a testimonial publicly.
        </p>
        <OutcomeForm
          token={token}
          alreadySubmitted={Boolean(outcome.submitted_at)}
          initialOutcome={outcome.outcome}
          initialRating={outcome.rating}
          initialTestimonial={outcome.testimonial}
          initialShowTestimonial={outcome.show_testimonial}
        />
      </div>
    </div>
  );
}
