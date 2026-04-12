import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/Icon";
import QuickAuditTool from "@/components/QuickAuditTool";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "How Much Am I Paying? — Quick Broker Fee Audit",
  description:
    "Free 30-second audit. Find out how much you're paying in broker fees and how much you could save by switching. Compares all major Australian brokers instantly.",
  openGraph: {
    title: "How Much Am I Paying in Broker Fees?",
    description:
      "Enter your broker and trading frequency. Get instant savings analysis across every major Australian platform.",
    url: "/quick-audit",
  },
  alternates: { canonical: "/quick-audit" },
};

function jsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Broker Fee Quick Audit",
    description:
      "Free instant audit of your annual broker fees. Compare your current broker against all Australian platforms and find the cheapest alternative.",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: absoluteUrl("/quick-audit"),
    offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
  };
}

export default async function QuickAuditPage() {
  const supabase = await createClient();

  const { data: brokers } = await supabase
    .from("brokers")
    .select("*")
    .eq("status", "active")
    .eq("platform_type", "share_broker")
    .order("rating", { ascending: false });

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Calculators", url: absoluteUrl("/calculators") },
    { name: "Quick Audit" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <div className="py-5 md:py-12">
        <div className="container-custom max-w-3xl">
          {/* Breadcrumbs */}
          <nav className="text-xs md:text-sm text-slate-500 mb-3">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="mx-1.5">/</span>
            <Link href="/calculators" className="hover:text-slate-900">Calculators</Link>
            <span className="mx-1.5">/</span>
            <span className="text-slate-700">Quick Audit</span>
          </nav>

          {/* Hero */}
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 md:p-8 text-white mb-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_60%)]" />
            <div className="relative">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                <Icon name="search" size={24} className="text-white" />
              </div>
              <h1 className="text-xl md:text-3xl font-extrabold mb-2">How much are you paying in broker fees?</h1>
              <p className="text-sm md:text-base text-amber-50">
                30-second audit. Enter your current broker and trading details to instantly see how much you&apos;re paying — and how much you could save by switching.
              </p>
            </div>
          </div>

          {/* The tool */}
          <QuickAuditTool brokers={(brokers as Broker[]) || []} />

          {/* SEO content */}
          <div className="mt-8 md:mt-12 space-y-4 text-sm text-slate-600 leading-relaxed">
            <h2 className="text-lg font-bold text-slate-900">Why a fee audit matters</h2>
            <p>
              The difference in annual fees between the cheapest and most expensive Australian brokers can exceed
              $2,000 per year for active traders. Most investors stick with their first broker out of inertia,
              even when better-priced alternatives exist.
            </p>
            <p>
              Our quick audit compares your current annual cost against every major Australian platform — using
              real fee data updated daily. The analysis includes ASX brokerage, US share fees, FX conversion
              rates, and inactivity charges.
            </p>
            <h3 className="text-base font-bold text-slate-900">What this audit covers</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>ASX brokerage:</strong> Per-trade cost on Australian shares</li>
              <li><strong>US share fees:</strong> Brokerage on international trades</li>
              <li><strong>FX conversion:</strong> The hidden cost of buying US stocks (often the biggest fee)</li>
              <li><strong>Inactivity fees:</strong> Monthly or annual fees if you don&apos;t trade enough</li>
            </ul>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
              <p className="text-sm font-bold text-blue-800 mb-1">Want a more detailed analysis?</p>
              <p className="text-xs text-blue-600 mb-2">
                Try our <Link href="/switching-calculator" className="underline">Switching Calculator</Link> for a
                full breakdown with personalised PDF report, or our{" "}
                <Link href="/portfolio-xray" className="underline">Portfolio X-Ray</Link> if you want to analyse
                your actual holdings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
