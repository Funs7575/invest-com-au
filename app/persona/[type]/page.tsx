import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { personaFromType, type PersonaType } from "@/lib/persona";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";

const SLUG_TO_TYPE: Record<string, PersonaType> = {
  "accumulator":       "Accumulator",
  "fire-chaser":       "FIRE-Chaser",
  "wealth-protector":  "Wealth-Protector",
  "cautious-builder":  "Cautious-Builder",
  "smsf-architect":    "SMSF-Architect",
};

const PERSONA_TRAITS: Record<PersonaType, string[]> = {
  Accumulator: [
    "Regular dollar-cost averaging into diversified index funds",
    "Long time horizon — comfortable riding market cycles",
    "Low-cost ASX + global ETFs with dividend reinvestment",
    "Minimal trading; lets compounding do the work",
  ],
  "FIRE-Chaser": [
    "High savings rate — 30–60%+ of income invested",
    "Index funds + high-interest savings for the short-term buffer",
    "Ruthlessly minimises fees, switching costs, and tax drag",
    "Tracks net worth monthly against a target FI number",
  ],
  "Wealth-Protector": [
    "Blue-chip ASX 200 stocks and defensive bonds as core holdings",
    "Diversified across asset classes to reduce sequence-of-returns risk",
    "Capital preservation as the primary objective over growth",
    "Structured estate planning and income-drawing strategy",
  ],
  "Cautious-Builder": [
    "Starting with small, regular amounts to build the habit",
    "Prefers low-volatility, broadly diversified products",
    "Focus on understanding fees and tax before complexity",
    "Savings account or broad ETF as the first stepping stone",
  ],
  "SMSF-Architect": [
    "Direct ASX holdings, property, or alternatives inside super",
    "Tax-efficient compounding over a long accumulation phase",
    "Full trustee control over investment strategy and drawdown",
    "Works with an SMSF accountant for compliance and audit",
  ],
};

export function generateStaticParams() {
  return Object.keys(SLUG_TO_TYPE).map((type) => ({ type }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>;
}): Promise<Metadata> {
  const { type } = await params;
  const personaType = SLUG_TO_TYPE[type];
  if (!personaType) return { robots: { index: false } };
  const result = personaFromType(personaType);
  const ogUrl = absoluteUrl(
    `/api/og?type=persona&persona=${encodeURIComponent(personaType)}&title=${encodeURIComponent(personaType)}&subtitle=${encodeURIComponent(result.tagline)}`,
  );
  return {
    title: `${personaType} Investor Persona | Invest.com.au`,
    description: result.description,
    openGraph: {
      title: `${result.emoji} ${personaType} — Investor Persona`,
      description: result.tagline,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${result.emoji} ${personaType} — Investor Persona`,
      description: result.tagline,
      images: [ogUrl],
    },
  };
}

export default async function PersonaTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  const personaType = SLUG_TO_TYPE[type];
  if (!personaType) notFound();
  const result = personaFromType(personaType);
  const traits = PERSONA_TRAITS[personaType];

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Invest.com.au", url: absoluteUrl("/") },
    { name: "Investor Personas" },
    { name: result.persona },
  ]);

  return (
    <>
    <JsonLd data={breadcrumbLd} />
    <div style={{ background: "var(--color-ink-50)", minHeight: "100vh", paddingTop: 48, paddingBottom: 72 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: `${personaType} Investor Persona`,
            description: result.description,
            url: absoluteUrl(`/persona/${type}`),
          }),
        }}
      />
      <div className="container-custom" style={{ maxWidth: 680 }}>

        <nav aria-label="Breadcrumb" style={{ fontSize: 12, color: "var(--color-ink-400)", marginBottom: 28 }}>
          <Link href="/" style={{ color: "var(--color-ink-400)", textDecoration: "none" }}>Invest.com.au</Link>
          <span style={{ margin: "0 6px" }}>/</span>
          <span style={{ color: "var(--color-ink-600)" }}>Investor Personas</span>
        </nav>

        {/* Hero */}
        <div
          className="iv2-card"
          style={{
            padding: "36px 32px",
            marginBottom: 20,
            background: result.bg,
            border: `1.5px solid ${result.border}`,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>{result.emoji}</div>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: result.color, marginBottom: 8 }}>
            Investor Persona
          </p>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: "var(--color-ink-900)", marginBottom: 10 }}>
            {result.persona}
          </h1>
          <p style={{ fontSize: 15, color: "var(--color-ink-600)", lineHeight: 1.6, maxWidth: 480, margin: "0 auto 24px" }}>
            {result.description}
          </p>
          <Link
            href="/get-matched"
            style={{
              display: "inline-block",
              padding: "10px 24px",
              background: result.color,
              color: "white",
              fontWeight: 700,
              fontSize: 14,
              borderRadius: 10,
              textDecoration: "none",
            }}
          >
            Discover your persona →
          </Link>
        </div>

        {/* Key traits */}
        <div className="iv2-card" style={{ padding: "24px 28px", marginBottom: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink-900)", marginBottom: 14 }}>
            Key traits of this persona
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {traits.map((trait) => (
              <li key={trait} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "var(--color-ink-600)", lineHeight: 1.5 }}>
                <span style={{ color: result.color, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                {trait}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA strip */}
        <div className="iv2-card" style={{ padding: "20px 24px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink-900)", marginBottom: 2 }}>
              Not sure this is you?
            </p>
            <p style={{ fontSize: 12, color: "var(--color-ink-500)" }}>
              Take the 2-minute quiz to find your persona.
            </p>
          </div>
          <Link
            href="/get-matched"
            style={{
              padding: "9px 20px",
              background: "var(--color-ink-900)",
              color: "white",
              fontWeight: 700,
              fontSize: 13,
              borderRadius: 9,
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            Take the quiz
          </Link>
        </div>

        <p style={{ fontSize: 11, color: "var(--color-ink-400)", lineHeight: 1.5 }}>
          {GENERAL_ADVICE_WARNING} Investor personas are a factual summary of self-reported preferences — not a recommendation or personal financial advice.
        </p>
      </div>
    </div>
    </>
  );
}
