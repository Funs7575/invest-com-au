import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Small Business Tax Australia (${CURRENT_YEAR}) — Sole Trader, Company, Trust & Partnership`,
  description: `Small business tax in Australia: GST threshold, company tax rates, CGT concessions, instant asset write-off, and key deductions. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Small Business Tax Australia (${CURRENT_YEAR}) — Sole Trader, Company, Trust & Partnership`,
    description:
      "How Australian small businesses are taxed: structure comparison, GST threshold, 25% company rate, small business CGT concessions, instant asset write-off, and common deductions.",
    url: `${SITE_URL}/tax/small-business`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Small Business Tax Australia")}&sub=${encodeURIComponent("Sole Trader · Company · CGT Concessions · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/tax/small-business` },
};

const STRUCTURE_ROWS = [
  {
    feature: "Tax rate",
    soleTrader: "Marginal personal rate",
    partnership: "Marginal personal rate (each partner)",
    company: "25% (base rate entity) or 30%",
    trust: "Beneficiaries' marginal rates",
  },
  {
    feature: "Setup cost",
    soleTrader: "$0–$100 (ABN)",
    partnership: "$100–$500",
    company: "$500–$1,500 (ASIC)",
    trust: "$1,000–$3,000",
  },
  {
    feature: "Liability",
    soleTrader: "Unlimited",
    partnership: "Unlimited (jointly)",
    company: "Limited (company assets only)",
    trust: "Trustee liable",
  },
  {
    feature: "CGT discount",
    soleTrader: "50% after 12 months",
    partnership: "50% per partner",
    company: "None (company)",
    trust: "50% via trust",
  },
  {
    feature: "Losses",
    soleTrader: "Offset personal income",
    partnership: "Offset each partner's income",
    company: "Quarantined in company",
    trust: "Quarantined in trust",
  },
  {
    feature: "Complexity",
    soleTrader: "Simple",
    partnership: "Moderate",
    company: "Annual returns, company tax",
    trust: "Higher (deed, trustee duties)",
  },
];

const CONCESSIONS = [
  {
    name: "Instant asset write-off",
    eligibility: "Turnover < $10M; asset < $20,000",
    benefit: "Immediate deduction instead of depreciation",
    highlight: true,
  },
  {
    name: "Small business CGT concessions",
    eligibility: "Net assets < $6M or turnover < $2M",
    benefit: "15-year exemption, retirement exemption, rollover, 50% active asset reduction",
    highlight: true,
  },
  {
    name: "Simplified depreciation",
    eligibility: "Turnover < $10M",
    benefit: "Pool low-cost assets; immediate write-off of small assets",
    highlight: false,
  },
  {
    name: "Small business restructure rollover",
    eligibility: "Turnover < $10M",
    benefit: "Restructure entities without CGT or stamp duty consequences",
    highlight: false,
  },
  {
    name: "PAYG instalment threshold",
    eligibility: "Annual income below ATO threshold",
    benefit: "Quarterly vs monthly PAYG instalments; reduces cash-flow burden",
    highlight: false,
  },
];

const CGT_CONCESSIONS = [
  {
    name: "15-year exemption",
    badge: "Most powerful",
    badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
    body: "If you have operated the business for 15 or more years and you are over 55 and retiring — or are permanently incapacitated — the entire capital gain is exempt from tax. The net asset value condition must be satisfied (net assets under $6M, or annual turnover under $2M). No lifetime limit applies. Retirement or incapacity must be at or after the CGT event.",
  },
  {
    name: "Retirement exemption",
    badge: "$500K lifetime cap",
    badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
    body: "Capital gains of up to $500,000 are exempt over your lifetime. If you are under 55 at the time, the exempt amount must be contributed to a complying superannuation fund or retirement savings account. If you are 55 or over, you can take the exempt amount as cash. The $500,000 is a cumulative lifetime cap across all uses of this concession.",
  },
  {
    name: "50% active asset reduction",
    badge: "Stacks with discount",
    badgeColor: "bg-amber-100 text-amber-700 border-amber-200",
    body: "If the asset is an active asset (used in carrying on a business), you can reduce the capital gain by a further 50% after applying the standard 50% CGT discount. The combined effect: a $100,000 gain becomes $50,000 after the 12-month discount, then $25,000 after the active asset reduction — only 25% of the original gain is assessable.",
  },
  {
    name: "Small business rollover",
    badge: "2-year deferral",
    badgeColor: "bg-purple-100 text-purple-700 border-purple-200",
    body: "Defer a capital gain for up to 2 years while you acquire a replacement active asset. If you acquire the replacement asset and use it in a business within the 2-year window, the gain rolls over into the cost base of the new asset. If you do not acquire a replacement asset in time, the original gain becomes assessable at the end of the rollover period.",
  },
];

const DEDUCTIONS = [
  {
    category: "Motor vehicle",
    detail: "Logbook method (proportion of actual costs) or cents per km (up to 5,000 km at 88c/km for 2024-25). Sole traders only — companies use logbook or FBT.",
  },
  {
    category: "Home office",
    detail: "Fixed rate method: 67c per hour for actual hours worked from home. Alternatively, occupancy and running costs via apportionment. Keep diary records.",
  },
  {
    category: "Super contributions",
    detail: "Sole traders can claim a personal super deduction up to the $30,000 concessional cap (2024-25). Lodge a notice of intent to claim with the fund before lodging your tax return.",
  },
  {
    category: "Business travel",
    detail: "Flights, accommodation, and meals for business travel. Private or holiday components must be apportioned and excluded. Keep receipts and a travel diary for overnight trips.",
  },
  {
    category: "Borrowing costs",
    detail: "Interest on business loans, bank fees, and borrowing establishment costs are deductible. Mixed-purpose loans require apportionment between business and private use.",
  },
  {
    category: "Depreciation",
    detail: "Assets costing $20,000 or more (outside instant asset write-off threshold) are depreciated via the simplified pool (30% declining balance, 15% in first year) or prime cost / diminishing value.",
  },
];

const FAQS = [
  {
    q: "Should I operate as a sole trader or company?",
    a: "The right structure depends on your income level, growth plans, and risk appetite. A sole trader is the simplest and cheapest option — business income is added to your personal tax return at marginal rates (up to 47%). A company pays a flat 25% (base rate entity) or 30% tax rate, which can save tax if your personal marginal rate is above that threshold. However, a company cannot access the 50% CGT discount when selling assets, and profits are locked in the company until paid as dividends (which are then taxed at your personal marginal rate). A company also provides limited liability protection. Many growing businesses start as sole traders and restructure to a company or trust once turnover and profit justify the additional compliance cost (typically $2,000–$5,000 per year).",
  },
  {
    q: "When should I register for GST?",
    a: "You must register for GST if your annual turnover reaches or exceeds $75,000 ($150,000 for non-profit organisations). Once you cross the threshold, you must register within 21 days. You can voluntarily register below the threshold — this lets you claim GST credits on business inputs, which is beneficial if your customers are GST-registered businesses (who can claim the GST back). If your customers are mostly private individuals, voluntary registration adds 10% to your prices unless absorbed, so it is less attractive. Once registered, you charge 10% GST on taxable supplies, claim credits on eligible business purchases, and lodge a Business Activity Statement monthly, quarterly, or annually depending on your turnover.",
  },
  {
    q: "What is Division 7A and how does it affect my private company?",
    a: "Division 7A prevents private company owners and their associates from accessing company profits tax-free by taking loans, payments, or using company assets for free. If you borrow money from your private company, the ATO deems it a dividend (taxed at your personal marginal rate) unless you have a complying loan agreement in place. A complying Division 7A loan must: be in writing before lodgement of the company tax return; charge at least the ATO's benchmark interest rate (currently 8.77% for 2024-25); and be repaid over a maximum of 7 years (25 years if secured by a registered mortgage over real property). Minimum annual repayments of principal and interest are required. Failure to comply results in the full outstanding balance being treated as an unfranked dividend in the year of the breach.",
  },
  {
    q: "Can I access the small business CGT concessions when I sell my business?",
    a: "Possibly — the small business CGT concessions are some of the most valuable tax concessions available to Australian small business owners. To access them, you must first satisfy the basic conditions: you must be a CGT small business entity (annual turnover under $2M) or pass the maximum net asset value test (net assets under $6M). The asset sold must be an active asset — one used in carrying on your business (not passive investments). If the basic conditions are met, you can then access one or more of the four concessions: the 15-year exemption, the 50% active asset reduction, the retirement exemption, or the small business rollover. The concessions can be stacked in some cases. For example, the 50% general CGT discount plus the 50% active asset reduction reduces an eligible gain to just 25% of the original amount. Planning is critical — the structure of the sale and the nature of the asset both affect eligibility. Seek specialist advice well before the sale.",
  },
  {
    q: "What deductions can I claim as a sole trader working from home?",
    a: "As a sole trader working from home, you can claim occupancy expenses (mortgage interest or rent, council rates, insurance) apportioned to your dedicated work area, plus running expenses using the ATO's fixed rate method of 67 cents per hour worked from home (covering electricity, internet, phone, and stationery). Alternatively, you can claim actual running costs by apportionment. You cannot use the fixed rate method and also separately claim internet or phone costs — they are bundled into the 67c rate. If you claim occupancy costs, be aware this may reduce your main residence CGT exemption on the portion of the home used for business. You must keep records: a diary or log of hours worked, plus receipts for all actual expenses claimed.",
  },
  {
    q: "What is the base rate entity tax rate and who qualifies?",
    a: "The base rate entity (BRE) tax rate is 25% and applies to private companies that satisfy two conditions: the company's aggregated annual turnover is under $50 million, and at least 80% of the company's assessable income is not base rate entity passive income (dividends, interest, rent, royalties, and net capital gains). In practice, most trading companies — those actively running a business — qualify for the 25% rate. Investment companies or holding companies that primarily receive passive income (such as dividends from subsidiaries, rental income, or interest) may fail the 80% passive income test and instead pay the general 30% company rate. The ATO assesses the income character each year, so a company's applicable rate can change from year to year if its income mix changes.",
  },
];

export default function SmallBusinessTaxPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Tax", url: absoluteUrl("/tax") },
    { name: "Small Business Tax", url: absoluteUrl("/tax/small-business") },
  ]);
  const faq = faqJsonLd(FAQS);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />}
      <div className="bg-white min-h-screen">

        {/* Hero */}
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/tax" className="hover:text-white">Tax</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Small Business Tax</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">Updated {CURRENT_YEAR}</span>
              <span className="text-xs font-semibold bg-slate-700 text-slate-200 px-3 py-1 rounded-full">Sole Trader &middot; Company &middot; Trust &middot; Partnership</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Small Business Tax in Australia
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              Business structure comparison, GST threshold, company tax rates, small business CGT concessions,
              instant asset write-off, and key deductions for sole traders, companies, trusts, and partnerships.
            </p>
          </div>
        </section>

        {/* Key Stats */}
        <section className="bg-white py-8 border-b border-slate-100">
          <div className="container-custom">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  v: "25%",
                  l: "Base rate entity company tax",
                  sub: "For turnover under $50M (trading companies)",
                },
                {
                  v: "$75,000",
                  l: "GST registration threshold",
                  sub: "Annual turnover requiring GST registration",
                },
                {
                  v: "$1,000",
                  l: "Max SBITO offset",
                  sub: "Small Business Income Tax Offset for individuals",
                },
                {
                  v: "$500K",
                  l: "CGT retirement exemption cap",
                  sub: "Lifetime limit per individual",
                },
              ].map((s) => (
                <div key={s.l} className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <div className="text-2xl font-extrabold text-slate-900">{s.v}</div>
                  <div className="text-xs font-bold text-slate-700 mt-0.5">{s.l}</div>
                  <div className="text-xs text-slate-500">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Business Structure Comparison */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Business structure comparison</h2>
            <p className="text-sm text-slate-600 mb-6 max-w-3xl">
              Choosing the right structure is the most important tax decision a small business owner makes.
              Each structure has different tax rates, liability exposure, and complexity.
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm border-collapse" aria-label="Business structure comparison: sole trader, partnership, company, trust">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th scope="col" className="text-left py-3 px-4 text-xs font-bold">Feature</th>
                    <th scope="col" className="text-center py-3 px-4 text-xs font-bold">Sole trader</th>
                    <th scope="col" className="text-center py-3 px-4 text-xs font-bold">Partnership</th>
                    <th scope="col" className="text-center py-3 px-4 text-xs font-bold bg-amber-700">Company</th>
                    <th scope="col" className="text-center py-3 px-4 text-xs font-bold">Trust</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {STRUCTURE_ROWS.map((row) => (
                    <tr key={row.feature} className="bg-white hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-xs font-bold text-slate-800">{row.feature}</td>
                      <td className="py-3 px-4 text-center text-xs text-slate-600">{row.soleTrader}</td>
                      <td className="py-3 px-4 text-center text-xs text-slate-600">{row.partnership}</td>
                      <td className="py-3 px-4 text-center text-xs text-amber-700 font-medium bg-amber-50">{row.company}</td>
                      <td className="py-3 px-4 text-center text-xs text-slate-600">{row.trust}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-slate-400 px-4 py-2 border-t border-slate-100">General comparison only. Costs vary. Seek professional advice for your specific situation.</p>
            </div>
          </div>
        </section>

        {/* Key Tax Rates */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Key tax rates for 2024&#8211;25</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  label: "Sole trader / partnership",
                  rate: "0–47%",
                  note: "Business income taxed at individual marginal rates. Top rate of 47% (including Medicare Levy) applies above $180,000.",
                  colour: "bg-white border-slate-200",
                  rateColour: "text-slate-900",
                },
                {
                  label: "Base rate entity company",
                  rate: "25%",
                  note: "Applies to companies with aggregated turnover under $50M where 80%+ of assessable income is from active trading (not passive income).",
                  colour: "bg-amber-50 border-amber-200",
                  rateColour: "text-amber-700",
                },
                {
                  label: "General company tax rate",
                  rate: "30%",
                  note: "Applies to companies that do not satisfy the base rate entity conditions — typically investment holding companies with primarily passive income.",
                  colour: "bg-white border-slate-200",
                  rateColour: "text-slate-900",
                },
                {
                  label: "Small Business Income Tax Offset",
                  rate: "Up to $1,000",
                  note: "Available to individuals with business income. Applies if aggregated turnover is under $5M. Offset is 16% of the tax attributable to business income, capped at $1,000.",
                  colour: "bg-emerald-50 border-emerald-200",
                  rateColour: "text-emerald-700",
                },
              ].map((item) => (
                <div key={item.label} className={`rounded-xl border p-5 ${item.colour}`}>
                  <div className={`text-2xl font-extrabold mb-1 ${item.rateColour}`}>{item.rate}</div>
                  <div className="text-sm font-extrabold text-slate-900 mb-2">{item.label}</div>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.note}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-5">
              <p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-2">Division 7A — Loans from private companies</p>
              <p className="text-sm text-slate-700 leading-relaxed">
                Division 7A prevents shareholders and their associates from accessing private company profits tax-free via loans,
                payments, or debt forgiveness. A loan from your company must be documented under a <strong>complying loan agreement</strong> —
                in writing, charging the ATO benchmark interest rate (8.77% for 2024-25), and repaid within 7 years (or 25 years
                if secured by a registered mortgage). Undocumented loans are treated as unfranked dividends and taxed at the
                individual&apos;s personal marginal rate.
              </p>
            </div>
          </div>
        </section>

        {/* GST */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">GST: registration, charging, and BAS</h2>
            <div className="grid sm:grid-cols-3 gap-4 mb-6">
              {[
                {
                  title: "When you must register",
                  body: "GST registration is compulsory when your annual turnover reaches $75,000 (or $150,000 for non-profit organisations). You must register within 21 days of reaching the threshold. Taxi and ride-share operators must register regardless of turnover.",
                  border: "border-red-200 bg-red-50",
                },
                {
                  title: "Voluntary registration",
                  body: "You can register voluntarily if your turnover is below $75,000. This lets you claim GST credits (input tax credits) on business purchases. Most beneficial when your customers are GST-registered businesses who can reclaim the GST you charge them.",
                  border: "border-blue-200 bg-blue-50",
                },
                {
                  title: "BAS lodgement",
                  body: "Once registered, you lodge a Business Activity Statement monthly (turnover over $20M), quarterly (most small businesses), or annually (eligible micro businesses). BAS reports GST collected, GST credits claimed, and PAYG withholding and instalments.",
                  border: "border-slate-200 bg-slate-50",
                },
              ].map((item) => (
                <div key={item.title} className={`rounded-xl border p-5 ${item.border}`}>
                  <h3 className="font-extrabold text-slate-900 mb-2 text-sm">{item.title}</h3>
                  <p className="text-xs text-slate-700 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="font-extrabold text-slate-900 mb-3">How GST works in practice</h3>
              <div className="space-y-2 text-sm text-slate-700">
                <p><strong>Charge 10% GST</strong> on all taxable supplies you make (most goods and services). Add GST to your invoice and remit it to the ATO via your BAS.</p>
                <p><strong>Claim GST credits</strong> (input tax credits) on business purchases that include GST. The net GST payable = GST collected minus GST credits claimed.</p>
                <p><strong>GST-free supplies</strong> (e.g., basic food, health services, education, exports) do not attract GST but you can still claim input tax credits on related business expenses.</p>
                <p><strong>Input-taxed supplies</strong> (e.g., financial services, residential rent) — no GST charged and no input tax credits on related expenses.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Small Business Concessions */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Small business tax concessions</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm border-collapse" aria-label="Small business tax concessions eligibility and benefits">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th scope="col" className="text-left py-3 px-4 text-xs font-bold">Concession</th>
                    <th scope="col" className="text-left py-3 px-4 text-xs font-bold">Eligibility</th>
                    <th scope="col" className="text-left py-3 px-4 text-xs font-bold">Benefit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {CONCESSIONS.map((row) => (
                    <tr key={row.name} className={row.highlight ? "bg-amber-50" : "bg-white hover:bg-slate-50 transition-colors"}>
                      <td className="py-3 px-4 text-xs font-bold text-slate-800">{row.name}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">{row.eligibility}</td>
                      <td className="py-3 px-4 text-xs text-slate-700">{row.benefit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-slate-400 px-4 py-2 border-t border-slate-100">Thresholds and rules for 2024-25. Verify eligibility at ato.gov.au before applying concessions.</p>
            </div>
          </div>
        </section>

        {/* Small Business CGT Concessions — Expanded */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">The four small business CGT concessions</h2>
            <p className="text-sm text-slate-600 mb-6 max-w-3xl">
              These concessions apply when selling a business or an active asset. They can be stacked: for example,
              the <strong>50% general CGT discount</strong> plus the <strong>50% active asset reduction</strong> means only
              25% of the original capital gain is assessable. Basic conditions must be satisfied before accessing any concession.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {CGT_CONCESSIONS.map((item) => (
                <div key={item.name} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-extrabold text-slate-900">{item.name}</h3>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full border ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-2">Stacking example</p>
              <p className="text-sm text-slate-700 leading-relaxed">
                A sole trader sells a business asset for a $400,000 capital gain after 12 months. Step 1: 50% general CGT discount
                reduces to $200,000. Step 2: 50% active asset reduction reduces to $100,000. Step 3: retirement exemption (up to $500,000 lifetime)
                could exempt the remaining $100,000 entirely. Result: <strong>$0 tax on the $400,000 gain.</strong>
              </p>
            </div>
          </div>
        </section>

        {/* Fringe Benefits Tax */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Fringe benefits tax (FBT)</h2>
            <p className="text-sm text-slate-600 mb-5">
              FBT is a tax paid by <strong>employers</strong> on non-cash benefits provided to employees (and their associates) in connection with employment.
              The FBT rate is <strong>47%</strong> on the taxable value of benefits. The FBT year runs from <strong>1 April to 31 March</strong>.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  title: "Common fringe benefits",
                  items: [
                    "Novated lease (car available for private use)",
                    "Employer-provided car",
                    "Entertainment (meals, events)",
                    "Low-interest or interest-free loans",
                    "Housing or accommodation",
                    "Payment of private expenses",
                  ],
                  colour: "border-slate-200 bg-white",
                },
                {
                  title: "FBT-exempt benefits",
                  items: [
                    "Portable electronic devices (work use) — one per employee per FBT year",
                    "Minor benefits under $300 per occasion (irregular and infrequent)",
                    "Work-related items (briefcase, tool of trade, protective clothing)",
                    "Car parking (for small business entity employers)",
                    "Remote area housing benefits (if eligible)",
                    "Relocation costs (certain amounts)",
                  ],
                  colour: "border-emerald-200 bg-emerald-50",
                },
              ].map((col) => (
                <div key={col.title} className={`rounded-xl border p-5 ${col.colour}`}>
                  <h3 className="font-extrabold text-slate-900 mb-3 text-sm">{col.title}</h3>
                  <ul className="space-y-1.5">
                    {col.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs text-slate-700">
                        <span className="mt-0.5 text-slate-400 shrink-0">&#8226;</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-4">FBT is separate from income tax. Employers report FBT on the FBT return, not the income tax return. Lodge by 21 May (or 25 June if lodging through a tax agent).</p>
          </div>
        </section>

        {/* Common Deductions */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Common deductions for small businesses</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {DEDUCTIONS.map((item) => (
                <div key={item.category} className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="font-extrabold text-slate-900 mb-2 text-sm">{item.category}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-2">Record keeping</p>
              <p className="text-sm text-slate-700 leading-relaxed">
                The ATO requires records supporting every deduction claimed, kept for at least <strong>5 years</strong> from the date you lodge your return.
                For CGT assets (including business assets), records must be kept for the entire ownership period plus 5 years after disposal.
                Digital copies are acceptable — photograph receipts as you go.
              </p>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-12 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
            <div className="space-y-3">
              {FAQS.map((item) => (
                <details key={item.q} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-bold text-slate-900 hover:bg-slate-50">
                    {item.q}
                  </summary>
                  <div className="px-5 pb-4 text-sm text-slate-700 leading-relaxed">{item.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Compliance + nav */}
        <section className="py-10 bg-slate-100 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <div className="rounded-xl border border-slate-300 bg-white p-5 mb-6">
              <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING} Small business taxation is a complex area. This guide is general in nature and does not constitute tax or financial advice. Tax rules, thresholds, and concession eligibility change annually. Consult a registered tax agent or BAS agent for advice specific to your business structure and circumstances.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/tax" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Tax hub &#8594;</Link>
              <Link href="/tax/capital-gains" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Capital gains tax guide &#8594;</Link>
              <Link href="/advisors/tax-agents" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Find a tax agent &#8594;</Link>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
