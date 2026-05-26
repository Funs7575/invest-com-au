/**
 * Checklist steps for each life event wizard.
 * Keys match LifeEvent.id from lib/life-events.ts.
 *
 * Each step has a unique id (used in form_data.completed[]), a title,
 * an optional short description, and an optional internal action link.
 */

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
}

const STEPS: Record<string, WizardStep[]> = {
  buying_first_home: [
    { id: "check_eligibility",  title: "Check FHBG and FHSS eligibility", description: "First Home Buyer Guarantee and First Home Super Saver Scheme.", href: "/first-home-buyer", hrefLabel: "First-home guide" },
    { id: "budget",             title: "Calculate your deposit + borrowing capacity", description: "Aim for 20% to avoid LMI. Use a mortgage calculator." },
    { id: "pre_approval",       title: "Get home loan pre-approval", description: "Pre-approval typically lasts 90 days and tells sellers you're serious.", href: "/compare?category=mortgages", hrefLabel: "Compare lenders" },
    { id: "find_broker",        title: "Engage a mortgage broker", href: "/advisors/mortgage-brokers", hrefLabel: "Find a broker" },
    { id: "conveyancer",        title: "Appoint a solicitor or conveyancer" },
    { id: "building_inspection",title: "Book a building and pest inspection before signing" },
  ],
  buying_investment_property: [
    { id: "yield_analysis",     title: "Model gross and net rental yield", description: "Factor in rates, insurance, PM fees, and vacancy buffer." },
    { id: "negative_gearing",   title: "Understand negative gearing and depreciation", href: "/property", hrefLabel: "Property guide" },
    { id: "pre_approval",       title: "Get investment loan pre-approval", href: "/compare?category=mortgages", hrefLabel: "Compare lenders" },
    { id: "find_broker",        title: "Engage a mortgage broker", href: "/advisors/mortgage-brokers", hrefLabel: "Find a broker" },
    { id: "tax_structure",      title: "Review ownership structure with a tax advisor", href: "/advisors/tax-agents", hrefLabel: "Find a tax agent" },
    { id: "depreciation",       title: "Order a quantity surveyor depreciation schedule after purchase" },
  ],
  refinancing_mortgage: [
    { id: "compare_rates",      title: "Compare current rates across lenders", href: "/compare?category=mortgages", hrefLabel: "Compare mortgages" },
    { id: "break_cost",         title: "Calculate any fixed-rate break costs" },
    { id: "find_broker",        title: "Talk to a broker about switching options", href: "/advisors/mortgage-brokers", hrefLabel: "Find a broker" },
    { id: "apply",              title: "Submit refinance application" },
    { id: "settlement",         title: "Complete settlement and cancel direct debits from old account" },
  ],
  getting_married: [
    { id: "combine_finances",   title: "Agree on a joint budgeting system" },
    { id: "joint_goals",        title: "Set shared short, medium, and long-term financial goals" },
    { id: "update_super",       title: "Update superannuation beneficiary nominations" },
    { id: "income_protection",  title: "Review income protection and life insurance", href: "/advisors/insurance-advisors", hrefLabel: "Find an advisor" },
    { id: "update_will",        title: "Update your will and powers of attorney", href: "/advisors/estate-planners", hrefLabel: "Find an estate planner" },
    { id: "planner",            title: "Speak with a financial planner about long-term goals", href: "/advisors/financial-planners", hrefLabel: "Find a planner" },
  ],
  having_baby: [
    { id: "paid_parental",      title: "Check Paid Parental Leave entitlements (employer + government)" },
    { id: "childcare_subsidy",  title: "Apply for childcare subsidy (Services Australia)" },
    { id: "budget_impact",      title: "Model the income impact during parental leave" },
    { id: "update_insurance",   title: "Review life insurance and income protection", href: "/advisors/insurance-advisors", hrefLabel: "Find an advisor" },
    { id: "update_will",        title: "Update will to include guardianship arrangements", href: "/advisors/estate-planners", hrefLabel: "Find an estate planner" },
    { id: "education_fund",     title: "Set up an education savings plan or investment bond" },
  ],
  getting_divorced: [
    { id: "financial_inventory", title: "Compile a full inventory of joint and sole assets and debts" },
    { id: "family_lawyer",       title: "Engage a family law solicitor" },
    { id: "super_split",         title: "Arrange a superannuation split if applicable" },
    { id: "update_insurances",   title: "Update insurance beneficiaries and ownership" },
    { id: "update_will",         title: "Update will and powers of attorney", href: "/advisors/estate-planners", hrefLabel: "Find an estate planner" },
    { id: "financial_planner",   title: "Build a post-divorce financial plan", href: "/advisors/financial-planners", hrefLabel: "Find a planner" },
  ],
  aged_care_planning: [
    { id: "assessment",         title: "Apply for an Aged Care Assessment (ACAT/ACAS)" },
    { id: "costs",              title: "Understand means-tested care fees and RADs/DAPs" },
    { id: "centrelink",         title: "Review Age Pension and Centrelink impacts" },
    { id: "power_attorney",     title: "Establish enduring powers of attorney and guardianship" },
    { id: "update_will",        title: "Update will and advance care directive", href: "/advisors/estate-planners", hrefLabel: "Find an estate planner" },
    { id: "advisor",            title: "Engage an aged care specialist", href: "/advisors/aged-care-specialists", hrefLabel: "Find a specialist" },
  ],
  redundancy: [
    { id: "tax",                title: "Understand the tax treatment of redundancy payments" },
    { id: "centrelink",         title: "Check Centrelink JobSeeker eligibility" },
    { id: "super_contribution", title: "Consider voluntary super contribution with the tax-free component" },
    { id: "income_protection",  title: "Check income protection policy waiting periods and coverage" },
    { id: "budget_review",      title: "Revise budget for reduced income period" },
    { id: "advisor",            title: "Get advice on investing the lump sum", href: "/advisors/financial-planners", hrefLabel: "Find a planner" },
  ],
  starting_new_job: [
    { id: "super_choice",       title: "Choose your super fund (use MySuper comparison)", href: "/super", hrefLabel: "Super guide" },
    { id: "salary_packaging",   title: "Review salary packaging options with your employer" },
    { id: "update_insurances",  title: "Check group insurance inside super — consider top-up" },
    { id: "tax_withheld",       title: "Submit TFN declaration and review tax withheld" },
    { id: "budget",             title: "Update budget for new income level" },
  ],
  moving_to_australia: [
    { id: "tax_residency",      title: "Confirm tax residency status with an accountant" },
    { id: "super",              title: "Set up superannuation (mandatory from first pay)", href: "/super", hrefLabel: "Super guide" },
    { id: "dasp",               title: "Understand DASP (Departing Australia Super Payment) for temporary residents" },
    { id: "property_firb",      title: "If buying property, check FIRB foreign investment rules", href: "/foreign-investment", hrefLabel: "FIRB guide" },
    { id: "tax_agent",          title: "Engage a tax agent familiar with expat rules", href: "/advisors/tax-agents", hrefLabel: "Find a tax agent" },
  ],
  received_inheritance: [
    { id: "estate_admin",       title: "Understand probate and estate administration timeline" },
    { id: "tax_check",          title: "Check CGT implications on inherited assets" },
    { id: "six_month_rule",     title: "Note the main-residence six-month exemption if inheriting property" },
    { id: "investment_plan",    title: "Decide on a lump-sum investment strategy", href: "/invest", hrefLabel: "Investment guide" },
    { id: "advisor",            title: "Get advice on deploying the inheritance", href: "/advisors/wealth-managers", hrefLabel: "Find a wealth manager" },
  ],
  setting_up_smsf: [
    { id: "eligibility",        title: "Confirm you meet the minimum balance threshold (~$200K recommended)" },
    { id: "trustee_structure",  title: "Choose individual trustee vs corporate trustee structure" },
    { id: "deed",               title: "Prepare trust deed and ABN/TFN registration" },
    { id: "investment_strategy",title: "Document investment strategy" },
    { id: "rollover",           title: "Roll over existing super balances" },
    { id: "accountant",         title: "Engage an SMSF accountant for annual audit + return", href: "/advisors/smsf-accountants", hrefLabel: "Find an SMSF accountant" },
  ],
  crypto_tax: [
    { id: "records",            title: "Export full transaction history from all exchanges and wallets" },
    { id: "classify_events",    title: "Classify taxable events: disposals, swaps, staking income, airdrops" },
    { id: "cgt_calcs",          title: "Calculate CGT using FIFO or other permitted method" },
    { id: "defi",               title: "Identify DeFi and liquidity pool events (often ordinary income)" },
    { id: "tax_agent",          title: "Engage a crypto-specialist tax agent", href: "/advisors/tax-agents", hrefLabel: "Find a tax agent" },
  ],
  selling_business: [
    { id: "valuation",          title: "Get an independent business valuation" },
    { id: "sbc_concessions",    title: "Assess eligibility for CGT small business concessions" },
    { id: "structure_review",   title: "Review sale structure (shares vs assets) with a tax advisor", href: "/advisors/tax-agents", hrefLabel: "Find a tax agent" },
    { id: "legal",              title: "Engage a commercial lawyer for the sale agreement" },
    { id: "post_sale_plan",     title: "Plan reinvestment of proceeds", href: "/advisors/financial-planners", hrefLabel: "Find a planner" },
  ],
  starting_business: [
    { id: "structure",          title: "Choose entity structure (sole trader, company, trust)", href: "/advisors/tax-agents", hrefLabel: "Get advice" },
    { id: "abn_acn",            title: "Register ABN (and ACN if using a company)" },
    { id: "gst",                title: "Register for GST if turnover will exceed $75K" },
    { id: "super_obligations",  title: "Understand super obligations for employees from day one" },
    { id: "insurance",          title: "Take out public liability and professional indemnity insurance" },
    { id: "accounting_system",  title: "Set up bookkeeping/accounting software" },
  ],
  approaching_retirement: [
    { id: "ttr",                title: "Explore transition to retirement (TTR) pension strategy", href: "/super", hrefLabel: "Super guide" },
    { id: "concessional",       title: "Maximise concessional super contributions before retirement" },
    { id: "centrelink",         title: "Model Age Pension entitlements using Centrelink estimator" },
    { id: "drawdown_plan",      title: "Plan account-based pension drawdown strategy" },
    { id: "update_will",        title: "Update estate planning and BDBN nominations", href: "/advisors/estate-planners", hrefLabel: "Find an estate planner" },
    { id: "advisor",            title: "Engage a retirement planning specialist", href: "/advisors/financial-planners", hrefLabel: "Find a planner" },
  ],
  estate_planning: [
    { id: "will",               title: "Create or update your will with a solicitor", href: "/advisors/estate-planners", hrefLabel: "Find an estate planner" },
    { id: "poa",                title: "Establish enduring power of attorney (financial + medical)" },
    { id: "super_bdbn",         title: "Update superannuation binding death benefit nomination" },
    { id: "insurance_owned",    title: "Review insurance policy ownership and beneficiaries" },
    { id: "testamentary_trust", title: "Consider testamentary trust for tax-effective distribution to minors" },
    { id: "review_annually",    title: "Schedule an annual review of all estate documents" },
  ],
};

export function getChecklist(lifeEventId: string): WizardStep[] {
  return STEPS[lifeEventId] ?? [];
}

export function getCompletedCount(
  lifeEventId: string,
  formData: { completed?: string[] },
): number {
  const steps = getChecklist(lifeEventId);
  const done = new Set(formData.completed ?? []);
  return steps.filter((s) => done.has(s.id)).length;
}
