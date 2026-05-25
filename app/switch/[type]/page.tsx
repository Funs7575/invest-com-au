import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import { faqJsonLd, howToJsonLd } from "@/lib/schema-markup";
import { getChecklist, SWITCH_TYPES } from "@/lib/switching";
import ComplianceFooter from "@/components/ComplianceFooter";
import SwitchTypeClient from "./SwitchTypeClient";
import {
  GENERAL_ADVICE_WARNING,
  SUPER_WARNING,
} from "@/lib/compliance";

export const revalidate = 3600;

// ─── Static params ────────────────────────────────────────────────────────────

export function generateStaticParams() {
  return SWITCH_TYPES.map((t) => ({ type: t.slug }));
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

const META: Record<
  string,
  { title: string; description: string }
> = {
  broker: {
    title: `How to Switch Share Brokers in Australia — CHESS Transfer Guide (${CURRENT_YEAR}) | ${SITE_NAME}`,
    description:
      "Step-by-step guide to transferring your ASX shares to a new broker via CHESS off-market transfer. Covers HIN transfer, cost-base records, US shares, and fees. Estimate your annual saving.",
  },
  super: {
    title: `How to Switch Super Funds in Australia — Rollover Guide (${CURRENT_YEAR}) | ${SITE_NAME}`,
    description:
      "Step-by-step guide to rolling over your superannuation via myGov. Covers insurance check, lost super search, beneficiary nomination, and contribution timing. Estimate your annual fee saving.",
  },
  savings: {
    title: `How to Switch Savings Accounts in Australia — Guide (${CURRENT_YEAR}) | ${SITE_NAME}`,
    description:
      "Step-by-step guide to switching savings accounts. Covers migrating direct debits and payroll, intro-rate expiry traps, and closing the old account. Estimate your annual interest gain.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>;
}): Promise<Metadata> {
  const { type } = await params;
  const meta = META[type];
  if (!meta) return {};
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `/switch/${type}` },
    openGraph: {
      title: meta.title,
      description: meta.description,
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(`Switch ${type.charAt(0).toUpperCase() + type.slice(1)}`)}&subtitle=Step-by-step+guide&type=default`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: { card: "summary_large_image" },
  };
}

// ─── FAQ data per type ────────────────────────────────────────────────────────

const FAQS: Record<string, { q: string; a: string }[]> = {
  broker: [
    {
      q: "What is a CHESS transfer (off-market transfer)?",
      a: "A CHESS transfer — also called an off-market transfer or broker-to-broker transfer — moves your ASX shares from one broker to another without selling them. Your new broker submits the transfer request to ASX CHESS on your behalf. Your HIN (Holder Identification Number) moves from your old broker's sponsorship to your new broker's sponsorship within 3–5 business days.",
    },
    {
      q: "Do I need to sell my shares to switch brokers?",
      a: "No, if your shares are CHESS-sponsored (indicated by a HIN starting with 'X'). CHESS-sponsored shares can be transferred in-specie (without selling). Custodial/issuer-sponsored shares may require selling first, depending on the new broker's capabilities.",
    },
    {
      q: "How much does a CHESS transfer cost?",
      a: "Most brokers charge a per-holding CHESS transfer fee, typically around $50–$55 per line of stock. Some brokers charge this on the outgoing side, some on the incoming side. Check both brokers' fee schedules before initiating the transfer.",
    },
    {
      q: "Does a CHESS transfer reset my cost base for CGT?",
      a: "No. An in-specie CHESS transfer does not trigger a CGT event. Your original acquisition date and cost base are preserved. However, a sell-down and rebuy does trigger a CGT event and creates a new cost base at the rebuy price.",
    },
  ],
  super: [
    {
      q: "Will I lose my insurance when I switch super funds?",
      a: "You may. Insurance inside super often has no medical underwriting, meaning pre-existing conditions may be covered that wouldn't be accepted by a new insurer. When you switch funds, your old insurance stops and you must apply for new cover in the new fund, which may require underwriting. Check your current cover amounts before initiating any rollover.",
    },
    {
      q: "How long does a super rollover take?",
      a: "Most rollovers initiated via myGov complete within 3–5 business days. The ATO's SuperStream system facilitates the transfer between funds electronically.",
    },
    {
      q: "Can I roll over only part of my super?",
      a: "Yes. When using myGov's 'Find and transfer super' tool, you can choose to roll over the full balance (which will close the old account) or a partial amount. A partial rollover is useful if you want to retain insurance cover in your old fund while consolidating most of your balance.",
    },
    {
      q: "What happens to lost super when I switch?",
      a: "You should search for lost or ATO-held super before switching. Use the 'Find and transfer super' tool in myGov to locate any accounts with previous employers. The ATO estimates billions of dollars are held in lost or inactive accounts.",
    },
  ],
  savings: [
    {
      q: "What is an introductory savings rate?",
      a: "An introductory (honeymoon) rate is a higher interest rate offered for the first 3–5 months after opening an account. After the intro period ends, the rate drops to the ongoing (base) rate, which may be significantly lower. Always compare the ongoing rate, not just the intro rate, when evaluating a savings account.",
    },
    {
      q: "How do I move my direct debits to a new savings account?",
      a: "Log in to your current account's transaction history and list every recurring direct debit. For each biller, update your BSB and account number online or by contacting the biller directly. Some major banks offer an 'account switching service' that automatically redirects direct debits for up to 13 months.",
    },
    {
      q: "How long should I keep the old account open while switching?",
      a: "Keep your old account open and funded for at least one full calendar month after updating all direct debits. This catches any quarterly or annual payments you may have missed. Transfer the balance only after you're confident all recurring payments have moved.",
    },
  ],
};

// ─── Intro copy per type ──────────────────────────────────────────────────────

const INTROS: Record<string, string> = {
  broker:
    "Switching share brokers in Australia is straightforward if your holdings are CHESS-sponsored. The process involves an in-specie off-market CHESS transfer — your shares move without selling. Follow these steps to transfer your portfolio safely.",
  super:
    "Rolling over your superannuation is a permanent action. Before starting, check your existing insurance cover — you may lose it permanently when the old fund is closed. Once you've done that check, the rollover itself is quick via myGov.",
  savings:
    "Switching savings accounts takes more planning than opening a new account. The critical step is migrating every direct debit and payroll before closing the old account. Follow these steps to switch without missing a payment.",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SwitchTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  const checklist = getChecklist(type);
  if (!checklist) notFound();

  const typeInfo = SWITCH_TYPES.find((t) => t.type === type)!;
  const faqs = FAQS[type] ?? [];

  // Build HowTo JSON-LD using existing schema-markup builder
  const howToLd = howToJsonLd({
    slug: `switch-${type}`,
    h1: `How to Switch ${typeInfo.label} in Australia`,
    intro: INTROS[type] ?? "",
    steps: checklist.steps.map((s) => ({
      heading: s.heading,
      body: s.body,
    })),
    datePublished: "2026-05-25",
    dateModified: "2026-05-25",
  });

  // Patch the HowTo URL to point to /switch/[type] not /how-to/switch-[type]
  const patchedHowTo = {
    ...howToLd,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(`/switch/${type}`),
    },
    step: howToLd.step?.map(
      (
        s: { "@type": string; position: number; name: string; text: string; url: string },
        i: number,
      ) => ({
        ...s,
        url: absoluteUrl(`/switch/${type}#step-${i + 1}`),
      }),
    ),
  };

  const faqLd = faqJsonLd(faqs);

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Switch", url: absoluteUrl("/switch") },
    { name: typeInfo.label },
  ]);

  const isSuper = type === "super";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(patchedHowTo) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <div className="py-5 md:py-12">
        <div className="container-custom max-w-3xl mx-auto">
          {/* Breadcrumb */}
          <nav className="text-sm text-slate-500 mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-brand">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/switch" className="hover:text-brand">Switch</Link>
            <span className="mx-2">/</span>
            <span className="text-brand">{typeInfo.label}</span>
          </nav>

          {/* Hero */}
          <div className="bg-gradient-to-br from-violet-600 to-violet-800 rounded-2xl p-6 md:p-10 text-white mb-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_60%)]" />
            <div className="relative">
              <h1 className="text-2xl md:text-3xl font-extrabold mb-3">
                How to Switch {typeInfo.label}
              </h1>
              <p className="text-sm md:text-base text-violet-100 max-w-xl">
                {INTROS[type]}
              </p>
            </div>
          </div>

          {/* Super-specific insurance warning — ASIC RG 183 */}
          {isSuper && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 mb-6 flex gap-3">
              <span className="text-amber-500 text-xl shrink-0 mt-0.5">⚠️</span>
              <p className="text-sm text-amber-900 leading-relaxed">
                <strong>Check your insurance before switching super.</strong>{" "}
                {SUPER_WARNING}
              </p>
            </div>
          )}

          {/* Interactive cost estimate + checklist */}
          <SwitchTypeClient checklist={checklist} switchType={type} />

          {/* FAQ section */}
          {faqs.length > 0 && (
            <section className="mt-12">
              <h2 className="text-lg font-bold text-slate-900 mb-4">
                Frequently asked questions
              </h2>
              <div className="space-y-4">
                {faqs.map((f) => (
                  <details
                    key={f.q}
                    className="bg-white border border-slate-200 rounded-xl p-4 group"
                  >
                    <summary className="font-semibold text-sm text-slate-900 cursor-pointer list-none flex justify-between items-center gap-2">
                      {f.q}
                      <span className="text-slate-400 shrink-0 group-open:rotate-180 transition-transform">▾</span>
                    </summary>
                    <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                      {f.a}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          )}

          {/* Referral CTA */}
          <div className="mt-10 bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Compare {typeInfo.label}s side by side
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              See factual fee data for every provider before you switch.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={
                  type === "broker"
                    ? "/compare"
                    : type === "super"
                      ? "/super"
                      : "/savings"
                }
                className="inline-block px-5 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors"
              >
                Compare {typeInfo.label}s →
              </Link>
              <Link
                href="/find-advisor"
                className="inline-block px-5 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:border-violet-300 transition-colors"
              >
                Find a financial advisor
              </Link>
            </div>
            <p className="text-xs text-slate-400 mt-3">
              General information only — not financial advice or a personal recommendation.
            </p>
          </div>

          {/* Compliance */}
          <div className="mt-8">
            <ComplianceFooter variant={isSuper ? "default" : "default"} />
          </div>

          {/* General advice warning — always present */}
          <div className="mt-4 text-xs text-slate-400 leading-relaxed border-t border-slate-100 pt-4">
            {GENERAL_ADVICE_WARNING}
          </div>
        </div>
      </div>
    </>
  );
}
