/**
 * Australian Regulatory Verification Requirements by Advisor Type
 * ================================================================
 * 
 * Each advisor vertical has distinct licensing, registration, and
 * verification requirements under Australian law. This module is the
 * single source of truth for what credentials each type needs and
 * how to verify them against official registers.
 *
 * Regulatory bodies:
 *   - ASIC (Australian Securities and Investments Commission)
 *     → AFSL (Australian Financial Services Licence)
 *     → ACL (Australian Credit Licence)
 *     → Financial Advisers Register
 *   - TPB (Tax Practitioners Board)
 *     → Tax Agent / BAS Agent registration
 *   - State Fair Trading / OFT (Office of Fair Trading)
 *     → Real estate licences (state-based)
 *   - AUSTRAC (Australian Transaction Reports and Analysis Centre)
 *     → Digital currency exchange (DCE) registration
 *   - AFCA (Australian Financial Complaints Authority)
 *     → External dispute resolution membership
 */

import type { ProfessionalType } from "@/lib/types";

export interface LicenceRequirement {
  /** Short name of the licence/registration e.g. "AFSL" */
  code: string;
  /** Full name e.g. "Australian Financial Services Licence" */
  name: string;
  /** Regulatory body that issues it */
  regulator: string;
  /** Regulator abbreviation */
  regulatorShort: string;
  /** URL to verify on the public register */
  verifyUrl: string;
  /** Label for the verification link */
  verifyLabel: string;
  /** Whether this is mandatory (true) or a common credential (false) */
  mandatory: boolean;
  /** Field on Professional that stores this credential */
  field: "afsl_number" | "registration_number" | "abn" | null;
  /** Short explanation of what this licence covers */
  description: string;
}

export interface VerificationConfig {
  /** The professional type this config applies to */
  type: ProfessionalType;
  /** Display label for this advisor category */
  label: string;
  /** Primary licence/registration required */
  primaryLicence: LicenceRequirement;
  /** Additional licences that may be held */
  additionalLicences: LicenceRequirement[];
  /** Minimum qualifications typically expected */
  qualifications: string[];
  /** Professional memberships / associations */
  associations: { name: string; acronym: string; url: string }[];
  /** Mandatory insurance type */
  insurance: string;
  /** External dispute resolution requirement */
  edr: string;
  /** CPD (Continuing Professional Development) requirement */
  cpd: string;
  /** Regulatory warning/disclosure text specific to this advisor type */
  disclosure: string;
}

// ═══════════════════════════════════════════════════════════════════
// LICENCE DEFINITIONS (reusable across advisor types)
// ═══════════════════════════════════════════════════════════════════

const AFSL: LicenceRequirement = {
  code: "AFSL",
  name: "Australian Financial Services Licence",
  regulator: "Australian Securities and Investments Commission",
  regulatorShort: "ASIC",
  verifyUrl: "https://asic.gov.au/online-services/search-asics-registers/",
  verifyLabel: "Verify on ASIC Register",
  mandatory: true,
  field: "afsl_number",
  description: "Required to provide financial product advice, deal in financial products, or operate managed investment schemes.",
};

const ASIC_FAR: LicenceRequirement = {
  code: "FAR",
  name: "Financial Advisers Register",
  regulator: "Australian Securities and Investments Commission",
  regulatorShort: "ASIC",
  verifyUrl: "https://moneysmart.gov.au/check-and-report-businesses/check-if-a-financial-adviser-or-financial-services-firm-is-licensed",
  verifyLabel: "Check on Moneysmart",
  mandatory: true,
  field: "registration_number",
  description: "All financial advisers providing personal advice to retail clients must appear on the Financial Advisers Register.",
};

const ACL: LicenceRequirement = {
  code: "ACL",
  name: "Australian Credit Licence",
  regulator: "Australian Securities and Investments Commission",
  regulatorShort: "ASIC",
  verifyUrl: "https://asic.gov.au/online-services/search-asics-registers/",
  verifyLabel: "Verify on ASIC Register",
  mandatory: true,
  field: "afsl_number", // ACL number stored in same field
  description: "Required to engage in credit activities including mortgage broking, lending, and credit advice under the National Consumer Credit Protection Act 2009.",
};

const ACR: LicenceRequirement = {
  code: "ACR",
  name: "Authorised Credit Representative",
  regulator: "Australian Securities and Investments Commission",
  regulatorShort: "ASIC",
  verifyUrl: "https://asic.gov.au/online-services/search-asics-registers/",
  verifyLabel: "Verify on ASIC Register",
  mandatory: false,
  field: "registration_number",
  description: "Mortgage brokers may operate as an authorised credit representative under an aggregator's ACL rather than holding their own.",
};

const TPB_TAX: LicenceRequirement = {
  code: "TAN",
  name: "Registered Tax Agent",
  regulator: "Tax Practitioners Board",
  regulatorShort: "TPB",
  verifyUrl: "https://www.tpb.gov.au/public-register",
  verifyLabel: "Verify on TPB Register",
  mandatory: true,
  field: "registration_number",
  description: "Required to provide tax agent services for a fee. Registration ensures the practitioner meets education, experience, and insurance standards.",
};

const TPB_BAS: LicenceRequirement = {
  code: "BAS",
  name: "Registered BAS Agent",
  regulator: "Tax Practitioners Board",
  regulatorShort: "TPB",
  verifyUrl: "https://www.tpb.gov.au/public-register",
  verifyLabel: "Verify on TPB Register",
  mandatory: false,
  field: "registration_number",
  description: "Required to provide BAS (Business Activity Statement) services for a fee.",
};

const RE_LICENCE: LicenceRequirement = {
  code: "RE",
  name: "Real Estate Agent Licence",
  regulator: "State Fair Trading / Office of Fair Trading",
  regulatorShort: "State OFT",
  verifyUrl: "", // State-specific, set per-type
  verifyLabel: "Verify with State Fair Trading",
  mandatory: true,
  field: "registration_number",
  description: "Buyers agents must hold a real estate agent licence in each state where they purchase property. Licensing is state-based, not national.",
};

const AUSTRAC_DCE: LicenceRequirement = {
  code: "DCE",
  name: "Digital Currency Exchange Registration",
  regulator: "Australian Transaction Reports and Analysis Centre",
  regulatorShort: "AUSTRAC",
  verifyUrl: "https://www.austrac.gov.au/business/registration",
  verifyLabel: "Check AUSTRAC Register",
  mandatory: true,
  field: null,
  description: "Anyone operating a digital currency exchange in Australia must be registered with AUSTRAC under the Anti-Money Laundering and Counter-Terrorism Financing Act 2006.",
};

// ═══════════════════════════════════════════════════════════════════
// VERIFICATION CONFIGS BY ADVISOR TYPE
// ═══════════════════════════════════════════════════════════════════

export const VERIFICATION_CONFIGS: Record<ProfessionalType, VerificationConfig> = {
  financial_planner: {
    type: "financial_planner",
    label: "Financial Planner",
    primaryLicence: AFSL,
    additionalLicences: [ASIC_FAR],
    qualifications: [
      "Bachelor's degree (or equivalent) in a relevant discipline",
      "Completed FASEA exam (Financial Adviser Standards and Ethics Authority)",
      "Must meet education requirements under Corporations Act s921B",
    ],
    associations: [
      { name: "Financial Planning Association of Australia", acronym: "FPA", url: "https://fpa.com.au" },
      { name: "Association of Financial Advisers", acronym: "AFA", url: "https://www.afa.asn.au" },
      { name: "Chartered Financial Planner (CFP)", acronym: "CFP", url: "https://fpa.com.au/cfp" },
    ],
    insurance: "Professional Indemnity Insurance — mandatory under AFSL conditions",
    edr: "Must be a member of AFCA (Australian Financial Complaints Authority)",
    cpd: "40 hours per year of CPD including ethics component, as required by FASEA/ASIC",
    disclosure: "Financial planners must hold an AFSL or be an authorised representative of an AFSL holder. They must appear on the ASIC Financial Advisers Register and provide you with a Financial Services Guide (FSG) before giving advice.",
  },

  smsf_accountant: {
    type: "smsf_accountant",
    label: "SMSF Accountant",
    primaryLicence: { ...AFSL, description: "Since 1 July 2016, accountants providing SMSF advice (including investment strategies) must hold an AFSL or be authorised under one. The accountants' exemption was removed." },
    additionalLicences: [TPB_TAX, TPB_BAS],
    qualifications: [
      "CA/CPA qualification or equivalent",
      "SMSF Association Specialist Advisor accreditation (recommended)",
      "Completed FASEA exam if providing personal advice on financial products",
    ],
    associations: [
      { name: "CPA Australia", acronym: "CPA", url: "https://www.cpaaustralia.com.au" },
      { name: "Chartered Accountants Australia & New Zealand", acronym: "CA ANZ", url: "https://www.charteredaccountantsanz.com" },
      { name: "SMSF Association", acronym: "SMSFA", url: "https://www.smsfassociation.com" },
    ],
    insurance: "Professional Indemnity Insurance — mandatory under TPB and AFSL requirements",
    edr: "Must be a member of AFCA if holding an AFSL. TPB-registered agents must have appropriate PI cover.",
    cpd: "TPB requires ongoing CPD. AFSL holders must meet ASIC's 40-hour annual CPD requirement.",
    disclosure: "Since 2016, accountants can no longer provide SMSF advice under the accountants' exemption. They must hold an AFSL (or limited AFSL) and be registered with the TPB as a tax agent.",
  },

  tax_agent: {
    type: "tax_agent",
    label: "Tax Agent",
    primaryLicence: TPB_TAX,
    additionalLicences: [TPB_BAS],
    qualifications: [
      "Tertiary qualification in accounting (degree or diploma)",
      "Minimum 12–24 months relevant experience depending on pathway",
      "Board-approved course in Australian tax law",
    ],
    associations: [
      { name: "CPA Australia", acronym: "CPA", url: "https://www.cpaaustralia.com.au" },
      { name: "Chartered Accountants Australia & New Zealand", acronym: "CA ANZ", url: "https://www.charteredaccountantsanz.com" },
      { name: "Institute of Public Accountants", acronym: "IPA", url: "https://www.publicaccountants.org.au" },
    ],
    insurance: "Professional Indemnity Insurance — mandatory under TPB requirements",
    edr: "Not required to be an AFCA member unless also holding an AFSL. Must maintain PI insurance.",
    cpd: "TPB requires ongoing CPD relevant to tax agent services",
    disclosure: "Tax agents must be registered with the Tax Practitioners Board (TPB) under the Tax Agent Services Act 2009. Verify their registration number on the TPB Public Register.",
  },

  mortgage_broker: {
    type: "mortgage_broker",
    label: "Mortgage Broker",
    primaryLicence: ACL,
    additionalLicences: [ACR],
    qualifications: [
      "Certificate IV in Finance and Mortgage Broking (FNS40821)",
      "Diploma of Finance and Mortgage Broking Management (FNS50322) for principal brokers",
      "2 years mentored experience required before holding own ACL",
    ],
    associations: [
      { name: "Mortgage & Finance Association of Australia", acronym: "MFAA", url: "https://www.mfaa.com.au" },
      { name: "Finance Brokers Association of Australia", acronym: "FBAA", url: "https://www.fbaa.com.au" },
    ],
    insurance: "Professional Indemnity Insurance — mandatory under ACL conditions",
    edr: "Must be a member of AFCA (Australian Financial Complaints Authority)",
    cpd: "MFAA requires 30 CPD points per year. FBAA has equivalent requirements.",
    disclosure: "Mortgage brokers must hold an Australian Credit Licence (ACL) or be an Authorised Credit Representative (ACR) under the National Consumer Credit Protection Act 2009. They have responsible lending obligations and must act in the consumer's best interests.",
  },

  buyers_agent: {
    type: "buyers_agent",
    label: "Buyer's Agent",
    primaryLicence: {
      ...RE_LICENCE,
      verifyUrl: "https://verify.licence.nsw.gov.au/", // NSW default, state-specific
      description: "Buyers agents must hold a real estate agent licence in each state where they purchase property. In NSW, a Class 1 licence is required to operate independently; Class 2 to work under a licensee.",
    },
    additionalLicences: [],
    qualifications: [
      "Certificate IV in Real Estate Practice (CPP41419) minimum",
      "Diploma of Property (Agency Management) (CPP51122) to operate own agency",
      "State-specific licensing requirements vary — must be licensed in each state of operation",
    ],
    associations: [
      { name: "Real Estate Buyers Agent Association of Australia", acronym: "REBAA", url: "https://rebaa.com.au" },
      { name: "Real Estate Institute (state-based)", acronym: "REI", url: "https://reia.asn.au" },
    ],
    insurance: "Professional Indemnity Insurance — minimum $1M per claim, $3M aggregate (NSW requirement)",
    edr: "Not required to be AFCA member. Consumer complaints handled via State Fair Trading / NCAT.",
    cpd: "State-based CPD requirements. NSW requires annual CPD training. QLD mandates 2 sessions/year from June 2025.",
    disclosure: "Buyers agents are licensed under state-based real estate legislation, not federal ASIC regulation. They must hold a real estate licence in every state where they buy property. Verify with your state's Fair Trading or Office of Fair Trading.",
  },

  property_advisor: {
    type: "property_advisor",
    label: "Property Advisor",
    primaryLicence: AFSL,
    additionalLicences: [{
      ...RE_LICENCE,
      mandatory: false,
      description: "Some property advisors also hold real estate licences if they assist with property transactions.",
    }],
    qualifications: [
      "AFSL required if providing advice on financial products (e.g. property trusts, mortgage products)",
      "Real estate licence if acting as buyers agent or selling agent",
      "Relevant tertiary qualifications recommended",
    ],
    associations: [
      { name: "Property Investment Professionals of Australia", acronym: "PIPA", url: "https://www.pipa.asn.au" },
    ],
    insurance: "Professional Indemnity Insurance — mandatory under AFSL and/or state real estate licensing",
    edr: "Must be a member of AFCA if holding an AFSL",
    cpd: "Depends on licensing regime — AFSL holders follow ASIC requirements; RE licensees follow state CPD.",
    disclosure: "Property advisors may operate under different regulatory frameworks depending on their services. Those providing financial product advice need an AFSL. Those acting as buyers agents need a state real estate licence. Verify which applies.",
  },

  insurance_broker: {
    type: "insurance_broker",
    label: "Insurance Broker",
    primaryLicence: { ...AFSL, description: "Insurance brokers must hold an AFSL with authorisations to deal in and advise on general insurance and/or life insurance products." },
    additionalLicences: [],
    qualifications: [
      "Tier 1 (personal advice): Diploma of Financial Planning or equivalent + relevant experience",
      "Tier 2 (general advice): Certificate III in Financial Services or equivalent",
      "ASIC-approved training requirements under RG 146",
    ],
    associations: [
      { name: "National Insurance Brokers Association", acronym: "NIBA", url: "https://www.niba.com.au" },
      { name: "Insurance Council of Australia", acronym: "ICA", url: "https://www.insurancecouncil.com.au" },
    ],
    insurance: "Professional Indemnity Insurance — mandatory under AFSL conditions. Also requires adequate compensation arrangements.",
    edr: "Must be a member of AFCA (Australian Financial Complaints Authority)",
    cpd: "NIBA requires ongoing CPD. ASIC mandates CPD under AFSL conditions.",
    disclosure: "Insurance brokers must hold an AFSL to provide advice on or deal in insurance products. They must provide a Financial Services Guide (FSG) and act in your best interests when recommending insurance.",
  },

  wealth_manager: {
    type: "wealth_manager",
    label: "Wealth Manager",
    primaryLicence: AFSL,
    additionalLicences: [ASIC_FAR],
    qualifications: [
      "Bachelor's degree in relevant discipline",
      "Completed FASEA exam",
      "Typically CFP, CFA, or equivalent advanced certification",
    ],
    associations: [
      { name: "Financial Planning Association of Australia", acronym: "FPA", url: "https://fpa.com.au" },
      { name: "CFA Society Australia", acronym: "CFA", url: "https://www.cfainstitute.org" },
    ],
    insurance: "Professional Indemnity Insurance — mandatory under AFSL conditions",
    edr: "Must be a member of AFCA (Australian Financial Complaints Authority)",
    cpd: "40 hours per year of CPD including ethics component",
    disclosure: "Wealth managers must hold an AFSL and appear on the ASIC Financial Advisers Register. They must provide an FSG and Statement of Advice (SOA) before providing personal financial advice.",
  },

  estate_planner: {
    type: "estate_planner",
    label: "Estate Planner",
    primaryLicence: {
      ...AFSL,
      mandatory: false,
      description: "Estate planners providing financial product advice need an AFSL. Those providing only legal advice (wills, trusts) need a legal practising certificate instead.",
    },
    additionalLicences: [{
      code: "LPC",
      name: "Legal Practising Certificate",
      regulator: "State Law Society / Bar Association",
      regulatorShort: "State Law Society",
      verifyUrl: "https://www.lawsociety.com.au/", // Varies by state
      verifyLabel: "Verify with State Law Society",
      mandatory: false,
      field: "registration_number",
      description: "Solicitors providing estate planning (wills, powers of attorney, trusts) must hold a current practising certificate from their state law society.",
    }],
    qualifications: [
      "Law degree + practising certificate for legal estate planning",
      "AFSL + financial planning qualifications for financial estate planning",
      "Specialist accreditation in estate planning available via state law societies",
    ],
    associations: [
      { name: "Society of Trust and Estate Practitioners", acronym: "STEP", url: "https://www.step.org" },
      { name: "State Law Society / Bar Association", acronym: "Law Society", url: "https://www.lawsociety.com.au/" },
    ],
    insurance: "Professional Indemnity Insurance — mandatory under legal practising certificate and/or AFSL",
    edr: "Legal practitioners: State Legal Services Commissioner. AFSL holders: AFCA.",
    cpd: "Legal CPD requirements set by state law society. AFSL holders follow ASIC requirements.",
    disclosure: "Estate planning may involve both legal and financial services. Ensure your advisor holds the appropriate credentials — a legal practising certificate for wills and trusts, or an AFSL for financial product advice.",
  },

  aged_care_advisor: {
    type: "aged_care_advisor",
    label: "Aged Care Advisor",
    primaryLicence: AFSL,
    additionalLicences: [],
    qualifications: [
      "Financial planning qualifications + FASEA exam",
      "Specialist aged care training (recommended)",
      "Understanding of Centrelink/DVA means testing",
    ],
    associations: [
      { name: "Aged Care Steps (specialist training)", acronym: "ACS", url: "https://agedcaresteps.com.au" },
      { name: "Financial Planning Association of Australia", acronym: "FPA", url: "https://fpa.com.au" },
    ],
    insurance: "Professional Indemnity Insurance — mandatory under AFSL conditions",
    edr: "Must be a member of AFCA (Australian Financial Complaints Authority)",
    cpd: "40 hours per year under ASIC requirements, plus specialist aged care CPD recommended",
    disclosure: "Aged care financial advice is a specialist area that involves Centrelink means testing, accommodation bonds, and complex fee structures. Ensure your advisor holds an AFSL and has specific aged care expertise.",
  },

  crypto_advisor: {
    type: "crypto_advisor",
    label: "Crypto Advisor",
    primaryLicence: {
      ...AFSL,
      mandatory: false,
      description: "Crypto advisors providing financial product advice on regulated crypto products may need an AFSL. The regulatory landscape is evolving — ASIC considers some crypto assets to be financial products.",
    },
    additionalLicences: [AUSTRAC_DCE],
    qualifications: [
      "AFSL if advising on crypto assets classified as financial products by ASIC",
      "AUSTRAC DCE registration if operating an exchange",
      "No standardised qualification yet — industry is evolving",
    ],
    associations: [
      { name: "Blockchain Australia", acronym: "BA", url: "https://blockchainaustralia.org" },
    ],
    insurance: "Professional Indemnity Insurance recommended but not universally mandatory",
    edr: "AFCA membership required if holding AFSL. AUSTRAC-registered entities have separate obligations.",
    cpd: "No standardised CPD. AFSL holders follow ASIC requirements.",
    disclosure: "The regulation of crypto assets in Australia is evolving. Some crypto products are classified as financial products by ASIC and require an AFSL to advise on. Crypto exchanges must be registered with AUSTRAC. Cryptocurrency is highly speculative — you could lose your entire investment.",
  },

  debt_counsellor: {
    type: "debt_counsellor",
    label: "Debt Counsellor",
    primaryLicence: {
      code: "FCC",
      name: "Financial Counselling Accreditation",
      regulator: "Financial Counselling Australia",
      regulatorShort: "FCA",
      verifyUrl: "https://www.financialcounsellingaustralia.org.au/find-a-financial-counsellor/",
      verifyLabel: "Find on FCA Directory",
      mandatory: false,
      field: null,
      description: "Financial counsellors provide free, independent, and confidential advice to people in financial difficulty. They do not sell financial products.",
    },
    additionalLicences: [{
      code: "ACL-DM",
      name: "ACL with Debt Management authorisation",
      regulator: "Australian Securities and Investments Commission",
      regulatorShort: "ASIC",
      verifyUrl: "https://asic.gov.au/online-services/search-asics-registers/",
      verifyLabel: "Verify on ASIC Register",
      mandatory: false,
      field: "afsl_number",
      description: "Paid debt management services require an ACL with a debt management authorisation since 1 July 2021.",
    }],
    qualifications: [
      "Diploma of Financial Counselling (CHC51115) for accredited financial counsellors",
      "ACL with debt management authorisation for paid debt negotiation services",
      "Community sector financial counsellors are typically free and funded by government",
    ],
    associations: [
      { name: "Financial Counselling Australia", acronym: "FCA", url: "https://www.financialcounsellingaustralia.org.au" },
    ],
    insurance: "Professional Indemnity Insurance for paid services. Free community counsellors covered by employer.",
    edr: "Community financial counsellors: N/A. Paid debt management: must be AFCA member.",
    cpd: "FCA members must complete ongoing professional development",
    disclosure: "Free financial counsellors are funded by government and do not sell products — they act in your interest only. Paid debt management services must hold an ACL with debt management authorisation since July 2021. Be cautious of paid services that charge upfront fees.",
  },

  real_estate_agent: {
    type: "real_estate_agent",
    label: "Real Estate Agent",
    primaryLicence: {
      code: "RE",
      name: "Real Estate Agent Licence",
      regulator: "State Fair Trading / Office of Fair Trading",
      regulatorShort: "State OFT",
      verifyUrl: "",
      verifyLabel: "Verify with State Fair Trading",
      mandatory: true,
      field: "registration_number",
      description: "Real estate agents must hold a state-based licence to sell, buy, lease, or manage property on behalf of clients. Licensing requirements vary by state — NSW has a tiered Class 1/Class 2 system, while QLD requires a full licence from the OFT.",
    },
    additionalLicences: [],
    qualifications: [
      "Certificate IV in Real Estate Practice (CPP41419) — required in all states",
      "Diploma of Property (Agency Management) (CPP51122) to operate own agency",
      "State-specific registration or licence — requirements vary by jurisdiction",
      "NSW: Class 2 licence (12+ months as assistant agent), Class 1 to operate agency",
      "VIC: Agent's Representative Certificate or full Estate Agent Licence",
      "QLD: Full Real Estate Licence from Office of Fair Trading",
    ],
    associations: [
      { name: "Real Estate Institute of Australia", acronym: "REIA", url: "https://reia.asn.au" },
      { name: "Real Estate Institute (state-based)", acronym: "REI", url: "https://reia.asn.au" },
    ],
    insurance: "Professional Indemnity Insurance — mandatory in most states. NSW requires minimum $1M per claim, $3M aggregate.",
    edr: "Consumer complaints handled via State Fair Trading, Civil & Administrative Tribunal (e.g. NCAT in NSW). Not AFCA.",
    cpd: "State-based CPD requirements. NSW mandates annual CPD training. QLD requires 2 sessions/year from June 2025. VIC requires ongoing training for licence renewal.",
    disclosure: "Real estate agents are licensed under state-based property legislation, not federal ASIC regulation. Licensing requirements differ between states. Always verify an agent's licence with your state's Fair Trading or Office of Fair Trading before engaging their services.",
  },
  stockbroker_firm: {
    type: "stockbroker_firm",
    label: "Full-Service Stockbroker",
    primaryLicence: AFSL,
    additionalLicences: [],
    qualifications: [
      "Firm holds an AFSL covering dealing in securities and providing financial product advice",
      "Authorised representatives must satisfy ASIC RG 146 / education standards under Corporations Act s921B",
      "Many firms are also Market Participants of the ASX and/or Cboe Australia",
    ],
    associations: [
      { name: "Stockbrokers and Investment Advisers Association", acronym: "SIAA", url: "https://www.stockbrokers.org.au" },
      { name: "ASX Market Participant", acronym: "ASX", url: "https://www.asx.com.au" },
    ],
    insurance: "Professional Indemnity Insurance — mandatory under AFSL conditions",
    edr: "Must be a member of AFCA (Australian Financial Complaints Authority)",
    cpd: "Authorised representatives subject to ongoing CPD obligations under ASIC standards",
    disclosure: "Full-service stockbroking firms operate under an AFSL and are typically Market Participants of the ASX. They can provide personal financial product advice and execute trades on your behalf. Always verify the firm's AFSL on the ASIC Financial Services Register and ask for a Financial Services Guide (FSG) before engaging.",
  },
  private_wealth_manager: {
    type: "private_wealth_manager",
    label: "Private Wealth Manager",
    primaryLicence: AFSL,
    additionalLicences: [],
    qualifications: [
      "Firm holds an AFSL covering managed discretionary account services and/or financial product advice",
      "Senior advisers typically hold CFP, CFA, or equivalent post-graduate qualifications",
    ],
    associations: [
      { name: "Stockbrokers and Investment Advisers Association", acronym: "SIAA", url: "https://www.stockbrokers.org.au" },
      { name: "CFA Society Australia", acronym: "CFA", url: "https://www.cfasociety.org/australia" },
    ],
    insurance: "Professional Indemnity Insurance — mandatory under AFSL conditions",
    edr: "Must be a member of AFCA",
    cpd: "Subject to ongoing CPD obligations under ASIC standards and any internal qualifications",
    disclosure: "Private wealth managers operate under an AFSL and may provide discretionary portfolio management. Verify the firm's AFSL and request a Financial Services Guide (FSG) before engaging.",
  },

  // ─── Wave-N new advisor types ─────────────────────────────────
  // Added when the advisor directory expanded to cover 22 types.
  // These configs are minimum-viable — they satisfy the typechecker
  // and give user-facing pages real disclosure copy. Full licence
  // and CPD detail can be backfilled as advisors onboard.

  mining_lawyer: {
    type: "mining_lawyer",
    label: "Mining Lawyer",
    primaryLicence: {
      code: "LPC",
      name: "Legal Practising Certificate",
      regulator: "State Law Society / Legal Services Commission",
      regulatorShort: "Law Society",
      verifyUrl: "https://www.lawcouncil.asn.au",
      verifyLabel: "Verify on state Law Society register",
      mandatory: true,
      field: "registration_number",
      description: "Required to practise law in Australia — issued by the state Law Society to admitted practitioners.",
    },
    additionalLicences: [],
    qualifications: [
      "Admitted to practice in at least one Australian state or territory",
      "Practising certificate current with state Law Society",
      "Substantive experience in resources sector transactions (tenements, JV, FIRB)",
    ],
    associations: [
      { name: "Law Council of Australia — Business Law Section", acronym: "LCA", url: "https://www.lawcouncil.asn.au" },
      { name: "Australian Mining & Petroleum Law Association", acronym: "AMPLA", url: "https://www.ampla.org" },
    ],
    insurance: "Professional Indemnity Insurance — mandatory under state legal profession acts",
    edr: "Complaints handled by the relevant state Legal Services Commissioner",
    cpd: "10 CPD units per year as required by state Law Society",
    disclosure: "Mining lawyers must hold a current practising certificate in their admitted jurisdiction. Legal fees attract GST. Always confirm the practitioner's certificate on the state Law Society register before engaging.",
  },

  mining_tax_advisor: {
    type: "mining_tax_advisor",
    label: "Mining Tax Advisor",
    primaryLicence: {
      code: "TPB",
      name: "Registered Tax Agent",
      regulator: "Tax Practitioners Board",
      regulatorShort: "TPB",
      verifyUrl: "https://www.tpb.gov.au/public-register",
      verifyLabel: "Verify on TPB Public Register",
      mandatory: true,
      field: "registration_number",
      description: "Required to provide tax agent services for a fee — verifies registration with the Tax Practitioners Board.",
    },
    additionalLicences: [],
    qualifications: [
      "Registered tax agent with the Tax Practitioners Board (TPB)",
      "Chartered Accountant (CA) or CPA with Big 4 / specialist resources experience",
      "Substantive experience with PRRT, royalty regimes and cross-border transfer pricing",
    ],
    associations: [
      { name: "Chartered Accountants Australia & New Zealand", acronym: "CA ANZ", url: "https://www.charteredaccountantsanz.com" },
      { name: "CPA Australia", acronym: "CPA", url: "https://www.cpaaustralia.com.au" },
    ],
    insurance: "Professional Indemnity Insurance — required under TPB registration conditions",
    edr: "Complaints escalate to the Tax Practitioners Board",
    cpd: "120 hours over 3 years as per TPB requirements",
    disclosure: "Tax agents must be registered with the TPB. Verify the agent's registration number before engaging. Fees attract GST.",
  },

  migration_agent: {
    type: "migration_agent",
    label: "Migration Agent",
    primaryLicence: {
      code: "MARN",
      name: "Migration Agents Registration Number",
      regulator: "Office of the Migration Agents Registration Authority",
      regulatorShort: "MARA",
      verifyUrl: "https://www.mara.gov.au/search-the-register-of-migration-agents",
      verifyLabel: "Verify on MARA Register",
      mandatory: true,
      field: "registration_number",
      description: "Required by law to provide immigration assistance in Australia — all practising agents must hold a current MARN.",
    },
    additionalLicences: [],
    qualifications: [
      "MARA-registered (Migration Agents Registration Number, MARN)",
      "Completed the Graduate Diploma in Migration Law & Practice (or equivalent)",
      "Bound by the Code of Conduct under the Migration Agents Regulations 1998",
    ],
    associations: [
      { name: "Migration Institute of Australia", acronym: "MIA", url: "https://www.mia.org.au" },
    ],
    insurance: "Professional Indemnity Insurance — mandatory under MARA registration conditions",
    edr: "Complaints handled by the Office of MARA",
    cpd: "Annual CPD requirement set by MARA (currently 10 points per year)",
    disclosure: "Only MARA-registered migration agents can legally provide immigration assistance in Australia. Verify the MARN on the MARA register before engaging.",
  },

  business_broker: {
    type: "business_broker",
    label: "Business Broker",
    primaryLicence: {
      code: "RE Agent",
      name: "State Real Estate / Business Agent Licence",
      regulator: "State Fair Trading / Consumer Affairs",
      regulatorShort: "Fair Trading",
      verifyUrl: "https://www.abba.asn.au",
      verifyLabel: "Verify on state Fair Trading register",
      mandatory: true,
      field: "registration_number",
      description: "Required to broker the sale of businesses in Australia — licensed by state consumer protection authorities.",
    },
    additionalLicences: [],
    qualifications: [
      "Licensed as a business agent or real estate agent in the relevant state",
      "Practical experience in SME valuation, due diligence and transaction management",
    ],
    associations: [
      { name: "Australian Business Brokers Association", acronym: "ABBA", url: "https://www.abba.asn.au" },
      { name: "Real Estate Institute (state chapters)", acronym: "REI", url: "https://reia.asn.au" },
    ],
    insurance: "Professional Indemnity Insurance — required under state licensing conditions",
    edr: "Complaints handled by state Fair Trading / Consumer Affairs",
    cpd: "Ongoing CPD as per state licensing board requirements",
    disclosure: "Business brokers must be licensed in the state where they operate. Commissions are typically 8–12% for SMEs and paid by the seller. Always verify the licence on the relevant state Fair Trading register.",
  },

  commercial_lawyer: {
    type: "commercial_lawyer",
    label: "Commercial Lawyer",
    primaryLicence: {
      code: "LPC",
      name: "Legal Practising Certificate",
      regulator: "State Law Society / Legal Services Commission",
      regulatorShort: "Law Society",
      verifyUrl: "https://www.lawcouncil.asn.au",
      verifyLabel: "Verify on state Law Society register",
      mandatory: true,
      field: "registration_number",
      description: "Required to practise law in Australia — issued by the state Law Society to admitted practitioners.",
    },
    additionalLicences: [],
    qualifications: [
      "Admitted to practice in at least one Australian state or territory",
      "Current practising certificate with state Law Society",
    ],
    associations: [
      { name: "Law Council of Australia — Business Law Section", acronym: "LCA", url: "https://www.lawcouncil.asn.au" },
    ],
    insurance: "Professional Indemnity Insurance — mandatory under state legal profession acts",
    edr: "Complaints handled by the relevant state Legal Services Commissioner",
    cpd: "10 CPD units per year as required by state Law Society",
    disclosure: "Commercial lawyers must hold a current practising certificate. Always verify the practitioner on the state Law Society register before engaging. Legal fees attract GST.",
  },

  rural_property_agent: {
    type: "rural_property_agent",
    label: "Rural Property Agent",
    primaryLicence: {
      code: "RE Agent",
      name: "State Real Estate Agent Licence",
      regulator: "State Fair Trading / Consumer Affairs",
      regulatorShort: "Fair Trading",
      verifyUrl: "https://reia.asn.au",
      verifyLabel: "Verify on state Fair Trading register",
      mandatory: true,
      field: "registration_number",
      description: "Required to sell or auction rural / agricultural real estate — issued by state consumer protection authorities.",
    },
    additionalLicences: [],
    qualifications: [
      "Licensed real estate agent in the relevant state",
      "Experience in agricultural or rural sales (farms, stations, water rights)",
    ],
    associations: [
      { name: "Real Estate Institute (state chapters)", acronym: "REI", url: "https://reia.asn.au" },
    ],
    insurance: "Professional Indemnity Insurance — required under state licensing conditions",
    edr: "Complaints handled by state Fair Trading / Consumer Affairs",
    cpd: "Ongoing CPD as per state licensing board requirements",
    disclosure: "Rural property agents must hold a state real estate licence. Commissions on rural sales typically range 2–4% and are paid by the seller. Verify the agent on the relevant state Fair Trading register.",
  },

  commercial_property_agent: {
    type: "commercial_property_agent",
    label: "Commercial Property Agent",
    primaryLicence: {
      code: "RE Agent",
      name: "State Real Estate Agent Licence",
      regulator: "State Fair Trading / Consumer Affairs",
      regulatorShort: "Fair Trading",
      verifyUrl: "https://reia.asn.au",
      verifyLabel: "Verify on state Fair Trading register",
      mandatory: true,
      field: "registration_number",
      description: "Required to sell, lease or auction commercial real estate — issued by state consumer protection authorities.",
    },
    additionalLicences: [],
    qualifications: [
      "Licensed real estate agent in the relevant state",
      "Experience in commercial asset sales and/or leasing (office, industrial, retail)",
    ],
    associations: [
      { name: "Real Estate Institute (state chapters)", acronym: "REI", url: "https://reia.asn.au" },
      { name: "Australian Property Institute", acronym: "API", url: "https://www.api.org.au" },
    ],
    insurance: "Professional Indemnity Insurance — required under state licensing conditions",
    edr: "Complaints handled by state Fair Trading / Consumer Affairs",
    cpd: "Ongoing CPD as per state licensing board requirements",
    disclosure: "Commercial property agents must hold a state real estate licence. Sales commissions typically 1–2% and leasing commissions 6–12% of first-year rent. Verify the agent on the relevant state Fair Trading register.",
  },

  energy_consultant: {
    type: "energy_consultant",
    label: "Energy Consultant",
    primaryLicence: {
      code: "CEC",
      name: "Clean Energy Council Approved Consultant",
      regulator: "Clean Energy Council",
      regulatorShort: "CEC",
      verifyUrl: "https://www.cleanenergycouncil.org.au",
      verifyLabel: "Verify on CEC Approved Consultants register",
      mandatory: false,
      field: "registration_number",
      description: "Recognised industry accreditation for renewable energy consultants — not statutorily required but an industry benchmark.",
    },
    additionalLicences: [],
    qualifications: [
      "Relevant engineering degree or equivalent technical qualifications",
      "Clean Energy Council accredited (where applicable) or Engineers Australia CEng",
      "Experience in renewables feasibility, PPA structuring or grid connection",
    ],
    associations: [
      { name: "Clean Energy Council", acronym: "CEC", url: "https://www.cleanenergycouncil.org.au" },
      { name: "Engineers Australia", acronym: "EA", url: "https://www.engineersaustralia.org.au" },
    ],
    insurance: "Professional Indemnity Insurance — typical market standard; verify with consultant",
    edr: "No single statutory EDR — disputes resolved via contract / common law",
    cpd: "Ongoing CPD as per Engineers Australia / Clean Energy Council requirements",
    disclosure: "Energy consultants are not a regulated profession in Australia. Verify qualifications via Engineers Australia membership or Clean Energy Council accreditation before engaging.",
  },
};

// ═══════════════════════════════════════════════════════════════════
// HELPER: Get verification URL for a professional
// ═══════════════════════════════════════════════════════════════════

/** State-based Fair Trading register URLs for buyers agents / real estate */
export const STATE_FAIR_TRADING_URLS: Record<string, { name: string; url: string }> = {
  NSW: { name: "NSW Fair Trading", url: "https://verify.licence.nsw.gov.au/" },
  VIC: { name: "Consumer Affairs Victoria", url: "https://www.consumer.vic.gov.au/licensing-and-registration/estate-agents" },
  QLD: { name: "QLD Office of Fair Trading", url: "https://www.qld.gov.au/law/laws-regulated-industries-and-accountability/queensland-laws-and-regulations/check-a-licence-queensland" },
  WA: { name: "WA Commerce", url: "https://www.commerce.wa.gov.au/consumer-protection/real-estate-agents" },
  SA: { name: "SA Consumer & Business Services", url: "https://www.cbs.sa.gov.au/licensing-and-registration" },
  TAS: { name: "TAS Consumer Affairs", url: "https://www.cbos.tas.gov.au/topics/licensing-and-registration" },
  ACT: { name: "Access Canberra", url: "https://www.accesscanberra.act.gov.au/business-and-work/real-estate-and-property" },
  NT: { name: "NT Consumer Affairs", url: "https://consumeraffairs.nt.gov.au/for-business/licensed-occupations" },
};

/**
 * Returns the appropriate verification config for a professional type.
 */
export function getVerificationConfig(type: ProfessionalType): VerificationConfig {
  return VERIFICATION_CONFIGS[type];
}

/**
 * Returns all verification URLs relevant to a professional,
 * including state-based registers for real estate types.
 */
export function getVerificationLinks(type: ProfessionalType, state?: string): {
  label: string;
  url: string;
  regulator: string;
  mandatory: boolean;
}[] {
  const config = VERIFICATION_CONFIGS[type];
  const links: { label: string; url: string; regulator: string; mandatory: boolean }[] = [];

  // Primary licence
  if (config.primaryLicence.verifyUrl) {
    links.push({
      label: config.primaryLicence.verifyLabel,
      url: config.primaryLicence.verifyUrl,
      regulator: config.primaryLicence.regulatorShort,
      mandatory: config.primaryLicence.mandatory,
    });
  }

  // Additional licences
  for (const lic of config.additionalLicences) {
    if (lic.verifyUrl) {
      links.push({
        label: lic.verifyLabel,
        url: lic.verifyUrl,
        regulator: lic.regulatorShort,
        mandatory: lic.mandatory,
      });
    }
  }

  // State-based register for buyers agents / property types
  if ((type === "buyers_agent" || type === "property_advisor" || type === "real_estate_agent") && state && STATE_FAIR_TRADING_URLS[state]) {
    const ft = STATE_FAIR_TRADING_URLS[state];
    links.push({
      label: `Verify on ${ft.name}`,
      url: ft.url,
      regulator: ft.name,
      mandatory: true,
    });
  }

  return links;
}
