import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 3600;

// ─── Event registry ───────────────────────────────────────────────────────────

interface HubLink {
  label: string;
  href: string;
  description: string;
}

interface Action {
  timeframe: string;
  title: string;
  detail: string;
}

interface JustEvent {
  slug: string;
  headline: string;
  subhead: string;
  advisorType: string;
  advisorHref: string;
  actions: Action[];
  hubLinks: HubLink[];
  faqs: { q: string; a: string }[];
}

const EVENTS: JustEvent[] = [
  {
    slug: "retired",
    headline: "You just retired",
    subhead:
      "Retirement triggers several irreversible financial decisions within the first 12 months. Getting the sequencing right protects your income for decades.",
    advisorType: "financial adviser",
    advisorHref: "/advisors/financial-planners",
    actions: [
      {
        timeframe: "First 30 days",
        title: "Start your pension from super",
        detail:
          "Switch your accumulation account to account-based pension phase. In pension phase, investment earnings are tax-free (0% vs 15% in accumulation). Notify your fund and nominate your annual drawdown amount — the minimum is 4% under age 65, rising to 5% at 65–74.",
      },
      {
        timeframe: "First 30 days",
        title: "Check your Centrelink eligibility",
        detail:
          "The Age Pension means test applies to both assets and income. The deeming rules assess your super account balance as income. Check whether your assets are below the full-pension threshold ($314k for singles, $470k for couples). Apply at Services Australia or via myGov.",
      },
      {
        timeframe: "First 60 days",
        title: "Review your insurance needs",
        detail:
          "Income protection is unnecessary in retirement (no income to protect). Life insurance requirements may reduce if your dependants are financially independent. Trauma and TPD may still be worthwhile. Cancel or reduce cover to lower premiums.",
      },
      {
        timeframe: "First 90 days",
        title: "Set your withdrawal strategy",
        detail:
          "The sequencing-of-returns risk is highest in the first 3–5 years of retirement. Consider holding 2 years of living expenses in cash so you don't sell growth assets in a market downturn. Review your investment strategy for income reliability over growth.",
      },
      {
        timeframe: "Ongoing",
        title: "Lodge your first return as a retiree",
        detail:
          "Your tax position changes significantly. Super pension payments are tax-free after age 60. Part of your income may still come from investment income (dividends, interest) or part-time work. Centrelink income may affect tax offsets. Get a tax agent familiar with retirement income streams.",
      },
    ],
    hubLinks: [
      { label: "Super Hub", href: "/super", description: "Compare super funds and pension strategies" },
      { label: "SMSF Hub", href: "/smsf", description: "Self-managed super in pension phase" },
      { label: "Insurance Hub", href: "/insurance", description: "Review your insurance needs at retirement" },
      { label: "Aged Care Hub", href: "/aged-care", description: "Plan ahead for residential care costs" },
    ],
    faqs: [
      {
        q: "Do I pay tax on super pension payments after retirement?",
        a: "If you are 60 or older and draw an account-based pension from a taxed super fund, the payments are completely tax-free and do not need to be included in your tax return. If you are between preservation age (60) and 59, a 15% tax offset applies to the taxable component. Before 60, the taxable component is taxed at your marginal rate with a 15% offset.",
      },
      {
        q: "How much must I withdraw from my account-based pension each year?",
        a: "The minimum annual drawdown is 4% of your account balance (at age under 65), 5% (65–74), 6% (75–79), 7% (80–84), 9% (85–89), 11% (90–94), and 14% (95+). There is no maximum. You can take more than the minimum if you need it.",
      },
      {
        q: "Can I still contribute to super after I retire?",
        a: "Yes, with some restrictions. If you have retired before age 75, you can still make non-concessional contributions (after-tax) up to $120,000/year (or $360,000 under the bring-forward rule, subject to your total super balance). Employer and salary-sacrifice contributions generally stop once you retire and have notified your fund of your retirement condition of release.",
      },
    ],
  },
  {
    slug: "inherited",
    headline: "You just inherited",
    subhead:
      "Receiving an inheritance involves overlapping tax, legal, and investment decisions. There is no inheritance tax in Australia, but CGT, super death benefits, and estate administration have their own rules.",
    advisorType: "financial adviser and tax agent",
    advisorHref: "/advisors/financial-planners",
    actions: [
      {
        timeframe: "First 30 days",
        title: "Establish what you've received",
        detail:
          "Inherited assets fall into categories: cash, shares, property, super death benefits, and other assets. Each is treated differently. Cash is tax-free. Shares and property carry the deceased's cost base (or a special death-cost-base rule). Super death benefits are taxed based on your relationship to the deceased.",
      },
      {
        timeframe: "First 30 days",
        title: "Understand the CGT position on shares and property",
        detail:
          "Inherited shares and property don't trigger CGT at death — that event is deferred until you sell. Your cost base is the market value at the date of death (for post-1985 acquisitions). The 12-month CGT discount clock resets: hold inherited assets for 12+ months before selling to access the 50% discount.",
      },
      {
        timeframe: "First 60 days",
        title: "Check if inherited property has a 2-year exemption window",
        detail:
          "If you inherit the deceased's main residence, you have a 2-year window to sell it CGT-free (treated as your main residence during that period). After 2 years, the property becomes an investment property and CGT applies from the date of death. Don't let this window lapse without a decision.",
      },
      {
        timeframe: "First 90 days",
        title: "Handle the super death benefit tax",
        detail:
          "If you are a non-dependant (adult child, for example), the taxable component of a super death benefit paid to you as a lump sum is taxed at 15% plus the 2% Medicare levy. If you are a dependant (spouse, child under 18), it is tax-free. Decide whether to take the death benefit as a lump sum or roll it into your own super (if eligible as a spouse).",
      },
      {
        timeframe: "First 90 days",
        title: "Invest the inheritance deliberately",
        detail:
          "Avoid making large investment decisions under emotional pressure. Research shows lump-sum investing beats dollar-cost averaging about two-thirds of the time in Australian markets — but the right timing depends on your tax position, existing portfolio, and risk tolerance.",
      },
    ],
    hubLinks: [
      { label: "Inheritance Hub", href: "/inheritance", description: "CGT, super death benefits, estate planning" },
      { label: "Tax Hub", href: "/tax", description: "CGT cost base and capital gains reporting" },
      { label: "Lump Sum Investing", href: "/lump-sum-investing", description: "How to invest an inheritance" },
      { label: "Property Hub", href: "/property", description: "Inherited property rules and CGT" },
    ],
    faqs: [
      {
        q: "Is there inheritance tax in Australia?",
        a: "No. Australia does not have a formal inheritance tax or estate duty. However, inherited assets can trigger other taxes. Super death benefits paid to non-dependants attract a 15-17% tax. Selling inherited property or shares can trigger CGT. Income earned on inherited assets is taxed as ordinary income.",
      },
      {
        q: "What is the cost base for inherited shares in Australia?",
        a: "For shares acquired by the deceased after 20 September 1985, your cost base is the market value at the date of death. You are treated as having acquired the shares at that time. The 50% CGT discount applies if you hold the inherited shares for more than 12 months before selling (the holding period does not carry over from the deceased).", // dated-ok — CGT inception date, fixed by statute (never changes)
      },
      {
        q: "How long do I have to sell an inherited main residence CGT-free?",
        a: "The main residence exemption window is generally 2 years from the date of death. During this period, the property is treated as your main residence (even if you don't live in it) and is CGT-free. If the property was not the deceased's main residence, or if more than 2 years pass, CGT applies.",
      },
    ],
  },
  {
    slug: "made-redundant",
    headline: "You just got made redundant",
    subhead:
      "Redundancy triggers immediate decisions about your Employment Termination Payment tax, super carry-forward strategy, and cash buffer that have long-term financial consequences.",
    advisorType: "financial adviser or tax agent",
    advisorHref: "/advisors/tax-agents",
    actions: [
      {
        timeframe: "First 7 days",
        title: "Understand your ETP tax treatment",
        detail:
          "Genuine redundancy payments are split into a tax-free component (base amount $12,524 + $6,264 per completed year of service in FY2025-26) and a taxable Employment Termination Payment (ETP). The ETP is taxed at 17% if it pushes your taxable income above $180,000, or 32% otherwise — not at your normal marginal rate.",
      },
      {
        timeframe: "First 30 days",
        title: "Check for unused super carry-forward entitlement",
        detail:
          "If your total super balance was under $500,000 at 30 June last year, you can carry forward up to 5 years of unused concessional contributions cap ($30,000/year). This means you could contribute a lump sum from your redundancy payout directly into super, reducing this year's taxable income significantly. Time-sensitive — must be done in the same financial year as the redundancy.",
      },
      {
        timeframe: "First 30 days",
        title: "Apply for Centrelink if needed",
        detail:
          "The income maintenance period (IMP) delays your JobSeeker start date by weeks or months based on your redundancy payment. The calculation is: redundancy lump sum ÷ the ordinary weekly adult wage rate. Notify Centrelink within 14 days of your last employment day even if the IMP delay applies.",
      },
      {
        timeframe: "First 90 days",
        title: "Build your cash buffer",
        detail:
          "Financial advisers recommend 3-6 months of expenses in a high-interest savings account before making investment decisions with any lump-sum payout. This prevents forced selling of growth assets if the job search takes longer than expected.",
      },
      {
        timeframe: "First 90 days",
        title: "Review your income protection insurance",
        detail:
          "Income protection policies typically pay for up to 2 years of benefits (or to age 65 under longer-term policies). If you have a policy, check the waiting period before payments begin and whether it covers redundancy (most don't — income protection covers illness and injury). Cancelling cover while unemployed creates a gap if you fall ill before returning to work.",
      },
    ],
    hubLinks: [
      { label: "Redundancy Hub", href: "/redundancy", description: "ETP tax, super strategy, financial rebuild" },
      { label: "Super Hub", href: "/super", description: "Carry-forward contributions and consolidation" },
      { label: "Insurance Hub", href: "/insurance", description: "Income protection during unemployment" },
      { label: "Tax Hub", href: "/tax", description: "ETP tax return and deductions" },
    ],
    faqs: [
      {
        q: "Is my redundancy payment taxable in Australia?",
        a: "A genuine redundancy payment has a tax-free component calculated as a base amount ($12,524 in FY2025-26) plus a per-year-of-service amount ($6,264). Amounts above this threshold become an Employment Termination Payment (ETP) and are taxed at 17% or 32% depending on your total taxable income — not at your normal marginal tax rate.",
      },
      {
        q: "Can I put my redundancy payment into super?",
        a: "Yes. You can make personal concessional contributions from your redundancy payout and claim them as a tax deduction, which can significantly reduce your tax bill in the year of redundancy. The standard cap is $30,000/year for concessional contributions, but if your super balance was under $500,000 at 30 June last year, you can access carry-forward amounts from unused cap in the prior 5 years.",
      },
      {
        q: "What is the Centrelink income maintenance period?",
        a: "The income maintenance period (IMP) is a waiting period before you can receive JobSeeker. It is calculated by dividing your redundancy payment by the ordinary weekly adult wage rate (the ABS rate used by Centrelink). The IMP prevents you from receiving welfare while you still have income from the redundancy. The IMP begins from the day your employment ends.",
      },
    ],
  },
  {
    slug: "got-married",
    headline: "You just got married",
    subhead:
      "Marriage changes your legal, financial, and tax position in ways that aren't immediately obvious. Getting these sorted in the first year sets you up for decades.",
    advisorType: "financial adviser",
    advisorHref: "/advisors/financial-planners",
    actions: [
      {
        timeframe: "First 30 days",
        title: "Update your super beneficiary nominations",
        detail:
          "Your super doesn't automatically pass to your spouse — it goes to whoever is listed as a nominated beneficiary (or is decided by the trustee). Update your binding death benefit nomination to your spouse immediately. A non-binding nomination is a guide only and can be overridden. Most funds allow this online.",
      },
      {
        timeframe: "First 30 days",
        title: "Review and update insurance beneficiaries",
        detail:
          "Update beneficiaries on life insurance, income protection, TPD, and trauma policies. Update your will (marriage automatically revokes a will made before marriage in most Australian states). If you don't have a will, now is the time to make one.",
      },
      {
        timeframe: "First 60 days",
        title: "Consider spouse super contributions",
        detail:
          "If your spouse earns under $40,000 and you contribute up to $3,000 to their super, you can claim an 18% tax offset (up to $540). If your spouse earns under $37,000, the full offset applies. This is especially valuable if one partner reduces work to care for children.",
      },
      {
        timeframe: "First 90 days",
        title: "Check your combined Medicare Levy Surcharge position",
        detail:
          "The Medicare Levy Surcharge threshold becomes $186,000 for a family (vs $93,000 for singles). If your combined income is under $186,000, you may no longer need private hospital cover to avoid the MLS — potentially saving hundreds per year. Review your health insurance.",
      },
      {
        timeframe: "First year",
        title: "Build a combined financial plan",
        detail:
          "Discuss shared goals: home ownership, children, retirement timeline, investment approach, and debt strategy. Couples often have different risk tolerances and time horizons. A joint budget and written financial plan prevents assumptions becoming problems later.",
      },
    ],
    hubLinks: [
      { label: "Super Hub", href: "/super", description: "Spouse contributions and beneficiary nominations" },
      { label: "Insurance Hub", href: "/insurance", description: "Update insurance for your new circumstances" },
      { label: "First Home Buyer Hub", href: "/first-home-buyer", description: "FHSS and joint first home strategies" },
      { label: "Tax Hub", href: "/tax", description: "Tax planning as a couple" },
    ],
    faqs: [
      {
        q: "Does getting married change my tax in Australia?",
        a: "Marriage doesn't directly change your income tax (you are still assessed individually). However, it affects your eligibility for spouse tax offsets, the Medicare Levy Surcharge threshold (family threshold is $186,000 vs $93,000 for singles), Private Health Insurance rebate income test, and various Centrelink thresholds. Review these in your first joint tax return.",
      },
      {
        q: "Does my will become invalid when I get married?",
        a: "Yes, in all Australian states and territories, marriage automatically revokes a will made before the marriage. Your assets would then be distributed under intestacy laws, which may not reflect your wishes. Make a new will as soon as possible after marriage.",
      },
      {
        q: "Can I contribute to my spouse's super to save tax?",
        a: "Yes. If your spouse earns below $40,000, you can contribute up to $3,000 to their super and receive a spouse contribution tax offset of up to $540 (18% of the contribution). The full offset applies when your spouse earns under $37,000. This builds their retirement savings while giving you a direct tax reduction.",
      },
    ],
  },
  {
    slug: "had-a-baby",
    headline: "You just had a baby",
    subhead:
      "The financial impact of a new child extends well beyond the immediate costs. Parental leave, super gaps, insurance, and estate planning all need attention in the first year.",
    advisorType: "financial adviser",
    advisorHref: "/advisors/financial-planners",
    actions: [
      {
        timeframe: "First 14 days",
        title: "Claim government parental leave pay",
        detail:
          "Paid Parental Leave (PPL) from Services Australia provides up to 18 weeks at the national minimum wage for the primary carer and up to 2 weeks for Dad and Partner Pay, means-tested at family income under $350,000. Apply within 28 days of birth through myGov. Your employer may also have paid parental leave — check your contract.",
      },
      {
        timeframe: "First 30 days",
        title: "Update super nominations and make a will",
        detail:
          "Add your child as a reversionary beneficiary or update your binding death benefit nomination. Make or update your will — specify a guardian for your child if both parents die. Without a will, the court decides who raises your child. A simple will can be done through a solicitor for a few hundred dollars.",
      },
      {
        timeframe: "First 60 days",
        title: "Review your life and income protection insurance",
        detail:
          "A new dependant significantly increases the amount of life insurance you need. A common guide is 10x salary plus the outstanding mortgage. If you reduce work hours for childcare, review your income protection — your insured income may now exceed your actual income, making a claim impossible at the full amount.",
      },
      {
        timeframe: "First 90 days",
        title: "Plan for your super gap",
        detail:
          "Parental leave creates a gap in super contributions. In Australia, employer SG contributions only apply to parental leave pay if your employer continues to pay super on unpaid leave (some enterprise agreements require it, most don't). If your partner earns income, consider spouse contributions (18% tax offset on up to $3,000) to rebuild the gap.",
      },
      {
        timeframe: "First year",
        title: "Claim the Child Care Subsidy and Family Tax Benefit",
        detail:
          "The Child Care Subsidy (CCS) covers 90-100% of approved childcare fees for lower-income families (means-tested). Family Tax Benefit Part A and Part B are payments to support the cost of raising children — apply through Centrelink via myGov. These can be worth thousands per year.",
      },
    ],
    hubLinks: [
      { label: "Super Hub", href: "/super", description: "Spouse contributions and closing the super gap" },
      { label: "Insurance Hub", href: "/insurance", description: "Life insurance with a new dependant" },
      { label: "First Home Buyer Hub", href: "/first-home-buyer", description: "FHSS and growing family needs" },
      { label: "Tax Hub", href: "/tax", description: "Family Tax Benefit and childcare deductions" },
    ],
    faqs: [
      {
        q: "Does my employer have to pay super when I'm on parental leave?",
        a: "Under the Superannuation Guarantee legislation, employers are not legally required to pay super on unpaid parental leave. However, some enterprise agreements and company policies require it. From 1 July 2025, SG contributions will be paid on government-funded Parental Leave Pay, ensuring 11.5% super on the PPL payments. Check your enterprise agreement for employer-paid parental leave super.", // dated-ok — legislated SG-on-PPL commencement date, fixed by statute
      },
      {
        q: "How much life insurance do I need with a new baby?",
        a: "A common starting point is 10x your annual salary plus any outstanding mortgage balance. But with a new baby, also factor in: years until financial independence (18–25 years), childcare costs, private school fees if planned, and whether your partner could return to full-time work if you died. An insurance calculator or adviser can model your specific scenario.",
      },
      {
        q: "What is the Child Care Subsidy and who is eligible?",
        a: "The Child Care Subsidy (CCS) is a government payment that reduces your out-of-pocket childcare costs. The subsidy rate is between 90% (families earning under ~$80,000) and 0% (families earning over ~$360,000), applied to approved childcare fees up to a per-hour cap. Both parents generally need to meet activity test requirements (work, study, or training) to receive CCS.",
      },
    ],
  },
  {
    slug: "bought-a-house",
    headline: "You just bought a house",
    subhead:
      "Buying your first home (or next property) creates new tax obligations and opportunities — depreciation, insurance, negative gearing — that many buyers overlook in the excitement of settlement.",
    advisorType: "tax agent or financial adviser",
    advisorHref: "/advisors/tax-agents",
    actions: [
      {
        timeframe: "First 30 days",
        title: "Arrange home and contents insurance immediately",
        detail:
          "Buildings insurance is your responsibility from the moment contracts exchange (or earlier in some states). If the property is damaged before you take possession and you have no insurance, you are liable. Arrange cover the day you sign — this is one of the most critical first steps for new homeowners.",
      },
      {
        timeframe: "First 30 days",
        title: "Record your cost base for CGT purposes",
        detail:
          "Even if you plan to live in the property, your cost base matters. Keep records of: purchase price, stamp duty, legal/conveyancing fees, loan establishment costs, and any capital improvements. This reduces your CGT bill if you ever sell or rent the property.",
      },
      {
        timeframe: "First 60 days",
        title: "For investment properties: order a depreciation schedule",
        detail:
          "A quantity surveyor's depreciation schedule allows you to claim capital works deductions (2.5%/year on the building) and plant-and-equipment depreciation. For a $650,000 investment property, this can generate $5,000–$12,000 of additional deductions per year. The cost of the schedule (~$600) is immediately deductible.",
      },
      {
        timeframe: "First tax return",
        title: "Claim all eligible property deductions",
        detail:
          "For investment properties, deductible expenses include: interest on the investment loan, property management fees, council rates, strata fees, repairs (not capital improvements), landlord insurance, and depreciation. Pre-paid expenses for the next 12 months (like insurance premiums) are deductible in advance.",
      },
      {
        timeframe: "Ongoing",
        title: "Review your mortgage rate annually",
        detail:
          "Lenders reserve their best rates for new customers. After your fixed term or first year, switch to a lower rate — in-bank refinancing or switching lenders. The RBA research shows loyal borrowers pay an average of 0.5% more than new borrowers. On a $500,000 loan, 0.5% = $2,500 per year.",
      },
    ],
    hubLinks: [
      { label: "Property Hub", href: "/property", description: "Depreciation, negative gearing, and CGT" },
      { label: "Negative Gearing Hub", href: "/negative-gearing", description: "How to calculate your tax saving" },
      { label: "Insurance Hub", href: "/insurance", description: "Home and contents insurance" },
      { label: "Tax Hub", href: "/tax", description: "Investment property deductions and CGT" },
    ],
    faqs: [
      {
        q: "When does CGT apply to a property I live in?",
        a: "Your main residence is exempt from CGT while you live in it. If you later rent it out, the exemption stops from that date. The 6-year rule allows you to treat a former main residence as your main residence for up to 6 years while it is rented, preserving the exemption — but only if you don't nominate another property as your main residence during that period.",
      },
      {
        q: "What is negative gearing and how does it help me?",
        a: "An investment property is negatively geared when the interest and expenses exceed the rental income. The loss reduces your taxable income for the year. At a 37% marginal rate, $10,000 of net rental loss saves you $3,700 in tax. The strategy relies on capital growth to generate an overall profit — the tax saving is a cashflow benefit, not a profit in itself.",
      },
      {
        q: "Do I pay stamp duty if I buy my first home?",
        a: "Most Australian states offer stamp duty concessions or exemptions for first home buyers below a property price threshold. In NSW, for example, purchases under $800,000 are exempt (under the First Home Buyer Assistance Scheme). In Victoria, purchases under $600,000 are exempt. Thresholds and structures vary by state — check the relevant state revenue office for current rules.",
      },
    ],
  },
  {
    slug: "sold-a-business",
    headline: "You just sold a business",
    subhead:
      "Selling a business produces one of the largest single-year tax events in most owners' lives. The small business CGT concessions can eliminate most or all of the tax — but the rules are strict.",
    advisorType: "tax agent or business adviser",
    advisorHref: "/advisors/tax-agents",
    actions: [
      {
        timeframe: "Before settlement",
        title: "Confirm your small business CGT concessions eligibility",
        detail:
          "Four concessions can eliminate or reduce CGT on a business sale: 15-Year Exemption (full exemption if owned 15+ years, over 55 and retiring), 50% Active Asset Reduction, Retirement Exemption ($500,000 lifetime cap), and Rollover (defer CGT by reinvesting). You must meet the basic conditions: aggregated turnover under $2M or net assets under $6M.",
      },
      {
        timeframe: "First 30 days",
        title: "Decide what to do with the proceeds",
        detail:
          "The Retirement Exemption allows up to $500,000 (lifetime) of the capital gain to go into super tax-free (as an exempt amount). If you are under 55, the amount must go into a complying super fund. If you are over 55, you can keep it personally. This decision must be made and elected before the next tax return is lodged.",
      },
      {
        timeframe: "First 60 days",
        title: "Review your super contribution window",
        detail:
          "Proceeds from a business sale can fund a large super contribution using the Retirement Exemption (above) or the Capital Gains Tax cap amount (currently $1.705M for FY2025-26). This is in addition to the normal concessional and non-concessional caps. The window to elect and contribute is narrow — get advice before you lodge.",
      },
      {
        timeframe: "First 90 days",
        title: "Plan how to invest the net proceeds",
        detail:
          "After tax, you may have $500k–$5M in cash. This is a concentrated liquidity event. Resist the urge to invest everything immediately. Build a deliberate asset allocation reflecting your new income needs, risk tolerance, and timeline. Consider dividend-paying ETFs, bonds, and managed funds for income generation.",
      },
      {
        timeframe: "First year",
        title: "Update your estate plan",
        detail:
          "Your estate profile has changed significantly. Review your will, any family trust structures, testamentary trusts, and beneficiary nominations on super accounts. If the sale involved a family trust or company, confirm the distributable income position and whether any trust distribution elections are needed before 30 June.",
      },
    ],
    hubLinks: [
      { label: "Sell Business Hub", href: "/sell-business", description: "Business sale checklist and CGT concessions" },
      { label: "Tax Hub", href: "/tax", description: "Small business CGT concessions explained" },
      { label: "Lump Sum Investing", href: "/lump-sum-investing", description: "Investing a business sale windfall" },
      { label: "Super Hub", href: "/super", description: "Retirement Exemption and CGT cap amounts" },
    ],
    faqs: [
      {
        q: "What are the small business CGT concessions in Australia?",
        a: "There are four small business CGT concessions: (1) 15-Year Exemption — full CGT exemption if the business was actively owned for 15+ years and the owner is 55+ and retiring. (2) 50% Active Asset Reduction — reduces the capital gain by 50% (in addition to the general 50% CGT discount where applicable). (3) Retirement Exemption — up to $500,000 (lifetime) of the gain is exempt if contributed to super or held personally (over 55). (4) Rollover — defer CGT by reinvesting proceeds into another active business asset.",
      },
      {
        q: "What is the basic condition to access the small business CGT concessions?",
        a: "You must meet one of two basic conditions: (a) your aggregated annual turnover is less than $2 million (the small business entity test), or (b) the net value of assets owned by you and connected entities is less than $6 million (excluding your main residence and super). The asset being sold must also be an 'active asset' used in or inherently connected to the business.",
      },
      {
        q: "How much can I contribute to super from a business sale?",
        a: "Using the Retirement Exemption, you can contribute up to $500,000 (lifetime) into super as an exempt amount — outside the normal concessional and non-concessional caps. Additionally, there is a CGT cap contribution of $1.705M (FY2025-26) that allows certain small business proceeds to be contributed to super above the normal cap limits. These are highly time-sensitive elections — get tax advice before lodging your return.",
      },
    ],
  },
  {
    slug: "started-investing",
    headline: "You just started investing",
    subhead:
      "Starting your investment journey the right way — choosing an account structure, understanding tax implications, and picking a diversified starting point — saves years of undoing mistakes later.",
    advisorType: "financial adviser",
    advisorHref: "/advisors/financial-planners",
    actions: [
      {
        timeframe: "First 30 days",
        title: "Open a broker account",
        detail:
          "For most new Australian investors, a low-cost online broker with ASX and international market access is the starting point. Look for: brokerage under $10 per ASX trade, no inactivity fees, CHESS-sponsored holdings (you own shares directly, not via nominee), and a mobile app. Compare brokers at invest.com.au.",
      },
      {
        timeframe: "First 30 days",
        title: "Understand how your investments are taxed",
        detail:
          "Investment income is taxed in your hands. Dividends (including franking credits) are added to your income. Capital gains are taxed at your marginal rate, with a 50% discount for assets held 12+ months. Keep records of every purchase: date, price, brokerage cost. The ATO pre-fills some data but doesn't receive everything.",
      },
      {
        timeframe: "First 60 days",
        title: "Choose a simple, diversified starting point",
        detail:
          "Most first-time investors do well starting with 1–2 broad ETFs: a domestic ETF covering the ASX 200 (e.g. VAS, A200, STW) and a global ETF (e.g. VGS, IVV, IWLD). These provide instant diversification across hundreds of companies, low fees (MER under 0.20%), and ASX liquidity. You can add complexity as your knowledge grows.",
      },
      {
        timeframe: "First 90 days",
        title: "Maximise your super before adding more outside super",
        detail:
          "For most Australians, the best return on investment is maximising concessional super contributions first. At a 32.5% marginal rate, salary-sacrificing $10,000 into super saves $2,200 in tax immediately. ETF returns need to compound for years to match that day-one tax saving. Review your super contributions before building a large non-super portfolio.",
      },
      {
        timeframe: "Ongoing",
        title: "Automate and ignore the noise",
        detail:
          "Set up a regular buy (e.g. $500/month) into your chosen ETF(s). Automate the transfers. Avoid checking prices daily — it increases the likelihood of panic selling. Investors who check their portfolios less frequently earn better returns, according to behavioural finance research.",
      },
    ],
    hubLinks: [
      { label: "ETFs Hub", href: "/etfs", description: "Compare ASX ETFs by MER, yield, and asset class" },
      { label: "Super Hub", href: "/super", description: "Maximise super before investing outside" },
      { label: "Dividends Hub", href: "/dividends", description: "Franking credits and dividend investing" },
      { label: "Property Hub", href: "/property", description: "Property vs shares comparison" },
    ],
    faqs: [
      {
        q: "What is the best investment for beginners in Australia?",
        a: "Most financial advisers recommend starting with a diversified low-cost ETF tracking the ASX 200 (like VAS or A200) or a global index (like VGS or IVV). These provide instant diversification, low fees (MER under 0.20%), and are easy to buy and sell on the ASX. They are more tax-efficient than actively managed funds in most cases, and the evidence shows most active managers underperform their index over 10 years.",
      },
      {
        q: "Do I pay tax on ETF distributions in Australia?",
        a: "Yes. ETF distributions are taxed in the year you receive them. Australian-domiciled ETFs typically distribute quarterly or annually. The distribution includes ordinary income (dividends, interest), capital gains (short and long-term), and franking credits. You must include these in your tax return. The ETF provider sends an annual tax statement with the breakdown.",
      },
      {
        q: "Should I invest inside or outside super?",
        a: "Both. Super offers a concessional tax rate of 15% on earnings (vs your marginal rate outside super) and a 0% tax rate in pension phase — but you can't access the money until preservation age (60). Outside super, you can access funds at any time but pay your marginal rate on investment earnings and CGT on gains. The general rule: maximise concessional super first, then build wealth outside super.",
      },
    ],
  },
  {
    slug: "buying-first-home",
    headline: "You're buying your first home",
    subhead:
      "The first home purchase combines the biggest financial commitment most Australians make with a maze of grants, stamp duty concessions, LMI rules, and loan structures. Here's the sequencing.",
    advisorType: "mortgage broker",
    advisorHref: "/advisors/mortgage-brokers",
    actions: [
      {
        timeframe: "6–12 months before",
        title: "Build your deposit and check the First Home Guarantee",
        detail:
          "You need at least 5% genuine savings for most lenders. The First Home Guarantee (FHBG) lets eligible buyers purchase with 5% deposit and no LMI — the government guarantees the remaining 15%. Income caps apply ($125k single / $200k couple) and property price caps vary by state. Check eligibility at nhfic.gov.au. A 20% deposit avoids LMI entirely, saving $10,000–$40,000+.",
      },
      {
        timeframe: "3–6 months before",
        title: "Get pre-approval and understand your borrowing power",
        detail:
          "Mortgage pre-approval (also called conditional approval) tells you your borrowing limit before you bid. A licensed mortgage broker can compare 30+ lenders simultaneously and is paid by the lender — free to you. Avoid applying to multiple lenders directly: each credit inquiry reduces your credit score temporarily.",
      },
      {
        timeframe: "At purchase",
        title: "Check stamp duty concessions and first home buyer grants",
        detail:
          "Most states offer stamp duty exemptions or concessions for first home buyers under a price threshold. NSW offers a property tax opt-in alternative. VIC offers a full exemption under $600k. QLD exemption applies under $500k. Check your state revenue office for current thresholds. First Home Owner Grants ($10,000–$30,000) apply for new builds in most states.",
      },
      {
        timeframe: "At settlement",
        title: "Understand your mortgage structure",
        detail:
          "Choose between variable (offset access, flexibility) or fixed (repayment certainty, break fee risk) or a split. Ensure you have a 100% offset account on any variable portion — parking your savings in offset reduces daily interest charged. Review the comparison rate, not just the headline rate.",
      },
      {
        timeframe: "Ongoing",
        title: "Review your home loan every 2–3 years",
        detail:
          "New customers often get better rates than existing borrowers — the 'loyalty tax'. Set a calendar reminder to benchmark your rate every 2–3 years. A mortgage broker can refinance you to a lower rate when the savings exceed the switching costs (typically within 6–12 months on most switches).",
      },
    ],
    hubLinks: [
      { label: "First Home Buyer Hub", href: "/first-home-buyer", description: "Grants, FHSS, FHBG and stamp duty concessions" },
      { label: "Home Loans Hub", href: "/home-loans", description: "Compare variable, fixed, and investment loans" },
      { label: "FHSS Guide", href: "/first-home-buyer/fhss-guide", description: "Withdraw super contributions for a deposit" },
      { label: "Stamp Duty Guide", href: "/first-home-buyer/stamp-duty", description: "State-by-state concessions explained" },
    ],
    faqs: [
      {
        q: "What is the First Home Guarantee (FHBG)?",
        a: "The First Home Guarantee (formerly First Home Loan Deposit Scheme) allows eligible first home buyers to purchase with a 5% deposit without paying Lender's Mortgage Insurance (LMI). The government guarantees up to 15% of the loan. Income caps apply ($125,000 for singles, $200,000 for couples as of 2024–25) and property price caps vary by state and whether the property is in a capital city or regional area. Places are limited annually — apply early through a participating lender.",
      },
      {
        q: "How much stamp duty will I pay as a first home buyer?",
        a: "Each state and territory sets its own stamp duty concessions for first home buyers. Generally, properties under a certain threshold are exempt or discounted. NSW: exemption for properties under $800k (phased reduction up to $1M). VIC: full exemption under $600k, phased up to $750k. QLD: exemption under $500k (owner-occupier). WA: concession for properties under $430k. NSW also offers a Property Tax annual charge as an opt-in alternative to upfront stamp duty — useful if you plan to sell within 10–15 years.",
      },
      {
        q: "Should I use a mortgage broker or go to my bank?",
        a: "A mortgage broker accesses 30+ lenders including smaller banks that often beat Big 4 rates. They're paid by the lender — free to you. ASIC research shows brokers generate lower average interest rates than direct applicants. For first home buyers with complex situations (self-employed, irregular income, gifted deposits), a specialist broker is strongly recommended. invest.com.au cannot provide credit assistance — we refer you to licensed mortgage brokers.",
      },
      {
        q: "Can I use my superannuation for a first home deposit?",
        a: "Yes — via the First Home Super Saver Scheme (FHSS). You can make voluntary concessional or non-concessional contributions into super (above mandatory employer contributions) and later withdraw them for a first home deposit. The withdrawal cap is $50,000 (from 1 July 2022). Concessional contributions are taxed at 15% going in, but the associated earnings benefit from the super tax rate rather than your marginal rate. Apply for an FHSS determination through the ATO before signing a contract.", // dated-ok — FHSS $50k cap effective date, fixed historical change
      },
    ],
  },
];

const EVENT_MAP = new Map(EVENTS.map((e) => [e.slug, e]));

// ─── Static params ────────────────────────────────────────────────────────────

export function generateStaticParams() {
  return EVENTS.map((e) => ({ event: e.slug }));
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

type Props = { params: Promise<{ event: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { event } = await params;
  const e = EVENT_MAP.get(event);
  if (!e) return { robots: { index: false } };

  const title = `${e.headline}: Your financial checklist (${CURRENT_YEAR}) — ${SITE_NAME}`;
  const description = e.subhead;
  const canonical = `/just/${e.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: absoluteUrl(canonical),
      siteName: SITE_NAME,
    },
    twitter: { card: "summary" },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function JustEventPage({ params }: Props) {
  const { event } = await params;
  const e = EVENT_MAP.get(event);
  if (!e) notFound();

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Life events", url: absoluteUrl("/just") },
    { name: e.headline, url: absoluteUrl(`/just/${e.slug}`) },
  ]);

  const faqLd = faqJsonLd(e.faqs.map((f) => ({ q: f.q, a: f.a })));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}

      <div className="container-custom max-w-3xl py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-slate-400 mb-6 flex gap-1.5 flex-wrap">
          <Link href="/" className="hover:text-slate-600">Home</Link>
          <span>›</span>
          <Link href="/just" className="hover:text-slate-600">Life events</Link>
          <span>›</span>
          <span className="text-slate-600">{e.headline}</span>
        </nav>

        {/* Hero */}
        <header className="mb-10">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">
            Financial checklist · {CURRENT_YEAR}
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3">
            {e.headline}
          </h1>
          <p className="text-lg text-slate-500 leading-relaxed">{e.subhead}</p>
        </header>

        {/* Priority actions */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-slate-900 mb-5">
            What to do now — in order
          </h2>
          <div className="space-y-4">
            {e.actions.map((action, i) => (
              <div
                key={i}
                className="bg-white border border-slate-200 rounded-2xl p-5 flex gap-4"
              >
                <div className="shrink-0">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm">
                    {i + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap mb-1">
                    <h3 className="text-base font-bold text-slate-900">{action.title}</h3>
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium shrink-0">
                      {action.timeframe}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{action.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Related hubs */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            Relevant guides
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {e.hubLinks.map((hub) => (
              <Link
                key={hub.href}
                href={hub.href}
                className="flex flex-col gap-1 p-4 bg-white border border-slate-200 rounded-xl hover:border-emerald-300 hover:shadow-sm transition-all"
              >
                <span className="text-sm font-semibold text-slate-900">{hub.label}</span>
                <span className="text-xs text-slate-500">{hub.description}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Advisor CTA */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mb-12">
          <h2 className="text-base font-bold text-emerald-900 mb-1">
            Get personalised advice
          </h2>
          <p className="text-sm text-emerald-700 mb-4">
            The decisions above can have a significant long-term impact. A {e.advisorType} can
            model your specific numbers and make sure nothing falls through the gaps.
          </p>
          <Link
            href={e.advisorHref}
            className="inline-block bg-emerald-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Find a {e.advisorType.charAt(0).toUpperCase() + e.advisorType.slice(1)}
          </Link>
        </div>

        {/* FAQs */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            Frequently asked questions
          </h2>
          <div className="space-y-5">
            {e.faqs.map((faq) => (
              <div key={faq.q}>
                <h3 className="text-sm font-bold text-slate-900 mb-1">{faq.q}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Other events */}
        <section className="mb-10">
          <h2 className="text-base font-bold text-slate-700 mb-3">Other life events</h2>
          <div className="flex flex-wrap gap-2">
            {EVENTS.filter((ev) => ev.slug !== e.slug).map((ev) => (
              <Link
                key={ev.slug}
                href={`/just/${ev.slug}`}
                className="text-xs text-slate-500 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition-colors"
              >
                {ev.headline}
              </Link>
            ))}
          </div>
        </section>

        <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
      </div>
    </>
  );
}
