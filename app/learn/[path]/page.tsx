import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { LEARNING_PATHS, getLearningPath, sumEstimatedMinutes } from "@/lib/learning-paths";
import { absoluteUrl, breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { faqJsonLd } from "@/lib/schema-markup";
import LearningPathClient from "./LearningPathClient";

const PATH_FAQS: Record<string, Array<{ q: string; a: string }>> = {
  "new-investor": [
    {
      q: "How much money do I need to start investing in Australia?",
      a: "Most Australian brokers have no minimum account balance, and many allow you to buy ETFs and shares for as little as $50–$500. Some platforms (Pearler, Superhero) have $100–$500 minimums per trade. You don't need a large sum to start — the most important step is opening a brokerage account and making your first investment, however small. Dollar-cost averaging (investing a fixed amount regularly) is a practical strategy for investors starting with limited capital.",
    },
    {
      q: "What is an ETF and why do beginners use them?",
      a: "An ETF (Exchange-Traded Fund) is a basket of securities — such as shares in the ASX 200 or S&P 500 — that trades on a stock exchange like a single share. Beginners favour ETFs because they provide instant diversification (owning hundreds of companies through one purchase), have low management fees (often 0.04%–0.20% per year), and require no stock-picking skill. Examples include VAS (Vanguard Australian Shares), VGS (Vanguard International Shares), and A200 (BetaShares Australia 200). Most financial educators recommend broad-market index ETFs as the default starting point.",
    },
    {
      q: "What is CHESS sponsorship and do I need it as a beginner?",
      a: "CHESS (Clearing House Electronic Subregister System) is the ASX's share registry. A CHESS-sponsored broker registers your shares directly in your name (you get a HIN — Holder Identification Number), so they're yours even if the broker collapses. Non-CHESS (custodial) brokers hold shares in a pooled account on your behalf. As a beginner investing for the long term, CHESS sponsorship offers an extra layer of legal protection — CommSec, SelfWealth, and Pearler are CHESS-sponsored. Stake, moomoo, and Tiger Brokers use custodial structures (cheaper but less protection in insolvency).",
    },
    {
      q: "Is this learning path financial advice?",
      a: "No. This learning path provides general investing education for Australian investors and does not constitute personal financial advice. It does not consider your individual financial situation, objectives, or risk tolerance. Before acting on any information in this path, consider whether it is appropriate for your circumstances. If you are unsure, speak to an AFSL-licensed financial adviser — you can find one at Invest.com.au/find-advisor.",
    },
  ],
  "choosing-a-broker": [
    {
      q: "What should I look for when choosing a broker in Australia?",
      a: "The key factors are: (1) Brokerage fees — flat fee (e.g., $9.50/trade at SelfWealth) vs percentage (e.g., 0.12% at CommSec). For small trades, flat fees are cheaper; for large trades, percentage fees can win. (2) CHESS vs custodial — CHESS-sponsored accounts register shares in your name, providing stronger insolvency protection. (3) Platform quality — mobile app, charting tools, international market access, and auto-invest features. (4) Inactivity fees — some platforms charge if you don't trade for 6–12 months. (5) ASIC regulation — all legitimate Australian brokers must hold or operate under an AFSL.",
    },
    {
      q: "What is the difference between CommSec, SelfWealth, and Stake?",
      a: "CommSec (CBA-owned) is the most established ASX broker — $19.95 minimum brokerage, CHESS-sponsored, strong research tools, but expensive for frequent traders. SelfWealth charges a flat $9.50 per trade regardless of size, is CHESS-sponsored, and suits cost-conscious ASX investors. Stake focuses on US shares (NASDAQ, NYSE) at USD$3 flat brokerage with a clean mobile interface, uses a custodial structure, and has a free tier. For ASX-focused investing, SelfWealth or Pearler tend to offer the best fee-to-feature ratio; for US shares, Stake or Interactive Brokers are popular.",
    },
    {
      q: "Do I need to pay tax on my brokerage account in Australia?",
      a: "Yes. Investment income (dividends and capital gains) is taxable in Australia. Dividends are included in your assessable income in the year they are received; franking credits reduce the tax liability. Capital gains tax (CGT) applies when you sell shares — if held for more than 12 months, you may be eligible for the 50% CGT discount. Your broker provides a tax report (annual tax summary) that your accountant or H&R Block can use. The ATO also receives share sale data from brokers via third-party reporting.",
    },
    {
      q: "How long does it take to open a brokerage account?",
      a: "Most Australian online brokers complete identity verification (ID check using your drivers licence or passport) digitally in under 10 minutes. Account approval is typically instant for digital ID checks. Some brokers (CommSec, Westpac) may take 1–2 business days if manual review is required. You can fund your account immediately via BPAY, POLi, or bank transfer — though bank transfers typically take 1–2 business days to clear before you can trade.",
    },
  ],
  "retirement-and-super": [
    {
      q: "What is the superannuation guarantee rate for 2025–26?",
      a: "The Superannuation Guarantee (SG) rate is 11.5% for FY2025–26. It rises to 12% from 1 July 2026 — and stays at 12% permanently. Your employer must contribute this percentage of your ordinary time earnings to your nominated super fund. Concessional contributions (including employer SG and salary sacrifice) are capped at $30,000 per year for FY2025–26; contributions above this cap are taxed at your marginal rate.",
    },
    {
      q: "When can I access my superannuation?",
      a: "Most Australians can access their super when they reach their preservation age (between 55 and 60, depending on birth year) and retire, or reach age 65 regardless of employment status. Early access is only available in very limited circumstances: severe financial hardship (specific ATO rules apply), terminal illness, permanent incapacity, or compassionate grounds approved by the ATO. The First Home Super Saver Scheme (FHSSS) also allows up to $50,000 in voluntary contributions to be released for a first home purchase.",
    },
    {
      q: "What is an SMSF and is it right for me?",
      a: "A Self-Managed Super Fund (SMSF) is a private superannuation fund you control yourself — you choose the investments, manage compliance, and file annual returns. SMSFs are generally cost-effective only when the balance exceeds $300,000–$500,000 (ASIC's rough threshold), because the fixed operating costs (SMSF auditor, accountant, ATO annual return fee) become a smaller percentage of a larger balance. SMSFs offer flexibility (direct property, direct shares, collectibles under strict rules) but carry significant trustee obligations — trustees are personally liable for compliance breaches.",
    },
    {
      q: "What is the difference between a retail and industry super fund?",
      a: "Industry super funds are run for the benefit of members — profits are returned to members as lower fees or better returns. They originated in specific industries (e.g., Australian Super from construction, Hostplus from hospitality) but are now open to most Australians. Retail super funds are run by banks or wealth management companies for shareholder profit — they typically charge higher fees. The Productivity Commission found industry funds outperformed retail funds by ~1.9% per year over 12 years on a risk-adjusted basis. APRA's MySuper product comparison tool (YourSuper) lets you compare both.",
    },
  ],
  "tax-smart-investing": [
    {
      q: "What is the CGT discount and how do I qualify?",
      a: "The capital gains tax (CGT) discount allows Australian residents to reduce a capital gain on an asset held for more than 12 months by 50%. For example, if you bought shares for $10,000 and sold them for $16,000 after 18 months, your taxable capital gain is ($16,000 − $10,000) × 50% = $3,000, not $6,000. The discount applies to individuals and trusts but not companies. The 12-month holding period starts from the date of purchase (settlement date), not the date of the sale agreement.",
    },
    {
      q: "What are franking credits and how do they reduce my tax?",
      a: "Franking credits (also called imputation credits) represent the company tax (30%, or 25% for small companies) already paid on a dividend before it reaches you. When you receive a franked dividend, you declare the grossed-up amount (dividend + franking credit) as income but then claim the franking credit as an offset against your tax liability. If the franking credit exceeds your tax liability, you can receive the excess as a cash refund from the ATO. Example: a $700 fully-franked dividend from a company that paid 30% tax comes with a $300 franking credit — you declare $1,000 as income and claim $300 back.",
    },
    {
      q: "What is negative gearing in Australia?",
      a: "Negative gearing occurs when the expenses of owning an investment (interest on the investment loan, management fees, depreciation, maintenance) exceed the income it generates. The resulting loss can be offset against your other income (salary, business income) to reduce your total taxable income. It is most commonly used in property investing and some share investing (margin loans). The tax benefit of negative gearing is roughly equal to your marginal tax rate × the annual loss — highest for investors in the 47% tax bracket. Capital growth is typically required to make negative gearing profitable long-term.",
    },
    {
      q: "What is tax-loss harvesting and is it worth doing in Australia?",
      a: "Tax-loss harvesting is deliberately selling investments that have fallen in value to realise a capital loss, which can then offset capital gains elsewhere in your portfolio (or be carried forward to future years). In Australia, capital losses can only be offset against capital gains — not against ordinary income like salary. It's most valuable when you have realised gains to shelter. Watch for the superficial loss rules: if you reacquire the same or substantially identical investment within 30 days (before or after the sale), the ATO may disallow the loss. Discuss with your accountant before implementing.",
    },
  ],
  "foreign-investor": [
    {
      q: "Can foreigners invest in Australian shares?",
      a: "Yes. Foreign investors can generally buy shares listed on the ASX without FIRB approval — the Foreign Investment Review Board (FIRB) approval threshold for publicly listed companies is typically $310 million for most countries, or $0 for sensitive sectors (media, telecommunications, critical infrastructure). You'll need an Australian broker that accepts overseas residents — Interactive Brokers, CMC Markets, and some specialist brokers do. You'll also need an Australian Tax File Number (TFN) or a tax treaty arrangement to avoid the default 47% withholding on unfranked dividends.",
    },
    {
      q: "What is FIRB and when do I need approval?",
      a: "FIRB (Foreign Investment Review Board) administers Australia's foreign investment rules under the Foreign Acquisitions and Takeovers Act 1975. Foreign persons (including foreign companies and temporary residents) generally need FIRB approval to: purchase residential real estate (threshold: $0 for non-residents — all residential purchases require approval), acquire a stake of 20%+ in an Australian business above the relevant monetary threshold, or acquire agricultural land above $15 million. ASX share purchases are generally exempt from FIRB approval unless the stake triggers the significant interest thresholds above.",
    },
    {
      q: "Do I pay tax in Australia if I invest from overseas?",
      a: "Australian-sourced investment income (dividends, interest, rent) is subject to Australian withholding tax even for non-residents. The standard withholding rate on unfranked dividends is 30%, reduced by Double Taxation Agreements (DTAs) — the AU–US DTA reduces it to 15%, the AU–UK DTA to 15%, the AU–Singapore DTA to 15%. Fully franked dividends carry no Australian withholding tax (the franking credit covers the Australian tax). Capital gains on ASX shares sold by non-residents are not taxable in Australia (they are taxed in your home country). Check your country's DTA with Australia and consult a cross-border tax adviser.",
    },
    {
      q: "What accounts can foreign investors use to invest in Australia?",
      a: "Foreign investors typically use a standard brokerage account with an Australian broker that accepts overseas clients — a bank account is not strictly required but makes transfers easier. Interactive Brokers (IBKR) is the most widely used platform for non-residents investing in ASX-listed securities. You'll need to provide proof of identity (passport), proof of address (utility bill or bank statement), and comply with Anti-Money Laundering (AML) checks. Some brokers also require a Tax Identification Number from your home country. Superannuation accounts are only available to individuals who have worked in Australia.",
    },
  ],
};

export const revalidate = 86400;

// ─── Static params ────────────────────────────────────────────────────────────

export function generateStaticParams() {
  return LEARNING_PATHS.map((p) => ({ path: p.slug }));
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ path: string }>;
}): Promise<Metadata> {
  const { path: pathSlug } = await params;
  const learningPath = getLearningPath(pathSlug);
  if (!learningPath) return { robots: { index: false } };

  const totalMins = sumEstimatedMinutes(learningPath);
  const hours = (totalMins / 60).toFixed(1);

  return {
    title: `${learningPath.title} | Learning Path ${CURRENT_YEAR} | Invest.com.au`,
    description: `${learningPath.description} ${learningPath.steps.length} steps · ~${hours}h · ${learningPath.audience}.`,
    alternates: { canonical: `${SITE_URL}/learn/${learningPath.slug}` },
    openGraph: {
      title: learningPath.title,
      description: learningPath.description,
      url: `${SITE_URL}/learn/${learningPath.slug}`,
      type: "website",
      images: [{ url: `/api/og?title=${encodeURIComponent(learningPath.title)}&sub=${encodeURIComponent("Learning Path · " + learningPath.steps.length + " Steps · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image" },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LearningPathPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path: pathSlug } = await params;
  const learningPath = getLearningPath(pathSlug);
  if (!learningPath) notFound();

  const totalMins = sumEstimatedMinutes(learningPath);
  const hoursDisplay =
    totalMins < 60
      ? `${totalMins} min`
      : `${(totalMins / 60).toFixed(1)} hrs`;

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Learning Paths", url: absoluteUrl("/learn") },
    { name: learningPath.title },
  ]);

  const pathFaqs = PATH_FAQS[learningPath.slug] ?? [];
  const pathFaqLd = pathFaqs.length > 0 ? faqJsonLd(pathFaqs) : null;

  // Course JSON-LD (schema.org)
  const courseJsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: learningPath.title,
    description: learningPath.description,
    url: absoluteUrl(`/learn/${learningPath.slug}`),
    provider: {
      "@type": "Organization",
      name: "Invest.com.au",
      url: absoluteUrl("/"),
    },
    audience: {
      "@type": "EducationalAudience",
      educationalRole: "student",
      audienceType: learningPath.audience,
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: `PT${totalMins}M`,
    },
    numberOfCredits: learningPath.steps.length,
  };

  // ItemList JSON-LD for steps
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${learningPath.title} — steps`,
    numberOfItems: learningPath.steps.length,
    itemListElement: learningPath.steps.map((step, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: step.title,
      url: absoluteUrl(
        step.kind === "article"
          ? `/article/${step.slug}`
          : step.kind === "question"
            ? `/questions/${step.slug}`
            : step.kind === "glossary"
              ? `/glossary/${step.slug}`
              : step.slug
      ),
    })),
  };

  const STEP_LABEL: Record<string, string> = {
    article: "Article",
    question: "Q&A",
    glossary: "Glossary",
    calculator: "Calculator",
    page: "Guide",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      {pathFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(pathFaqLd) }}
        />
      )}

      <div className="bg-white min-h-screen">
        {/* Header */}
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom max-w-4xl">
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-xs text-slate-400 mb-5"
            >
              <Link href="/" className="hover:text-white transition-colors">
                Home
              </Link>
              <span className="text-slate-600">/</span>
              <Link
                href="/learn"
                className="hover:text-white transition-colors"
              >
                Learning Paths
              </Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium truncate">
                {learningPath.title}
              </span>
            </nav>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-700 text-slate-300 font-medium">
                {learningPath.audience}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-700 text-slate-300 font-medium">
                {learningPath.steps.length} steps
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-700 text-slate-300 font-medium">
                ~{hoursDisplay}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3">
              {learningPath.title}
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-2xl">
              {learningPath.description}
            </p>
          </div>
        </section>

        {/* Main content */}
        <section className="py-10 md:py-14">
          <div className="container-custom max-w-4xl">
            {/* General advice warning */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mb-8 text-xs text-amber-800 leading-relaxed">
              {GENERAL_ADVICE_WARNING}
            </div>

            {/* Client component — progress tracking */}
            <LearningPathClient path={learningPath} />

            {/* Step quick-reference table (SR + non-JS fallback) */}
            <div className="mt-10 sr-only" aria-hidden="true">
              <h2 className="sr-only">Steps overview</h2>
              <ol>
                {learningPath.steps.map((step, i) => (
                  <li key={i}>
                    {i + 1}. {step.title} ({STEP_LABEL[step.kind]} · ~{step.estimatedMinutes} min)
                  </li>
                ))}
              </ol>
            </div>

            {/* FAQ accordion */}
            {pathFaqs.length > 0 && (
              <div className="mt-12 border-t border-slate-200 pt-8">
                <h2 className="text-base font-bold text-slate-900 mb-3">Common questions</h2>
                <div className="divide-y divide-slate-100">
                  {pathFaqs.map(({ q, a }) => (
                    <details key={q} className="group py-3">
                      <summary className="flex items-center justify-between cursor-pointer list-none text-slate-800 font-medium text-sm leading-snug gap-4">
                        {q}
                        <svg
                          className="w-4 h-4 shrink-0 text-slate-500 group-open:rotate-180 transition-transform"
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <p className="mt-2 text-sm text-slate-600 leading-relaxed">{a}</p>
                    </details>
                  ))}
                </div>
              </div>
            )}

            {/* CTA — back to all paths */}
            <div className="mt-12 pt-8 border-t border-slate-100 flex items-center justify-between gap-4 flex-wrap">
              <Link
                href="/learn"
                className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                All learning paths
              </Link>

              <Link
                href="/brokers"
                className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-900 transition-colors"
              >
                Compare brokers
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
