import ToolsClient from "./ToolsClient";
import JsonLd from "@/components/JsonLd";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";

export const metadata = {
  title: "Best Financial Tools & Apps in Australia (2026)",
  description:
    "Discover the best fintech tools and apps for Australian investors and savers. Compare budgeting apps, investing platforms, tax software, super tools, and more.",
  openGraph: {
    title: "Best Financial Tools & Apps in Australia (2026)",
    description:
      "Compare the best fintech tools for budgeting, investing, tax, super, banking, and crypto in Australia.",
    images: [
      {
        url: "/api/og?title=Best+Financial+Tools&subtitle=Apps+%26+Fintech+for+Australians&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/tools" },
};

export const revalidate = 3600;

const TOOLS_FAQS = [
  {
    q: "What types of financial tools does Invest.com.au offer?",
    a: "Invest.com.au offers free financial tools across six categories: (1) Investing tools — Portfolio X-Ray (diversification and fee analysis), Investor Health Score, Platform Fee Benchmarking Dashboard, and broker comparison tools; (2) Tax tools — CGT calculator, tax optimisation engine, franking credits calculator, and investment income tax estimator; (3) Super tools — super contributions calculator, SMSF setup guide, and salary sacrifice modeller; (4) Property tools — property vs shares calculator, mortgage calculator, and negative gearing calculator; (5) Portfolio calculators — compound interest, lump-sum investing, and retirement savings projections; and (6) Cost comparison tools — brokerage fee simulator, TCO calculator, and US stock costs calculator.",
  },
  {
    q: "Are all the financial tools on this page free?",
    a: "Yes. All tools on Invest.com.au are free for all visitors — no account registration is required to use any tool. Some tools offer an optional save feature (e.g. Portfolio X-Ray) that requires a free account to persist data across sessions. There are no paywalled tool tiers — Pro subscribers get early access to new tools, but all tools are publicly available once released.",
  },
  {
    q: "Do the calculators give personal financial advice?",
    a: "No. All calculators and tools provide general financial information only. They use publicly available data (ATO tax rates, SG rates, market averages) for illustrative modelling purposes. Results do not constitute personal financial advice and do not take into account your individual objectives, financial situation, or needs. Always consult an AFSL-authorised financial adviser before making investment or tax decisions.",
  },
  {
    q: "How do I know which tool to start with?",
    a: "If you are new to investing, start with the 60-second quiz (/quiz) to get a personalised broker recommendation. If you already invest and want to check how your platform stacks up on fees, use the Platform Fee Benchmarking Dashboard. If you want to analyse your existing portfolio, use Portfolio X-Ray. For tax planning before EOFY, use the Tax Optimisation Engine or CGT Calculator. For long-term wealth projections, the Compound Interest Calculator or Retirement Calculator are good entry points.",
  },
];

const toolsFaqLd = faqJsonLd(TOOLS_FAQS);

export default function ToolsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Financial Tools & Apps" },
  ]);
  return (
    <>
      <JsonLd data={breadcrumb} testId="tools-jsonld" />
      {toolsFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(toolsFaqLd) }}
        />
      )}
      <ToolsClient />
      <div className="border-t border-slate-200 bg-white">
        <div className="container-custom max-w-4xl py-8 md:py-10">
          <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
          <div className="space-y-3">
            {TOOLS_FAQS.map((faq) => (
              <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                  {faq.q}
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform">▾</span>
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
