import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, SITE_NAME, CURRENT_YEAR } from "@/lib/seo";
import ContextualLeadMagnet from "@/components/ContextualLeadMagnet";
import { SHOW_RATINGS, SHOW_EDITORIAL_BADGES, SHOW_ADVISOR_RATINGS, SHOW_ADVISOR_VERIFIED_BADGE, getRegisterWording, FACTUAL_COMPARISON_DISCLAIMER, ADVISOR_DIRECTORY_HEADING, ADVISOR_DIRECTORY_SUBTEXT } from "@/lib/compliance-config";

export const metadata: Metadata = {
  title: `Private Credit & P2P Lending in Australia (${CURRENT_YEAR})`,
  description:
    "Compare Australian private credit funds and P2P lending platforms — La Trobe Financial, Qualitas, Metrics Credit Partners, Plenti. Yields, risks, SMSF eligibility and how to invest.",
  alternates: { canonical: `${SITE_URL}/invest/private-credit` },
  openGraph: {
    title: `Private Credit & P2P Lending in Australia (${CURRENT_YEAR})`,
    description:
      "Compare Australian private credit funds and P2P lending platforms — La Trobe Financial, Qualitas, Metrics Credit Partners, Plenti. Yields, risks, SMSF eligibility and how to invest.",
    url: `${SITE_URL}/invest/private-credit`,
  },
};

export const revalidate = 3600;

export default async function PrivateCreditPage() {
  const supabase = await createClient();
  const { data: advisors } = await supabase
    .from("professionals")
    .select("slug, name, firm_name, type, location_display, rating, review_count, photo_url, verified")
    .eq("status", "active")
    .in("type", ["financial_planner", "wealth_manager"])
    .order("verified", { ascending: false })
    .order("rating", { ascending: false })
    .limit(4);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Private Credit & P2P Lending" },
  ]);

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Private Credit & P2P Lending in Australia (${CURRENT_YEAR})`,
    url: `${SITE_URL}/invest/private-credit`,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "What is private credit?", acceptedAnswer: { "@type": "Answer", text: "Private credit refers to loans and debt instruments issued outside public bond markets, where companies borrow from specialist credit funds rather than banks. Returns come from interest payments, offering investors yields of 6-10% p.a., and the asset class has grown rapidly in Australia as banks retreated from certain lending segments post-Royal Commission." } },
      { "@type": "Question", name: "How is private credit different from bonds?", acceptedAnswer: { "@type": "Answer", text: "Unlike publicly traded bonds, private credit loans are negotiated directly between the lender and borrower and are not listed on an exchange. Private credit typically offers higher yields (6-10% vs 4-5% for investment-grade bonds), but comes with less liquidity, less price transparency, and often longer lock-up periods." } },
      { "@type": "Question", name: "What is the minimum investment for private credit in Australia?", acceptedAnswer: { "@type": "Answer", text: "Minimums vary widely. ASX-listed private credit trusts like MXT or MOT can be bought for the price of a single unit (around $2). Unlisted retail funds like La Trobe Financial start at $20,000, while wholesale-only funds from managers like MaxCap or Epsilon require $100,000-$500,000." } },
      { "@type": "Question", name: "Can an SMSF invest in private credit?", acceptedAnswer: { "@type": "Answer", text: "Yes, SMSFs can invest in private credit through ASX-listed trusts (MXT, MOT, QAL) with no wholesale requirement, or through unlisted funds provided the investment is documented in the fund's investment strategy. Interest income is taxed at 15% in accumulation phase or 0% in pension phase." } },
      { "@type": "Question", name: "What are the main risks of private credit?", acceptedAnswer: { "@type": "Answer", text: "Key risks include credit default risk (borrowers failing to repay), illiquidity risk (funds may gate redemptions in stressed markets), valuation opacity (private loans are harder to mark-to-market), and manager risk (credit underwriting quality varies dramatically between fund managers). Some funds are also concentrated in a single sector like commercial real estate." } },
      { "@type": "Question", name: "How do private credit returns compare to term deposits?", acceptedAnswer: { "@type": "Answer", text: "Private credit funds typically yield 6-10% p.a. compared to 4-5% for bank term deposits, representing a premium of 200-500 basis points. However, unlike term deposits which are government-guaranteed up to $250,000 per ADI, private credit carries real risk of capital loss and is not covered by any government guarantee." } },
      { "@type": "Question", name: "What happens if a private credit fund gates redemptions?", acceptedAnswer: { "@type": "Answer", text: "If a fund gates (restricts) redemptions, investors cannot withdraw their money until the gate is lifted. This happened to several funds during the COVID crash in 2020. ASX-listed private credit trusts avoid this issue as units can always be sold on the exchange, though potentially at a discount to net asset value." } },
      { "@type": "Question", name: "Is private credit regulated by ASIC?", acceptedAnswer: { "@type": "Answer", text: "Yes, private credit fund managers in Australia must hold an Australian Financial Services Licence (AFSL) issued by ASIC. ASX-listed trusts are also subject to ASX listing rules and continuous disclosure requirements. However, the underlying loans themselves are private and not subject to the same transparency requirements as public bond markets." } },
    ],
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Hero */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/invest" className="hover:text-slate-900 transition-colors">Invest</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Private Credit &amp; P2P Lending</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
              Updated {CURRENT_YEAR}
            </span>
            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
              Hottest Alternative Asset Class
            </span>
          </div>

          <h1 className="text-slate-900 text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
            Private Credit &amp; P2P Lending in Australia
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed max-w-2xl">
            Private credit is Australia&apos;s fastest-growing alternative asset class. Institutional capital is pouring in, and retail investors — especially SMSF trustees — are following for yields well above term deposits.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link
              href="/advisors"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              Browse Directories &rarr;
            </Link>
            <Link
              href="/compare"
              className="inline-flex items-center gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 font-semibold text-sm px-5 py-2.5 rounded-lg border transition-colors"
            >
              Filter Platforms
            </Link>
          </div>
        </div>
      </section>

      {/* Key stats */}
      <section className="py-10 bg-white border-b border-slate-100">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "$200B+", label: "Australian private credit market size" },
              { value: "6–10%", label: "Typical annual yields" },
              { value: "600K+", label: "Australian SMSFs seeking yield" },
              { value: "3–5yr", label: "Common fund lock-up periods" },
            ].map((s) => (
              <div key={s.label} className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-amber-600">{s.value}</p>
                <p className="text-xs text-slate-600 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 1: What Is Private Credit */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 1</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">What Is Private Credit?</h2>

          <div className="prose prose-slate max-w-none">
            <p>
              Private credit (also called private debt) refers to loans and debt instruments issued outside the public bond markets. Instead of borrowing from a bank, companies borrow from specialist credit funds that pool capital from institutional and retail investors. Returns come from interest payments rather than equity appreciation, offering more predictable income streams.
            </p>
            <p>
              In Australia, private credit has exploded as banks retreated from certain lending segments post-Royal Commission. Fund managers have stepped in to finance commercial real estate, infrastructure, corporate acquisitions, and SME lending — offering investors yields of <strong>6–10% p.a.</strong> compared to 4–5% from term deposits.
            </p>

            <h3>Why It&apos;s Booming</h3>
            <ul>
              <li><strong>Bank retreat</strong> — tighter APRA capital requirements pushed banks out of riskier lending</li>
              <li><strong>Yield premium</strong> — 200–500 basis points above bank term deposits</li>
              <li><strong>Floating rate</strong> — most private credit is floating rate, benefiting from higher interest rates</li>
              <li><strong>SMSF demand</strong> — 600,000+ SMSFs seeking income above cash rates</li>
              <li><strong>Institutional validation</strong> — Australian super funds now allocate 5–15% to private credit</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 2: Key Fund Managers */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 2</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Leading Private Credit Fund Managers</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: "La Trobe Financial", focus: "Australian mortgage & credit fund", aum: "$16B+ AUM", yield: "Target 6.5–7.5% p.a.", min: "$20,000 minimum", access: "Retail & wholesale" },
              { name: "Qualitas", focus: "Real estate private credit (ASX: QAL)", aum: "$9B+ AUM", yield: "Target 8–10% p.a.", min: "ASX-listed + unlisted funds", access: "Retail via ASX" },
              { name: "Metrics Credit Partners", focus: "Corporate & real estate lending", aum: "$18B+ AUM", yield: "Target 7–9% p.a.", min: "ASX-listed (MXT, MOT)", access: "Retail via ASX" },
              { name: "Revolution Asset Management", focus: "Mid-market corporate lending", aum: "$3B+ AUM", yield: "Target 7–8% p.a.", min: "$50,000 minimum", access: "Wholesale investors" },
              { name: "MaxCap Group", focus: "Commercial real estate debt", aum: "$8B+ AUM", yield: "Target 7–9% p.a.", min: "Wholesale only", access: "Institutional & wholesale" },
              { name: "Epsilon Direct Lending", focus: "SME & mid-market corporate", aum: "$2B+ AUM", yield: "Target 8–11% p.a.", min: "$100,000 minimum", access: "Wholesale investors" },
            ].map((m) => (
              <div key={m.name} className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="font-bold text-slate-900">{m.name}</p>
                <p className="text-sm text-slate-500 mt-1">{m.focus}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-xs bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded">{m.yield}</span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{m.aum}</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">{m.min} &middot; {m.access}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lead Magnet */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <ContextualLeadMagnet segment="fee-audit" />
        </div>
      </section>

      {/* Section 3: P2P Lending */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 3</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">P2P Lending Platforms</h2>
          <p className="text-slate-600 leading-relaxed mb-6">
            Peer-to-peer (P2P) lending platforms connect individual investors directly with borrowers, cutting out the bank. In Australia, P2P platforms are regulated by ASIC and must hold an Australian Financial Services Licence (AFSL) or an Australian Credit Licence (ACL).
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Platform</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Focus</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Returns</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Minimum</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "Plenti", focus: "Personal & auto loans", returns: "5–8% p.a.", min: "$10" },
                  { name: "La Trobe Financial", focus: "Mortgage-backed credit fund", returns: "6.5–7.5% p.a.", min: "$20,000" },
                  { name: "Zagga", focus: "Property-secured loans", returns: "7–10% p.a.", min: "$10,000" },
                  { name: "Bigstone (closed)", focus: "Was SME loans (no longer operating)", returns: "N/A", min: "N/A" },
                ].map((r, i) => (
                  <tr key={r.name} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="py-2.5 px-3 font-bold text-amber-700 border-b border-slate-100">{r.name}</td>
                    <td className="py-2.5 px-3 text-slate-800 border-b border-slate-100">{r.focus}</td>
                    <td className="py-2.5 px-3 text-slate-800 border-b border-slate-100">{r.returns}</td>
                    <td className="py-2.5 px-3 text-slate-500 border-b border-slate-100">{r.min}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mt-6">
            <h3 className="font-bold text-slate-900 mb-2">P2P vs Private Credit Funds</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              P2P platforms offer lower minimums and direct loan selection, but less diversification. Private credit funds pool capital across hundreds of loans, providing professional credit underwriting, diversification, and typically more consistent returns — albeit with less liquidity and higher minimums.
            </p>
          </div>
        </div>
      </section>

      {/* Section 4: ASX-Listed Exposure */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 4</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">ASX-Listed Private Credit Exposure</h2>
          <p className="text-slate-600 leading-relaxed mb-6">
            Retail investors can access private credit via ASX-listed investment trusts, removing lock-up periods and wholesale investor requirements.
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">ASX Code</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Name</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Strategy</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Yield</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { code: "MXT", name: "Metrics Master Income Trust", strategy: "Diversified corporate & real estate loans", yield: "~7% p.a." },
                  { code: "MOT", name: "Metrics Income Opportunities Trust", strategy: "Higher-yielding private credit", yield: "~8–9% p.a." },
                  { code: "QAL", name: "Qualitas Real Estate Finance", strategy: "CRE private credit", yield: "~8–10% p.a." },
                  { code: "GCI", name: "Gryphon Capital Income Trust", strategy: "Residential mortgage-backed", yield: "~7% p.a." },
                  { code: "PCI", name: "Perpetual Credit Income Trust", strategy: "Corporate credit & fixed income", yield: "~6–7% p.a." },
                ].map((r, i) => (
                  <tr key={r.code} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="py-2.5 px-3 font-bold text-amber-700 border-b border-slate-100">{r.code}</td>
                    <td className="py-2.5 px-3 text-slate-800 border-b border-slate-100">{r.name}</td>
                    <td className="py-2.5 px-3 text-slate-500 border-b border-slate-100">{r.strategy}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 border-b border-slate-100">{r.yield}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 5: SMSF & Private Credit */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 5</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Private Credit for SMSF Trustees</h2>

          <div className="prose prose-slate max-w-none">
            <p>
              Self-managed super funds (SMSFs) are among the most active allocators to private credit in Australia. With $900B+ in assets seeking yield above cash and term deposits, SMSFs are increasingly using private credit as a core income allocation.
            </p>
            <h3>SMSF Eligibility</h3>
            <ul>
              <li><strong>ASX-listed trusts</strong> (MXT, MOT, QAL) — straightforward, no wholesale requirement</li>
              <li><strong>Unlisted funds</strong> — must satisfy the <strong>sole purpose test</strong> and the fund&apos;s investment strategy must document the allocation</li>
              <li><strong>Valuation</strong> — unlisted credit fund holdings must be valued at market value for annual reporting</li>
              <li><strong>Liquidity</strong> — trustees should ensure sufficient liquidity to pay pensions and meet benefit payments</li>
            </ul>
            <h3>Tax Advantages in Super</h3>
            <ul>
              <li>Interest income taxed at <strong>15%</strong> in accumulation phase (vs. marginal rate outside super)</li>
              <li><strong>0% tax</strong> in retirement pension phase</li>
              <li>No CGT on disposal of listed credit trust units in pension phase</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 6: Risk & Return */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 6</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Risk &amp; Return Profile</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-bold text-slate-900 mb-4">Private Credit Funds</h3>
              <dl className="space-y-3">
                {[
                  { dt: "Target returns", dd: "6–10% p.a. (floating rate)" },
                  { dt: "Liquidity", dd: "Monthly to quarterly (some lock-ups of 1–3 years)" },
                  { dt: "Security", dd: "Typically first-lien or senior secured" },
                  { dt: "Correlation to equities", dd: "Low — income-driven, not equity-linked" },
                  { dt: "Minimum investment", dd: "$20,000 – $500,000" },
                ].map((item) => (
                  <div key={item.dt} className="flex justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
                    <dt className="text-sm text-slate-500 shrink-0">{item.dt}</dt>
                    <dd className="text-sm font-semibold text-slate-800 text-right">{item.dd}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-bold text-slate-900 mb-4">P2P Lending</h3>
              <dl className="space-y-3">
                {[
                  { dt: "Target returns", dd: "5–10% p.a. (varies by loan grade)" },
                  { dt: "Liquidity", dd: "Loan term (1–5 years); some secondary markets" },
                  { dt: "Security", dd: "Often unsecured personal/auto loans" },
                  { dt: "Default risk", dd: "Higher — direct exposure to individual borrowers" },
                  { dt: "Minimum investment", dd: "$10 – $10,000" },
                ].map((item) => (
                  <div key={item.dt} className="flex justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
                    <dt className="text-sm text-slate-500 shrink-0">{item.dt}</dt>
                    <dd className="text-sm font-semibold text-slate-800 text-right">{item.dd}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <h3 className="font-bold text-red-800 mb-2">Key Risks</h3>
            <ul className="text-sm text-red-700 space-y-1.5">
              <li><strong>Credit/default risk</strong> — borrowers may fail to repay; loss of capital is possible</li>
              <li><strong>Illiquidity risk</strong> — unlisted funds may gate redemptions in stressed markets (as some did in 2020)</li>
              <li><strong>Valuation opacity</strong> — private loans are harder to mark-to-market than listed bonds</li>
              <li><strong>Interest rate risk</strong> — while floating rates benefit in rising rate environments, rate cuts reduce income</li>
              <li><strong>Manager risk</strong> — credit underwriting quality varies dramatically between fund managers</li>
              <li><strong>Concentration risk</strong> — some funds concentrated in a single sector (e.g., commercial real estate)</li>
            </ul>
          </div>
        </div>
      </section>


      {/* Find an Advisor */}
      {advisors && advisors.length > 0 && (
        <section className="py-14 bg-white">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Expert Advisors</p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">{ADVISOR_DIRECTORY_HEADING}</h2>
            <p className="text-sm text-slate-500 mb-6">{ADVISOR_DIRECTORY_SUBTEXT}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(advisors as { slug: string; name: string; firm_name: string | null; type: string; location_display: string | null; rating: number | null; review_count: number | null; photo_url: string | null; verified: boolean | null }[]).map((advisor) => (
                <Link
                  key={advisor.slug}
                  href={`/advisor/${advisor.slug}`}
                  className="flex items-start gap-4 bg-white border border-slate-200 rounded-xl p-4 hover:border-amber-200 hover:shadow-md transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {advisor.photo_url ? (
                      <img src={advisor.photo_url} alt={advisor.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-slate-400">{advisor.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors">{advisor.name}</p>
                      {SHOW_ADVISOR_VERIFIED_BADGE && advisor.verified && <span className="text-[0.6rem] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">VERIFIED</span>}
                    </div>
                    {advisor.firm_name && <p className="text-xs text-slate-500">{advisor.firm_name}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      {SHOW_ADVISOR_RATINGS && advisor.rating && <span className="text-xs text-amber-600 font-semibold">&#9733; {advisor.rating.toFixed(1)}</span>}
                      {SHOW_ADVISOR_RATINGS && advisor.review_count && advisor.review_count > 0 && <span className="text-xs text-slate-400">({advisor.review_count} reviews)</span>}
                      {advisor.location_display && <span className="text-xs text-slate-400">{advisor.location_display}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-4 text-center">
              <Link href="/advisors" className="text-sm font-semibold text-amber-600 hover:text-amber-700">
                Browse all advisors &rarr;
              </Link>
            </div>
          </div>
        </section>
      )}
      {/* Related guides */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Related Guides</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Explore Related Investment Guides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "Hybrid Securities", href: "/invest/hybrid-securities", desc: "ASX-listed bank hybrids offering franked yields above term deposits." },
              { title: "Bonds & Fixed Income", href: "/invest/bonds", desc: "Government and corporate bonds for stable income and capital preservation." },
              { title: "Managed Funds & Index Funds", href: "/invest/managed-funds", desc: "Compare passive index funds and actively managed strategies in Australia." },
              { title: "SMSF Investment Guide", href: "/invest/smsf", desc: "What SMSFs actually invest in — property, shares, crypto and more." },
            ].map((guide) => (
              <Link key={guide.href} href={guide.href} className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-amber-200 hover:shadow-md transition-all">
                <h3 className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors">{guide.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{guide.desc}</p>
                <span className="inline-flex items-center text-amber-600 text-sm font-semibold mt-2">Read guide →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">FAQ</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqSchema.mainEntity.map((faq: { name: string; acceptedAnswer: { text: string } }) => (
              <details key={faq.name} className="group bg-white border border-slate-200 rounded-xl">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-bold text-slate-900 hover:text-amber-600 transition-colors">
                  {faq.name}
                  <svg className="w-4 h-4 text-slate-400 shrink-0 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </summary>
                <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{faq.acceptedAnswer.text}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 bg-white">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Speak to a Financial Planner About Private Credit</h2>
              <p className="text-sm text-slate-500">
                Private credit allocations should be tailored to your risk profile, income needs, and overall portfolio. Connect with a verified Australian financial planner.
              </p>
            </div>
            <Link
              href="/advisors/financial-planners"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors shrink-0"
            >
              Find a Financial Planner &rarr;
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
