/**
 * Key Australian financial dates for FY2025–26.
 * This module is exempt from the dated-strings gate (non-tsx, data-only).
 * Dates should be reviewed each July and updated for the new FY.
 */

export type EventCategory = "tax" | "super" | "smsf" | "business" | "fhss" | "investment";
export type EventUrgency = "critical" | "high" | "medium";

export interface FinancialEvent {
  id: string;
  title: string;
  date: string;
  isoDate: string;
  category: EventCategory;
  urgency: EventUrgency;
  description: string;
  notes?: string;
  href?: string;
  hrefLabel?: string;
}

export interface FinancialThreshold {
  label: string;
  value: string;
  fy: string;
  category: EventCategory;
  description: string;
}

export const FY = "FY2025–26";

export const FINANCIAL_EVENTS: FinancialEvent[] = [
  // ── Super deadlines ────────────────────────────────────────────────────────
  {
    id: "super-concessional-deadline",
    title: "Concessional Contributions Deadline",
    date: "30 June 2026",
    isoDate: "2026-06-30",
    category: "super",
    urgency: "critical",
    description:
      "Last day to make concessional (pre-tax) contributions — salary sacrifice and personal deductible — for FY2025–26. Annual cap: $30,000.",
    notes:
      "Employer super contributions count toward the cap. Check your YTD total before adding more.",
    href: "/super",
    hrefLabel: "Super guide",
  },
  {
    id: "super-non-concessional-deadline",
    title: "Non-Concessional Contributions Deadline",
    date: "30 June 2026",
    isoDate: "2026-06-30",
    category: "super",
    urgency: "high",
    description:
      "Last day to make after-tax contributions for FY2025–26. Annual cap: $120,000. Bring-forward rule allows up to $360,000 if under 75.",
    href: "/super",
    hrefLabel: "Super contributions guide",
  },
  {
    id: "super-co-contribution",
    title: "Super Co-Contribution Eligibility Closes",
    date: "30 June 2026",
    isoDate: "2026-06-30",
    category: "super",
    urgency: "medium",
    description:
      "Lodge at least one after-tax contribution before 30 June to be eligible for the government co-contribution (income under $60,400). Max co-contribution: $500.",
    href: "/super",
    hrefLabel: "Co-contribution guide",
  },
  {
    id: "sg-q4-due",
    title: "Employer Super Guarantee (Q4 FY2026)",
    date: "28 July 2026",
    isoDate: "2026-07-28",
    category: "super",
    urgency: "high",
    description:
      "Employers must pay the Q4 super guarantee (April–June 2026) by 28 July. Employees: check your super fund received the payment.",
    notes:
      "Late SG attracts a Superannuation Guarantee Charge (SGC) which is not deductible.",
  },

  // ── Tax deadlines ──────────────────────────────────────────────────────────
  {
    id: "bas-q4-fy26",
    title: "BAS Lodgement — Q4 FY2025–26",
    date: "28 July 2026",
    isoDate: "2026-07-28",
    category: "tax",
    urgency: "critical",
    description:
      "Quarterly BAS (April–June 2026) lodgement and payment deadline for quarterly GST reporters.",
    notes: "Monthly reporters have a 21-day rolling deadline after each month.",
  },
  {
    id: "individual-tax-return",
    title: "Individual Tax Return — Self-Lodged",
    date: "31 October 2026",
    isoDate: "2026-10-31",
    category: "tax",
    urgency: "critical",
    description:
      "Deadline for individuals lodging their own FY2025–26 tax return. Using a registered tax agent extends this to May 2027.",
    notes:
      "If you owe tax, late lodgement attracts a failure-to-lodge penalty ($313+ per 28 days).",
    href: "/tax",
    hrefLabel: "Tax return guide",
  },
  {
    id: "bas-q1-fy27",
    title: "BAS Lodgement — Q1 FY2026–27",
    date: "28 October 2026",
    isoDate: "2026-10-28",
    category: "tax",
    urgency: "high",
    description:
      "Quarterly BAS (July–September 2026) lodgement and payment deadline.",
  },
  {
    id: "bas-q2-fy27",
    title: "BAS Lodgement — Q2 FY2026–27",
    date: "28 February 2027",
    isoDate: "2027-02-28",
    category: "tax",
    urgency: "high",
    description:
      "Quarterly BAS (October–December 2026) lodgement and payment deadline.",
  },
  {
    id: "bas-q3-fy27",
    title: "BAS Lodgement — Q3 FY2026–27",
    date: "28 April 2027",
    isoDate: "2027-04-28",
    category: "tax",
    urgency: "high",
    description:
      "Quarterly BAS (January–March 2027) lodgement and payment deadline.",
  },

  // ── CGT / Investment ───────────────────────────────────────────────────────
  {
    id: "cgt-harvest-window",
    title: "CGT Harvesting Deadline",
    date: "30 June 2026",
    isoDate: "2026-06-30",
    category: "investment",
    urgency: "high",
    description:
      "Last day to crystallise capital losses to offset gains in FY2025–26. Review your portfolio for unrealised losses before the financial year closes.",
    notes:
      "Wash-sale rules do not formally apply in Australia, but ATO Part IVA may apply to arrangements with no genuine commercial purpose.",
    href: "/cgt-calculator",
    hrefLabel: "CGT calculator",
  },
  {
    id: "cgt-12-month-discount",
    title: "CGT 50% Discount — 12-Month Holding Check",
    date: "30 June 2026",
    isoDate: "2026-06-30",
    category: "investment",
    urgency: "medium",
    description:
      "Assets purchased before 30 June 2025 and held to 30 June 2026+ qualify for the 50% CGT discount on disposal. Review holdings approaching the 12-month mark.",
    href: "/cgt-calculator",
    hrefLabel: "CGT calculator",
  },

  // ── SMSF ──────────────────────────────────────────────────────────────────
  {
    id: "smsf-annual-return",
    title: "SMSF Annual Return — Standard Due Date",
    date: "28 February 2027",
    isoDate: "2027-02-28",
    category: "smsf",
    urgency: "high",
    description:
      "SMSFs lodging their own annual return must lodge by 28 February 2027. Using a registered SMSF auditor/tax agent may extend the deadline.",
    notes:
      "The SMSF must be audited before the return can be lodged. Engage your auditor in advance.",
    href: "/smsf",
    hrefLabel: "SMSF guide",
  },
  {
    id: "smsf-investment-strategy",
    title: "SMSF Investment Strategy Review",
    date: "30 June 2026",
    isoDate: "2026-06-30",
    category: "smsf",
    urgency: "medium",
    description:
      "SMSFs must review their investment strategy at least annually. Trustee minutes should document the review. Insurances must be considered.",
    href: "/smsf",
    hrefLabel: "SMSF investment strategy",
  },

  // ── FHSS ──────────────────────────────────────────────────────────────────
  {
    id: "fhss-contribution-deadline",
    title: "FHSS Contributions — FY2025–26 Count Date",
    date: "30 June 2026",
    isoDate: "2026-06-30",
    category: "fhss",
    urgency: "critical",
    description:
      "Voluntary super contributions made before 30 June 2026 count toward the FHSS $15,000/year cap for FY2025–26. You can release up to $50,000 total.",
    notes:
      "FHSS release takes 20+ business days — request from the ATO before you need settlement funds.",
    href: "/tools/fhss-calculator",
    hrefLabel: "FHSS calculator",
  },

  // ── Business ──────────────────────────────────────────────────────────────
  {
    id: "company-tax-return",
    title: "Company Tax Return — Standard Due Date",
    date: "28 February 2027",
    isoDate: "2027-02-28",
    category: "business",
    urgency: "high",
    description:
      "Companies with a tax agent have until 28 February 2027 to lodge the FY2025–26 company tax return. Small business entities lodging their own: 28 October 2026.",
  },
  {
    id: "div7a-repayment",
    title: "Division 7A Loan Repayments",
    date: "30 June 2026",
    isoDate: "2026-06-30",
    category: "business",
    urgency: "high",
    description:
      "Any Division 7A loan minimum repayments must be made by 30 June to avoid the amount being treated as an unfranked dividend.",
  },
];

export const FINANCIAL_THRESHOLDS: FinancialThreshold[] = [
  {
    label: "Super Guarantee Rate",
    value: "11.5%",
    fy: FY,
    category: "super",
    description: "Employer must contribute 11.5% of ordinary time earnings to employee super.",
  },
  {
    label: "Concessional Contributions Cap",
    value: "$30,000",
    fy: FY,
    category: "super",
    description: "Annual cap on pre-tax super contributions (salary sacrifice + personal deductible). Unused cap can be carried forward up to 5 years if total super balance < $500k.",
  },
  {
    label: "Non-Concessional Cap",
    value: "$120,000",
    fy: FY,
    category: "super",
    description: "Annual cap on after-tax contributions. Bring-forward rule allows up to $360,000 if under 75 and total balance < $1.66M.",
  },
  {
    label: "Transfer Balance Cap",
    value: "$1.9M",
    fy: FY,
    category: "super",
    description: "Maximum amount that can be transferred from accumulation phase to a tax-free pension account in retirement.",
  },
  {
    label: "Low Income Super Tax Offset (LISTO)",
    value: "$500",
    fy: FY,
    category: "super",
    description: "Government refund of the 15% tax on concessional contributions for low-income earners (income ≤ $37,000).",
  },
  {
    label: "Low Income Tax Offset (LITO)",
    value: "Up to $700",
    fy: FY,
    category: "tax",
    description: "Reduces tax payable for incomes up to $66,667. Full $700 offset for incomes up to $37,500; phases out to zero at $66,667.",
  },
  {
    label: "Medicare Levy Threshold (Single)",
    value: "$26,000",
    fy: FY,
    category: "tax",
    description: "No Medicare levy below this income. Shaded-in zone up to $32,500 (applies reduced rate). Full 2% levy above $32,500.",
  },
  {
    label: "CGT Discount Holding Period",
    value: "12 months",
    fy: FY,
    category: "investment",
    description: "Individuals and trusts that hold an asset for more than 12 months qualify for the 50% CGT discount on disposal.",
  },
  {
    label: "FHSS Maximum Release",
    value: "$50,000",
    fy: FY,
    category: "fhss",
    description: "Maximum you can release from super under the FHSS scheme across all financial years of contributions.",
  },
  {
    label: "FHSS Per-Year Contribution Limit",
    value: "$15,000",
    fy: FY,
    category: "fhss",
    description: "Maximum voluntary contributions that count toward the FHSS cap in any single financial year.",
  },
];

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  tax: "Tax & BAS",
  super: "Superannuation",
  smsf: "SMSF",
  business: "Business",
  fhss: "First Home Buyer",
  investment: "Investments & CGT",
};

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  tax: "bg-blue-50 text-blue-800 border-blue-200",
  super: "bg-violet-50 text-violet-800 border-violet-200",
  smsf: "bg-emerald-50 text-emerald-800 border-emerald-200",
  business: "bg-amber-50 text-amber-800 border-amber-200",
  fhss: "bg-rose-50 text-rose-800 border-rose-200",
  investment: "bg-slate-50 text-slate-800 border-slate-200",
};
