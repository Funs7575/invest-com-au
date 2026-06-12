import type { Metadata } from "next";

import GetMatchedClient from "./GetMatchedClient";
import { CURRENT_YEAR, SITE_URL, breadcrumbJsonLd } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { deepLinkPrefill } from "@/lib/getmatched/deep-link-prefill";

export const metadata: Metadata = {
  title: `Get Matched — Build your Investment Action Plan (${CURRENT_YEAR})`,
  description:
    "Tell us your goal. We'll build your action plan — compare platforms, browse opportunities or get quotes from verified Australian financial professionals.",
  alternates: { canonical: `${SITE_URL}/get-matched` },
  robots: { index: true, follow: true },
};

export const dynamic = "force-dynamic";

const GET_MATCHED_FAQS = [
  {
    q: "What happens when I click 'Get Matched'?",
    a: "The Get Matched tool walks you through a short set of questions about what you're trying to do — your investing goal (wealth building, retirement, income, property, SMSF, or tax planning), your timeline, whether you want a DIY platform or professional help, and your location. Based on your answers, the tool builds a personalised action plan: recommended comparison pages, relevant calculators, and — if you need professional advice — a curated shortlist of verified advisers or teams for your situation. There's no obligation attached; it's a free navigation tool.",
  },
  {
    q: "Will I be matched with a specific adviser automatically?",
    a: "Not automatically. The matching tool identifies the type of adviser best suited to your situation (e.g. financial planner for retirement, SMSF accountant for self-managed super, mortgage broker for property finance) and shows you a shortlist of verified professionals in that category. You review their profiles, ratings, and fees before deciding who to contact. Invest.com.au facilitates the introduction but you make the final choice. There's no auto-assignment.",
  },
  {
    q: "Is the Get Matched service free?",
    a: "Yes. Using the Get Matched tool, receiving an action plan, and contacting matched advisers for an initial conversation are all free. Advisers set their own fees for ongoing engagements — these are disclosed on their profile and confirmed before any paid service begins. Invest.com.au may receive a referral fee from adviser engagements generated via the platform, which is disclosed in our How We Earn page (/how-we-earn).",
  },
  {
    q: "What if I already know what I need — can I skip the questionnaire?",
    a: "Yes. If you already know the type of help you need, you can go directly to the relevant section: the adviser directory (/advisors) to search by specialisation and location, the platform comparison (/brokers) to compare share brokers, the quotes marketplace (/quotes) to post a brief and receive competitive quotes, or the tool hub (/tools) to access calculators. The Get Matched flow is designed for people who are unsure of their next step — not a mandatory path.",
  },
];

interface SearchParams {
  goal?: string;
  intent?: string;
  context?: string;
  team?: string;
  plan_id?: string;
  mode?: string;
  /** Cross-border deep-link from country pages / the /find-advisor fold-in. */
  specialty?: string;
  country?: string;
}

export default async function GetMatchedPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = (await searchParams) ?? {};
  const linkPrefill = deepLinkPrefill({ specialty: sp.specialty, country: sp.country });
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Get Matched" },
  ]);
  const getMatchedFaqLd = faqJsonLd(GET_MATCHED_FAQS);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {getMatchedFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(getMatchedFaqLd) }}
        />
      )}
      <GetMatchedClient
        initialGoal={sp.goal ?? null}
        initialIntent={sp.intent ?? null}
        initialContext={sp.context ?? null}
        initialPlanId={sp.plan_id ? Number(sp.plan_id) : null}
        initialMode={sp.mode === "fast" || sp.mode === "guided" ? sp.mode : "both"}
        initialPrefill={Object.keys(linkPrefill).length > 0 ? linkPrefill : null}
      />

      <div className="border-t border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-10">
          <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
          <div className="space-y-3">
            {GET_MATCHED_FAQS.map((faq) => (
              <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                  {faq.q}
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
                </summary>
                <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
