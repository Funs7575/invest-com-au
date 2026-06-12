/**
 * /raise guide registry (CR-02) — answer-first funding-pathway guides.
 *
 * Content rules (CAPITAL_RAISING_OPPORTUNITIES.md §2.3): factual, pathway-
 * category education for business owners. No specific-offer content, no
 * provider recommendations, no "invest in X". The CSF guide's platform table
 * is strictly factual; we currently have NO commercial relationship with any
 * CSF intermediary and the page says so. If a referral deal is ever signed,
 * the disclosure must be swapped to ADVERTISER_DISCLOSURE before the link
 * goes through /go/ (REGULATORY-AVOID-LIST: referral exemption requires
 * benefit disclosure at the time of referral).
 */

import type { PathwayId } from "./pathways";

export interface GuideFaq {
  q: string;
  a: string;
}

export interface GuideSection {
  heading: string;
  body: string;
}

export interface CsfPlatformRow {
  name: string;
  url: string;
  focus: string;
  fees: string;
}

export interface RaiseGuide {
  slug: string;
  pathwayId: PathwayId;
  title: string;
  metaDescription: string;
  /** Answer-first opening — the first thing on the page (GEO). */
  tldr: string;
  sections: GuideSection[];
  faqs: GuideFaq[];
  /** Render the factual CSF intermediary table (equity-crowdfunding only). */
  showCsfPlatformTable?: boolean;
}

/**
 * Licensed CSF intermediaries — factual reference table (verified against
 * public sources 2026-06; see strategy doc §11). Equitise is excluded:
 * it entered voluntary administration in late 2024.
 */
export const CSF_PLATFORMS: CsfPlatformRow[] = [
  {
    name: "Birchal",
    url: "https://www.birchal.com",
    focus: "Consumer brands and community-driven companies; the largest share of Australian CSF volume",
    fees: "Publicly reported: fixed fee plus a tiered success fee (~5–8% by raise size) — confirm current pricing with the platform",
  },
  {
    name: "OnMarket",
    url: "https://www.onmarket.com.au",
    focus: "CSF offers alongside IPO/placement access",
    fees: "Fixed + success-fee model — confirm with the platform",
  },
  {
    name: "Swarmer",
    url: "https://www.swarmer.com.au",
    focus: "Early-stage Australian companies",
    fees: "Confirm with the platform",
  },
  {
    name: "VentureCrowd",
    url: "https://www.venturecrowd.com.au",
    focus: "Multi-asset platform spanning retail CSF and wholesale offers",
    fees: "Confirm with the platform",
  },
];

export const RAISE_GUIDES: RaiseGuide[] = [
  {
    slug: "equity-crowdfunding",
    pathwayId: "csf",
    title: "Equity Crowdfunding (CSF) in Australia: How It Works",
    metaDescription:
      "How crowd-sourced funding works in Australia: who's eligible, the $5M cap, what it costs, how long it takes, and a factual comparison of the licensed CSF platforms.",
    tldr:
      "Crowd-sourced funding (CSF) lets eligible Australian companies — unlisted, with under $25M in gross assets and under $25M in annual revenue — raise up to $5M every 12 months from the public in exchange for ordinary shares. Offers can only run on an ASIC-licensed CSF intermediary platform, retail investors are capped at $10,000 per company per year, and a realistic campaign takes 3–6 months end to end.",
    sections: [
      {
        heading: "Who is eligible",
        body:
          "The company (with related parties consolidated) must have less than $25M in gross assets AND less than $25M in annual revenue, be an Australian unlisted company, and not have a substantial purpose of investing in other entities. Both public and proprietary companies can use the regime — proprietary companies need at least two directors. Only fully paid ordinary shares can be offered.",
      },
      {
        heading: "What it costs",
        body:
          "Expect three cost lines: platform fees (commonly a fixed engagement fee plus a success fee of roughly 5–8% of funds raised), professional fees (your accountant and lawyer preparing financials and the CSF offer document), and the campaign itself (video, PR, community management). On a $500k raise, all-in costs frequently land between 8% and 12% — plus the equity you sell.",
      },
      {
        heading: "How long it takes",
        body:
          "Plan 3–6 months: 4–8 weeks getting raise-ready (financials, structure, offer document), 2–4 weeks of platform review and 'expression of interest' build-up, then a 2–6 week live offer with a 5-business-day cooling-off for investors. Campaigns convert existing fans — the businesses that do best arrive with an engaged customer community, not just a good product.",
      },
      {
        heading: "What happens after the raise",
        body:
          "You'll have hundreds or thousands of new shareholders on your register. Budget for a share-registry tool, annual communications, and the governance habits that come with outside money. Done well, those shareholders become your most motivated customers and advocates — that's the real strategic payoff of CSF over quiet capital.",
      },
    ],
    faqs: [
      {
        q: "Can any business use equity crowdfunding in Australia?",
        a: "No. You need an eligible Australian company under the $25M gross-assets and $25M revenue caps, offering fully paid ordinary shares, and your offer must run on a licensed CSF intermediary platform. Sole traders, trusts and partnerships would need to incorporate first.",
      },
      {
        q: "How much can we raise through CSF?",
        a: "The legal cap is $5M in any rolling 12-month period (counting certain other reduced-disclosure raises). Typical successful Australian campaigns land between $200k and $3M.",
      },
      {
        q: "Do investors get voting shares?",
        a: "CSF offers can only be fully paid ordinary shares, so yes — although many companies manage practicalities through share-registry tools and, where appropriate, nominee arrangements set up with proper legal advice.",
      },
      {
        q: "Can invest.com.au run our raise?",
        a: "No — and that's deliberate. We provide general information and readiness help only. CSF offers can only be hosted by an ASIC-licensed CSF intermediary; we don't host, arrange or facilitate offers.",
      },
    ],
    showCsfPlatformTable: true,
  },
  {
    slug: "angel-investment",
    pathwayId: "angel",
    title: "Angel Investment in Australia: Raising From Private Investors",
    metaDescription:
      "How Australian angel rounds actually work: wholesale-investor rules, typical cheque sizes, where to meet angels, and how to run a clean early round.",
    tldr:
      "Angel investment is early equity from individuals — usually 'sophisticated investors' under the Corporations Act wholesale tests ($250k income for two years or $2.5M net assets, certified by a qualified accountant). Typical Australian angel cheques run $25k–$250k, syndicates can cover $1M+, and rounds close through genuine networks because private offers can't be advertised to the public.",
    sections: [
      {
        heading: "The rules that shape angel rounds",
        body:
          "Most angel investment relies on the Corporations Act exemptions from retail disclosure: offers to 'sophisticated investors' (wholesale test), professional investors, or small-scale personal offers (no more than 20 investors and $2M in any 12 months — and genuinely personal, meaning offers can't be advertised publicly). This is why angel fundraising runs on warm introductions, investor networks and licensed platforms rather than public posts.",
      },
      {
        heading: "What angels look for",
        body:
          "A team they believe, a market big enough to matter, early evidence (users, revenue, letters of intent), and clean paperwork. Australian angels increasingly invest through SAFEs or convertible notes at pre-seed, and priced rounds from seed onward. Whatever the instrument, get it drafted properly — bad early terms are the most expensive mistake a founder can make.",
      },
      {
        heading: "Where to find them",
        body:
          "Angel groups and syndicates (most capital cities have at least one), accelerator demo days, founder referrals, and your own customer and industry network. The single best predictor of a closed round is the founder's willingness to run a structured outreach process: a tight list, a clear ask, weekly momentum.",
      },
      {
        heading: "Running a clean round",
        body:
          "Decide instrument and target before the first meeting. Prepare a one-pager, a 10–12 slide deck and a simple data folder (financials, cap table, key contracts). Have your accountant ready to talk wholesale certificates, and a lawyer review every signed document. Momentum closes rounds: stack meetings into a short window rather than dripping them across a year.",
      },
    ],
    faqs: [
      {
        q: "Who counts as a sophisticated investor?",
        a: "Someone with a qualified accountant's certificate (no more than two years old) confirming at least $250,000 gross income in each of the last two financial years or $2.5M in net assets. There are also professional-investor and licensee-assessed pathways.",
      },
      {
        q: "Can we advertise our raise publicly?",
        a: "Not for private offers — public advertising is restricted and would undermine the small-scale 'personal offer' exemption. Public fundraising for retail investors is what the CSF regime exists for, on licensed platforms.",
      },
      {
        q: "How much equity do angels take?",
        a: "Pre-seed and seed rounds in Australia commonly clear 10–25% in total across the round, depending on traction and amount raised. Instrument choice (SAFE vs priced) changes when that dilution lands, not whether it happens.",
      },
    ],
  },
  {
    slug: "venture-capital",
    pathwayId: "vc",
    title: "Venture Capital in Australia: Is Your Business VC-Shaped?",
    metaDescription:
      "What Australian VCs fund, how much rounds raise, the real timeline, and an honest test for whether venture capital fits your business at all.",
    tldr:
      "Venture capital is institutional equity for companies that can credibly become very large, very fast. Australian VCs backed roughly 390 announced deals (~$5.4B) in 2025 — a narrow funnel. Rounds run $1M–$20M+, take 3–9 months, and cost meaningful dilution plus board-level obligations. If your business can thrive at 2–5× growth, you're usually better served by debt, grants or profitable growth — and that's a strength, not a failure.",
    sections: [
      {
        heading: "What VCs actually underwrite",
        body:
          "A fund needs a small number of outsized winners to return its capital, so partners look for: a market that supports a $100M+ revenue outcome, growth evidence (not projections), a defensible edge — technology, network effects, distribution — and founders who can recruit. 'Profitable and steady' is a great business and a poor venture asset; be honest with yourself about which you're building.",
      },
      {
        heading: "Round sizes and stages",
        body:
          "Pre-seed and seed rounds typically raise $500k–$3M for early traction. Series A ($3M–$15M) expects repeatable go-to-market with strong growth. Later rounds scale what's working. Each round usually sells 15–25% of the company and adds investor rights — information, pro-rata, sometimes a board seat.",
      },
      {
        heading: "The process and timeline",
        body:
          "From first partner meeting to money in the bank is commonly 3–9 months: outreach, partner meetings, term sheet, due diligence, legals. Run it like a sales process — a qualified list of funds whose thesis matches your stage and sector, batched meetings, and a data room ready before you start. Fundraising consumes a founder; don't start it casually.",
      },
      {
        heading: "Getting structure-ready",
        body:
          "Institutional investors expect a clean Pty Ltd with a sensible cap table, an employee share option plan (ESOP), assigned IP, and financials that reconcile. Fixing structure mid-raise burns months; have your accountant and a startup-literate lawyer prepare it before outreach.",
      },
    ],
    faqs: [
      {
        q: "How many companies actually raise VC in Australia?",
        a: "Around 390 announced deals were funded in 2025 across all stages — against hundreds of thousands of growing businesses. It's a deliberately narrow pathway; most strong businesses fund themselves through other routes.",
      },
      {
        q: "What does a VC round cost in equity?",
        a: "Plan on 15–25% dilution per round, plus an ESOP top-up (often 10%) that founders absorb. Across three rounds, founders commonly end below 50% ownership — the bet is that a smaller share of something much larger is worth it.",
      },
      {
        q: "Do we need revenue before talking to VCs?",
        a: "At pre-seed, exceptional teams raise on insight and early product. From seed onward, Australian funds increasingly expect revenue and named growth metrics. The bar moves with the market — evidence beats narrative.",
      },
    ],
  },
  {
    slug: "business-debt",
    pathwayId: "debt",
    title: "Business Debt Finance in Australia: Borrowing Without Dilution",
    metaDescription:
      "Working capital, invoice finance, equipment and secured loans for Australian businesses: what lenders look for, what it costs, and how to compare offers properly.",
    tldr:
      "Business debt lets a trading company raise capital without selling equity: unsecured working capital (fast, smaller, dearer), invoice and equipment finance (secured against what you have), and property-secured facilities (cheapest, slowest). Lenders price on trading history, cash flow and security. Business-purpose lending sits outside the consumer credit regime, so terms vary far more than home loans — compare total cost of capital, not headline rates.",
    sections: [
      {
        heading: "The main products",
        body:
          "Unsecured business loans ($10k–$500k, days to approve, higher rates), invoice finance (advance against receivables — grows with sales), equipment/asset finance (the asset is the security), business lines of credit (draw as needed), and property-secured loans (lowest rates, real security at stake). Match the product to the purpose: don't fund long-term assets with short-term cash-flow products.",
      },
      {
        heading: "What lenders look for",
        body:
          "Time trading (6–24 months minimum for most), revenue and its trend, account conduct, existing debts, and security. Almost all small-business lending includes a director's personal guarantee — understand exactly what you're signing before you sign it.",
      },
      {
        heading: "Comparing offers honestly",
        body:
          "Quoted 'factor rates' and simple interest figures hide real costs. Convert every offer to total dollars repaid and an annualised rate, include establishment and early-repayment fees, and check repayment frequency (daily debits strain cash flow). An accountant can model the comparison in an hour — cheap insurance against an expensive facility.",
      },
      {
        heading: "When debt is the wrong answer",
        body:
          "Pre-revenue companies, businesses with lumpy unpredictable cash flow, and 'borrowing to survive' situations usually shouldn't add repayments. If the capital is funding a genuine growth asset with a return above the interest cost, debt is often the cheapest money you'll ever raise; if it's plugging losses, fix the losses first.",
      },
    ],
    faqs: [
      {
        q: "Do business loans need a consumer credit licence?",
        a: "Loans predominantly for business purposes sit outside the National Consumer Credit Protection regime, which is why the market is faster and more varied — and why diligence is on you. Sole traders borrowing for personal needs are still consumers under the regime.",
      },
      {
        q: "Will I have to guarantee the loan personally?",
        a: "For small and medium facilities, almost always yes. A personal guarantee puts your personal assets behind the debt — have a lawyer or accountant explain the exact exposure before signing.",
      },
      {
        q: "How fast can business finance land?",
        a: "Unsecured working capital can approve in 24–72 hours. Secured and property-backed facilities take weeks. If your need is urgent, debt is usually the only pathway fast enough — at a price.",
      },
    ],
  },
  {
    slug: "government-grants",
    pathwayId: "grants",
    title: "Government Grants for Australian Businesses: The Non-Dilutive Pathway",
    metaDescription:
      "R&D Tax Incentive, EMDG, Industry Growth Program and state grants: what Australian businesses can claim, how much, and how to apply without wasting months.",
    tldr:
      "Grants are the only funding pathway where you keep all your equity and repay nothing. The big three for growing businesses: the R&D Tax Incentive (refundable 43.5% offset on eligible R&D for companies under $20M turnover), EMDG (up to 50% of export-marketing spend reimbursed), and the Industry Growth Program ($50k–$5M for priority sectors). Most money is reimbursed or offset after spend — grants reward documented activity, they don't fund ideas upfront.",
    sections: [
      {
        heading: "Start with the R&D Tax Incentive",
        body:
          "If you're solving technical problems where the outcome wasn't knowable in advance, you may be doing eligible R&D — software counts when there's genuine technical uncertainty. Companies under $20M turnover get a refundable 43.5% offset (cash back even pre-profit). The discipline is contemporaneous documentation: hypotheses, experiments, results. Set that up now, claim at tax time.",
      },
      {
        heading: "Exporting? EMDG",
        body:
          "Export Market Development Grants reimburse up to 50% of eligible overseas marketing spend — trips, trade shows, overseas reps, digital campaigns — in tiered annual caps. Plan the application before the spend, keep every receipt, and treat it as a multi-year program rather than a one-off.",
      },
      {
        heading: "State and sector programs",
        body:
          "Every state runs its own stack (e.g. NSW MVP Ventures, LaunchVic, Advance Queensland), and federal programs target priority sectors. Rules and rounds change constantly — check current criteria on official portals (business.gov.au, GrantConnect, your state's grants page) rather than year-old blog posts.",
      },
      {
        heading: "Doing it without burning months",
        body:
          "Triage hard: only pursue grants whose criteria you already substantially meet. Budget real hours for applications (a small grant can still cost 20–40 hours), and for large or complex claims consider a specialist grant writer or R&D advisor — typical market pricing runs from a few hundred dollars an hour to $500–$5,000 per application, against claims often worth 10–100× that.",
      },
    ],
    faqs: [
      {
        q: "Are grants taxable?",
        a: "Generally yes — most business grants are assessable income, and the R&D offset interacts with your tax position. Confirm treatment with your accountant per program.",
      },
      {
        q: "Can pre-revenue startups get grants?",
        a: "Yes — the R&D Tax Incentive's refundable offset is precisely valuable pre-profit, and several state programs target early-stage companies. You'll still need an Australian entity and documented activity.",
      },
      {
        q: "Where do I check what's currently open?",
        a: "Run our grants eligibility quiz for a personalised starting list, then verify on business.gov.au's Grants and Programs Finder and GrantConnect — rounds open and close all year.",
      },
    ],
  },
  {
    slug: "bootstrapping",
    pathwayId: "bootstrap",
    title: "Bootstrapping: Funding Growth From Revenue",
    metaDescription:
      "How Australian founders grow without investors: pre-sales, pricing, cash-flow discipline, and when to revisit outside capital.",
    tldr:
      "Bootstrapping means funding the business from customers — pre-sales, early revenue and disciplined costs — instead of investors or lenders. You keep every share and every decision, in exchange for growth that tracks cash generation. It pairs naturally with grants (non-dilutive) and with debt once revenue is established, and it keeps every other pathway open for later, on better terms.",
    sections: [
      {
        heading: "Make customers the investors",
        body:
          "Charge earlier than feels comfortable: paid pilots, annual-upfront pricing, deposits and pre-orders all pull funding forward from the people who actually want the product. Revenue is the only capital that arrives with product-market-fit evidence attached.",
      },
      {
        heading: "Engineer the cash cycle",
        body:
          "Invoice immediately, chase receivables weekly, negotiate supplier terms, and keep fixed costs variable for as long as possible. A business that collects in 14 days and pays in 45 funds its own growth; the reverse needs someone else's money to survive.",
      },
      {
        heading: "Stack the non-dilutive extras",
        body:
          "Bootstrappers should be the heaviest users of the grants stack — the R&D Tax Incentive's refundable offset is effectively a 43.5% rebate on eligible build cost. Add EMDG when you export. None of it costs equity.",
      },
      {
        heading: "Revisit the decision honestly",
        body:
          "Bootstrapping is a strategy, not an identity. If a competitor is out-spending you into a winner-takes-most market, or demand is outrunning your capacity, re-run the numbers on outside capital — raising from strength, with revenue, is when terms are best.",
      },
    ],
    faqs: [
      {
        q: "Is bootstrapping slower?",
        a: "Usually, yes — growth is bounded by cash generation. The trade is control, optionality and zero dilution. Many of Australia's best private businesses never raised a cent.",
      },
      {
        q: "Can I bootstrap and still raise later?",
        a: "Absolutely — it's the strongest position to raise from. Investors pay up for businesses that demonstrably don't need them.",
      },
    ],
  },
  {
    slug: "selling-your-business",
    pathwayId: "sale",
    title: "Selling Your Business: The Exit Pathway",
    metaDescription:
      "When a full or partial sale is the right funding answer for Australian business owners: preparation, valuation drivers, and the 12-month runway to a clean exit.",
    tldr:
      "Sometimes the right 'capital raise' is converting the value you've already built into cash — a full sale, a partial sale, or a succession deal. Buyers pay for transferable value: documented financials, systems that run without the owner, contracted revenue and a believable growth story. A well-run sale takes 6–18 months, and preparation moves valuation more than negotiation does.",
    sections: [
      {
        heading: "Full, partial, or succession",
        body:
          "A full trade sale maximises liquidity and ends your obligations. A partial sale (selling a stake) releases capital while you keep running the business — common with private equity and strategic investors. Succession (management buyout, family transfer, employee ownership) trades headline price for continuity. Decide what you actually want before the market decides for you.",
      },
      {
        heading: "What moves valuation",
        body:
          "Clean, accountant-prepared financials (three years), revenue quality (recurring beats project work), customer concentration (no single customer over ~20%), documented processes, and the business's independence from you personally. Each of these is fixable in 6–12 months — which is why preparation outearns negotiation.",
      },
      {
        heading: "The process",
        body:
          "Valuation baseline → preparation sprint → confidential information memorandum → buyer outreach (trade buyers, financial buyers, brokers' networks) → offers and diligence → contracts and completion. Business brokers and M&A advisers typically charge a success fee; legal and tax structuring (CGT small-business concessions can be transformative) need professional advice early, not at signing.",
      },
    ],
    faqs: [
      {
        q: "How are small businesses valued in Australia?",
        a: "Most trade on a multiple of adjusted earnings (EBITDA or SDE), with the multiple set by size, growth, recurring revenue and risk. Get a professional valuation baseline before believing any rule of thumb.",
      },
      {
        q: "What about capital gains tax?",
        a: "The CGT small-business concessions can dramatically reduce or eliminate tax on a qualifying sale — but eligibility is technical and structure-dependent. Talk to a tax adviser at least a year before you plan to transact.",
      },
      {
        q: "Can I sell part of the business and keep running it?",
        a: "Yes — partial sales to investors or staged earn-out structures are common. They release capital and de-risk you personally while keeping upside.",
      },
    ],
  },
];

export const guideBySlug = (slug: string): RaiseGuide | undefined =>
  RAISE_GUIDES.find((g) => g.slug === slug);

export const GUIDE_SLUGS = RAISE_GUIDES.map((g) => g.slug);
