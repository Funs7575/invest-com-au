import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import Icon from "@/components/Icon";
import EmbedBuilder from "./EmbedBuilder";
import { SUITE_WIDGET_CATALOGUE } from "@/lib/widget/types";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Embed Financial Widgets — ${SITE_NAME}`,
  description: `Embed free broker comparison tables, fee calculators, and advisor directory widgets. Always up-to-date data from ${SITE_NAME}.`,
  openGraph: {
    title: "Embed Financial Widgets",
    description:
      "Drop live broker comparison, fee calculator, advisor directory, fee index, or health-score widgets onto any website with a single script tag.",
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/embed" },
};

// ─── Static snippet sets (used in the documentation section) ─────────────────

const BROKER_SNIPPETS = [
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
  {
    title: "With Partner Attribution",
    description: "Append ?ref= to carry your partner ID through to invest.com.au for attribution.",
    code: `<script src="https://invest.com.au/api/widget?ref=yourpartnerId"></script>`,
  },
];

const CALC_SNIPPETS = [
  {
    title: "Default — ASX Fee Calculator",
    description: "Interactive brokerage fee comparison for ASX trades — visitors can adjust the trade amount.",
    code: `<script src="https://invest.com.au/api/widget/calculator"></script>`,
  },
  {
    title: "US Shares (with FX cost)",
    description: "Shows the true per-trade cost for US shares including FX margin.",
    code: `<script src="https://invest.com.au/api/widget/calculator?market=us"></script>`,
  },
  {
    title: "Large Trade ($25k default)",
    description: "Pre-fills $25,000 to show where percentage-based brokerage stings.",
    code: `<script src="https://invest.com.au/api/widget/calculator?amount=25000"></script>`,
  },
  {
    title: "Dark Theme Calculator",
    description: "Interactive fee calculator styled for dark-mode sites.",
    code: `<script src="https://invest.com.au/api/widget/calculator?theme=dark"></script>`,
  },
];

const ADVISOR_SNIPPETS = [
  {
    title: "Default — All Advisors",
    description: "Top-rated financial advisors across Australia.",
    code: `<script src="https://invest.com.au/api/widget/advisors"></script>`,
  },
  {
    title: "Financial Planners in NSW",
    description: "Filtered by type and state — ideal for regional content.",
    code: `<script src="https://invest.com.au/api/widget/advisors?type=financial-planner&state=NSW"></script>`,
  },
  {
    title: "Dark Theme",
    description: "Advisor cards styled for dark-mode sites.",
    code: `<script src="https://invest.com.au/api/widget/advisors?theme=dark&limit=3"></script>`,
  },
  {
    title: "With Partner Attribution",
    description: "Thread your partner ID through to invest.com.au profile links.",
    code: `<script src="https://invest.com.au/api/widget/advisors?ref=yourpartnerId"></script>`,
  },
];

const FEE_INDEX_SNIPPETS = [
  {
    title: "Default — ASX Fee Index",
    description: "All active brokers sorted by ASX per-trade fee, cheapest first.",
    code: `<script src="https://invest.com.au/api/widget/fee-index"></script>`,
  },
  {
    title: "US Share Fee Index",
    description: "Sorted by US share fee, cheapest first.",
    code: `<script src="https://invest.com.au/api/widget/fee-index?market=us&sort=us_fee"></script>`,
  },
  {
    title: "Top-Rated, Limited to 5",
    description: "Sorted by editorial rating rather than fee.",
    code: `<script src="https://invest.com.au/api/widget/fee-index?sort=rating&limit=5"></script>`,
  },
  {
    title: "Dark Theme",
    description: "Fee index table styled for dark-mode sites.",
    code: `<script src="https://invest.com.au/api/widget/fee-index?theme=dark"></script>`,
  },
];

const HEALTH_SNIPPETS = [
  {
    title: "Default — Top 5 Health Scores",
    description: "Top brokers with safety scores computed from regulatory attributes.",
    code: `<script src="https://invest.com.au/api/widget/health-scores"></script>`,
  },
  {
    title: "Specific Brokers",
    description: "Show health scores for a chosen set of brokers.",
    code: `<script src="https://invest.com.au/api/widget/health-scores?brokers=stake,commsec,cmc-markets"></script>`,
  },
  {
    title: "Dark Theme",
    description: "Health scores styled for dark-mode sites.",
    code: `<script src="https://invest.com.au/api/widget/health-scores?theme=dark&limit=3"></script>`,
  },
  {
    title: "With Partner Attribution",
    description: "Thread your partner ID through to invest.com.au health-score detail pages.",
    code: `<script src="https://invest.com.au/api/widget/health-scores?ref=yourpartnerId"></script>`,
  },
];

const BADGE_SNIPPETS = [
  {
    title: "Advisor Trust Score badge",
    description:
      "Compact gauge badge showing a single advisor's Trust Score (0–100), label, and methodology link. Not a ranking.",
    code: `<script src="https://invest.com.au/api/widget/badge?type=advisor&slug=jane-smith-cfp"></script>`,
  },
  {
    title: "Broker Health Score badge",
    description:
      "Compact gauge badge showing a single broker's Health Score (0–100), label, and methodology link.",
    code: `<script src="https://invest.com.au/api/widget/badge?type=broker&slug=stake"></script>`,
  },
  {
    title: "Dark Theme advisor badge",
    description: "Advisor Trust Score badge styled for dark-mode pages.",
    code: `<script src="https://invest.com.au/api/widget/badge?type=advisor&slug=jane-smith-cfp&theme=dark"></script>`,
  },
  {
    title: "With Partner Attribution",
    description: "Thread your partner ID through to invest.com.au profile and methodology links.",
    code: `<script src="https://invest.com.au/api/widget/badge?type=advisor&slug=jane-smith-cfp&ref=yourpartnerId"></script>`,
  },
];

function SnippetBlock({ snippet }: { snippet: { title: string; description: string; code: string } }) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
        <h3 className="font-bold text-sm text-slate-900">{snippet.title}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{snippet.description}</p>
      </div>
      <div className="px-5 py-4 bg-slate-900">
        <code className="text-xs text-emerald-400 font-mono break-all select-all">{snippet.code}</code>
      </div>
    </div>
  );
}

function ParamsTable({ rows }: {
  rows: { param: string; values: string; def: string; desc: string }[];
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-12">
      <table className="w-full text-sm" aria-label="Widget embed parameters">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-left">
            <th scope="col" className="px-5 py-3 font-bold text-slate-700">Parameter</th>
            <th scope="col" className="px-5 py-3 font-bold text-slate-700">Values</th>
            <th scope="col" className="px-5 py-3 font-bold text-slate-700 hidden sm:table-cell">Default</th>
            <th scope="col" className="px-5 py-3 font-bold text-slate-700">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
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
  );
}

// Common ?ref= row shared across all parameter tables.
const REF_PARAM_ROW = {
  param: "ref",
  values: "any string",
  def: "(none)",
  desc: "Partner ID appended to all outbound invest.com.au links for affiliate attribution. No data stored.",
};

export default function EmbedPage() {
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Embed Widgets" },
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
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-5 flex items-center gap-1.5">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Embed Widgets</span>
          </nav>

          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-full text-xs font-semibold text-emerald-700 mb-4">
            <Icon name="code" size={14} />
            Free to use
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight tracking-tight text-slate-900 mb-3">
            Embed Financial Widgets
          </h1>
          <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-2xl">
            Add live financial widgets to your blog, forum, or financial website with a single
            script tag. Choose from {SUITE_WIDGET_CATALOGUE.length} widget types — broker
            comparison, fee calculator, advisor directory, fee index, and health scores. All
            render inside a Shadow DOM so they never conflict with your styles, and data stays
            fresh automatically.
          </p>

          {/* Widget suite overview pills */}
          <div className="flex flex-wrap gap-2 mt-5">
            {SUITE_WIDGET_CATALOGUE.map((w) => (
              <span
                key={w.kind}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-700"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                {w.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container-custom max-w-4xl py-8 md:py-12">
        <h2 className="text-lg md:text-xl font-extrabold text-slate-900 mb-6">How It Works</h2>
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          {[
            { icon: "code", title: "1. Copy snippet", desc: "Grab the script tag below or use the builder to configure your widget." },
            { icon: "layout", title: "2. Paste anywhere", desc: "Drop it into your HTML. No dependencies, no bundlers, no iframes needed." },
            { icon: "refresh-cw", title: "3. Always current", desc: "Fees, ratings, and data update automatically from our database." },
          ].map((step) => (
            <div key={step.title} className="bg-white border border-slate-200 rounded-xl p-5">
              <Icon name={step.icon} size={20} className="text-emerald-600 mb-2" />
              <h3 className="font-bold text-sm text-slate-900 mb-1">{step.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* Partner Attribution callout */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-12">
          <h3 className="font-bold text-sm text-emerald-900 mb-1">Partner Attribution</h3>
          <p className="text-xs text-emerald-800 leading-relaxed">
            Add <code className="font-mono bg-emerald-100 px-1 rounded">?ref=yourpartnerId</code> to
            any widget URL and that ID is threaded through every outbound link back to invest.com.au
            — so clicks originating from your embed are attributed correctly. No new tables are
            created; attribution is purely query-param based.
          </p>
        </div>

        {/* ── Broker Widget ── */}
        <h2 className="text-lg md:text-xl font-extrabold text-slate-900 mb-1">Broker Comparison Widget</h2>
        <p className="text-sm text-slate-500 mb-5">
          Shows a live table or compact card layout comparing broker fees, ratings, and links.
        </p>
        <div className="space-y-6 mb-8">
          {BROKER_SNIPPETS.map((s) => <SnippetBlock key={s.title} snippet={s} />)}
        </div>
        <h3 className="text-base font-extrabold text-slate-900 mb-4">Broker Widget Parameters</h3>
        <ParamsTable rows={[
          { param: "brokers", values: "slug,slug,...", def: "(all)", desc: "Comma-separated broker slugs to include." },
          { param: "type", values: "table | compact", def: "table", desc: "Widget layout style." },
          { param: "theme", values: "light | dark", def: "light", desc: "Colour theme." },
          { param: "limit", values: "1–10", def: "5", desc: "Maximum brokers displayed." },
          { param: "widget", values: "cheapest-brokers | us-shares | top-crypto | savings-rates | term-deposits", def: "(none)", desc: "Curated content filter." },
          REF_PARAM_ROW,
        ]} />

        {/* ── Calculator Widget ── */}
        <h2 className="text-lg md:text-xl font-extrabold text-slate-900 mb-1">Fee Calculator Widget</h2>
        <p className="text-sm text-slate-500 mb-5">
          An interactive trade-cost calculator — visitors can adjust the trade amount and market.
          Includes the general-advice disclaimer. Powered by live broker fee data.
        </p>
        <div className="space-y-6 mb-8">
          {CALC_SNIPPETS.map((s) => <SnippetBlock key={s.title} snippet={s} />)}
        </div>
        <h3 className="text-base font-extrabold text-slate-900 mb-4">Calculator Widget Parameters</h3>
        <ParamsTable rows={[
          { param: "market", values: "asx | us", def: "asx", desc: "Which market's fees to show by default." },
          { param: "theme", values: "light | dark", def: "light", desc: "Colour theme." },
          { param: "limit", values: "1–10", def: "5", desc: "Maximum brokers displayed." },
          { param: "amount", values: "1–1000000", def: "5000", desc: "Default trade amount pre-filled (AUD). Visitors can change it." },
          REF_PARAM_ROW,
        ]} />

        {/* ── Advisor Directory Widget ── */}
        <h2 className="text-lg md:text-xl font-extrabold text-slate-900 mb-1">Advisor Directory Widget</h2>
        <p className="text-sm text-slate-500 mb-5">
          An embeddable directory of financial advisors with optional type and state filters.
          Includes the general-advice disclaimer. Powered by live advisor data.
        </p>
        <div className="space-y-6 mb-8">
          {ADVISOR_SNIPPETS.map((s) => <SnippetBlock key={s.title} snippet={s} />)}
        </div>
        <h3 className="text-base font-extrabold text-slate-900 mb-4">Advisor Widget Parameters</h3>
        <ParamsTable rows={[
          { param: "type", values: "financial-planner | mortgage-broker | accountant | investment-advisor | insurance-broker | smsf-advisor", def: "(all)", desc: "Filter by advisor type." },
          { param: "state", values: "NSW | VIC | QLD | SA | WA | TAS | ACT | NT", def: "(all)", desc: "Filter by Australian state." },
          { param: "theme", values: "light | dark", def: "light", desc: "Colour theme." },
          { param: "limit", values: "1–10", def: "5", desc: "Maximum advisors displayed." },
          REF_PARAM_ROW,
        ]} />

        {/* ── Fee Index Widget ── */}
        <h2 className="text-lg md:text-xl font-extrabold text-slate-900 mb-1">Fee Index Table Widget</h2>
        <p className="text-sm text-slate-500 mb-5">
          A sortable table of AU brokerage fees — ASX and US share costs across all active brokers.
          Factual aggregate data sourced from publicly disclosed fee schedules.
        </p>
        <div className="space-y-6 mb-8">
          {FEE_INDEX_SNIPPETS.map((s) => <SnippetBlock key={s.title} snippet={s} />)}
        </div>
        <h3 className="text-base font-extrabold text-slate-900 mb-4">Fee Index Widget Parameters</h3>
        <ParamsTable rows={[
          { param: "market", values: "asx | us", def: "asx", desc: "Which market to highlight in the table." },
          { param: "sort", values: "asx_fee | us_fee | rating", def: "asx_fee", desc: "Sort column. Fee sorts ascending (cheapest first); rating descending." },
          { param: "theme", values: "light | dark", def: "light", desc: "Colour theme." },
          { param: "limit", values: "1–20", def: "10", desc: "Maximum brokers displayed." },
          REF_PARAM_ROW,
        ]} />

        {/* ── Health Scores Widget ── */}
        <h2 className="text-lg md:text-xl font-extrabold text-slate-900 mb-1">Broker Health Score Widget</h2>
        <p className="text-sm text-slate-500 mb-5">
          Safety scores (0–100) computed from publicly disclosed regulatory attributes — ASIC
          status, AFSL, CHESS sponsorship, years operating, and editorial rating. Not financial advice.
        </p>
        <div className="space-y-6 mb-8">
          {HEALTH_SNIPPETS.map((s) => <SnippetBlock key={s.title} snippet={s} />)}
        </div>
        <h3 className="text-base font-extrabold text-slate-900 mb-4">Health Score Widget Parameters</h3>
        <ParamsTable rows={[
          { param: "brokers", values: "slug,slug,...", def: "(top by rating)", desc: "Comma-separated broker slugs to include." },
          { param: "theme", values: "light | dark", def: "light", desc: "Colour theme." },
          { param: "limit", values: "1–10", def: "5", desc: "Maximum brokers displayed." },
          REF_PARAM_ROW,
        ]} />

        {/* ── Score Badge Widget ── */}
        <h2 className="text-lg md:text-xl font-extrabold text-slate-900 mb-1">Score Badge Widget</h2>
        <p className="text-sm text-slate-500 mb-5">
          A compact, embeddable badge showing a <strong>single entity&apos;s own factual score</strong> — either
          an Advisor Trust Score or a Broker Health Score. Includes a gauge (0–100), a band label
          (e.g. &ldquo;Good&rdquo; or &ldquo;Strong&rdquo;), and a link to the published scoring methodology.
          Not a ranking, award, or comparison. General-advice disclaimer is always included.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-xs text-amber-900 leading-relaxed">
          <strong>Compliance note:</strong> The badge surfaces a single entity&apos;s own score only.
          It does not compare entities, rank them, or use &ldquo;best&rdquo; or &ldquo;award&rdquo; language.
          The badge always links to the methodology page so visitors can audit the scoring algorithm.
        </div>
        <div className="space-y-6 mb-8">
          {BADGE_SNIPPETS.map((s) => <SnippetBlock key={s.title} snippet={s} />)}
        </div>
        <h3 className="text-base font-extrabold text-slate-900 mb-4">Score Badge Parameters</h3>
        <ParamsTable rows={[
          { param: "type", values: "advisor | broker", def: "(required)", desc: "Which score to display — advisor Trust Score or broker Health Score." },
          { param: "slug", values: "entity slug", def: "(required)", desc: "Slug of the advisor or broker (found in their profile URL)." },
          { param: "theme", values: "light | dark", def: "light", desc: "Colour theme." },
          REF_PARAM_ROW,
        ]} />

        {/* White-label callout */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex items-start gap-4 flex-wrap mb-4">
          <div className="flex-1 min-w-[12rem]">
            <h3 className="font-bold text-sm text-slate-900 mb-1">Need white-label widgets?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Pro and Enterprise API customers can remove the &ldquo;Powered by invest.com.au&rdquo;
              attribution footer. Generate a license token from{" "}
              <code className="font-mono bg-white border border-slate-200 px-1 rounded">
                POST /api/v1/widget-licenses
              </code>{" "}
              and append <code className="font-mono bg-white border border-slate-200 px-1 rounded">
                ?license=wlt_xxx
              </code> to your embed URL.
            </p>
          </div>
          <a
            href="/embed/licensing"
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 whitespace-nowrap"
          >
            View licensing tiers →
          </a>
        </div>

        {/* Interactive Builder */}
        <h2 className="text-lg md:text-xl font-extrabold text-slate-900 mb-4">Get Your Embed Code</h2>
        <EmbedBuilder />
      </section>
    </div>
  );
}
