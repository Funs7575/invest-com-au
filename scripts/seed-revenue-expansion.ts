/**
 * One-time seed for the "revenue expansion" content launch.
 *   - Inserts new advisor types into `lead_pricing` (no-op if already present).
 *   - Inserts 20 evergreen articles into `articles` (no-op if slug exists).
 *
 * Run with:
 *   npx tsx scripts/seed-revenue-expansion.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env.
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(url, key);

/* ─── Lead pricing rows ──────────────────────────────────────────── */

const LEAD_PRICING_ROWS: Array<{
  advisor_type: string;
  price_cents: number;
  min_price_cents: number;
  max_price_cents: number;
  featured_monthly_cents: number;
}> = [
  { advisor_type: "foreign_investment_lawyer",     price_cents: 30000, min_price_cents: 20000, max_price_cents:  60000, featured_monthly_cents: 39900 },
  { advisor_type: "energy_financial_planner",      price_cents: 15000, min_price_cents: 10000, max_price_cents:  25000, featured_monthly_cents: 29900 },
  { advisor_type: "resources_fund_manager",        price_cents: 25000, min_price_cents: 15000, max_price_cents:  50000, featured_monthly_cents: 39900 },
  { advisor_type: "petroleum_royalties_advisor",   price_cents: 20000, min_price_cents: 12000, max_price_cents:  40000, featured_monthly_cents: 29900 },
  { advisor_type: "smsf_auditor",                  price_cents:  8000, min_price_cents:  5000, max_price_cents:  15000, featured_monthly_cents: 14900 },
  { advisor_type: "smsf_specialist",               price_cents:  9000, min_price_cents:  6000, max_price_cents:  18000, featured_monthly_cents: 19900 },
  { advisor_type: "immigration_investment_lawyer", price_cents: 35000, min_price_cents: 20000, max_price_cents:  70000, featured_monthly_cents: 49900 },
  { advisor_type: "fund_manager",                  price_cents: 20000, min_price_cents: 12000, max_price_cents:  40000, featured_monthly_cents: 29900 },
  { advisor_type: "rd_tax_advisor",                price_cents: 30000, min_price_cents: 20000, max_price_cents:  50000, featured_monthly_cents: 39900 },
  { advisor_type: "emdg_consultant",               price_cents: 20000, min_price_cents: 12000, max_price_cents:  35000, featured_monthly_cents: 29900 },
  { advisor_type: "business_exit_advisor",         price_cents: 50000, min_price_cents: 30000, max_price_cents: 100000, featured_monthly_cents: 49900 },
  { advisor_type: "inheritance_advisor",           price_cents: 10000, min_price_cents:  6000, max_price_cents:  20000, featured_monthly_cents: 19900 },
];

async function seedLeadPricing() {
  let inserted = 0;
  let skipped = 0;
  for (const row of LEAD_PRICING_ROWS) {
    const { data: existing } = await supabase
      .from("lead_pricing")
      .select("advisor_type")
      .eq("advisor_type", row.advisor_type)
      .maybeSingle();
    if (existing) { skipped++; continue; }
    const { error } = await supabase.from("lead_pricing").insert(row);
    if (error) {
      console.error(`  ! ${row.advisor_type}: ${error.message}`);
      continue;
    }
    inserted++;
  }
  console.log(`lead_pricing: ${inserted} inserted, ${skipped} already present`);
}

/* ─── Articles ───────────────────────────────────────────────────── */

type Section = { heading: string; body: string };
type ArticleSeed = {
  slug: string;
  title: string;
  category: string;
  tags: string[];
  excerpt: string;
  read_time: number;
  content_type?: string;
  sections: Section[];
};

const AUTHOR_NAME = "Invest.com.au Editorial Team";

const ARTICLES: ArticleSeed[] = [
  // ── GRANTS ──
  {
    slug: "rd-tax-incentive-australia-guide",
    title: "R&D Tax Incentive Australia: How to Claim Up to 43.5% Back",
    category: "strategy",
    tags: ["grants", "rd-tax", "startup", "fintech"],
    excerpt: "Companies under $20M turnover can claim a refundable 43.5% offset on eligible R&D. Here's exactly what qualifies, how to register, and the 30 April FY2025 deadline.",
    read_time: 9,
    content_type: "guide",
    sections: [
      { heading: "Why the R&D Tax Incentive matters", body: "The federal R&D Tax Incentive is the single largest non-dilutive funding source available to Australian businesses, supporting around $4 billion of activity each year. For an eligible company under $20 million in aggregated turnover, the program returns a refundable 43.5% tax offset on qualifying R&D spend — which lands as cash even when the company is in tax loss. Larger companies receive a non-refundable offset of up to 38.5%. For software-heavy businesses spending hundreds of thousands on developers, the program can be the difference between a 12-month and an 18-month runway. It is also one of the few grants you can claim alongside EMDG, state innovation programs and most equity-funded R&D." },
      { heading: "What qualifies as 'core' R&D", body: "Eligible activities are experimental, address technical uncertainty, and follow a hypothesis–experiment–evaluate cycle. Novel algorithms, ML model development, custom data pipelines, new financial-modelling methodologies and experimental backtesting systems typically qualify. Routine page builds, off-the-shelf API integrations, content writing, SEO, and conventional QA do not. AusIndustry will look for documented hypotheses, test results and the technical uncertainty that drove the work — not just timesheets. The strongest claims have a clear paper trail showing what was unknown, what experiment was run, and what the outcome was. Companies that wait until tax time to think about R&D usually surrender 30–50% of their potential claim because the documentation simply doesn't exist." },
      { heading: "How the claim works end-to-end", body: "There are two steps. First, register the income-year R&D activities with AusIndustry using the customer portal — the deadline is 10 months after year-end, so 30 April for a 30 June balancer. Second, submit the R&D Tax Incentive schedule with your company tax return through the ATO. The refundable offset arrives as part of your tax assessment, often within 30–60 days of lodgement. Companies in tax loss receive a cash refund. The program is self-assessed, but AusIndustry runs targeted reviews — a registered R&D tax advisor will pre-empt those reviews by structuring activities and contemporaneous records to the program guidance." },
      { heading: "Common mistakes that kill claims", body: "Three things derail otherwise valid claims. First, treating commercial milestones as R&D activities — the program funds the experiments behind the product, not the product launch. Second, including ineligible expenditure: directors' fees beyond market rate, related-party software licences, and core technology not used in the experiments. Third, weak contemporaneous records — a registered advisor will set up a lightweight tracking process inside Linear, Jira or Notion so technical staff capture the experimental logic as they work, not retroactively. The cost of getting this wrong is substantial: a clawback plus penalties of 25–75% of the over-claimed amount." },
    ],
  },
  {
    slug: "emdg-grant-australia-guide",
    title: "EMDG Grant 2026: Get Up to $80,000 for Export Marketing",
    category: "strategy",
    tags: ["grants", "export", "emdg", "international"],
    excerpt: "The Export Market Development Grant reimburses up to 50% of overseas marketing spend. Here's how the three tiers work, what's eligible, and how to stack EMDG with R&D.",
    read_time: 8,
    content_type: "guide",
    sections: [
      { heading: "What EMDG funds (and what it doesn't)", body: "The Export Market Development Grant is administered by Austrade and reimburses up to 50% of eligible overseas marketing expenses. Trade-show booths, overseas reps, foreign-market research, in-language promotional collateral and inbound buyer visits are all in scope. What's out: domestic marketing, capital expenditure, websites that have a multi-year amortisation profile, internal staff salaries beyond a defined cap, and anything related to selling into the Australian market. The grant is paid as reimbursement after the spend has been incurred and reported, so cash-flow planning matters — you wear the cost first, then receive the offset." },
      { heading: "The three EMDG tiers", body: "Tier 1 funds SMEs that are ready to export but have no current overseas revenue, capped at $30,000 per year. Tier 2 funds SMEs already exporting into existing markets — up to $50,000 per year — and is the most common tier for established Australian product businesses. Tier 3 is the heaviest funding band at $80,000 per year, reserved for SMEs entering new strategic markets, typically Asia-Pacific or Europe. Annual turnover must be under $20 million. Most successful applicants engage an EMDG consultant on the application because tier classification has a meaningful impact on the size of the cheque." },
      { heading: "Stacking EMDG with R&D and state grants", body: "EMDG can be claimed in the same year as the R&D Tax Incentive — but not on the same dollar of expenditure. A typical fintech might claim R&D on the cost of building a localised product variant, then claim EMDG on the trade-show, sales-rep and translated-collateral costs of selling that variant into Singapore or Hong Kong. State innovation vouchers and Industry Growth Program grants stack similarly: the rule is no double-dipping per dollar, but the same headline initiative can pay through multiple programs across different cost pools." },
      { heading: "How to apply and what to prepare", body: "Applications open in defined annual rounds. The application requires a marketing plan that maps target markets, intended channel partners, costs by line item, and the export outcome you expect. Document everything in a single shared workbook from the start of the financial year so you're not reconstructing receipts in October. Most rejected EMDG applications fail on insufficient documentation, not eligibility — Austrade asks for invoices, payment evidence and proof the spend related to the named market. Engage an EMDG consultant if your spend is over $40,000 in the year; the fee usually pays for itself in correctly classified expenditure." },
    ],
  },
  {
    slug: "industry-growth-program-guide",
    title: "Industry Growth Program: Up to $5M for Australian Startups",
    category: "strategy",
    tags: ["grants", "igp", "startup", "commercialisation"],
    excerpt: "The IGP replaced the Entrepreneurs' Programme in 2024 with a $392M commitment. Two streams, advisory-first process, and a closing window — here's the playbook.",
    read_time: 7,
    content_type: "guide",
    sections: [
      { heading: "Two funding streams in one program", body: "The Industry Growth Program (IGP) is the federal commercialisation grant for SMEs operating in the Future Made in Australia priority sectors — value-add resources, renewables and low-emissions tech, advanced manufacturing, defence and space, agriculture, and medical science. Stream one is Early-Stage Commercialisation, $50,000 to $250,000 in matched funding for projects at TRL 3–6. Stream two is Commercialisation and Growth, $100,000 to $5 million in matched funding for projects at TRL 4–9 — manufacturing scale-up, pilot plant builds, first-of-kind commercial deployment. Stream two is where most of the dollar value lives." },
      { heading: "The advisory-first process", body: "Unlike most grants, IGP doesn't accept cold applications. Step one is a free advisory engagement with a Department of Industry advisor, which produces a written advisory report on commercial readiness. The advisory step alone takes 4–8 weeks. Only after the report is delivered do you submit a full grant application. The sequencing matters: the advisory report functions as both a screening filter and a coaching mechanism, and applications without a current report will not be assessed. Plan for a 4–6 month total timeline from first contact to grant approval." },
      { heading: "Why timing is critical right now", body: "The IGP was funded with a $392 million commitment over four years from 2023–24. Industry briefings through 2025 indicated that approximately 90% of the funding pool is projected to be allocated by June 2026. The program is hard-capped — once funds are committed, the program closes to new applications. SMEs with an IGP-eligible project should engage advisory inside the next two months. Falling outside the window means waiting for a successor program or funding the project from equity at substantially higher cost of capital." },
      { heading: "What strong applications look like", body: "The strongest IGP applications combine three things: a credible technology with a demonstrable performance edge, a clear path to revenue with named customers or LOIs, and matched funding evidence — bank statements, term sheets or executed convertible notes. Soft commitments don't pass the assessment. Industry advisors heavily emphasise capability of the management team and project plan rigour. Engage an experienced grants consultant early; the quality difference between a self-written and a professionally-supported application is significant at the dollar values in stream two." },
    ],
  },
  {
    slug: "nsw-mvp-ventures-grant",
    title: "NSW MVP Ventures Grant: $200,000 for Tech Founders",
    category: "strategy",
    tags: ["grants", "nsw", "mvp", "startup"],
    excerpt: "Investment NSW's MVP Ventures program funds early-stage tech founders building minimum viable products. Here's the cap structure, eligibility and how to position your application.",
    read_time: 6,
    content_type: "guide",
    sections: [
      { heading: "What MVP Ventures funds", body: "The NSW MVP Ventures program is run by Investment NSW and funds early-stage technology businesses building or scaling a minimum viable product. The program provides matched funding from $25,000 to $200,000 across three brackets, with the dollar value tied to maturity of the product, customer evidence and quality of the milestone plan. Eligible costs include software development, design, validation, prototyping, IP and limited marketing and customer-acquisition expenditure. The program is biased toward businesses with existing market signal — pilots, paid trials, LOIs — rather than pre-build concepts. Pure pre-revenue ideation is not the right fit." },
      { heading: "Eligibility checklist", body: "To qualify, you must be incorporated in Australia, headquartered in NSW, have under $1 million annual revenue, be developing a tech-based product, and have evidence of customer demand. The matched funding requirement means you need verifiable cash to put alongside the grant — bank balances, executed term sheets or convertible notes are accepted. Universities, research institutions and franchise businesses are out. The program runs in funding rounds rather than continuous intake, so check the current round dates before investing time in the application." },
      { heading: "Building a competitive application", body: "MVP Ventures is competitive — the program receives several times more applications than it can fund. Strong applications lead with quantified market signal: paying customers, LOIs from named buyers, or measurable engagement on prior versions of the product. The milestone plan should map dollars to specific deliverables, with each milestone tied to a customer or commercial outcome rather than an internal engineering KPI. The reviewing panel includes operators, so engineering-only milestones with no customer endpoint score poorly." },
      { heading: "Stacking MVP Ventures with federal grants", body: "MVP Ventures can be stacked with the R&D Tax Incentive on the same project, provided the dollars are not double-counted. A typical pattern: MVP Ventures funds the productisation work — UI, packaging, pilot deployment — while R&D claims the underlying experimental work on algorithms, models and novel system design. EMDG can layer on top once you start exporting. State and federal grants treat each other as additive within the no-double-dip constraint, so a well-structured early-stage roadmap can compound multiple programs." },
    ],
  },
  {
    slug: "australian-government-grants-complete-guide",
    title: "Australian Government Grants 2026: Complete Guide for Businesses",
    category: "beginners",
    tags: ["grants", "government", "funding", "australia"],
    excerpt: "Federal, state and territory grants explained: R&D Tax Incentive, EMDG, IGP, MVP Ventures, Advance Queensland, LaunchVic. Where to start and how to stack them.",
    read_time: 10,
    content_type: "guide",
    sections: [
      { heading: "The Australian grants landscape in 2026", body: "Australian governments collectively allocate around $400 million per year of non-dilutive grant funding to private-sector businesses. The federal layer is dominated by the R&D Tax Incentive — the largest single program by value — alongside EMDG for export marketing and the Industry Growth Program for commercialisation in priority sectors. State and territory programs sit on top, with NSW MVP Ventures, Advance Queensland's Ignite Ideas and Commercialisation Fund, Victorian LaunchVic grants and similar streams in WA, SA, TAS, ACT and NT. The grants ecosystem rewards businesses that understand the structure, sequence applications correctly, and document spend rigorously." },
      { heading: "How to choose where to start", body: "Start where the dollar leverage is highest relative to your effort. For most early-stage tech companies, that means R&D Tax Incentive first — it's an annual claim, the structure is well-understood, and refundable for sub-$20M turnover. Companies preparing for offshore expansion add EMDG once trade-show or overseas-rep spend starts to accrue. Hardware-heavy or deep-tech ventures prioritise IGP for capital-intensive commercialisation. State programs supplement the federal layer and are usually faster decisions but smaller cheques. The wrong sequence — applying for IGP before having any R&D documentation — can cost a year." },
      { heading: "Stacking grants without double-dipping", body: "All Australian grants share one rule: a single dollar of expenditure can only be claimed under one program. But most projects span multiple cost categories, which is where stacking pays. Build cost claimed under R&D, marketing claimed under EMDG, capital claimed under IGP. State programs often complement federal programs by covering categories the federal layer excludes — domestic market validation, prototyping, internal staff training. A grants consultant earns their fee at exactly this point: structuring cost categories so you legally maximise total recovery without crossing the no-double-dip line." },
      { heading: "When to engage a consultant", body: "DIY applications are reasonable for small claims — under $50,000, single program, simple structure. Above that threshold the cost-benefit usually flips. Specialist grants consultants charge 8–15% success fees on R&D, fixed fees of $5,000–$15,000 on IGP/EMDG applications, or hybrid arrangements. Two non-obvious benefits beyond the application itself: documentation systems that survive ATO/AusIndustry reviews, and program selection — a good consultant will sometimes tell you not to apply for a particular grant because the fit is weak, saving you weeks of preparation time on a likely rejection." },
      { heading: "What to do this quarter", body: "If you are an Australian SME doing technical product work, three actions make sense this quarter. First, document any R&D activity from the current financial year in a structured way — Notion or Linear with tagged hypotheses works fine. Second, if you're planning offshore expansion, set up an EMDG-aligned cost tracker before any spend starts. Third, if you're in IGP-eligible sectors and have not yet engaged advisory, contact the Department of Industry advisory service this month — the 4-8 week advisory step is the gating item, not the grant application itself." },
    ],
  },
  // ── SMSF ──
  {
    slug: "smsf-setup-cost-australia-2026",
    title: "SMSF Setup Cost Australia 2026: Full Breakdown ($800–$3,500)",
    category: "smsf",
    tags: ["smsf", "setup", "cost", "accountant"],
    excerpt: "Real 2026 SMSF setup costs: trust deed, ASIC, ATO registration, corporate trustee fees. The honest breakdown with both individual and corporate trustee paths.",
    read_time: 7,
    content_type: "guide",
    sections: [
      { heading: "What you actually pay to set up an SMSF", body: "A bare-bones SMSF setup with individual trustees costs $800 to $1,500 in 2026. That covers the trust deed, ATO registration for ABN and TFN, and basic establishment paperwork. A corporate-trustee SMSF — recommended for property and most multi-member funds — runs $1,500 to $3,500 because it adds an ASIC-registered company ($538 ASIC fee plus accountant time), bare trust setup if you're using LRBA borrowing, and additional document work. Anyone quoting under $800 is either incomplete or relying on an off-the-shelf deed that won't support the strategies most SMSF trustees actually want to run within two or three years." },
      { heading: "Individual versus corporate trustee", body: "Individual trustees are cheaper to establish but carry meaningful operational friction: every member must be a trustee, every change of membership requires every asset's title to be re-registered, and personal liability sits with each individual trustee. Corporate trustees solve all three. The ASIC company fee is real ($538 establishment, $63/year ongoing for a special-purpose super company) but the trade-off is overwhelmingly worth it for funds holding direct property, planning to use LRBA, expecting member changes, or planning intergenerational wealth transfer. Most SMSF specialists default to corporate trustee and only deviate when the fund is intentionally short-lived." },
      { heading: "Ongoing cost — where the real money goes", body: "Setup is only the entry fee. Ongoing annual SMSF costs run $1,500 to $5,000 a year for an audited, compliant fund. Components: independent SMSF audit ($300–$700 simple, up to $1,500 complex), accountant lodgement ($1,200–$3,000), ASIC corporate-trustee fee ($63), and ATO supervisory levy ($259). Specialist activities — actuarial certificates for funds with both accumulation and pension members, valuation reports, complex investment-strategy reviews — add to that base. The ATO's published median fund expense for FY2024 was around $7,500, but a well-run SMSF with a single asset class can run materially below the median." },
      { heading: "The break-even balance", body: "The conventional rule of thumb is that an SMSF makes financial sense from $200,000 in combined balance, breaks even on cost-to-asset ratio versus retail super at $300,000–$500,000, and is clearly the cheaper option above $500,000. That holds for a passive ETF strategy. The economics shift earlier in your favour if you intend to hold direct property, run a concentrated direct-share portfolio, or invest in unlisted assets the retail super system doesn't access. The economics shift later — sometimes never improving — if you don't have time or interest for trustee duties." },
    ],
  },
  {
    slug: "smsf-crypto-investing-guide",
    title: "Crypto in Your SMSF: ATO Rules, Tax Benefits & How to Set Up",
    category: "smsf",
    tags: ["smsf", "crypto", "bitcoin", "ato"],
    excerpt: "Australian SMSFs hold $3B+ in crypto. The ATO compliance rules, the 15% tax advantage versus 47% personal, and how to actually buy without breaching the sole purpose test.",
    read_time: 8,
    content_type: "guide",
    sections: [
      { heading: "Why SMSFs hold crypto in 2026", body: "ATO statistics show Australian SMSFs hold over $3 billion in crypto assets, up roughly 10x since 2020. Two drivers explain the trend. First, the tax differential — outside an SMSF a crypto trader's gains are taxed at marginal rates up to 47%, while inside an SMSF the rate drops to 15% in accumulation, 10% with the 12-month CGT discount, and potentially 0% in pension phase. Second, control — most retail super funds either don't offer crypto exposure or offer narrow access via a single ETF, while SMSF trustees can hold direct BTC, ETH and other assets through an SMSF-dedicated exchange account." },
      { heading: "ATO compliance rules for crypto in SMSFs", body: "Crypto is permitted but must satisfy four conditions. The trust deed must explicitly allow digital assets — most pre-2018 deeds do not, and a deed update is required first. The investment strategy must reference crypto and explain why it fits the fund's risk profile. The crypto must be acquired by, and held in, an account in the name of the fund — not the trustee personally. And the fund cannot acquire crypto from a related party, which rules out transferring personal holdings into the SMSF. Breaches are common and penalties severe: contributions caps, in-house asset rules and the sole purpose test all apply." },
      { heading: "How to actually buy", body: "Three Australian exchanges have meaningful SMSF onboarding flows in 2026: Swyftx, Coinstash and Independent Reserve. Each requires the SMSF entity to register, verify trustee identity (individual or corporate), and bank-link the SMSF's dedicated bank account. Cold-storage hardware wallets (Ledger, Trezor) are permitted and are the right call for any allocation above $50,000 — the wallet must be controlled by the fund, with seed-phrase custody documented in writing. Keep transaction records: every trade has a CGT consequence, and the auditor will require full reconciliation at year-end." },
      { heading: "Tax outcomes with worked numbers", body: "Consider a $100,000 BTC allocation that doubles to $200,000 over two years. Outside super at 45% marginal: $42,825 tax on the $95,000 gain after 50% CGT discount — net keep $57,175. Inside SMSF accumulation at 15% with 33.3% CGT discount on assets held over 12 months: $9,500 tax — net keep $90,500. Inside SMSF in pension phase: zero tax — net keep $100,000 of gain. The differential isn't theoretical, it compounds across decades. The trade-off is operational complexity: deed, strategy, audit, dedicated account and rigorous record-keeping must all be kept current." },
    ],
  },
  {
    slug: "smsf-property-investment-guide",
    title: "SMSF Property Investment 2026: Rules, LRBA, and What to Know",
    category: "smsf",
    tags: ["smsf", "property", "lrba", "borrowing"],
    excerpt: "Direct property is the most common SMSF investment after shares. Here's how LRBA borrowing works, the residential vs commercial split, and what 2026 rule changes mean.",
    read_time: 9,
    content_type: "guide",
    sections: [
      { heading: "What property an SMSF can hold", body: "An SMSF can hold residential investment property, commercial property, and unlisted property funds. Residential property has tight rules: trustees and related parties cannot live in it, rent it, or use it personally — even one weekend stay is a breach. Commercial property is friendlier: an SMSF can buy commercial premises and lease them to a related-party business at arm's-length market rent. This 'business real property' carve-out is the most powerful SMSF strategy for owner-operators of small businesses, because rent flows into the concessional tax environment and the asset compounds inside super." },
      { heading: "LRBA borrowing — how it works", body: "Limited Recourse Borrowing Arrangements (LRBAs) let an SMSF borrow to buy a single asset, with the lender's recourse limited to that asset only. The structure is: SMSF lends to a bare trust, bare trust holds the property, SMSF makes the repayments. Major-bank SMSF lending exited the market in 2018, so most LRBAs in 2026 are written by specialist lenders at premium rates — typically 1.5–2.0% above standard investor rates. LVRs are capped lower (60–70% residential, up to 80% commercial), and serviceability requires the SMSF to demonstrate sufficient contributions and rental income to meet repayments at stress-tested rates." },
      { heading: "Cost of running an SMSF property", body: "Buying a property through an SMSF costs more than buying personally. Typical first-year costs: $2,000–$5,000 LRBA structuring, $1,500–$3,000 bare-trust setup, plus normal stamp duty and legals. Annual costs add an SMSF audit, accountant lodgement, property manager fees and any LRBA bank fees. Plan for $4,000–$8,000 annually beyond the property's own outgoings. Most SMSF specialists won't recommend property below a $300,000 fund balance because the fixed cost layer eats too much of the return. Above $600,000 the economics improve materially." },
      { heading: "Tax treatment and 2026 considerations", body: "SMSF property income is taxed at 15% during accumulation, with depreciation and interest deductible against rental income. Capital gains on assets held over 12 months attract a 10% effective rate (33.3% discount on the 15% rate). Property held in pension phase enjoys 0% tax on income and capital gains, which is why many SMSF trustees plan to convert assets to pension phase before sale. The Division 296 changes from July 2026 add a 30% rate above $3M total super balance — at SMSF level this hits funds with concentrated property exposure hardest, and trustees should model the impact before topping up." },
    ],
  },
  {
    slug: "smsf-etf-investment-strategy",
    title: "Building an SMSF Portfolio with ETFs: Strategy Guide 2026",
    category: "smsf",
    tags: ["smsf", "etf", "portfolio", "strategy"],
    excerpt: "Most SMSFs hold ETFs as the core of their portfolio. Three model allocations — conservative, balanced, growth — and how to write an investment strategy that satisfies the ATO.",
    read_time: 8,
    content_type: "guide",
    sections: [
      { heading: "Why ETFs work inside an SMSF", body: "Around 60% of SMSFs hold listed equities or ETFs as the largest asset class. ETFs solve four SMSF problems at once: instant diversification, low management fees (most under 0.20%), full transparency for the annual audit, and easy rebalancing through any ASX broker. They also satisfy the ATO investment-strategy test more cleanly than concentrated direct-share portfolios because the diversification is structural rather than discretionary. For most trustees the question is not whether to use ETFs but how to combine a small number of broad-market ETFs to express the fund's risk profile and member time horizons." },
      { heading: "Three model allocations", body: "Conservative (member close to or in pension phase): 30% ASX broad market (e.g. VAS or A200), 20% global ex-Australia (VGS or IVV), 5% emerging markets (VGE), 35% Australian fixed income (VAF), 10% cash. Balanced (mid-career accumulation): 40% ASX broad market, 30% global, 5% emerging markets, 15% fixed income, 10% alternatives or property. Growth (long horizon, high risk tolerance): 35% ASX broad market, 40% global, 10% emerging markets, 5% small caps, 10% alternatives or thematic. Each model is a starting frame — the actual allocation must match the documented investment strategy." },
      { heading: "Writing an investment strategy that holds up", body: "The ATO requires every SMSF to have a written investment strategy that addresses risk and return, diversification, liquidity, ability to discharge liabilities, and member insurance needs. Generic templates fail review — auditors increasingly want explicit reasoning for the chosen allocation. A strong strategy ties the asset mix to specific member circumstances ('member age 52, target retirement 65, willing to tolerate one full market cycle of drawdown') and documents review triggers. Reviewing the strategy at least annually is mandatory. Major life events — pension commencement, member additions, large contributions — require a review at the time, not just at year-end." },
      { heading: "Tax-efficient ETF selection", body: "Inside an SMSF, ETF selection has tax dimensions retail investors usually ignore. Australian-domiciled ETFs receive franking credits which the SMSF can claim — VAS, A200 and VHY pass through significant franking. International ETFs domiciled in the US (e.g. some IVV variants) may incur 30% withholding tax on US dividends without W-8BEN paperwork; Australian-domiciled global ETFs (VGS, IVV-AU) handle the W-8BEN at fund level and reduce friction. For pension-phase funds, franking credit refunds are paid as cash even when fund tax is zero — making heavily-franked Australian equity ETFs particularly powerful in retirement-phase SMSFs." },
    ],
  },
  {
    slug: "is-smsf-worth-it-calculator-guide",
    title: "Is an SMSF Worth It? The Balance Threshold Explained",
    category: "smsf",
    tags: ["smsf", "cost", "calculator", "worth-it"],
    excerpt: "An honest cost-vs-benefit analysis: at what balance does an SMSF beat retail super, and where do the soft costs (time, complexity, mistakes) shift the answer?",
    read_time: 7,
    content_type: "guide",
    sections: [
      { heading: "The headline numbers", body: "ATO data and Productivity Commission analysis converge on a similar threshold: SMSFs become cost-competitive with retail super around $200,000 in combined balance and clearly cheaper above $500,000. Below $100,000 an SMSF is almost certainly more expensive on a fee-as-percentage basis than a low-cost industry super fund. Between $100,000 and $200,000 it's a judgement call — the math is roughly neutral but the additional complexity weighs against an SMSF unless the trustee has a specific strategy (direct property, business real property, crypto, concentrated direct shares) that retail super cannot deliver." },
      { heading: "Hard costs versus soft costs", body: "The hard cost analysis is straightforward: SMSF run rate is $3,000–$8,000 a year on accountant, audit, ASIC and ATO levy, versus 0.5–1.0% per annum for industry super. Where retail super costs scale with balance, SMSF costs are largely fixed — which is why the percentage equivalence flips above $300,000. The soft costs are usually undercounted. Trustees spend 10–40 hours a year on records, valuations, strategy reviews and broker correspondence. If you value that time at $100/hour, that's another $1,000–$4,000 of effective cost the calculator doesn't show." },
      { heading: "Where SMSFs really win", body: "SMSFs win decisively when you want to do something retail super can't or won't. Holding direct residential or commercial property is the largest category. Holding business real property leased back to a related party is uniquely powerful for owner-operators. Direct crypto allocations beyond a small ETF wrapper. Concentrated direct shares with deliberate franking-credit harvesting in pension phase. Holding unlisted assets the retail wholesale market doesn't expose. If your strategy doesn't require any of these, low-cost industry super is usually the better answer." },
      { heading: "Where SMSFs quietly fail", body: "The most common SMSF failure modes aren't tax or compliance — they're attention. Trustees set up the fund with a clear strategy, then drift: the investment strategy sits unchanged for five years, the deed becomes outdated against new ATO rulings, contribution caps get accidentally exceeded, the annual audit becomes a fire drill. The tax-effective vehicle becomes a tax-inefficient one because nobody is actively managing it. If you don't have time to spend at least one Saturday a quarter on the fund, an SMSF is probably a worse outcome than a well-chosen industry fund. Honest self-assessment beats theoretical fee comparisons." },
    ],
  },
  // ── STRATEGY ──
  {
    slug: "what-to-do-with-inheritance-australia",
    title: "What to Do With an Inheritance in Australia: Investment Guide",
    category: "strategy",
    tags: ["inheritance", "lump-sum", "investment", "financial-planner"],
    excerpt: "There's no inheritance tax in Australia — but there is CGT, super inheritance rules, and a lot of behavioural risk. Here's the right sequence for a sudden lump sum.",
    read_time: 8,
    content_type: "guide",
    sections: [
      { heading: "The three-bucket framework", body: "Australia has no inheritance tax — but receiving a lump sum still has tax consequences depending on what you inherit. The cleanest mental model uses three buckets. Cash inherited under a will: tax-free in your hands, but income earned on it is taxable from receipt. Inherited assets (shares, property, crypto): tax-free to receive but CGT applies on subsequent sale, with the cost base depending on whether the asset was acquired by the deceased before or after 20 September 1985. Inherited super: paid outside the estate, tax treatment depends on whether you're a tax-dependant, with non-dependants potentially paying tax on the taxable component." },
      { heading: "What to do in the first 90 days", body: "Don't invest. The single most common inheritance mistake is rushing the money into the market within 30 days, often into whatever the deceased was holding or the first product an old family contact mentions. Park the inheritance in a high-interest savings account or term deposit while you sort the actual sequence: get the estate paperwork finalised, get tax advice on the cost base of any inherited assets, review your own super, insurance, mortgage and emergency reserves, then build an investment plan that fits your goals — not the deceased's. The cost of waiting 90 days is trivial; the cost of investing wrong is permanent." },
      { heading: "The CGT trap with inherited property", body: "Inherited residential property is the highest-friction asset in most estates. If the deceased acquired the property before 20 September 1985, your cost base is market value at date of death — and you have a two-year main-residence exemption window if the deceased lived in it as their main residence. If the deceased acquired it after 20 September 1985, your cost base is the deceased's original cost base plus capital improvements. Selling outside the two-year window often triggers significant CGT. A tax agent should run the numbers before any sale decision is made — the difference between selling in month 23 versus month 25 can be tens of thousands of dollars." },
      { heading: "Building the long-term plan", body: "Once the immediate sequence is handled, the question is what kind of portfolio fits your circumstances — not what kind of portfolio a forum says is optimal. Common destinations for inherited cash: paying down non-deductible mortgage debt (usually the highest after-tax return available), maxing out concessional super contributions ($30,000 cap, often with carry-forward space if your TSB is under $500,000), building an investment property deposit, or establishing a long-only ETF portfolio. The right mix is rarely one of these in isolation. Engage a financial planner — fee-for-service, not commission — for any inheritance over $200,000." },
    ],
  },
  {
    slug: "redundancy-payout-investment-guide",
    title: "Redundancy Payout Investment Guide: What to Do With a Lump Sum",
    category: "strategy",
    tags: ["redundancy", "lump-sum", "super", "investment"],
    excerpt: "Genuine redundancy gets a tax-free threshold. Unused leave is taxed differently. Here's how to handle the tax window, super top-up opportunities and the 12-month rebuild.",
    read_time: 7,
    content_type: "guide",
    sections: [
      { heading: "The redundancy tax window", body: "A genuine redundancy attracts a tax-free threshold of $12,524 plus $6,264 per completed year of service for the 2025–26 financial year. Above the threshold, the remainder is taxed concessionally — 32% up to $235,000 and 47% above. Unused annual and long-service leave is taxed differently again, at marginal rates with a discount applied to long-service leave accrued before 1993. Your final payment slip will spell out the components — keep it. The tax outcome can swing $20,000 or more depending on whether the redundancy is classed as 'genuine' under the ATO definition, which is why the first phone call after the email should be to a tax agent, not a broker." },
      { heading: "The super contribution opportunity", body: "A lump-sum redundancy creates a one-off opportunity to make a large concessional super contribution and reduce taxable income in the year. The standard concessional cap is $30,000, but unused cap from the previous five years can be 'carry-forward' contributed if your total super balance was under $500,000 on 30 June of the prior year — which is common after a forced employment exit. A $50,000 carry-forward concessional contribution at age 50 saves $15,000+ in tax for someone in the 32.5% bracket and simultaneously rebuilds long-term wealth. The contribution must occur before 30 June of the redundancy year to count." },
      { heading: "Cash buffer first, investment second", body: "Before any investment decision, build an explicit cash buffer for the job-search window. The Australian average for white-collar re-employment is 4–7 months at similar seniority — longer for senior or specialist roles. A buffer of 9–12 months of household running costs is the right baseline, held in a high-interest savings account or short-dated term deposit. Investing the redundancy into ETFs in month one and being forced to sell in a drawdown four months later is the most common — and most expensive — redundancy mistake. The buffer is non-negotiable, even if it means a smaller initial investment allocation." },
      { heading: "The 12-month rebuild", body: "Beyond the buffer and any super top-up, the right destination depends on personal circumstances. Paying down non-deductible mortgage debt is almost always the highest-return option after super. ETF-based long-only portfolios provide diversified market exposure without single-stock risk. If you intend to use the funds within 5 years for a property deposit or business start-up, keep that tranche in cash or short-dated bonds — equity volatility is incompatible with short horizons. Avoid two patterns: 'I'll start trading' (almost always destroys capital) and 'I'll wait for a crash to invest' (almost always misses the recovery). Rule-based, periodic deployment beats both." },
    ],
  },
  {
    slug: "franking-credits-explained-australia",
    title: "Franking Credits Explained: How to Maximise Your Dividend Tax Offset",
    category: "tax",
    tags: ["franking-credits", "dividends", "tax", "smsf"],
    excerpt: "Franking credits are one of the most powerful — and misunderstood — features of Australian investing. Here's how they actually work, with worked examples for each tax rate.",
    read_time: 9,
    content_type: "guide",
    sections: [
      { heading: "The mechanics", body: "Australian companies pay 30% (or 25% for base-rate entities) corporate tax on profits before paying dividends. When they pay a fully-franked dividend, they attach a franking credit equal to the corporate tax already paid. As a shareholder you 'gross up' the dividend by adding the franking credit, calculate tax on the grossed-up amount at your marginal rate, then subtract the franking credit as a tax offset. The net effect is that dividends are taxed at the difference between your marginal rate and the corporate rate — and if your marginal rate is below the corporate rate, the franking credit becomes a refund. This is the mechanism that makes Australian dividend investing structurally different to US or UK." },
      { heading: "Worked example — same dividend, different investors", body: "A $1,000 fully-franked dividend grosses up to $1,428.57 ($1,000 + $428.57 franking credit). For a 47% marginal taxpayer: tax on $1,428.57 at 47% = $671.43, minus $428.57 credit = $242.86 net tax — effective tax 24.3% on the dividend received. For a 19% taxpayer: tax of $271.43, minus $428.57 credit = $157.14 refund — effective tax negative. For an SMSF in accumulation: tax of $214.29, minus $428.57 credit = $214.28 refund. For an SMSF in pension phase at 0%: tax of $0, minus $428.57 credit = $428.57 refund — full corporate tax recovered as cash. This last scenario is the most powerful tax outcome in Australian retail investing." },
      { heading: "Where franking goes wrong", body: "Three traps catch otherwise smart investors. First, partial franking — many ASX dividends are 80–90% franked, not 100%, and the unfranked component reduces the offset proportionately. Second, the 45-day holding rule — to claim franking credits you must hold the shares for 45 days excluding the day of acquisition and disposal, with at-risk economic exposure. Short-term dividend stripping doesn't work and triggers anti-avoidance scrutiny. Third, non-resident investors — franking credits do not refund to non-residents and the underlying dividend is subject to withholding tax of 0–15% depending on the country and DTA. Australian residents who become non-residents typically lose meaningful value in their dividend portfolios from this single rule." },
      { heading: "How to maximise", body: "If you control your structure (especially via SMSF), four levers compound. Tilt the equity allocation toward fully-franked Australian payers — VAS, VHY, A200 plus selected direct holdings in ASX blue-chips. Time pension-phase commencement so high-franking holdings are inside the 0%-tax pension account. Avoid offshore equities in pension phase where they don't carry franking — hold those in accumulation buckets. Keep franking credit yields visible in your portfolio reporting; many investors only track headline yield and miss that two 5% gross-yield options can have wildly different after-tax outcomes once franking is included." },
    ],
  },
  {
    slug: "negative-gearing-australia-guide-2026",
    title: "Negative Gearing Australia 2026: How It Works, Tax Benefits & Risks",
    category: "tax",
    tags: ["negative-gearing", "property", "tax", "investment"],
    excerpt: "Negative gearing is the single most contested tax structure in Australian investing. Here's how the math actually works, when it's right, and when it's a slow leak.",
    read_time: 9,
    content_type: "guide",
    sections: [
      { heading: "What negative gearing actually is", body: "Negative gearing is simply the situation where the deductible expenses of an investment — interest, depreciation, rates, repairs, agent fees — exceed the investment income, producing a net loss. That loss reduces your taxable income from other sources at your marginal tax rate. It is not a property-only structure: any leveraged income-producing asset can be negatively geared, including share portfolios funded with margin loans. In practice it is most common in residential property because high LVR investor loans with interest-only periods produce reliable book losses against modest rental yields." },
      { heading: "The numbers worked through", body: "A typical 2026 example: $850,000 metro investment property, 80% LVR, 6.5% interest-only investment loan = $44,200 interest. Add rates ($3,500), insurance ($1,500), agent fees ($2,200), maintenance ($2,000) = $9,200 holding costs. Total deductible costs $53,400. Rental income $30,000/year. Net rental loss $23,400. At 37% marginal rate, that's $8,658 of tax saving. Net out-of-pocket after tax: $14,742 per year. The investment justifies that drag only if expected capital growth exceeds it — at $850,000 base, you need 1.8% per annum nominal capital growth to break even on cash flow alone, and meaningfully more once opportunity cost is included." },
      { heading: "When negative gearing makes sense", body: "Three conditions need to align. First, marginal tax rate of 37% or 45% — at 19% the tax shield is too small to justify the drag. Second, capital-growth conviction higher than the implied break-even (typically 4–6% per annum required for a meaningful real return). Third, sufficient income outside the property to absorb the cash-flow loss for the holding period without forcing a sale. If any of those three conditions are weak, the strategy degrades into a slow capital leak. The number of investors holding negatively-geared property purely because they 'don't want to sell at a loss' is large enough to be a recognised pattern." },
      { heading: "Why it doesn't work inside SMSFs", body: "A common misconception is that an SMSF using LRBA borrowing creates a negatively-geared structure with the same personal-tax benefit. It does not. Inside an SMSF, the rental loss can offset other fund income (contributions, dividends, distributions) at the fund tax rate of 15% — but cannot offset the member's personal income at 37% or 45%. The tax shield is therefore much smaller and the leverage is heavily restricted. SMSF property is a tax-effective wealth structure for different reasons (15% income tax, 0% pension-phase tax, business real property carve-out). Negative gearing is a personal-tax strategy that doesn't translate." },
    ],
  },
  {
    slug: "positive-gearing-vs-negative-gearing",
    title: "Positive vs Negative Gearing: Which Strategy Wins in 2026?",
    category: "strategy",
    tags: ["gearing", "property", "tax", "strategy"],
    excerpt: "The gearing debate reset in 2026: higher rates, tighter rentals, and a different break-even. Here's a clear comparison framework with worked examples for both strategies.",
    read_time: 7,
    content_type: "guide",
    sections: [
      { heading: "The cash-flow distinction", body: "Positive gearing means rental income exceeds holding costs — the property pays you, and the surplus adds to your taxable income. Negative gearing means costs exceed income — you fund the shortfall, and the loss reduces your taxable income at marginal rate. The gearing label tells you nothing about whether the property is a good investment; that depends on total return, which is cash flow plus capital growth less holding costs and tax. A positively-geared regional property growing at 1% per annum can underperform a negatively-geared metro property growing at 6% per annum even though one feeds you and the other drains you." },
      { heading: "Where each strategy works in 2026", body: "After the rate cycle of 2022–2025, positive gearing has shifted from regional-only to a meaningful slice of the metro market. Lower-priced metro houses ($550K–$700K) with strong rental demand are increasingly cash-flow neutral or slightly positive on 80% LVR investor loans. Negative gearing remains structurally available on premium metro property ($1.2M+) where yields run 2.5–3.5% and capital growth is the entire return thesis. The right strategy depends on your income, your time horizon and your tolerance for cash drag — not which strategy is currently fashionable." },
      { heading: "Worked comparison — same investor, two paths", body: "A 40-year-old on $180K marginal rate has two paths. Path A: $850K negatively-geared metro at 6.5% rate, $14,742/year net cash drag, target 5% capital growth. Over 10 years, breakeven cash drag total $147,000, capital appreciation $400,000+ at 5% growth — net $250,000 paper gain pre-CGT. Path B: $620K positively-geared regional at 6.5% rate, $4,000/year net cash income, target 2% capital growth. Over 10 years, $40,000 cash income, $135,000 capital appreciation — net $175,000 paper gain pre-CGT. Path A wins on capital but loses on cash flow stability — the 'right' answer depends on which constraint matters most for you." },
      { heading: "How to think about the choice", body: "The clean way to compare: model both paths over your real holding period, including realistic capital-growth assumptions, realistic vacancy and maintenance, your actual marginal tax rate, and the opportunity cost of cash drag. The temptation to round up growth assumptions is the most common error in the comparison — 6% nominal growth is achievable in some markets but is not the median outcome. Run the numbers conservatively, then ask whether you can absorb the negative-gearing cash drag through the next major rate cycle without distress selling. If the answer is no, positive gearing is the safer base." },
    ],
  },
  {
    slug: "selling-a-business-australia-guide",
    title: "Selling a Business in Australia: The Complete 2026 Guide",
    category: "strategy",
    tags: ["sell-business", "exit", "broker", "valuation"],
    excerpt: "From valuation to settlement: how to prepare, price, market and negotiate the sale of an Australian SME — with the small-business CGT concessions explained.",
    read_time: 10,
    content_type: "guide",
    sections: [
      { heading: "The 12-month preparation window", body: "Most well-run business sales start preparation 12 months before listing — not 12 weeks. Buyers (and brokers) look for clean three-year financials, documented systems, contracts assigned correctly, IP ownership properly held, and key-person risk mitigated. Businesses that go to market without preparation either don't sell or sell for materially less than they should. The 12-month window covers four workstreams: tidy the financial statements (formal close every month, no shareholder current accounts), document the operations (one-page SOPs for each function), lock in customer and supplier contracts, and address any legal hairs (unregistered IP, founder IP commingling, missing employment contracts)." },
      { heading: "Valuation methods that actually clear the market", body: "Three methods are routinely used. EBITDA multiple is the dominant method for established profitable SMEs — typical multiples are 2x EBITDA for owner-operator service businesses, 3–4x for systemised SMEs, 4–6x for tech-enabled or recurring-revenue businesses. Revenue multiple is used for early-stage or pre-profit companies, typically 0.5–2x annual revenue. Asset-based is the floor — net tangible assets plus goodwill — and is rarely the determining method except in low-margin physical-asset businesses. The market-clearing valuation is the lowest of the three plus negotiation. Sellers anchored to the EBITDA-multiple maximum often don't sell at all." },
      { heading: "Small business CGT concessions", body: "The small business CGT concessions are the single most valuable tax structure for owner-sellers in Australia. To qualify, the business must satisfy the small-business test (under $2M turnover or $6M net assets) and the active-asset test (the asset must have been actively used in the business for at least half its ownership period or 7.5 years). Four concessions stack: 15-year exemption (full CGT exemption if held 15+ years, owner 55+), 50% active asset reduction, retirement exemption (lifetime cap of $500K can be contributed to super CGT-free), and rollover (defer CGT by reinvesting in another active asset within 2 years). A specialist tax agent should sign off the structure 12 months before sale — not after the contract." },
      { heading: "The sale process", body: "Typical timeline from broker engagement to settlement is 6–12 months. Phase 1 — preparation and information memorandum (4–6 weeks). Phase 2 — confidential marketing to qualified buyers (8–12 weeks). Phase 3 — buyer interest, offers, selection (4–6 weeks). Phase 4 — heads of agreement, due diligence, contract negotiation (8–12 weeks). Phase 5 — settlement and handover (4–6 weeks). Most failed deals collapse in phase 4 from due-diligence surprises that should have been resolved in the preparation phase. The single best predictor of a clean sale is the quality of the data room handed to the buyer's advisors." },
    ],
  },
  {
    slug: "business-valuation-methods-australia",
    title: "How to Value a Business in Australia: 5 Methods Explained",
    category: "strategy",
    tags: ["valuation", "sell-business", "business-broker"],
    excerpt: "EBITDA multiple, revenue multiple, asset-based, DCF and market comparable — the five methods Australian business brokers actually use, with industry-specific multiples.",
    read_time: 8,
    content_type: "guide",
    sections: [
      { heading: "EBITDA multiple — the workhorse method", body: "EBITDA multiple is the default method for valuing established profitable Australian SMEs. The multiple reflects industry, recurring-revenue mix, customer concentration, owner-dependency and growth profile. Typical 2026 ranges: owner-operator services 2x, systemised services 3–4x, manufacturing 3–4x, B2B SaaS 4–8x, healthcare 4–6x, professional services 2.5–4x. EBITDA must be normalised — adjust for owner's salary at market rate, related-party rent at market rate, one-off legal or restructuring costs, and any personal expenses run through the entity. Unnormalised EBITDA is one of the most common reasons buyers walk away early in due diligence." },
      { heading: "Revenue multiple — for high-growth or pre-profit", body: "Revenue multiple is used when EBITDA is negative, near-zero, or unrepresentative of the underlying value. SaaS and tech companies are the dominant users: 0.5–2x ARR for slow growth, 2–5x for 30%+ growth, occasionally higher for category-defining brands. Outside tech, revenue multiples are unusual — they tend to reward growth at the expense of profitability and don't fit traditional SMEs. The risk: a buyer paying a revenue multiple is implicitly betting on future profitability, and the negotiation often shifts to earnouts that pay out only if revenue retention or margin trajectory hits agreed targets in years 1–3 post-sale." },
      { heading: "Asset-based and DCF", body: "Asset-based valuation totals net tangible assets plus a goodwill loading. It's the floor methodology and rarely the headline number, but it sets the negotiation backstop. Discounted cash flow (DCF) projects future cash flows and discounts them back to a present value at the buyer's required return. DCF is most common in larger transactions ($5M+) where the buyer is a private equity acquirer with a defined return hurdle. For owner-operator SME sales, DCF is rarely the binding method but is often used by buyers as a sanity check against the headline EBITDA multiple." },
      { heading: "Market comparable — the reality check", body: "Market comparable references recent sales of similar businesses in similar industries. Australian business brokers maintain proprietary databases of completed transactions and use them to triangulate. Public comparables are limited — ASX small caps trade at materially higher multiples than private SMEs, so listed-equity references almost always overstate private-market values. The single most useful tool a broker provides is a written comparable analysis on five to ten recent transactions in the same vertical. If your broker can't produce this, you don't have the right broker for your deal." },
    ],
  },
  {
    slug: "australia-national-innovation-visa-guide",
    title: "Australia National Innovation Visa 2026: The New Investor Pathway",
    category: "strategy",
    tags: ["visa", "migration", "investment", "immigration"],
    excerpt: "The SIV closed in 2024. The replacement — Subclass 858 National Innovation Visa — is invitation-only, no fixed investment threshold, and targets exceptional talent. Here's the actual pathway.",
    read_time: 8,
    content_type: "guide",
    sections: [
      { heading: "What changed in 2024", body: "The Significant Investor Visa (Subclass 188C / SIV) and the broader Business Innovation and Investment Program (BIIP) closed to new applications on 31 July 2024. The closure ended a 12-year program that channelled around $14 billion of foreign capital into Australian compliant investments — but also drew sustained criticism on whether it delivered genuine economic benefit relative to the visas granted. The replacement is the National Innovation Visa (Subclass 858), a permanent residence visa launched in late 2024 and substantially recalibrated for the 2025–26 program year." },
      { heading: "How the National Innovation Visa works", body: "The 858 is invitation-only — applicants must first lodge an Expression of Interest and be assessed against the program's priority areas: green energy and renewables, agtech, defence and space tech, advanced manufacturing, medical research and biotechnology, and quantum and AI. There is no fixed investment threshold replacing the SIV's $5M. Instead, the assessment looks at a combination of nomination from a Commonwealth or state agency, demonstrated track record of exceptional achievement, and ability to contribute economically. In practice, founders who have raised significant venture capital, scientists with senior peer-reviewed track records, and senior operators in priority industries are the strongest candidates." },
      { heading: "What it does not replace", body: "The 858 does not replace the SIV's investment threshold pathway — that path no longer exists. Foreign nationals seeking residence through capital alone now have to look at Employer Sponsored visas (482/186 with the 2025 TRT pathway), state nomination programs (190/491), or partner/family pathways. For wealthy applicants without exceptional industry track record or nomination, the practical reality of 2026 is that 'buying' permanent residence through capital deployment is effectively no longer available in Australia. This is a significant structural shift the offshore advisory community is still adjusting to." },
      { heading: "What existing SIV holders should know", body: "Holders of the 188C visa granted before 31 July 2024 retain their visa and the obligation to maintain their complying investment portfolio for the term of the visa. Pathway from 188C to permanent 888C remains. The compliance rules around the four asset buckets (venture capital, emerging companies, balancing investment) continue to apply. Existing holders considering rollover to a permanent visa should engage a registered migration agent or immigration investment lawyer well in advance — the transition is not automatic and the documentation requirements meaningfully changed in 2025." },
    ],
  },
  {
    slug: "high-dividend-asx-stocks-2026",
    title: "Highest Dividend ASX Stocks 2026: Yield, Franking & How to Buy",
    category: "strategy",
    tags: ["dividends", "asx", "income", "franking"],
    excerpt: "Top ASX dividend payers, with grossed-up yields after franking, payout reliability and the trade-off between current yield and dividend growth.",
    read_time: 8,
    content_type: "guide",
    sections: [
      { heading: "How to actually compare ASX dividend yields", body: "Headline dividend yield is the wrong number to compare ASX stocks against international peers. Australia's franking system means a 5% fully-franked yield grosses up to 7.14% pre-tax — meaningfully higher than the same nominal yield on a non-franked US, UK or European equity. Always work in grossed-up yield when comparing. Second, look at payout reliability over the last 10 years rather than the trailing 12 months — the highest current yield is often a stock that just cut, with the cut not yet reflected in consensus. Third, consider dividend growth, not just yield level — a 4% yield growing at 5% per year compounds to a higher total return than a 6% yield static or declining." },
      { heading: "The current heavyweight payers", body: "As of 2026, the recurring high-yielders include: Woodside Energy (WDS) around 6–7% gross franked depending on commodity prices; the major banks (CBA, WBC, NAB, ANZ) running 5.5–7% gross franked yields; BHP and Rio Tinto in the 5–8% range with cyclicality; and Telstra at 4.5–5% gross franked. Outside the heavyweights, mid-cap REITs (GPT, Charter Hall, Stockland) sit around 5–6% and are generally unfranked or partially franked because of trust structure. Energy and resources yields are heavily commodity-cycle dependent — a 7% yield in 2026 can be a 3% yield in 2028 if commodity prices retrace." },
      { heading: "How to buy efficiently", body: "Most retail investors building a dividend portfolio should choose between five and eight blue-chip holdings rather than chase yield across 30 names — the marginal yield from name 9 onwards rarely justifies the additional research and tax-reporting load. Use a low-cost broker (CHESS-sponsored gives the cleanest tax outcomes and direct ownership) and consider participating in dividend reinvestment plans (DRPs) to compound. For investors who prefer not to manage individual stocks, dividend ETFs like VHY, IHD and HVST provide diversified exposure at the cost of slightly lower yield and reduced franking pass-through versus direct holdings." },
      { heading: "Tax positioning matters more than ticker selection", body: "Two investors with identical dividend portfolios can have wildly different after-tax outcomes depending on structure. SMSF in pension phase (0% tax) collects the full franking credit refund as cash. SMSF in accumulation (15%) gets a meaningful refund. Personal investor at 19% marginal also gets a refund, but reduced. Personal investor at 47% marginal pays additional tax on the grossed-up yield. Putting Australian high-yielders inside the right tax wrapper is often more impactful than which specific high-yielder you own. The structural decision — wrapper, not ticker — should be made first." },
    ],
  },
  {
    slug: "best-dividend-etfs-australia",
    title: "Best Dividend ETFs Australia 2026: VHY, A200, HVST Compared",
    category: "etfs",
    tags: ["dividends", "etf", "income", "asx"],
    excerpt: "Six Australian dividend ETFs side by side: yield, franking, fees, methodology and the trade-offs each makes between current income and total return.",
    read_time: 8,
    content_type: "guide",
    sections: [
      { heading: "What dividend ETFs actually do", body: "An Australian dividend ETF holds a basket of high-yielding ASX shares and distributes the dividends to unitholders, typically quarterly. The headline yield can look attractive — often 5–6% gross franked — but methodology matters enormously. Some ETFs (VHY) screen for sustainable dividends and weight by yield within a value tilt. Others (HVST) maximise current yield through an enhanced strategy that can include options overlays. A few (A200) are broad-market funds whose yield is incidental, not engineered. The yield ladder is real but every step up in yield trades off something — concentration, total return, or capital stability." },
      { heading: "VHY versus IHD versus HVST", body: "Vanguard Australian Shares High Yield (VHY) holds around 60 names with a yield-and-quality screen, MER 0.25%, gross-of-franking yield around 5.5–6%. iShares S&P/ASX Dividend Opportunities (IHD) is more concentrated at around 50 names, MER 0.30%, similar gross yield. BetaShares HVST uses an active overlay that can produce higher current yield (often 7–8% gross) at the cost of long-run capital return — HVST has historically lagged broad-market returns over 5+ year periods despite the higher distribution. Choosing between them depends on whether income now matters more than total return — a personal trade-off, not a generic optimisation." },
      { heading: "When a broad-market ETF beats a dividend-focused one", body: "For investors more than 10 years from drawing income, a broad-market Australian ETF (VAS, A200, IOZ) usually outperforms a dividend-focused ETF on total return because the yield tilt mechanically biases away from growth names. The franking credits still flow through (broad-market Australian indices are heavily franked because the major banks, miners and Telstra dominate the index by weight). The case for dividend-focused ETFs is strongest in the income drawdown phase — pension-phase SMSFs, retirees living off distributions — where the higher cash yield reduces the need to sell units to fund living expenses." },
      { heading: "Building a portfolio combining both", body: "A common 2026 configuration: 70% broad-market Australian (VAS or A200) for total return and structural franking exposure, 20% dividend-focused (VHY or IHD) for explicit yield concentration, 10% global ex-Australia (VGS) for diversification. This blend captures the franking credit advantage that makes Australian equity structurally attractive in tax-effective wrappers while reducing single-country risk. The blend also keeps you out of the worst trap in dividend investing — chasing yield to the exclusion of growth, then watching nominal returns lag for a decade." },
    ],
  },
];

async function seedArticles() {
  let inserted = 0;
  let skipped = 0;
  let errors = 0;
  const now = new Date().toISOString();
  for (const a of ARTICLES) {
    const { data: existing } = await supabase
      .from("articles")
      .select("slug")
      .eq("slug", a.slug)
      .maybeSingle();
    if (existing) { skipped++; continue; }
    const { error } = await supabase.from("articles").insert({
      slug: a.slug,
      title: a.title,
      category: a.category,
      tags: a.tags,
      excerpt: a.excerpt,
      read_time: a.read_time,
      sections: a.sections,
      author_name: AUTHOR_NAME,
      status: "published",
      evergreen: true,
      content_type: a.content_type || "guide",
      related_brokers: [],
      published_at: now,
      created_at: now,
      updated_at: now,
    });
    if (error) {
      console.error(`  ! ${a.slug}: ${error.message}`);
      errors++;
      continue;
    }
    inserted++;
  }
  console.log(`articles: ${inserted} inserted, ${skipped} already present, ${errors} errors`);
}

async function main() {
  console.log("Seeding revenue-expansion data…");
  await seedLeadPricing();
  await seedArticles();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
