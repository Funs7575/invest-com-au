import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import Icon from "@/components/Icon";
import EmbedBuilder from "./EmbedBuilder";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Embed Broker Comparison Widget — ${SITE_NAME}`,
  description: `Add a free, self-contained broker comparison widget to your website. Multiple styles, dark/light themes, and always up-to-date data from ${SITE_NAME}.`,
  openGraph: {
    title: "Embed Broker Comparison Widget",
    description:
      "Drop a live broker comparison table onto any website with a single script tag.",
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/embed" },
};

const SNIPPETS = [
  {
    title: "Default — Table (Top 5)",
    description: "Shows a sortable table of the top 5 rated brokers with ASX/US fees and ratings.",
    code: `<script src="https://invest.com.au/api/widget"></script>`,
  },
  {
    title: "Specific Brokers",
    description: "Compare only the brokers you choose, in order.",
    code: `<script src="https://invest.com.au/api/widget?brokers=stake,commsec,cmc-markets"></script>`,
  },
  {
    title: "Compact Cards",
    description: "A narrower card layout ideal for sidebars and narrow columns.",
    code: `<script src="https://invest.com.au/api/widget?type=compact&limit=3"></script>`,
  },
  {
    title: "Dark Theme",
    description: "Matches dark-mode sites. Works with both table and compact layouts.",
    code: `<script src="https://invest.com.au/api/widget?theme=dark&limit=5"></script>`,
  },
];

export default function EmbedPage() {
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Embed Widget" },
  ]);

  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      {/* Hero */}
      <section className="border-b border-slate-100 py-8 md:py-14">
        <div className="container-custom max-w-4xl">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Embed Widget</span>
          </nav>

          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-full text-xs font-semibold text-emerald-700 mb-4">
            <Icon name="code" size={14} />
            Free to use
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight tracking-tight text-slate-900 mb-3">
            Embed a Broker Comparison Widget
          </h1>
          <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-2xl">
            Add a live, self-contained comparison table to your blog, forum, or financial website.
            The widget renders inside a Shadow DOM so it never conflicts with your styles.
            Data stays fresh automatically.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="container-custom max-w-4xl py-8 md:py-12">
        <h2 className="text-lg md:text-xl font-extrabold text-slate-900 mb-6">How It Works</h2>
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          {[
            { icon: "code", title: "1. Copy snippet", desc: "Grab the script tag below or use the builder." },
            { icon: "layout", title: "2. Paste anywhere", desc: "Drop it into your HTML. No dependencies needed." },
            { icon: "refresh-cw", title: "3. Always current", desc: "Fees and ratings update automatically from our database." },
          ].map((step) => (
            <div key={step.title} className="bg-white border border-slate-200 rounded-xl p-5">
              <Icon name={step.icon} size={20} className="text-emerald-600 mb-2" />
              <h3 className="font-bold text-sm text-slate-900 mb-1">{step.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* Snippet Examples */}
        <h2 className="text-lg md:text-xl font-extrabold text-slate-900 mb-4">Embed Examples</h2>
        <div className="space-y-6 mb-12">
          {SNIPPETS.map((snippet) => (
            <div key={snippet.title} className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                <h3 className="font-bold text-sm text-slate-900">{snippet.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{snippet.description}</p>
              </div>
              <div className="px-5 py-4 bg-slate-900">
                <code className="text-xs text-emerald-400 font-mono break-all select-all">{snippet.code}</code>
              </div>
            </div>
          ))}
        </div>

        {/* Query Params Reference */}
        <h2 className="text-lg md:text-xl font-extrabold text-slate-900 mb-4">Customisation Options</h2>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-12">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left">
                <th className="px-5 py-3 font-bold text-slate-700">Parameter</th>
                <th className="px-5 py-3 font-bold text-slate-700">Values</th>
                <th className="px-5 py-3 font-bold text-slate-700 hidden sm:table-cell">Default</th>
                <th className="px-5 py-3 font-bold text-slate-700">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                { param: "brokers", values: "slug,slug,...", def: "(all)", desc: "Comma-separated broker slugs to include." },
                { param: "type", values: "table | compact", def: "table", desc: "Widget layout style." },
                { param: "theme", values: "light | dark", def: "light", desc: "Colour theme." },
                { param: "limit", values: "1-10", def: "5", desc: "Maximum brokers displayed." },
              ].map((row) => (
                <tr key={row.param}>
                  <td className="px-5 py-3 font-mono text-xs text-emerald-700">{row.param}</td>
                  <td className="px-5 py-3 text-xs text-slate-600">{row.values}</td>
                  <td className="px-5 py-3 text-xs text-slate-400 hidden sm:table-cell">{row.def}</td>
                  <td className="px-5 py-3 text-xs text-slate-600">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Interactive Builder */}
        <h2 className="text-lg md:text-xl font-extrabold text-slate-900 mb-4">Get Your Embed Code</h2>
        <EmbedBuilder />
      </section>
    </div>
  );
}
