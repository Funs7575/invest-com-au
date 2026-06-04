/**
 * Per-vertical "How to invest in X" guide content (Wave 7 SEO).
 *
 * Powers the programmatic `/how-to-invest-in/[vertical]` route — one
 * authoritative page per opportunity vertical that unifies the three
 * high-intent query shapes the gap audit flagged (how-to / minimum
 * investment / tax treatment) into a single strong page rather than
 * three thin doorway pages.
 *
 * The vertical list + labels + intro + FAQs come from the canonical
 * `getOpportunityCategories()` (lib/invest-categories.ts). This module
 * adds the guide-specific editorial: how-to steps, minimum-investment
 * guidance, AU tax treatment, and key risks. The page also pulls a LIVE
 * minimum from the marketplace DB at render time, so the pages stay
 * self-updating rather than static doorway content.
 *
 * Authoring bar: every entry is factual and AU-specific. No entry is
 * auto-generated boilerplate — that's the difference between a useful
 * guide and SEO spam.
 */

export interface InvestGuideContent {
  /** 4–5 concrete steps to actually make this investment in Australia. */
  howTo: string[];
  /** Prose on typical entry ticket sizes + access constraints. */
  minimum: string;
  /** AU tax treatment — CGT, GST, FIRB, franking, MIT, concessions. */
  tax: string;
  /** Key risks specific to the asset class. */
  risks: string[];
}

/**
 * Guide content keyed by /invest category slug. Only the
 * opportunity-intent verticals are present; anything missing falls back
 * to `genericGuide()`.
 */
export const INVEST_GUIDE_CONTENT: Record<string, InvestGuideContent> = {
  "buy-business": {
    howTo: [
      "Decide what you can run: an owner-operated business needs your time; a manager-run one trades a lower price multiple for passivity.",
      "Get the financials verified — request 3 years of P&L, BAS statements and tax returns, and confirm the seller's discretionary earnings (SDE) with an accountant.",
      "Check the lease, key staff, supplier contracts and customer concentration before you sign a heads of agreement.",
      "Structure the purchase as a going concern where eligible (GST-free) and budget for working capital on top of the asking price.",
      "Use a business broker or M&A advisor for deals above ~$1M; engage a commercial lawyer for the sale contract regardless of size.",
    ],
    minimum: "Small owner-operated businesses (cafes, e-commerce stores, service businesses) list from around $50,000–$300,000. Established businesses with manager-run operations and $500k+ EBITDA typically trade at $1M–$10M, priced at 2–4× SDE for small operators and 3–6× EBITDA for larger ones.",
    tax: "A going-concern transfer is GST-free under s38-325 of the GST Act when all assets needed to continue operating transfer and both parties agree in writing. Asset-only sales attract 10% GST. On exit, the small-business CGT concessions (15-year exemption, 50% active-asset reduction, retirement exemption, rollover) can dramatically reduce or eliminate capital gains tax if you meet the $6M net-asset or $2M turnover test.",
    risks: [
      "Customer concentration — one client over ~25% of revenue is a red flag.",
      "Owner-dependence: revenue that walks out the door when the seller leaves.",
      "Lease risk on premises-dependent businesses (hospitality, retail).",
      "Add-backs in the SDE that don't survive a change of ownership.",
    ],
  },
  franchise: {
    howTo: [
      "Read the Franchise Disclosure Document (FDD) and the franchise agreement — the ACCC mandates a 14-day cooling-off period and disclosure.",
      "Talk to existing and former franchisees about real (not projected) earnings, royalty load and franchisor support.",
      "Model the total establishment cost: franchise fee, fit-out, equipment, initial stock and working capital — often well above the headline fee.",
      "Confirm territory exclusivity, renewal terms and exit/transfer conditions.",
      "Have a franchise-specialist lawyer review the agreement before signing.",
    ],
    minimum: "Service and home-based franchises start around $50,000–$150,000. Food & beverage and fitness franchises with fit-out typically run $250,000–$700,000+ all-in. Master/area-development rights run higher.",
    tax: "Franchise fees are generally capital in nature (added to the cost base, not immediately deductible), while ongoing royalties and marketing levies are deductible business expenses. The small-business CGT concessions can apply on exit. GST applies to the franchise fee and royalties.",
    risks: [
      "Royalty + marketing levy load eroding net margin.",
      "Franchisor financial health and brand reputation risk.",
      "Limited operational autonomy — you run their system, not yours.",
      "Territory encroachment and renewal-term uncertainty.",
    ],
  },
  "commercial-property": {
    howTo: [
      "Pick the sub-type that matches your risk appetite: office, industrial, retail, medical or childcare — each has different yield, WALE and tenant-risk profiles.",
      "Scrutinise the lease: WALE (weighted average lease expiry), tenant covenant strength, rent-review structure and outgoings recovery.",
      "Get an independent valuation and a building/structural inspection.",
      "Arrange commercial finance (typically 65–70% LVR, higher rates than residential) or buy through an SMSF/syndicate.",
      "Engage a commercial buyers agent and a property lawyer for due diligence and settlement.",
    ],
    minimum: "Direct commercial property generally starts around $500,000 for small suburban retail/office, scaling into the millions for institutional-grade assets. Fractional and syndicated structures (unlisted property trusts) let you access commercial property from $5,000–$25,000.",
    tax: "Net rental income is taxed at your marginal rate (or 15%/0% inside an SMSF). The 50% CGT discount applies to assets held >12 months by individuals/trusts (⅓ for SMSFs). GST applies to commercial property unless sold as a going concern with a lease in place. Foreign buyers need FIRB approval and pay state stamp-duty surcharges.",
    risks: [
      "Vacancy risk — commercial leases can leave a property empty for months.",
      "Tenant covenant: a single-tenant asset lives or dies on that tenant.",
      "Interest-rate sensitivity on geared holdings.",
      "Illiquidity — direct commercial property can take months to sell.",
    ],
  },
  farmland: {
    howTo: [
      "Decide cropping, grazing, dairy, viticulture or horticulture — each has different water, capital and management needs.",
      "Assess water security separately: a farm is often only as valuable as its water entitlements and rainfall reliability.",
      "Review soil tests, carrying capacity, improvements (sheds, irrigation, fencing) and historical yields.",
      "Consider lease-back to a farm operator for passive income, or a managed agricultural fund for diversification.",
      "Engage a rural property agent and check FIRB rules if you're a foreign investor (a $15M cumulative threshold applies to agricultural land).",
    ],
    minimum: "Direct farmland varies enormously by region and use — small holdings from a few hundred thousand dollars, productive broadacre and irrigated properties into the tens of millions. Agricultural managed funds offer diversified exposure from $5,000–$50,000.",
    tax: "Farmland held as an investment qualifies for the 50% CGT discount after 12 months. Primary producers get specific concessions (farm-management deposits, income averaging, accelerated depreciation on water/fencing/fodder assets). GST treatment depends on whether the land is sold as a going concern. Foreign investors face a $15M cumulative FIRB threshold on agricultural land.",
    risks: [
      "Drought, flood and commodity-price cycles.",
      "Water-entitlement value and allocation volatility.",
      "Thin buyer pool — regional farmland can be slow to sell.",
      "Management intensity unless leased to an operator.",
    ],
  },
  mining: {
    howTo: [
      "Understand the stage: explorer (highest risk), developer (pre-production), or producer (cash-flowing) — risk and capital needs differ wildly.",
      "Read the JORC resource statement: grade, tonnage, and the confidence category (inferred vs measured).",
      "For project equity, review the feasibility study, offtake agreements and the funding/permitting pipeline.",
      "For listed exposure, compare ASX miners or sector ETFs instead of single tenements.",
      "Most pre-production project equity is wholesale-only (s708) — confirm your investor status.",
    ],
    minimum: "ASX-listed miners and sector ETFs are accessible from a single share via any broker. Direct project-equity and tenement deals are typically wholesale-only with minimums from $25,000–$250,000+.",
    tax: "Listed mining shares follow normal share tax: dividends (often unfranked for explorers) at marginal rate, 50% CGT discount after 12 months. Project-equity and royalty interests are taxed on income at marginal/structure rates; mining royalty streams are ordinary income. Foreign investment in mining tenements is generally FIRB-notifiable.",
    risks: [
      "Exploration is binary — most explorers never reach production.",
      "Commodity-price cycles and recurring equity dilution.",
      "Permitting, native-title and environmental-approval risk.",
      "Single-project concentration vs diversified ETF exposure.",
    ],
  },
  "renewable-energy": {
    howTo: [
      "Choose the technology and stage: solar, wind, battery storage or hydrogen, and whether the project is pre-FID, construction or operating.",
      "For operating assets, check the PPA (power-purchase agreement) term and counterparty, grid-connection status and capacity factor.",
      "For development equity, review ARENA/CEFC support, grid-connection queue position and target IRR.",
      "Compare direct project equity against renewable-energy ETFs (FUEL, CLNE, ERTH) for diversified, liquid exposure.",
      "Confirm wholesale-investor eligibility for project-equity raises.",
    ],
    minimum: "Renewable ETFs and listed clean-energy stocks are accessible from one share. Direct project-equity and community-solar raises typically start at $10,000–$100,000, with utility-scale wholesale rounds far higher.",
    tax: "Listed exposure follows normal share tax. Project equity is taxed on distributions at your structure's rate, with the 50% CGT discount on gains held >12 months (individuals/trusts). Some renewable infrastructure is held in MIT structures attracting 15% withholding for eligible foreign investors.",
    risks: [
      "Policy and subsidy dependence — returns can hinge on government support.",
      "Grid-connection delays and curtailment risk.",
      "Merchant-power price exposure when PPAs roll off.",
      "Pre-FID projects can be cancelled entirely.",
    ],
  },
  startups: {
    howTo: [
      "Decide between angel investing in single companies (highest risk) and a diversified VC/ESVCLP fund.",
      "Confirm whether the company qualifies as an ESIC — the early-stage innovation company tax incentive is a major sweetener.",
      "Review the cap table, valuation, runway, and the lead investor's terms (SAFE, convertible note or priced round).",
      "Most rounds are wholesale-only (s708) — equity crowdfunding platforms (Birchal, Equitise) are the main retail-accessible route.",
      "Expect a 7–10 year horizon and size positions assuming most fail.",
    ],
    minimum: "Equity crowdfunding lets retail investors in from ~$50–$2,500 per deal. Direct angel rounds and ESVCLP funds are typically wholesale-only with minimums from $25,000–$250,000.",
    tax: "The ESIC incentive gives a 20% non-refundable carry-forward tax offset (capped at $200k/year for sophisticated investors, $10k for retail) plus a 10-year CGT exemption on qualifying shares. ESVCLP funds pass through a flat 10% tax offset on contributions and a 100% CGT exemption at the fund level — among the most generous concessions in the AU tax system.",
    risks: [
      "Most startups fail — total loss of capital is the base case for any single deal.",
      "Illiquidity: no secondary market until an exit, typically 7–10 years out.",
      "Dilution across subsequent rounds.",
      "Valuation opacity in private markets.",
    ],
  },
  alternatives: {
    howTo: [
      "Pick a category you understand — wine, whisky, watches, classic cars, art, coins or memorabilia each have distinct markets.",
      "Buy authenticated, provenance-documented items from reputable dealers or platforms; condition and certification drive value.",
      "Factor in carrying costs: insured storage, appraisal, and buy/sell spreads that are far wider than financial assets.",
      "Consider fractional platforms for access to blue-chip items without buying the whole asset.",
      "Treat it as a small, long-horizon satellite allocation — not a core holding.",
    ],
    minimum: "Entry varies by category — coins and wine from a few hundred dollars, watches and art from thousands, classic cars and rare whisky casks from tens of thousands. Fractional platforms lower the entry to as little as $50–$500 per share of an item.",
    tax: "Collectables are CGT assets with special rules: the 50% CGT discount applies after 12 months, but capital losses on collectables can only offset gains on other collectables. Items acquired for $500 or less are generally CGT-exempt. Personal-use assets acquired for $10,000 or less are also exempt. GST may apply to dealer purchases.",
    risks: [
      "Wide bid-ask spreads and high transaction/storage costs.",
      "Authenticity and provenance fraud.",
      "No income — pure capital play, and illiquid.",
      "Taste-driven markets that can fall out of fashion.",
    ],
  },
  "private-credit": {
    howTo: [
      "Understand the structure: direct lending, mezzanine debt or a pooled private-credit fund — and where it sits in the capital stack.",
      "Review the loan-to-value ratios, security, borrower quality and the manager's default/recovery track record.",
      "Check liquidity terms — most private-credit funds have lock-ups and limited redemption windows.",
      "Compare target yield against the risk: higher yields usually mean lower-quality borrowers or thinner security.",
      "Most offerings are wholesale-only — confirm your sophisticated-investor status.",
    ],
    minimum: "Pooled private-credit funds (La Trobe, Metrics, Qualitas) start from around $10,000–$100,000. Direct deals and mezzanine tranches are typically wholesale-only with $50,000–$250,000 minimums.",
    tax: "Private-credit distributions are ordinary income taxed at your marginal/structure rate — there is no CGT discount on the income component. Some funds are MIT-structured, giving eligible foreign investors a 15% withholding rate. Interest income inside an SMSF is taxed at 15% (0% in pension phase).",
    risks: [
      "Credit/default risk concentrated in the borrower pool.",
      "Illiquidity and gated redemptions in stressed markets.",
      "Yield does not equal return once defaults are netted out.",
      "Less transparency than listed fixed income.",
    ],
  },
  infrastructure: {
    howTo: [
      "Decide between listed infrastructure (toll roads, airports, utilities via ASX/ETFs) and unlisted infrastructure funds.",
      "Assess the asset's revenue model: regulated, contracted (availability payments) or demand-based.",
      "For unlisted funds, review the lock-up, fee structure and the manager's asset pipeline.",
      "Infrastructure suits income-focused, long-horizon investors seeking inflation-linked cash flows.",
      "Confirm wholesale eligibility for direct/unlisted access.",
    ],
    minimum: "Listed infrastructure stocks and ETFs are accessible from one share. Unlisted infrastructure funds typically start at $25,000–$100,000+ and are often wholesale-only.",
    tax: "Listed infrastructure follows normal share tax (franking where applicable, 50% CGT discount). Unlisted infrastructure distributions are taxed on income at your structure's rate; MIT structures give eligible foreign investors a 15% withholding rate. Long-duration assets held >12 months attract the CGT discount for individuals/trusts.",
    risks: [
      "Regulatory and political risk on regulated assets.",
      "Interest-rate sensitivity (infrastructure is bond-like).",
      "Demand risk on patronage-based assets (toll roads, airports).",
      "Illiquidity in unlisted structures.",
    ],
  },
  funds: {
    howTo: [
      "Match the fund's strategy and risk to your goal: income, growth, absolute-return or sector-specific.",
      "Read the PDS and Target Market Determination (TMD); check the MER, performance fee, and historical return net of fees.",
      "Confirm whether it's retail (PDS) or wholesale-only (IM), and the minimum investment and lock-up.",
      "Compare against a low-cost index ETF — active fees need to be justified by net-of-fee outperformance.",
      "Check SIV-complying status if you're a Significant Investor Visa applicant.",
    ],
    minimum: "Retail managed funds and ETFs start from $500–$5,000 (or one unit for ASX-listed). Wholesale and SIV-complying funds typically require $50,000–$250,000+.",
    tax: "Fund distributions retain their character — franked dividends carry franking credits, capital gains pass through with the CGT discount where the fund held the asset >12 months. Many funds are MIT-structured, giving eligible foreign investors a 15% withholding rate. Inside an SMSF, distributions are taxed at 15% (0% pension phase).",
    risks: [
      "Fees compounding against you over time.",
      "Manager/key-person and style-drift risk.",
      "Lock-ups and redemption gates in unlisted funds.",
      "Active funds frequently underperform their benchmark net of fees.",
    ],
  },
  "private-equity": {
    howTo: [
      "Understand the vintage, strategy (buyout, growth, venture) and the manager's prior-fund returns (DPI, IRR).",
      "Review the lock-up (typically 7–10 years), capital-call schedule and fee structure (often 2-and-20).",
      "Most access is wholesale-only via s708; listed PE structures (LICs/LITs) offer retail-accessible, liquid exposure.",
      "Size the commitment knowing capital is called over time and locked for years.",
      "Confirm sophisticated-investor status for direct fund access.",
    ],
    minimum: "Listed PE vehicles trade from one share. Direct PE fund commitments are typically wholesale-only with $100,000–$250,000+ minimums and multi-year capital calls.",
    tax: "Returns are usually realised as capital gains (50% discount after 12 months for individuals/trusts). Listed PE follows normal share tax with franking where paid. ESVCLP-registered vehicles carry the 10% offset + 100% CGT exemption. Carried interest and fund structures can complicate the timing of assessable gains.",
    risks: [
      "Long lock-ups (7–10 years) with no liquidity.",
      "Capital-call obligations you must fund on demand.",
      "High fees (2-and-20) and J-curve early underperformance.",
      "Manager dispersion — top-quartile vs median is huge.",
    ],
  },
  "pre-ipo": {
    howTo: [
      "Pre-IPO placements are late-stage private rounds before a public listing — almost always wholesale-only (s708).",
      "Review the company's path to IPO, the pre-money valuation and any escrow/lock-up that applies post-listing.",
      "Understand there's no guarantee an IPO happens, or that it prices above your entry.",
      "Access is via specialist platforms (PrimaryMarkets, Fresh Equities) or broker placements.",
      "Confirm your sophisticated-investor certificate before bidding.",
    ],
    minimum: "Pre-IPO placements are typically wholesale-only with minimums from $25,000–$100,000+, occasionally lower via aggregator platforms.",
    tax: "Pre-IPO shares are CGT assets — the 50% discount applies after 12 months, though post-listing escrow can affect timing. Some pre-IPO companies qualify as ESICs, unlocking the 20% offset and 10-year CGT exemption. Gains are otherwise taxed on disposal at your structure's rate.",
    risks: [
      "The IPO may be delayed, repriced or cancelled.",
      "Post-listing escrow can lock you in through volatility.",
      "Illiquidity until (and sometimes after) listing.",
      "Valuations set in private rounds may not survive public markets.",
    ],
  },
  royalties: {
    howTo: [
      "Understand the royalty type: mining (e.g. net smelter return), music/IP catalogue, or oil-gas net-profits interest.",
      "Review the underlying asset's production profile, life-of-mine or catalogue longevity, and payment seniority.",
      "Royalties pay income without operational risk — but you don't control the asset.",
      "Most deals are wholesale-only or via specialist royalty funds.",
      "Model the income stream's duration and decline rate.",
    ],
    minimum: "Royalty deals and funds are typically wholesale-only with minimums from $25,000–$250,000. Some ASX-listed royalty companies offer retail-accessible exposure from one share.",
    tax: "Royalty income is ordinary assessable income taxed at your marginal/structure rate — no CGT discount on the income. The royalty interest itself is a CGT asset on disposal. Mining and petroleum royalty interests held by foreign investors are generally FIRB-notifiable.",
    risks: [
      "Production decline or asset closure ending the income stream.",
      "No operational control over the underlying asset.",
      "Commodity-price exposure on resource royalties.",
      "Catalogue/IP royalties depend on enduring consumption.",
    ],
  },
  "income-assets": {
    howTo: [
      "Pick the asset type: vending/ATM routes, car washes, laundromats, self-storage or billboards — each has a different passivity/yield profile.",
      "Verify the cash flow: bank statements, not projections; understand seasonality and replacement capex.",
      "Assess how passive it really is — route businesses need ongoing servicing unless management is outsourced.",
      "Price on a multiple of seller's discretionary earnings (SDE), typically 1.5–4×.",
      "Check leases (self-storage, car wash freehold) and equipment condition.",
    ],
    minimum: "Vending and ATM routes start around $30,000–$150,000. Car washes and laundromats run $150,000–$1M. Self-storage facilities are institutional-scale at $1M+.",
    tax: "Income is ordinary business income taxed at your marginal/structure rate; equipment is depreciable. Going-concern sales can be GST-free. The small-business CGT concessions can apply on exit if you meet the eligibility tests.",
    risks: [
      "Headline yield rarely equals sustainable return after capex and your time.",
      "Equipment obsolescence and replacement cost.",
      "Location/lease dependence for sited assets.",
      "Cash-handling and theft risk on coin/note businesses.",
    ],
  },
  bullion: {
    howTo: [
      "Choose allocated (you own specific serial-numbered bars, vaulted) vs unallocated (a claim on a pool) vs an ASX gold ETF (PMGOLD, GOLD).",
      "Buy from an LBMA Good Delivery refiner — in Australia that's the Perth Mint or ABC Bullion — so resale at spot is straightforward.",
      "Decide on storage: vaulted (insured, small annual fee) or take-home (no fee, but you self-insure).",
      "For SMSFs, store allocated metal at an APRA-approved depository to satisfy the sole-purpose test.",
      "Compare the premium over spot — it's the real cost of entry and varies by product.",
    ],
    minimum: "Unallocated pool accounts start from as little as $50. ASX gold ETFs cost one unit. Allocated bars scale with weight — a 100g gold bar is ~$9,500, a 1kg bar ~$95,000; 1000oz silver ~$45,000.",
    tax: "Investment-grade bullion is a CGT asset — the 50% discount applies after 12 months for individuals/trusts (⅓ for SMSFs). It produces no income, so the return is pure capital. GST does not apply to investment-grade gold (≥99.5% purity), silver (≥99.9%) or platinum (≥99%). SMSFs can hold allocated bullion under the sole-purpose test.",
    risks: [
      "No yield — bullion is a pure store-of-value/hedge play.",
      "Storage and insurance costs on physical holdings.",
      "Premium-over-spot drag on entry and exit.",
      "Price volatility driven by real rates and the US dollar.",
    ],
  },
  "water-rights": {
    howTo: [
      "Distinguish high-security (priority allocation, ~95–100% in most years) from general-security (cheaper, far more variable) entitlements.",
      "Check the trading zone and which states/zones the entitlement can transfer to.",
      "Review the 5-year allocation history for the system — it reveals reliability better than the headline security class.",
      "Decide income (lease to growers, 3–5% yield) vs capital-growth (buy-and-hold as scarcity tightens) strategy.",
      "Transact via a water broker (Waterfind, H2OX) and budget 4–12 weeks for the register transfer.",
    ],
    minimum: "Water entitlements are priced per megalitre (ML). High-security Murray/Goulburn water trades around $80,000–$90,000/ML; general-security from ~$12,000/ML; groundwater bore licences lower. A small 10ML parcel is therefore six figures.",
    tax: "A water access entitlement is a CGT asset — the 50% discount applies after 12 months for individuals/trusts. Lease income is ordinary assessable income. Primary producers have specific water-asset provisions. SMSFs can hold water entitlements subject to the sole-purpose test.",
    risks: [
      "Allocation volatility — general-security can deliver 15% in a dry year.",
      "Policy/Murray-Darling Basin Plan reform risk.",
      "Thin secondary market for some zones.",
      "Climate and rainfall-cycle exposure.",
    ],
  },
  "carbon-credits": {
    howTo: [
      "Understand the unit: ACCUs (Australian Carbon Credit Units, issued by the Clean Energy Regulator) vs voluntary units (Verra, Gold Standard) vs state biodiversity credits.",
      "Decide the purpose: Safeguard Mechanism compliance, voluntary corporate retirement, or speculative price exposure.",
      "Check the method behind ACCUs (savanna burning, human-induced regeneration, etc.) — methods carry different price premiums and integrity perceptions.",
      "Open an ANREU (Australian National Registry of Emissions Units) account to hold ACCUs.",
      "Trade via an exchange/broker (Xpansiv, CORE Markets) for price discovery.",
    ],
    minimum: "ACCUs trade per tonne (per unit) — recently in the $30–$50 range, so a 100-unit parcel is a few thousand dollars. Voluntary units are cheaper; NSW biodiversity credits trade around $1,000+ each.",
    tax: "ACCUs held by a primary producer or carbon-project participant have specific ATO treatment (generally assessable when sold or when the unit is registered). For investors, ACCUs are CGT assets / trading stock depending on intent and frequency. GST applies to most carbon-unit transactions. The Safeguard Mechanism reform (2024) created structural mandatory demand.",
    risks: [
      "Policy/methodology-integrity risk affecting unit value.",
      "Price volatility — spot moved sharply post-Safeguard reform.",
      "Liquidity and counterparty risk on voluntary units.",
      "Regulatory change to the crediting framework.",
    ],
  },
  "sda-housing": {
    howTo: [
      "Understand SDA (Specialist Disability Accommodation) is NDIS-funded housing for participants with extreme functional impairment — the NDIA pays rent directly.",
      "Choose the design category (Improved Livability, Robust, Fully Accessible, High Physical Support) — funding and yield rise with category.",
      "Verify the dwelling is NDIA-enrolled and has a credible SIL (Supported Independent Living) provider and tenant demand in the location.",
      "Model net (not gross) yield after vacancy, management and the Reasonable Rent Contribution components.",
      "Consider an LRBA bare-trust structure for SMSF acquisition.",
    ],
    minimum: "Purpose-built SDA dwellings list from around $650,000 to $1.1M depending on design category and location, delivering net yields of roughly 10–13%.",
    tax: "SDA is residential investment property: net rent at your marginal/structure rate (15%/0% in an SMSF), 50% CGT discount after 12 months (⅓ for SMSFs), and depreciation on the building and fit-out. New SDA builds offer substantial Division 43 capital-works and Division 40 plant deductions. LRBA-compatible for SMSF purchase.",
    risks: [
      "Vacancy risk — SDA tenant demand is location-specific.",
      "SIL-provider dependence and NDIS policy/pricing change.",
      "Higher build/maintenance cost than standard housing.",
      "Concentrated, specialised resale market.",
    ],
  },
};

/** Fallback for any opportunity vertical without an explicit entry. */
export function genericGuide(label: string): InvestGuideContent {
  return {
    howTo: [
      `Clarify what form of ${label.toLowerCase()} exposure you want — direct ownership, a managed fund, or listed securities.`,
      "Verify the financials, structure and any lock-up before committing capital.",
      "Confirm whether the opportunity is retail-accessible or wholesale-only (s708 sophisticated investor).",
      "Compare the opportunity against a lower-cost, more-liquid alternative.",
      "Engage a licensed adviser and read all offer documents (PDS / IM / TMD) before investing.",
    ],
    minimum: `Minimum investment in ${label.toLowerCase()} varies by structure — listed and pooled vehicles are typically the lowest-cost entry, while direct and wholesale deals require larger commitments.`,
    tax: `Tax treatment depends on the structure: income is generally taxed at your marginal or entity rate, and the 50% CGT discount applies to capital gains on assets held more than 12 months by individuals and trusts (one-third for SMSFs). Confirm specifics with a registered tax agent.`,
    risks: [
      "Capital loss risk — investments can fall in value.",
      "Liquidity constraints in unlisted structures.",
      "Fees and costs reducing net returns.",
      "Concentration risk in single-asset exposures.",
    ],
  };
}

/** Returns the guide content for a category slug, with fallback. */
export function getInvestGuide(slug: string, label: string): InvestGuideContent {
  return INVEST_GUIDE_CONTENT[slug] ?? genericGuide(label);
}
