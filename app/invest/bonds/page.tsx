import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, SITE_NAME, CURRENT_YEAR, UPDATED_LABEL, breadcrumbJsonLd } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `How to Invest in Bonds in Australia (${CURRENT_YEAR})`,
  description:
    "Complete guide to Australian bonds: government bonds, bond ETFs, corporate bonds, interest rate risk, yield, duration, tax treatment, and portfolio allocation.",
  alternates: { canonical: `${SITE_URL}/invest/bonds` },
  openGraph: {
    title: `How to Invest in Bonds in Australia (${CURRENT_YEAR})`,
    description:
      "Complete guide to Australian bonds: government bonds, bond ETFs, corporate bonds, interest rate risk, yield, duration, tax treatment, and portfolio allocation.",
    url: `${SITE_URL}/invest/bonds`,
    images: [{ url: `/api/og?title=${encodeURIComponent("How to Invest in Bonds Australia")}&sub=${encodeURIComponent("Government · Corporate · Bond ETFs · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

const faqs = [
  {
    q: "How do interest rates affect bond prices?",
    a: "Bond prices and interest rates move in opposite directions. When the RBA raises rates, newly issued bonds offer higher coupons, making existing bonds with lower coupons less attractive — so their prices fall. When rates fall, existing bonds paying higher coupons become more valuable, pushing prices up. The sensitivity of a bond's price to rate changes is measured by its duration: a bond with a modified duration of 5 will lose roughly 5% of its price if rates rise by 1%, and gain 5% if rates fall by 1%.",
  },
  {
    q: "What are the safest bonds to invest in Australia?",
    a: "Australian Government Bonds (AGBs) issued by the Commonwealth are the safest, carrying Australia's sovereign credit rating (AAA by S&P). These are backed by the full faith and credit of the Australian government and are considered essentially risk-free from a credit standpoint. State government (semi-government) bonds are the next safest tier, rated AA or higher. For retail investors, bond ETFs such as IAF or VGB provide diversified exposure to these high-quality bonds.",
  },
  {
    q: "Should I buy bond ETFs or individual bonds?",
    a: "For most retail investors, bond ETFs are the better choice. Individual bonds require a minimum of around $10,000 per bond, are harder to buy (typically via a broker or directly from the ASX for exchange-traded bonds), and expose you to single-issuer credit risk. Bond ETFs like IAF (iShares Core Composite, 0.15% MER) or VBND (Vanguard Global Aggregate, 0.20% MER) offer instant diversification across hundreds or thousands of bonds, intraday ASX liquidity, simpler tax reporting (you receive a distribution rather than managing individual coupon income), and low minimum investment.",
  },
  {
    q: "Are Australian government bonds a good investment now?",
    a: "Whether AGBs are appropriate depends on your situation: time horizon, income needs, and view on interest rates. Government bonds provide capital preservation and certainty of cash flows, making them particularly valuable for investors nearing retirement or seeking diversification from equity volatility. In a rising rate environment, existing bond prices fall — though you receive the face value at maturity. For long-term investors, the yield-to-maturity at the time of purchase is the key figure. Current yields are available via the AOFM and the RBA website.",
  },
  {
    q: "How is bond income taxed in Australia?",
    a: "Interest income from bonds (coupon payments) is assessed as ordinary income at your marginal tax rate in the year received — the same as interest on a bank account. If you sell a bond at a profit, the gain is subject to CGT rules: a 50% CGT discount applies if you held the bond for more than 12 months. If you buy a bond at a discount to face value (e.g., a zero-coupon bond), Division 16E of the Tax Act may treat part or all of the discount as assessable income rather than a capital gain, adding complexity. Bond ETFs simplify this — you receive annual fund distributions and a single annual tax statement. Consider speaking with a tax adviser if you hold individual bonds.",
  },
];

export default function BondsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Investing", url: `${SITE_URL}/invest` },
    { name: "Bonds" },
  ]);

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `How to Invest in Bonds in Australia (${CURRENT_YEAR})`,
    url: `${SITE_URL}/invest/bonds`,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  const faqSchema = faqJsonLd(faqs);

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
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      {/* Hero */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav
            className="flex items-center gap-1.5 text-xs text-slate-500 mb-6"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="hover:text-slate-900 transition-colors">
              Home
            </Link>
            <span className="text-slate-300">/</span>
            <Link href="/invest" className="hover:text-slate-900 transition-colors">
              Investing
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Bonds</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
              {UPDATED_LABEL}
            </span>
            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
              Fixed Income
            </span>
            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
              Capital Preservation
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl text-slate-900">
            How to Invest in Bonds in Australia
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed max-w-2xl">
            Bonds are loans to governments or corporations that pay a regular interest stream
            (coupon). They carry lower risk than shares but typically lower long-term returns — and
            they&apos;re a cornerstone of diversified portfolios for capital preservation and
            income.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link
              href="/compare"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              Compare Brokers &rarr;
            </Link>
            <Link
              href="/advisors/financial-planners"
              className="inline-flex items-center gap-2 border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              Find a Financial Planner
            </Link>
          </div>
        </div>
      </section>

      {/* Key stat pills */}
      <section className="py-10 bg-white border-b border-slate-100">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "AAA", label: "Commonwealth sovereign rating (S&P)" },
              { value: "Fixed income", label: "Regular coupon payments to investors" },
              { value: "0.15%", label: "Lowest-cost Aust. bond ETF MER (IAF)" },
              { value: "Inverse", label: "Bond prices vs. interest rates move" },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center"
              >
                <p className="text-2xl font-extrabold text-amber-600">{s.value}</p>
                <p className="text-xs text-slate-600 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 1: Bond Basics */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">
            Section 1
          </p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Bond Basics</h2>

          <div className="prose prose-slate max-w-none mb-8">
            <p>
              When you buy a bond, you are lending money to the issuer — a government, state, or
              corporation — for a fixed period. In return the issuer pays a regular interest payment
              called a <strong>coupon</strong>, then repays the original loan amount (the{" "}
              <strong>face value</strong> or <strong>par value</strong>) at the end of the term (
              <strong>maturity date</strong>). Bonds provide a predictable income stream and are
              generally lower risk than equities, making them essential for diversification and
              capital preservation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {[
              {
                term: "Face value (par)",
                def: "The amount the issuer repays at maturity — typically $100 or $1,000 per bond.",
                color: "bg-blue-50 border-blue-200",
              },
              {
                term: "Coupon rate",
                def: "The annual interest rate as a percentage of face value. A 5% coupon on a $1,000 bond pays $50 per year.",
                color: "bg-green-50 border-green-200",
              },
              {
                term: "Maturity date",
                def: "When the issuer repays the face value. Can range from 1 year to 30+ years (long-dated government bonds).",
                color: "bg-purple-50 border-purple-200",
              },
              {
                term: "Yield",
                def: "The return you actually earn, accounting for the price paid. If you buy at a discount, yield exceeds the coupon rate.",
                color: "bg-amber-50 border-amber-200",
              },
              {
                term: "Credit rating",
                def: "Assessment of the issuer's ability to repay. Ranges from AAA (highest quality) down to junk. Higher rating = lower yield.",
                color: "bg-red-50 border-red-200",
              },
              {
                term: "Duration",
                def: "Measure of interest rate sensitivity. A duration of 6 means the bond price falls ~6% if rates rise 1%.",
                color: "bg-slate-50 border-slate-200",
              },
            ].map((item) => (
              <div key={item.term} className={`border rounded-xl p-4 ${item.color}`}>
                <p className="font-bold text-slate-900 text-sm">{item.term}</p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.def}</p>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <h3 className="font-bold text-slate-900 mb-2">
              Bond prices and interest rates move in opposite directions
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              This is the single most important concept for bond investors. When interest rates rise,
              newly issued bonds offer better yields, so existing bonds become less attractive and
              their prices fall. When rates fall, existing bonds&apos; fixed coupons look more
              attractive and prices rise. Long-duration bonds (longer to maturity) are more sensitive
              to this effect than short-duration bonds.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: Types of Bonds */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">
            Section 2
          </p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
            Types of Bonds Available in Australia
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            From Commonwealth Government Securities to international bonds via ETFs.
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-200 mb-6">
            <table className="w-full text-sm border-collapse" aria-label="Types of bonds available in Australia">
              <thead>
                <tr className="bg-slate-50">
                  <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">
                    Type
                  </th>
                  <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">
                    Issuer / Examples
                  </th>
                  <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">
                    Risk
                  </th>
                  <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    type: "Australian Government Bonds (AGBs)",
                    issuer: "Commonwealth of Australia (AOFM)",
                    risk: "Lowest",
                    notes:
                      "AAA-rated; exchangeable bonds (EXBs) tradeable on ASX. Yields typically below inflation-adjusted equity returns but safest available.",
                  },
                  {
                    type: "Semi-government bonds",
                    issuer: "State governments (NSW TCorp, VicFin, QTC etc.)",
                    risk: "Very low",
                    notes:
                      "Slightly higher yield than AGBs; still investment grade (AA or higher). Backed by state government guarantee.",
                  },
                  {
                    type: "Investment-grade corporate bonds",
                    issuer: "Major banks, blue-chip corporates (BBB- and above)",
                    risk: "Low–medium",
                    notes:
                      "Higher yield than government bonds in exchange for credit risk. Accessible via XTBs on ASX or bond ETFs.",
                  },
                  {
                    type: "High yield / sub-investment grade",
                    issuer: "Smaller or lower-rated corporates (below BBB-)",
                    risk: "Medium–high",
                    notes:
                      "Sometimes called 'junk bonds'. Higher yield but material default risk. Limited direct retail access in Australia.",
                  },
                  {
                    type: "Hybrid securities / bank notes",
                    issuer: "CBA PERLS, NAB Capital Notes, ANZ Capital Notes",
                    risk: "Medium",
                    notes:
                      "AT1 capital instruments — NOT true bonds. Complex; can be written off or converted to equity by APRA. Treat with caution.",
                  },
                  {
                    type: "Inflation-linked bonds",
                    issuer: "Commonwealth ILBS; Treasury Indexed Bonds (TIBs)",
                    risk: "Very low",
                    notes:
                      "Face value and coupons adjust with CPI. Protect purchasing power over long horizons. Lower starting yield.",
                  },
                  {
                    type: "International bonds",
                    issuer: "US Treasuries, global corporates",
                    risk: "Varies",
                    notes:
                      "Usually accessed via hedged ETFs (e.g., VBND) for Australian retail investors. Currency-hedged to remove AUD/USD risk.",
                  },
                ].map((r, i) => (
                  <tr key={r.type} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="py-3 px-4 font-semibold text-slate-900 border-b border-slate-100">
                      {r.type}
                    </td>
                    <td className="py-3 px-4 text-slate-600 border-b border-slate-100">
                      {r.issuer}
                    </td>
                    <td className="py-3 px-4 text-slate-600 border-b border-slate-100">{r.risk}</td>
                    <td
                      className="py-3 px-4 text-slate-500 border-b border-slate-100"
                    >{r.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <h3 className="font-bold text-red-800 mb-2">
              Hybrid securities are not the same as bonds
            </h3>
            <p className="text-sm text-red-700 leading-relaxed">
              Bank AT1 capital instruments (CBA PERLS, NAB Capital Notes, Westpac Capital Notes)
              are sometimes marketed alongside bonds. They pay floating income above BBSW and are
              popular with SMSF investors seeking yield. However, they carry provisions allowing
              APRA to write them off or convert them to ordinary shares during a banking crisis —
              a risk not present in genuine bonds. Always read the PDS before investing.
            </p>
          </div>
        </div>
      </section>

      {/* Section 3: Bond ETFs */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">
            Section 3
          </p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
            Bond ETFs on the ASX — Comparison Table
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            ASX-listed bond ETFs are the simplest way for retail investors to access fixed income.
            Buy through any broker like an ordinary share. Data approximate — verify with the fund
            manager.
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-200 mb-4">
            <table className="w-full text-sm border-collapse" aria-label="Bond ETFs on the ASX comparison">
              <thead>
                <tr className="bg-slate-50">
                  <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">
                    ASX Code
                  </th>
                  <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">
                    Fund Name
                  </th>
                  <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">
                    Exposure
                  </th>
                  <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">
                    ~MER p.a.
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    code: "VBND",
                    name: "Vanguard Global Aggregate Bond Index (AUD Hedged)",
                    exposure: "15,000+ global investment-grade bonds, hedged to AUD",
                    mer: "0.20%",
                  },
                  {
                    code: "IAF",
                    name: "iShares Core Composite Bond ETF",
                    exposure: "Australian govt, semi-govt, and corporate bonds",
                    mer: "0.15%",
                  },
                  {
                    code: "BOND",
                    name: "SPDR S&P/ASX Australian Bond ETF",
                    exposure: "Australian investment-grade bonds (govt + corporate)",
                    mer: "0.24%",
                  },
                  {
                    code: "IGB",
                    name: "iShares Government Inflation ETF",
                    exposure: "Inflation-linked Australian government bonds (CPI-indexed)",
                    mer: "0.18%",
                  },
                  {
                    code: "VGB",
                    name: "Vanguard Australian Government Bond Index ETF",
                    exposure: "Australian government bonds only (no corporate credit)",
                    mer: "0.20%",
                  },
                ].map((r, i) => (
                  <tr key={r.code} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="py-3 px-4 font-bold text-amber-700 border-b border-slate-100">
                      {r.code}
                    </td>
                    <td className="py-3 px-4 text-slate-800 border-b border-slate-100">{r.name}</td>
                    <td className="py-3 px-4 text-slate-500 border-b border-slate-100">
                      {r.exposure}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700 border-b border-slate-100">
                      {r.mer}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400">
            MER = Management Expense Ratio. Past performance is not a reliable indicator of future
            returns. Verify current fees and composition with each fund manager before investing.
          </p>
        </div>
      </section>

      {/* Section 4: Yield and Return */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">
            Section 4
          </p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
            Understanding Bond Yield and Return
          </h2>

          <div className="prose prose-slate max-w-none mb-6">
            <p>
              The <strong>running yield</strong> (current yield) is the simplest measure: annual
              coupon divided by the current market price. If you paid $950 for a bond with a $50
              annual coupon, your running yield is 5.26%. But this ignores the capital gain you
              receive when the bond matures at $1,000 face value.
            </p>
            <p>
              <strong>Yield to maturity (YTM)</strong> is the more complete measure. It accounts
              for all future coupon payments, the return of face value at maturity, and the time
              value of money. YTM assumes you reinvest each coupon at the same rate — if you can
              do that, you earn exactly the stated YTM. Total return on a bond has two components:
              income (coupon receipts) and price change (capital gain or loss if sold before
              maturity).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                label: "Running yield",
                formula: "Annual coupon ÷ Current price",
                note: "Simple but ignores capital gain/loss at maturity",
              },
              {
                label: "Yield to maturity (YTM)",
                formula: "IRR of all future cash flows (coupons + face value)",
                note: "The number to use when comparing bonds",
              },
              {
                label: "Total return",
                formula: "Coupon income + Price change",
                note: "Positive if rates fall; negative if rates rise and you sell early",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-white border border-slate-200 rounded-xl p-5"
              >
                <p className="font-bold text-slate-900 text-sm">{item.label}</p>
                <p className="text-xs font-mono text-amber-700 bg-amber-50 rounded px-2 py-1 mt-2">
                  {item.formula}
                </p>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">{item.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5: Duration and Interest Rate Risk */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">
            Section 5
          </p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
            Duration and Interest Rate Risk
          </h2>

          <div className="prose prose-slate max-w-none mb-6">
            <p>
              <strong>Modified duration</strong> is the most practical measure of interest rate
              risk. It tells you approximately how much a bond&apos;s price will change for a 1%
              move in interest rates. A bond with a modified duration of 7 will lose roughly 7% of
              its value if rates rise by 1 percentage point, and gain roughly 7% if rates fall by 1
              percentage point.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-5">
              <h3 className="font-bold text-slate-900 mb-2">Short duration bonds</h3>
              <ul className="text-sm text-slate-600 space-y-1.5">
                <li>
                  <span className="font-semibold">Maturity:</span> 1–3 years
                </li>
                <li>
                  <span className="font-semibold">Rate sensitivity:</span> Low
                </li>
                <li>
                  <span className="font-semibold">Typical yield:</span> Lower (closer to cash rate)
                </li>
                <li>
                  <span className="font-semibold">Suits:</span> Investors who need capital
                  stability or expect rates to rise
                </li>
              </ul>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <h3 className="font-bold text-slate-900 mb-2">Long duration bonds</h3>
              <ul className="text-sm text-slate-600 space-y-1.5">
                <li>
                  <span className="font-semibold">Maturity:</span> 10–30 years
                </li>
                <li>
                  <span className="font-semibold">Rate sensitivity:</span> High
                </li>
                <li>
                  <span className="font-semibold">Typical yield:</span> Higher (term premium)
                </li>
                <li>
                  <span className="font-semibold">Suits:</span> Investors who expect rates to fall,
                  or long-term pension matching
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <p className="text-sm text-slate-700 leading-relaxed">
              <strong>Current rate environment:</strong> Always check current RBA cash rate and
              Australian government bond yields (available at rba.gov.au and aofm.gov.au) before
              making duration decisions. Duration risk cut bond portfolios significantly when rates
              rose rapidly in 2022–2023. As rates stabilise or fall, longer-duration bonds tend to
              outperform. The right duration depends on your investment horizon and rate outlook.
            </p>
          </div>
        </div>
      </section>

      {/* Section 6: Credit Ratings */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">
            Section 6
          </p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
            Credit Ratings and Yield Spreads
          </h2>

          <div className="prose prose-slate max-w-none mb-6">
            <p>
              Credit ratings — assigned by S&amp;P, Moody&apos;s, and Fitch — assess the
              probability that an issuer will meet its debt obligations. <strong>Investment grade</strong>{" "}
              is BBB- and above; below this is sub-investment grade (&quot;junk&quot; or high
              yield). Australian sovereign bonds (AAA) sit at the top; Australian bank senior bonds
              are typically rated A or AA.
            </p>
            <p>
              Investors demand a higher yield to hold lower-rated bonds — this premium over the
              risk-free rate is called the <strong>credit spread</strong>. A corporate bond yielding
              1.5% more than a same-maturity government bond has a credit spread of 150 basis points.
              When markets become nervous, spreads widen — the price of lower-rated bonds falls
              relative to government bonds.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm border-collapse" aria-label="Credit ratings and yield spreads">
              <thead>
                <tr className="bg-slate-50">
                  <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">
                    Rating (S&amp;P)
                  </th>
                  <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">
                    Category
                  </th>
                  <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">
                    Australian Examples
                  </th>
                  <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">
                    Relative Yield
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    rating: "AAA",
                    cat: "Investment grade",
                    ex: "Commonwealth of Australia",
                    yield: "Lowest — benchmark",
                  },
                  {
                    rating: "AA",
                    cat: "Investment grade",
                    ex: "State govts, CBA, ANZ (senior)",
                    yield: "Small premium to govt",
                  },
                  {
                    rating: "A",
                    cat: "Investment grade",
                    ex: "Large corporates, bank sub-debt",
                    yield: "Moderate spread",
                  },
                  {
                    rating: "BBB",
                    cat: "Investment grade (lowest tier)",
                    ex: "Mid-tier corporates, some utilities",
                    yield: "Wider spread vs govt",
                  },
                  {
                    rating: "BB and below",
                    cat: "Sub-investment grade / high yield",
                    ex: "Smaller companies, stressed issuers",
                    yield: "Significantly higher yield",
                  },
                ].map((r, i) => (
                  <tr key={r.rating} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="py-3 px-4 font-bold text-amber-700 border-b border-slate-100">
                      {r.rating}
                    </td>
                    <td className="py-3 px-4 text-slate-700 border-b border-slate-100">{r.cat}</td>
                    <td className="py-3 px-4 text-slate-500 border-b border-slate-100">{r.ex}</td>
                    <td className="py-3 px-4 text-slate-600 border-b border-slate-100">{r.yield}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 7: Tax Treatment */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">
            Section 7
          </p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
            Tax Treatment of Bonds in Australia
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-bold text-slate-900 mb-3">Coupon (interest) income</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Interest payments are assessed as ordinary income in the year received — taxed at
                your marginal rate, the same as bank account interest. No franking credits apply to
                bond income (unlike share dividends from Australian companies).
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-bold text-slate-900 mb-3">Capital gain on sale</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                If you sell a bond at a profit before maturity, the gain is subject to CGT. The 50%
                CGT discount applies if you held the bond for more than 12 months. Capital losses
                can offset capital gains elsewhere in your portfolio.
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <h3 className="font-bold text-slate-900 mb-3">Discount bonds — Division 16E</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                If you buy a bond at a discount to face value (common for zero-coupon bonds), the
                Australian Tax Act may treat part of the gain as assessable income rather than a
                capital gain under Division 16E. This removes the CGT discount benefit on that
                portion. Tax complexity is one reason many retail investors prefer bond ETFs.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h3 className="font-bold text-slate-900 mb-3">Bond ETF tax treatment</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Bond ETF investors receive annual distributions (typically quarterly) and a single
                AMMA (attribution managed investment trust) tax statement. The fund handles the
                complexity of coupon income and bond trading internally. CGT rules apply when you
                sell ETF units.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-400 italic">
            Tax treatment depends on individual circumstances. Consider speaking with a registered
            tax adviser before investing in direct bonds.
          </p>
        </div>
      </section>

      {/* Section 8: When to Hold Bonds / Portfolio Allocation */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">
            Section 8
          </p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
            Portfolio Allocation — When and How Much?
          </h2>

          <div className="prose prose-slate max-w-none mb-6">
            <p>
              Bonds serve multiple roles: income generation, capital preservation, and portfolio
              diversification. Because bond returns are largely uncorrelated with share returns (and
              sometimes negatively correlated), adding bonds to an equity portfolio reduces
              volatility — even if it also reduces average long-term returns.
            </p>
            <p>
              The old &quot;age in bonds&quot; rule of thumb (hold your age as a percentage in
              bonds) is now considered too conservative. In an era of lower yields, holding 60%+
              in bonds by age 60 means accepting very low real returns while capital preservation
              needs remain high. Modern target-date funds and risk-based models typically suggest:
            </p>
            <ul>
              <li>
                <strong>Growth phase (20s–40s)</strong> — 5–15% defensive allocation; equities do
                the heavy lifting. Young investors are often underweight bonds relative to their
                risk capacity.
              </li>
              <li>
                <strong>Accumulation phase (40s–50s)</strong> — 15–30% bonds; begin building
                defensive buffer as retirement approaches.
              </li>
              <li>
                <strong>Pre-retirement / retirement (60s+)</strong> — 30–50%+ in bonds and other
                defensive assets; capital preservation and income become primary objectives.
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                profile: "Growth portfolio",
                allocation: "~10% bonds",
                note: "Primarily equities; bonds for diversification buffer",
                color: "border-green-200 bg-green-50",
              },
              {
                profile: "Balanced portfolio (60/40)",
                allocation: "~40% bonds",
                note: "Classic institutional benchmark; income + growth balance",
                color: "border-blue-200 bg-blue-50",
              },
              {
                profile: "Conservative / pension",
                allocation: "50–70% bonds",
                note: "Capital preservation focus; steady income stream in retirement",
                color: "border-purple-200 bg-purple-50",
              },
            ].map((item) => (
              <div key={item.profile} className={`border rounded-xl p-5 ${item.color}`}>
                <p className="font-bold text-slate-900">{item.profile}</p>
                <p className="text-2xl font-extrabold text-amber-600 my-2">{item.allocation}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{item.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 9: Direct Bonds vs Bond ETFs */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">
            Section 9
          </p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
            Direct Bonds vs Bond ETFs
          </h2>

          <div className="overflow-x-auto rounded-xl border border-slate-200 mb-6">
            <table className="w-full text-sm border-collapse" aria-label="Direct bonds vs bond ETFs comparison">
              <thead>
                <tr className="bg-slate-50">
                  <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">
                    Factor
                  </th>
                  <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">
                    Direct bonds
                  </th>
                  <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">
                    Bond ETFs
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    f: "Minimum investment",
                    direct: "$10,000+ per bond typical",
                    etf: "1 ETF unit (often $20–$100)",
                  },
                  {
                    f: "Diversification",
                    direct: "Single issuer; concentrated credit risk",
                    etf: "Hundreds to thousands of bonds",
                  },
                  {
                    f: "How to buy",
                    direct: "Broker, AOFM direct (govt only), or ASX XTBs",
                    etf: "Any ASX broker like buying shares",
                  },
                  {
                    f: "Liquidity",
                    direct: "Variable; some bonds thinly traded",
                    etf: "Intraday ASX liquidity",
                  },
                  {
                    f: "Certainty at maturity",
                    direct: "Receive exact face value at maturity",
                    etf: "No maturity; price fluctuates with market",
                  },
                  {
                    f: "Tax reporting",
                    direct: "Complex; track each bond&apos;s coupon and cost base",
                    etf: "Annual AMMA statement; simpler reporting",
                  },
                  {
                    f: "Fees",
                    direct: "Brokerage per trade; no ongoing MER",
                    etf: "0.15–0.24% MER; brokerage per trade",
                  },
                  {
                    f: "Suitable for",
                    direct: "Sophisticated investors; large portfolios",
                    etf: "Most retail and SMSF investors",
                  },
                ].map((r, i) => (
                  <tr key={r.f} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="py-3 px-4 font-semibold text-slate-900 border-b border-slate-100">
                      {r.f}
                    </td>
                    <td
                      className="py-3 px-4 text-slate-600 border-b border-slate-100"
                    >{r.direct}</td>
                    <td className="py-3 px-4 text-slate-600 border-b border-slate-100">{r.etf}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <p className="text-sm text-slate-700 leading-relaxed">
              <strong>Bottom line:</strong> For most Australian retail investors, bond ETFs — particularly
              IAF (0.15% MER) or VGB (government bonds only, 0.20%) — offer the simplest, lowest-cost
              route to fixed income exposure. Direct bonds make sense for large portfolios (typically
              $500K+ in fixed income) where matching specific maturities or holding to redemption
              matters, or for SMSF trustees who prefer individual CGS for certainty.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">FAQ</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.q}
                className="group bg-white border border-slate-200 rounded-xl"
              >
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-bold text-slate-900 hover:text-amber-600 transition-colors">
                  {faq.q}
                  <svg
                    className="w-4 h-4 text-slate-400 shrink-0 group-open:rotate-180 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* General Advice Warning */}
      <section className="py-8 bg-white border-t border-slate-100">
        <div className="container-custom max-w-4xl">
          <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
        </div>
      </section>

      {/* Related guides */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">
            Related Guides
          </p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">
            Explore Related Investment Guides
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: "ETFs in Australia",
                href: "/invest/etfs",
                desc: "How to invest in exchange-traded funds on the ASX — index funds, thematic ETFs, and active ETFs.",
              },
              {
                title: "Infrastructure Investment",
                href: "/invest/infrastructure",
                desc: "Toll roads, airports, utilities — stable, inflation-linked cash flows for income-focused portfolios.",
              },
              {
                title: "Income-Generating Assets",
                href: "/invest/income-assets",
                desc: "Dividend shares, REITs, bonds, and other assets for investors seeking regular income.",
              },
              {
                title: "SMSF Investment Guide",
                href: "/invest/smsf",
                desc: "How self-managed super funds invest — including fixed income, property, and alternatives.",
              },
            ].map((guide) => (
              <Link
                key={guide.href}
                href={guide.href}
                className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-amber-200 hover:shadow-md transition-all"
              >
                <h3 className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                  {guide.title}
                </h3>
                <p className="text-sm text-slate-500 mt-1">{guide.desc}</p>
                <span className="inline-flex items-center text-amber-600 text-sm font-semibold mt-2">
                  Read guide &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Advisor CTA */}
      <section className="py-14 bg-white">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <svg
                className="w-6 h-6 text-amber-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900 mb-1">
                Get personalised fixed income advice
              </h2>
              <p className="text-sm text-slate-500">
                A financial planner can help you size your bond allocation, choose the right
                duration, and integrate fixed income into your super or portfolio strategy.
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
