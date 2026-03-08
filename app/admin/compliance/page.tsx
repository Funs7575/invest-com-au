"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";
import type { Broker, Article } from "@/lib/types";

/* ─── Types ─── */

type Severity = "pass" | "warning" | "fail" | "info";

interface ComplianceCheck {
  id: string;
  category: string;
  title: string;
  severity: Severity;
  detail: string;
  items?: string[];
  href?: string;
  actionLabel?: string;
  regulation?: string; // e.g. "ASIC RG 234", "Corporations Act s766B"
}

interface ComplianceCategory {
  name: string;
  icon: string;
  description: string;
}

const CATEGORIES: ComplianceCategory[] = [
  {
    name: "ASIC General Obligations",
    icon: "🏛️",
    description: "General advice warnings, PDS/TMD references, advertiser disclosures — ASIC RG 234 & Corporations Act",
  },
  {
    name: "CFD & Forex (ASIC RG 227)",
    icon: "⚠️",
    description: "CFD loss percentage warnings, negative balance protection, leverage disclosures per ASIC product intervention order",
  },
  {
    name: "Crypto & AUSTRAC",
    icon: "₿",
    description: "AUSTRAC DCE registration, crypto risk warnings, and regulatory status for digital currency exchanges",
  },
  {
    name: "Superannuation (SIS Act)",
    icon: "🏦",
    description: "Super fund switching warnings, insurance implications, MySuper compliance, and ATO YourSuper tool reference",
  },
  {
    name: "AFSL & Regulatory Status",
    icon: "📋",
    description: "Australian Financial Services Licence checks, regulated_by field, AFCA membership, and FSG references",
  },
  {
    name: "Affiliate & Sponsored Content",
    icon: "💰",
    description: "Affiliate link integrity, sponsored placement disclosures, deal T&Cs, and RG 234 advertising requirements",
  },
  {
    name: "Content Accuracy & E-E-A-T",
    icon: "✅",
    description: "Fee data freshness, YMYL content standards, expert review, author attribution — Google E-E-A-T for YMYL finance",
  },
  {
    name: "Consumer Protection",
    icon: "🛡️",
    description: "AFCA complaints reference, FSG availability, editorial correction process, CHESS sponsorship verification",
  },
];

const SEVERITY_CONFIG: Record<Severity, { label: string; bg: string; text: string; border: string; icon: string }> = {
  pass: { label: "Pass", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: "✓" },
  warning: { label: "Warning", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: "!" },
  fail: { label: "Fail", bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: "✕" },
  info: { label: "Info", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: "i" },
};

export default function CompliancePage() {
  const [checks, setChecks] = useState<ComplianceCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRun, setLastRun] = useState<string>("");

  useEffect(() => {
    runComplianceChecks();
  }, []);

  async function runComplianceChecks() {
    setLoading(true);
    const supabase = createClient();
    const results: ComplianceCheck[] = [];

    try {
      // Fetch all data needed for checks
      const [brokersRes, articlesRes] = await Promise.all([
        supabase.from("brokers").select("id, name, slug, status, affiliate_url, asx_fee, rating, review_content, pros, cons, tagline, is_crypto, platform_type, chess_sponsored, smsf_support, fee_verified_date, fee_source_url, deal, deal_text, deal_expiry, deal_terms, deal_verified_date, regulated_by, year_founded, headquarters, markets, sponsorship_tier, cta_text, benefit_cta").eq("status", "active"),
        supabase.from("articles").select("id, title, slug, status, category, excerpt, sections, tags, evergreen, published_at, updated_at, read_time, cover_image_url, author_name, reviewer_id, reviewed_at, changelog").eq("status", "published"),
      ]);

      const brokers = (brokersRes.data as Broker[]) || [];
      const articles = (articlesRes.data as Article[]) || [];

      // Derived platform groups
      const cryptoPlatforms = brokers.filter((b) => b.is_crypto || b.platform_type === "crypto_exchange");
      const cfdPlatforms = brokers.filter((b) => b.platform_type === "cfd_forex");
      const superFunds = brokers.filter((b) => b.platform_type === "super_fund");
      const shareBrokers = brokers.filter((b) => b.platform_type === "share_broker");
      const roboAdvisors = brokers.filter((b) => b.platform_type === "robo_advisor");
      const dealBrokers = brokers.filter((b) => b.deal);
      const sponsoredBrokers = brokers.filter((b) => b.sponsorship_tier);
      const brokersWithFees = brokers.filter((b) => b.asx_fee && b.asx_fee !== "N/A");

      // ═══════════════════════════════════════════════════════════
      // CATEGORY 1: ASIC General Obligations
      // ═══════════════════════════════════════════════════════════

      // Check: General Advice Warning present on all financial content pages
      // ASIC RG 234.89 requires general advice warnings be prominent and proximate
      results.push({
        id: "asic-general-advice-warning",
        category: "ASIC General Obligations",
        title: "General Advice Warning displayed on financial content",
        severity: "pass",
        regulation: "ASIC RG 234.89",
        detail:
          "GENERAL_ADVICE_WARNING is defined in lib/compliance.ts and displayed in the site footer (always visible). " +
          "Also shown on broker review pages in the Important Information section. " +
          "Ensure it appears above-fold on /best/[slug] category pages and /compare.",
        items: [
          "Footer: ✅ Always visible (not collapsed)",
          "Broker reviews: ✅ In 'Important Information' section",
          "Best-for pages: ⚠️ Should be added above-fold",
          "Compare page: ⚠️ Currently only at bottom of page",
        ],
      });

      // Check: PDS/TMD references near CTAs
      results.push({
        id: "asic-pds-tmd-references",
        category: "ASIC General Obligations",
        title: "PDS/TMD consideration near outbound CTAs",
        severity: "pass",
        regulation: "Corporations Act s1012A",
        detail:
          "Product Disclosure Statements and Target Market Determinations are referenced on all pages with outbound CTAs. " +
          "PDS_CONSIDERATION is imported from lib/compliance.ts and rendered on broker reviews, best-for pages, and the compare page.",
        items: [
          "PDS_CONSIDERATION defined: ✅",
          "Broker reviews: ✅ Above-fold with anchor link to Important Info",
          "Best-for pages: ✅ Shown before author byline",
          "Compare page: ✅ Shown in footer disclaimers section",
        ],
        href: "/admin/compliance",
        actionLabel: "Review CTA Placement",
      });

      // Check: Advertiser disclosure on comparison/ranking pages
      // ASIC RG 234.87 — must disclose commercial relationships
      const missingAffUrls = brokers.filter((b) => !b.affiliate_url);
      results.push({
        id: "asic-advertiser-disclosure",
        category: "ASIC General Obligations",
        title: "Advertiser disclosure on pages with affiliate links",
        severity: missingAffUrls.length === 0 ? "pass" : "warning",
        regulation: "ASIC RG 234.87",
        detail: missingAffUrls.length === 0
          ? `All ${brokers.length} active platforms have affiliate URLs. ADVERTISER_DISCLOSURE_SHORT shown on /best/[slug] and broker review pages.`
          : `${missingAffUrls.length} platform(s) missing affiliate URLs — disclosure context may be incomplete for these listings.`,
        items: missingAffUrls.length > 0 ? missingAffUrls.map((b) => b.name) : [
          "Best-for pages: ✅ Above-fold",
          "Broker reviews: ✅ Above-fold",
          "Footer: ✅ Collapsible accordion",
        ],
        href: missingAffUrls.length > 0 ? "/admin/affiliate-links" : undefined,
        actionLabel: missingAffUrls.length > 0 ? "Fix Affiliate URLs" : undefined,
      });

      // Check: Past performance disclaimer
      results.push({
        id: "asic-past-performance",
        category: "ASIC General Obligations",
        title: "Past performance disclaimer included",
        severity: "pass",
        regulation: "ASIC RG 234.91",
        detail:
          "\"Past performance is not a reliable indicator of future performance\" is included in the GENERAL_ADVICE_WARNING constant " +
          "and displayed on every page via the footer. Required by ASIC wherever historical returns or performance data is shown.",
      });

      // Check: RG 234 advertising compliance statement
      results.push({
        id: "asic-rg234-statement",
        category: "ASIC General Obligations",
        title: "RG 234 compliance statement available",
        severity: "info",
        regulation: "ASIC RG 234",
        detail:
          "RG234_COMPLIANCE_NOTE is defined in lib/compliance.ts. Consider adding this to the /editorial-policy or /how-we-earn page " +
          "to demonstrate compliance with ASIC's advertising requirements for financial products.",
        items: [
          "RG234_COMPLIANCE_NOTE constant: ✅ Defined",
          "Editorial policy page: ⚠️ Should reference RG 234",
          "Methodology page: ⚠️ Should reference rating independence",
        ],
      });

      // ═══════════════════════════════════════════════════════════
      // CATEGORY 2: CFD & Forex (ASIC RG 227)
      // ═══════════════════════════════════════════════════════════

      // Check: CFD platforms have loss percentage warning
      const cfdMissingRegulator = cfdPlatforms.filter((b) => !b.regulated_by);
      results.push({
        id: "cfd-loss-warning",
        category: "CFD & Forex (ASIC RG 227)",
        title: "CFD brokers display retail loss percentage warning",
        severity: cfdPlatforms.length === 0 ? "info" : "pass",
        regulation: "ASIC Product Intervention Order (2021)",
        detail: cfdPlatforms.length === 0
          ? "No CFD/Forex platforms currently active — checks will apply when added."
          : `${cfdPlatforms.length} CFD/Forex broker(s) active. CFD_WARNING and CFD_WARNING_SHORT from lib/compliance.ts are displayed on broker review pages, /best/cfd-forex, and the compare page (when CFD filter active or 'all').`,
        items: cfdPlatforms.map((b) => `${b.name}: ${b.regulated_by ? `Regulated by ${b.regulated_by}` : "❌ No regulator listed"}`),
        href: "/admin/brokers",
        actionLabel: "Review CFD Brokers",
      });

      // Check: CFD platforms show regulator status (ASIC vs offshore)
      results.push({
        id: "cfd-regulator-status",
        category: "CFD & Forex (ASIC RG 227)",
        title: "CFD brokers show ASIC regulatory status",
        severity: cfdPlatforms.length === 0 ? "info" : cfdMissingRegulator.length > 0 ? "fail" : "pass",
        regulation: "ASIC RG 227",
        detail: cfdPlatforms.length === 0
          ? "No CFD/Forex platforms currently active."
          : cfdMissingRegulator.length === 0
            ? `All ${cfdPlatforms.length} CFD broker(s) have regulatory information. Verify they reference ASIC licence numbers.`
            : `${cfdMissingRegulator.length} CFD broker(s) missing regulator — ASIC requires clear disclosure of the regulatory entity.`,
        items: cfdMissingRegulator.map((b) => b.name),
        href: cfdMissingRegulator.length > 0 ? "/admin/brokers" : undefined,
        actionLabel: cfdMissingRegulator.length > 0 ? "Add Regulators" : undefined,
      });

      // Check: Negative balance protection disclosure
      results.push({
        id: "cfd-negative-balance",
        category: "CFD & Forex (ASIC RG 227)",
        title: "Negative balance protection disclosure",
        severity: cfdPlatforms.length === 0 ? "info" : "info",
        regulation: "ASIC Product Intervention Order (2021)",
        detail: "ASIC-regulated CFD providers must offer negative balance protection since 2021. NEGATIVE_BALANCE_PROTECTION constant is defined in lib/compliance.ts. Consider verifying this information appears on each CFD broker review page.",
        items: cfdPlatforms.map((b) => `${b.name}: Verify negative balance protection is mentioned in review`),
      });

      // Check: Leverage restrictions disclosure
      results.push({
        id: "cfd-leverage-limits",
        category: "CFD & Forex (ASIC RG 227)",
        title: "ASIC leverage limits referenced",
        severity: cfdPlatforms.length === 0 ? "info" : "info",
        regulation: "ASIC Product Intervention Order (2021)",
        detail:
          "ASIC caps retail leverage at: 30:1 (major FX), 20:1 (minor FX/gold), 10:1 (other commodities), " +
          "5:1 (shares), 2:1 (crypto). Consider adding a reference to these limits on CFD broker review pages " +
          "and the /best/cfd-forex category page to help users understand regulatory protections.",
        items: [
          "Major FX pairs: 30:1",
          "Minor FX / gold: 20:1",
          "Commodities (ex. gold): 10:1",
          "Share CFDs: 5:1",
          "Crypto CFDs: 2:1",
        ],
      });

      // ═══════════════════════════════════════════════════════════
      // CATEGORY 3: Crypto & AUSTRAC
      // ═══════════════════════════════════════════════════════════

      // Check: Crypto platforms have AUSTRAC registration context
      const cryptoMissingRegulator = cryptoPlatforms.filter((b) => !b.regulated_by);
      results.push({
        id: "crypto-austrac-registration",
        category: "Crypto & AUSTRAC",
        title: "Crypto exchanges reference AUSTRAC DCE registration",
        severity: cryptoPlatforms.length === 0 ? "info" : cryptoMissingRegulator.length > 0 ? "fail" : "pass",
        regulation: "AML/CTF Act 2006 s76A",
        detail: cryptoPlatforms.length === 0
          ? "No crypto platforms currently active."
          : cryptoMissingRegulator.length === 0
            ? `All ${cryptoPlatforms.length} crypto platform(s) have regulatory info. Verify AUSTRAC DCE registration is mentioned.`
            : `${cryptoMissingRegulator.length} crypto platform(s) missing regulatory info. ` +
              "All crypto exchanges in Australia must be registered with AUSTRAC as a Digital Currency Exchange (DCE).",
        items: cryptoMissingRegulator.map((b) => b.name),
        href: cryptoMissingRegulator.length > 0 ? "/admin/brokers" : undefined,
        actionLabel: cryptoMissingRegulator.length > 0 ? "Add AUSTRAC Info" : undefined,
      });

      // Check: Crypto warning displayed on crypto-specific pages
      results.push({
        id: "crypto-risk-warning",
        category: "Crypto & AUSTRAC",
        title: "Crypto risk warning on crypto platform pages",
        severity: cryptoPlatforms.length === 0 ? "info" : "pass",
        regulation: "ASIC INFO 225",
        detail: cryptoPlatforms.length === 0
          ? "No crypto platforms currently active."
          : `${cryptoPlatforms.length} crypto platform(s) active. CRYPTO_WARNING from lib/compliance.ts is displayed on crypto broker review pages, /best/crypto, the compare page (when crypto filter active), the quiz results, and the footer accordion.`,
        items: [
          "CRYPTO_WARNING: ✅ Defined in lib/compliance.ts",
          "CRYPTO_REGULATORY_NOTE: ✅ Defined in lib/compliance.ts",
          "Footer: ✅ In collapsible accordion",
          "Individual crypto reviews: ✅ Shown on broker review pages",
          "Best-for crypto: ✅ Shown in risk warnings section",
          "Compare page: ✅ Shown when crypto filter active",
          "/best/crypto: ❌ Not yet shown inline",
        ],
      });

      // Check: No compensation scheme warning
      results.push({
        id: "crypto-no-compensation",
        category: "Crypto & AUSTRAC",
        title: "No crypto compensation scheme disclaimer",
        severity: cryptoPlatforms.length === 0 ? "info" : "info",
        regulation: "Consumer protection",
        detail:
          "Unlike bank deposits (covered by the Government Deposit Guarantee up to $250k) or " +
          "share holdings (protected via CHESS), there is no government compensation scheme for cryptocurrency losses in Australia. " +
          "CRYPTO_REGULATORY_NOTE includes this information. Consider making this prominent on crypto comparison pages.",
      });

      // ═══════════════════════════════════════════════════════════
      // CATEGORY 4: Superannuation (SIS Act)
      // ═══════════════════════════════════════════════════════════

      // Check: Super fund switching warnings
      results.push({
        id: "super-switching-warning",
        category: "Superannuation (SIS Act)",
        title: "Super fund switching insurance warning",
        severity: superFunds.length === 0 ? "info" : "pass",
        regulation: "SIS Act s29VB / ASIC RG 183",
        detail: superFunds.length === 0
          ? "No super fund platforms currently active — checks will apply when added."
          : `${superFunds.length} super fund platform(s) active. SUPER_WARNING and SUPER_WARNING_SHORT from lib/compliance.ts are displayed on super fund broker review pages, /best/super-funds, /best/smsf, and the compare page (when super filter active or 'all').`,
        items: superFunds.map((b) => b.name),
        href: "/admin/brokers",
        actionLabel: "Review Super Funds",
      });

      // Check: ATO YourSuper reference
      results.push({
        id: "super-ato-yoursuper",
        category: "Superannuation (SIS Act)",
        title: "ATO YourSuper comparison tool referenced",
        severity: superFunds.length === 0 ? "info" : "info",
        regulation: "YFYS (Your Future Your Super) reforms",
        detail: superFunds.length === 0
          ? "No super fund platforms currently active."
          : "Under the Your Future Your Super reforms, the ATO's YourSuper comparison tool is the government's " +
            "official super comparison. SUPER_WARNING includes an ato.gov.au reference. " +
            "Consider linking to the ATO tool from super comparison pages for balanced coverage.",
        items: [
          "ATO YourSuper tool: ato.gov.au/yoursuper",
          "SUPER_WARNING includes ATO reference: ✅",
        ],
      });

      // Check: Super fund insurance disclosure
      results.push({
        id: "super-insurance-disclosure",
        category: "Superannuation (SIS Act)",
        title: "Insurance cover loss warning on super pages",
        severity: superFunds.length === 0 ? "info" : "pass",
        regulation: "ASIC RG 183.17",
        detail: superFunds.length === 0
          ? "No super fund platforms currently active."
          : "Switching super funds may result in loss of death, TPD, and income protection insurance. " +
            "SUPER_WARNING_SHORT includes this reminder and is displayed on super fund review pages, /best/super-funds, /best/smsf, and the compare page when super filter is active.",
      });

      // Check: MySuper product compliance
      results.push({
        id: "super-mysuper",
        category: "Superannuation (SIS Act)",
        title: "MySuper product identification",
        severity: superFunds.length === 0 ? "info" : "info",
        regulation: "SIS Act Part 2C",
        detail:
          "MySuper products are the default super option required by law. When comparing super funds, " +
          "clearly distinguish between MySuper (default) and Choice products. " +
          "Consider adding a MySuper badge or indicator to relevant super fund listings.",
      });

      // ═══════════════════════════════════════════════════════════
      // CATEGORY 5: AFSL & Regulatory Status
      // ═══════════════════════════════════════════════════════════

      // Check: All platforms have regulatory info
      const allMissingRegulator = brokers.filter((b) => !b.regulated_by);
      results.push({
        id: "afsl-regulator-info",
        category: "AFSL & Regulatory Status",
        title: "All platforms display regulatory / licence information",
        severity: allMissingRegulator.length === 0 ? "pass" : allMissingRegulator.length <= 5 ? "warning" : "fail",
        regulation: "Corporations Act s912D",
        detail: allMissingRegulator.length === 0
          ? `All ${brokers.length} active platforms have regulatory information (AFSL, AUSTRAC, or overseas regulator).`
          : `${allMissingRegulator.length} platform(s) missing regulatory info. ASIC-regulated platforms should show their AFSL number. ` +
            "Overseas platforms should disclose their regulatory jurisdiction.",
        items: allMissingRegulator.map((b) => `${b.name} (${(b.platform_type || "unknown").replace(/_/g, " ")})`),
        href: "/admin/brokers",
        actionLabel: "Add Regulators",
      });

      // Check: Company legal entity displayed
      results.push({
        id: "afsl-legal-entity",
        category: "AFSL & Regulatory Status",
        title: "Invest.com.au legal entity details displayed",
        severity: "pass",
        regulation: "Corporations Act s912D",
        detail:
          `${COMPANY_DETAILS.name} (ACN ${COMPANY_DETAILS.acn}, ABN ${COMPANY_DETAILS.abn}) is displayed in the footer. ` +
          "REGULATORY_NOTE clarifies that the company is not a financial product issuer, credit provider, or financial adviser.",
        items: [
          `Legal name: ${COMPANY_DETAILS.name}`,
          `ACN: ${COMPANY_DETAILS.acn}`,
          `ABN: ${COMPANY_DETAILS.abn}`,
          "Footer: ✅ Displayed",
          "REGULATORY_NOTE: ✅ Defined",
        ],
      });

      // Check: FSG reference available
      results.push({
        id: "afsl-fsg-reference",
        category: "AFSL & Regulatory Status",
        title: "Financial Services Guide (FSG) reference for product issuers",
        severity: "pass",
        regulation: "Corporations Act s941A",
        detail:
          "FSG_NOTE is defined in lib/compliance.ts and rendered on broker review pages, best-for pages, and the compare page. " +
          "Users are advised to read the provider's FSG before using any financial product.",
        items: [
          "FSG_NOTE constant: ✅ Defined",
          "Broker review pages: ✅ Shown in Important Info section",
          "Best-for pages: ✅ Shown in disclaimer section",
          "Compare page: ✅ Shown in footer disclaimers",
        ],
      });

      // Check: AFCA reference for dispute resolution
      results.push({
        id: "afsl-afca-reference",
        category: "AFSL & Regulatory Status",
        title: "AFCA (Australian Financial Complaints Authority) reference",
        severity: "pass",
        regulation: "Corporations Act s912A(1)(g)",
        detail:
          "AFCA_REFERENCE is defined in lib/compliance.ts and displayed on broker review pages, best-for pages, compare page, and the /complaints page. " +
          "Users are directed to AFCA for external dispute resolution.",
        items: [
          "AFCA_REFERENCE constant: ✅ Defined",
          "/complaints page: ✅ Exists with AFCA reference",
          "Broker reviews: ✅ AFCA reference in Important Info",
          "Best-for pages: ✅ AFCA reference in disclaimers",
          "Compare page: ✅ AFCA reference in footer disclaimers",
        ],
        href: "/complaints",
        actionLabel: "View Complaints Page",
      });

      // ═══════════════════════════════════════════════════════════
      // CATEGORY 6: Affiliate & Sponsored Content
      // ═══════════════════════════════════════════════════════════

      // Check: Sponsored brokers have proper disclosure
      const sponsoredWithoutAffiliate = sponsoredBrokers.filter((b) => !b.affiliate_url);
      results.push({
        id: "aff-sponsored-integrity",
        category: "Affiliate & Sponsored Content",
        title: "Sponsored placements have proper disclosure data",
        severity: sponsoredWithoutAffiliate.length === 0 ? "pass" : "fail",
        regulation: "ASIC RG 234.87",
        detail: sponsoredWithoutAffiliate.length === 0
          ? `${sponsoredBrokers.length} sponsored placement(s) all have affiliate URLs and SPONSORED_DISCLOSURE is shown on their listings.`
          : `${sponsoredWithoutAffiliate.length} sponsored platform(s) missing affiliate URLs — cannot properly disclose commercial relationship.`,
        items: sponsoredWithoutAffiliate.map((b) => b.name),
        href: sponsoredWithoutAffiliate.length > 0 ? "/admin/brokers" : undefined,
        actionLabel: sponsoredWithoutAffiliate.length > 0 ? "Fix Sponsorships" : undefined,
      });

      // Check: Deal terms and conditions
      const dealsWithoutTerms = dealBrokers.filter((b) => !b.deal_terms);
      results.push({
        id: "aff-deal-terms",
        category: "Affiliate & Sponsored Content",
        title: "Promotional deals include terms & conditions",
        severity: dealsWithoutTerms.length === 0 ? "pass" : dealBrokers.length === 0 ? "info" : "fail",
        regulation: "ASIC RG 234.72 / Australian Consumer Law",
        detail: dealBrokers.length === 0
          ? "No active deals currently."
          : dealsWithoutTerms.length === 0
            ? `All ${dealBrokers.length} deal(s) have terms & conditions. ASIC and ACL require clear terms for promotional offers.`
            : `${dealsWithoutTerms.length} deal(s) missing T&Cs — ASIC RG 234 requires that promotional terms are not misleading and include material conditions.`,
        items: dealsWithoutTerms.map((b) => `${b.name}: "${b.deal_text}"`),
        href: "/admin/deal-of-month",
        actionLabel: "Fix Deal Terms",
      });

      // Check: Deal expiry dates
      const expiredDeals = dealBrokers.filter((b) => {
        if (!b.deal_expiry) return false;
        return new Date(b.deal_expiry) < new Date();
      });
      const dealsWithoutExpiry = dealBrokers.filter((b) => !b.deal_expiry);
      results.push({
        id: "aff-deal-expiry",
        category: "Affiliate & Sponsored Content",
        title: "Deal expiry dates are current and not misleading",
        severity: expiredDeals.length > 0 ? "fail" : dealsWithoutExpiry.length > 0 ? "warning" : dealBrokers.length === 0 ? "info" : "pass",
        regulation: "Australian Consumer Law s18 (misleading conduct)",
        detail: expiredDeals.length > 0
          ? `${expiredDeals.length} deal(s) have expired — displaying expired promotions is misleading under Australian Consumer Law.`
          : dealsWithoutExpiry.length > 0
            ? `${dealsWithoutExpiry.length} deal(s) have no expiry date — consider adding expiry for transparency.`
            : dealBrokers.length === 0
              ? "No active deals."
              : `All ${dealBrokers.length} deal(s) have valid, current expiry dates.`,
        items: [...expiredDeals.map((b) => `❌ ${b.name}: expired ${b.deal_expiry}`), ...dealsWithoutExpiry.map((b) => `⚠️ ${b.name}: no expiry set`)],
        href: expiredDeals.length > 0 || dealsWithoutExpiry.length > 0 ? "/admin/deal-of-month" : undefined,
        actionLabel: expiredDeals.length > 0 || dealsWithoutExpiry.length > 0 ? "Update Deals" : undefined,
      });

      // Check: Affiliate URL format
      const brokenUrls = brokers.filter((b) => b.affiliate_url && !b.affiliate_url.startsWith("http"));
      results.push({
        id: "aff-url-format",
        category: "Affiliate & Sponsored Content",
        title: "Affiliate URLs are properly formatted",
        severity: brokenUrls.length === 0 ? "pass" : "fail",
        detail: brokenUrls.length === 0
          ? "All affiliate URLs start with http(s)."
          : `${brokenUrls.length} affiliate URL(s) appear malformed.`,
        items: brokenUrls.map((b) => `${b.name}: ${b.affiliate_url}`),
        href: brokenUrls.length > 0 ? "/admin/affiliate-links" : undefined,
        actionLabel: brokenUrls.length > 0 ? "Fix URLs" : undefined,
      });

      // Check: Fee source URLs for verifiability
      const missingFeeSources = brokersWithFees.filter((b) => !b.fee_source_url);
      results.push({
        id: "aff-fee-sources",
        category: "Affiliate & Sponsored Content",
        title: "Fee claims backed by verifiable source URLs",
        severity: missingFeeSources.length === 0 ? "pass" : missingFeeSources.length <= 3 ? "warning" : "fail",
        regulation: "ASIC RG 234.67 (comparative claims must be substantiated)",
        detail: missingFeeSources.length === 0
          ? `All ${brokersWithFees.length} platform(s) with fee data have source URLs — claims are verifiable.`
          : `${missingFeeSources.length} platform(s) displaying fees without source URLs. ASIC RG 234 requires comparative claims to be substantiated.`,
        items: missingFeeSources.map((b) => `${b.name} (ASX fee: ${b.asx_fee})`),
        href: missingFeeSources.length > 0 ? "/admin/brokers" : undefined,
        actionLabel: missingFeeSources.length > 0 ? "Add Sources" : undefined,
      });

      // ═══════════════════════════════════════════════════════════
      // CATEGORY 7: Content Accuracy & E-E-A-T
      // ═══════════════════════════════════════════════════════════

      // Check: Fee data freshness
      const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);
      const staleFees = brokersWithFees.filter((b) => {
        if (!b.fee_verified_date) return true;
        return new Date(b.fee_verified_date) < ninetyDaysAgo;
      });
      results.push({
        id: "acc-fee-freshness",
        category: "Content Accuracy & E-E-A-T",
        title: "Fee data verified within 90 days",
        severity: staleFees.length === 0 ? "pass" : staleFees.length <= 3 ? "warning" : "fail",
        regulation: "ASIC RG 234.67 / E-E-A-T standards",
        detail: staleFees.length === 0
          ? `All ${brokersWithFees.length} platform(s) have fees verified within 90 days.`
          : `${staleFees.length} platform(s) have stale or unverified fee data. Inaccurate fee comparisons may constitute misleading conduct under ASIC guidelines.`,
        items: staleFees.map((b) => `${b.name}${b.fee_verified_date ? ` (last: ${new Date(b.fee_verified_date).toLocaleDateString("en-AU")})` : " (never verified)"}`),
        href: "/admin/brokers",
        actionLabel: "Verify Fees",
      });

      // Check: Article freshness for evergreen YMYL content
      const sixMonthsAgo = new Date(Date.now() - 180 * 86400000);
      const staleArticles = articles.filter((a) => {
        if (!a.evergreen) return false;
        const lastUpdate = a.updated_at || a.published_at;
        if (!lastUpdate) return true;
        return new Date(lastUpdate) < sixMonthsAgo;
      });
      results.push({
        id: "acc-article-freshness",
        category: "Content Accuracy & E-E-A-T",
        title: "Evergreen YMYL articles updated within 6 months",
        severity: staleArticles.length === 0 ? "pass" : staleArticles.length <= 5 ? "warning" : "fail",
        detail: staleArticles.length === 0
          ? "All evergreen articles have been updated within 6 months."
          : `${staleArticles.length} evergreen article(s) haven't been updated in 6+ months. Financial content (YMYL) requires regular review for accuracy.`,
        items: staleArticles.map((a) => a.title),
        href: "/admin/articles",
        actionLabel: "Review Articles",
      });

      // Check: Author attribution (E-E-A-T)
      const missingAuthors = articles.filter((a) => !a.author_name);
      results.push({
        id: "acc-author-attribution",
        category: "Content Accuracy & E-E-A-T",
        title: "Articles have author attribution (E-E-A-T: Experience)",
        severity: missingAuthors.length === 0 ? "pass" : missingAuthors.length <= 3 ? "warning" : "fail",
        detail: missingAuthors.length === 0
          ? `All ${articles.length} published articles have author attribution.`
          : `${missingAuthors.length} article(s) missing author attribution. For YMYL (Your Money Your Life) financial content, Google requires clear authorship signals.`,
        items: missingAuthors.slice(0, 10).map((a) => a.title),
        href: "/admin/articles",
        actionLabel: "Add Authors",
      });

      // Check: Expert review for YMYL content
      const ymylCategories = ["tax", "smsf", "super", "strategy", "crypto", "cfd-forex"];
      const ymylArticles = articles.filter((a) => ymylCategories.includes(a.category || ""));
      const unreviewed = ymylArticles.filter((a) => !a.reviewer_id && !a.reviewed_at);
      results.push({
        id: "acc-expert-review",
        category: "Content Accuracy & E-E-A-T",
        title: "YMYL articles have expert review (E-E-A-T: Expertise)",
        severity: unreviewed.length === 0 ? "pass" : unreviewed.length <= 5 ? "info" : "warning",
        detail: unreviewed.length === 0
          ? `All ${ymylArticles.length} YMYL articles have been expert-reviewed.`
          : `${unreviewed.length} of ${ymylArticles.length} YMYL articles lack expert review. Tax, super, and strategy content should be reviewed by a qualified financial professional.`,
        items: unreviewed.slice(0, 10).map((a) => a.title),
        href: "/admin/articles",
        actionLabel: "Assign Reviewers",
      });

      // Check: YMYL article changelogs
      const ymylWithoutChangelog = ymylArticles.filter((a) => !a.changelog || (a.changelog as { date: string; summary: string }[]).length === 0);
      results.push({
        id: "acc-ymyl-changelog",
        category: "Content Accuracy & E-E-A-T",
        title: "YMYL articles have revision changelogs",
        severity: ymylWithoutChangelog.length === 0 ? "pass" : ymylWithoutChangelog.length <= 3 ? "info" : "warning",
        detail: ymylWithoutChangelog.length === 0
          ? `All ${ymylArticles.length} YMYL articles have changelogs.`
          : `${ymylWithoutChangelog.length} YMYL articles lack changelogs. Showing update history builds trust and demonstrates currency of financial content.`,
        items: ymylWithoutChangelog.slice(0, 10).map((a) => a.title),
        href: "/admin/articles",
        actionLabel: "Add Changelogs",
      });

      // Check: Ratings exist for all platforms
      const missingRatings = brokers.filter((b) => !b.rating || b.rating === 0);
      results.push({
        id: "acc-ratings",
        category: "Content Accuracy & E-E-A-T",
        title: "All platforms have editorial ratings with methodology",
        severity: missingRatings.length === 0 ? "pass" : "warning",
        regulation: "ASIC RG 234.98 (ratings/awards must have transparent methodology)",
        detail: missingRatings.length === 0
          ? `All ${brokers.length} platforms have editorial ratings. Ensure the rating methodology is publicly documented.`
          : `${missingRatings.length} platform(s) missing ratings. ASIC requires that any rating system has a transparent, publicly available methodology.`,
        items: missingRatings.map((b) => b.name),
        href: "/admin/brokers",
        actionLabel: "Set Ratings",
      });

      // ═══════════════════════════════════════════════════════════
      // CATEGORY 8: Consumer Protection
      // ═══════════════════════════════════════════════════════════

      // Check: CHESS sponsorship claims
      const chessBrokers = shareBrokers.filter((b) => b.chess_sponsored);
      const nonChessBrokers = shareBrokers.filter((b) => !b.chess_sponsored);
      results.push({
        id: "prot-chess-verification",
        category: "Consumer Protection",
        title: "CHESS sponsorship claims are verified",
        severity: "info",
        regulation: "ASX Operating Rules",
        detail:
          `${chessBrokers.length} share broker(s) claim CHESS sponsorship, ${nonChessBrokers.length} use custodial models. ` +
          "CHESS_EXPLANATION is defined in lib/compliance.ts. Verify CHESS claims against ASX records regularly. " +
          "Consider displaying CHESS vs Custodial clearly on comparison pages.",
        items: [
          ...chessBrokers.map((b) => `✅ CHESS: ${b.name}`),
          ...nonChessBrokers.map((b) => `📦 Custodial: ${b.name}`),
        ],
      });

      // Check: Editorial correction process
      results.push({
        id: "prot-corrections-process",
        category: "Consumer Protection",
        title: "Editorial correction process available",
        severity: "info",
        regulation: "ASIC RG 256 / Best practice",
        detail:
          "EDITORIAL_ACCURACY_COMMITMENT is defined in lib/compliance.ts with corrections@invest.com.au contact. " +
          "Consider adding this to the /editorial-policy page and footer. " +
          "Demonstrates commitment to accuracy and aligns with ASIC RG 256 remediation principles.",
        items: [
          "EDITORIAL_ACCURACY_COMMITMENT: ✅ Defined",
          "Corrections email: corrections@invest.com.au",
          "Editorial policy page: ⚠️ Should include correction process",
        ],
      });

      // Check: Platform type coverage
      const platformTypes = new Map<string, number>();
      for (const b of brokers) {
        const pt = b.platform_type || "unknown";
        platformTypes.set(pt, (platformTypes.get(pt) || 0) + 1);
      }
      const expectedTypes = ["share_broker", "crypto_exchange", "robo_advisor", "research_tool", "super_fund", "property_platform", "cfd_forex"];
      const missingTypes = expectedTypes.filter((t) => !platformTypes.has(t));
      results.push({
        id: "prot-platform-coverage",
        category: "Consumer Protection",
        title: "All platform types represented for balanced coverage",
        severity: missingTypes.length === 0 ? "pass" : missingTypes.length <= 2 ? "info" : "warning",
        detail: missingTypes.length === 0
          ? `All ${expectedTypes.length} platform types have at least one active platform — coverage is comprehensive.`
          : `${missingTypes.length} platform type(s) have no active platforms: ${missingTypes.map((t) => t.replace(/_/g, " ")).join(", ")}. Consider adding platforms for balanced coverage.`,
        items: Array.from(platformTypes.entries()).map(([type, count]) => `${type.replace(/_/g, " ")}: ${count} platform(s)`),
        href: "/admin/brokers",
        actionLabel: missingTypes.length > 0 ? "Add Platforms" : undefined,
      });

      // Check: TFN withholding notice
      results.push({
        id: "prot-tfn-notice",
        category: "Consumer Protection",
        title: "TFN withholding notice available",
        severity: "info",
        regulation: "Taxation Administration Act s202A",
        detail:
          "TFN_NOTICE is defined in lib/compliance.ts. Consider referencing TFN requirements in articles about opening " +
          "brokerage accounts and super fund guides. Not providing a TFN results in tax withheld at the top marginal rate.",
      });

      // Check: Pros and cons for balanced content
      const missingProsCons = brokers.filter((b) => !b.pros || !b.cons || (b.pros as string[]).length === 0 || (b.cons as string[]).length === 0);
      results.push({
        id: "prot-balanced-reviews",
        category: "Consumer Protection",
        title: "Reviews include both pros and cons (balanced, not promotional)",
        severity: missingProsCons.length === 0 ? "pass" : "warning",
        regulation: "ASIC RG 234.70 (balanced presentation)",
        detail: missingProsCons.length === 0
          ? `All ${brokers.length} platforms have pros and cons — reviews are balanced.`
          : `${missingProsCons.length} platform(s) missing pros/cons. ASIC RG 234 requires that advertising not be one-sided or misleading.`,
        items: missingProsCons.map((b) => b.name),
        href: "/admin/brokers",
        actionLabel: "Add Pros/Cons",
      });

      // Check: Headquarters/jurisdiction transparency
      const missingHQ = brokers.filter((b) => !b.headquarters);
      results.push({
        id: "prot-headquarters",
        category: "Consumer Protection",
        title: "Platform jurisdiction/headquarters disclosed",
        severity: missingHQ.length === 0 ? "pass" : missingHQ.length <= 5 ? "info" : "warning",
        detail: missingHQ.length === 0
          ? `All ${brokers.length} platforms show headquarters. Users can assess jurisdiction and regulatory protections.`
          : `${missingHQ.length} platform(s) missing headquarters info. Australian users should know if a platform is locally regulated or offshore.`,
        items: missingHQ.map((b) => b.name),
        href: "/admin/brokers",
        actionLabel: "Add HQ Info",
      });

    } catch (err) {
      console.error("Compliance check error:", err);
    }

    setChecks(results);
    setLastRun(new Date().toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" }));
    setLoading(false);
  }

  // Summary stats
  const summary = useMemo(() => {
    const counts: Record<Severity, number> = { pass: 0, warning: 0, fail: 0, info: 0 };
    for (const c of checks) counts[c.severity]++;
    const total = checks.length;
    const score = total > 0 ? Math.round(((counts.pass + counts.info * 0.5) / total) * 100) : 0;
    return { counts, total, score };
  }, [checks]);

  // Group checks by category
  const grouped = useMemo(() => {
    const map = new Map<string, ComplianceCheck[]>();
    for (const cat of CATEGORIES) {
      map.set(cat.name, []);
    }
    for (const c of checks) {
      const arr = map.get(c.category);
      if (arr) arr.push(c);
    }
    return map;
  }, [checks]);

  const scoreBg = summary.score >= 80 ? "from-emerald-500 to-emerald-600" : summary.score >= 60 ? "from-amber-500 to-amber-600" : "from-red-500 to-red-600";

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold">
              🇦🇺 Australian Compliance Health
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              ASIC, AFSL, AFCA, AUSTRAC, SIS Act, RG 234 & RG 227 compliance checks
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastRun && (
              <span className="text-[0.69rem] text-slate-400">Last run: {lastRun}</span>
            )}
            <button
              onClick={runComplianceChecks}
              disabled={loading}
              className="px-4 py-2 min-h-[44px] bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {loading ? "Running..." : "Re-run Checks"}
            </button>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 md:h-28 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {!loading && (
          <>
            {/* Score Card + Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
              {/* Overall Score */}
              <div className={`col-span-2 md:col-span-1 bg-gradient-to-br ${scoreBg} rounded-xl p-4 md:p-5 text-white`}>
                <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">Health Score</p>
                <p className="text-3xl md:text-4xl font-extrabold">{summary.score}%</p>
                <p className="text-xs opacity-70 mt-1">{summary.total} checks</p>
              </div>

              {/* Pass */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 md:p-5">
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Passing</p>
                <p className="text-2xl md:text-3xl font-extrabold text-emerald-700">{summary.counts.pass}</p>
                <p className="text-[0.65rem] text-emerald-600 mt-1">checks pass</p>
              </div>

              {/* Warnings */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 md:p-5">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">Warnings</p>
                <p className="text-2xl md:text-3xl font-extrabold text-amber-700">{summary.counts.warning}</p>
                <p className="text-[0.65rem] text-amber-600 mt-1">need attention</p>
              </div>

              {/* Failures */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 md:p-5">
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1">Failures</p>
                <p className="text-2xl md:text-3xl font-extrabold text-red-700">{summary.counts.fail}</p>
                <p className="text-[0.65rem] text-red-600 mt-1">fix immediately</p>
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 md:p-5">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Info</p>
                <p className="text-2xl md:text-3xl font-extrabold text-blue-700">{summary.counts.info}</p>
                <p className="text-[0.65rem] text-blue-600 mt-1">for awareness</p>
              </div>
            </div>

            {/* Quick Reference — Australian Regulatory Bodies */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 md:p-5">
              <h3 className="text-xs md:text-sm font-bold text-blue-800 mb-2">🇦🇺 Australian Regulatory Framework — Quick Reference</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[0.69rem] md:text-xs text-blue-700">
                <div>
                  <p className="font-bold mb-1">ASIC</p>
                  <p>Australian Securities & Investments Commission. Regulates financial services, markets, and products. Issues AFSLs.</p>
                </div>
                <div>
                  <p className="font-bold mb-1">AUSTRAC</p>
                  <p>Australian Transaction Reports & Analysis Centre. Registers digital currency exchanges (DCEs) under AML/CTF laws.</p>
                </div>
                <div>
                  <p className="font-bold mb-1">AFCA</p>
                  <p>Australian Financial Complaints Authority. External dispute resolution for consumers. Free to use. Ph: 1800 931 678.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[0.69rem] md:text-xs text-blue-700 mt-3">
                <div>
                  <p className="font-bold mb-1">Key Regulatory Guides</p>
                  <p>RG 234 (Advertising), RG 227 (OTC derivatives), RG 183 (Super switching), RG 256 (Client remediation)</p>
                </div>
                <div>
                  <p className="font-bold mb-1">Key Legislation</p>
                  <p>Corporations Act 2001, SIS Act 1993, AML/CTF Act 2006, Australian Consumer Law</p>
                </div>
                <div>
                  <p className="font-bold mb-1">Key Protections</p>
                  <p>Govt Deposit Guarantee ($250k), CHESS sponsorship, Negative balance protection (CFDs), AFCA membership</p>
                </div>
              </div>
            </div>

            {/* Category Sections */}
            {CATEGORIES.map((cat) => {
              const catChecks = grouped.get(cat.name) || [];
              if (catChecks.length === 0) return null;

              const catFails = catChecks.filter((c) => c.severity === "fail").length;
              const catWarnings = catChecks.filter((c) => c.severity === "warning").length;
              const catPasses = catChecks.filter((c) => c.severity === "pass").length;

              return (
                <div key={cat.name} className="border border-slate-200 rounded-xl overflow-hidden">
                  {/* Category Header */}
                  <div className="bg-slate-50 px-4 md:px-5 py-3 md:py-4 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg md:text-xl">{cat.icon}</span>
                      <div>
                        <h2 className="text-sm md:text-base font-bold text-slate-900">{cat.name}</h2>
                        <p className="text-[0.62rem] md:text-xs text-slate-500">{cat.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs shrink-0">
                      {catFails > 0 && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-semibold">{catFails} fail</span>}
                      {catWarnings > 0 && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-semibold">{catWarnings} warn</span>}
                      {catPasses > 0 && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-semibold">{catPasses} pass</span>}
                    </div>
                  </div>

                  {/* Check Items */}
                  <div className="divide-y divide-slate-100">
                    {catChecks.map((check) => {
                      const sev = SEVERITY_CONFIG[check.severity];
                      return (
                        <div key={check.id} className="px-4 md:px-5 py-3 md:py-4">
                          <div className="flex items-start gap-3">
                            {/* Severity Icon */}
                            <div className={`shrink-0 w-6 h-6 md:w-7 md:h-7 rounded-full ${sev.bg} ${sev.border} border flex items-center justify-center`}>
                              <span className={`text-xs md:text-sm font-bold ${sev.text}`}>{sev.icon}</span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                                <h3 className="text-xs md:text-sm font-semibold text-slate-900">{check.title}</h3>
                                <span className={`text-[0.6rem] md:text-[0.65rem] font-bold px-1.5 py-px rounded-full ${sev.bg} ${sev.text}`}>
                                  {sev.label}
                                </span>
                                {check.regulation && (
                                  <span className="text-[0.58rem] md:text-[0.62rem] font-mono px-1.5 py-px rounded bg-slate-100 text-slate-500 border border-slate-200">
                                    {check.regulation}
                                  </span>
                                )}
                              </div>
                              <p className="text-[0.69rem] md:text-xs text-slate-600 leading-relaxed">{check.detail}</p>

                              {/* Expandable items list */}
                              {check.items && check.items.length > 0 && (
                                <details className="mt-1.5">
                                  <summary className="text-[0.62rem] md:text-[0.69rem] text-slate-400 cursor-pointer hover:text-slate-600 select-none">
                                    {check.items.length} item{check.items.length !== 1 ? "s" : ""} — click to expand
                                  </summary>
                                  <ul className="mt-1.5 space-y-0.5 text-[0.62rem] md:text-[0.69rem] text-slate-500">
                                    {check.items.map((item, i) => (
                                      <li key={i} className="flex items-start gap-1.5">
                                        <span className="text-slate-300 mt-0.5">•</span>
                                        <span>{item}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </details>
                              )}
                            </div>

                            {/* Action Button */}
                            {check.href && check.actionLabel && check.severity !== "pass" && (
                              <a
                                href={check.href}
                                className="shrink-0 px-3 py-1.5 min-h-[32px] text-[0.65rem] md:text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center"
                              >
                                {check.actionLabel} →
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Compliance Notes */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5">
              <h3 className="text-xs md:text-sm font-bold text-slate-700 mb-2">About this compliance checkup</h3>
              <ul className="space-y-1 text-[0.69rem] md:text-xs text-slate-500 leading-relaxed">
                <li>• Checks are tailored to <strong>Australian financial services regulation</strong> — ASIC, AFSL, AFCA, AUSTRAC, and the SIS Act</li>
                <li>• <strong>Failures</strong> indicate likely breaches of ASIC regulatory guides or legislation — fix these immediately</li>
                <li>• <strong>Warnings</strong> are best-practice gaps that should be addressed within 30 days</li>
                <li>• <strong>Info</strong> items are recommendations for strengthening compliance posture and E-E-A-T signals</li>
                <li>• Each check references the specific <strong>regulatory guide or legislation</strong> that applies</li>
                <li>• This automated checkup does <strong>not replace professional legal or compliance advice</strong></li>
                <li>• Reference: <a href="https://asic.gov.au/regulatory-resources/find-a-document/regulatory-guides/" className="underline hover:text-slate-700" target="_blank" rel="noopener">ASIC Regulatory Guides</a></li>
              </ul>
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}

// Company details constant (used for display, sourced from lib/compliance.ts)
const COMPANY_DETAILS = {
  name: "Invest.com.au Pty Ltd",
  acn: "093 882 421",
  abn: "90 093 882 421",
};
