/**
 * Single source of truth for all disclosure, disclaimer, and warning text.
 * Every component that displays compliance text MUST import from here.
 * Do NOT hardcode disclosure wording anywhere else in the codebase.
 */

/** Entity-level operational email addresses — update here to propagate everywhere. */
export const CORRECTIONS_EMAIL = "corrections@invest.com.au";
export const OPS_EMAIL = "ops@invest.com.au";
export const PRESS_EMAIL = "press@invest.com.au";

/** Full advertiser disclosure — used in footer, dedicated disclosure sections */
export const ADVERTISER_DISCLOSURE =
  "Advertising and referral fees may be received from some listed businesses. " +
  "Promoted placements are clearly labelled. Directory entries and factual data fields " +
  "are displayed separately from advertisements.";

/** Short advertiser disclosure — used in header bar, inline near CTAs */
export const ADVERTISER_DISCLOSURE_SHORT =
  "Advertising and referral fees may be received from some listed businesses. Promoted placements are clearly labelled.";

/** Full general advice warning — used on every page with financial content */
export const GENERAL_ADVICE_WARNING =
  "The information on Invest.com.au is general in nature and does not take into account " +
  "your personal financial situation, objectives, or needs. It is not financial advice. " +
  "Before making any investment decision, consider the Product Disclosure Statement (PDS) " +
  "and Target Market Determination (TMD) for any financial product, and seek independent " +
  "advice from a licensed financial adviser if needed.";

/** PDS/TMD consideration — short version for inline placement near CTAs */
export const PDS_CONSIDERATION =
  "Consider the PDS and TMD before making a decision.";

/**
 * Government grants disclaimer — used on /grants and /startup/grants hub.
 * Grant rules, amounts, and deadlines change frequently. Eligibility is
 * determined by AusIndustry, Austrade or the relevant state agency.
 */
export const GRANTS_WARNING =
  "Grant rules, amounts and deadlines change. Eligibility for the R&D Tax Incentive, EMDG, " +
  "Industry Growth Program and state programs depends on your specific circumstances and is " +
  "determined by AusIndustry, Austrade or the relevant state agency. " +
  "Engage a registered R&D tax advisor or grants consultant before lodging.";

/**
 * Capital-raising / business-funding surfaces (/raise hub, Pathway Finder).
 * Posture per docs/strategy/CAPITAL_RAISING_OPPORTUNITIES.md §2.3: we educate
 * businesses about funding pathway CATEGORIES and refer onward — we never
 * host, arrange or facilitate offers, and CSF offers exist only on licensed
 * intermediary platforms (Corporations Act s738ZG context).
 */
export const CAPITAL_RAISING_NOTE =
  "Invest.com.au provides general information about business funding pathways only. " +
  "We do not host, arrange or facilitate investment offers, provide financial product, " +
  "credit, legal or tax advice, or handle investor money. Crowd-sourced funding offers " +
  "are made only through ASIC-licensed CSF intermediaries — always read the offer " +
  "document and general risk warning on the intermediary's platform. Consider advice from " +
  "a licensed adviser, accountant or lawyer before raising capital.";

/** One-liner for inline placement near pathway results and CTAs. */
export const CAPITAL_RAISING_NOTE_SHORT =
  "General information about funding pathway types only — not financial, credit or legal advice, and not an offer or invitation to invest.";

/** Short risk warning — placed near every outbound CTA button */
export const RISK_WARNING_CTA =
  "General information only \u2014 not financial advice or a personal recommendation.";

/** Crypto-specific risk warning */
export const CRYPTO_WARNING =
  "Cryptocurrency is highly speculative and not legal tender. You could lose all of " +
  "your investment. Only invest what you can afford to lose.";

/** Sponsored placement disclosure — shown near sponsored broker badges */
export const SPONSORED_DISCLOSURE =
  "This broker has a paid placement on this page. Promoted placements are clearly labelled and displayed separately from factual data.";

/** Short sponsored disclosure for inline use */
export const SPONSORED_DISCLOSURE_SHORT =
  "Paid placement. Displayed separately from factual data.";

/**
 * Sponsored-article disclosure — shown on advisor pay-to-publish articles
 * whose pricing_tier is "sponsored" (or payment_status is "paid").
 * Corporations Act s1041H: paid promotional content must be clearly
 * identified as such and distinguished from independent editorial.
 */
export const SPONSORED_ARTICLE_DISCLOSURE =
  "Sponsored content: the author paid a placement fee to publish this article. " +
  "It is promotional, not independent editorial, and is general information " +
  "only — not personal financial advice.";

/** Company registration details (from ASIC extract 20/02/2026) */
export const COMPANY_LEGAL_NAME = "Invest.com.au Pty Ltd";
export const COMPANY_ACN = "093 882 421";
export const COMPANY_ABN = "90 093 882 421";
/** ASIC company register — canonical lookup URL for ACN 093 882 421 */
export const ASIC_REGISTER_URL =
  "https://connectonline.asic.gov.au/RegistrySearch/faces/landing/panelSearch.jspx?searchType=OrgAndBus&searchText=093882421";

/** Regulatory note */
export const REGULATORY_NOTE =
  `${COMPANY_LEGAL_NAME} (ACN ${COMPANY_ACN}, ABN ${COMPANY_ABN}) is not a financial product issuer, ` +
  "credit provider, or financial adviser. " +
  "We are an information service. Always verify information with the product issuer before " +
  "making a decision.";

/**
 * Fictional persona slugs created during early development (CL-01/CL-02).
 * These slugs no longer link from any public page; if a DB record exists for
 * any of them, the author/reviewer page must carry `noindex` so search engines
 * do not surface them and cannot be used to identify the founder.
 */
export const NOINDEX_PERSONA_SLUGS: ReadonlySet<string> = new Set([
  "finn-webster",
  "alex-reid",
]);

/** Course affiliate disclosure — shown on course pages near broker CTAs */
export const COURSE_AFFILIATE_DISCLOSURE =
  "This course contains links to broker platforms. We may earn a commission if you sign up through these links. " +
  "This does not affect our educational content.";

/** Tooltip on the inline "Ad" pill next to a broker name on cards / tables */
export const AFFILIATE_AD_TOOLTIP =
  "We may earn a commission if you visit this platform";

/**
 * Verified-badge tooltip explaining that an ABN was confirmed against the ABR.
 * Components may prepend the actual ABN ("ABN 12 345 678 901 confirmed on the ABR.")
 * when one is available; this is the canonical fallback when no ABN is on file.
 */
export const ABN_VERIFIED_NOTE = "ABN confirmed on the ABR.";

/**
 * Verified-badge tooltip explaining that an AFSL was confirmed against the
 * ASIC Professional Registers. Components may prepend the AFSL number
 * ("AFSL 123456 confirmed current on the ASIC Professional Registers.") when
 * one is available; this is the canonical fallback when no number is on file.
 */
export const AFSL_VERIFIED_NOTE =
  "AFSL confirmed current on the ASIC Professional Registers.";

/**
 * Trust-chip tooltip for an advisor who has listed an AFSL number but whose
 * licence currency has not yet been cross-checked by Invest.com.au against the
 * ASIC Professional Registers. Components may prepend the number:
 * "AFSL 123456 listed by this advisor. Verify currency on the ASIC
 * Professional Registers."
 */
export const AFSL_LISTED_NOTE =
  "AFSL number listed by this advisor. Verify currency on the ASIC Professional Registers.";

/**
 * Verified-badge tooltip shown on the admin-only "Seeded" pill — clarifies
 * that the profile has not yet been independently verified.
 */
export const SEEDED_PROFILE_NOTE =
  "This profile was seeded by the editorial team and has not yet been independently verified against ABR / ASIC.";

/**
 * Disclaimer printed beneath a full-service-broker enquiry form.
 * The literal `{firmName}` token MUST be replaced with the firm's display
 * name at render time (e.g. via `.replace("{firmName}", firmName)`).
 */
export const FULL_SERVICE_ENQUIRY_DISCLAIMER =
  "General information only — not personal financial advice. {firmName} is responsible for any advice they give you and operates under their own AFSL.";

// ═══════════════════════════════════════════════════════════════════
// AUSTRALIAN-SPECIFIC COMPLIANCE (ASIC / AFSL / AFCA / RG 234/256)
// ═══════════════════════════════════════════════════════════════════

/**
 * CFD risk warning — ASIC Regulatory Guide 227 (RG 227) & ASIC product intervention order.
 * ASIC requires CFD issuers and comparison sites to display retail loss percentages.
 * As of 2024/25, ~70% of retail CFD accounts lose money — cite the individual broker's
 * disclosed figure where available, fall back to this industry average.
 */
export const CFD_WARNING =
  "CFDs are complex instruments and come with a high risk of losing money rapidly due to leverage. " +
  "Between 62% and 81% of retail investor accounts lose money when trading CFDs. " +
  "You should consider whether you understand how CFDs work and whether you can afford to take " +
  "the high risk of losing your money. This information is not intended to be a recommendation " +
  "to trade CFDs.";

/** Short CFD warning — for inline placement near CFD broker CTAs */
export const CFD_WARNING_SHORT =
  "CFDs are high-risk. Most retail accounts lose money trading CFDs.";

/**
 * Super fund switching warning — ASIC RG 183 & SIS Act considerations.
 * Must warn users about insurance implications of switching super funds.
 */
export const SUPER_WARNING =
  "Changing super funds can have significant consequences including loss of insurance cover " +
  "(death, TPD, income protection), exit fees on older products, and loss of other benefits. " +
  "Before switching, check what insurance you hold in your current fund and whether your new " +
  "fund offers comparable cover. Consider seeking advice from a licensed financial adviser. " +
  "Visit the ATO's YourSuper comparison tool at ato.gov.au for independent super fund comparisons.";

/** Short super warning — for inline placement near super fund CTAs */
export const SUPER_WARNING_SHORT =
  "Switching super funds may affect your insurance cover. Check your current fund's insurance before switching.";

/**
 * Past-performance warning — ASIC RG 53 / RG 234 requirement wherever
 * historical investment returns are displayed.
 */
export const PAST_PERFORMANCE_WARNING =
  "Past performance is not a reliable indicator of future performance. Returns shown are " +
  "historical, net of fees and taxes as reported to APRA, and can vary significantly " +
  "between investment options within the same fund.";

/**
 * Aged care referral warning — used on /aged-care hub and any page that
 * references reverse mortgages or RAD/DAP decisions. Reverse mortgages are
 * credit products regulated under the National Consumer Credit Protection Act
 * (NCCP). Invest.com.au is not an ACL holder and provides factual information
 * only. Always refer to a licensed mortgage broker for credit assistance.
 */
export const AGED_CARE_WARNING =
  "Aged care financial information on Invest.com.au is general in nature. Costs, means-test thresholds, " +
  "and subsidy rates change regularly — verify current figures at www.health.gov.au/aged-care. " +
  "Reverse mortgages are credit products regulated under the National Consumer Credit Protection Act. " +
  "Invest.com.au does not provide credit assistance. Speak to a licensed mortgage broker before applying. " +
  "Seek advice from a licensed financial adviser (ideally a specialist aged care adviser with CPCA or FACP " +
  "designation) before making accommodation, asset-structuring, or estate decisions.";

/**
 * AFCA (Australian Financial Complaints Authority) reference.
 * Financial services providers must have an external dispute resolution (EDR) scheme.
 * While Invest.com.au is not a financial product issuer, linking to AFCA shows
 * commitment to consumer protection and helps users resolve disputes with platforms.
 */
export const AFCA_REFERENCE =
  "If you have a complaint about a financial product or service, contact the provider directly first. " +
  "If the issue is not resolved, you can lodge a complaint with the Australian Financial Complaints " +
  "Authority (AFCA) — a free and independent dispute resolution scheme. " +
  "Visit afca.org.au or call 1800 931 678.";

/**
 * Financial Services Guide (FSG) notice.
 * ASIC requires that financial services providers give clients an FSG before providing services.
 * As a comparison site (not an AFSL holder), we reference this requirement and point users
 * to the relevant FSGs of the platforms we compare.
 */
export const FSG_NOTE =
  "Before using any financial product, you should read the provider's Financial Services Guide (FSG) " +
  "and Product Disclosure Statement (PDS). These documents explain the product's features, risks, " +
  "fees, and the provider's complaint handling process. Request a copy from the provider or " +
  "download from their website.";

/**
 * Negative balance protection disclosure — ASIC product intervention order (2021).
 * Required for CFD/Forex brokers operating under ASIC.
 */
export const NEGATIVE_BALANCE_PROTECTION =
  "ASIC-regulated CFD providers must offer negative balance protection, meaning you cannot lose " +
  "more than the funds in your trading account. Ensure your provider is ASIC-regulated and " +
  "offers this protection.";

/**
 * ASIC Regulatory Guide 234 (RG 234) — Advertising of financial products and services.
 * This guide sets standards for advertising including comparison tables, awards,
 * testimonials, and performance claims.
 */
export const RG234_COMPLIANCE_NOTE =
  "This website complies with ASIC Regulatory Guide 234 (Advertising of financial products and " +
  "advice services). All comparisons are based on publicly available factual information from " +
  "product issuers and public registers. No ratings or recommendations are provided. " +
  "Past performance information, where shown, is not a reliable indicator of future performance.";

/**
 * ASIC Regulatory Guide 256 (RG 256) — Client review and remediation.
 * While primarily for financial services providers, we reference this to show
 * our commitment to accuracy and correction of errors.
 */
export const EDITORIAL_ACCURACY_COMMITMENT =
  "We are committed to accuracy and regularly review our content. If you believe any information " +
  `is incorrect, outdated, or misleading, please contact us at ${CORRECTIONS_EMAIL}. ` +
  "We will investigate and update the information promptly.";

/**
 * AFSL status disclosure — ASIC requires clarity about licensing status.
 * Invest.com.au operates as a factual information and comparison service
 * under the s766B(6)/(7) factual information carve-outs (Corporations
 * Act 2001) and does not hold an AFSL. This must be clearly disclosed.
 */
export const AFSL_STATUS_DISCLOSURE =
  `${COMPANY_LEGAL_NAME} (ACN ${COMPANY_ACN}, ABN ${COMPANY_ABN}) does not hold an Australian ` +
  "Financial Services Licence (AFSL) and does not provide financial product advice. " +
  "We operate as a factual comparison and directory service under the s766B(6)/(7) " +
  "factual information carve-outs of the Corporations Act 2001. We do not assess " +
  "suitability, provide personal financial advice, deal in financial products, or " +
  "recommend one provider as suitable for a particular user. " +
  "Our revenue comes from advertising and referral fees paid by some listed businesses. " +
  "Promoted placements are clearly labelled and displayed separately from factual data.";

/**
 * Crypto-specific Australian regulatory context.
 */
export const CRYPTO_REGULATORY_NOTE =
  "Cryptocurrency exchanges operating in Australia must be registered with AUSTRAC " +
  "(Australian Transaction Reports and Analysis Centre) as a digital currency exchange (DCE). " +
  "However, cryptocurrencies are generally not regulated as financial products by ASIC. " +
  "There is no compensation scheme for cryptocurrency losses in Australia.";

/**
 * CHESS sponsorship explanation — unique to Australian share trading.
 * Helps users understand what CHESS sponsorship means for share ownership.
 */
export const CHESS_EXPLANATION =
  "CHESS (Clearing House Electronic Subregister System) is operated by the ASX. " +
  "CHESS-sponsored brokers hold your shares in your name on the ASX subregister, meaning " +
  "you have direct ownership. With custodial models, the broker holds shares on your behalf. " +
  "Consider your preference for direct ownership versus custodial holding.";

/**
 * Tax file number (TFN) withholding notice.
 * Relevant for investment accounts and super funds in Australia.
 */
export const TFN_NOTICE =
  "If you do not provide your Tax File Number (TFN) to your broker or super fund, " +
  "tax may be withheld at the highest marginal rate. Providing your TFN is voluntary but " +
  "recommended. Your TFN is protected by law and can only be used for lawful purposes.";

// ═══════════════════════════════════════════════════════════════════
// PROPERTY INVESTMENT COMPLIANCE
// ═══════════════════════════════════════════════════════════════════

/**
 * Property investment general disclaimer.
 * Required on all property listing, suburb data, and buyer agent pages.
 */
export const PROPERTY_GENERAL_DISCLAIMER =
  "Property information on Invest.com.au is general in nature and should not be relied upon as " +
  "a substitute for professional advice. Median prices, rental yields, vacancy rates, and " +
  "capital growth figures are indicative only and based on publicly available data. " +
  "Past performance is not a reliable indicator of future results. Property values can go down " +
  "as well as up. Always conduct your own due diligence and seek independent legal, financial, " +
  "and property advice before making any investment decision.";

/** Short property disclaimer for inline use near CTAs */
export const PROPERTY_DISCLAIMER_SHORT =
  "General information only — not a property investment recommendation. Seek independent advice.";

/**
 * Off-the-plan risk warning.
 * Required near any new development / off-the-plan listing.
 */
export const OFF_THE_PLAN_WARNING =
  "Off-the-plan purchases carry additional risks including construction delays, changes to " +
  "finishes or layouts, developer insolvency, and potential valuation shortfalls at settlement. " +
  "Review all contracts with a qualified solicitor or conveyancer before signing.";

/**
 * Buyer agent disclosure.
 * Required on buyer agent directory and profile pages.
 */
export const BUYER_AGENT_DISCLOSURE =
  "Invest.com.au is not a licensed real estate agent. Buyer's agents listed on this site are " +
  "independent professionals. Verify that your chosen agent holds a valid real estate licence " +
  "in the relevant state or territory. We may receive a referral fee from listed agents. " +
  "Promoted placements are clearly labelled.";

/**
 * Loan comparison disclaimer.
 * Required on investment loan comparison pages.
 */
export const LOAN_COMPARISON_DISCLAIMER =
  "Invest.com.au is not a lender or mortgage broker. Loan rates shown are indicative only, " +
  "based on publicly available information, and subject to change without notice. " +
  "Comparison rates are based on a $150,000 loan over 25 years. Your actual rate may differ " +
  "based on your financial circumstances. Always obtain a formal quote from the lender. " +
  "Consider seeking advice from a licensed mortgage broker or financial adviser.";

/**
 * Suburb data disclaimer.
 * Required on suburb research tool pages.
 */
export const SUBURB_DATA_DISCLAIMER =
  "Suburb data is sourced from publicly available datasets and may not reflect the most " +
  "recent market conditions. Median prices, rental yields, and growth figures are estimates " +
  "only. Invest.com.au does not guarantee the accuracy or completeness of this data. " +
  "Always verify data with multiple sources before making investment decisions.";

/**
 * Enquiry form consent text.
 * Required on all property enquiry and contact forms.
 */
export const ENQUIRY_CONSENT_TEXT =
  "I agree to the Privacy Policy and Terms of Use. I consent to my details being shared with " +
  "the selected provider to respond to this enquiry. I understand I may receive follow-up " +
  "communications and can opt out at any time.";

// ═══════════════════════════════════════════════════════════════════
// ADDITIONAL COMPLIANCE (NCCP / GDPR / ACCESSIBILITY / PROPERTY)
// ═══════════════════════════════════════════════════════════════════

/**
 * NCCP Act credit assistance note.
 * National Consumer Credit Protection Act 2009 prohibits providing
 * "credit assistance" without an Australian Credit Licence (ACL).
 * Must appear on any page comparing credit products (home loans, etc.)
 * to confirm the site is providing information only, not credit assistance.
 */
export const NCCP_CREDIT_NOTE =
  "Invest.com.au does not hold an Australian Credit Licence (ACL) and does not provide " +
  "credit assistance as defined under the National Consumer Credit Protection Act 2009. " +
  "Rates and loan information are indicative only and do not constitute a credit quote or " +
  "recommendation. For credit assistance, consult a licensed mortgage broker or lender.";

/**
 * Property indicative price note.
 * Addresses underquoting laws in NSW (Property and Stock Agents Regulation 2022)
 * and VIC (Estate Agents Act 1980). Prices on off-the-plan listings are developer-
 * supplied estimates and have not been independently verified.
 */
export const PROPERTY_INDICATIVE_PRICES =
  "Prices shown are indicative estimates provided by the developer and have not been " +
  "independently verified by Invest.com.au. Actual prices at settlement may differ. " +
  "Always obtain formal pricing from the developer or your solicitor.";

/**
 * FIRB general disclaimer.
 * Required on all pages discussing FIRB, foreign investment rules, or foreign buyer eligibility.
 * The Foreign Acquisitions and Takeovers Act 1975 (Cth) and FIRB policies change regularly.
 * This disclaimer ensures users seek qualified legal/migration advice.
 */
export const FIRB_DISCLAIMER =
  "Information about FIRB (Foreign Investment Review Board) requirements is general in nature " +
  "and does not constitute legal advice. Foreign investment rules, thresholds, and application " +
  "fees are updated regularly by the Australian Government. Always obtain independent legal " +
  "advice from an Australian solicitor or registered migration agent before purchasing property " +
  "as a foreign investor. Invest.com.au accepts no liability for decisions made in reliance on " +
  "this information.";

/**
 * Foreign buyer stamp duty surcharge warning.
 * Required wherever state-based surcharge figures are displayed.
 * Rates shown are indicative and verified as at March 2026 — state governments
 * change these without notice.
 */
export const FOREIGN_BUYER_STAMP_DUTY_WARNING =
  "Foreign purchaser stamp duty surcharge rates shown are indicative as at March 2026. " +
  "State and territory governments may change rates at any time. Always verify the current " +
  "rate with the relevant state revenue office or your solicitor before signing contracts. " +
  "Additional annual land tax surcharges may also apply in some states.";

/**
 * Property tax note.
 * Required near rental yield and capital growth figures.
 * Property investment has significant tax implications including CGT, land tax,
 * and depreciation. Users should consult a registered tax agent.
 */
export const PROPERTY_TAX_NOTE =
  "Yields and growth figures are pre-tax estimates. Property investment has significant " +
  "tax implications (CGT, land tax, negative gearing). Consult a registered tax agent.";

/**
 * GDPR rights note — for users in the European Economic Area.
 * GDPR (EU) 2016/679 has extraterritorial reach for EU residents.
 * Australian sites with EU users must provide a legal basis for processing
 * and disclose additional rights.
 */
export const GDPR_RIGHTS_NOTE =
  "If you are located in the European Economic Area (EEA), you have additional rights " +
  "under the General Data Protection Regulation (GDPR), including the right to data " +
  "portability and the right to erasure ('right to be forgotten'). Our legal basis for " +
  "processing your data is legitimate interest (site analytics and fraud prevention) or " +
  "consent (where you have opted in to communications). To exercise your GDPR rights, " +
  "contact privacy@invest.com.au. If you are unsatisfied with our response, you may " +
  "lodge a complaint with your national data protection authority.";

/**
 * Data processor note — for privacy policy third-party section.
 * APP 8 of the Australian Privacy Act and GDPR Article 28 require that when
 * personal data is shared with overseas processors, appropriate protections are in place.
 */
export const DATA_PROCESSOR_NOTE =
  "Our service providers act as data processors on our behalf. We have data processing " +
  "agreements (DPAs) or equivalent contractual protections in place with Supabase (database), " +
  "Vercel (hosting), and Google (analytics). These agreements require processors to handle " +
  "your data only on our instructions and in accordance with applicable privacy laws.";

// ═══════════════════════════════════════════════════════════════════
// FOREIGN INVESTMENT COMPLIANCE
// ═══════════════════════════════════════════════════════════════════

/**
 * General foreign investor disclaimer.
 * Required on all cross-vertical foreign investment pages.
 * Tax and regulatory rules for foreign investors change frequently.
 */
export const FOREIGN_INVESTOR_GENERAL_DISCLAIMER =
  "Information about foreign investment in Australia is general in nature and does not " +
  "constitute legal, tax, or financial advice. Australian tax laws, withholding tax rates, " +
  "FIRB rules, and regulatory requirements for foreign investors are updated regularly. " +
  "Your specific obligations depend on your visa status, country of residence, tax residency, " +
  "and the type of investment. Always seek advice from a registered Australian tax agent and, " +
  "where applicable, an Australian solicitor or migration agent before investing.";

/**
 * Withholding tax note.
 * Required on any page showing withholding tax rates for dividends, interest, or royalties.
 * Rates shown are based on ATO published rates as at March 2026.
 */
export const WITHHOLDING_TAX_NOTE =
  "Withholding tax rates shown are indicative as at March 2026, based on the ATO's " +
  "published schedules and applicable Double Tax Agreements (DTAs). Actual rates may " +
  "differ based on the type of income, your specific visa and residency status, treaty " +
  "interpretation, and any conditions within the applicable DTA. Always verify your " +
  "withholding obligations with a registered tax agent or the ATO.";

/**
 * DASP warning — the 35–65% withholding rate is counterintuitive and must be disclosed prominently.
 * Required on all superannuation pages referencing DASP.
 */
export const DASP_WARNING =
  "DASP (Departing Australia Superannuation Payment) withholding rates are 35% for most " +
  "temporary visa holders (on the taxed element) and 65% for Working Holiday Makers — these " +
  "rates are set by the Australian Government and cannot be reduced. This means you will " +
  "receive significantly less than your super account balance. Always confirm your super " +
  "balance and calculate the after-tax amount before relying on DASP funds.";

/**
 * Non-resident tax note.
 * Required on pages explaining Australian income tax rules for non-residents.
 */
export const NON_RESIDENT_TAX_NOTE =
  "As an Australian tax non-resident, you are generally taxed only on income that is " +
  "sourced in Australia. Unlike residents, you do not have access to the tax-free threshold " +
  "($18,200), the Medicare levy reduction, or the 50% CGT discount. Tax obligations depend " +
  "on the type of income and your country of residence. Seek advice from a registered " +
  "Australian tax agent to understand your specific obligations.";

/**
 * DTA disclaimer.
 * Required on any page displaying DTA rates or claiming DTA benefits.
 * Treaty provisions are complex and subject to interpretation.
 */
export const DTA_DISCLAIMER =
  "Double Tax Agreement (DTA) rates shown are indicative only. The actual benefit available " +
  "under a specific DTA depends on treaty conditions, your specific residency status in both " +
  "countries, the type of income, and the ATO's interpretation of the treaty. DTA provisions " +
  "are complex legal instruments. Do not rely solely on the table shown — verify your specific " +
  "entitlements with a tax professional experienced in international taxation.";

/**
 * Non-resident broker eligibility note.
 * Required on pages listing broker eligibility for non-residents.
 * Broker policies change frequently — NULL means unknown, not confirmed ineligible.
 */
export const BROKER_NON_RESIDENT_NOTE =
  "Broker eligibility for non-residents and temporary visa holders is subject to each " +
  "broker's own policies, which can change at any time. Eligibility shown reflects our " +
  "best knowledge as at the date of last review. We cannot guarantee accuracy — always " +
  "verify directly with the broker before opening an account. Some brokers may accept " +
  "non-residents for new accounts but have restrictions for existing customers who move overseas.";

// ═══════════════════════════════════════════════════════════════════
// AI-OUTPUT FACTUAL FILTER (V-NEW-02)
// ═══════════════════════════════════════════════════════════════════
//
// AFSL/ASIC context: Invest.com.au operates under the s766B(6)/(7) factual
// information carve-outs of the Corporations Act 2001 (see
// AFSL_STATUS_DISCLOSURE above). To stay inside that carve-out, **no surface
// — including AI-generated copy — may produce personal advice, recommend a
// product as suitable for a particular user, or imply that the platform is
// guiding the user's investment choice**.
//
// `filterFactualOutput()` is the single gate that AI-produced text must pass
// before it reaches a user. It is DELIBERATELY conservative: false positives
// (a benign sentence rejected) are cheap (the LLM regenerates); false
// negatives (personal-advice slipping through) are an AFSL breach with up to
// $1.65m corporate penalties under Corporations Act s911A and brand-level
// reputational damage that could push us out of the s766B carve-out
// entirely. **When in doubt, reject.**
//
// Rules enforced (each rule is unit-tested in __tests__/lib/compliance.test.ts):
//
//  1. **Personal-advice phrase rejection** — phrases like "you should",
//     "we recommend", "I recommend", "best for you", "advise you to",
//     "you ought to", "you must invest", "the best choice for you",
//     "personally recommend". Case-insensitive, word-boundary aware so
//     "you shouldn't" / "we Recommend" / "RECOMMEND" all reject. These are
//     the canonical second-person advice triggers ASIC RG 36 calls out as
//     hallmarks of personal advice.
//
//  2. **GAW prefix enforcement** — the text must begin with `GAW_AI_PREFIX`
//     (a short ASIC RG 234 / RG 36 general-advice warning). Without that
//     prefix the receiving user has no way to know the content is general
//     advice / factual information, which itself crosses the personal-advice
//     line under s766B(3).
//
//  3. **Markdown link safety** — only `https://` links survive. Relative
//     paths must start with `/`; `http://` and bare-relative URLs are
//     stripped (link text is preserved). Stops the LLM from inventing
//     phishy outbound links or referencing an unverified `example.com`.
//
//  4. **Stat-citation enforcement** — any numeric statistic of the form
//     `N%` or `$N` (with optional decimals/commas) must be IMMEDIATELY
//     followed by either a parenthesised `(source: ...)` citation or a
//     footnote marker `[^N]`. ASIC RG 234 §234.107 forbids unsubstantiated
//     specific performance / fee claims in advertising; an uncited stat is
//     by definition unsubstantiated for the user.
//
// Founder reviews these rules in the V-NEW-02 PR before any CC-* AI surface
// merges. **Do not relax these rules without a Tier C review.**

/**
 * General-advice-warning prefix that every AI-generated user-facing text
 * MUST begin with. Short, plain-English form keyed to the existing
 * `RISK_WARNING_CTA` and `GENERAL_ADVICE_WARNING` so AI output stays
 * consistent with site-wide compliance copy.
 *
 * If you change this string, also update the corresponding test cases in
 * `__tests__/lib/compliance.test.ts` and audit every AI surface that
 * already pre-pends it.
 */
export const GAW_AI_PREFIX =
  "General information only — not financial advice or a personal recommendation.";

/**
 * Alternate accepted GAW prefixes. AI surfaces that already prepend the
 * full GENERAL_ADVICE_WARNING or the short RISK_WARNING_CTA should also
 * pass the filter without rewriting their preamble. Order matters: longer
 * prefixes are checked before shorter ones so a startsWith() match doesn't
 * short-circuit on a substring of a longer accepted prefix.
 */
export const GAW_AI_ACCEPTED_PREFIXES: readonly string[] = [
  GENERAL_ADVICE_WARNING,
  GAW_AI_PREFIX,
  RISK_WARNING_CTA,
];

/**
 * Result of filtering an AI-generated text snippet.
 *
 *  - `ok: true`  → text passed every rule. `cleaned` is the post-strip text
 *    (markdown links to unsafe URLs have been replaced with their link
 *    text; otherwise unchanged).
 *  - `ok: false` → at least one rule fired. `reason` is a one-sentence
 *    summary suitable for a server log; `rejectedSpans` enumerates each
 *    offending range and which rule fired so the caller can highlight or
 *    re-prompt the LLM.
 */
export type FilterResult =
  | { ok: true; cleaned: string }
  | {
      ok: false;
      reason: string;
      rejectedSpans: { start: number; end: number; rule: string }[];
    };

/**
 * Personal-advice phrases the filter rejects. Stored as plain strings so
 * the list is auditable; compiled into a single word-boundary-aware regex
 * at call time. Each phrase is matched case-insensitively.
 *
 * Add new phrases conservatively — every addition is a Tier C compliance
 * change that the founder reviews. Do NOT remove phrases without a
 * documented AFSL-counsel rationale.
 */
export const PERSONAL_ADVICE_PHRASES: readonly string[] = [
  "you should",
  "we recommend",
  "i recommend",
  "best for you",
  "advise you to",
  "you ought to",
  "you must invest",
  "the best choice for you",
  "personally recommend",
];

// Compile once: the leading word boundary catches "you should"/"YOU SHOULD"
// at sentence starts; the *trailing* boundary is intentionally loose so
// "you shouldn't" is also rejected (the contraction is still personal
// advice — "you should not" with extra letters). We escape regex
// metacharacters defensively even though the current list contains none.
function escapeRegex(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const PERSONAL_ADVICE_REGEX = new RegExp(
  `\\b(${PERSONAL_ADVICE_PHRASES.map(escapeRegex).join("|")})`,
  "gi",
);

// Markdown link `[text](url)`. Captures text + url so we can decide whether
// to strip and what to keep. Non-greedy on both groups to stop at the first
// `]` / `)`. Note: this does not handle nested brackets in link text — fine
// for our use case (LLM output) and matches CommonMark in the common case.
const MARKDOWN_LINK_REGEX = /\[([^\]]*)\]\(([^)\s]+)\)/g;

// Numeric stat: `12%`, `12.5%`, `$50`, `$50,000`, `$50.99`. We do NOT
// match `100` on its own because plain integers without a unit are too
// noisy to enforce a citation against. Citation must IMMEDIATELY follow
// (allowing optional whitespace) — either `(source: ...)` (case-insensitive)
// or a footnote marker `[^N]`.
const NUMERIC_STAT_REGEX =
  /(\$\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?%)/g;
const STAT_CITATION_REGEX = /^\s*(\(source:[^)]+\)|\[\^\d+\])/i;

/**
 * Filter an AI-generated text snippet for AFSL/ASIC factual-information
 * compliance. See module header for full rule documentation. Returns
 * either the cleaned text (markdown links to unsafe URLs stripped down to
 * their link text) or a structured rejection with offending spans.
 *
 * Conservative by design: any rule violation = full reject. Callers should
 * treat rejection as "regenerate with the LLM" or "fall back to a static
 * factual template", never as "ship it anyway with a warning".
 */
export function filterFactualOutput(text: string): FilterResult {
  const rejectedSpans: { start: number; end: number; rule: string }[] = [];

  // Empty / whitespace-only input: reject. AI surfaces should never emit
  // empty replies to users; an empty string is also definitionally missing
  // the GAW prefix, so this short-circuit just gives a clearer reason.
  if (!text || text.trim().length === 0) {
    return {
      ok: false,
      reason: "empty input — AI output must be non-empty and start with a GAW prefix",
      rejectedSpans: [{ start: 0, end: text.length, rule: "empty-input" }],
    };
  }

  // ── Rule 1: personal-advice phrase rejection ─────────────────────────────
  // Run against the ORIGINAL text (pre-link-strip) so we don't accidentally
  // hide an advice phrase that lived inside a stripped link's text.
  PERSONAL_ADVICE_REGEX.lastIndex = 0;
  let phraseMatch: RegExpExecArray | null;
  while ((phraseMatch = PERSONAL_ADVICE_REGEX.exec(text)) !== null) {
    rejectedSpans.push({
      start: phraseMatch.index,
      end: phraseMatch.index + phraseMatch[0].length,
      rule: "personal-advice-phrase",
    });
  }

  // ── Rule 2: GAW prefix enforcement ───────────────────────────────────────
  // Match against the trimmed-leading-whitespace view so a stray newline at
  // the top of the LLM response doesn't reject a properly-prefixed body.
  const leadingTrimmed = text.replace(/^\s+/, "");
  const leadingOffset = text.length - leadingTrimmed.length;
  const hasGawPrefix = GAW_AI_ACCEPTED_PREFIXES.some((prefix) =>
    leadingTrimmed.startsWith(prefix),
  );
  if (!hasGawPrefix) {
    // Span the first ~80 chars (or the whole text if shorter) so the
    // caller can highlight where the missing prefix should go.
    rejectedSpans.push({
      start: leadingOffset,
      end: Math.min(text.length, leadingOffset + 80),
      rule: "missing-gaw-prefix",
    });
  }

  // ── Rule 3: markdown link safety ─────────────────────────────────────────
  // Build the cleaned text by walking matches in order, replacing unsafe
  // links with their bare link-text. Safe links (https:// or starts-with-/
  // relative paths) are kept intact. The regex's `g` flag means we walk
  // every match; we record any unsafe match as a rejected span as well so
  // the caller can see the LLM tried to emit one.
  let cleaned = "";
  let lastIndex = 0;
  MARKDOWN_LINK_REGEX.lastIndex = 0;
  let linkMatch: RegExpExecArray | null;
  while ((linkMatch = MARKDOWN_LINK_REGEX.exec(text)) !== null) {
    const [whole, linkText, url] = linkMatch;
    cleaned += text.slice(lastIndex, linkMatch.index);
    const isHttps = url!.startsWith("https://");
    // A "rooted" relative path is fine (`/best/etoro`); a bare-relative
    // (`best/etoro`) or non-https absolute (`http://`, `ftp://`,
    // `javascript:`) is NOT — strip to bare text + record a span.
    const isRootedRelative = url!.startsWith("/");
    if (isHttps || isRootedRelative) {
      cleaned += whole;
    } else {
      cleaned += linkText ?? "";
      rejectedSpans.push({
        start: linkMatch.index,
        end: linkMatch.index + whole!.length,
        rule: "unsafe-markdown-link",
      });
    }
    lastIndex = linkMatch.index + whole!.length;
  }
  cleaned += text.slice(lastIndex);

  // ── Rule 4: stat-citation enforcement ────────────────────────────────────
  // Run against the ORIGINAL text — we want to catch the LLM citing 8.5%
  // even if the surrounding link was stripped. Citation must be the very
  // next non-whitespace tokens after the stat.
  NUMERIC_STAT_REGEX.lastIndex = 0;
  let statMatch: RegExpExecArray | null;
  while ((statMatch = NUMERIC_STAT_REGEX.exec(text)) !== null) {
    const tail = text.slice(statMatch.index + statMatch[0].length);
    if (!STAT_CITATION_REGEX.test(tail)) {
      rejectedSpans.push({
        start: statMatch.index,
        end: statMatch.index + statMatch[0].length,
        rule: "uncited-numeric-stat",
      });
    }
  }

  if (rejectedSpans.length > 0) {
    // Stable order makes assertions + log diffing deterministic.
    rejectedSpans.sort((a, b) => a.start - b.start || a.end - b.end);
    const ruleSet = Array.from(new Set(rejectedSpans.map((s) => s.rule))).join(
      ", ",
    );
    return {
      ok: false,
      reason: `AI output rejected: ${ruleSet}`,
      rejectedSpans,
    };
  }

  return { ok: true, cleaned };
}
