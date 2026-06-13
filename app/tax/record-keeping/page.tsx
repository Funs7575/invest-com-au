// dated-strings-exempt — long-form template-literal bodies cite fixed legislative dates (pre-CGT 20 Sep 1985, QS depreciation 15 Sep 1987, FY lodgment/retention examples); line markers would render as content.
import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";
import AdvisorPrompt from "@/components/AdvisorPrompt";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Investment Record Keeping Australia (${CURRENT_YEAR}) — ATO Requirements & CGT Records`,
  description: `ATO record keeping for Australian investors: what to keep and for how long, by asset type — shares, property, crypto, ETFs, SMSF. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Investment Record Keeping Australia (${CURRENT_YEAR}) — ATO Requirements`,
    description: "What investment records to keep for Australian tax purposes: 5-year ATO rule, CGT records, shares, property, crypto, and SMSF obligations.",
    url: absoluteUrl("/tax/record-keeping"),
    images: [{ url: `/api/og?title=${encodeURIComponent("Investment Record Keeping Australia")}&sub=${encodeURIComponent("ATO Requirements · CGT Records · 5-Year Rule · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: absoluteUrl("/tax/record-keeping") },
};

const STAT_CARDS = [
  {
    label: "General ATO Rule",
    value: "5 Years",
    sub: "Keep records for 5 years from the date you lodge your tax return (or 5 years after a dispute is resolved)",
    accent: true,
  },
  {
    label: "Property Records",
    value: "20+ Years",
    sub: "Retain property purchase records until 5 years after the year of sale — which can span decades for long-held property",
    accent: false,
  },
  {
    label: "Pre-CGT Assets",
    value: "Pre Sep 1985",
    sub: "Assets acquired before 20 September 1985 are generally exempt from CGT — but you still need records to prove the acquisition date",  // dated-ok
    accent: false,
  },
];

const ASSET_RECORDS = [
  {
    asset: "Shares & ETFs",
    icon: "📊",
    records: [
      "Buy and sell contract notes / broker confirmations for every transaction",
      "Dividend reinvestment plan (DRP) statements — each reinvestment is a separate acquisition",
      "AMMA (Attribution Managed Investment Trust Member Annual) statements if holding AMITs",
      "Annual tax statements from your broker or registry",
      "Corporate action records: share splits, consolidations, mergers, demergers, rights issues, bonus shares",
      "Scrip-for-scrip rollover election forms (cost base carries forward)",
      "Records of any return of capital distributions (reduce your cost base, not income)",
    ],
  },
  {
    asset: "Investment Property",
    icon: "🏠",
    records: [
      "Contract of sale (purchase) and contract of sale (disposal)",
      "Settlement statement from your conveyancer at time of purchase and sale",
      "All capital improvement receipts — extensions, renovations, new fixtures (not maintenance or repairs)",
      "Council rates notices and water rates bills",
      "Land tax assessments",
      "Building and pest inspection reports (part of acquisition costs)",
      "Stamp duty receipts and conveyancing fees invoices",
      "Depreciation schedule from a qualified quantity surveyor (Div 40/43)",
      "Agent commission invoices on sale",
      "Legal costs invoices for purchase and sale",
    ],
  },
  {
    asset: "Managed Funds & ETFs (AMIT)",
    icon: "📋",
    records: [
      "Annual tax statements issued by the fund manager each financial year",
      "AMMA statements detailing assessable income, capital gains, tax offsets, and cost base adjustments",
      "Distribution reinvestment statements (each reinvestment is a new CGT acquisition)",
      "Application and redemption confirmations",
      "Records of any tax components that adjust your cost base (e.g. cost base reductions from non-assessable distributions)",
    ],
  },
  {
    asset: "Cryptocurrency",
    icon: "₿",
    records: [
      "Every transaction: buy, sell, swap, gift, and spend — including date, amount, and the AUD exchange rate at the time",
      "Exchange account statements and trade histories (export CSV from each exchange)",
      "Wallet addresses and transaction IDs (blockchain records as supporting evidence)",
      "Records of crypto-to-crypto swaps (each swap is a CGT disposal at market value)",
      "DeFi activity: staking rewards, liquidity pool entries/exits, yield farming income (treated as ordinary income)",
      "Cost basis method used (FIFO, HIFO, or specific identification — the ATO accepts these methods)",
      "Hard fork and airdrop records (ordinary income at market value on date received)",
    ],
  },
  {
    asset: "SMSF Investments",
    icon: "🏦",
    records: [
      "All investment transaction records (same requirements as above by asset type)",
      "Annual financial statements and tax returns for the fund",
      "Minutes of trustee meetings and investment decisions",
      "Investment strategy document and updates",
      "Actuarial certificates (when fund has members in both accumulation and pension phase)",
      "Pension commencement documentation and transfer balance account reports",
      "Audit trail records — SMSF auditor requires 5 years of records as a minimum",
    ],
  },
];

const SECTIONS = [
  {
    heading: "The ATO's 5-year record keeping rule",
    body: `The Australian Taxation Office (ATO) requires you to keep records for 5 years from the date you lodge your tax return. The clock starts from the lodgement date — not the end of the financial year. If you lodge your 2025–26 return on 31 October 2026, you must keep those records until 31 October 2031.  // dated-ok

**When the 5-year clock restarts:**
If the ATO disputes your return or you amend it, the 5-year period restarts from the date the dispute is resolved or the amendment is lodged. If an audit is in progress, you must retain records throughout.

**The important exception — CGT assets:**
For assets subject to Capital Gains Tax, the 5-year period begins from the date you lodge the return for the year you sold the asset — not the year you bought it. A share purchased in 2010 and sold in 2030 requires records from 2010 to be kept until 2035 (5 years after the 2030 disposal year's return is lodged). In practice: keep all purchase records indefinitely until 5 years after sale.

**Property is the longest obligation:**
A property purchased today and sold in 20 years would require you to keep purchase records for approximately 25 years (purchase date to 5 years after disposal). Many Australians are unaware of this obligation and find themselves unable to reconstruct their cost base when they eventually sell.`,
  },
  {
    heading: "CGT cost base record checklist",
    body: `Your cost base determines the taxable capital gain (or loss) when you sell an asset. Every dollar you can legitimately add to your cost base reduces your CGT liability. Keeping complete records protects you from overpaying tax.

**The five elements of the CGT cost base (s110-25 ITAA 1997):**

1. **Purchase price** — The amount paid for the asset (contract price for property; purchase consideration for shares)

2. **Incidental acquisition costs** — Brokerage on share purchase; stamp duty, legal fees, and conveyancing costs for property; building and pest inspections; title search fees

3. **Ownership costs you could not deduct** — For investment property: non-deductible capital improvements (not maintenance), and costs of owning the asset where no deduction was available. Note: interest on an investment loan IS deductible, so it does NOT go into the cost base

4. **Improvement costs** — Capital expenditure that increased the asset's value or extended its life. For property: extensions, new rooms, structural work, new kitchen or bathroom. NOT: routine repairs, replacing like-for-like components

5. **Incidental disposal costs** — Agent commission on property sale, brokerage on share sale, legal costs, advertising costs for sale

**What does NOT go in the cost base:**
Any cost you have already claimed as a tax deduction (e.g. rental property interest, management fees, insurance) cannot also be added to the cost base — you cannot get a double benefit.`,
  },
  {
    heading: "Improvements vs maintenance — a critical distinction for property",
    body: `One of the most common record-keeping mistakes for investment property owners is confusing capital improvements with deductible maintenance. The distinction has two tax consequences: maintenance is immediately deductible; improvements are added to the cost base (and reduce CGT when you sell).

**Capital improvements — add to cost base:**
- Adding a new room, garage, or extension
- Installing a new kitchen or bathroom (full renovation — not like-for-like replacement)
- Adding a swimming pool, deck, or outdoor structure
- Structural work and underpinning
- Converting a single dwelling into multiple units

**Deductible repairs and maintenance — do NOT add to cost base:**
- Repainting worn surfaces
- Fixing a leaking roof (same materials, same area)
- Replacing broken tiles like-for-like
- Plumbing and electrical repairs
- Garden maintenance, pest control

**The record keeping implication:**
Keep every receipt for any work done on your investment property — even items you believe are repairs. If the ATO reclassifies a repair as an improvement (or vice versa), you need the documentation. Receipts should show the date, description of work, contractor details, and amount paid. Missing receipts for capital improvements means the ATO may not allow the cost base increase.`,
  },
  {
    heading: "Practical tools for investment record keeping",
    body: `Tracking records manually across years is error-prone. Purpose-built tools significantly reduce the burden and improve accuracy — especially for complex portfolios.

**Sharesight — ASX and international share tracking:**
Sharesight automatically imports your transactions from most Australian brokers, calculates your cost base using the correct method (FIFO or specific identification), tracks DRP reinvestments, and produces ATO-compliant CGT and income reports. It handles corporate actions (splits, demergers, bonus shares) which are notoriously difficult to track manually. Free for up to 10 holdings; paid plans from ~$29/month for active investors.

**Koinly — cryptocurrency tax reporting:**
Koinly imports data from hundreds of exchanges and wallets, calculates your CGT for each disposal using ATO rules, and generates a tax report you can hand directly to your accountant. It handles crypto-to-crypto swaps, DeFi activity, staking rewards, and hard fork income. Pricing is based on transaction volume.

**Spreadsheet template (basic portfolio):**
For investors with simple portfolios, a spreadsheet works if maintained consistently. Each tab should cover one asset class. For shares, track: date of purchase, number of shares, price per share, brokerage, total cost base, date of sale, proceeds, brokerage on sale, and calculated gain/loss. For property, track: all acquisition costs, all improvement receipts by date, and all disposal costs.

**Document storage:**
The ATO accepts digital copies of records. Use a cloud storage service (Google Drive, Dropbox, iCloud) with a folder structure by year and asset. Scan or photograph physical receipts at the time you receive them — paper receipts fade and become illegible. The digital copy must be clear and legible; a blurry phone photo is not adequate.`,
  },
  {
    heading: "What happens if you lose records",
    body: `Losing records does not mean you automatically face a large tax bill — but it does create difficulty and potential risk. The ATO's approach depends on the circumstances.

**ATO's position on lost records:**
The ATO may accept reasonable estimates for older assets if you can demonstrate a genuine attempt to reconstruct the records. Reconstruction methods include: contacting your broker for historical transaction data (most keep records for at least 7 years), using exchange historical data from share market data providers (e.g. ASX historical price tables), checking old bank statements for deposits and withdrawals, and reviewing old tax returns for declared income.

**Property — title searches and council records:**
For property, the title search shows the date of transfer of ownership. Council rates notices may provide historical evidence of the property's characteristics. Settlement agents and conveyancers may retain records for some years.

**Broker records:**
Contact your broker's records team. Many Australian brokers retain transaction records for 7–10 years. The CHESS registry (ASX) maintains ownership history.

**If reconstruction fails:**
If you genuinely cannot establish your cost base, the ATO may accept the market value of the asset at the time you first acquired it, if that can be established from independent sources. For very old assets, the ATO has shown flexibility when the taxpayer acts in good faith and provides whatever documentation is available.

**The lesson:**
The ATO does not have to accept estimates — it is a concession they may extend. The safest position is to keep your original records for the full required period.`,
  },
  {
    heading: "Pre-CGT assets — acquired before 20 September 1985",  // dated-ok
    body: `Assets acquired before 20 September 1985 are generally exempt from Capital Gains Tax. When you sell a pre-CGT asset, any gain is not assessable income. However, the record keeping obligations are real.  {/* // dated-ok */}

**Why you still need records for pre-CGT assets:**
1. You need to prove the acquisition date was before 20 September 1985. If you cannot demonstrate the pre-CGT date, the ATO may treat the asset as post-CGT and assess the gain in full.  {/* // dated-ok */}
2. If a pre-CGT asset is later improved or rebuilt, the improvement element becomes a post-CGT asset — the original pre-CGT portion retains its exemption, but the improvement does not.
3. Inheritances: when you inherit a pre-CGT asset, you inherit the deceased's cost base — and the pre-CGT status is generally preserved if the deceased acquired the asset before 20 September 1985.  // dated-ok

**Shares — the complication:**
If you hold shares in a company that was acquired pre-CGT but has since undergone capital reconstructions, rights issues, or demergers, each subsequent event needs to be traced. Some post-event entitlements are post-CGT assets even if the original shares were pre-CGT.

**Record keeping recommendation:**
Keep the original purchase records (contract notes, settlement statements) for pre-CGT assets permanently — or for as long as you hold the asset plus 5 years.`,
  },
  {
    heading: "SMSF record keeping — additional obligations",
    body: `Self-Managed Superannuation Funds (SMSFs) have additional record keeping requirements beyond those of individual investors. The SMSF annual audit requires the fund's records to be available to the approved SMSF auditor.

**Minimum SMSF record keeping obligations:**
- Financial accounts, statements, and tax returns — keep for 10 years (longer than the standard 5 years for individual taxpayers)
- Trustee minutes and resolutions — keep for 10 years
- Investment strategy and updates — keep while current and for 10 years after the fund is wound up
- Member contribution records and tax file number declarations — keep for 10 years
- Trust deed and all amendments — keep permanently (cannot recreate a lost trust deed)

**Investment records within an SMSF:**
All investment transaction records (shares, property, fixed income) apply the same requirements as for individual investors, but with the 10-year minimum retention period. SMSF auditors routinely request records going back multiple years.

**In-house assets and related party transactions:**
Transactions with related parties and in-house asset purchases require minutes recording the trustee decision and the basis for the arm's length valuation used. The ATO scrutinises these transactions closely.

**Pension phase — actuarial certificates:**
If the fund has members in both accumulation and pension phase in the same year, an actuarial certificate is required (unless the fund is fully in pension phase). These certificates must be retained for 10 years.`,
  },
  {
    heading: "Depreciation schedules — Div 40 and Div 43",
    body: `For investment property, depreciation deductions are some of the most valuable on your tax return — and they require specific documentation that you cannot reconstruct later.

**Division 43 — building allowance:**
Investment properties built after 15 September 1987 are eligible for a 2.5% per year depreciation deduction on the construction cost of the building (not the land). To claim this, you need either the original builder's invoices and construction contracts, or a depreciation schedule prepared by a Quantity Surveyor (QS) who estimates the construction cost based on current replacement values.  {/* // dated-ok */}

**Division 40 — plant and equipment:**
Fixtures and fittings (carpets, blinds, hot water systems, air conditioners, appliances) depreciate under Division 40 at effective life rates set by the ATO. Each item depreciates separately over its effective life.

**Why you need a QS report:**
A Quantity Surveyor's depreciation schedule:
- Provides a defensible record of the construction cost for Div 43 purposes
- Lists every item of plant and equipment with its opening value and depreciation rate
- Is accepted by the ATO as the required documentation for the deductions
- Typically costs $500–$900 but generates ongoing annual deductions worth multiples of that cost

**Record keeping obligation:**
Keep the QS depreciation schedule permanently (until 5 years after the property is sold), and keep updated schedules if improvements are made. The schedule is the record that justifies your annual deductions — a missing schedule is a missing deduction.`,
  },
  {
    heading: "Digital vs paper — what the ATO accepts",
    body: `The ATO accepts digital copies of records under the Tax Administration Act. You are not required to keep paper originals provided the digital copy meets the ATO's standards.

**ATO requirements for digital records:**
- The digital copy must be a true and complete copy of the original document
- It must be clear, legible, and accessible (not corrupted or stored in a format you cannot open)
- It must be stored in a way that allows the ATO to access it if requested

**Practical recommendations:**
- Use a cloud storage service with automatic backup (not just a local hard drive that can fail)
- Maintain a consistent folder structure: e.g. /Tax Records/[Year]/[Asset Type]/[Document Name]
- Scan physical receipts promptly — thermal printer receipts fade within months; photograph them immediately on receipt
- For broker statements and annual tax statements, most platforms allow you to download PDFs directly — download and store these in your own backup, not just in the platform's archive (brokers change systems and platforms can lose historical data)

**Formats the ATO accepts:**
PDF, JPG, PNG, and common spreadsheet formats. The ATO does not prescribe a specific format, but recommends formats that are widely readable and not proprietary.

**E-records and bookkeeping software:**
If you use accounting software (Xero, MYOB, Reckon) for your investment records, the data stored in that software counts as your records. Ensure you have backups or export capabilities — if you cancel your subscription, the data must remain accessible for the required retention period.`,
  },
];

const FAQS = [
  {
    q: "How long do I need to keep investment records for Australian tax purposes?",
    a: "The general rule is 5 years from the date you lodge your tax return for that income year. For CGT assets (shares, property, crypto), the 5 years starts from when you lodge the return for the year of sale — not the year of purchase. A property held for 20 years and sold in 2040 would require the original purchase records to be kept until around 2045. Keep purchase records for any CGT asset until at least 5 years after the year of disposal.",
  },
  {
    q: "What records do I need to keep for shares and ETFs?",
    a: "Keep every contract note or broker confirmation for every buy and sell. For ETFs that are AMITs, keep the AMMA statement issued each year — it details how distributions are taxed and adjusts your cost base. Keep DRP statements (each reinvestment is a separate CGT acquisition with its own cost base). Keep records of any corporate actions: splits, consolidations, bonus shares, rights issues, and demergers all affect your cost base. Your broker may provide an annual tax statement that summarises gains and income — keep these too, but they do not replace the underlying transaction records.",
  },
  {
    q: "Do I need to keep records for crypto transactions?",
    a: "Yes — every single transaction. The ATO treats each crypto disposal (sale, swap, or spend) as a CGT event. You need to record the date of each transaction, the amount of crypto, and the AUD value at the time of the transaction (the market rate in AUD at the moment of the trade). For crypto-to-crypto swaps, both legs of the swap need to be valued in AUD. Exchange CSV exports provide this data for most centralised exchanges. For DeFi, on-chain records from blockchain explorers may be required. Use a crypto tax tool like Koinly to import and organise these records — manual tracking of hundreds of transactions is extremely error-prone.",
  },
  {
    q: "What if I have lost records for a property I purchased many years ago?",
    a: "Contact your original conveyancer or solicitor — they may retain the settlement statement. The land titles office holds the title transfer records, which show the purchase date and price. Your state revenue office may have stamp duty records. Old bank statements can show the property purchase payment. If the property was purchased before digital records, a valuation at the time of purchase (from an estate agent's appraisal or council records) may be used as a starting point for reconstruction. The ATO can accept reasonable estimates if you demonstrate a genuine attempt to reconstruct the records, but there is no guarantee — complete original records are always preferable.",
  },
  {
    q: "Are digital records acceptable to the ATO?",
    a: "Yes. The ATO explicitly accepts digital copies of original documents under the Tax Administration Act. The copy must be clear, complete, and accessible. You do not need to keep paper originals if you have a legible digital copy. Store records in a cloud service with automatic backup — not just on a local hard drive. Use consistent naming conventions so you can locate records quickly if requested by the ATO. Download statements from your broker and fund manager directly rather than relying solely on the platform's archive, as platforms change over time.",
  },
  {
    q: "What extra records do SMSFs need to keep?",
    a: "SMSFs must retain financial accounts, tax returns, and trustee minutes for 10 years — double the standard 5-year rule for individual investors. The trust deed must be kept permanently. All investment records (by asset type) apply the same rules as for individuals, but with the 10-year minimum. The SMSF auditor reviews records annually, so they must be organised and accessible. Member contribution records, pension commencement documents, transfer balance account reports, and actuarial certificates (where required) must all be retained for 10 years.",
  },
];

export default function RecordKeepingPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Tax Strategy", url: `${SITE_URL}/tax` },
    { name: "Investment Record Keeping" },
  ]);

  const faqLd = faqJsonLd(FAQS);

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      )}

      {/* Hero */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <Link href="/tax" className="hover:text-slate-900">Tax Strategy</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Investment Record Keeping</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              ATO Records Guide &middot; {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              Investment Record Keeping{" "}
              <span className="text-amber-600">({CURRENT_YEAR})</span>
              {" "}&#8212; ATO Requirements
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              Everything Australian investors need to know about keeping records for tax purposes: the ATO&apos;s
              5-year rule, what to keep for shares, property, crypto, ETFs, and SMSFs, and what happens if you lose them.
            </p>
          </div>
        </div>
      </section>

      {/* Stat Cards */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            {STAT_CARDS.map((card) => (
              <div
                key={card.label}
                className={`rounded-2xl border p-5 bg-white ${card.accent ? "border-amber-200" : "border-slate-200"}`}
              >
                <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${card.accent ? "text-amber-800" : "text-slate-600"}`}>
                  {card.label}
                </p>
                <p className={`text-xl font-black ${card.accent ? "text-amber-700" : "text-slate-900"}`}>
                  {card.value}
                </p>
                <p className="text-xs text-slate-600 mt-1">{card.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Records by Asset Type */}
      <section className="py-10 md:py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="By Asset Type"
            title="What Records to Keep"
            sub="Organised by investment type — keep every item listed to protect your cost base and avoid ATO disputes."
          />
          <div className="mt-8 space-y-8">
            {ASSET_RECORDS.map((group) => (
              <div key={group.asset} className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl" aria-hidden="true">{group.icon}</span>
                  <h2 className="text-base font-extrabold text-slate-900">{group.asset}</h2>
                </div>
                <ul className="space-y-2">
                  {group.records.map((record, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700 leading-relaxed">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      {record}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CGT Cost Base Table */}
      <section className="py-10 md:py-12 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="CGT Checklist"
            title="CGT Record Keeping Checklist"
            sub="Use this checklist when you sell any CGT asset to confirm you have every document needed."
          />
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm border-collapse" aria-label="CGT cost base record keeping checklist by asset type">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th scope="col" className="text-left py-3 px-4 text-xs font-bold">Cost Base Element</th>
                  <th scope="col" className="text-left py-3 px-4 text-xs font-bold">What to Keep</th>
                  <th scope="col" className="text-center py-3 px-4 text-xs font-bold">Shares</th>
                  <th scope="col" className="text-center py-3 px-4 text-xs font-bold">Property</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr className="bg-white hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-xs font-semibold text-slate-800">Purchase price</td>
                  <td className="py-3 px-4 text-xs text-slate-600">Contract note / contract of sale</td>
                  <td className="py-3 px-4 text-center text-xs text-green-700 font-bold">Yes</td>
                  <td className="py-3 px-4 text-center text-xs text-green-700 font-bold">Yes</td>
                </tr>
                <tr className="bg-white hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-xs font-semibold text-slate-800">Brokerage / stamp duty</td>
                  <td className="py-3 px-4 text-xs text-slate-600">Broker confirmation / state revenue receipt</td>
                  <td className="py-3 px-4 text-center text-xs text-green-700 font-bold">Yes</td>
                  <td className="py-3 px-4 text-center text-xs text-green-700 font-bold">Yes</td>
                </tr>
                <tr className="bg-white hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-xs font-semibold text-slate-800">Legal / conveyancing fees</td>
                  <td className="py-3 px-4 text-xs text-slate-600">Solicitor tax invoices</td>
                  <td className="py-3 px-4 text-center text-xs text-slate-500">N/A</td>
                  <td className="py-3 px-4 text-center text-xs text-green-700 font-bold">Yes</td>
                </tr>
                <tr className="bg-white hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-xs font-semibold text-slate-800">Capital improvements</td>
                  <td className="py-3 px-4 text-xs text-slate-600">Contractor invoices, builder quotes + progress claims</td>
                  <td className="py-3 px-4 text-center text-xs text-slate-500">N/A</td>
                  <td className="py-3 px-4 text-center text-xs text-green-700 font-bold">Yes</td>
                </tr>
                <tr className="bg-white hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-xs font-semibold text-slate-800">Corporate actions</td>
                  <td className="py-3 px-4 text-xs text-slate-600">Scheme booklets, CHESS statements, DRP statements</td>
                  <td className="py-3 px-4 text-center text-xs text-green-700 font-bold">Yes</td>
                  <td className="py-3 px-4 text-center text-xs text-slate-500">N/A</td>
                </tr>
                <tr className="bg-white hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-xs font-semibold text-slate-800">Selling costs</td>
                  <td className="py-3 px-4 text-xs text-slate-600">Brokerage on sale / agent commission invoice</td>
                  <td className="py-3 px-4 text-center text-xs text-green-700 font-bold">Yes</td>
                  <td className="py-3 px-4 text-center text-xs text-green-700 font-bold">Yes</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Guide Sections */}
      <section className="py-10 md:py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Complete Guide" title="Record Keeping Explained" />
          <div className="mt-8 space-y-10">
            {SECTIONS.map((sec) => (
              <div key={sec.heading}>
                <h2 className="text-lg font-extrabold text-slate-900 mb-3">{sec.heading}</h2>
                <div className="text-sm text-slate-600 leading-relaxed space-y-3">
                  {sec.body.split("\n\n").map((para, i) => (
                    <p key={i} className="whitespace-pre-line break-words">{para}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-10 md:py-12 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-2xl">
          <SectionHeading eyebrow="FAQ" title="Record Keeping Questions Answered" />
          <div className="mt-6 divide-y divide-slate-200">
            {FAQS.map((faq) => (
              <details key={faq.q} className="py-4 group">
                <summary className="text-sm font-semibold text-slate-900 cursor-pointer list-none flex items-center justify-between gap-2">
                  {faq.q}
                  <span className="text-slate-500 group-open:rotate-180 transition-transform shrink-0" aria-hidden="true">&#9662;</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container-custom text-center max-w-xl">
          <h2 className="text-xl font-extrabold mb-3">Get your records in order with a tax agent</h2>
          <p className="text-sm text-slate-300 mb-6">
            A registered tax agent can review your record keeping systems, identify missing documentation,
            and ensure your cost base is correctly established before you sell.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/advisors/tax-agents" className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-colors">
              Find a Tax Agent &#8594;
            </Link>
            <Link href="/tax" className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm rounded-xl transition-colors">
              Tax Strategy Hub &#8594;
            </Link>
          </div>
        </div>
      </section>

      {/* AdvisorPrompt */}
      <section className="py-10 bg-white border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Need help with investment tax records?</h2>
          <AdvisorPrompt type="tax_agent" />
        </div>
      </section>

      {/* Compliance footer */}
      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">
            {GENERAL_ADVICE_WARNING} Record keeping requirements are based on current ATO guidance. Rules may
            change; always verify obligations at ato.gov.au or with a registered tax agent. This page does not
            constitute tax advice.
          </p>
        </div>
      </section>
    </div>
  );
}
