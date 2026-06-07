import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl, buildTitle } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 3600;

// ─── Occupation data ──────────────────────────────────────────────────────────

interface OccupationConfig {
  label: string;
  metaDescription: string;
  intro: string;
  incomeType: "PAYG" | "Self-employed" | "PAYG + contractor income" | "Irregular income";
  superType: "Employer SG" | "Self-fund" | "Employer SG + salary sacrifice" | "Depends on employer";
  highlights: string[];
  hubLinks: { title: string; href: string; note: string }[];
  faqs: { q: string; a: string }[];
  advisorType: string;
  advisorHref: string;
}

const OCCUPATIONS: Record<string, OccupationConfig> = {
  doctor: {
    label: "Doctors & Medical Practitioners",
    metaDescription: `Investing guide for Australian doctors in ${CURRENT_YEAR} — practice structure, SMSF, income protection, and tax-minimisation strategies for GPs, specialists, and hospital-employed physicians.`,
    intro:
      "Doctors face a distinctive financial picture: high peak incomes, a long training period before earning starts, and varied employment structures (mixed PAYG hospital work plus private billings). Most GPs and specialists benefit from a private company or trust to hold practice income, SMSF for superannuation, and income protection insurance held outside super.",
    incomeType: "PAYG + contractor income",
    superType: "Employer SG + salary sacrifice",
    highlights: [
      "Practice company structures can split income and reduce effective tax rate from 47% to 25–30%.",
      "Private billings through a company aren't subject to 11.5% SG — most doctors self-fund super via salary sacrifice.",
      "SMSF is popular among specialists earning $300k+ because the 15% concessional tax rate and investment control justify the administration cost.",
    ],
    hubLinks: [
      { title: "SMSF", href: "/smsf", note: "Investment control and 15% tax rate inside super" },
      { title: "Income Protection", href: "/insurance/income-protection", note: "Up to 70% of income — own-occupation definition critical" },
      { title: "Negative Gearing", href: "/negative-gearing", note: "Property investment at high marginal rate" },
      { title: "Sell a Business", href: "/sell-business", note: "Practice valuation and exit planning" },
    ],
    faqs: [
      {
        q: "Should a doctor use a company structure for private billings?",
        a: "Most accountants recommend a medical service entity (company or trust) for private billings once income exceeds around $150,000. The company pays 25% tax on retained profits vs up to 47% at your marginal rate, creating a tax deferral advantage. Speak with an accountant experienced in medical practice structures.",
      },
      {
        q: "Is SMSF right for a doctor?",
        a: "SMSF suits many specialists earning $300,000+ because the flat 15% concessional rate (or 10% on long-term gains) beats the accumulation account of most retail super funds once you factor in control and estate planning benefits. The fixed administration cost ($3,000–$5,000/year) is proportionally small at high balances.",
      },
      {
        q: "What income protection cover does a doctor need?",
        a: "Doctors should hold income protection outside super with an 'own occupation' disability definition — this pays if you can no longer perform your specific medical role, not just any work. Cover to age 65 and a 90-day waiting period is a common structure. Premium is tax-deductible when held outside super.",
      },
    ],
    advisorType: "Financial adviser (medical specialist)",
    advisorHref: "/advisors/financial-advisers",
  },

  nurse: {
    label: "Nurses & Midwives",
    metaDescription: `Investing guide for nurses and midwives in Australia in ${CURRENT_YEAR} — salary packaging, super, property investing, and income protection.`,
    intro:
      "Registered nurses and midwives employed by public hospitals can salary package up to $9,010 per year tax-free, reducing their taxable income significantly. Combined with the SG super contribution and standard investment options, nurses have a strong toolkit — but relatively modest base salaries mean budgeting and tax efficiency matter a lot.",
    incomeType: "PAYG",
    superType: "Employer SG",
    highlights: [
      "Public hospital nurses can salary package $9,010/year ($15,900 for some NFPs) — equivalent to a 4–6% pay rise depending on marginal rate.",
      "Hospital-specific super funds (e.g. HESTA, REST) often have lower fees and healthcare-specific investment options.",
      "Income protection inside super is common but 'any occupation' definitions are more restrictive — review your policy.",
    ],
    hubLinks: [
      { title: "Super", href: "/super", note: "Hospital super funds and salary packaging" },
      { title: "Income Protection", href: "/insurance/income-protection", note: "Cover if illness or injury stops you working" },
      { title: "Property", href: "/property", note: "Building a property portfolio on a nursing salary" },
      { title: "First Home Buyer", href: "/first-home-buyer", note: "FHSS scheme and state grants" },
    ],
    faqs: [
      {
        q: "How does salary packaging work for nurses?",
        a: "Public hospital and NFP employees can receive part of their salary as non-cash benefits (e.g., mortgage repayments, rent, or everyday costs) up to a cap. Because these benefits aren't subject to income tax, they reduce your taxable income. A public hospital nurse can package up to $9,010 per year in general living expenses.",
      },
      {
        q: "Which super fund is best for nurses?",
        a: "HESTA is the industry super fund designed for health and community services workers. It consistently performs well on long-term returns and fees. REST is another option for the sector. Comparing performance over 5–10 years on the ATO's YourSuper comparison tool is a good starting point.",
      },
      {
        q: "Can a nurse with two jobs access more salary packaging?",
        a: "Each employer has a separate salary packaging arrangement. If both employers are public health entities, you may access packaging at both — but total fringe benefits should stay within your cap to avoid FBT. An accountant can confirm your specific situation.",
      },
    ],
    advisorType: "Financial adviser",
    advisorHref: "/advisors/financial-advisers",
  },

  dentist: {
    label: "Dentists & Dental Specialists",
    metaDescription: `Investment and tax guide for Australian dentists in ${CURRENT_YEAR} — practice structure, SMSF, income protection, and property investing.`,
    intro:
      "Dentists often have significant HECS-HELP debt, high practice setup costs, and rapid income growth in their 30s. The key financial decisions are whether to buy into or establish a practice (and in what entity), how to structure super (APRA fund vs SMSF), and which type of income protection to hold. Dental specialists (orthodontists, oral surgeons) typically have the highest incomes in the profession and the most to gain from tax-efficient structuring.",
    incomeType: "PAYG + contractor income",
    superType: "Self-fund",
    highlights: [
      "Most dentists incorporate a service entity at some point — practice income taxed at 25% company rate vs up to 47% personal rate.",
      "HECS-HELP repayments are mandatory above the threshold ($51,550 in 2025–26) and can be substantial in the early career years.",
      "Income protection is critical — a hand or wrist injury can end a clinical career; 'own occupation' definitions are non-negotiable.",
    ],
    hubLinks: [
      { title: "SMSF", href: "/smsf", note: "Control over practice real property in SMSF" },
      { title: "Income Protection", href: "/insurance/income-protection", note: "Own-occupation definition essential" },
      { title: "Negative Gearing", href: "/negative-gearing", note: "High marginal rate makes gearing advantageous" },
      { title: "Sell a Business", href: "/sell-business", note: "Practice sale and 15-year CGT concession" },
    ],
    faqs: [
      {
        q: "Can a dentist hold the practice premises in their SMSF?",
        a: "Yes — business real property (commercial premises used wholly and exclusively in a business) is an exempt asset category for SMSF related-party rules. A dentist's SMSF can buy the practice building and lease it back to the practice at market rent. This is a legitimate tax structure but requires careful administration and SMSF advice.",
      },
      {
        q: "What is the 15-year CGT exemption and how does it apply to dental practices?",
        a: "Under the small business CGT concessions, if you've owned an active business asset for 15 years and are over 55, you may be able to exclude the entire capital gain from tax. A dental practice sale can potentially be structured to access this exemption. You must meet the turnover test (under $2M) or the net assets test ($6M). Specialist tax advice is required.",
      },
      {
        q: "Should a dentist self-fund super or join an industry fund?",
        a: "Self-employed dentists without an employer aren't entitled to SG contributions, so they must make personal concessional contributions (up to $30,000/year) and claim them as a tax deduction. An industry fund works fine; an SMSF gives more investment control (including holding the practice property). The SMSF administration cost is justified once the balance exceeds around $300,000–$500,000.",
      },
    ],
    advisorType: "Financial adviser (medical/dental specialist)",
    advisorHref: "/advisors/financial-advisers",
  },

  pharmacist: {
    label: "Pharmacists",
    metaDescription: `Investing guide for pharmacists in Australia in ${CURRENT_YEAR} — employed vs owning a pharmacy, SMSF, income protection, and property investing.`,
    intro:
      "Pharmacists have a clear fork in their career: employed at a hospital or chain pharmacy (stable PAYG income, employer super) versus owning a community pharmacy (business owner's income, dispensing licence premiums, and potential sale value). The investing priorities differ sharply. Hospital pharmacists focus on super, property, and ETFs; community pharmacy owners focus on business valuation, SMSF, and succession planning.",
    incomeType: "PAYG",
    superType: "Employer SG",
    highlights: [
      "Pharmacy owner dispensing licences have significant value — factored into business valuation at exit.",
      "Employed pharmacists working for NFP hospitals may access fringe benefits salary packaging.",
      "SMSF is popular among pharmacy owners who want to hold commercial premises inside super.",
    ],
    hubLinks: [
      { title: "Super", href: "/super", note: "Maximising SG and concessional contributions" },
      { title: "SMSF", href: "/smsf", note: "Holding pharmacy premises inside super" },
      { title: "Income Protection", href: "/insurance/income-protection", note: "Cover if unable to practise" },
      { title: "Sell a Business", href: "/sell-business", note: "Pharmacy valuation multiples and exit" },
    ],
    faqs: [
      {
        q: "What is a pharmacy business worth?",
        a: "Community pharmacies are typically valued at a multiple of EBIT (earnings before interest and tax) — commonly 3–5x for a well-run suburban pharmacy. The value of the dispensing licence, location, and customer retention all affect the multiple. A pharmacy business broker can provide a current market assessment.",
      },
      {
        q: "Can an employed pharmacist salary sacrifice into super?",
        a: "Yes — most payroll systems support salary sacrifice into super. The combined total of employer SG (11.5% of salary) plus your salary sacrifice must not exceed $30,000 per year. Any excess is added to your taxable income plus an interest charge.",
      },
      {
        q: "Is income protection important for a pharmacist?",
        a: "Yes — particularly for pharmacy owners. An injury, illness, or mental health condition that prevents dispensing can halt business revenue immediately. Business expense insurance (covering fixed costs like rent and wages) is often taken alongside personal income protection.",
      },
    ],
    advisorType: "Financial adviser",
    advisorHref: "/advisors/financial-advisers",
  },

  vet: {
    label: "Veterinarians",
    metaDescription: `Investing guide for vets in Australia in ${CURRENT_YEAR} — managing student debt, income protection, and building wealth on a vet salary.`,
    intro:
      "Veterinarians often graduate with significant HECS-HELP debt and face salaries that, while professional, are lower than many other degree-level careers. The focus for most vets in the first decade is paying down debt, building super, and establishing an emergency fund. Experienced vets who move into practice ownership have a different financial picture — business valuation, SMSF, and succession planning become important.",
    incomeType: "PAYG",
    superType: "Employer SG",
    highlights: [
      "Average vet salary ($75K–$110K) means the 32.5% marginal rate applies — ETF salary sacrifice and negative gearing are effective.",
      "HECS-HELP repayments are mandatory — factor these into your budget from your first pay cheque.",
      "Burnout is a significant occupational risk — income protection with own-occupation definition protects your career investment.",
    ],
    hubLinks: [
      { title: "Super", href: "/super", note: "Building a solid super base early" },
      { title: "ETFs", href: "/etfs", note: "Low-cost diversified investing" },
      { title: "Income Protection", href: "/insurance/income-protection", note: "Cover through high-risk career phase" },
      { title: "First Home Buyer", href: "/first-home-buyer", note: "Grants and FHSS for first property" },
    ],
    faqs: [
      {
        q: "Should a vet pay off HECS-HELP or invest?",
        a: "HECS-HELP is indexed to CPI (not a fixed interest rate), which makes it relatively cheap debt in low-inflation periods and more expensive in high-inflation ones. In 2025–26, with CPI around 3%, and assuming diversified ETF returns of 8–10% long-term, the maths often favours investing rather than making voluntary HECS repayments. Your specific income level and marginal rate affect the answer.",
      },
      {
        q: "How much super does a vet typically have at retirement?",
        a: "A vet working full-time from age 25 with 11.5% SG contributions, never drawing down, and earning average super fund returns would typically accumulate $800,000–$1.2M by 67. Salary sacrifice significantly increases this. The ASFA Comfortable retirement standard requires around $690,000 for a single person.",
      },
      {
        q: "Is private practice ownership worth it for a vet?",
        a: "Practice ownership brings higher income potential, business sale upside, and professional autonomy — but also business risk, management responsibilities, and capital requirements. Many vets buy into a practice after 5–10 years of employment. A business adviser can model the cash flows compared to remaining employed.",
      },
    ],
    advisorType: "Financial adviser",
    advisorHref: "/advisors/financial-advisers",
  },

  lawyer: {
    label: "Lawyers & Solicitors",
    metaDescription: `Investing guide for lawyers in Australia in ${CURRENT_YEAR} — salary sacrifice, SMSF, property investing, and planning for law firm partnership.`,
    intro:
      "Lawyers progress from employed solicitor to senior associate to partner — and each stage has different financial priorities. Junior lawyers focus on super, paying down student debt, and buying a first property. Senior lawyers and partners focus on maximising concessional super contributions, using practice profit distributions efficiently, and building a diversified investment portfolio beyond the law firm.",
    incomeType: "PAYG",
    superType: "Employer SG + salary sacrifice",
    highlights: [
      "The 37% and 45% marginal brackets apply at relatively modest incomes — salary sacrifice into super is highly effective.",
      "Law firm partners often receive profit distributions rather than salary — these don't attract SG, requiring self-funded super.",
      "Succession / buy-in arrangements mean partners have capital tied up in the firm — diversification is critical.",
    ],
    hubLinks: [
      { title: "Super", href: "/super", note: "Maximising $30K concessional cap" },
      { title: "SMSF", href: "/smsf", note: "Investment control for high-income partners" },
      { title: "Negative Gearing", href: "/negative-gearing", note: "Property at high marginal rate" },
      { title: "ETFs", href: "/etfs", note: "Diversifying beyond law firm equity" },
    ],
    faqs: [
      {
        q: "How should a junior lawyer approach salary sacrifice?",
        a: "At $120,000–$160,000, your marginal rate is 37–39%. Salary sacrificing into super saves you 22–24 percentage points of tax on those contributions (taxed at 15% inside super vs 37–39% outside). Maximising your $30,000 concessional cap (minus the employer SG portion) is one of the highest-returning risk-free investments available.",
      },
      {
        q: "What happens to super when a lawyer makes partner?",
        a: "Law firm partners often take profit distributions rather than a salary, meaning no employer SG obligation. Partners must make their own concessional contributions (up to $30,000/year) and claim the tax deduction. SMSF is popular among partners because of the investment flexibility and estate planning advantages.",
      },
      {
        q: "Should a lawyer invest in property or shares?",
        a: "Both can be appropriate — property suits lawyers who want leverage and tangible assets; ETFs suit those who want diversification without management hassle. The most common answer is both: buy one or two investment properties in the early career years, then increase ETF allocation as the property portfolio matures and mortgage debt reduces.",
      },
    ],
    advisorType: "Financial adviser",
    advisorHref: "/advisors/financial-advisers",
  },

  accountant: {
    label: "Accountants & CPAs",
    metaDescription: `Investing guide for accountants in Australia in ${CURRENT_YEAR} — SMSF, tax strategies, property, and building wealth.`,
    intro:
      "Accountants often know the theory well — but applying it to their own finances is different. The financial priorities for accountants are similar to other professionals: maximise super contributions, use investment structures tax-efficiently, and build a diversified portfolio. Accountants in public practice who run their own firm have additional considerations: practice structure, succession planning, and business sale.",
    incomeType: "PAYG",
    superType: "Employer SG + salary sacrifice",
    highlights: [
      "Accountants who manage their own SMSF can DIY the compliance work — reducing the annual admin cost significantly.",
      "Trust structures for investment income are commonly used by accountants with family members at lower marginal rates.",
      "CPA/CA designation allows 'sophisticated investor' self-certification for unlisted wholesale investment products.",
    ],
    hubLinks: [
      { title: "SMSF", href: "/smsf", note: "Self-managed super with lower admin cost" },
      { title: "Negative Gearing", href: "/negative-gearing", note: "Property at high marginal rate" },
      { title: "ETFs", href: "/etfs", note: "Low-cost diversified core portfolio" },
      { title: "Wholesale Investor", href: "/wholesale", note: "Unlisted investment access at $250K net assets" },
    ],
    faqs: [
      {
        q: "Can an accountant manage their own SMSF?",
        a: "An accountant can prepare their own SMSF financial statements and tax return as the trustee — but they cannot act as the registered tax agent for the fund's lodgement (a licensed tax agent is required). In practice, many accountants use a low-cost SMSF admin platform and only engage a registered agent for lodgement, significantly reducing annual costs.",
      },
      {
        q: "What is the best investment structure for an accountant in private practice?",
        a: "Accountants in private practice commonly use a discretionary (family) trust to hold investment assets. Trust distributions can be directed to the lowest-marginal-rate family member each year, reducing the overall tax burden. Trusts don't get the 50% CGT discount directly (individuals do as beneficiaries), so asset ownership needs careful structuring.",
      },
      {
        q: "How does the 'sophisticated investor' designation help an accountant?",
        a: "Under the Corporations Act, an accountant who holds a current CPAA or ICA designation and holds a practising certificate can self-certify as a sophisticated investor. This unlocks access to offers under the s708 exemption — including unlisted property trusts, private credit funds, and venture capital — that are not available to retail investors.",
      },
    ],
    advisorType: "Financial adviser",
    advisorHref: "/advisors/financial-advisers",
  },

  engineer: {
    label: "Engineers",
    metaDescription: `Investing guide for engineers in Australia in ${CURRENT_YEAR} — salary sacrifice, ETF investing, property, and building long-term wealth.`,
    intro:
      "Engineers typically have strong base salaries, good job security, and steady income growth. Most are PAYG employees with employer super — the main financial levers are salary sacrifice into super, building an investment portfolio (ETFs and/or property), and using the home as a wealth-building asset. Mining and resources engineers often earn significantly more and face additional considerations around fly-in/fly-out (FIFO) income, remote area tax offsets, and lump-sum investing.",
    incomeType: "PAYG",
    superType: "Employer SG + salary sacrifice",
    highlights: [
      "Engineers in resources and mining often earn $150K–$250K+ — pushing into the 37–45% marginal bracket where salary sacrifice has maximum impact.",
      "Employer super for government or infrastructure engineers may be defined-benefit — check before rolling over to a retail fund.",
      "FIFO engineers can claim remote area allowance deductions and may be eligible for zone tax offsets.",
    ],
    hubLinks: [
      { title: "Super", href: "/super", note: "Salary sacrifice and concessional cap" },
      { title: "ETFs", href: "/etfs", note: "Low-cost diversified investing" },
      { title: "Property", href: "/property", note: "Investment property as wealth builder" },
      { title: "Lump Sum Investing", href: "/lump-sum-investing", note: "Deploying bonuses and windfalls" },
    ],
    faqs: [
      {
        q: "What is the best way for an engineer to invest a bonus?",
        a: "The answer depends on your financial position. If you have high-rate debt (e.g., a home loan above 6%), paying it down first has a guaranteed return equal to your interest rate. If debt is manageable, lump-sum investing into a diversified ETF (e.g., VAS + VGS) has historically outperformed dollar-cost averaging in two-thirds of scenarios. See our lump-sum vs DCA guide for the evidence.",
      },
      {
        q: "Should a mining engineer invest in resources stocks?",
        a: "There's a concentration risk argument against it — if you already have your income, job security, and potentially SMSF property all linked to the resources sector, adding significant resources equities compounds your exposure. A diversified equity portfolio across sectors and geographies is generally more prudent.",
      },
      {
        q: "Can an engineer contribute extra to super if they have unused cap space?",
        a: "Yes — the carry-forward concessional contributions rule allows you to use unused cap space from the previous 5 years if your super balance is under $500,000. This is valuable for engineers who had lower incomes during study or postgraduate training and didn't maximise contributions in earlier years.",
      },
    ],
    advisorType: "Financial adviser",
    advisorHref: "/advisors/financial-advisers",
  },

  architect: {
    label: "Architects",
    metaDescription: `Investing guide for architects in Australia in ${CURRENT_YEAR} — property, SMSF, income protection, and planning for design practice ownership.`,
    intro:
      "Architects have deep professional expertise in property — but applying that knowledge to personal investment requires a different lens. Architects often earn less than comparably qualified professionals in other fields, making tax efficiency and consistent super contributions especially important. Those who establish their own design practice face the typical small business financial challenges plus the cyclical nature of the construction industry.",
    incomeType: "PAYG",
    superType: "Employer SG",
    highlights: [
      "Architecture firm salaries average $75K–$130K — most architects are in the 32.5–37% marginal bracket.",
      "Property knowledge gives architects an edge in due diligence — but proximity bias (favouring design over yield) is a known risk.",
      "Professional indemnity insurance is mandatory for registered architects — this is separate from personal income protection.",
    ],
    hubLinks: [
      { title: "Property", href: "/property", note: "Leverage professional knowledge in property investing" },
      { title: "Super", href: "/super", note: "Consistent contributions matter in lower-income years" },
      { title: "ETFs", href: "/etfs", note: "Diversified investing outside property" },
      { title: "Income Protection", href: "/insurance/income-protection", note: "Cover if unable to practise" },
    ],
    faqs: [
      {
        q: "Does an architect's property expertise help them invest in property?",
        a: "Yes — architects understand construction quality, defects, and design risk better than most investors. However, expertise in design can lead to over-weighting aesthetic appeal over financial metrics like yield, vacancy, and growth drivers. The discipline of applying objective financial criteria (gross yield >4%, vacancy <5%, positive rental outlook) alongside design assessment produces better investment outcomes.",
      },
      {
        q: "How should a small architecture practice structure its finances?",
        a: "Sole practitioners and small firms commonly use a company structure for practice income. This allows retained profits to be taxed at 25% rather than up to 47% personally, funding future investment from the tax saving. Separate personal and trust entities hold investment assets. A business accountant with professional services experience is essential.",
      },
      {
        q: "Is income protection important for an architect?",
        a: "Yes — an architect who cannot work due to injury or illness loses all professional income. Unlike some professionals, architects don't typically have valuable business assets that continue to generate income without them. Income protection replacing 70% of income until age 65 is the standard recommendation.",
      },
    ],
    advisorType: "Financial adviser",
    advisorHref: "/advisors/financial-advisers",
  },

  "financial-planner": {
    label: "Financial Planners",
    metaDescription: `Investing guide for financial planners in Australia in ${CURRENT_YEAR} — building your own wealth while advising others.`,
    intro:
      "Financial planners often find it easier to give advice than to take it — the cobbler's children syndrome is real. The typical financial planner has strong industry knowledge but may defer personal financial planning indefinitely. The structural advantage is deep familiarity with tax, super, and investment concepts; the risk is over-confidence and under-diversification (e.g., allocating too heavily to unlisted managed funds accessed through dealer groups).",
    incomeType: "PAYG",
    superType: "Employer SG + salary sacrifice",
    highlights: [
      "Financial planners understand carry-forward super contributions, franking credits, and CGT concessions — leveraging these actively compounds returns.",
      "Access to wholesale investment products (unlisted property, private credit) at $250K net assets is available through professional designation.",
      "Dealer group-affiliated planners should check for conflicts in their own super and investment product choices.",
    ],
    hubLinks: [
      { title: "SMSF", href: "/smsf", note: "Administering your own SMSF" },
      { title: "Wholesale Investor", href: "/wholesale", note: "Unlisted product access through professional status" },
      { title: "ETFs", href: "/etfs", note: "Core low-cost portfolio building" },
      { title: "Dividends", href: "/dividends", note: "Franking credits in personal portfolio" },
    ],
    faqs: [
      {
        q: "Can a financial planner self-certify as a wholesale investor?",
        a: "A qualified financial adviser holding an AFS licence or authorisation can self-certify as a sophisticated investor under the Corporations Act, bypassing the $2.5M net assets / $250K income tests. This unlocks wholesale product offers. The qualification must be current.",
      },
      {
        q: "Should a financial planner use an SMSF?",
        a: "Many do — the investment control, estate planning flexibility, and tax planning opportunities are genuine advantages. The key consideration is whether your balance justifies the fixed administration cost (typically $3,000–$5,000/year). Most advisers suggest SMSF becomes cost-effective at $250,000–$500,000, depending on what you plan to hold.",
      },
      {
        q: "What are the most common personal financial mistakes financial planners make?",
        a: "Delaying action ('I'll do it next year'), over-concentrating in managed funds from their own dealer group, under-insuring (because they see the cost objectively but feel invincible personally), and neglecting estate planning. The accountability structure they provide to clients — regular reviews, written goals — is often absent from their own planning.",
      },
    ],
    advisorType: "Independent financial adviser",
    advisorHref: "/advisors/financial-advisers",
  },

  "it-professional": {
    label: "IT & Tech Professionals",
    metaDescription: `Investing guide for IT professionals and software engineers in Australia in ${CURRENT_YEAR} — equity compensation, salary sacrifice, ETF investing, and tax.`,
    intro:
      "Tech professionals in Australia face unique financial complexity: employee share schemes (ESS), rapid income growth, the possibility of contracting or founding a startup, and occasional equity windfalls. The tax treatment of ESS shares and options is a specialist area; getting it wrong is costly. Beyond equity, tech professionals benefit from maximising salary sacrifice into super and building a diversified ETF portfolio.",
    incomeType: "PAYG",
    superType: "Employer SG + salary sacrifice",
    highlights: [
      "ESS options and shares have deferred and upfront tax variants — getting the tax deferral election right at vesting is critical.",
      "Tech professionals who contractor through a Pty Ltd company may lose access to employer SG — self-funded super is essential.",
      "Concentration risk in tech sector equities (including employer stock) is a key portfolio risk to manage.",
    ],
    hubLinks: [
      { title: "Super", href: "/super", note: "Maximising contributions in high-earning years" },
      { title: "ETFs", href: "/etfs", note: "Diversifying beyond tech sector equities" },
      { title: "Wholesale Investor", href: "/wholesale", note: "Startup and private credit access at $2.5M net assets" },
      { title: "Crypto", href: "/crypto", note: "ATO crypto tax rules for tech workers" },
    ],
    faqs: [
      {
        q: "How are employee share scheme (ESS) shares taxed in Australia?",
        a: "The ATO taxes ESS benefits either at grant (upfront taxing point) or at a deferred taxing point (typically vesting, sale, or cessation of employment). For options, the discount element is assessed as income at the taxing point. If you receive RSUs from a US tech company, they're typically taxed as income when they vest. Keep detailed records — the cost base for CGT purposes is the market value at the taxing point.",
      },
      {
        q: "Should a software developer contract or stay employed?",
        a: "Contracting typically earns 20–40% more than equivalent employment but loses access to employer super, paid leave, and job security. Many contractors establish a Pty Ltd company to receive income, taxed at 25%, allowing investment of retained profits. The Alienation of Personal Services Income (PSI) rules can restrict this for contractors who derive income primarily from their own skills — an accountant can assess your situation.",
      },
      {
        q: "How should an IT professional handle a large equity windfall?",
        a: "Large windfalls from IPOs, acquisitions, or vesting events are taxable events — seek tax advice before liquidating positions. After tax, the lump-sum investing question applies: evidence favours deploying the capital immediately into a diversified portfolio rather than gradually (dollar-cost averaging) in most market conditions. See our lump-sum vs DCA guide for the historical analysis.",
      },
    ],
    advisorType: "Financial adviser (tech/equity specialist)",
    advisorHref: "/advisors/financial-advisers",
  },

  "public-servant": {
    label: "Public Servants",
    metaDescription: `Investing guide for Australian public servants in ${CURRENT_YEAR} — CSS/PSS/PSSap super, property investing, and salary sacrifice.`,
    intro:
      "Federal public servants have access to some of Australia's best superannuation arrangements — the CSS (closed 1990), PSS (closed 2005), and PSSap. State public servants have their own defined benefit or accumulation schemes. Understanding which scheme you're in, whether it makes sense to stay or rollover, and how to supplement with additional contributions is the foundation of financial planning for the public sector.",
    incomeType: "PAYG",
    superType: "Employer SG",
    highlights: [
      "CSS and PSS members have defined benefit entitlements — rolling over to retail super requires careful advice; you may be giving up very valuable benefits.",
      "PSSap (the modern default) is a standard accumulation fund with employer contributions of 15.4% — significantly above the 11.5% SG minimum.",
      "State public servants should check their employer's scheme before assuming retail super is comparable.",
    ],
    hubLinks: [
      { title: "Super", href: "/super", note: "Understanding CSS/PSS/PSSap and state schemes" },
      { title: "Property", href: "/property", note: "Property investing alongside a stable public sector salary" },
      { title: "ETFs", href: "/etfs", note: "Low-cost investing in super and outside" },
      { title: "First Home Buyer", href: "/first-home-buyer", note: "FHSS scheme and first home grants" },
    ],
    faqs: [
      {
        q: "Should a public servant stay in CSS or PSS?",
        a: "Generally yes — the CSS and PSS provide guaranteed defined benefits that most retail super funds can't match. The government underwrites the return, which is calculated from salary and years of service. Before considering a rollover, have an independent financial adviser model the comparative value. For most long-serving members, the defined benefit is worth more than the accumulated balance implies.",
      },
      {
        q: "What is the PSSap employer contribution rate?",
        a: "PSSap (Public Sector Superannuation accumulation plan) provides employer contributions of 15.4% of salary — well above the 11.5% SG minimum. This is a significant advantage that compounds substantially over a public sector career. Members can also make voluntary contributions.",
      },
      {
        q: "Can public servants access the FHSS scheme?",
        a: "Yes — public servants can make voluntary contributions to their super fund and apply to withdraw them under the First Home Super Saver (FHSS) scheme. For PSSap members, voluntary contributions must be made as Member Additional (MA) contributions. The maximum FHSS withdrawal is $50,000 per person.",
      },
    ],
    advisorType: "Financial adviser",
    advisorHref: "/advisors/financial-advisers",
  },

  teacher: {
    label: "Teachers",
    metaDescription: `Investing guide for teachers in Australia in ${CURRENT_YEAR} — super, salary packaging, property, and building wealth on a teaching salary.`,
    intro:
      "Teachers working in government schools are public employees with good super arrangements and job security. Private school teachers may have employer super at standard SG rates plus salary packaging options. The core financial strategy for most teachers is maximising the value of their super through salary sacrifice, building property wealth, and managing the impact of career breaks (common among female teachers) on super.",
    incomeType: "PAYG",
    superType: "Employer SG",
    highlights: [
      "Government school teachers in most states have defined benefit or enhanced accumulation super schemes — don't roll over without advice.",
      "Private school teachers can often salary package non-cash benefits through their school's NFP status.",
      "Career breaks for parenting can create significant super gaps — co-contribution and spouse contribution strategies help.",
    ],
    hubLinks: [
      { title: "Super", href: "/super", note: "Government scheme vs retail super comparison" },
      { title: "Property", href: "/property", note: "Long-term property wealth on a stable salary" },
      { title: "Income Protection", href: "/insurance/income-protection", note: "Cover through career and parenting breaks" },
      { title: "First Home Buyer", href: "/first-home-buyer", note: "FHSS scheme for first property" },
    ],
    faqs: [
      {
        q: "Which super fund is best for a private school teacher?",
        a: "Depending on the school, you may have access to a sector-specific fund (e.g., NGS Super, which is designed for education sector employees) or a retail/industry fund. NGS consistently performs well on long-term returns and charges low fees for the sector. Use the ATO's YourSuper comparison tool to compare performance over 5–10 years net of fees.",
      },
      {
        q: "What should a teacher do about super during maternity leave?",
        a: "Government employer SG contributions typically pause during unpaid parental leave. To maintain contributions: (1) check whether your employer makes contributions during paid parental leave, (2) consider making personal after-tax contributions if you have savings, or (3) look at spouse contributions where the working partner contributes to the lower-income earner's super (up to $3,000 for a 18% tax offset).",
      },
      {
        q: "Can a teacher salary sacrifice outside of super?",
        a: "Government school teachers generally cannot salary sacrifice general expenses. Private school teachers at registered charities or NFPs may have access to salary packaging up to $15,900 per year tax-free. Check with your school's human resources or payroll department.",
      },
    ],
    advisorType: "Financial adviser",
    advisorHref: "/advisors/financial-advisers",
  },

  "police-officer": {
    label: "Police Officers",
    metaDescription: `Investing guide for police officers in Australia in ${CURRENT_YEAR} — police super schemes, shiftwork pay, property investing, and income protection.`,
    intro:
      "Police officers receive above-average pay (including penalty rates, shift allowances, and overtime), often participate in defined benefit or enhanced super schemes through state police funds, and retire earlier than most workers (many at 55–60 with full entitlements). Managing the financial transition from active service into retirement requires specific planning — police super drawdown strategies differ from standard accumulation super.",
    incomeType: "PAYG",
    superType: "Employer SG",
    highlights: [
      "State police super schemes (PoliceBank super, WA Police Superannuation, QPS super) often provide above-SG employer contributions.",
      "Penalty rates and shift allowances can significantly boost take-home pay — and super contributions in some schemes.",
      "Officers who retire in their 50s have potentially 30+ years of retirement to fund — drawdown sequencing matters.",
    ],
    hubLinks: [
      { title: "Super", href: "/super", note: "Police super schemes and retirement planning" },
      { title: "Property", href: "/property", note: "Building a property portfolio alongside a police career" },
      { title: "Income Protection", href: "/insurance/income-protection", note: "Duty-specific injury cover considerations" },
      { title: "ETFs", href: "/etfs", note: "Diversified investing for long retirement funding" },
    ],
    faqs: [
      {
        q: "Should a police officer stay in the police super scheme?",
        a: "Most financial advisers say yes for long-serving officers — state police schemes commonly provide defined benefits calculated on final average salary with above-standard employer contributions. The benefit of leaving the scheme for a retail fund is rarely worth the guaranteed defined benefit foregone. Independent advice is essential before any rollover decision.",
      },
      {
        q: "How do police officers plan for early retirement?",
        a: "Officers retiring at 55–60 face preservation rules — super cannot be accessed until the preservation age (60 for most workers). Some state police schemes have specific pension arrangements that allow earlier access. Outside super, investment property and ETF portfolios are the most common gap-funding strategies for the years between service retirement and super access.",
      },
      {
        q: "Is income protection relevant for police officers?",
        a: "Police workers' compensation provides on-duty injury cover, but the definition may be narrower than a personal income protection policy. Officers should check whether their scheme covers psychological injury, on-duty vehicle accidents, and disease claims. Supplementary personal income protection for off-duty coverage is common.",
      },
    ],
    advisorType: "Financial adviser",
    advisorHref: "/advisors/financial-advisers",
  },

  military: {
    label: "ADF Members",
    metaDescription: `Investing guide for Australian Defence Force members in ${CURRENT_YEAR} — MilitarySuper, MSBS, Defence Housing, and transition to civilian life.`,
    intro:
      "ADF members have access to specialised financial structures: the Military Superannuation Benefits Scheme (MSBS) or the newer ADF Super, free or subsidised Defence Housing Australia (DHA) properties in many locations, and generous leave and allowances. Transition to civilian life is a significant financial event that requires specific planning — super preservation, severance benefits, and career transition are all in play simultaneously.",
    incomeType: "PAYG",
    superType: "Employer SG",
    highlights: [
      "MSBS (closed 1991) has very valuable defined benefit components — don't roll over without specialist advice.",
      "ADF Super (the modern scheme) provides 16.4% employer contributions — significantly above the 11.5% civilian SG rate.",
      "DHA housing is a major benefit; moving allowances, relocation expenses, and rent assistance reduce living costs significantly.",
    ],
    hubLinks: [
      { title: "Super", href: "/super", note: "MSBS vs ADF Super comparison and transition planning" },
      { title: "Property", href: "/property", note: "Investing in property while managing relocations" },
      { title: "Lump Sum Investing", href: "/lump-sum-investing", note: "Deploying transition benefits on leaving ADF" },
      { title: "First Home Buyer", href: "/first-home-buyer", note: "FHSS and veteran home loan schemes" },
    ],
    faqs: [
      {
        q: "What happens to ADF super when you leave the military?",
        a: "When you leave, your ADF Super balance is preserved until you reach preservation age. MSBS benefit components may be paid as a pension or lump sum depending on your service length. The transition period is a critical time for financial advice — managing lump-sum transition benefits, career transition, and long-term wealth building all intersect.",
      },
      {
        q: "Can an ADF member buy a house through the Defence Housing scheme?",
        a: "DHA (Defence Housing Australia) provides rental housing to ADF members near bases. DHA also runs an investment property scheme where civilians (and ADF members) can buy DHA properties leased back to Defence. DHA properties are not guaranteed to outperform other property investments and typically carry lower-than-market yields in exchange for guaranteed rent.",
      },
      {
        q: "What financial planning should ADF members do before transitioning?",
        a: "Begin 12–24 months before discharge: (1) get specialist advice on MSBS/ADF Super options; (2) understand your termination benefit (resettlement grant, severance, etc.); (3) plan career transition and income bridge; (4) decide where you'll live (many ADF members are unfamiliar with civilian housing costs); (5) review insurance — many ADF-provided covers cease on discharge.",
      },
    ],
    advisorType: "Financial adviser (ADF/Defence specialist)",
    advisorHref: "/advisors/financial-advisers",
  },

  "small-business-owner": {
    label: "Small Business Owners",
    metaDescription: `Investing guide for small business owners in Australia in ${CURRENT_YEAR} — super, business structure, income protection, and exit planning.`,
    intro:
      "Small business owners are often so focused on the business that personal investing gets deferred indefinitely. The business is typically the largest 'asset' but it's illiquid, undiversified, and dependent on the owner working in it. The critical financial tasks for a small business owner are: setting up a super structure (employer SG to yourself, plus salary sacrifice), building assets outside the business, and planning for eventual sale or succession.",
    incomeType: "Self-employed",
    superType: "Self-fund",
    highlights: [
      "You don't receive employer SG from a 3rd party — if your business doesn't pay you SG, you have no super unless you take action.",
      "Small business CGT concessions (15-year exemption, $500K retirement exemption, 50% active asset reduction) can dramatically reduce tax on business sale.",
      "Business concentration risk: owning an undiversified, illiquid business is high-risk — building assets outside the business is critical for financial resilience.",
    ],
    hubLinks: [
      { title: "Super", href: "/super", note: "Self-funded super and SG obligations" },
      { title: "SMSF", href: "/smsf", note: "Holding business real property in SMSF" },
      { title: "Sell a Business", href: "/sell-business", note: "Valuation, CGT concessions, and exit planning" },
      { title: "Income Protection", href: "/insurance/income-protection", note: "Business expense + personal income cover" },
    ],
    faqs: [
      {
        q: "Does a small business owner have to pay themselves superannuation?",
        a: "It depends on your structure. If you're a sole trader or in a partnership and not an 'employee' of your business, you're not legally required to receive SG — but you should still contribute to super. If your business operates through a company and pays you a salary, the company must pay you SG at 11.5%. Speak with your accountant to confirm your SG obligations.",
      },
      {
        q: "What are the small business CGT concessions?",
        a: "The ATO's small business CGT concessions reduce or eliminate capital gains on active business assets. There are four: 15-year exemption (eliminate CGT if owned 15+ years and selling for retirement); 50% active asset reduction; retirement exemption (up to $500,000 tax-free per individual); and rollover relief. Meeting the basic conditions (turnover under $2M or net assets under $6M) is essential. Tax advice is critical before any sale.",
      },
      {
        q: "How much should a small business owner have outside their business?",
        a: "As a rule of thumb, your non-business assets should equal at least 50% of your total net worth by the time you're 50. If your entire net worth is locked in the business, you're exposed to business failure, health issues, or market changes that could leave you with nothing at retirement. A financial planner can help you build a diversification plan that works with your business cash flow.",
      },
    ],
    advisorType: "Financial adviser (business owner specialist)",
    advisorHref: "/advisors/financial-advisers",
  },

  "startup-founder": {
    label: "Startup Founders",
    metaDescription: `Investing guide for startup founders in Australia in ${CURRENT_YEAR} — ESS, SMSF, founder equity tax, and personal wealth building.`,
    intro:
      "Startup founders face the ultimate investing paradox: all of their energy and most of their personal capital goes into a single, high-risk, illiquid bet. The financial challenge is to build enough personal wealth outside the startup to survive a failure (which is statistically the most likely outcome) while not diverting resources from the business at the critical phase. ESIC tax offsets, R&D incentives, and founder equity structuring are specialist areas.",
    incomeType: "Irregular income",
    superType: "Self-fund",
    highlights: [
      "ESIC (Early Stage Innovation Company) qualifying investment gets a 20% tax offset plus 10-year CGT exemption — structure equity to qualify.",
      "Founders who pay themselves below-market salary need a personal financial safety net — super contributions and investment outside the business.",
      "Exit via acquisition or IPO triggers complex CGT, ESS tax, and structuring decisions — plan this well in advance.",
    ],
    hubLinks: [
      { title: "Wholesale Investor", href: "/wholesale", note: "Accessing venture capital as a sophisticated investor" },
      { title: "Sell a Business", href: "/sell-business", note: "M&A, acquisition structuring, and exit planning" },
      { title: "Lump Sum Investing", href: "/lump-sum-investing", note: "Deploying a liquidity event windfall" },
      { title: "Super", href: "/super", note: "Self-funded super when paying founder salary" },
    ],
    faqs: [
      {
        q: "How should a startup founder structure their equity?",
        a: "Founder shares should typically be held personally (not through a company or trust) to access the 50% CGT discount on eventual sale. The structure matters hugely at exit — a sale of shares is different to an asset sale. Founders should get a tax lawyer to review their cap table structure well before any M&A process begins.",
      },
      {
        q: "What is ESIC and how does it work for founders?",
        a: "The ESIC (Early Stage Innovation Company) framework gives investors who put money into a qualifying ESIC a 20% tax offset on their investment (capped at $200,000 per year) plus a CGT exemption on shares held for 1–10 years. Founders whose company qualifies can use this to attract angels and early investors. ATO self-assessment is required — the company must meet the 100-point innovation test or principles-based test.",
      },
      {
        q: "Should a startup founder contribute to super?",
        a: "Even on a low founder salary, making some regular super contribution protects you if the startup fails. At minimum, pay yourself enough salary to receive the government super co-contribution ($500 for $1,000 after-tax personal contribution at income under $43,445). If the startup is well-funded and your salary is reasonable, salary sacrifice to maximise the $30,000 concessional cap — the 15% super tax rate vs up to 47% marginal rate is too good to ignore.",
      },
    ],
    advisorType: "Financial adviser (startups and equity specialist)",
    advisorHref: "/advisors/financial-advisers",
  },

  executive: {
    label: "Executives & Senior Leaders",
    metaDescription: `Investing guide for executives and C-suite leaders in Australia in ${CURRENT_YEAR} — LTIPs, Division 293, SMSF, and diversifying beyond employer equity.`,
    intro:
      "Senior executives face a unique combination of high income (triggering Division 293 super tax), significant employer equity compensation (LTIPs, performance rights, options), and directorial responsibilities that create legal constraints on trading. Managing the concentration of wealth in employer equity, maximising after-tax super contributions, and building a genuinely diversified portfolio outside work are the key financial priorities.",
    incomeType: "PAYG",
    superType: "Employer SG + salary sacrifice",
    highlights: [
      "Division 293 means concessional super contributions are taxed at 30% (not 15%) if total income exceeds $250,000 — salary sacrifice is still worthwhile but the saving per dollar is smaller.",
      "LTIPs and performance rights vest over 3–5 years — each vesting event is a taxable income event requiring tax planning.",
      "Blackout periods and trading windows restrict when executives can sell shares — this creates forced concentration risk.",
    ],
    hubLinks: [
      { title: "SMSF", href: "/smsf", note: "Investment control and estate planning for HNW executives" },
      { title: "Wholesale Investor", href: "/wholesale", note: "Unlisted and private market access" },
      { title: "ETFs", href: "/etfs", note: "Diversifying beyond employer equity concentration" },
      { title: "Lump Sum Investing", href: "/lump-sum-investing", note: "Deploying LTIP proceeds at each vesting event" },
    ],
    faqs: [
      {
        q: "How are LTIPs and performance rights taxed in Australia?",
        a: "Performance rights and restricted share units are typically taxed as employment income at the point they vest — i.e., the market value at vesting is included in your assessable income. For options, the taxable benefit is the difference between the exercise price and market value at exercise. Record keeping from grant through vesting through eventual sale is critical for CGT purposes.",
      },
      {
        q: "Does Division 293 make salary sacrifice into super worthwhile for executives?",
        a: "Yes — even with Division 293, concessional contributions are taxed at 30% inside super vs up to 47% (including Medicare) at your marginal rate. That's still a 17-percentage-point saving per dollar. Maximising the $30,000 concessional cap (minus employer SG) remains one of the most tax-efficient strategies available.",
      },
      {
        q: "How should an executive diversify away from employer equity?",
        a: "A systematic plan to sell vested shares (subject to blackout periods and trading windows) and reinvest into diversified assets is the standard approach. Each sale triggers a CGT event — planning around the timing (e.g., selling in a year of lower other income) and using the 50% CGT discount for shares held over 12 months reduces the tax cost. An adviser can build a multi-year diversification roadmap.",
      },
    ],
    advisorType: "Financial adviser (HNW / executive specialist)",
    advisorHref: "/advisors/financial-advisers",
  },

  "real-estate-agent": {
    label: "Real Estate Agents",
    metaDescription: `Investing guide for real estate agents in Australia in ${CURRENT_YEAR} — commission income, investment property, and tax planning.`,
    intro:
      "Real estate agents earn commission-based income that can be highly variable — great years followed by difficult ones as markets cycle. The financial imperatives are: managing cash flow through lean periods, building super consistently despite irregular income, and applying professional property knowledge to personal property investment. Agents often have an edge in buying well but need discipline to maintain diversification.",
    incomeType: "Irregular income",
    superType: "Depends on employer",
    highlights: [
      "Commission income fluctuates significantly — a cash buffer of 6 months expenses is the foundation of financial stability.",
      "Agents employed by a real estate business receive SG; those operating as sole traders or contractors may need to self-fund super.",
      "Professional access to off-market properties and market data is a genuine investment edge if applied objectively.",
    ],
    hubLinks: [
      { title: "Property", href: "/property", note: "Applying professional knowledge to personal investing" },
      { title: "Super", href: "/super", note: "Consistent super contributions despite irregular income" },
      { title: "Negative Gearing", href: "/negative-gearing", note: "Tax-efficient property in boom years" },
      { title: "Income Protection", href: "/insurance/income-protection", note: "Cover through market downturns" },
    ],
    faqs: [
      {
        q: "How should a real estate agent manage irregular commission income?",
        a: "The most robust approach is to pay yourself a regular 'salary' from a business account that buffers commission receipts. In strong months, the buffer builds; in weak months, you draw from it. Set a fixed direct debit for super contributions on this 'salary' so super is funded consistently regardless of commission flow.",
      },
      {
        q: "Do real estate agents pay super?",
        a: "It depends on their employment structure. Licensed employees of a principal licensee are entitled to SG at 11.5%. Independent contractors operating under their own ABN are not entitled to SG from the principal — they must self-fund super. Many contractors make personal concessional contributions and claim them as a tax deduction.",
      },
      {
        q: "Is a real estate agent's property knowledge an investing advantage?",
        a: "Yes — agents often have better data on comparable sales, rental yields, and market conditions than typical buyers. The risk is overconfidence and proximity bias (gravitating toward the style of property you sell, which may not produce the best investment returns). Applying objective financial criteria (yield, vacancy rates, growth fundamentals) alongside market knowledge produces the best outcomes.",
      },
    ],
    advisorType: "Financial adviser",
    advisorHref: "/advisors/financial-advisers",
  },

  tradesperson: {
    label: "Tradies & Tradespeople",
    metaDescription: `Investing guide for tradies and tradespeople in Australia in ${CURRENT_YEAR} — ABN income, super, income protection, and property investing.`,
    intro:
      "Tradespeople — electricians, plumbers, builders, carpenters, tilers, and others — often earn very competitive incomes, particularly in the current construction boom. The financial challenge is that many work as contractors with ABNs and have no employer — meaning super, income protection, and tax planning all fall to the individual. Injuries are a real risk in physical trades; insurance coverage is critical.",
    incomeType: "Self-employed",
    superType: "Self-fund",
    highlights: [
      "An ABN tradie with no employer receives no SG — you must make your own super contributions or retire with nothing.",
      "Income protection for physical trades is essential — a back injury, hand injury, or mental health condition can end a career in the trades.",
      "Negative gearing on an investment property is highly effective at the 32.5–37% marginal rate most tradies reach.",
    ],
    hubLinks: [
      { title: "Super", href: "/super", note: "Self-funded super for ABN contractors" },
      { title: "Income Protection", href: "/insurance/income-protection", note: "Physical injury and illness cover for tradies" },
      { title: "Property", href: "/property", note: "Using trade skills and knowledge in property investing" },
      { title: "Negative Gearing", href: "/negative-gearing", note: "Tax-effective property at your marginal rate" },
    ],
    faqs: [
      {
        q: "Does a tradie on ABN need to pay themselves super?",
        a: "Yes — if you're a genuine independent contractor running your own business, no employer is legally required to pay you SG. You should make personal concessional contributions (up to $30,000/year) and lodge a Notice of Intent to Claim a Deduction to get the same tax benefit. A basic super fund setup takes less than 30 minutes and the tax saving on contributions is immediate.",
      },
      {
        q: "What's the best way for a tradie to save for retirement?",
        a: "Super is the most tax-effective vehicle — contributions taxed at 15% vs up to 47% of ordinary income. For tradies who own their tools and a ute, there's often also scope to build a negatively geared investment property portfolio over time. A diversified combination of super, property, and managed funds gives resilience against any one asset class underperforming.",
      },
      {
        q: "What insurance does a self-employed tradie need?",
        a: "At minimum: (1) income protection (replaces 70% of income if you can't work due to illness or injury); (2) public liability (required for most contract work — $10M–$20M cover); (3) tools and equipment cover; and (4) TPD insurance if you have significant debts or dependants. Life insurance if you have a mortgage or family dependants. Workers' compensation for yourself as a sole trader is not mandatory in most states but available.",
      },
    ],
    advisorType: "Financial adviser",
    advisorHref: "/advisors/financial-advisers",
  },

  farmer: {
    label: "Farmers & Agricultural Workers",
    metaDescription: `Investing guide for farmers and agricultural workers in Australia in ${CURRENT_YEAR} — Farm Management Deposits, income averaging, super, and succession planning.`,
    intro:
      "Farming finances are defined by irregular income (drought years vs bumper seasons), significant asset values (land and equipment) that are often illiquid and family-owned, and unique tax tools. Farm Management Deposits (FMDs) let primary producers deposit income in good years and withdraw in lean ones, smoothing taxable income. Succession planning — how the farm passes to the next generation — is often the most complex financial event in a farming family's life.",
    incomeType: "Irregular income",
    superType: "Self-fund",
    highlights: [
      "Farm Management Deposits (FMDs) allow primary producers to deposit up to $800,000 pre-tax in profitable years and withdraw in loss years — a powerful income smoothing tool.",
      "Income averaging provisions allow farmers to spread tax over multiple years to avoid the spike from a single good season.",
      "The farm is typically the largest asset — but it's illiquid, succession-constrained, and subject to weather and commodity risk.",
    ],
    hubLinks: [
      { title: "Super", href: "/super", note: "Self-funded super for farmers and primary producers" },
      { title: "Property", href: "/property", note: "Farmland as investment and succession asset" },
      { title: "Lump Sum Investing", href: "/lump-sum-investing", note: "Deploying FMD withdrawals and farm sale proceeds" },
      { title: "Sell a Business", href: "/sell-business", note: "Farm succession and sale planning" },
    ],
    faqs: [
      {
        q: "What are Farm Management Deposits and how do they work?",
        a: "FMDs allow primary producers to deposit pre-tax income in profitable years and withdraw it in later years. Deposits up to $800,000 reduce your taxable income in the year of deposit; withdrawals are assessable income in the year of withdrawal. Interest earned inside an FMD account is also assessable. FMDs are held with approved financial institutions. They're one of the most effective income tax tools available to primary producers.",
      },
      {
        q: "How does income averaging work for farmers?",
        a: "The primary producer income averaging provisions allow you to spread your current-year income over the current and previous four years for tax purposes. If your income spikes in a good season, averaging reduces the effective marginal rate you pay. The ATO automatically applies averaging if it results in a lower tax bill. A tax agent can confirm whether averaging benefits you in a specific year.",
      },
      {
        q: "How should a farmer plan for succession?",
        a: "Farm succession is complex — balancing the farming child's need for affordable access to the farm against fairness to non-farming siblings against minimising stamp duty and CGT. Common structures include: gifting or sale at below-market value (with family loan arrangements), trusts, and staged transfer over time. Specialist advice from a lawyer and financial planner experienced in rural succession is essential. Start planning at least 10 years before the intended transition.",
      },
    ],
    advisorType: "Financial adviser (rural/agricultural specialist)",
    advisorHref: "/advisors/financial-advisers",
  },

  pilot: {
    label: "Pilots & Aircrew",
    metaDescription: `Investing guide for commercial pilots and aircrew in Australia in ${CURRENT_YEAR} — super, income protection, career risk, and long-term wealth building.`,
    intro:
      "Commercial pilots have high peak incomes but face significant career risk: medical grounding, airline insolvency (COVID demonstrated this vividly), and mandatory retirement ages. The financial priority is to front-load wealth building during high-earning years, hold robust income protection insurance (including loss of licence cover), and maintain assets outside super in case of forced early retirement.",
    incomeType: "PAYG",
    superType: "Employer SG",
    highlights: [
      "Pilots are medically grounded if they lose their Class 1 medical certificate — loss of licence insurance is critical and distinct from standard income protection.",
      "Airline insolvency can wipe out accrued leave entitlements — diversify savings to avoid total reliance on employer-held benefits.",
      "Mandatory retirement (typically 65 under ICAO rules) is certain — plan for it actively from your 40s.",
    ],
    hubLinks: [
      { title: "Income Protection", href: "/insurance/income-protection", note: "Loss of licence cover for pilots" },
      { title: "Super", href: "/super", note: "Maximising super in high-income years" },
      { title: "Property", href: "/property", note: "Tangible assets outside aviation industry risk" },
      { title: "ETFs", href: "/etfs", note: "Diversified equities alongside property" },
    ],
    faqs: [
      {
        q: "What is loss of licence insurance for pilots?",
        a: "Loss of licence (LOL) insurance pays a benefit if a pilot permanently loses their CASA medical certificate due to illness or injury. Standard income protection typically excludes loss of licence — a pilot who can't fly can often still do desk work, which standard policies use to deny claims. LOL insurance is designed specifically for the professional risks pilots face. It's sold by specialist insurers and through aviation-focused brokers.",
      },
      {
        q: "How much should a pilot save for retirement?",
        a: "With a mandatory retirement age of around 65 and potentially strong earnings from their 30s, a pilot who maximises super contributions should accumulate $1.5M–$2.5M+ by retirement — sufficient for a comfortable retirement. The risk is a forced early retirement from medical grounds in the 40s or 50s, which cuts the accumulation period significantly. This is why LOL insurance and assets outside super are critical.",
      },
      {
        q: "What happened to pilot super in airline insolvencies?",
        a: "When airlines fail, employee super contributions that have been paid to the super fund are protected (super funds are separate legal entities). However, entitlements sitting with the employer (accrued leave, unpaid salary) may only receive partial recovery through the GEERS scheme. The lesson: don't leave significant personal savings inside the employer's structure — diversify to assets you directly own.",
      },
    ],
    advisorType: "Financial adviser",
    advisorHref: "/advisors/financial-advisers",
  },

  miner: {
    label: "Mining Workers",
    metaDescription: `Investing guide for mining and FIFO workers in Australia in ${CURRENT_YEAR} — high income, zone tax offsets, super, and building long-term wealth.`,
    intro:
      "Mining workers — from operators to geologists to FIFO maintenance crew — often earn significantly above-average wages, particularly in Western Australia and Queensland. High income, below-average living costs on site, and boom-bust career cycles create a distinctive financial situation. The window of high earnings is often finite; front-loading super, paying off a home loan, and building investment assets during the working years is critical.",
    incomeType: "PAYG",
    superType: "Employer SG",
    highlights: [
      "FIFO workers in remote areas may qualify for zone tax offset (Zone A or B) — claim this on your tax return.",
      "High income (often $120K–$250K+) pushes miners into the 37–45% marginal bracket — salary sacrifice into super is highly effective.",
      "Industry boom-bust cycles mean high income isn't guaranteed indefinitely — build assets quickly when earning is good.",
    ],
    hubLinks: [
      { title: "Super", href: "/super", note: "Maximising the concessional cap at high marginal rate" },
      { title: "Property", href: "/property", note: "Building a property portfolio during high-income years" },
      { title: "Negative Gearing", href: "/negative-gearing", note: "Tax-effective property at 37–45% marginal rate" },
      { title: "Lump Sum Investing", href: "/lump-sum-investing", note: "Deploying savings from consecutive FIFO rotations" },
    ],
    faqs: [
      {
        q: "Can FIFO workers claim the zone tax offset?",
        a: "Yes — if you work in a remote zone (Zone A or Zone B as defined by the ATO) for more than half the income year, you can claim the zone tax offset. Zone A is the most remote (large offset); Zone B is less remote (smaller offset). FIFO workers who live in Perth or Brisbane but work in remote sites may also qualify if they genuinely reside in the zone during work rotations. Check the ATO website for the current zone boundaries and offset amounts.",
      },
      {
        q: "Should a mining worker salary sacrifice into super?",
        a: "For workers earning $150,000+, salary sacrifice into super is one of the highest-returning risk-free financial moves available. The SG contribution (11.5%) plus sacrifice to hit the $30,000 concessional cap saves 22–32 percentage points of tax on those dollars. The money grows in a low-tax environment until retirement. The only downside is that the money is preserved until preservation age — not suitable for dollars you'll need before then.",
      },
      {
        q: "How should a miner prepare for industry downturns?",
        a: "Commodity cycles are real — the 2015–16 iron ore crash and 2020 COVID disruptions both caused rapid mining job losses. The preparation: (1) pay down the home loan aggressively during high-income periods (each dollar paid off reduces fixed costs permanently); (2) build a 12-month cash emergency fund; (3) diversify into assets that aren't correlated with commodity prices (e.g., ETFs with global equity and bond exposure). An investment property in a major city (rather than a mining town) is less correlated with commodity cycles.",
      },
    ],
    advisorType: "Financial adviser",
    advisorHref: "/advisors/financial-advisers",
  },

  freelancer: {
    label: "Freelancers",
    metaDescription: `Investing guide for freelancers in Australia in ${CURRENT_YEAR} — ABN income, tax, super, and building financial security with irregular income.`,
    intro:
      "Freelancers — designers, writers, marketers, consultants, and others trading under an ABN — enjoy freedom and flexibility but carry all the financial risk that an employer normally absorbs. Tax management (quarterly BAS/GST, income tax instalments), self-funded super, and income protection are the three critical areas most freelancers underinvest in during their first years of self-employment.",
    incomeType: "Self-employed",
    superType: "Self-fund",
    highlights: [
      "GST applies if annual turnover exceeds $75,000 — register for GST before you hit the threshold to avoid penalties.",
      "Income tax is not withheld from freelance invoices — set aside 30–40% of every payment for tax to avoid surprises.",
      "No employer means no SG — self-funded super through personal concessional contributions is the only option.",
    ],
    hubLinks: [
      { title: "Super", href: "/super", note: "Personal concessional contributions for self-employed" },
      { title: "Income Protection", href: "/insurance/income-protection", note: "Cover for freelancers with no sick leave" },
      { title: "ETFs", href: "/etfs", note: "Simple investing for busy independent workers" },
      { title: "First Home Buyer", href: "/first-home-buyer", note: "First home for self-employed borrowers" },
    ],
    faqs: [
      {
        q: "How does a freelancer pay tax in Australia?",
        a: "Freelancers are taxed on their net profit (revenue minus business expenses). If you have a prior year tax liability or the ATO estimates your income will exceed $4,000, you'll be required to pay Pay As You Go (PAYG) instalments quarterly. The ATO sets the instalment amount or you can vary it. Keep detailed records of all income and deductible expenses; use accounting software from day one.",
      },
      {
        q: "Should a freelancer operate as a sole trader or Pty Ltd company?",
        a: "Sole trader is simpler to set up and run but offers no personal liability protection. A Pty Ltd company provides limited liability (protecting personal assets) and allows retained profits to be taxed at 25%, but adds ~$2,000–$4,000 per year in accounting and compliance costs. The company structure becomes more valuable once annual profit exceeds around $100,000. Seek advice from an accountant.",
      },
      {
        q: "What's the most important financial habit for a freelancer?",
        a: "Separating business and personal finances — use a dedicated business bank account for all income and expenses, transfer a fixed percentage to tax savings on every payment received (30–40%), pay yourself a regular 'salary' transfer to your personal account, and make regular super contributions. Irregular income makes budgeting harder; fixed automation makes it manageable.",
      },
    ],
    advisorType: "Financial adviser",
    advisorHref: "/advisors/financial-advisers",
  },

  contractor: {
    label: "Contractors",
    metaDescription: `Investing guide for contractors in Australia in ${CURRENT_YEAR} — PAYG vs ABN, super, PSI rules, and tax planning.`,
    intro:
      "Contractor is a broad term that covers everything from PAYG contractors (no meaningful difference to employment) to independent ABN contractors who own their own business. The critical financial distinction is whether you have an employer who pays SG and withholds tax, or whether you're genuinely running your own business under an ABN. The Personal Services Income (PSI) rules determine how much income splitting through a company or trust is permissible.",
    incomeType: "PAYG + contractor income",
    superType: "Depends on employer",
    highlights: [
      "PAYG contractors have tax withheld and receive SG — functionally similar to employment from a tax perspective.",
      "ABN contractors must self-fund super, manage their own tax payments, and comply with GST if turnover exceeds $75,000.",
      "PSI rules may limit the ability to split income through a company if you earn income primarily from your own personal skills.",
    ],
    hubLinks: [
      { title: "Super", href: "/super", note: "SG entitlement vs self-funded super" },
      { title: "Income Protection", href: "/insurance/income-protection", note: "Cover without employer sick leave" },
      { title: "ETFs", href: "/etfs", note: "Investing surplus contractor income" },
      { title: "Negative Gearing", href: "/negative-gearing", note: "Tax-effective property at contractor marginal rate" },
    ],
    faqs: [
      {
        q: "When is a contractor entitled to employer super?",
        a: "A worker who is paid wholly or principally for their personal labour and skill — even if they have an ABN — may be entitled to SG contributions under the extended definition in the Superannuation Guarantee Act. This catches many 'contractors' who the employer treats as ABN workers to avoid SG obligations. The ATO has a contractor/employee decision tool to assess entitlement.",
      },
      {
        q: "What are the Personal Services Income (PSI) rules?",
        a: "PSI rules prevent contractors from routing personal services income through a company or trust to achieve tax benefits if they don't meet the 'results test' or at least two of the 80% rule, unrelated clients test, and business premises test. Income that fails the PSI tests is attributed directly to the individual — the company structure provides no income tax benefit for those amounts. An accountant can assess whether PSI rules apply to your situation.",
      },
      {
        q: "Should a contractor hold income protection insurance?",
        a: "Absolutely — contractors typically have no sick leave, no employer-funded income protection, and may have long gaps between contracts. Personal income protection covering 70% of income until age 65 (or a shorter benefit period to reduce premium cost) is the most important insurance for independent contractors. The premium is tax-deductible when the policy is held outside super.",
      },
    ],
    advisorType: "Financial adviser",
    advisorHref: "/advisors/financial-advisers",
  },

  "sports-professional": {
    label: "Sports Professionals",
    metaDescription: `Investing guide for Australian sports professionals in ${CURRENT_YEAR} — short career windows, image rights, SMSF, and long-term wealth after sport.`,
    intro:
      "Professional athletes have the most concentrated earning window of any career — typically 10–15 years of high income followed by complete income cessation. Financial priorities are: front-loading wealth accumulation during the playing years, understanding image rights and endorsement tax, and planning for the financial and psychological transition out of professional sport. A surprisingly high proportion of athletes face financial difficulty within 5 years of retirement.",
    incomeType: "PAYG",
    superType: "Employer SG",
    highlights: [
      "Career income is front-loaded into 10–15 years — what a 45-year-old non-athlete earns over 20 years, an athlete must save in 15.",
      "Image rights income may be structured through a company to reduce marginal tax — but requires careful ATO compliance.",
      "Super contributions during playing years benefit from 40+ years of compound growth — early contributions have the most impact.",
    ],
    hubLinks: [
      { title: "SMSF", href: "/smsf", note: "Investment control and diversification for athletes" },
      { title: "Lump Sum Investing", href: "/lump-sum-investing", note: "Deploying signing bonuses and contract payouts" },
      { title: "Property", href: "/property", note: "Tangible wealth building during playing years" },
      { title: "Sell a Business", href: "/sell-business", note: "Post-sport business ventures and exits" },
    ],
    faqs: [
      {
        q: "How should a professional athlete approach financial planning?",
        a: "The most important step is treating the playing career as a finite financial window — not a permanent state. From the first professional contract: (1) maximise super contributions; (2) live on 50–70% of post-tax income, investing the rest; (3) engage a financial planner with sports industry experience; (4) plan the post-sport career from the start, not at the end. The athletes who maintain wealth after sport are the ones who built financial habits and diversified assets during it.",
      },
      {
        q: "How are image rights and endorsements taxed?",
        a: "Endorsements and image rights paid directly to an athlete are assessable income at their marginal rate. Some athletes structure image rights through a company — the company then licenses the image rights to sponsors. Whether this works tax-effectively depends on the structure and whether the athlete is working in their 'personal services' capacity. ATO has increased scrutiny of sports image rights structures — specialist tax advice is essential.",
      },
      {
        q: "What are the most common financial mistakes athletes make?",
        a: "Lifestyle inflation (spending proportional to income during playing years, leaving nothing invested), trusting the wrong advisers (sports agents are not financial planners), failing to diversify beyond a single property or personal business, and not maximising super during the tax-efficient playing years. Financial literacy training for athletes is improving but still lags behind the financial complexity of a professional career.",
      },
    ],
    advisorType: "Financial adviser (sports / HNW specialist)",
    advisorHref: "/advisors/financial-advisers",
  },
};

// ─── Static params ────────────────────────────────────────────────────────────

export function generateStaticParams() {
  return Object.keys(OCCUPATIONS).map((occupation) => ({ occupation }));
}

// ─── Related occupations (cross-links) ────────────────────────────────────────

function getRelated(current: string, count = 4): { slug: string; label: string }[] {
  return Object.entries(OCCUPATIONS)
    .filter(([slug]) => slug !== current)
    .slice(0, count)
    .map(([slug, cfg]) => ({ slug, label: cfg.label }));
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = { params: Promise<{ occupation: string }> };

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { occupation } = await params;
  const cfg = OCCUPATIONS[occupation];
  if (!cfg) return { title: "Not found" };
  return {
    title: buildTitle(`Investing for ${cfg.label} in Australia (${CURRENT_YEAR})`),
    description: cfg.metaDescription,
    alternates: { canonical: `${SITE_URL}/investing-for/${occupation}` },
    openGraph: {
      title: `Investing for ${cfg.label} — ${CURRENT_YEAR} Guide`,
      description: cfg.metaDescription,
      url: `${SITE_URL}/investing-for/${occupation}`,
      type: "website",
      images: [{ url: `/api/og?title=${encodeURIComponent("Investing for " + cfg.label + " in Australia")}&sub=${encodeURIComponent("Tax · Super · Strategy · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image" },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function InvestingForOccupationPage({ params }: Props) {
  const { occupation } = await params;
  const cfg = OCCUPATIONS[occupation];
  if (!cfg) notFound();

  const related = getRelated(occupation);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Investing For", url: absoluteUrl("/investing-for") },
    { name: cfg.label },
  ]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: cfg.faqs.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="container-custom py-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-sm text-slate-400 mb-6 flex flex-wrap gap-1">
          <Link href="/" className="hover:text-slate-600">Home</Link>
          <span>›</span>
          <Link href="/investing-for" className="hover:text-slate-600">Investing For</Link>
          <span>›</span>
          <span className="text-slate-600">{cfg.label}</span>
        </nav>

        {/* Hero */}
        <header className="mb-8">
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2.5 py-1 rounded">
              {cfg.incomeType}
            </span>
            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded">
              Super: {cfg.superType}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3">
            Investing for {cfg.label} — {CURRENT_YEAR} Guide
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">{cfg.intro}</p>
        </header>

        {/* Highlights */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            Key financial considerations
          </h2>
          <ul className="space-y-3">
            {cfg.highlights.map((h, i) => (
              <li key={i} className="flex gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-slate-700 leading-relaxed">{h}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Hub links */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            Guides relevant to your situation
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cfg.hubLinks.map(({ title, href, note }) => (
              <Link
                key={href}
                href={href}
                className="block p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <p className="font-semibold text-slate-900">{title}</p>
                <p className="text-xs text-slate-500 mt-1">{note}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* FAQs */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            Frequently asked questions
          </h2>
          <div className="space-y-6">
            {cfg.faqs.map(({ q, a }) => (
              <div key={q} className="border-b border-slate-100 pb-5 last:border-0">
                <h3 className="font-semibold text-slate-900 mb-1">{q}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Advisor CTA */}
        <section className="mb-10 bg-blue-50 border border-blue-100 rounded-xl p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-2">
            Talk to a {cfg.advisorType}
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            The right adviser understands the specific financial situation, tax obligations, and
            structuring options relevant to your work.
          </p>
          <Link
            href={cfg.advisorHref}
            className="inline-block bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm"
          >
            Find an adviser →
          </Link>
        </section>

        {/* Cross-occupation nav */}
        {related.length > 0 && (
          <section className="mb-8">
            <h2 className="text-base font-semibold text-slate-700 mb-3">
              Guides for other occupations
            </h2>
            <div className="flex flex-wrap gap-2">
              {related.map(({ slug, label }) => (
                <Link
                  key={slug}
                  href={`/investing-for/${slug}`}
                  className="text-sm text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
                >
                  {label.split(" ")[0]}
                </Link>
              ))}
              <Link
                href="/investing-for"
                className="text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full hover:bg-slate-200 transition-colors"
              >
                All occupations →
              </Link>
            </div>
          </section>
        )}

        {/* Compliance */}
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-xs text-slate-500 leading-relaxed">
          <strong className="text-slate-700">General advice only.</strong>{" "}
          {GENERAL_ADVICE_WARNING}
        </div>
      </div>
    </>
  );
}
