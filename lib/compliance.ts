/**
 * Single source of truth for all disclosure, disclaimer, and warning text.
 * Every component that displays compliance text MUST import from here.
 * Do NOT hardcode disclosure wording anywhere else in the codebase.
 */

/** Full advertiser disclosure — used in footer, dedicated disclosure sections */
export const ADVERTISER_DISCLOSURE =
  "Invest.com.au may receive compensation from partners featured on this site, including " +
  "affiliate commissions from platforms and per-enquiry fees from listed advisors. " +
  "This compensation may influence which products we write about and their placement, " +
  'including whether they appear as "Promoted." However, our editorial ratings and reviews ' +
  "are determined independently through our research methodology and are never influenced " +
  "by commercial relationships. Our site does not include all available offers.";

/** Short advertiser disclosure — used in header bar, inline near CTAs */
export const ADVERTISER_DISCLOSURE_SHORT =
  "We may be paid by partners on this site. This can influence placement but not our independent editorial ratings.";

/** Full general advice warning — used on every page with financial content */
export const GENERAL_ADVICE_WARNING =
  "The information on Invest.com.au is general in nature and does not take into account " +
  "your personal financial situation. It is not financial advice. Before making a decision, " +
  "consider the Product Disclosure Statement (PDS) and Target Market Determination (TMD) " +
  "for any financial product. Consider whether the information is appropriate to your needs, " +
  "and where appropriate, seek professional advice from a financial adviser. " +
  "Past performance is not a reliable indicator of future performance.";

/** PDS/TMD consideration — short version for inline placement near CTAs */
export const PDS_CONSIDERATION =
  "Consider the PDS and TMD before making a decision.";

/** Short risk warning — placed near every outbound CTA button */
export const RISK_WARNING_CTA =
  "General advice only \u2014 not a personal recommendation.";

/** Crypto-specific risk warning */
export const CRYPTO_WARNING =
  "Cryptocurrency is highly speculative and not legal tender. You could lose all of " +
  "your investment. Only invest what you can afford to lose.";

/** Sponsored placement disclosure — shown near sponsored broker badges */
export const SPONSORED_DISCLOSURE =
  "This broker has a paid placement on this page. Placement does not affect our independent editorial ratings or review methodology.";

/** Short sponsored disclosure for inline use */
export const SPONSORED_DISCLOSURE_SHORT =
  "Paid placement. Ratings are independent.";

/** Company registration details (from ASIC extract 20/02/2026) */
export const COMPANY_LEGAL_NAME = "Invest.com.au Pty Ltd";
export const COMPANY_ACN = "093 882 421";
export const COMPANY_ABN = "90 093 882 421";

/** Regulatory note */
export const REGULATORY_NOTE =
  `${COMPANY_LEGAL_NAME} (ACN ${COMPANY_ACN}, ABN ${COMPANY_ABN}) is not a financial product issuer, ` +
  "credit provider, or financial adviser. " +
  "We are an information service. Always verify information with the product issuer before " +
  "making a decision.";

/** Course affiliate disclosure — shown on course pages near broker CTAs */
export const COURSE_AFFILIATE_DISCLOSURE =
  "This course contains links to broker platforms. We may earn a commission if you sign up through these links. " +
  "This does not affect our educational content or recommendations.";

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
  "advice services). All comparisons are based on publicly available information from product " +
  "issuers. Ratings reflect our independent editorial methodology and are not endorsed by ASIC. " +
  "Past performance information, where shown, is not a reliable indicator of future performance.";

/**
 * ASIC Regulatory Guide 256 (RG 256) — Client review and remediation.
 * While primarily for financial services providers, we reference this to show
 * our commitment to accuracy and correction of errors.
 */
export const EDITORIAL_ACCURACY_COMMITMENT =
  "We are committed to accuracy and regularly review our content. If you believe any information " +
  "is incorrect, outdated, or misleading, please contact us at corrections@invest.com.au. " +
  "We will investigate and update the information promptly.";

/**
 * Crypto-specific Australian regulatory context.
 * ASIC does not regulate cryptocurrencies as financial products (with some exceptions
 * for crypto-asset-based ETFs and funds). This is important context for Australian users.
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
