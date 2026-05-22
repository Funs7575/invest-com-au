/**
 * Seeded Q&A data for long-tail SEO question deep-dive pages.
 *
 * Each entry maps to a static RSC at /questions/[slug].
 * QA-01 seeds the first 20 high-traffic Australian investing questions.
 * QA-02 will extend to 50.
 *
 * Categories align with the platform's hub verticals so internal links
 * flow naturally from question pages into comparison pages and calculators.
 */

export type QuestionCategory =
  | "tax"
  | "super"
  | "property"
  | "investing"
  | "retirement"
  | "budgeting"
  | "business"
  | "crypto"
  | "insurance";

export interface QuestionFaq {
  q: string;
  a: string;
}

export interface RelatedTool {
  label: string;
  href: string;
}

export interface InvestingQuestion {
  slug: string;
  category: QuestionCategory;
  question: string;
  metaTitle: string;
  metaDescription: string;
  shortAnswer: string;
  sections: { heading: string; body: string }[];
  faqs: QuestionFaq[];
  relatedSlugs: string[];
  relatedTools?: RelatedTool[];
}

export const QUESTIONS: InvestingQuestion[] = [
  {
    slug: "how-does-negative-gearing-work",
    category: "tax",
    question: "How does negative gearing work in Australia?",
    metaTitle: "How Does Negative Gearing Work in Australia? (2026 Guide)",
    metaDescription:
      "Negative gearing explained: when an investment produces less income than its costs, you can offset the loss against your taxable income. Learn who it suits, the risks, and ATO rules.",
    shortAnswer:
      "Negative gearing occurs when your investment expenses (interest, depreciation, maintenance) exceed the income it produces. The net loss is deductible against your other taxable income, reducing your tax bill — but you still need cash flow to cover the shortfall.",
    sections: [
      {
        heading: "What is negative gearing?",
        body: "An investment is negatively geared when its deductible expenses exceed the income it earns. The resulting loss can be offset against your other income (such as salary) to reduce your tax payable. Property and shares are the two most common negatively geared assets in Australia.",
      },
      {
        heading: "How does the tax deduction work?",
        body: "The ATO allows you to deduct investment losses against your assessable income in the same financial year. For example, if your rental property earns $25,000 in rent but costs $38,000 in interest and expenses, the $13,000 net loss reduces your taxable income by $13,000. At a marginal rate of 37%, that saves you approximately $4,810 in tax — but you still paid $8,190 out of pocket to fund the shortfall.",
      },
      {
        heading: "What expenses are deductible?",
        body: "Deductible expenses include loan interest, property management fees, council rates, insurance, repairs and maintenance, depreciation on the building (Division 43 at 2.5% per year for properties built after 1987) and plant and equipment (Division 40). You cannot deduct the principal repayment component of your mortgage.",
      },
      {
        heading: "Negative gearing vs. positive gearing",
        body: "Positively geared properties earn more rent than they cost, producing assessable income. Neutral gearing is the break-even point. Most investors start negatively geared and aim for the property to become positively geared over time as rents rise while the fixed mortgage repayment remains constant.",
      },
      {
        heading: "Who does negative gearing suit?",
        body: "Negative gearing is most tax-effective for investors on marginal rates of 37% or 45% (incomes above $135,000 or $190,001 respectively in FY2026). The higher your marginal rate, the larger the after-tax subsidy on each dollar of loss. Low-income earners save less per dollar of loss — sometimes making positive gearing or super contributions a better option.",
      },
      {
        heading: "Key risks",
        body: "Negative gearing is a cash-flow burden: you must fund the shortfall from wages or savings each month regardless of market conditions. If interest rates rise significantly or the property sits vacant, the loss can become unmanageable. Capital growth — not tax savings alone — must be the primary investment thesis. The ATO has indicated it monitors negative gearing claims closely; keep thorough records.",
      },
    ],
    faqs: [
      {
        q: "Can I negatively gear shares?",
        a: "Yes. If you borrow to invest in shares and the dividends plus franking credits are less than the loan interest and associated costs, the net loss is deductible against your other income. Margin lending is the most common mechanism.",
      },
      {
        q: "What happens if I sell a negatively geared property at a profit?",
        a: "You will pay capital gains tax on the profit. If you hold the asset for more than 12 months, the 50% CGT discount applies (for individuals), so only half the gain is added to your assessable income.",
      },
      {
        q: "Is negative gearing legal?",
        a: "Yes. Negative gearing has been part of Australian tax law for decades. The ATO allows genuine investment losses to be offset against assessable income under the Income Tax Assessment Act 1997.",
      },
      {
        q: "Can I negatively gear a property overseas?",
        a: "Generally no. Foreign rental income and losses are quarantined under Division 7A and can only be offset against other foreign rental income, not Australian wages.",
      },
    ],
    relatedSlugs: [
      "how-does-depreciation-work-for-investment-property",
      "what-is-capital-gains-tax-discount",
      "should-i-pay-off-mortgage-or-invest",
    ],
    relatedTools: [
      { label: "Negative gearing calculator", href: "/negative-gearing/calculator" },
      { label: "Compare property investment platforms", href: "/property-platforms" },
    ],
  },
  {
    slug: "what-is-salary-sacrifice-super",
    category: "super",
    question: "What is salary sacrifice into super and how does it work?",
    metaTitle: "Salary Sacrifice Into Super Explained (Australia, FY2026)",
    metaDescription:
      "Salary sacrifice lets you divert pre-tax salary into super, taxed at 15% instead of your marginal rate. Learn the caps, Division 293, and whether it makes sense for your income.",
    shortAnswer:
      "Salary sacrifice is a pre-tax arrangement where your employer sends part of your gross salary directly to your super fund. The contribution is taxed at 15% inside super (concessional contributions tax), which is usually less than your marginal income tax rate.",
    sections: [
      {
        heading: "How salary sacrifice works",
        body: "You ask your employer to redirect a set amount from your pre-tax salary into your nominated super fund each pay cycle. That amount never reaches your bank account — it goes straight to super. Because it's a concessional (pre-tax) contribution, the fund pays 15% contributions tax on it rather than your marginal rate.",
      },
      {
        heading: "The concessional contributions cap",
        body: "For FY2026 the concessional cap is $30,000 per year. This includes your employer's SG contributions (11.5% of your ordinary time earnings). If your employer contributes $9,000 per year in SG, you can salary sacrifice up to $21,000 more before hitting the cap. Exceeding the cap means the excess is included in your assessable income and taxed at your marginal rate plus a charge.",
      },
      {
        heading: "Tax savings by income bracket",
        body: "At $90,000 salary (37% marginal rate) every $1 salary sacrificed saves 22¢ in tax (37% − 15%). At $200,000 (45% marginal rate) you save 30¢ per dollar. At $45,000 (19% marginal rate) you only save 4¢ per dollar, making salary sacrifice much less compelling at lower incomes.",
      },
      {
        heading: "Division 293 tax",
        body: "High-income earners (taxable income plus super contributions above $250,000) pay an additional 15% on concessional contributions via Division 293, bringing the total tax to 30%. This erodes the advantage, but the money is still in a 15%-tax environment for fund earnings, and the 50% CGT discount on assets held over 12 months still applies inside super.",
      },
      {
        heading: "Carry-forward contributions",
        body: "If your total super balance (TSB) is below $500,000 on 30 June of the prior year, you can carry forward unused concessional cap space from the past five financial years. This is particularly useful after a career break or a year with low SG contributions.",
      },
    ],
    faqs: [
      {
        q: "Does salary sacrifice reduce my employer's SG obligation?",
        a: "No. Under the SG Amnesty rules and modern legislation, your employer must calculate SG on your ordinary time earnings before salary sacrifice is applied. Salary sacrifice cannot reduce the SG base.",
      },
      {
        q: "Can self-employed people salary sacrifice?",
        a: "Self-employed individuals can't salary sacrifice in the traditional sense because there is no employer to process the arrangement. Instead, they can make personal deductible contributions (PDCs) — contributing after-tax money and then claiming a deduction — which achieves a similar outcome.",
      },
      {
        q: "What is the difference between salary sacrifice and after-tax contributions?",
        a: "Salary sacrifice contributions come from pre-tax income (concessional). After-tax (non-concessional) contributions come from already-taxed income and are not taxed again when they enter the fund, but they also cannot be deducted from your assessable income.",
      },
    ],
    relatedSlugs: [
      "what-is-concessional-contribution",
      "what-is-the-super-guarantee-rate-fy2026",
      "how-does-compound-interest-work",
    ],
    relatedTools: [
      { label: "Super contributions calculator", href: "/super-contributions-calculator" },
      { label: "Compare super funds", href: "/super" },
    ],
  },
  {
    slug: "should-i-pay-off-mortgage-or-invest",
    category: "investing",
    question: "Should I pay off my mortgage or invest?",
    metaTitle: "Pay Off Mortgage vs. Invest: Which Is Better? (Australia 2026)",
    metaDescription:
      "Comparing extra mortgage repayments vs investing: the maths, risk profile, psychological factors, and the blended approach most Australians use.",
    shortAnswer:
      "Mathematically, it depends on whether your expected after-tax investment return exceeds your mortgage interest rate. But risk tolerance, tax position, and psychology matter just as much as the numbers.",
    sections: [
      {
        heading: "The core maths",
        body: "A guaranteed return equals your mortgage interest rate when you pay down principal. If your rate is 6.5%, paying $1,000 extra saves $65 of interest per year — a guaranteed, risk-free 6.5% return. To justify investing instead, your expected after-tax investment return must exceed 6.5% with enough consistency to justify the volatility.",
      },
      {
        heading: "The case for paying off the mortgage first",
        body: "Guaranteed return at your mortgage rate. No sequence-of-returns risk. Psychological value of reducing debt. Frees up cash flow once paid off, which can then be invested aggressively. For owner-occupiers there are no tax deductions on the interest — unlike investment properties — so the full rate is the hurdle.",
      },
      {
        heading: "The case for investing first",
        body: "Historical long-run equity returns (7–10% real) have exceeded typical mortgage rates in most 10+ year windows. Super's 15% tax environment can amplify returns. Early investing benefits from compounding over a longer horizon. Mortgage payments act as forced saving, so adding super contributions on top builds wealth from two directions simultaneously.",
      },
      {
        heading: "Tax matters",
        body: "Super concessional contributions may save you more than mortgage principal repayments if you're on a high marginal rate. For example, at 37% you save 22¢ per dollar on salary sacrifice into super (37% − 15%). That's an immediate return even before the fund earns anything. Investment properties allow interest deductibility, changing the calculus — but owner-occupier debt is non-deductible.",
      },
      {
        heading: "The blended approach",
        body: "Most financial advisers recommend a split: maintain minimum mortgage repayments to stay on track for payoff, contribute enough to super to maximise any employer matching and SG top-ups, then allocate surplus cash to whichever lever has the highest after-tax return at your current rate. Review annually as your balance, rate, and risk tolerance change.",
      },
    ],
    faqs: [
      {
        q: "Does the offset account strategy change the comparison?",
        a: "Yes. An offset account reduces the interest charged on your mortgage, effectively giving the same return as paying down principal — but the money remains accessible. This makes offset accounts a popular middle ground: you get the mortgage-rate return but retain liquidity to invest or redraw for emergencies.",
      },
      {
        q: "Should I pay off my mortgage before investing in shares?",
        a: "If your mortgage rate is above your expected after-tax share return, prioritise the mortgage. If you have high-interest debt (credit cards, personal loans), always clear those first. Many Australians do both in parallel once high-rate debt is eliminated.",
      },
      {
        q: "What about investment property debt vs. paying off a home loan?",
        a: "Investment loan interest is tax-deductible, so the after-tax rate is lower (e.g. at 37% marginal rate, 6.5% interest costs you 4.1% after tax). This often makes investment debt a lower priority to repay than owner-occupier debt at the same nominal rate.",
      },
    ],
    relatedSlugs: [
      "how-does-negative-gearing-work",
      "how-does-compound-interest-work",
      "what-is-salary-sacrifice-super",
    ],
    relatedTools: [
      { label: "Compound interest calculator", href: "/compound-interest-calculator" },
      { label: "Mortgage calculator", href: "/mortgage-calculator" },
    ],
  },
  {
    slug: "how-does-franking-credit-work",
    category: "tax",
    question: "How do franking credits work in Australia?",
    metaTitle: "How Do Franking Credits Work? Complete Guide (Australia 2026)",
    metaDescription:
      "Franking credits represent the 30% company tax already paid on dividends. Shareholders use them to offset income tax — and in some cases receive a refund. Learn the mechanics and eligibility rules.",
    shortAnswer:
      "When an Australian company pays a dividend, it may attach franking credits representing the 30% corporate tax already paid on that income. Shareholders include both the dividend and the credit in their assessable income, then offset the credit against their tax bill — potentially receiving a refund if the credit exceeds their liability.",
    sections: [
      {
        heading: "Why franking credits exist",
        body: "Australia's imputation system (introduced in 1987) prevents double taxation of company profits. Without it, profits are taxed at 30% at the company level and again at your marginal rate when distributed. Franking credits pass the tax already paid to shareholders, so you only pay tax on the net difference.",
      },
      {
        heading: "Fully franked vs. partially franked",
        body: "A fully franked dividend means the company has paid full 30% corporate tax on the profits. A partially franked dividend means only a portion was taxed at the company level (e.g. because some income was earned offshore). An unfranked dividend carries no credits and is taxed entirely at your marginal rate.",
      },
      {
        heading: "How to calculate the tax impact",
        body: "If you receive a $700 fully franked dividend from a company that paid 30% tax, the grossed-up amount is $1,000 ($700 ÷ 0.70). You include $1,000 in assessable income and receive a $300 franking credit offset. If your marginal rate is 32.5%, your tax on $1,000 is $325. Subtracting the $300 credit, you owe $25. If your rate is below 30% you receive a refund of the difference.",
      },
      {
        heading: "Refundability for low-income earners",
        body: "Since 2000, franking credits are fully refundable if they exceed your total tax liability. Retirees in the zero-tax threshold, low-income earners, and SMSFs in pension phase (0% tax) can therefore receive the entire franking credit as a cash refund from the ATO.",
      },
      {
        heading: "Super funds and franking credits",
        body: "Accumulation-phase SMSFs pay 15% tax on fund income. A fully franked dividend's 30% credit significantly exceeds this, so the fund receives a substantial refund — one reason Australian equities are popular SMSF holdings.",
      },
    ],
    faqs: [
      {
        q: "Do I need to be an Australian resident to claim franking credits?",
        a: "Generally yes. Non-residents are not entitled to franking credit offsets. Some tax treaties provide partial relief, but the full refundability of credits is an Australian-resident benefit.",
      },
      {
        q: "What is the 45-day rule for franking credits?",
        a: "To be eligible for the franking credit offset you must hold the shares at risk for at least 45 days around the ex-dividend date (90 days for preference shares). This rule prevents dividend stripping — buying shares just before the dividend to capture the credit then selling immediately.",
      },
      {
        q: "Are ETF dividends franked?",
        a: "They can be. Australian equity ETFs pass through the weighted average franking level of their portfolio. Broad-market Australian ETFs often distribute dividends that are 60–75% franked depending on the year and sector mix.",
      },
    ],
    relatedSlugs: [
      "how-do-franking-credits-work-in-super",
      "what-is-capital-gains-tax-discount",
      "what-is-the-difference-between-etf-and-managed-fund",
    ],
    relatedTools: [
      { label: "Dividend reinvestment calculator", href: "/dividend-reinvestment-calculator" },
      { label: "Compare share brokers", href: "/share-trading" },
    ],
  },
  {
    slug: "what-is-concessional-contribution",
    category: "super",
    question: "What is a concessional super contribution?",
    metaTitle: "Concessional Super Contributions Explained (FY2026)",
    metaDescription:
      "Concessional contributions are before-tax super contributions taxed at 15% instead of your marginal rate. Learn the $30,000 cap, carry-forward rules, and how to make personal deductible contributions.",
    shortAnswer:
      "Concessional contributions are before-tax (pre-tax) super contributions — including employer SG, salary sacrifice, and personal deductible contributions — taxed at a flat 15% contributions tax inside your super fund rather than at your marginal income tax rate.",
    sections: [
      {
        heading: "Types of concessional contributions",
        body: "There are three types: (1) Employer SG contributions — mandatory 11.5% of ordinary time earnings in FY2026. (2) Salary sacrifice — pre-tax salary directed to super by arrangement with your employer. (3) Personal deductible contributions — after-tax money contributed personally and then claimed as a tax deduction.",
      },
      {
        heading: "The $30,000 cap (FY2026)",
        body: "The annual concessional cap is $30,000 for FY2026. This covers all three types combined. If your employer contributes $12,000 in SG, you can salary sacrifice or make personal deductible contributions of up to $18,000 before hitting the cap. Exceeding the cap triggers 'excess concessional contributions', which are included in your assessable income and taxed at your marginal rate minus a 15% tax offset (to account for the contributions tax already paid).",
      },
      {
        heading: "Carry-forward unused cap",
        body: "Since 1 July 2019, individuals with a total super balance below $500,000 at the prior 30 June can carry forward up to five years of unused concessional cap space. This allows a large catch-up contribution in a high-income year or after a period of part-time work.",
      },
      {
        heading: "How personal deductible contributions work",
        body: "Make a contribution from your bank account (after-tax money), then submit a 'notice of intent to claim a deduction' to your fund before lodging your tax return. The fund withholds 15% contributions tax. You claim the full contribution as a tax deduction. Effective tax rate on the income that funded the contribution becomes 15%.",
      },
    ],
    faqs: [
      {
        q: "What is the difference between concessional and non-concessional contributions?",
        a: "Concessional contributions are pre-tax (before income tax) and are taxed at 15% inside the fund. Non-concessional contributions are after-tax (already taxed income) and are not taxed again when they enter the fund. The non-concessional cap is $120,000 per year in FY2026.",
      },
      {
        q: "Can I make concessional contributions above the cap?",
        a: "You can contribute above the cap, but the excess is included in your assessable income taxed at your marginal rate (minus a 15% tax offset). You also have the option to withdraw the excess from super to pay the tax, or leave it in (it will count toward your non-concessional cap).",
      },
      {
        q: "When does the carry-forward concessional cap apply?",
        a: "It applies from 1 July 2019. You can carry forward unused cap from up to 5 previous years. Your total super balance must be below $500,000 on 30 June of the year before you make the catch-up contribution. Your fund reports your annual contributions to the ATO which tracks your available unused cap.",
      },
    ],
    relatedSlugs: [
      "what-is-salary-sacrifice-super",
      "what-is-the-super-guarantee-rate-fy2026",
      "what-is-smsf-and-is-it-worth-it",
    ],
    relatedTools: [
      { label: "Super contributions calculator", href: "/super-contributions-calculator" },
      { label: "Compare super funds", href: "/super" },
    ],
  },
  {
    slug: "how-does-compound-interest-work",
    category: "investing",
    question: "How does compound interest work?",
    metaTitle: "How Compound Interest Works — With Australian Examples (2026)",
    metaDescription:
      "Compound interest means earning returns on your returns. Learn the formula, the Rule of 72, how it applies to super, savings accounts, and why starting early matters.",
    shortAnswer:
      "Compound interest is earning interest (or returns) on your accumulated interest as well as your original principal. Over time, the growth accelerates exponentially — which is why starting earlier and reinvesting returns is more powerful than contributing larger amounts later.",
    sections: [
      {
        heading: "The formula",
        body: "A = P(1 + r/n)^(nt), where A is the final amount, P is the principal, r is the annual interest rate (as a decimal), n is the number of compounding periods per year, and t is the number of years. For monthly compounding at 6% per year on $10,000 over 10 years: A = $10,000 × (1 + 0.06/12)^(12×10) = $18,194.",
      },
      {
        heading: "The Rule of 72",
        body: "Divide 72 by the annual return rate to estimate how many years it takes to double your money. At 6%, your money doubles in roughly 12 years (72 ÷ 6). At 8%, it doubles in 9 years. This rule works well for rates between 4% and 12%.",
      },
      {
        heading: "Compound returns in super",
        body: "Your super fund reinvests earnings — dividends, interest, and capital gains — rather than paying them out. Over 30 years at 7% per year, $100,000 grows to approximately $761,000 without adding another dollar. The Australian median super balance at retirement is around $300,000 for men and $180,000 for women (ASFA, 2025) — starting earlier makes a significant difference.",
      },
      {
        heading: "Early vs. late investing",
        body: "Invest $500/month from age 25 to 35 (10 years, $60,000 total), then stop. At 7% annual return it grows to approximately $602,000 by age 65. Start at 35 and invest $500/month all the way to 65 (30 years, $180,000 total). You end up with approximately $567,000. Starting 10 years earlier with less money beats contributing three times as much later.",
      },
    ],
    faqs: [
      {
        q: "What is the difference between simple interest and compound interest?",
        a: "Simple interest is calculated only on the original principal. Compound interest is calculated on the principal plus any accumulated interest. For a $10,000 deposit at 5% for 10 years: simple interest gives $15,000; compound interest (annual compounding) gives $16,289.",
      },
      {
        q: "Do savings accounts use compound interest?",
        a: "Most Australian savings accounts compound daily and credit interest monthly. A 5% per annum rate compounded daily effectively earns 5.13% annualised (the effective annual rate). High-interest savings accounts, term deposits, and offset accounts all use compounding.",
      },
      {
        q: "Does compound interest apply to share market investments?",
        a: "Yes, in the form of total return compounding. Dividends reinvested (via a DRP) buy more shares, which pay more dividends, which buy more shares. This is sometimes called 'dividend compounding'. Capital growth also compounds: a share worth $10 that grows 10% per year is worth $25.94 after 10 years, not $20.",
      },
    ],
    relatedSlugs: [
      "what-is-salary-sacrifice-super",
      "what-is-the-difference-between-etf-and-managed-fund",
      "should-i-pay-off-mortgage-or-invest",
    ],
    relatedTools: [
      { label: "Compound interest calculator", href: "/compound-interest-calculator" },
      { label: "FIRE calculator", href: "/fire-calculator" },
    ],
  },
  {
    slug: "what-is-smsf-and-is-it-worth-it",
    category: "super",
    question: "What is an SMSF and is it worth it?",
    metaTitle: "What Is an SMSF and Is It Worth It? (Australia 2026)",
    metaDescription:
      "Self-managed super funds give you control over investment choices but come with serious compliance obligations. Learn the cost threshold, trustee duties, and whether an SMSF suits your balance.",
    shortAnswer:
      "A self-managed super fund (SMSF) is a private superannuation fund with up to six members where the members are also the trustees. It provides investment flexibility (property, direct shares, unlisted assets) but requires ongoing compliance work and is generally cost-effective only above $200,000–$500,000.",
    sections: [
      {
        heading: "What an SMSF allows",
        body: "SMSFs can invest in direct residential and commercial property (subject to strict rules), listed and unlisted shares, term deposits, bonds, ETFs, gold, artwork (held for investment not personal use), and limited recourse borrowing arrangements (LRBAs) to fund property purchases. Members collectively set the investment strategy.",
      },
      {
        heading: "Trustee obligations",
        body: "All SMSF members must be trustees (or directors of the corporate trustee). Trustees are personally liable for compliance failures. Key obligations include annual auditing by an approved SMSF auditor, annual tax returns lodged with the ATO, maintaining the investment strategy document, and ensuring the fund is maintained solely for retirement purposes (the sole purpose test).",
      },
      {
        heading: "Annual costs",
        body: "SMSF running costs include accounting and tax return ($1,500–$4,000/year), independent audit ($400–$800), ASIC annual fee for corporate trustee ($56/year from 1 July 2025), and fund administration software ($200–$1,000/year). Total minimum cost is typically $3,000–$5,000/year. Most APRA-regulated industry funds charge approximately 0.5–0.8% annually on a $300,000 balance ($1,500–$2,400), so SMSFs start to become cost-competitive above approximately $300,000–$500,000.",
      },
      {
        heading: "The ATO's minimum balance guidance",
        body: "The ATO recommends a minimum balance of $200,000 based on its cost analysis, but notes that $500,000+ is a more reliable cost-competitive threshold after accounting for the opportunity cost of time spent on administration and the risk of non-compliance.",
      },
      {
        heading: "Borrowing inside an SMSF",
        body: "SMSFs can borrow to purchase property through a Limited Recourse Borrowing Arrangement (LRBA). The property is held in a separate bare trust until the loan is paid off. The ATO scrutinises LRBAs closely, particularly for related-party transactions. Interest rates on SMSF loans are typically 1–2% higher than standard investment loans.",
      },
    ],
    faqs: [
      {
        q: "Can I live in a property owned by my SMSF?",
        a: "No. You (or any related party) cannot reside in residential property held by your SMSF. This violates the sole purpose test. The prohibition applies both before and after retirement — the property must be sold or transferred out of the fund (and CGT considered) before you can live in it.",
      },
      {
        q: "Can my SMSF buy property from me?",
        a: "Not directly for residential property — you cannot sell your own home to your SMSF. Business real property (commercial premises) can be acquired from a related party at market value, which is a key strategy for small business owners wanting to hold their business premises inside super.",
      },
      {
        q: "What happens if I breach SMSF rules?",
        a: "The ATO can apply administrative penalties (up to $18,000 per trustee per contravention), make the fund non-complying (effectively taxing all fund assets at 45%), or in serious cases refer the matter to the Australian Federal Police. The consequences are severe and irreversible in many cases.",
      },
    ],
    relatedSlugs: [
      "what-is-concessional-contribution",
      "how-does-depreciation-work-for-investment-property",
      "what-is-the-super-preservation-age",
    ],
    relatedTools: [
      { label: "SMSF calculator", href: "/smsf-calculator" },
      { label: "SMSF setup guide", href: "/smsf/setup" },
    ],
  },
  {
    slug: "what-is-the-super-guarantee-rate-fy2026",
    category: "super",
    question: "What is the super guarantee (SG) rate for FY2026?",
    metaTitle: "Super Guarantee Rate FY2026: What Employers Must Pay",
    metaDescription:
      "The Superannuation Guarantee rate is 11.5% for FY2026 (1 July 2025 to 30 June 2026), rising to 12% from 1 July 2026. Learn who it applies to, how it's calculated, and the contribution timing rules.",
    shortAnswer:
      "The SG rate is 11.5% of an employee's ordinary time earnings (OTE) for FY2026. It rises to 12% from 1 July 2026 and stays at 12% permanently under current legislation.",
    sections: [
      {
        heading: "SG rate schedule",
        body: "The SG rate increased from 11% to 11.5% on 1 July 2024, and will increase to 12% on 1 July 2026. The legislated schedule ends at 12% with no further increases planned. These rates apply to employees earning more than $450 per month (the threshold was removed from 1 July 2022).",
      },
      {
        heading: "What counts as ordinary time earnings?",
        body: "OTE includes your base salary, shift loadings, regular bonuses, and allowances for normal working hours. It excludes overtime, expense reimbursements, termination payments (except annual leave on termination), and workers compensation payments. Your payslip may show SG calculated on a slightly different base than your total gross pay.",
      },
      {
        heading: "SG payment deadlines",
        body: "Employers must pay SG contributions by the 28th day after the end of each quarter: Q1 (1 July–30 September) due 28 October; Q2 (1 October–31 December) due 28 January; Q3 (1 January–31 March) due 28 April; Q4 (1 April–30 June) due 28 July. Late payments trigger the Superannuation Guarantee Charge (SGC), which includes the shortfall, interest (10% pa), and an administration fee.",
      },
      {
        heading: "Checking your super is being paid",
        body: "Log in to your super fund's member portal or myGov to view contribution history. Cross-reference dates and amounts with your payslips. Employers must pay super quarterly at minimum (many pay monthly). If you haven't seen contributions for a quarter, contact your employer first, then the ATO via the 'report unpaid super' online form.",
      },
    ],
    faqs: [
      {
        q: "Does SG apply to contractors?",
        a: "It depends. If a contractor is engaged substantially for their personal labour (not providing a result via a business), the payer may have an SG obligation. The ATO's 'employee or contractor?' decision tool at ato.gov.au can help assess the specific arrangement.",
      },
      {
        q: "Can my employer count salary sacrifice contributions toward SG?",
        a: "No. Since 1 January 2020, salary sacrifice contributions cannot be used to reduce an employer's SG obligations. SG must be paid in full on top of any salary sacrifice arrangement.",
      },
      {
        q: "What if my employer pays SG late?",
        a: "Your employer owes the ATO the Superannuation Guarantee Charge (SGC) which includes the unpaid contributions, interest at 10% per annum, and a $20 per employee administration component. The SGC is not tax-deductible for the employer, creating a financial incentive to pay on time.",
      },
    ],
    relatedSlugs: [
      "what-is-concessional-contribution",
      "what-is-salary-sacrifice-super",
      "what-is-the-super-preservation-age",
    ],
  },
  {
    slug: "how-much-should-i-have-in-emergency-fund",
    category: "budgeting",
    question: "How much should I have in an emergency fund?",
    metaTitle: "Emergency Fund: How Much Do You Need? (Australia 2026)",
    metaDescription:
      "Most Australians should hold 3–6 months of essential expenses in a high-interest savings account. Learn how to calculate your target, where to hold it, and when to rebuild it.",
    shortAnswer:
      "The standard recommendation is 3–6 months of essential living expenses held in a liquid, accessible account. For Australians with variable income, freelance work, or a single income household, 6 months is a safer target.",
    sections: [
      {
        heading: "Why you need an emergency fund",
        body: "An emergency fund prevents you from selling investments at the wrong time (forced selling), running up high-interest debt (credit cards, personal loans), or being unable to cover essential expenses during a gap in income. It also gives you the psychological security to take on appropriate investment risk.",
      },
      {
        heading: "How to calculate your target",
        body: "Add up your essential monthly expenses: rent or mortgage, utilities, food, transport, insurance, minimum debt repayments. Multiply by 3 (minimum) to 6 (recommended). For a household spending $5,000/month on essentials, the target range is $15,000–$30,000.",
      },
      {
        heading: "Where to hold it",
        body: "A high-interest savings account (HISA) earns a competitive rate while keeping funds accessible within 24 hours. As of May 2026, the best HISA rates are around 5.25–5.5% pa on balances up to $250,000. Term deposits offer higher rates but lock funds away; avoid using TDs for your emergency fund unless you have a separate buffer. An offset account attached to your mortgage also works — the interest saving equals the HISA rate net of tax.",
      },
    ],
    faqs: [
      {
        q: "Should I use my offset account as my emergency fund?",
        a: "Yes, for most owner-occupiers an offset account is ideal: you earn a return equivalent to your mortgage rate (currently 6–7%), there is no tax on the 'interest saved', and funds are accessible via redraw (though redraw can be slower than a savings account). Confirm your loan's redraw terms before relying on it for emergencies.",
      },
      {
        q: "Should I invest my emergency fund instead?",
        a: "No. Emergency funds must be liquid and stable. Investing in shares or property means your fund could be worth 30–40% less the moment you need it most (downturns coincide with job losses). Keep emergency savings separate from your investment portfolio.",
      },
      {
        q: "Once I have an emergency fund, then what?",
        a: "Generally: pay off high-interest debt, then maximise super contributions up to the concessional cap, then invest surplus in a diversified portfolio (ETFs, managed funds, or direct property). The emergency fund is the foundation; investing is built on top of it.",
      },
    ],
    relatedSlugs: [
      "should-i-pay-off-mortgage-or-invest",
      "how-does-compound-interest-work",
      "what-is-salary-sacrifice-super",
    ],
    relatedTools: [
      { label: "Compare savings accounts", href: "/savings" },
      { label: "Compare term deposits", href: "/term-deposits" },
    ],
  },
  {
    slug: "what-is-capital-gains-tax-discount",
    category: "tax",
    question: "What is the capital gains tax (CGT) discount in Australia?",
    metaTitle: "Capital Gains Tax Discount Explained (Australia 2026)",
    metaDescription:
      "Individuals who hold an asset for more than 12 months pay CGT on only 50% of the capital gain. Learn how the discount works, who qualifies, and how super and trusts are treated differently.",
    shortAnswer:
      "Australian individuals (including partners in partnerships and beneficiaries of trusts) are entitled to a 50% discount on capital gains if they have held the asset for more than 12 months before selling. Super funds receive a one-third discount (33.33%). Companies receive no discount.",
    sections: [
      {
        heading: "How the discount works",
        body: "If you sell an asset held for more than 12 months and make a capital gain of $100,000, you include only $50,000 in your assessable income. At a 37% marginal rate, you pay $18,500 in CGT instead of $37,000. The effective CGT rate for an individual on 37% is therefore 18.5% on gains from assets held longer than 12 months.",
      },
      {
        heading: "Assets that qualify",
        body: "The 12-month rule applies to shares, ETFs, investment properties, collectibles, foreign currency, and most other CGT assets. It does not apply to assets held as trading stock, property developed for sale, or assets acquired before 20 September 1985 (pre-CGT assets).",
      },
      {
        heading: "The 12-month clock",
        body: "The clock starts on the date of acquisition (contract date for shares and property, not settlement date). You must hold the asset at risk for the full 12 months. The ATO may disallow the discount if hedging or put options effectively transfer the risk of ownership to another party during the 12-month window.",
      },
      {
        heading: "Super funds and the CGT discount",
        body: "Accumulation-phase super funds pay 15% tax on fund income and receive a one-third CGT discount on assets held over 12 months, giving an effective CGT rate of 10% on long-term gains. Pension-phase super assets are tax-free on earnings and capital gains under the current law.",
      },
      {
        heading: "CGT and capital losses",
        body: "Capital losses must be applied before the 50% discount reduces the gain. You cannot choose to defer a capital loss to a later year to maximise the discount. Net capital losses can be carried forward indefinitely but can only be applied against future capital gains, not against ordinary income.",
      },
    ],
    faqs: [
      {
        q: "Do trusts receive the CGT discount?",
        a: "A trust itself doesn't pay CGT; instead gains are distributed to beneficiaries. Individual beneficiaries can apply the 50% discount if the trust held the asset for more than 12 months. The trust deed and distribution resolution must correctly stream the capital gain to the eligible beneficiary.",
      },
      {
        q: "Does the CGT discount apply to cryptocurrency?",
        a: "Yes. Cryptocurrency is a CGT asset under Australian tax law. If you hold crypto for more than 12 months and sell at a profit, the 50% discount applies. Short-term trading gains are fully assessable. Mining, staking rewards, and DeFi income are taxed as ordinary income when received.",
      },
      {
        q: "What is the CGT discount for non-residents?",
        a: "Non-residents became ineligible for the CGT discount on property purchased after 8 May 2012 and all other assets from 12 May 2010. Non-resident individuals pay CGT on 100% of the capital gain from Australian assets.",
      },
    ],
    relatedSlugs: [
      "how-does-negative-gearing-work",
      "how-does-franking-credit-work",
      "what-is-the-principal-place-of-residence-cgt-exemption",
    ],
    relatedTools: [
      { label: "CGT calculator", href: "/cgt-calculator" },
      { label: "Property vs shares calculator", href: "/property-vs-shares-calculator" },
    ],
  },
  {
    slug: "how-does-dollar-cost-averaging-work",
    category: "investing",
    question: "How does dollar-cost averaging work?",
    metaTitle: "Dollar-Cost Averaging (DCA) Explained for Australian Investors",
    metaDescription:
      "Dollar-cost averaging means investing a fixed amount on a regular schedule regardless of price. Learn when DCA outperforms lump-sum investing, when it doesn't, and how to automate it.",
    shortAnswer:
      "Dollar-cost averaging (DCA) means investing a fixed dollar amount at regular intervals — fortnightly, monthly, or quarterly — regardless of the market price. You buy more units when prices are low and fewer when prices are high, smoothing your average purchase cost over time.",
    sections: [
      {
        heading: "How DCA works in practice",
        body: "Invest $500/month into a broad-market ETF. In January the ETF trades at $50 so you buy 10 units. In February it drops to $40 so you buy 12.5 units. In March it recovers to $45 so you buy 11.1 units. Your average cost is $43.75 per unit even though the average price over those months was $45. You bought more units when the price was lower.",
      },
      {
        heading: "DCA vs. lump-sum investing",
        body: "Research (including Vanguard's 2012 paper on US data) consistently shows that lump-sum investing outperforms DCA approximately two-thirds of the time over 12-month windows in rising markets. This makes sense: markets spend more time going up than down. However, DCA outperforms in falling or volatile markets, and is psychologically easier to maintain. If you are investing a lump sum from a windfall, DCA over 3–6 months is a reasonable compromise.",
      },
      {
        heading: "When DCA is appropriate",
        body: "DCA is natural when investing from regular income (salary, rent). It is not a market-timing strategy — it removes the need to time entry. It suits index fund investing where the goal is long-run participation. It is less suited to assets with high transaction costs (each purchase attracts brokerage) or to tax-harvesting strategies.",
      },
    ],
    faqs: [
      {
        q: "Does dollar-cost averaging reduce risk?",
        a: "DCA reduces timing risk — the risk of investing a lump sum at a market peak. It does not reduce the underlying risk of the asset class. A DCA strategy into a permanently declining asset will still produce losses.",
      },
      {
        q: "How often should I invest with DCA?",
        a: "Weekly, fortnightly, or monthly are all common cadences for Australian investors using micro-investing apps or brokerage platforms with low or no brokerage. Quarterly is better if brokerage is more than 0.1% of each investment amount.",
      },
      {
        q: "Is salary sacrifice into super a form of dollar-cost averaging?",
        a: "Yes. Each pay cycle, your employer (or salary sacrifice arrangement) directs a fixed amount into your super fund, which buys more units when the fund's unit price is low and fewer when it is high. This is one reason regular super contributions are a powerful long-term wealth-building tool.",
      },
    ],
    relatedSlugs: [
      "how-does-compound-interest-work",
      "what-is-the-difference-between-etf-and-managed-fund",
      "should-i-pay-off-mortgage-or-invest",
    ],
    relatedTools: [
      { label: "Compound interest calculator", href: "/compound-interest-calculator" },
      { label: "Compare share brokers", href: "/share-trading" },
    ],
  },
  {
    slug: "what-is-the-difference-between-etf-and-managed-fund",
    category: "investing",
    question: "What is the difference between an ETF and a managed fund?",
    metaTitle: "ETF vs. Managed Fund: What Is the Difference? (Australia 2026)",
    metaDescription:
      "ETFs trade on the ASX like shares, while managed funds transact at end-of-day NAV. Compare costs, tax efficiency, minimum investments, and trading flexibility.",
    shortAnswer:
      "ETFs (exchange-traded funds) are bought and sold on the ASX throughout the trading day at live market prices, while managed funds transact at the end-of-day net asset value (NAV) directly with the fund manager. Both provide diversified exposure, but ETFs are generally cheaper, more tax-efficient for CGT, and more flexible.",
    sections: [
      {
        heading: "How ETFs work",
        body: "An ETF holds a basket of assets (shares, bonds, commodities) and issues units that are listed and traded on the ASX. You buy and sell units through a share broker at market prices during trading hours, paying brokerage and the bid-ask spread. Most broad-market ETFs are passively managed, tracking an index such as the ASX 200 or the MSCI World.",
      },
      {
        heading: "How managed funds work",
        body: "Managed funds accept applications and redemptions at a price calculated after the market closes each business day (the NAV). You deal directly with the fund manager or a platform, typically with a minimum initial investment of $5,000–$25,000. Active managed funds employ portfolio managers to select securities; some are available on platforms at lower minimums.",
      },
      {
        heading: "Cost comparison",
        body: "Index ETFs typically charge management expense ratios (MERs) of 0.03%–0.20% per year. Comparable unlisted index managed funds charge 0.10%–0.40%. Active managed funds charge 0.40%–1.50% plus sometimes a performance fee. Brokerage applies to ETF trades (typically $5–$20 or 0.1% online), but not to managed fund applications/redemptions (though platforms charge an administration fee).",
      },
      {
        heading: "Tax efficiency",
        body: "ETFs are generally more tax-efficient because portfolio managers rarely need to sell holdings to fund investor redemptions (other investors buy your units on-market). Unlisted managed funds must sell portfolio assets when investors redeem, potentially creating taxable capital gains that are distributed to all remaining investors regardless of their personal holding period.",
      },
    ],
    faqs: [
      {
        q: "Can I hold ETFs in my SMSF?",
        a: "Yes. ETFs are one of the most popular SMSF investment types. They provide diversification, low cost, and simplicity for trustees who want a passive approach. SMSF platforms like Selfwealth, Commsec, and Stake all support ETF trading.",
      },
      {
        q: "What is a listed investment company (LIC) — is it the same as an ETF?",
        a: "No. A LIC is a closed-end structure that issues a fixed number of shares at IPO. Unlike ETFs, the share price can trade at a premium or discount to the underlying NTA. LICs are also typically actively managed. ETFs use a creation-redemption mechanism that keeps the price close to the underlying asset value.",
      },
      {
        q: "Are there active ETFs?",
        a: "Yes. Active ETFs list on the ASX like index ETFs but are managed by portfolio managers who make active investment decisions. They charge higher MERs than index ETFs (typically 0.40%–0.80%). Magellan, Perpetual, and Betashares offer active ETFs on the ASX.",
      },
    ],
    relatedSlugs: [
      "how-does-franking-credit-work",
      "how-does-dollar-cost-averaging-work",
      "what-is-capital-gains-tax-discount",
    ],
    relatedTools: [
      { label: "Compare share brokers", href: "/share-trading" },
      { label: "Compare ETFs", href: "/etfs" },
    ],
  },
  {
    slug: "how-do-franking-credits-work-in-super",
    category: "super",
    question: "How do franking credits work inside super?",
    metaTitle: "Franking Credits in Super Funds Explained (Australia 2026)",
    metaDescription:
      "Super funds pay 15% tax on earnings, so a fully franked dividend's 30% credit generates a significant refund. Learn how accumulation vs. pension phase affects the benefit.",
    shortAnswer:
      "Super funds pay 15% tax on investment income. Fully franked dividends carry a 30% credit, which exceeds the 15% fund tax — the fund receives a refund for the difference. In pension phase (0% tax), the full 30% credit is refunded. This makes Australian equities particularly attractive inside super.",
    sections: [
      {
        heading: "The maths for accumulation phase",
        body: "Your super fund receives a $700 fully franked dividend on a $1,000 grossed-up amount. The fund includes $1,000 in assessable income and pays 15% tax — $150. It then offsets the $300 franking credit and receives a $150 refund (300 − 150). Net tax paid: $0. The franking credit more than eliminates the income tax on that dividend.",
      },
      {
        heading: "The maths for pension phase",
        body: "SMSFs and pooled super funds in full retirement (pension) phase pay 0% tax on earnings. The full $300 franking credit is refunded in cash. Assuming $10,000 invested in a fully franked Australian share paying a 5% yield ($500 dividend), the after-tax cash received is $500 + $214 franking credit refund = $714 effective yield (7.14%).",
      },
      {
        heading: "Industry and retail funds",
        body: "Large pooled super funds also benefit from franking credit refunds, but the benefit is spread across all members. APRA-regulated funds pool the refunds and credit them to members proportionately. The benefit is the same in aggregate but may not be as visible in individual member statements.",
      },
      {
        heading: "Why this matters for asset allocation",
        body: "The franking credit boost makes Australian equities significantly more attractive inside super relative to international equities (which have no franking credits). This is a structural advantage of Australian equities from a superannuation perspective, and explains why many SMSFs maintain a large domestic equity allocation despite the concentration risk in a small market.",
      },
    ],
    faqs: [
      {
        q: "Do franking credit refunds still exist after the 2019 election?",
        a: "Yes. The Labor government did not proceed with a proposed change to eliminate cash refunds of franking credits. Cash refunds remain available for eligible taxpayers including super funds in pension phase, retirees below the tax-free threshold, and low-income earners.",
      },
      {
        q: "What ETFs have the highest franking levels?",
        a: "Broad Australian equity ETFs (VAS, IOZ, STW) typically distribute dividends that are 60–75% franked. The Australian high-dividend ETFs (VHY, HVST, IHD) tend to have higher franking levels (75–95%) because they tilt toward bank shares, which pay high, fully franked dividends.",
      },
    ],
    relatedSlugs: [
      "how-does-franking-credit-work",
      "what-is-smsf-and-is-it-worth-it",
      "what-is-concessional-contribution",
    ],
    relatedTools: [
      { label: "SMSF calculator", href: "/smsf-calculator" },
      { label: "Dividend reinvestment calculator", href: "/dividend-reinvestment-calculator" },
    ],
  },
  {
    slug: "what-is-the-super-preservation-age",
    category: "super",
    question: "What is the super preservation age and when can I access my super?",
    metaTitle: "Super Preservation Age: When Can You Access Super? (2026)",
    metaDescription:
      "You can access super from preservation age (60 for most) as a transition to retirement income stream, or tax-free after age 60 on full retirement. Learn the conditions of release.",
    shortAnswer:
      "Preservation age is the minimum age at which you can access your super. For anyone born after 30 June 1964, this is age 60. After age 60, you can access super tax-free if you meet a condition of release — most commonly retirement or reaching age 65 regardless of employment status.",
    sections: [
      {
        heading: "Preservation age schedule",
        body: "The preservation age was gradually raised from 55 to 60 over several years. Anyone born on or after 1 July 1964 has a preservation age of 60. Born 1960–1963: age 58–59 (varied by birth year). Born before 1 July 1960: age 55 (these people are already at or past preservation age).",
      },
      {
        heading: "Conditions of release",
        body: "After reaching preservation age but before age 65, you need to meet a condition of release to withdraw super as a lump sum. The main conditions are: retirement (cease employment with no intention to return to work), permanent incapacity, terminal medical condition, and compassionate grounds (limited). At age 65 you can access super unconditionally regardless of employment status.",
      },
      {
        heading: "Transition to Retirement (TTR)",
        body: "From preservation age you can start a Transition to Retirement Income Stream (TRIS) without fully retiring. A TRIS lets you draw a pension income (minimum 2%, maximum 10% of account balance per year) while still working. The income is taxed at your marginal rate with a 15% tax offset (for those under 60); fully tax-free after 60. TTR assets remain in accumulation phase (15% tax on earnings) until you fully retire.",
      },
      {
        heading: "Tax treatment on withdrawal",
        body: "After age 60, all super withdrawals (both lump sums and pension income) are tax-free regardless of the source (taxable or tax-free component). Before age 60 but at or above preservation age, withdrawals from the taxable component incur marginal tax less a 15% tax offset. Before preservation age, withdrawals are generally taxed at 20% (taxable component) plus Medicare Levy.",
      },
    ],
    faqs: [
      {
        q: "Can I access super early on hardship grounds?",
        a: "The ATO allows limited early access on severe financial hardship grounds (typically 26+ consecutive weeks on government income support with no ability to meet living expenses) and on compassionate grounds (medical expenses, home loan in default, palliative care costs). Applications are made to the ATO or super fund depending on the ground.",
      },
      {
        q: "What is the account-based pension and when does it start?",
        a: "An account-based pension (ABP) is a regular income stream paid from your super account after you retire. It requires a full retirement condition of release. You must draw a minimum annual pension of 4% (age 60–64), 5% (65–74), 6% (75–79), 7% (80–84), 9% (85–89), 11% (90–94), or 14% (95+) of your balance each financial year.",
      },
    ],
    relatedSlugs: [
      "what-is-concessional-contribution",
      "what-is-smsf-and-is-it-worth-it",
      "what-is-the-super-guarantee-rate-fy2026",
    ],
    relatedTools: [
      { label: "Super contributions calculator", href: "/super-contributions-calculator" },
      { label: "Compare super funds", href: "/super" },
    ],
  },
  {
    slug: "how-does-the-first-home-super-saver-scheme-work",
    category: "super",
    question: "How does the First Home Super Saver Scheme (FHSS) work?",
    metaTitle: "First Home Super Saver Scheme (FHSS) Explained (2026)",
    metaDescription:
      "FHSS lets first home buyers save for a deposit inside super and withdraw up to $50,000 in voluntary contributions at a lower tax rate. Learn the eligibility rules, application process, and how to maximise it.",
    shortAnswer:
      "The FHSS scheme lets eligible first home buyers make voluntary concessional and non-concessional super contributions and later withdraw them (plus associated earnings) to use as a home deposit. You can request release of up to $15,000 per financial year ($50,000 lifetime maximum).",
    sections: [
      {
        heading: "How FHSS works",
        body: "Make voluntary contributions to your super fund (salary sacrifice or personal deductible contributions). After 12 months you apply to the ATO for a FHSS determination. The ATO calculates how much can be released: the voluntary contributions plus deemed earnings (91-day Treasury note rate + 3%). The amount is taxed at your marginal rate minus a 30% tax offset when released.",
      },
      {
        heading: "Contribution limits",
        body: "Maximum $15,000 in voluntary contributions per financial year counts toward FHSS. You can contribute multiple years before requesting release. The lifetime maximum releasable amount is $50,000 (from $15,000/year × 3.33 years or more of contributions). Both concessional (salary sacrifice / personal deductible) and non-concessional (after-tax) contributions qualify.",
      },
      {
        heading: "Eligibility",
        body: "You must: be at least 18 years old when you request the determination; have never owned real property in Australia (with very limited exceptions for hardship); intend to live in the property for at least 6 months within the first 12 months of ownership. Each individual in a couple can use FHSS independently, potentially withdrawing up to $100,000 combined.",
      },
      {
        heading: "The tax advantage",
        body: "Salary sacrifice into super is taxed at 15% (contributions tax). When released under FHSS, the withdrawal is taxed at your marginal rate minus a 30% tax offset. For someone on 32.5% marginal rate, effective tax on the withdrawal is 2.5% (32.5% − 30%). The earnings while in super are taxed at 15% inside the fund. Net result: you save significantly more per dollar compared to saving in a bank account taxed at your marginal rate.",
      },
    ],
    faqs: [
      {
        q: "How long does the FHSS release process take?",
        a: "The ATO typically processes FHSS release requests within 15–25 business days. Your super fund then has up to 10 business days to release the money to the ATO, which then forwards it to you. Allow 4–6 weeks from application to receiving funds. You must request the release before signing a property contract.",
      },
      {
        q: "What if I don't end up buying a home?",
        a: "If you don't sign a contract within 12 months of the release (with possible extension), you must recontribute the FHSS funds to super or pay a FHSS tax (20% of the assessable amount). You cannot simply keep the money without tax consequences.",
      },
      {
        q: "Can I use FHSS if I already own property?",
        a: "No, if you have ever owned real property in Australia (land or buildings) you are generally ineligible. Exceptions exist for severe financial hardship cases assessed by the Commissioner. If your spouse owns property but you never have, you may still be eligible for your own FHSS benefit.",
      },
    ],
    relatedSlugs: [
      "what-is-concessional-contribution",
      "what-is-salary-sacrifice-super",
      "should-i-pay-off-mortgage-or-invest",
    ],
    relatedTools: [
      { label: "Super contributions calculator", href: "/super-contributions-calculator" },
      { label: "Compare super funds", href: "/super" },
    ],
  },
  {
    slug: "how-does-depreciation-work-for-investment-property",
    category: "property",
    question: "How does depreciation work for an investment property?",
    metaTitle: "Investment Property Depreciation: Division 40 & 43 Explained (2026)",
    metaDescription:
      "Investment property owners can claim two types of depreciation: Division 43 (building write-off at 2.5%/year) and Division 40 (plant and equipment at effective life). Learn the rules and how to get a quantity surveyor's report.",
    shortAnswer:
      "Investment property depreciation reduces your taxable rental income. Division 43 covers the building structure (2.5% per year for properties built after September 1987) and Division 40 covers fixtures and fittings (at each item's effective life). Both require records — a quantity surveyor's report for Division 43.",
    sections: [
      {
        heading: "Division 43 — building allowance",
        body: "You can claim 2.5% of the original construction cost per year for qualifying residential and commercial buildings. For a property that cost $300,000 to build (not land), you can claim $7,500/year in Division 43 deductions. The allowance applies as long as you own the property and it generates rental income. For properties built before 18 July 1985, no Division 43 deduction is available.",
      },
      {
        heading: "Division 40 — plant and equipment",
        body: "Fixtures and fittings — carpets, dishwashers, hot water systems, air conditioners, ovens — depreciate at each item's ATO-defined effective life. You choose the prime cost (flat rate over useful life) or diminishing value method (faster early deductions). New properties have the most depreciable items. Note: since 1 July 2017, plant and equipment deductions are not available to individuals who purchased a second-hand (not new) residential property, or who purchased new but had the items installed by a previous owner.",
      },
      {
        heading: "Quantity surveyor report",
        body: "The ATO accepts estimates from a qualified quantity surveyor for Division 43 claims where you don't have original construction records. The report documents the construction cost estimate and the depreciation schedule for all Division 40 items. Cost: $500–$1,500 depending on property type and location. Deductible in the year of preparation.",
      },
      {
        heading: "Impact on tax",
        body: "Depreciation is a non-cash deduction — it reduces your taxable income without requiring an out-of-pocket payment. Combined with interest deductions, it is a significant contributor to negative gearing. However, the ATO requires you to reduce your CGT cost base by the Division 43 depreciation claimed, increasing your capital gain when you sell.",
      },
    ],
    faqs: [
      {
        q: "Can I claim depreciation on a property I live in?",
        a: "No. Depreciation deductions require the property to be income-producing (rented or genuinely available for rent). You cannot claim while the property is your principal place of residence.",
      },
      {
        q: "Does the 2017 change affect new properties?",
        a: "New residential properties purchased after 7 May 2017 where the property is the first to use the items still qualify for Division 40 plant and equipment deductions. The restriction only prevents the second (and subsequent) buyers of residential property from claiming depreciation on items installed by prior owners.",
      },
      {
        q: "What is the difference between repairs and improvements for tax?",
        a: "Repairs (restoring something to its original condition) are immediately deductible. Improvements (making something better than original) are capital expenditure added to the cost base, and may be claimable under Division 43 over their effective life. The ATO tests the extent and nature of the work to classify it.",
      },
    ],
    relatedSlugs: [
      "how-does-negative-gearing-work",
      "what-is-capital-gains-tax-discount",
      "what-is-smsf-and-is-it-worth-it",
    ],
    relatedTools: [
      { label: "Compare property investment platforms", href: "/property-platforms" },
      { label: "Property vs shares calculator", href: "/property-vs-shares-calculator" },
    ],
  },
  {
    slug: "what-is-the-principal-place-of-residence-cgt-exemption",
    category: "tax",
    question: "What is the principal place of residence (PPR) CGT exemption?",
    metaTitle: "Principal Place of Residence CGT Exemption Explained (Australia 2026)",
    metaDescription:
      "Your home is generally exempt from capital gains tax when you sell it. Learn the rules around mixed use, the six-year absence rule, and partial exemptions.",
    shortAnswer:
      "Your main residence is generally fully exempt from capital gains tax when sold, provided you have continuously lived in it, it is on land of 2 hectares or less, and it has not been used to produce income.",
    sections: [
      {
        heading: "Full main residence exemption",
        body: "If you have lived in the property as your main residence from the time you acquired it, never rented it out, and it sits on 2 hectares or less of land, you pay no CGT on sale regardless of the profit made.",
      },
      {
        heading: "The six-year absence rule",
        body: "If you move out and rent the property, you can still treat it as your main residence for CGT purposes for up to six continuous years (absent and renting). After the six-year period, the property loses the main residence exemption for the absent period. You can reset the clock by moving back in before the six years expires. You can only have one main residence at a time — you cannot use the six-year rule and the new property exemption simultaneously.",
      },
      {
        heading: "Partial exemptions",
        body: "If you rented the property for part of your ownership, the CGT is calculated proportionally. Formula: (days rented / total days owned) × capital gain = taxable portion. The 50% CGT discount applies to the taxable portion if held over 12 months. A similar pro-rating applies if the property was used partly for business (e.g. a home office).",
      },
      {
        heading: "Land over 2 hectares",
        body: "If your property includes more than 2 hectares of land (including the house), only the first 2 hectares are exempt. The excess land area must have its CGT calculated based on the proportion of the total land area.",
      },
    ],
    faqs: [
      {
        q: "Can I claim the main residence exemption on a property I have never lived in?",
        a: "Generally no. There is a limited exception for new dwellings you purchased off-the-plan — you can treat the property as your main residence from the date of contract for up to four years even before moving in, provided you move in as soon as practical on completion.",
      },
      {
        q: "Does the main residence exemption apply to holiday homes?",
        a: "Only one property can be your main residence at a time. If you have a holiday home, one of your properties will receive the full exemption and the other will be subject to CGT based on any appreciation during the period of ownership.",
      },
      {
        q: "What is the impact for non-residents?",
        a: "From 9 May 2017, non-resident individuals generally cannot access the main residence exemption on sale (subject to transitional arrangements). This is a significant change affecting Australians who moved overseas and still own their former home.",
      },
    ],
    relatedSlugs: [
      "what-is-capital-gains-tax-discount",
      "how-does-negative-gearing-work",
      "how-does-depreciation-work-for-investment-property",
    ],
    relatedTools: [
      { label: "Property vs shares calculator", href: "/property-vs-shares-calculator" },
      { label: "Compare property investment platforms", href: "/property-platforms" },
    ],
  },
  // ─── QA-02 additions (questions 18–30) ───────────────────────────────────
  {
    slug: "how-does-tax-loss-harvesting-work",
    category: "tax",
    question: "How does tax-loss harvesting work in Australia?",
    metaTitle: "Tax-Loss Harvesting in Australia: How It Works (2026)",
    metaDescription:
      "Tax-loss harvesting means selling investments at a loss to offset capital gains, reducing your CGT bill. Learn the ATO rules, the wash-sale problem, and when it makes sense.",
    shortAnswer:
      "Tax-loss harvesting means deliberately selling an investment at a loss to offset capital gains made elsewhere, reducing your taxable capital gain for the year. Australia has no wash-sale rule, but the ATO can apply Part IVA anti-avoidance provisions if a transaction has no commercial purpose other than generating a tax benefit.",
    sections: [
      {
        heading: "How it works",
        body: "If you made a $20,000 capital gain from selling shares in Company A, and you hold shares in Company B that are sitting at a $15,000 loss, you can sell Company B to crystallise the $15,000 capital loss. The net capital gain falls to $5,000, and after the 50% CGT discount (if applicable), only $2,500 is added to your assessable income.",
      },
      {
        heading: "Carry-forward losses",
        body: "Capital losses that exceed capital gains in a year cannot be offset against ordinary income — they are carried forward indefinitely. In a low-income year, you might choose not to harvest losses if you have no gains to offset; instead, save the losses for a future high-gain year.",
      },
      {
        heading: "No formal wash-sale rule — but Part IVA applies",
        body: "Australia does not have a statutory wash-sale rule (unlike the US, which disallows a loss if you repurchase the same asset within 30 days). However, the ATO can invoke Part IVA of the ITAA 1936 to disallow losses from transactions where obtaining a tax benefit was the dominant purpose. Re-purchasing the same shares immediately after selling to harvest a loss could attract scrutiny. The prudent approach: wait at least 30 days before repurchasing, or switch to a similar-but-not-identical holding.",
      },
      {
        heading: "End-of-year timing",
        body: "The tax year ends 30 June. To crystallise a loss in the current year, the contract date of the sale must fall on or before 30 June. Settlement can occur in July. The reverse applies to gains: if you want to defer a gain, the contract date (not settlement) is what matters for CGT timing.",
      },
    ],
    faqs: [
      {
        q: "Can I sell ETF units and immediately buy the same ETF to harvest a loss?",
        a: "Technically there is no rule that prohibits this, but immediately repurchasing the same ETF could attract ATO scrutiny under Part IVA if it has no commercial purpose other than generating a tax loss. Waiting 30+ days or switching to a similar ETF tracking a different index is the cautious approach.",
      },
      {
        q: "Can I offset capital losses against ordinary income?",
        a: "No. Capital losses in Australia can only be offset against capital gains. They cannot be deducted from ordinary income (salary, dividends, rental income). Unused capital losses carry forward to future years with no time limit.",
      },
      {
        q: "Does the 50% CGT discount apply after loss offsets?",
        a: "Yes, and importantly, losses must be applied before the 50% discount is applied. You cannot choose to skip a loss in order to maximise the discount on a gain. Apply losses first, then apply the 50% discount to the remaining net gain.",
      },
    ],
    relatedSlugs: [
      "what-is-capital-gains-tax-discount",
      "how-does-negative-gearing-work",
      "what-is-the-principal-place-of-residence-cgt-exemption",
    ],
    relatedTools: [
      { label: "CGT calculator", href: "/cgt-calculator" },
      { label: "Compare share brokers", href: "/share-trading" },
    ],
  },
  {
    slug: "should-i-pay-off-hecs-hep-debt-or-invest",
    category: "budgeting",
    question: "Should I pay off my HECS-HELP debt or invest instead?",
    metaTitle: "Pay Off HECS-HELP vs. Invest: Which Is Better? (Australia 2026)",
    metaDescription:
      "HECS-HELP debt is indexed to CPI and has no interest. Most financial advisers say invest first — unless CPI inflation is high or you are close to threshold repayments. Learn the maths.",
    shortAnswer:
      "HECS-HELP debt is interest-free and indexed to CPI (2.4% in 2025). If your expected after-tax investment return exceeds CPI, investing outperforms voluntary repayment. Most years, and especially in rising-rate environments where equities return 7–10%, it makes sense to invest rather than voluntarily repay HECS-HELP early.",
    sections: [
      {
        heading: "How HECS-HELP indexation works",
        body: "Your HECS-HELP balance is indexed to CPI each 1 June. In 2023 indexation was 7.1% (a spike from energy and food inflation). In 2024 it was 4.7%. In 2025 it was 2.4%. If CPI returns to the RBA's 2–3% target band, the effective cost of holding HECS-HELP debt is very low — lower than most other debt and far below expected equity returns.",
      },
      {
        heading: "The maths",
        body: "At 2.4% CPI indexation, your HECS-HELP debt costs you 2.4% per year in real terms. A broad-market ETF returning 8% per year (before tax) earns approximately 6.7% after-tax (at 32.5% marginal rate on 50% of the gain under the CGT discount — 8% × 67.5% discount = ~5.4% effective, or for dividends taxed at marginal rate after franking, slightly different). Either way, the investment return substantially exceeds the HECS-HELP cost in most market conditions.",
      },
      {
        heading: "When voluntary repayment makes sense",
        body: "If CPI spikes again (as in 2023), the one-year cost of holding HECS-HELP is higher. Paying down debt provides a guaranteed risk-free return equal to the indexation rate. Psychologically, some people prefer to clear the HECS balance before taking on a mortgage (it reduces your borrowing capacity as the compulsory repayment threshold reduces take-home pay). And if you are within $10,000 of clearing the balance, the peace of mind is worth the mathematical sacrifice.",
      },
    ],
    faqs: [
      {
        q: "Does HECS-HELP debt affect my borrowing capacity?",
        a: "Yes. Lenders assess your borrowing capacity using your net income. HECS-HELP compulsory repayments reduce your take-home pay at the thresholds. For FY2026, compulsory repayments start at 1% of income once you earn $54,435, rising to 10% above $159,664. This reduces the income figure banks use for servicing calculations.",
      },
      {
        q: "Does HECS-HELP debt affect my credit score?",
        a: "No. HECS-HELP is a government debt that does not appear on your credit report (Equifax, Experian, Illion). It does not affect your credit score. However, lenders will ask about it when assessing mortgage or personal loan applications.",
      },
      {
        q: "Can I get a tax deduction for voluntary HECS-HELP repayments?",
        a: "No. Voluntary HECS-HELP repayments are not tax-deductible. Compulsory repayments withheld from your salary are also not deductible.",
      },
    ],
    relatedSlugs: [
      "should-i-pay-off-mortgage-or-invest",
      "how-much-should-i-have-in-emergency-fund",
      "how-does-compound-interest-work",
    ],
  },
  {
    slug: "what-is-an-investment-bond",
    category: "investing",
    question: "What is an investment bond and how is it taxed?",
    metaTitle: "Investment Bonds Explained: Tax Rules and 10-Year Rule (Australia 2026)",
    metaDescription:
      "Investment bonds (insurance bonds) let earnings compound inside the bond at 30% tax. After 10 years, withdrawals are tax-free. Learn who they suit, contribution rules, and estate planning benefits.",
    shortAnswer:
      "An investment bond (also called an insurance bond or friendly society bond) is a tax-paid investment that grows inside the bond at 30% tax. After 10 years, all withdrawals are tax-free. They are particularly useful for estate planning, child savings, and investors on high marginal rates who have maxed out super.",
    sections: [
      {
        heading: "How the tax works",
        body: "Earnings inside an investment bond are taxed at 30% (the corporate tax rate) within the bond issuer's tax position. You do not declare earnings in your personal tax return while they remain invested. After 10 years of continuous investment, the 'policy anniversary rule' means all withdrawals — including gains — are tax-free in your hands.",
      },
      {
        heading: "The 125% rule for additional contributions",
        body: "To maintain the 10-year clock, additional contributions in any year must not exceed 125% of the prior year's contributions. If you exceed 125%, the 10-year clock resets to zero. Initial contributions can be any amount; only the 125% cap applies to subsequent contributions.",
      },
      {
        heading: "Who benefits most",
        body: "Investment bonds suit: (1) investors on 45% marginal rate who benefit from the 30% internal tax rate; (2) parents saving for children — bonds can be transferred to adult children as tax-paid capital; (3) estate planning — bonds can pass outside the will with nominated beneficiaries, bypassing probate; (4) investors who have reached super contribution limits.",
      },
      {
        heading: "Early withdrawal tax",
        body: "If you withdraw before 10 years, the proportion of earnings attributable to the withdrawal is included in your assessable income — minus a 30% tax offset (to account for tax already paid inside the bond). The tax impact reduces significantly after year 8 and is zero after year 10.",
      },
    ],
    faqs: [
      {
        q: "Are investment bonds safe?",
        a: "Investment bonds are typically offered by life insurance companies regulated by APRA. The investment portfolio within the bond can include shares, property, fixed income, or cash — the underlying risk depends on the investment option chosen, not the bond structure itself.",
      },
      {
        q: "Can I hold an investment bond inside super?",
        a: "No. Investment bonds and super are separate structures. Both offer tax concessions but are governed by different legislation. You cannot hold a bond inside an SMSF.",
      },
      {
        q: "What is the difference between an investment bond and a term deposit?",
        a: "A term deposit is a bank deposit returning a fixed interest rate for a fixed term, taxed at your marginal rate. An investment bond is a life insurance wrapper offering investment choice and a favourable tax rate, with the 10-year tax-free exit. Term deposits are lower risk; investment bonds offer more growth potential and significant long-term tax advantages for high-rate taxpayers.",
      },
    ],
    relatedSlugs: [
      "what-is-capital-gains-tax-discount",
      "what-is-smsf-and-is-it-worth-it",
      "how-does-compound-interest-work",
    ],
    relatedTools: [
      { label: "Compare share brokers", href: "/share-trading" },
    ],
  },
  {
    slug: "how-to-invest-in-reits-in-australia",
    category: "property",
    question: "How do you invest in REITs in Australia?",
    metaTitle: "How to Invest in REITs in Australia (A-REITs Guide 2026)",
    metaDescription:
      "Australian REITs (A-REITs) are ASX-listed trusts that own commercial property. Learn how they work, how they are taxed, and the major A-REITs by sector.",
    shortAnswer:
      "Australian Real Estate Investment Trusts (A-REITs) are ASX-listed trusts that pool investor capital to own and manage commercial properties — offices, shopping centres, industrial warehouses, data centres, and hospitals. You buy A-REIT units through any share broker, making them accessible at low minimums compared to direct property.",
    sections: [
      {
        heading: "What A-REITs own",
        body: "The ASX's major A-REIT sub-sectors include retail (Scentre Group/Westfield, Vicinity Centres), office (Dexus, Charter Hall), industrial and logistics (Goodman Group, Centuria Industrial REIT), diversified (GPT Group), and healthcare (HealthCo Healthcare & Wellness REIT). Some stapled trusts combine property trust and operating company units.",
      },
      {
        heading: "How to buy A-REITs",
        body: "Purchase units through any ASX-enabled share broker (CommSec, Selfwealth, Pearler, etc.) exactly as you would buy shares. Minimum investment is the price of one unit (often $3–$15). A-REIT ETFs (e.g. VAP from Vanguard, SLF from iShares) provide diversified exposure to the sector in a single trade.",
      },
      {
        heading: "Distribution yield and tax",
        body: "A-REITs distribute income quarterly or half-yearly. Distributions often contain a mix of: tax-deferred income (building depreciation creates a non-cash deduction that reduces the taxable component — deferred tax liability crystallises on sale), trust income (taxed at marginal rate), and capital gains (may attract the 50% CGT discount). This mix creates favourable after-tax cash flows, especially for investors on lower marginal rates.",
      },
      {
        heading: "Interest rate sensitivity",
        body: "A-REITs borrow to fund property acquisitions and are sensitive to interest rate changes. Rising rates increase borrowing costs and tend to compress property capitalisation rates, reducing valuations. The 2022–2023 rate-hiking cycle led to significant A-REIT price falls. Conversely, when rates fall, A-REITs typically outperform the broader market.",
      },
    ],
    faqs: [
      {
        q: "Are A-REITs suitable for an SMSF?",
        a: "Yes. A-REITs provide commercial property exposure without the compliance complexity of direct SMSF property ownership. They are liquid (can be sold on the ASX in seconds) and diversified. They don't require an LRBA (Limited Recourse Borrowing Arrangement) as direct property does.",
      },
      {
        q: "What is the difference between a REIT and a managed property fund?",
        a: "A-REITs are listed on the ASX and trade at market price throughout the day. Unlisted property trusts value their assets periodically (quarterly) and transact at net asset value. A-REITs offer more liquidity; unlisted trusts are often less volatile (smoother valuations) but lock capital away for longer.",
      },
      {
        q: "Do A-REITs pay franked dividends?",
        a: "Rarely. Most A-REIT distributions are trust income (not company dividends) and therefore cannot carry franking credits. A-REITs that have a stapled operating company component (e.g. Goodman Group's management business) may include a small franked dividend from the corporate side.",
      },
    ],
    relatedSlugs: [
      "how-does-negative-gearing-work",
      "what-is-the-difference-between-etf-and-managed-fund",
      "what-is-smsf-and-is-it-worth-it",
    ],
    relatedTools: [
      { label: "Compare property investment platforms", href: "/property-platforms" },
      { label: "Compare share brokers", href: "/share-trading" },
    ],
  },
  {
    slug: "what-is-the-medicare-levy-surcharge",
    category: "tax",
    question: "What is the Medicare Levy Surcharge and how do I avoid it?",
    metaTitle: "Medicare Levy Surcharge Explained: Avoid It With PHI (2026)",
    metaDescription:
      "The Medicare Levy Surcharge (MLS) adds 1–1.5% to your tax bill if you earn above $93,000 and don't hold private hospital cover. Learn the thresholds, how private health rebates offset the cost, and whether it's worth it.",
    shortAnswer:
      "The Medicare Levy Surcharge (MLS) is an additional 1–1.5% tax on top of the standard 2% Medicare Levy, charged to singles earning above $93,000 (families above $186,000) who do not hold private hospital insurance cover. Taking out a basic private hospital policy is usually cheaper than paying the surcharge.",
    sections: [
      {
        heading: "MLS rates and thresholds (FY2026)",
        body: "Singles: $93,001–$108,000 → 1% MLS; $108,001–$144,000 → 1.25%; above $144,000 → 1.5%. Families: double the single thresholds. The surcharge applies to 'income for surcharge purposes' which includes taxable income, reportable fringe benefits, and total net investment losses.",
      },
      {
        heading: "The private health rebate",
        body: "The government provides a private health insurance rebate that reduces your premium. For FY2026, the rebate is: below $93,000 income → 24.608% rebate; $93,001–$108,000 → 16.405%; $108,001–$144,000 → 8.202%; above $144,000 → 0% rebate. A basic hospital policy costing $1,200/year at 16.4% rebate effectively costs $1,003. Compare this to the MLS: at $100,000 income, 1% MLS = $1,000. The rebate makes private cover very close to MLS-neutral at this income.",
      },
      {
        heading: "Lifetime Health Cover loading",
        body: "If you don't take out hospital cover by 1 July after your 31st birthday, a 2% loading per year is added to your premium when you eventually do take out cover. The loading caps at 70% and is removed after 10 consecutive years of holding cover. This creates an incentive to start private health cover early independent of the MLS.",
      },
    ],
    faqs: [
      {
        q: "Does the Medicare Levy Surcharge apply to couples?",
        a: "Yes. If either member of a couple (or family) exceeds the single threshold but the combined family income is below the family threshold, the MLS applies only to the member who exceeds the single threshold. Both must hold private hospital cover to avoid the surcharge.",
      },
      {
        q: "Is a basic hospital policy sufficient to avoid the MLS?",
        a: "Yes. Any private hospital policy — even the cheapest basic cover — avoids the MLS, as long as it is a registered product with a government-approved insurer (checked via healthinsurance.gov.au). Extras-only cover does NOT avoid the MLS.",
      },
      {
        q: "Does the Medicare Levy apply to everyone?",
        a: "The standard 2% Medicare Levy applies to most resident taxpayers, separate from the MLS. Low-income earners below the Medicare Levy low-income threshold ($26,000 in FY2026 for singles) are exempt from the standard levy. The MLS is an additional charge on top of the standard levy.",
      },
    ],
    relatedSlugs: [
      "how-does-the-low-income-tax-offset-work",
      "how-does-tax-loss-harvesting-work",
      "what-is-capital-gains-tax-discount",
    ],
  },
  {
    slug: "how-does-the-low-income-tax-offset-work",
    category: "tax",
    question: "How does the Low Income Tax Offset (LITO) work?",
    metaTitle: "Low Income Tax Offset (LITO) Explained (Australia FY2026)",
    metaDescription:
      "LITO reduces the income tax payable by individuals earning up to $66,667 per year. Learn the maximum offset, phase-out rates, and how LITO interacts with LMITO and LAMITO.",
    shortAnswer:
      "The Low Income Tax Offset (LITO) reduces income tax for individuals earning up to $66,667 per year. The maximum LITO is $700 for those earning up to $37,500. It phases out at 5¢ per dollar between $37,500 and $45,000, then at 1.5¢ per dollar between $45,000 and $66,667.",
    sections: [
      {
        heading: "LITO thresholds and amounts (FY2026)",
        body: "Income up to $37,500: full $700 LITO. $37,500–$45,000: LITO reduces by 5¢ per dollar (from $700 to $325). $45,000–$66,667: LITO reduces by 1.5¢ per dollar (from $325 to $0). Above $66,667: no LITO. The offset reduces tax payable dollar-for-dollar; it does not reduce Medicare Levy or the Medicare Levy Surcharge.",
      },
      {
        heading: "Effect on the tax-free threshold",
        body: "The combination of the tax-free threshold ($18,200), LITO ($700 at maximum), and the Low Income Medicare Levy Reduction means that in FY2026 an individual pays no net tax until income exceeds approximately $21,885 (accounting for the Medicare Levy reduction floor). The 'effective tax-free threshold' is often quoted around $21,884.",
      },
      {
        heading: "LITO vs LAMITO and LMITO",
        body: "The Low and Middle Income Tax Offset (LMITO) was a temporary pandemic-era offset that was abolished after FY2023. LAMITO (Low and Middle Income Tax Offset — a separate variant) also ended. From FY2024 onwards, LITO is the primary low-income offset. Do not confuse these with the current legislation.",
      },
    ],
    faqs: [
      {
        q: "Is LITO automatically applied?",
        a: "Yes. LITO is automatically applied when you lodge your tax return (or when your employer withholds PAYG). You do not need to claim it separately. Your tax withheld from wages is based on LITO entitlement included in the ATO's tax withheld calculators.",
      },
      {
        q: "Do non-residents get LITO?",
        a: "No. LITO is only available to Australian tax residents. Non-resident individuals are taxed at different rates and are not entitled to the tax-free threshold or LITO.",
      },
      {
        q: "Can my SMSF claim LITO?",
        a: "No. LITO applies only to individuals, not to trusts, companies, or superannuation funds. SMSFs pay 15% flat tax on fund income with no LITO offset.",
      },
    ],
    relatedSlugs: [
      "what-is-the-medicare-levy-surcharge",
      "should-i-pay-off-hecs-hep-debt-or-invest",
      "what-is-salary-sacrifice-super",
    ],
  },
  {
    slug: "how-does-portfolio-rebalancing-work",
    category: "investing",
    question: "How does portfolio rebalancing work?",
    metaTitle: "Portfolio Rebalancing Explained for Australian Investors (2026)",
    metaDescription:
      "Rebalancing restores your portfolio to target allocations by selling outperformers and buying underperformers. Learn threshold-based vs. calendar rebalancing, tax considerations, and when to rebalance inside super.",
    shortAnswer:
      "Portfolio rebalancing means selling assets that have grown above their target allocation and buying assets that have fallen below, restoring your original risk exposure. It enforces a buy-low, sell-high discipline and keeps your portfolio risk level consistent with your goals.",
    sections: [
      {
        heading: "Why rebalancing matters",
        body: "Over time, higher-returning assets grow to dominate your portfolio. A 70% shares / 30% bonds portfolio left unrebalanced for 10 years in a bull market may drift to 90% shares / 10% bonds — significantly more volatile than your original target. Rebalancing restores the risk-return profile you chose.",
      },
      {
        heading: "Calendar vs. threshold rebalancing",
        body: "Calendar rebalancing (quarterly, semi-annual, annual) is simpler but may trigger unnecessary trades. Threshold rebalancing triggers when an asset class drifts 5% or more from target (e.g. shares drift from 70% to 75%). Research suggests a 5% threshold rebalancing band is cost-effective — it avoids over-trading while still maintaining meaningful discipline.",
      },
      {
        heading: "Tax consequences of rebalancing",
        body: "Selling to rebalance crystallises capital gains. In a taxable account, prefer to rebalance by directing new contributions to underweight assets (avoiding sales), using dividends/distributions to top up laggards, and selling only when threshold drift is significant. Inside super (15% tax on gains, 0% in pension phase), rebalancing is much cheaper and worth doing promptly.",
      },
      {
        heading: "Rebalancing inside super",
        body: "Accumulation-phase super pays 15% CGT (10% after the one-third discount for assets held 12+ months) — far lower than personal tax rates. SMSF trustees should actively manage their asset allocation rather than allowing drift. Most APRA-regulated super funds rebalance automatically within their diversified options.",
      },
    ],
    faqs: [
      {
        q: "How often should I rebalance my portfolio?",
        a: "Annual rebalancing is adequate for most buy-and-hold investors. More frequent rebalancing (quarterly) adds little incremental benefit after accounting for transaction costs and CGT. A 5–10% threshold rule (rebalance when any asset class drifts by 5–10 percentage points from target) is often more efficient than calendar-only rules.",
      },
      {
        q: "Should I rebalance inside or outside super first?",
        a: "Inside super first. Tax rates are lower (15% or 0% in pension phase vs. your marginal rate in personal accounts). Use super distributions and new contributions to rebalance before selling in personal accounts.",
      },
    ],
    relatedSlugs: [
      "how-does-dollar-cost-averaging-work",
      "what-is-the-difference-between-etf-and-managed-fund",
      "what-is-smsf-and-is-it-worth-it",
    ],
    relatedTools: [
      { label: "Compare share brokers", href: "/share-trading" },
      { label: "Portfolio vs shares calculator", href: "/property-vs-shares-calculator" },
    ],
  },
  {
    slug: "what-is-the-difference-between-shares-and-bonds",
    category: "investing",
    question: "What is the difference between shares and bonds?",
    metaTitle: "Shares vs Bonds: Key Differences Explained (Australia 2026)",
    metaDescription:
      "Shares give you equity ownership and a share in profits. Bonds are debt instruments paying fixed interest. Learn risk profiles, returns, tax treatment, and how to hold both in an Australian portfolio.",
    shortAnswer:
      "Shares represent ownership equity in a company — you share in its profits (dividends) and growth (capital gains). Bonds are loans to companies or governments — the issuer pays you interest (coupon) and returns your principal at maturity. Shares are higher risk/return; bonds are lower risk/return.",
    sections: [
      {
        heading: "Shares: ownership and upside",
        body: "Buying shares makes you a part-owner of the company. If the company grows, your shares appreciate. If it pays dividends (Australian companies often do, with franking credits), you receive income. If the company fails, shareholders rank last in the liquidation queue — after creditors and bondholders — and may receive nothing.",
      },
      {
        heading: "Bonds: lending and income",
        body: "Buying a bond means you lend money to the issuer for a set term at a fixed (or floating) interest rate. You receive regular coupon payments and your principal back at maturity. Bondholders rank ahead of shareholders in insolvency. Australian government bonds are considered near-risk-free; corporate bonds carry credit risk proportional to the issuer's financial health.",
      },
      {
        heading: "Return comparison",
        body: "Over long periods, Australian shares (All Ordinaries) have returned approximately 9–10% per year (total return including dividends). The Bloomberg AusBond Composite Index (broad bond market) has returned approximately 5–6% per year. The higher share return compensates investors for higher volatility (30–50% peak-to-trough drawdowns in major downturns vs 5–15% for bonds).",
      },
      {
        heading: "Tax treatment",
        body: "Share dividends are taxed at marginal rates with potential franking credit offsets. Capital gains on shares held 12+ months qualify for the 50% CGT discount. Bond interest income is taxed at marginal rates with no discount. Capital gains on bonds (e.g. if you sell before maturity at a premium) are also assessable but typically modest.",
      },
    ],
    faqs: [
      {
        q: "How do I buy Australian government bonds?",
        a: "Australian Government Bonds (AGBs) are available directly via the Australian Government Bonds platform (austraclear.rba.gov.au for institutions). Retail investors can buy Exchange-traded Treasury Bonds (eTBs) listed on the ASX through any share broker, or access bond exposure via ETFs (VAF, IAF, BOND).",
      },
      {
        q: "Are bonds safe in a rising interest rate environment?",
        a: "No — rising rates reduce the market value of existing bonds (because new bonds offer higher yields, making existing lower-rate bonds less attractive). Bonds held to maturity return full principal, but their market price fluctuates in the interim. Shorter-duration bonds are less sensitive to rate changes than longer-duration bonds.",
      },
    ],
    relatedSlugs: [
      "how-does-franking-credit-work",
      "what-is-the-difference-between-etf-and-managed-fund",
      "how-does-portfolio-rebalancing-work",
    ],
    relatedTools: [
      { label: "Compare share brokers", href: "/share-trading" },
    ],
  },
  {
    slug: "how-do-i-report-crypto-tax-in-australia",
    category: "tax",
    question: "How do I report cryptocurrency for tax purposes in Australia?",
    metaTitle: "Crypto Tax Australia: How to Report Bitcoin and Altcoins (2026)",
    metaDescription:
      "The ATO treats crypto as a CGT asset. Every trade, swap, and purchase is a taxable event. Learn which records to keep, when the 50% CGT discount applies, and how staking income is taxed.",
    shortAnswer:
      "The ATO treats cryptocurrency as a CGT asset (not a currency). Every disposal — selling, swapping, using crypto to buy goods, gifting — is a taxable CGT event. You report gains and losses in your annual tax return. Staking rewards, mining income, and DeFi income are generally taxed as ordinary income when received.",
    sections: [
      {
        heading: "What counts as a disposal",
        body: "The ATO considers these events as CGT disposals: selling crypto for AUD; exchanging one crypto for another (e.g. Bitcoin for Ethereum — this is a swap triggering CGT on the Bitcoin); using crypto to purchase goods or services; gifting crypto to another person; moving crypto to a new wallet you control is NOT a disposal (same beneficial owner).",
      },
      {
        heading: "How to calculate capital gain or loss",
        body: "Capital gain = sale proceeds − cost base. Cost base = acquisition price + any associated costs (brokerage, transfer fees). For assets held more than 12 months, the 50% CGT discount applies to the gain. For Australian residents (not operating a crypto business), the individual CGT rules apply.",
      },
      {
        heading: "Staking, mining, and DeFi income",
        body: "Staking rewards: taxed as ordinary income at the market value in AUD when received. The same amount becomes your cost base for the staking rewards going forward. Mining income: taxed as ordinary income if mining is a business or a hobby generating assessable income. DeFi liquidity provision and yield farming: each interaction can create taxable events; the ATO has issued guidance but many DeFi interactions remain in a grey area.",
      },
      {
        heading: "Record-keeping requirements",
        body: "The ATO requires you to keep records for at least five years after lodging the relevant tax return. Records needed: date of each transaction, amount in AUD at the time of transaction, purpose, counterparty details. Specialist crypto tax software (Koinly, CoinTracker, CryptoTaxCalculator) can import exchange transaction histories and generate ATO-compliant capital gains reports.",
      },
    ],
    faqs: [
      {
        q: "Is crypto personal use exempt from CGT?",
        a: "The ATO's personal use asset exemption applies only if: the crypto was purchased solely for personal use and consumption (e.g. to buy a specific item, not as an investment), the cost base is under $10,000, and you disposed of it promptly after acquisition. In practice, the ATO views most crypto holdings as investments, not personal use assets.",
      },
      {
        q: "Does the ATO know about my crypto holdings?",
        a: "The ATO has data-matching arrangements with most Australian cryptocurrency exchanges (CoinSpot, Independent Reserve, Swyftx, etc.). It receives account holder information and transaction data. The ATO matches this data against tax returns and sends letters to taxpayers who appear to have omitted crypto gains.",
      },
      {
        q: "What if I made a loss on crypto?",
        a: "Crypto losses are capital losses and are treated like any other capital loss — they can only offset capital gains, not ordinary income. Unused losses carry forward indefinitely to offset future capital gains. If you disposed of crypto for less than $10,000 (personal use exemption applies), you cannot claim the loss.",
      },
    ],
    relatedSlugs: [
      "what-is-capital-gains-tax-discount",
      "how-does-tax-loss-harvesting-work",
      "what-is-the-principal-place-of-residence-cgt-exemption",
    ],
    relatedTools: [
      { label: "CGT calculator", href: "/cgt-calculator" },
      { label: "Compare crypto exchanges", href: "/crypto" },
    ],
  },
  {
    slug: "what-is-diversification-in-investing",
    category: "investing",
    question: "What is diversification and why does it matter?",
    metaTitle: "What Is Diversification in Investing? (Australia 2026)",
    metaDescription:
      "Diversification means spreading investments across assets, sectors, and geographies to reduce risk without proportionally sacrificing return. Learn how correlation works and how to diversify an Australian portfolio.",
    shortAnswer:
      "Diversification means spreading your investments so that the poor performance of one asset, sector, or geography does not devastate your overall portfolio. Combining assets with low or negative correlation reduces portfolio volatility without proportionally reducing expected returns — this is sometimes called 'the only free lunch in investing'.",
    sections: [
      {
        heading: "How correlation works",
        body: "Two assets are perfectly correlated (correlation = 1) if they always move together. If they are perfectly uncorrelated (correlation = 0) or negatively correlated (correlation = −1), combining them reduces overall portfolio volatility. In practice, most risky assets have positive correlations, especially in market crises — but the benefit of diversification persists for correlations below 1.",
      },
      {
        heading: "Types of diversification",
        body: "Asset class: shares + bonds + property + commodities + cash. Geographic: Australian + international equities. Sector: technology, financials, healthcare, resources, consumer. Currency: AUD-denominated vs. foreign-currency-denominated assets. Time: dollar-cost averaging spreads your entry point over time.",
      },
      {
        heading: "The Australian concentration problem",
        body: "The ASX All Ordinaries is heavily concentrated in financials (banks, 30%+ of index) and materials (mining, 20%+). An all-Australian portfolio is therefore undiversified by sector and over-exposed to commodity cycles and Australian house prices (through banks). Adding international equities — especially US tech and European consumer staples — materially improves diversification for most Australian investors.",
      },
      {
        heading: "How many stocks for adequate diversification?",
        body: "Academic research suggests diminishing diversification benefit beyond 15–20 uncorrelated stocks. In practice, broad-market ETFs (VAS for Australia, VGS for international) provide instant diversification across hundreds or thousands of securities. Individual stock portfolios of fewer than 20 holdings carry meaningful idiosyncratic risk.",
      },
    ],
    faqs: [
      {
        q: "Can I over-diversify?",
        a: "Yes. Owning every available asset in proportion to market weight eventually just replicates the market portfolio. Beyond ~15–20 uncorrelated positions, the marginal diversification benefit is minimal. Excessive diversification ('diworsification') can mean you hold too many mediocre positions and incur unnecessary trading costs.",
      },
      {
        q: "Does diversification protect against market crashes?",
        a: "Partially. In a systemic crisis (2008 GFC, March 2020 COVID crash), most risky assets fall together as correlations converge toward 1. Bonds and gold tend to hold or rise in these scenarios. A balanced portfolio (60% shares / 40% bonds) falls less than a 100% equity portfolio in most downturns.",
      },
    ],
    relatedSlugs: [
      "how-does-portfolio-rebalancing-work",
      "what-is-the-difference-between-etf-and-managed-fund",
      "how-does-dollar-cost-averaging-work",
    ],
    relatedTools: [
      { label: "Compare share brokers", href: "/share-trading" },
      { label: "Compare ETFs", href: "/etfs" },
    ],
  },
  {
    slug: "how-does-the-first-home-guarantee-work",
    category: "property",
    question: "How does the First Home Guarantee (FHBG) work?",
    metaTitle: "First Home Guarantee Explained: 5% Deposit, No LMI (Australia 2026)",
    metaDescription:
      "The First Home Guarantee lets eligible buyers purchase a home with as little as 5% deposit, with the government guaranteeing 15% of the loan value so you avoid Lenders Mortgage Insurance. Learn eligibility, property price caps, and participating lenders.",
    shortAnswer:
      "The First Home Guarantee (FHBG) allows eligible first home buyers to purchase a property with a 5% deposit (instead of the usual 20%) without paying Lenders Mortgage Insurance (LMI). The government guarantees the remaining 15% gap, meaning the lender is protected without you paying LMI — saving $10,000–$35,000 depending on the property price.",
    sections: [
      {
        heading: "How the guarantee works",
        body: "Under the scheme, Housing Australia (formerly NHFIC) guarantees up to 15% of the purchase price to the lender. You only need a 5% genuine deposit. You still borrow 95% of the purchase price — the loan-to-value ratio is still 95% — but the government guarantee means the lender doesn't require LMI. You repay the full loan; the guarantee is just security for the lender.",
      },
      {
        heading: "Eligibility (2026)",
        body: "Individual buyers: Australian citizens or permanent residents, taxable income ≤ $125,000. Joint buyers: ≤ $200,000 combined income. Must be a genuine first home buyer (never owned property in Australia). Plan to occupy the property (owner-occupier, not investment). Property price caps apply by location and are indexed periodically.",
      },
      {
        heading: "Property price caps (FY2026)",
        body: "Sydney / NSW regional: $900,000 / $750,000. Melbourne / Vic regional: $800,000 / $650,000. Brisbane / Qld regional: $700,000 / $550,000. Adelaide / SA regional: $600,000 / $450,000. Perth / WA regional: $600,000 / $450,000. Hobart / Tas regional: $600,000 / $450,000. Darwin / ACT: $600,000 / $600,000. Prices updated in the 2026 MYEFO.",
      },
      {
        heading: "Participating lenders",
        body: "Only panel lenders approved by Housing Australia can process FHBG applications. The major banks (CBA, NAB, ANZ, Westpac) and many non-bank lenders participate. Your broker or bank must submit the application to Housing Australia before your purchase contract is unconditional. Spots are limited per financial year.",
      },
    ],
    faqs: [
      {
        q: "Can I use the FHBG with other government schemes?",
        a: "Yes. The FHBG can be used in conjunction with the First Home Super Saver Scheme (FHSS) for the deposit component. State government first homeowner grants (FHOG) also stack with the FHBG in most states.",
      },
      {
        q: "What happens if I don't live in the property?",
        a: "The FHBG requires owner-occupation. If you move out and rent the property within the guarantee period (typically until LVR falls below 80%), you may breach scheme conditions. Housing Australia may require the guarantee to be discharged, requiring you to pay LMI or top up equity.",
      },
      {
        q: "Is the First Home Guarantee different from the Family Home Guarantee?",
        a: "Yes. The Family Home Guarantee (FHG) allows eligible single parents with dependants (who may have previously owned a home) to purchase with a 2% deposit. Different eligibility criteria apply. Both are administered by Housing Australia.",
      },
    ],
    relatedSlugs: [
      "how-does-the-first-home-super-saver-scheme-work",
      "should-i-pay-off-mortgage-or-invest",
      "how-does-negative-gearing-work",
    ],
    relatedTools: [
      { label: "Mortgage calculator", href: "/mortgage-calculator" },
      { label: "Compare property investment platforms", href: "/property-platforms" },
    ],
  },
  {
    slug: "what-is-the-age-pension-assets-test",
    category: "retirement",
    question: "How does the Age Pension assets test work?",
    metaTitle: "Age Pension Assets Test Explained (Australia FY2026)",
    metaDescription:
      "The Age Pension assets test reduces your pension by $3 per fortnight for every $1,000 of assets above the threshold. Learn what counts, the thresholds, and how super, property, and investments are assessed.",
    shortAnswer:
      "The Age Pension assets test reduces the full pension by $3 per fortnight for every $1,000 of assessable assets above the lower threshold. At the upper threshold, the pension cuts out completely. Your principal home is exempt; super in accumulation phase is counted from age pension age.",
    sections: [
      {
        heading: "Assets test thresholds (FY2026)",
        body: "Single homeowner: full pension up to $295,500; pension cuts out at $634,750. Single non-homeowner: full pension up to $504,500; cuts out at $843,750. Couple homeowner (combined): full pension up to $451,500; cuts out at $954,000. These thresholds are indexed to CPI each 1 July.",
      },
      {
        heading: "What counts as an assessable asset",
        body: "Financial investments (shares, managed funds, ETFs, bank accounts, term deposits, investment bonds). Super in accumulation phase (from Age Pension age). Investment properties (assessed at net market value). Vehicles, caravans, boats, personal assets above $2,500. The assessable value of a life interest, reversionary income, and allocated pension assets.",
      },
      {
        heading: "What is exempt",
        body: "Your principal home (regardless of value). Some pre-paid funeral arrangements (up to a capped value). Accommodation bonds for aged care. Exempt assets reduce your assessable figure and can significantly affect pension eligibility.",
      },
      {
        heading: "Interaction with the income test",
        body: "The Age Pension uses both an assets test and an income test, and pays the lower of the two pension amounts. The income test applies a deeming rate to financial assets (currently 0.25% on assets up to $62,600 and 2.25% above for singles). Most retirees with substantial super balances are cut off by the assets test before the income test bites.",
      },
    ],
    faqs: [
      {
        q: "Does downsizing my home affect the Age Pension?",
        a: "Yes. Proceeds from selling your principal home are exempt for 24 months under the Assets Test Exemption for Home Sale Proceeds, provided you intend to buy or build a new home. After 24 months, the proceeds become assessable financial assets. The downsizer super contribution (up to $300,000 per person) can shelter some proceeds inside super.",
      },
      {
        q: "Is super in accumulation phase assessable for the Age Pension?",
        a: "Yes, from age pension age (currently 67). Super in accumulation phase held by someone below pension age is generally NOT assessable. This creates a strategy of maximising super contributions before pension age to shelter assets from the means test.",
      },
      {
        q: "How often is the assets test reassessed?",
        a: "Centrelink requires you to report significant asset changes (death of spouse, sale of property, change in investment values). Financial investment values are updated annually using the deemed rate methodology unless you notify Centrelink of a material change.",
      },
    ],
    relatedSlugs: [
      "what-is-the-super-preservation-age",
      "what-is-smsf-and-is-it-worth-it",
      "what-is-concessional-contribution",
    ],
    relatedTools: [
      { label: "Super contributions calculator", href: "/super-contributions-calculator" },
      { label: "Compare super funds", href: "/super" },
    ],
  },
  {
    slug: "how-does-dividend-investing-work",
    category: "investing",
    question: "How does dividend investing work in Australia?",
    metaTitle: "How Dividend Investing Works in Australia (2026 Guide)",
    metaDescription:
      "Dividend investing means earning regular cash payments from shares. Learn about yield vs growth, franking credits, DRIPs, and how to build a tax-effective income portfolio in Australia.",
    shortAnswer:
      "Dividend investing involves holding shares that pay regular cash distributions (dividends) from company profits. In Australia, many dividends come with franking credits that offset personal tax, making them especially attractive for low-income and retired investors. Building a diversified dividend portfolio provides a growing passive income stream alongside capital appreciation.",
    sections: [
      {
        heading: "What dividends are and how they work",
        body: "A dividend is a portion of a company's after-tax profits distributed to shareholders, typically paid twice a year (interim and final). The dividend yield is the annual dividend divided by the share price — a $2.00 annual dividend on a $40 share equals a 5% yield. Australian banks, telcos, and infrastructure companies are historically high yielders (4–7%), while growth-focused tech companies often pay nothing, reinvesting profits instead.",
      },
      {
        heading: "Franking credits: the Australian tax advantage",
        body: "Australia's dividend imputation system means companies pay 30% corporate tax, then attach franking credits to dividends to avoid double taxation. A $70 cash dividend from a fully franked company carries a $30 franking credit, grossing up to $100 of income. If your marginal tax rate is below 30%, you receive a cash refund from the ATO. Retirees in the zero-tax bracket can receive entire franking credit refunds — a powerful income boost unique to Australia.",
      },
      {
        heading: "Dividend reinvestment plans (DRIPs)",
        body: "Most ASX-listed companies offer dividend reinvestment plans, allowing shareholders to receive additional shares instead of cash, often at a slight discount (1–2.5%) to market price with no brokerage. DRIPs compound holdings over time without requiring active reinvestment. The reinvested amount is still taxable income in the year received — only the cash doesn't change hands.",
      },
      {
        heading: "Building an income portfolio",
        body: "A sensible dividend portfolio blends high-yield stocks (banks, property REITs, telcos) with lower-yield, high-growth stocks for capital appreciation. ETFs such as VHY (Vanguard Australian Shares High Yield ETF) and HVST (BetaShares) provide instant diversification across dividend payers. Aim for 15–25 positions across sectors to avoid concentration risk — having 40% in the big four banks, for instance, exposes you heavily to the Australian credit cycle.",
      },
      {
        heading: "Tax implications",
        body: "Dividends are assessed as ordinary income in the year paid. Franking credits are added to assessable income then offset against tax. If you hold shares for less than 45 days around the ex-dividend date (the '45-day rule'), you cannot claim franking credit offsets. The 12-month CGT discount does not apply to dividends — only to capital gains on sale. Salary earners on high marginal rates may find dividends taxed at 47%; in that case growth stocks or index funds may be more tax-efficient.",
      },
    ],
    faqs: [
      {
        q: "Are fully franked dividends better than unfranked?",
        a: "For most Australian resident investors, yes. A fully franked dividend grosses up to a higher pre-tax equivalent and may generate a tax refund if your rate is below 30%. However, the share price should theoretically adjust for the value of franking, so comparing yields requires normalising for franking levels.",
      },
      {
        q: "What is a good dividend yield for Australian shares?",
        a: "The ASX 200 average dividend yield is roughly 4–5% including franking credits. Yields above 7–8% on individual stocks can signal the market expects a dividend cut — high yields sometimes reflect a falling share price rather than generous payouts. Sustainable payout ratios (dividends as a fraction of earnings) of 60–80% are generally healthy for mature businesses.",
      },
      {
        q: "Can I hold dividend shares inside my SMSF?",
        a: "Yes, and SMSFs in pension phase pay zero tax on investment income, meaning franking credit refunds flow back entirely in cash. This makes fully franked Australian shares particularly compelling inside a pension-phase SMSF.",
      },
    ],
    relatedSlugs: [
      "how-does-franking-credits-work",
      "how-do-etfs-work",
      "what-are-the-best-etfs-for-beginners",
      "what-is-capital-gains-tax",
    ],
    relatedTools: [
      { label: "Compare share brokers", href: "/share-trading" },
      { label: "Compare ETFs", href: "/etfs" },
    ],
  },
  {
    slug: "what-is-a-margin-loan",
    category: "investing",
    question: "What is a margin loan and how does it work in Australia?",
    metaTitle: "What Is a Margin Loan? Risks, LVR & Tax in Australia (2026)",
    metaDescription:
      "A margin loan lets you borrow money to invest in shares or managed funds using your existing portfolio as security. Learn about LVR, margin calls, tax deductibility, and when margin lending is appropriate.",
    shortAnswer:
      "A margin loan allows you to borrow money from a lender using your share or managed fund portfolio as security, effectively amplifying your investment exposure. The lender sets a loan-to-value ratio (LVR) for each approved security, and if the portfolio value falls below a threshold you face a margin call — requiring you to top up equity or sell assets. Interest on the loan is generally tax-deductible if the borrowed funds are used to earn assessable income.",
    sections: [
      {
        heading: "How a margin loan works",
        body: "You contribute cash or securities as initial equity, and the lender provides additional funds up to the approved LVR. For example, a 70% LVR on $10,000 of BHP shares means the lender will advance up to $7,000, giving you $17,000 of investment exposure with only $10,000 of your own money. You pay interest on the borrowed amount (typically 7–10% p.a. variable) and receive all dividends and capital gains on the full holding.",
      },
      {
        heading: "Loan-to-value ratios and approved securities",
        body: "Each security on the margin lending approved list has an LVR reflecting its perceived risk. Major ASX 200 blue-chips and diversified ETFs attract LVRs of 70–75%. Smaller or more volatile stocks may be unlendable or carry LVRs of 40–50%. Unlisted managed funds sit lower again. The buffer between current LVR and maximum LVR is your margin — the cushion before a call.",
      },
      {
        heading: "Margin calls: the critical risk",
        body: "If portfolio values fall and the outstanding loan exceeds the maximum LVR (or a trigger LVR set by the lender), you receive a margin call — usually requiring top-up within 24 hours. Failure to respond allows the lender to force-sell securities, potentially at the worst possible time. In the March 2020 COVID crash, many leveraged investors faced simultaneous margin calls across a multi-day selldown. Volatile portfolios with LVRs near the maximum are most exposed.",
      },
      {
        heading: "Tax deductibility of margin loan interest",
        body: "Interest on a margin loan used to invest in income-producing assets (shares paying dividends, managed funds) is generally deductible under s8-1 ITAA 1997. If you invest in growth stocks with no dividend history, the ATO may challenge deductibility — the borrowed funds must be directed toward income-producing purposes. Keep records of what securities were purchased with borrowed funds. Prepaying interest before 30 June can bring forward a deduction into the current financial year.",
      },
      {
        heading: "When margin lending does and does not suit",
        body: "Margin lending can accelerate wealth accumulation in rising markets and enhance returns when the after-tax borrowing cost is below the portfolio return. It suits disciplined investors who can tolerate volatility, have separate liquid assets to cover potential margin calls, and hold diversified, defensive portfolios. It is poorly suited to undiversified share portfolios, investors close to retirement who cannot recover from a drawdown, or anyone without a cash buffer to service margin calls.",
      },
    ],
    faqs: [
      {
        q: "What is the typical interest rate on a margin loan in Australia?",
        a: "Variable rates typically range from 7% to 10.5% per annum as of 2026, depending on the lender and loan size. Some lenders offer fixed-rate options for 1–3 months. Rates move with the RBA cash rate. The after-tax cost for an investor on a 45% marginal rate is roughly 55% of the headline rate.",
      },
      {
        q: "Can I use a margin loan to buy ETFs?",
        a: "Yes. Most major ETFs from Vanguard, BetaShares, and iShares are on the approved securities lists of margin lenders such as Leveraged Equities, CommSec Margin Lending, and NAB Equity Lending. Diversified ETFs often attract LVRs of 70–75%.",
      },
      {
        q: "What is a buffer LVR vs maximum LVR?",
        a: "The maximum LVR is the absolute limit before a margin call is triggered. Prudent investors maintain an 'operational LVR' 5–10 percentage points below the maximum to provide a buffer against market falls without triggering a call. Lenders may also set a 'trigger LVR' slightly above the maximum that automatically generates the call notice.",
      },
    ],
    relatedSlugs: [
      "how-do-etfs-work",
      "what-is-capital-gains-tax",
      "how-does-dividend-investing-work",
      "how-to-invest-in-shares",
    ],
    relatedTools: [
      { label: "Compare share brokers", href: "/share-trading" },
      { label: "Compare ETFs", href: "/etfs" },
    ],
  },
  {
    slug: "how-does-inflation-affect-investments",
    category: "investing",
    question: "How does inflation affect investments in Australia?",
    metaTitle: "How Inflation Affects Investments in Australia (2026)",
    metaDescription:
      "Inflation erodes purchasing power and affects investment returns differently across asset classes. Learn how shares, property, bonds, and cash perform during inflationary periods, and how the RBA's 2–3% band shapes strategy.",
    shortAnswer:
      "Inflation reduces the purchasing power of money over time, meaning a 7% nominal return during a 4% inflation period delivers only a 3% real return. Shares and property have historically outpaced inflation over long horizons, while cash and fixed-rate bonds underperform. Understanding real versus nominal returns is essential for assessing whether your portfolio is actually growing.",
    sections: [
      {
        heading: "Real vs nominal returns",
        body: "Nominal return is the headline percentage gain; real return adjusts for inflation. The Fisher equation approximates: real return ≈ nominal return − inflation rate. If your term deposit pays 4.5% and CPI is 3.5%, your real return is roughly 1%. Over 30 years, 3% annual inflation halves the real value of money. Planning for retirement using nominal figures without adjusting for inflation routinely understates how much capital is needed.",
      },
      {
        heading: "Asset classes in inflationary environments",
        body: "Shares (equities) historically beat inflation over 10+ year horizons because companies can raise prices and grow nominal earnings. The ASX 200 total return (dividends reinvested) has averaged roughly 9–10% p.a. over 30 years against average CPI of ~2.5%. Property also tends to keep pace or beat inflation due to construction cost indexation and rental income growth. Bonds are hurt by inflation — rising inflation leads to rising interest rates which push bond prices down. Cash in savings accounts often trails inflation, especially when the RBA holds rates below CPI.",
      },
      {
        heading: "The RBA's inflation band and investment implications",
        body: "The Reserve Bank of Australia targets CPI inflation of 2–3% on average over time. When inflation exceeds this band (as in 2022–23 when it reached 7.8%), the RBA raises the cash rate, making borrowing more expensive, reducing asset valuations, and favouring savers. High-growth, long-duration assets (tech stocks, REITs) are particularly sensitive to rate rises because their value depends on discounting future cash flows. Value stocks and commodity exporters tend to be more resilient.",
      },
      {
        heading: "Inflation-linked bonds and real assets",
        body: "Australian government inflation-linked bonds (Capital Indexed Bonds) pay a coupon on a principal amount that grows with CPI. They provide explicit inflation protection but are complex and illiquid for retail investors. Infrastructure assets — toll roads, airports, utilities — often have revenues contractually indexed to CPI, making them effective inflation hedges inside superannuation or managed funds. Commodities (gold, oil, agricultural products) also tend to rise with inflation.",
      },
      {
        heading: "Superannuation and inflation",
        body: "Super funds are long-horizon investors with a natural inflation hedge through equity and property allocations. The key risk is the real value of your super balance at retirement — a $1 million balance in 2026 will have significantly less purchasing power at age 65 if inflation averages 3% annually. ASFA's comfortable retirement standard ($72k/yr in FY2026) will be higher in nominal terms by then. Check that your super fund's default option targets returns of CPI +3% to +4% or better over rolling 10-year periods.",
      },
    ],
    faqs: [
      {
        q: "Is gold a good inflation hedge in Australia?",
        a: "Gold has a mixed track record as an inflation hedge over short periods but has preserved purchasing power over very long horizons. It pays no income, so opportunity cost is high when real interest rates are positive. AUD-denominated gold also depends on the AUD/USD exchange rate — a stronger Australian dollar can offset gains from rising USD gold prices.",
      },
      {
        q: "How does inflation affect property investment?",
        a: "Property benefits from inflation in two ways: rental income typically rises with CPI over time, and replacement construction costs (and hence values of existing dwellings) increase with input costs. Mortgage holders with fixed-rate loans benefit in real terms as the real value of their debt erodes. However, rising inflation also triggers interest rate increases that reduce borrowing capacity and can suppress prices in the short term.",
      },
      {
        q: "What is the difference between CPI and underlying inflation?",
        a: "The Consumer Price Index (CPI) measures the change in price of a fixed basket of goods and services. 'Underlying' or 'trimmed mean' inflation removes the most volatile items (fuel, fresh produce) to show the persistent inflation trend — this is the measure the RBA targets most closely. CPI can spike due to temporary supply shocks while underlying remains contained.",
      },
    ],
    relatedSlugs: [
      "how-do-etfs-work",
      "how-does-compound-interest-work",
      "how-does-superannuation-work",
      "what-is-a-managed-fund",
    ],
    relatedTools: [
      { label: "Compare ETFs", href: "/etfs" },
      { label: "Compare super funds", href: "/super" },
    ],
  },
  {
    slug: "what-is-salary-sacrifice-australia",
    category: "tax",
    question: "How does salary sacrifice work in Australia?",
    metaTitle: "Salary Sacrifice Australia: Super, Novated Leases & Tax (2026)",
    metaDescription:
      "Salary sacrifice lets you redirect pre-tax income into super contributions or fringe benefits, reducing taxable income. Learn the concessional cap, novated leases, and the tax benefits at different income levels.",
    shortAnswer:
      "Salary sacrifice allows you to redirect a portion of your pre-tax salary into superannuation or employer-provided benefits (such as a novated car lease), reducing your assessable taxable income and hence the income tax you pay. Salary sacrifice super contributions are taxed at the 15% concessional rate inside super — rather than your marginal rate — and count toward the $30,000 annual concessional contributions cap.",
    sections: [
      {
        heading: "How salary sacrifice into super works",
        body: "You agree with your employer to forgo a portion of future salary in exchange for additional employer super contributions. Because the contributions are made before income tax, they reduce your assessable income. On $100,000 salary, sacrificing $10,000 into super means you pay income tax on $90,000 instead of $100,000. The $10,000 enters super taxed at 15% concessional rate. For someone on a 39% marginal rate (32.5% + 2% Medicare), the tax saving is 24 cents per dollar sacrificed.",
      },
      {
        heading: "Concessional contributions cap",
        body: "All concessional contributions — including mandatory employer Superannuation Guarantee contributions (11.5% in FY2026), salary sacrifice, and any personal deductible contributions — count toward the annual concessional cap of $30,000 (FY2025–26). Exceeding the cap means the excess is included in your assessable income and taxed at marginal rates (with a 15% offset for tax already paid). High earners and those near retirement approaching the cap should model contributions carefully.",
      },
      {
        heading: "Fringe benefits: novated leases and beyond",
        body: "Beyond super, salary sacrifice can fund fringe benefits such as novated car leases, laptops, work-related memberships, and (for certain employers) expense payments. Under a novated lease, your employer leases a car from a financier, deducting repayments from your pre-tax salary. You save income tax on those lease payments, and running costs (fuel, insurance, registration) can also be salary sacrificed. The employer pays FBT on the benefit, though employees typically bear the FBT via a gross-up arrangement.",
      },
      {
        heading: "Tax benefits at different income levels",
        body: "The higher your marginal tax rate, the larger the salary sacrifice benefit. At $45,000 (marginal rate 19% + 2% Medicare), salary sacrificing $5,000 saves $350 above super concessional savings. At $120,000 (marginal rate 37% + 2%), the same $5,000 saves $1,200 — over three times more. Very high earners (income + concessional contributions > $250,000) pay an additional 15% Division 293 tax on their concessional contributions, halving the tax advantage.",
      },
      {
        heading: "Interaction with the Superannuation Guarantee",
        body: "Your employer's mandatory SG contributions (11.5% of ordinary time earnings in FY2026) count toward the $30,000 concessional cap. If your employer contributes $11,500 on a $100,000 salary, you have $18,500 of cap remaining for salary sacrifice. Agreements made before 1 January 2020 often had salary sacrifice reduce the SG base — the 2020 SG integrity legislation fixed this so SG is calculated on ordinary time earnings regardless of sacrifice amount.",
      },
    ],
    faqs: [
      {
        q: "Can I access salary sacrificed super contributions early?",
        a: "No. Salary sacrifice contributions go into super as concessional contributions and are subject to the same preservation rules as all super — you generally cannot access them until you meet a condition of release (retirement, preservation age, terminal illness, etc.). This is a key trade-off: you reduce tax now but lock funds away until retirement.",
      },
      {
        q: "Does salary sacrifice affect my income for other purposes?",
        a: "Yes. Reducing your taxable income through salary sacrifice affects means-tested government benefits (Family Tax Benefit, childcare subsidies, HECS-HELP repayment thresholds), income-assessed Medicare Levy Surcharge thresholds, and borrowing capacity calculations. Some lenders use pre-sacrifice salary for serviceability; others use the sacrifice package gross. Check with your broker.",
      },
      {
        q: "What is the carry-forward concessional contribution rule?",
        a: "If your total super balance is below $500,000 on 30 June of the previous year, you can carry forward unused concessional cap space from up to five prior years and make a larger concessional contribution in a future year. This allows people who had breaks from the workforce to catch up super contributions in high-income years.",
      },
    ],
    relatedSlugs: [
      "how-does-superannuation-work",
      "what-is-concessional-contribution",
      "what-are-the-super-contribution-limits",
      "what-is-the-tax-rate-on-super",
    ],
    relatedTools: [
      { label: "Super contributions calculator", href: "/super-contributions-calculator" },
      { label: "Compare super funds", href: "/super" },
    ],
  },
  {
    slug: "how-to-reduce-capital-gains-tax-australia",
    category: "tax",
    question: "How can I reduce capital gains tax in Australia?",
    metaTitle: "How to Reduce Capital Gains Tax in Australia (2026 Strategies)",
    metaDescription:
      "Legal strategies to minimise CGT in Australia include the 12-month discount, tax-loss harvesting, timing asset sales across financial years, using trusts, and small-business CGT concessions. Learn how each works.",
    shortAnswer:
      "Capital gains tax can be legally minimised through several strategies: holding assets for more than 12 months to access the 50% CGT discount (for individuals), tax-loss harvesting to offset gains with capital losses, timing disposals to fall in a lower-income year, directing distributions through trusts, and — for eligible small-business owners — applying up to four additional CGT concessions that can reduce or eliminate the gain entirely.",
    sections: [
      {
        heading: "The 12-month CGT discount",
        body: "Australian resident individuals and trusts that hold a CGT asset for more than 12 months are entitled to a 50% discount on the capital gain before it is included in assessable income. For superannuation funds the discount is 33.33%; companies receive no discount. The discount effectively halves the tax on long-term investments — an individual on a 47% marginal rate pays 23.5% effective CGT on a discounted gain. Ensure the 12-month holding period is genuine; the ATO scrutinises wash-sale arrangements designed to reset cost bases.",
      },
      {
        heading: "Tax-loss harvesting",
        body: "Capital losses can only be offset against capital gains, not ordinary income. Strategically selling underperforming assets before 30 June to crystallise losses that offset gains in the same year reduces net CGT. Losses not used in the current year carry forward indefinitely. When harvesting losses, avoid the 'wash sale' trap — selling an asset and immediately repurchasing an identical one; the ATO has anti-avoidance provisions and the ATO's 2024 guidance specifically flagged aggressive wash-sale activity.",
      },
      {
        heading: "Timing disposals across financial years",
        body: "If your income will be lower next financial year (for example, after retirement or changing jobs), deferring an asset sale past 1 July pushes the gain into the lower-income year. Similarly, if you expect a large capital gain, avoiding other assessable income in the same year — by deferring the exercise of options or timing trust distributions carefully — reduces the total tax rate applied. This is legal tax planning as long as it involves genuine commercial decisions.",
      },
      {
        heading: "Using trust structures",
        body: "Family trusts can distribute capital gains to beneficiaries with lower marginal tax rates, effectively splitting the tax burden across multiple taxpayers. A discretionary trust can pass the 50% discount through to individual beneficiaries who have been allocated the gain. The trustee must be careful with streaming rules (s115-C ITAA 1997) to avoid double-counting the discount. The ATO has scrutinised trust distribution minutes — ensure minutes are signed before 30 June each year.",
      },
      {
        heading: "Small-business CGT concessions",
        body: "Eligible small businesses (active assets below $6 million net or turnover below $2 million) may access up to four additional concessions: 15-year exemption (full CGT exemption if asset held 15+ years), 50% active-asset reduction (halves the gain), retirement exemption (up to $500,000 lifetime limit if contributed to super), and rollover (defer gain if you buy a replacement asset). These concessions are complex, can completely eliminate CGT, and are commonly used when selling a business or commercial property. Professional tax advice is essential.",
      },
    ],
    faqs: [
      {
        q: "Can I donate shares to charity to avoid CGT?",
        a: "Donating listed shares to a Deductible Gift Recipient (DGR) charity directly avoids realising a capital gain — there is no disposal for CGT purposes in some structures — and you receive a tax deduction for the market value of the shares. The ATO's guidance under Subdivision 30-C allows donors to claim the market value of donated shares. This strategy works best for highly appreciated shares where the embedded gain would otherwise create significant CGT.",
      },
      {
        q: "Does my principal residence have CGT exemption?",
        a: "Yes. Your main residence (the home you live in) is fully exempt from CGT on sale provided it has always been your principal place of residence and has never been used to produce income. If you have rented out part of your home or used it for business, a partial CGT liability applies using the floor-space and time fractions.",
      },
      {
        q: "What is the CGT implications of selling investment property?",
        a: "Selling an investment property triggers CGT on the difference between the adjusted cost base (purchase price + buying costs + capital improvements) and the sale proceeds less selling costs. The 50% discount applies if held over 12 months. Depreciation claimed under Division 43 (capital works) reduces the cost base, potentially increasing the gain. Keep meticulous records of all capital improvements and depreciation schedules.",
      },
    ],
    relatedSlugs: [
      "what-is-capital-gains-tax",
      "how-does-negative-gearing-work",
      "what-is-a-family-trust",
      "what-is-a-trust-structure-for-investing",
    ],
    relatedTools: [
      { label: "Compare share brokers", href: "/share-trading" },
      { label: "Find a financial adviser", href: "/financial-advisers" },
    ],
  },
  {
    slug: "what-is-the-first-home-guarantee",
    category: "property",
    question: "What is the First Home Guarantee in Australia?",
    metaTitle: "First Home Guarantee Australia: 5% Deposit, No LMI (2026)",
    metaDescription:
      "The First Home Guarantee lets eligible buyers purchase with a 5% deposit and no Lenders Mortgage Insurance. Learn eligibility, income caps, property price caps by state, and how it stacks with the FHSS.",
    shortAnswer:
      "The First Home Guarantee (FHBG) allows eligible first home buyers to purchase a property with just a 5% deposit, with the federal government guaranteeing 15% of the loan to avoid Lenders Mortgage Insurance (LMI). This saves buyers $10,000–$35,000 in LMI premiums. Income caps, property price caps by state, and limited scheme places apply each financial year.",
    sections: [
      {
        heading: "How the guarantee works",
        body: "Housing Australia (formerly NHFIC) provides a guarantee to the lender covering the difference between the buyer's 5% deposit and the standard 20% threshold. The buyer still borrows 95% of the purchase price — there is no government cash payment. The guarantee allows the lender to waive LMI, which is otherwise charged when an LVR exceeds 80%. The guarantee remains in place until the borrower's equity reaches 20% through repayments and/or capital growth.",
      },
      {
        heading: "Eligibility criteria (2026)",
        body: "Australian citizens or permanent residents aged 18 or over. First home buyers only — you must never have owned or held a legal interest in residential property in Australia. Income threshold: $125,000 for individuals, $200,000 for couples (based on the prior financial year's taxable income). Plan to occupy as principal place of residence (not investment). Application must be made through an approved participating lender.",
      },
      {
        heading: "Property price caps by state (FY2026)",
        body: "Capital cities and regional centres: NSW $900,000, VIC $800,000, QLD $700,000, WA $600,000, SA $600,000, TAS $600,000, ACT $750,000, NT $600,000. For the rest of each state: NSW $750,000, VIC $650,000, QLD $550,000, WA $450,000, SA $450,000, TAS $450,000. Prices are reviewed periodically. Buyers should check the Housing Australia website for the current schedule at time of application.",
      },
      {
        heading: "Regional First Home Buyer Guarantee (RFHBG)",
        body: "A companion scheme — the Regional First Home Buyer Guarantee — applies the same 5% deposit and no-LMI benefit but is restricted to buyers purchasing in regional Australia who have lived or worked regionally for the preceding 12 months. It effectively extends the FHBG to regional areas where affordability pressure has increased. Place allocations are separate from the main FHBG quota.",
      },
      {
        heading: "Stacking with other first home buyer schemes",
        body: "The FHBG can be used with the First Home Super Saver Scheme (FHSS), where super savings are released for the deposit. State-based First Homeowner Grants (FHOG) generally also stack with the FHBG, providing a cash grant of $10,000–$30,000 depending on state and property type. The Family Home Guarantee (2% deposit for eligible single parents who may have previously owned) is a separate scheme with different criteria.",
      },
    ],
    faqs: [
      {
        q: "How many First Home Guarantee places are available?",
        a: "The federal government allocates a set number of FHBG places each financial year. In recent years the combined allocation across FHBG, RFHBG, and FHG has been 50,000 places. Places are taken on a first-come-first-served basis via participating lenders. Schemes typically fill up mid-year — apply early in the financial year for best availability.",
      },
      {
        q: "Does using the FHBG affect my ability to get a larger loan?",
        a: "No. The guarantee does not change the loan amount the bank will approve — that is still based on your income and expenses serviceability. It only removes the LMI premium that would otherwise apply. Your repayments and borrowing capacity are the same as any 95% LVR loan.",
      },
      {
        q: "What if I want to rent out the property later?",
        a: "The FHBG requires you to occupy the property as your principal residence. If you subsequently move out and rent the property, you may be in breach of scheme conditions. Housing Australia may require the guarantee to be discharged — which could force you to pay LMI if your equity is still below 20%. Check the scheme's conditions of approval before changing occupancy.",
      },
    ],
    relatedSlugs: [
      "what-is-a-first-home-super-saver-scheme",
      "how-to-buy-property-in-australia",
      "how-does-negative-gearing-work",
    ],
    relatedTools: [
      { label: "Mortgage calculator", href: "/mortgage-calculator" },
      { label: "Compare home loans", href: "/home-loans" },
    ],
  },
  {
    slug: "how-does-land-tax-work-in-australia",
    category: "property",
    question: "How does land tax work in Australia?",
    metaTitle: "How Land Tax Works in Australia: State Rates & Exemptions (2026)",
    metaDescription:
      "Land tax is a state-based annual tax on land values above a threshold. Learn which states charge land tax, the principal residence exemption, trust surcharges, foreign buyer surcharges, and how rates differ.",
    shortAnswer:
      "Land tax is an annual state-based tax levied on the unimproved value of land you own above a threshold. It is assessed at 31 December (in most states) and varies significantly by state. Your principal place of residence is generally exempt, but investment properties, holiday homes, and properties held in trusts or by foreign persons may be subject to surcharges.",
    sections: [
      {
        heading: "What land tax is and how it is assessed",
        body: "Land tax is charged by state and territory governments on the taxable value of land owned as at a specified date (usually 31 December or 30 June, depending on the state). The taxable value is the unimproved land value — not the value of the building on it — and is determined by the state's valuation authority (e.g., NSW Valuer General, Victorian Valuer-General). Each owner's landholdings are aggregated within the state to determine if they exceed the tax-free threshold.",
      },
      {
        heading: "State thresholds and rates",
        body: "Thresholds and rates differ sharply by state. In FY2026: NSW — $1,075,000 threshold, 1.6% base rate scaling to 2% for holdings above $6.57 million; VIC — $300,000 threshold (primary production and trusts differ), graduated rates 0.2–2.25%; QLD — $600,000 threshold for individuals, 1–2.75% above threshold; SA — $723,000 threshold, 0.5–3.7%; WA — $300,000 threshold, 0.09–2.67%; ACT — no threshold, rates 0.15–0.92% on AUV; TAS and NT have separate regimes. Land tax is NOT a federal tax.",
      },
      {
        heading: "Principal residence exemption",
        body: "All states exempt your principal place of residence (PPR/PPOR) from land tax provided you genuinely reside there as your main home. You can only have one PPR exemption at a time. Exemptions are not automatic in all states — some require an annual application. Temporarily vacating (e.g., six-month interstate posting) generally preserves the exemption provided the property is not rented.",
      },
      {
        heading: "Trust surcharges",
        body: "Several states (notably Victoria and New South Wales) impose higher land tax rates on properties held in discretionary (family) trusts. In Victoria, a 0.5% surcharge applies to discretionary trusts on top of normal land tax rates. NSW charges trust land tax at a flat 1.6% with no tax-free threshold for residential trusts. These surcharges were introduced to prevent wealth concentration hiding behind trust structures. Fixed unit trusts and SMSFs often have different treatment.",
      },
      {
        heading: "Foreign person surcharges",
        body: "Most states and the ACT impose additional land tax surcharges on foreign purchasers and foreign-owned entities. In NSW, a 4% annual foreign surcharge applies on top of standard land tax for foreign persons. VIC charges a 2% absentee owner surcharge. These surcharges compound for offshore investors holding Australian residential land. Foreign citizens must also be aware of duty surcharges at purchase (separate from annual land tax).",
      },
    ],
    faqs: [
      {
        q: "Is land tax deductible for investment properties?",
        a: "Yes. Land tax paid on investment properties is generally deductible against rental income under s8-1 ITAA 1997 as a cost incurred in producing assessable income. Land tax on your principal residence is not deductible as it produces no assessable income.",
      },
      {
        q: "Do I pay land tax in multiple states if I own property interstate?",
        a: "Yes, but each state assesses only the land within that state's borders. You may therefore owe land tax in two or more states. Some people use this to stay below thresholds in each individual state, but as portfolios grow this strategy becomes less effective. There is no national aggregation — each state applies its own threshold independently.",
      },
      {
        q: "Does an SMSF pay land tax?",
        a: "SMSFs are generally not eligible for the principal residence exemption (they are not natural persons living in the property). Commercial property held in an SMSF may be exempt from land tax in some states where business real property exemptions apply. Residential investment property in an SMSF is subject to land tax. Rates and exemptions vary by state — seek state-specific advice.",
      },
    ],
    relatedSlugs: [
      "how-does-negative-gearing-work",
      "how-to-buy-property-in-australia",
      "what-is-a-family-trust",
      "what-is-a-trust-structure-for-investing",
    ],
    relatedTools: [
      { label: "Find a financial adviser", href: "/financial-advisers" },
      { label: "Compare property investment platforms", href: "/property-platforms" },
    ],
  },
  {
    slug: "what-is-a-bare-trust",
    category: "property",
    question: "What is a bare trust and why do SMSFs use them?",
    metaTitle: "What Is a Bare Trust? SMSF Property & LRBA Explained (2026)",
    metaDescription:
      "A bare trust gives the beneficiary absolute entitlement to assets held by the trustee. SMSFs use bare trusts to borrow and buy property under Limited Recourse Borrowing Arrangements (LRBAs). Learn how the structure works.",
    shortAnswer:
      "A bare trust (also called a holding trust or custodian trust) is a trust structure in which the trustee holds a specific asset on behalf of a beneficiary who has an absolute and immediate entitlement to both the asset and any income it produces. SMSFs use bare trusts as the required legal mechanism for buying assets on borrowed money under a Limited Recourse Borrowing Arrangement — the asset sits in the bare trust until the loan is fully repaid, then legal title transfers to the SMSF trustee.",
    sections: [
      {
        heading: "What a bare trust is",
        body: "In a bare trust, the trustee is a 'naked' title holder — they hold legal ownership but have no discretion over the asset. The beneficiary (in the SMSF context, the SMSF itself) has the equitable interest and controls what happens to the asset. Unlike a discretionary trust where the trustee decides distributions, a bare trustee acts solely on the beneficiary's instructions. Bare trusts are simple documents (often a one-page deed) and do not require ongoing trustee discretion.",
      },
      {
        heading: "Limited Recourse Borrowing Arrangements (LRBAs) for SMSFs",
        body: "Section 67A of the Superannuation Industry (Supervision) Act 1993 permits SMSFs to borrow money to acquire a 'single acquirable asset' provided it is held in a bare trust and the lender's recourse is limited to that asset (i.e., if the SMSF defaults, the lender cannot pursue other SMSF assets). The LRBA structure requires: (1) a bare trust holding the asset, (2) the SMSF as the beneficial owner and loan obligor, (3) a lender (related party or arm's length), and (4) a loan at commercial terms (post-2016 ATO safe harbour rates).",
      },
      {
        heading: "Why the bare trust is legally required",
        body: "SIS Act s67A requires that borrowed funds be used to acquire an asset held on trust. The SMSF trustee cannot hold legal title to borrowed property directly until the loan is repaid — if the SMSF defaults, the lender needs a separate trustee holding the asset to exercise its security rights without contaminating other SMSF assets. Once the loan is fully repaid, the bare trustee transfers legal title to the SMSF trustee at no additional duty (in most states — duties treatment varies).",
      },
      {
        heading: "ATO compliance requirements",
        body: "The ATO has issued extensive guidance on LRBAs (LCR 2016/5, PCG 2016/5). Key compliance points: the bare trust must be established before the purchase contract is entered (critical — cannot be backdated), the asset must be a single acquirable asset (no development or major renovation while under LRBA), the SMSF investment strategy must justify the borrowing, and related-party loans must meet the ATO's safe harbour interest rate and LVR conditions. Non-compliance can trigger the loan to be treated as an in-house asset — a SIS Act breach.",
      },
      {
        heading: "Residential vs commercial property in SMSFs via bare trust",
        body: "SMSFs can borrow to buy both residential and commercial property under an LRBA. Commercial property (e.g., the SMSF buys the premises of the members' own business) is a common strategy — the business pays commercial rent to the SMSF, which accumulates tax-effectively. Residential property can also be purchased, but cannot be used or rented by members or their related parties. Both must be held in a bare trust for the duration of the loan.",
      },
    ],
    faqs: [
      {
        q: "Can an SMSF borrow from a related party for a bare trust LRBA?",
        a: "Yes, but the loan must be on arm's-length commercial terms as specified in the ATO's Practical Compliance Guideline PCG 2016/5. The safe harbour interest rate for residential property is the RBA indicator lending rate for small business; for listed shares it is different. The LVR must not exceed 70% for residential property, 60% for other real property, and 50% for listed shares. Departing from these terms requires independent evidence of arm's-length pricing.",
      },
      {
        q: "What happens to the bare trust when the SMSF loan is repaid?",
        a: "Once the final loan payment is made, the bare trustee executes a transfer of legal title to the SMSF trustee. In most states, this transfer is exempt from stamp duty as no change in beneficial ownership has occurred — but duty treatment varies (Queensland and some states may assess nominal duty). Update the SMSF's asset register and ensure the lender discharges any registered mortgage.",
      },
      {
        q: "Does the bare trust need its own TFN or ABN?",
        a: "No. A bare trust that holds a single acquirable asset for an SMSF is generally not a separate taxpaying entity and does not need its own TFN or ABN. All income and capital gains are reported in the SMSF's tax return as if the SMSF held the asset directly. Some accountants register an ABN for administrative convenience — seek advice from your SMSF auditor.",
      },
    ],
    relatedSlugs: [
      "what-is-a-self-managed-super-fund",
      "what-is-smsf-and-is-it-worth-it",
      "what-is-a-trust-structure-for-investing",
      "how-to-buy-property-in-australia",
    ],
    relatedTools: [
      { label: "Compare SMSF providers", href: "/smsf" },
      { label: "Find a financial adviser", href: "/financial-advisers" },
    ],
  },
  {
    slug: "what-are-the-super-contribution-limits",
    category: "super",
    question: "What are the superannuation contribution limits in Australia?",
    metaTitle: "Super Contribution Limits Australia FY2026: Concessional & Non-Concessional Caps",
    metaDescription:
      "The concessional super contribution cap is $30,000 and the non-concessional cap is $120,000 in FY2026. Learn about the bring-forward rule, carry-forward contributions, total super balance thresholds, and what happens if you exceed the caps.",
    shortAnswer:
      "In FY2025–26, the concessional (pre-tax) super contribution cap is $30,000 and the non-concessional (after-tax) cap is $120,000 per year. Exceeding either cap triggers additional tax — excess concessional contributions are included in assessable income; excess non-concessional contributions are taxed at 47%. Bring-forward and carry-forward rules allow eligible Australians to contribute more in certain years.",
    sections: [
      {
        heading: "Concessional contributions cap ($30,000)",
        body: "Concessional contributions include mandatory employer Super Guarantee contributions (11.5% of ordinary time earnings in FY2026), salary sacrifice contributions, and personal deductible contributions (where you claim a tax deduction for out-of-pocket contributions). All count toward the same $30,000 annual cap. The cap was $27,500 in FY2024 and was indexed to AWOTE (Average Weekly Ordinary Time Earnings) in $2,500 increments. Excess concessional contributions are included in your assessable income, taxed at marginal rates, with a 15% offset for tax already paid in the fund.",
      },
      {
        heading: "Non-concessional contributions cap ($120,000)",
        body: "Non-concessional contributions are after-tax personal contributions for which no tax deduction is claimed. The annual cap is $120,000 (four times the concessional cap). If you make a non-concessional contribution when your total super balance (TSB) is $1.9 million or above on 30 June of the prior year, your non-concessional cap is reduced to nil. Between $1.66 million and $1.9 million TSB, partial caps apply. Excess non-concessional contributions are taxed at 47% unless you elect to withdraw them.",
      },
      {
        heading: "Bring-forward rule",
        body: "Individuals under age 75 may trigger the bring-forward rule if their TSB was below $1.66 million on 30 June of the prior year. This allows you to contribute up to three years of non-concessional cap ($360,000) in a single year or over two years ($240,000), bringing forward future contributions. The bring-forward is triggered automatically when you make a non-concessional contribution exceeding $120,000. Once triggered, the three-year window begins and you cannot contribute again until the window closes or the bring-forward is fully used.",
      },
      {
        heading: "Carry-forward concessional contributions",
        body: "Since 1 July 2019, unused concessional cap space from up to five prior financial years can be carried forward and used in a subsequent year if your total super balance is below $500,000 on the prior 30 June. For example, if you made only $20,000 in concessional contributions each year for three years (unused: $10,000 × 3 = $30,000), you could make a $60,000 concessional contribution in Year 4. This suits people who had career breaks or self-employed periods with lower contributions.",
      },
      {
        heading: "Exceeding the caps: consequences",
        body: "Excess concessional contributions: assessed as income, taxed at marginal rate minus the 15% concessional tax offset. You must pay the shortfall from your tax return; the excess can remain in the fund. Excess non-concessional contributions: the fund must release the excess plus associated earnings back to you, and the earnings component is taxed at marginal rate. If you keep the excess, it is taxed at 47%. The ATO will issue an excess contributions determination — act promptly to avoid the default 47% rate.",
      },
    ],
    faqs: [
      {
        q: "Do employer contributions count toward my concessional cap?",
        a: "Yes. All employer contributions — mandatory SG, salary sacrifice, and any additional employer contributions — count toward your $30,000 concessional cap. If your employer contributes $15,000 as SG on a $130,000 salary, you have $15,000 of cap remaining for salary sacrifice or personal deductible contributions.",
      },
      {
        q: "What is the total super balance threshold?",
        a: "The total super balance (TSB) is the combined value of all your super interests across all funds at 30 June. The key thresholds in FY2026 are: $500,000 (carry-forward concessional access), $1.66 million (full bring-forward available), $1.78 million (two-year bring-forward available), $1.9 million (one-year bring-forward available), $1.9 million and above (no non-concessional contributions allowed).",
      },
      {
        q: "Can I make super contributions after age 75?",
        a: "From 1 January 2025, the work test for personal contributions between ages 67–74 was removed. However, from age 75, you can no longer make personal voluntary contributions. Employer SG contributions continue to be required by law regardless of age if you are employed. Spouse contributions can be made for a spouse aged under 75.",
      },
    ],
    relatedSlugs: [
      "what-is-concessional-contribution",
      "how-does-superannuation-work",
      "what-is-salary-sacrifice-australia",
      "what-is-the-tax-rate-on-super",
    ],
    relatedTools: [
      { label: "Super contributions calculator", href: "/super-contributions-calculator" },
      { label: "Compare super funds", href: "/super" },
    ],
  },
  {
    slug: "when-can-i-access-my-super",
    category: "super",
    question: "When can I access my superannuation in Australia?",
    metaTitle: "When Can You Access Your Super in Australia? (2026 Guide)",
    metaDescription:
      "You can generally access super at your preservation age (55–60 depending on birth year) after retiring. Learn about conditions of release, TTR pensions, compassionate grounds, hardship access, and the First Home Super Saver Scheme.",
    shortAnswer:
      "You can generally access your superannuation when you reach your preservation age and meet a condition of release. Preservation ages range from 55 (born before 1 July 1960) to 60 (born after 30 June 1964). Most people access super after age 60 when benefit payments are fully tax-free. Earlier access is possible on compassionate grounds, permanent incapacity, terminal illness, severe financial hardship, or through the First Home Super Saver Scheme.",
    sections: [
      {
        heading: "Preservation age by birth year",
        body: "Your preservation age determines when you can first access super. Born before 1/7/1960: age 55. Born 1/7/1960–30/6/1961: age 56. Born 1/7/1961–30/6/1962: age 57. Born 1/7/1962–30/6/1963: age 58. Born 1/7/1963–30/6/1964: age 59. Born after 30/6/1964: age 60. Once you reach preservation age AND retire (cease employment and do not intend to be re-employed full-time), your entire preserved benefit is accessible.",
      },
      {
        heading: "Tax on super withdrawals",
        body: "The tax you pay on super withdrawals depends on your age and the components (taxable vs tax-free) in your fund. Aged 60 or over: all benefits from a taxed super fund are tax-free (no tax on lump sums or pensions). Aged preservation age to 59: taxable component of lump sums above a threshold ($235,000 in FY2026) taxed at 15% (plus Medicare Levy); below the threshold, tax-free. Below preservation age: taxable component taxed at 20% (plus Medicare Levy) in almost all cases.",
      },
      {
        heading: "Transition to retirement (TTR) pension",
        body: "Once you reach preservation age but have not yet retired, you can commence a Transition to Retirement (TTR) pension. This allows you to draw 4–10% of your account balance per year as a pension income stream. TTR pensions are taxed as income if you are under 60, but supplement earned income, allowing some to salary sacrifice more into super while maintaining cash flow. The SMSF TTR tax concession (investment earnings exempt from tax) was removed in 2017 for accumulation-phase TTR accounts.",
      },
      {
        heading: "Compassionate grounds and hardship",
        body: "The ATO can approve early super access on compassionate grounds for: medical treatment (you or a dependent) not covered by Medicare, preventing foreclosure or forced sale of your home, palliative care, funeral expenses for a dependent, modification of home or vehicle for severe disability. Severe financial hardship access requires: receiving a Centrelink income support payment for 26 consecutive weeks and being unable to meet reasonable and immediate family living expenses. The maximum accessible amount is $10,000 in a 12-month period.",
      },
      {
        heading: "First Home Super Saver Scheme (FHSS) and other exceptions",
        body: "The FHSS allows first home buyers to release voluntary super contributions (up to $15,000 per year, $50,000 lifetime maximum) made since 1 July 2017 to use as a home deposit. Withdrawals are taxed at marginal rate minus a 30% offset. Terminal illness: if you have two medical certifications of terminal illness with a life expectancy under 24 months, your entire super balance is released tax-free. Permanent incapacity: if you are permanently unable to work due to physical or mental ill-health, early access is available. Temporary incapacity (death and disability) insurance inside super may also trigger payments.",
      },
    ],
    faqs: [
      {
        q: "Can I access super while still working?",
        a: "Yes, under a Transition to Retirement (TTR) pension from preservation age. You can draw 4–10% of your TTR account balance annually while continuing to work. Full unrestricted access requires retiring after reaching preservation age (or reaching age 65 regardless of work status).",
      },
      {
        q: "What is the age when super access is unrestricted?",
        a: "At age 65, you can access all of your superannuation regardless of employment status — you do not need to have retired. Before 65, you must have reached preservation age and met a condition of release (retirement, TTR, etc.).",
      },
      {
        q: "Is the super preservation age changing?",
        a: "The preservation age has already been incrementally raised from 55 to 60 (completed for those born after 30 June 1964 as of 1 July 2024). The retirement age of 65 for unconditional access is not currently scheduled to change, though long-term policy discussions continue as Australians live longer.",
      },
    ],
    relatedSlugs: [
      "what-is-the-super-preservation-age",
      "how-does-superannuation-work",
      "what-is-a-transition-to-retirement-pension",
      "what-is-a-self-managed-super-fund",
    ],
    relatedTools: [
      { label: "Super contributions calculator", href: "/super-contributions-calculator" },
      { label: "Compare super funds", href: "/super" },
    ],
  },
  {
    slug: "how-to-invest-in-us-shares-from-australia",
    category: "investing",
    question: "How can Australians invest in US shares?",
    metaTitle: "How to Invest in US Shares from Australia (2026 Guide)",
    metaDescription:
      "Australians can invest in US shares via ASX-listed US ETFs, mFunds, or directly through international brokers. Learn about the W-8BEN form, 15% dividend withholding tax, USD currency risk, and PFIC rules for US citizens.",
    shortAnswer:
      "Australians can invest in US shares through ASX-listed US ETFs (the simplest route), international share brokers such as Interactive Brokers or Stake, or mFunds. You must complete a W-8BEN form to reduce dividend withholding tax from 30% to 15% under the Australia-US tax treaty. Currency risk (AUD/USD) affects returns, and dual US citizens face additional PFIC complexity.",
    sections: [
      {
        heading: "Option 1: ASX-listed US ETFs",
        body: "The easiest path is buying ASX-listed ETFs that hold US shares and are denominated in AUD. Examples: IVV (iShares S&P 500 ETF — AUD hedged: IHVV), VTS (Vanguard US Total Market ETF, AUD unhedged), NDQ (BetaShares Nasdaq 100 ETF). You buy these through any Australian share broker, pay brokerage in AUD, and receive AUD distributions. The ETF manager handles currency, foreign tax withholding, and US tax paperwork. No W-8BEN required at the investor level.",
      },
      {
        heading: "Option 2: International share brokers",
        body: "Platforms such as Interactive Brokers (IBKR), Stake, and Superhero allow Australians to buy US-listed shares (NYSE, Nasdaq) directly. You fund the account in AUD (converted to USD on the platform) and hold actual US shares. You must complete a W-8BEN (Certificate of Foreign Status) to certify non-US person status and reduce dividend withholding tax from 30% to 15%. IBKR charges USD $0.005 per share minimum USD $1 brokerage; Stake charges 0.7% FX on funding with $3 per trade.",
      },
      {
        heading: "W-8BEN and dividend withholding tax",
        body: "The US applies 30% withholding tax on dividends paid to foreign investors by default. Under the Australia-US tax treaty, Australian tax residents can reduce this to 15% by lodging a W-8BEN with their broker or the dividend paying agent. The W-8BEN is valid for three years. The 15% withheld is a foreign tax credit claimable on your Australian tax return, reducing (but not fully eliminating) Australian tax on those dividends.",
      },
      {
        heading: "Currency risk (AUD/USD)",
        body: "When you hold unhedged USD-denominated assets, your AUD return depends on both the US market return and the AUD/USD exchange rate. If the AUD strengthens from 0.65 to 0.70 against the USD while your US shares rise 10%, your AUD return is reduced to approximately 3%. Conversely, a falling AUD amplifies returns. Hedged ETFs (e.g., IHVV) remove this volatility but cost 0.10–0.15% more in management fees and do not perfectly hedge in volatile periods.",
      },
      {
        heading: "PFIC rules for US citizens and dual citizens",
        body: "Australian-listed US ETFs (such as VTS and IVV) are classified as Passive Foreign Investment Companies (PFICs) under US tax law. US citizens or green card holders holding these ETFs face punitive PFIC taxation — default 'excess distribution' treatment can result in tax at the highest marginal rate plus interest on deferred gains. Dual citizens holding Australian super funds may also face PFIC exposure through super's underlying investments. US persons in Australia should seek US tax advice before investing in Australian-listed funds.",
      },
    ],
    faqs: [
      {
        q: "Do I pay tax in both the US and Australia on US shares?",
        a: "You pay tax in Australia on all worldwide income as an Australian resident. Dividend withholding tax deducted in the US (15% after W-8BEN) is a foreign income tax offset claimable in Australia, generally reducing double taxation. Capital gains on selling US shares are reported only in Australia — the US does not typically tax capital gains of non-resident aliens (subject to the treaty).",
      },
      {
        q: "Is Stake or Interactive Brokers better for Australians?",
        a: "Interactive Brokers suits more sophisticated investors: fractional shares, options, very low margin rates, 135+ currencies, and CHESS (no) or Custodian model. Stake is simpler and better for beginners or those investing modest regular amounts. Both are ASIC-regulated and use custodian models (you don't hold ASX-CHESS sponsorship). For large portfolios, IBKR's lower brokerage costs ($0.005/share) dominate. Check current SIPC and IBKR asset protection arrangements.",
      },
      {
        q: "What is estate tax risk for Australians holding US shares directly?",
        a: "The US imposes estate tax (up to 40%) on US-sited assets held by non-US domiciliaries above USD $60,000. Direct holdings of US shares above this threshold could expose your estate to US estate tax — far exceeding any Australian estate tax. Holding US exposure through Australian-domiciled ETFs avoids this risk, as the fund (not the individual investor) owns the US securities.",
      },
    ],
    relatedSlugs: [
      "how-do-etfs-work",
      "what-are-the-best-etfs-for-beginners",
      "what-is-dollar-cost-averaging",
      "how-to-invest-in-shares",
    ],
    relatedTools: [
      { label: "Compare share brokers", href: "/share-trading" },
      { label: "Compare ETFs", href: "/etfs" },
    ],
  },
  {
    slug: "what-is-dollar-cost-averaging-vs-lump-sum",
    category: "investing",
    question: "Is dollar-cost averaging better than investing a lump sum?",
    metaTitle: "Dollar-Cost Averaging vs Lump Sum Investing: What the Evidence Says (2026)",
    metaDescription:
      "Lump-sum investing beats dollar-cost averaging about two-thirds of the time in rising markets, according to Vanguard research. Learn when DCA makes sense, the psychology behind it, and how Australian investors should choose.",
    shortAnswer:
      "Vanguard's 2012 research found that lump-sum investing outperformed dollar-cost averaging (DCA) approximately 67% of the time across US, UK, and Australian markets over 10-year horizons. Because markets trend upward over time, deploying capital immediately generally captures more return. DCA remains valuable for regular salary investors, those with genuine cash-flow constraints, or investors whose sleep-at-night factor matters more than optimising expected returns.",
    sections: [
      {
        heading: "How dollar-cost averaging works",
        body: "Dollar-cost averaging means investing a fixed dollar amount at regular intervals — say $1,000 per month into an index ETF — regardless of market conditions. When prices are low, you buy more units; when prices are high, you buy fewer. Over time, this smooths your average cost per unit. DCA is the default strategy for most salary earners who invest their savings progressively each pay cycle — it is how most superannuation contributions work.",
      },
      {
        heading: "The lump-sum evidence",
        body: "Vanguard's 2012 study 'Dollar-cost averaging just means taking risk later' analysed US, UK, and Australian market data from 1926–2011. It found that immediately investing a lump sum outperformed a 12-month DCA plan in 67% (US), 71% (UK), and 70% (Australia) of rolling 10-year periods. The reason is straightforward: equities have a long-run positive expected return, so time in market typically beats timing the market. The average outperformance of lump sum was approximately 1.3–2.4 percentage points over the DCA period.",
      },
      {
        heading: "When DCA reduces regret (not returns)",
        body: "DCA is inferior to lump-sum on a pure expected-return basis but may be superior on a risk-adjusted or psychological basis. An investor who deploys $500,000 in February 2020 and watches it fall 35% in March may panic-sell at the worst point — destroying far more value than DCA would have. If spreading investment over 6–12 months allows you to stay invested through a drawdown, DCA is rational even if it has a lower expected return. The academic literature calls this the 'regret asymmetry' — the pain of investing at the top and watching it fall exceeds the pleasure of capturing upside by going in early.",
      },
      {
        heading: "Practical considerations for Australian investors",
        body: "Most Australians do not face a genuine 'lump sum vs DCA' choice — they invest salary savings progressively. The true choice arises for: (1) inheritance or property sale proceeds sitting in a high-interest savings account, (2) an exercise of employee share options, or (3) moving from a cash allocation back into markets after going to cash. Transaction costs matter less in an era of zero-brokerage apps (Pearler, Sharesies), but FX costs for international exposure (Stake: 0.7% per topup) can add up with frequent small purchases.",
      },
      {
        heading: "Hybrid approach: value averaging",
        body: "Value averaging is a DCA variant where the target is a growing portfolio value, not a fixed investment amount — you invest more when markets are down and less (or sell) when they are up. Theoretically, it improves on pure DCA by enforcing 'buy low, buy more' discipline. In practice, it requires more cash management complexity and may result in holding large cash reserves waiting for dips that may not come. Most financial planners recommend staying simple: lump sum if you have it and the emotional constitution, DCA if you don't.",
      },
    ],
    faqs: [
      {
        q: "What is the best frequency for dollar-cost averaging?",
        a: "Monthly is the most practical for most investors — it aligns with salary cycles and keeps brokerage costs manageable. Weekly or fortnightly investing has marginally better theoretical smoothing but incurs more brokerage (use platforms with $0 brokerage or flat fees). Daily DCA (possible on some platforms) adds complexity without meaningful benefit.",
      },
      {
        q: "Does DCA work better in volatile or bear markets?",
        a: "DCA performs best relative to lump sum in falling or highly volatile markets. If you begin DCA at the start of a protracted bear market, you accumulate more units at lower prices. But since you cannot predict market direction, the long-run expectation still favours lump sum in rising markets (which represent the majority of 10-year periods). DCA during a bear market is great in hindsight; identifying the bear market in advance is the hard part.",
      },
      {
        q: "Is Pearler or Sharesies good for DCA in Australia?",
        a: "Both Pearler and Sharesies offer automated recurring investment features well-suited to DCA. Pearler is CHESS-sponsored and targets long-term investors with a clean auto-invest feature. Sharesies uses a custodian model and offers fractional investing with lower minimums. For ETF DCA strategies, both are competitive. Compare brokerage on your specific trade size before committing.",
      },
    ],
    relatedSlugs: [
      "what-is-dollar-cost-averaging",
      "how-do-etfs-work",
      "what-are-the-best-etfs-for-beginners",
      "how-to-start-investing-with-small-amounts",
    ],
    relatedTools: [
      { label: "Compare share brokers", href: "/share-trading" },
      { label: "Compare ETFs", href: "/etfs" },
    ],
  },
  {
    slug: "what-is-an-index-fund",
    category: "investing",
    question: "What is an index fund and how does it work?",
    metaTitle: "What Is an Index Fund? Passive Investing Explained for Australians (2026)",
    metaDescription:
      "An index fund tracks a market index like the ASX 200 or S&P 500, offering broad diversification at low cost. Learn how index funds work, how they compare to active funds, and which Australian index funds suit beginners.",
    shortAnswer:
      "An index fund is a type of managed fund or ETF that aims to replicate the performance of a specific market index — such as the ASX 200, S&P 500, or MSCI World — by holding the same securities in the same proportions as the index. Because there is no active stock-picking, management fees are very low (typically 0.03–0.20% per year) and long-run performance tends to beat most actively managed funds after fees.",
    sections: [
      {
        heading: "How index funds work",
        body: "An index fund manager purchases every security in the target index (or a statistically representative sample for very large indices) in proportion to each security's weight. For example, an ASX 200 index fund holds shares in all 200 companies in the S&P/ASX 200, weighted by market capitalisation. When the index rebalances (companies promoted or relegated), the fund adjusts its holdings accordingly. Investors receive their proportional share of all dividends and capital growth. The fund generates no turnover from active trading, resulting in low transaction costs and minimal capital gains distributions.",
      },
      {
        heading: "Index funds vs active funds",
        body: "Active fund managers attempt to outperform a benchmark index by selecting individual securities and timing the market. Decades of SPIVA (S&P Indices Versus Active) data show that after fees, the majority of active Australian equity funds underperform the S&P/ASX 200 Total Return index over 5- and 10-year periods. SPIVA Australia 2025 reported that 78% of Australian active general equity funds underperformed over 15 years. The primary culprit is management expense ratios of 0.8–1.5% versus 0.07–0.20% for index funds — a gap compounding to enormous amounts over decades.",
      },
      {
        heading: "ASX 200 and global index funds in Australia",
        body: "Common Australian index funds and their management expense ratios (approximate): VAS — Vanguard Australian Shares Index ETF (ASX 200 + mid-caps), MER 0.07%; STW — SPDR S&P/ASX 200 ETF, MER 0.05%; VGS — Vanguard MSCI Index International Shares ETF (World ex-Australia), MER 0.18%; BGBL — BetaShares Global Shares ETF (developed markets), MER 0.08%; IVV — iShares S&P 500 ETF, MER 0.03%. These ETFs are available on ASX through any broking account.",
      },
      {
        heading: "How index rebalancing works",
        body: "The S&P/ASX 200 is reviewed quarterly by S&P Dow Jones Indices. Companies that grow above the threshold size enter the index; those that shrink or delist exit. When a company is added to the index, index fund managers must buy it; when one is removed, they must sell it. This forces a degree of 'buy high, sell low' trading — a theoretical disadvantage sometimes called 'reconstitution cost'. In practice, this cost is small (estimated 0.03–0.05% per year for the ASX 200) relative to the fee savings over active funds.",
      },
      {
        heading: "Dividend reinvestment and tax",
        body: "Index ETFs distribute dividends quarterly or semi-annually. Investors can elect to receive cash or enrol in a distribution reinvestment plan. Dividends from Australian index funds carry significant franking credits — VAS typically distributes 80–100% franked dividends. Distributions are taxed as ordinary income in the year received. Index funds are generally more tax-efficient than active funds because low turnover means fewer realised capital gains distributed to unit holders.",
      },
    ],
    faqs: [
      {
        q: "What is the difference between an index fund and an ETF?",
        a: "All ETFs are funds, but not all ETFs are index funds — there are actively managed ETFs too. Conversely, unlisted index managed funds (such as Vanguard's mFunds) exist but are not ETFs. In practice, most ETFs available to Australian retail investors track an index passively. The distinction that matters for most investors is: ETFs trade on exchange (like shares, with a bid/ask spread) while unlisted index funds are priced once daily and transacted at NAV.",
      },
      {
        q: "Can I lose all my money in an index fund?",
        a: "An index fund can only go to zero if every company in the underlying index goes to zero simultaneously — an extreme scenario that would imply the collapse of the entire market economy. In practice, index funds have declined 30–50% during severe market crashes (GFC 2008–09, COVID March 2020) but recovered fully within years. Diversified index funds hold tens to thousands of securities, making a total loss practically impossible for broad-market indices.",
      },
      {
        q: "How do I choose between a domestic and global index fund?",
        a: "Australian index funds (ASX 200) benefit from franking credits and AUD denomination but are concentrated in financials (banks: ~30%) and resources (~20%). Global index funds (MSCI World, S&P 500) provide exposure to technology, healthcare, and consumer sectors underrepresented on the ASX. A common approach is 70% global / 30% Australian — or the Vanguard 'Four Pillars' split popularised by Scott Pape's Barefoot Investor.",
      },
    ],
    relatedSlugs: [
      "how-do-etfs-work",
      "what-are-the-best-etfs-for-beginners",
      "what-is-a-managed-fund",
      "what-is-dollar-cost-averaging",
    ],
    relatedTools: [
      { label: "Compare ETFs", href: "/etfs" },
      { label: "Compare share brokers", href: "/share-trading" },
    ],
  },
  {
    slug: "what-is-a-target-date-fund",
    category: "retirement",
    question: "What is a target date fund and how does it work in Australia?",
    metaTitle: "What Is a Target Date Fund? Lifecycle Super Options Explained (2026)",
    metaDescription:
      "A target date fund gradually shifts from growth to defensive assets as your retirement date approaches. Learn how glide paths work, Australian lifecycle super equivalents, and whether they suit your situation.",
    shortAnswer:
      "A target date fund (also called a lifecycle or glide-path fund) is an investment option that automatically shifts asset allocation from growth (shares) toward defensive (bonds and cash) as the target retirement year approaches. In Australia, these are most commonly offered as lifecycle super investment options by retail and industry super funds, providing a set-and-forget approach for members who don't want to actively manage their super allocation.",
    sections: [
      {
        heading: "How the glide path works",
        body: "A typical target date fund for a 2040 retirement might hold 85% growth assets (shares, property) in 2026 and gradually reduce to 50% growth by 2035 and 30% growth by 2040. The theory is that younger investors can absorb volatility in exchange for higher long-run returns, while older investors approaching retirement cannot afford a large drawdown just before they need the money. The transition — the glide path — is automatic, requiring no action from the investor.",
      },
      {
        heading: "Australian lifecycle super options",
        body: "Australian super funds offer lifecycle or age-based investment options that mirror this concept. AwareSuper, Australian Retirement Trust, and AustralianSuper offer lifecycle options that automatically shift members into more conservative allocations as they age. For example, AustralianSuper's Lifecycle investment option moves members through Super Sustain (high growth, under 45), Balanced, Conservative Balanced, and Stable stages automatically. These are distinct from the default 'Balanced' option that holds a fixed ~70/30 allocation regardless of age.",
      },
      {
        heading: "Target date funds vs self-directed super",
        body: "The benefit of target date / lifecycle funds is automation and behavioural discipline — you cannot panic-switch to cash during a downturn or forget to de-risk as retirement approaches. The cost is loss of customisation: a 60-year-old who plans to work until 70 may be over-conservatised by a lifecycle fund targeting a 2026 date, missing out on a decade of growth returns. Self-directed investors who monitor their allocation and understand risk-return tradeoffs may generate better outcomes with a fixed-allocation index portfolio.",
      },
      {
        heading: "Comparison to managed funds and MySuper defaults",
        body: "Australia's MySuper regime requires default super options to satisfy a 'balanced' allocation test but does not mandate lifecycle glide paths. Most MySuper defaults (such as industry fund Balanced options) are static — they don't automatically de-risk with age. Some funds (notably Hostplus and AustralianSuper) offer lifecycle as an electable default but not as the only MySuper option. Managed funds outside super can also be structured with glide paths, though this is uncommon in the Australian retail market.",
      },
      {
        heading: "Pros and cons",
        body: "Pros: automatic de-risking, eliminates the 'sequence of returns' problem near retirement, set-and-forget simplicity, removes emotion from allocation decisions. Cons: one-size-fits-all doesn't account for individual retirement date uncertainty, income outside super affects the right allocation, many lifecycle funds use conservative transition curves that sacrifice meaningful returns in the 50–60 age bracket, fees may be higher than DIY index portfolios. The best approach depends on your engagement level, total wealth picture, and planned retirement date.",
      },
    ],
    faqs: [
      {
        q: "Is a lifecycle super option right for everyone?",
        a: "No. Lifecycle options suit members who want full automation and are not engaged with investment decisions. They are less appropriate for high-balance members who have significant other assets, plan to retire well past the target date, or want to optimise tax with higher growth exposure in their 60s when in pension phase (where earnings are tax-free). Speak to a financial planner about whether lifecycle suits your personal circumstances.",
      },
      {
        q: "What is the 'sequence of returns' risk?",
        a: "Sequence of returns risk is the risk that a large market decline early in retirement — when you are drawing down from your portfolio — permanently impairs your capital. A 40% decline in year 1 of retirement at a 5% drawdown rate is far more damaging than a 40% decline 10 years in. Target date funds (and glide-path de-risking) are specifically designed to reduce this risk by reducing equity exposure as retirement approaches.",
      },
      {
        q: "Do target date funds exist outside super in Australia?",
        a: "They are rare outside super. Most Australian managed funds offer static balanced, conservative balanced, and growth options rather than glide-path products. Some financial planners manually implement a glide path by gradually shifting clients' portfolios from growth to defensive over time, but automated retail glide-path funds are predominantly a super product in Australia.",
      },
    ],
    relatedSlugs: [
      "how-does-superannuation-work",
      "what-is-a-self-managed-super-fund",
      "how-much-super-should-i-have-at-my-age",
      "what-is-a-transition-to-retirement-pension",
    ],
    relatedTools: [
      { label: "Compare super funds", href: "/super" },
      { label: "Find a financial adviser", href: "/financial-advisers" },
    ],
  },
  {
    slug: "how-much-super-should-i-have-at-my-age",
    category: "retirement",
    question: "How much super should I have at my age in Australia?",
    metaTitle: "Super Balance Benchmarks by Age in Australia (2026)",
    metaDescription:
      "ASFA's comfortable retirement standard requires roughly $690,000 (single) or $960,000 (couple). Learn super balance benchmarks by age, average vs median figures, the gender gap, and strategies to catch up.",
    shortAnswer:
      "ASFA's comfortable retirement standard requires approximately $690,000 for a single person and $960,000 for a couple at retirement (FY2026), assuming full Age Pension entitlement supplements the balance. Common benchmarks suggest having roughly 1× your annual salary by age 35, 2× by 45, 3× by 55, and 5–7× by 67 (retirement). Average balances significantly exceed medians due to skew from high-balance outliers.",
    sections: [
      {
        heading: "ASFA retirement standards (FY2026)",
        body: "The Association of Superannuation Funds of Australia (ASFA) publishes the Retirement Standard each quarter. For a comfortable retirement (private health insurance, occasional holidays, modest dining out, reliable car): single — $50,004 per year, needing a $690,000 balance at retirement; couple — $70,482 per year, needing $960,000. These figures assume receipt of a part Age Pension. A 'modest' retirement (basic activities, mostly public transport) requires $34,216 (single) or $49,050 (couple) — substantially less capital.",
      },
      {
        heading: "Super balance benchmarks by age",
        body: "These are approximate guidelines based on APRA data and industry rules of thumb for someone earning the median Australian wage (~$75,000): Age 25 — $10,000–$20,000; Age 30 — $30,000–$55,000; Age 35 — $55,000–$100,000; Age 40 — $90,000–$160,000; Age 45 — $130,000–$240,000; Age 50 — $180,000–$340,000; Age 55 — $240,000–$450,000; Age 60 — $310,000–$580,000; Age 65 — $400,000–$720,000. These are medians; high earners and those who have salary sacrificed will sit higher.",
      },
      {
        heading: "Average vs median super balances",
        body: "APRA data for FY2025 shows average super balances of approximately $170,000 for women and $230,000 for men overall — but these are pulled up by high-balance outliers. Median balances (the middle person) are 30–40% lower. A 50-year-old with $300,000 is above median but below average. When comparing yourself against benchmarks, use median figures — they better represent a typical Australian's position. The ATO's superannuation statistics publication breaks down balances by age and sex.",
      },
      {
        heading: "The super gender gap",
        body: "Women retire with on average 35–40% less super than men, driven by lower wages, more part-time work, and time out of the workforce for caregiving. APRA FY2025 data shows median super balance at retirement (ages 60–64) of approximately $122,000 for women vs $183,000 for men. Government initiatives include the Super Guarantee on employer-funded paid parental leave (from 1 July 2025), and co-contribution and low-income super tax offset (LISTO) provisions for low-income earners.",
      },
      {
        heading: "Catch-up strategies if behind",
        body: "If your balance is below benchmark: (1) Salary sacrifice — even $100/fortnight extra makes significant compound difference over 10 years. (2) Carry-forward concessional contributions — if TSB below $500,000, use unused cap space from prior five years in one large contribution. (3) Voluntary after-tax contributions — up to $120,000 per year non-concessional. (4) Spouse contributions — if your partner has a lower balance, contribute up to $3,000 per year to their super for an $540 tax offset. (5) Review investment option — if you're in a conservative default and 20+ years from retirement, a higher-growth option may significantly increase your final balance.",
      },
    ],
    faqs: [
      {
        q: "What if I have less super than the benchmarks suggest?",
        a: "Below-benchmark balances are common — roughly half of Australians are below the median. The most effective actions are: increase contributions even modestly (starting early matters most), ensure your investment option is appropriate for your age (not sitting in conservative at age 40), consolidate multiple super accounts (lost fees compound heavily), and trace any lost super through the ATO's myGov super account tool.",
      },
      {
        q: "How does the Age Pension interact with required super savings?",
        a: "The ASFA comfortable retirement standard assumes the retiree receives a partial Age Pension. The full single Age Pension in FY2026 is approximately $29,754 per year. A person with $400,000 in super at age 67 may receive a partial pension plus their super drawdown, meaning their personal super target is lower than the full $690,000. Your specific target depends on your other assets, income, housing status, and lifestyle expectations.",
      },
      {
        q: "Does owning a home affect how much super I need?",
        a: "Significantly. The ASFA benchmarks assume home ownership (no rent or mortgage). Renters in retirement need substantially more capital — an additional $100,000–$250,000 depending on location and rent — because no pension supplement for housing exists. The Age Pension includes a rent assistance component, but it rarely covers full market rent. Owning your home outright at retirement is a major determinant of financial comfort.",
      },
    ],
    relatedSlugs: [
      "how-does-superannuation-work",
      "what-is-concessional-contribution",
      "what-are-the-super-contribution-limits",
      "what-is-salary-sacrifice-australia",
    ],
    relatedTools: [
      { label: "Super contributions calculator", href: "/super-contributions-calculator" },
      { label: "Compare super funds", href: "/super" },
    ],
  },
  {
    slug: "what-is-a-transition-to-retirement-pension",
    category: "retirement",
    question: "What is a transition to retirement pension in Australia?",
    metaTitle: "Transition to Retirement (TTR) Pension Explained (Australia 2026)",
    metaDescription:
      "A transition to retirement pension lets you draw super income while still working after reaching preservation age. Learn the 4–10% drawdown rule, tax benefits after 60, SMSF TTR strategies, and the role of a financial planner.",
    shortAnswer:
      "A transition to retirement (TTR) pension allows you to draw a pension from your superannuation account once you reach preservation age (60 for those born after 30 June 1964) while still working. You can draw between 4% and 10% of your account balance each year. From age 60, TTR pension payments are completely tax-free, making them a powerful tool to supplement salary, reduce hours, or boost super through salary sacrifice.",
    sections: [
      {
        heading: "Who can start a TTR pension",
        body: "You can commence a TTR pension once you reach your preservation age — 60 for those born after 30 June 1964. You must still be employed or self-employed; once you fully retire (and notify the trustee of your intention not to seek further gainful employment), the TTR income stream converts to a fully accessible account-based pension with no maximum drawdown limit. There is no minimum dollar amount to start a TTR — it depends on your fund's rules.",
      },
      {
        heading: "The 4% to 10% drawdown rule",
        body: "TTR pensions have a minimum drawdown of 4% and a maximum of 10% of the account balance per year. The minimum ensures the pension is genuinely used as income, not just as a tax shelter. The 10% maximum prevents full depletion while still working. Drawdowns can be taken monthly, quarterly, or annually. The balance is not locked — if you need to access more than 10%, you would need to retire and convert to a standard account-based pension.",
      },
      {
        heading: "Tax on TTR pension payments",
        body: "Aged 60 or over: all payments from a taxed super fund (virtually all Australian super funds) are tax-free. Aged 55–59 (those on older preservation age schedules): the taxable component of TTR payments is taxed as income but with a 15% pension tax offset, effectively meaning 85% of the taxable component is included in assessable income. For most people aged 60+ this means the TTR is entirely tax-free income — a major benefit compared to the marginal tax rate applied to salary.",
      },
      {
        heading: "SMSF TTR strategies",
        body: "Before 1 July 2017, earnings in the SMSF on assets backing a TTR pension were taxed at 0% (same as a retirement pension). This allowed SMSFs to reclassify assets to a TTR sub-account and earn tax-free investment income. The Turnbull Government removed this concession in the 2016 Budget, effective 1 July 2017 — TTR assets in an SMSF are now taxed at 15% like accumulation phase. The primary benefit remaining is on the pension payment side (tax-free income after 60), not the fund's investment earnings.",
      },
      {
        heading: "Using TTR with salary sacrifice",
        body: "A classic TTR strategy: a 61-year-old earning $90,000 salary starts a TTR pension drawing $20,000/year tax-free from super. They simultaneously salary sacrifice $20,000 into super (taxed at 15% in the fund). Net cash flow is unchanged, but they have shifted $20,000 from 39% marginal tax income into super at 15% — saving ~$4,800 per year in tax while accelerating super accumulation. A financial planner should model this against personal circumstances.",
      },
    ],
    faqs: [
      {
        q: "Can I make contributions to super while on a TTR pension?",
        a: "Yes. Being on a TTR pension does not prevent you from making concessional or non-concessional contributions to your accumulation account. In fact, the TTR-with-salary-sacrifice strategy described above requires maintaining an accumulation account while drawing a TTR pension from a separate sub-account.",
      },
      {
        q: "Does a TTR pension affect my Age Pension eligibility?",
        a: "Superannuation in TTR phase is assessed under the Centrelink assets test from preservation age. The account balance counts as an assessable asset once you reach pension age (67). TTR pension payments count as income for means-test purposes — assessed under the income test. If you are between preservation age and 67 and also receiving Centrelink payments, model the interaction carefully.",
      },
      {
        q: "What happens to my TTR when I retire?",
        a: "When you formally retire (cease working and do not intend to seek full-time employment), your TTR income stream automatically becomes eligible to convert to a retirement account-based pension. The 10% cap is removed, tax-exempt pension status is confirmed, and (for SMSFs) the assets backing the pension move to the 0% earnings tax rate. Notify your fund trustee of your retirement to trigger the conversion.",
      },
    ],
    relatedSlugs: [
      "what-is-the-super-preservation-age",
      "how-does-superannuation-work",
      "when-can-i-access-my-super",
      "how-much-super-should-i-have-at-my-age",
    ],
    relatedTools: [
      { label: "Super contributions calculator", href: "/super-contributions-calculator" },
      { label: "Find a financial adviser", href: "/financial-advisers" },
    ],
  },
  {
    slug: "how-does-mortgage-offset-work",
    category: "property",
    question: "How does a mortgage offset account work in Australia?",
    metaTitle: "How a Mortgage Offset Account Works: Save Interest & Tax (2026)",
    metaDescription:
      "A mortgage offset account reduces the interest charged on your home loan by the amount sitting in the offset. Learn how 100% offset works, the difference from redraw, tax implications for investment properties, and common mistakes.",
    shortAnswer:
      "A mortgage offset account is a transaction account linked to your home loan where the balance offsets the principal on which interest is calculated. If you have a $500,000 mortgage and $50,000 in your offset account, you pay interest only on $450,000. Unlike a savings account, the offset earns no interest — the benefit is interest saved on the mortgage, which is effectively a tax-free return equal to your mortgage rate.",
    sections: [
      {
        heading: "How a 100% offset account works",
        body: "A 100% offset account reduces the daily interest-bearing principal of your mortgage by the full balance in the linked account. Interest on Australian home loans is calculated daily and charged monthly. With a $600,000 loan at 6.2% and $80,000 in offset, daily interest is calculated on $520,000 — saving $4,960 per year in interest. The offset balance does not earn interest itself; the benefit is implicit in the reduced loan interest charge. Some older products offer partial offset (e.g., 50% offset) — these are less efficient and now uncommon.",
      },
      {
        heading: "Offset vs redraw: the critical difference",
        body: "Offset and redraw both allow you to benefit from extra money sitting near your mortgage, but they work differently. Offset: a separate transaction account — funds are readily accessible, never legally repaid to the lender, treated as your own cash at all times. Redraw: extra repayments credited directly to the loan account — technically lent to the bank, accessible by drawing down the loan again. The critical tax distinction: for investment properties, funds redrawn from a loan and used for private purposes contaminate the loan's deductibility. Money moved through an offset does not touch the loan principal and preserves deductibility.",
      },
      {
        heading: "Investment property and the offset/deductibility question",
        body: "For investment property loans, the ATO allows interest deductions based on the purpose of the borrowing — not the current loan balance. Keeping funds in an offset account (rather than redrawing) preserves deductibility because the loan purpose remains investment. If you redraw a repayment and use the funds privately (holiday, car), the ATO may apportion the loan interest, disallowing some deductions. This is a common trap for investors who mix personal and investment finances through redraw. The clean rule: use offset for investment properties, never redraw for personal purposes.",
      },
      {
        heading: "Partial offset accounts",
        body: "Some lenders offer 'partial offset' or 'interest-adjusting' accounts where only a percentage of the account balance offsets the loan. These products are less common in 2026 and are generally less efficient than a 100% offset. Fixed-rate home loans typically do not offer offset accounts — most lenders only allow 100% offset on variable or split loans. If you have a fixed portion of your loan, keep fixed funds in the variable portion's offset if you have a split loan.",
      },
      {
        heading: "Common offset mistakes",
        body: "Not using the offset: many borrowers have an offset account but leave savings in a bank account earning lower interest than their mortgage rate. Using redraw instead of offset for investment properties: see above on deductibility risk. Paying too much in fees: some lenders charge $10–$20/month for offset accounts — on a small loan the fee may exceed the interest saved. Mixing PPOR and investment loans in one offset: each investment loan should have its own offset account to cleanly attribute savings and preserve deductibility records.",
      },
    ],
    faqs: [
      {
        q: "Does a mortgage offset account reduce my loan term?",
        a: "If you maintain minimum required repayments (which may be lower thanks to the offset reducing interest), the loan term stays the same. However, if repayments are calculated on the original balance without adjustment, keeping minimum payments constant while holding a large offset will shorten the effective term because each repayment covers more principal. Some borrowers deliberately keep their repayment fixed at a higher level to pay the loan down faster.",
      },
      {
        q: "Is the interest saved on an offset account taxable?",
        a: "No. Interest not charged on a loan is not income — the ATO does not tax the implicit 'return' from reducing mortgage interest. This makes the offset effectively a tax-free savings vehicle, equivalent in return to a savings account paying your mortgage rate on a gross basis. Someone on a 47% tax rate saving 6.2% in mortgage interest gets a 6.2% tax-free return — equivalent to earning 11.7% in a taxable savings account.",
      },
      {
        q: "Can I have multiple offset accounts?",
        a: "Yes. Many lenders allow multiple offset accounts linked to the same variable home loan — useful for budgeting (separate sub-accounts for holiday savings, car, emergency fund) while all balances contribute to offsetting mortgage interest. Check your lender's product terms — some charge per account, while others include multiple offsets in the loan package.",
      },
    ],
    relatedSlugs: [
      "how-to-buy-property-in-australia",
      "how-does-negative-gearing-work",
      "what-is-an-investment-property-depreciation-schedule",
    ],
    relatedTools: [
      { label: "Mortgage calculator", href: "/mortgage-calculator" },
      { label: "Compare home loans", href: "/home-loans" },
    ],
  },
  {
    slug: "what-is-an-investment-property-depreciation-schedule",
    category: "property",
    question: "What is a depreciation schedule for an investment property?",
    metaTitle: "Investment Property Depreciation Schedules Explained (Australia 2026)",
    metaDescription:
      "A depreciation schedule lets investment property owners claim non-cash deductions for the wear and tear of a building and its fixtures. Learn the two types, the 2017 budget changes, and how depreciation reduces tax on a negatively geared property.",
    shortAnswer:
      "A property depreciation schedule is a report prepared by a quantity surveyor that itemises all deductible decline-in-value claims available on an investment property. Australian tax law allows two types of deductions: Division 43 capital works (2.5% per year on the construction cost of the building shell) and Division 40 plant and equipment (items like ovens, hot water systems, carpets). A typical new investment property generates $5,000–$15,000 in depreciation deductions annually.",
    sections: [
      {
        heading: "Two types of property depreciation",
        body: "Division 43 — capital works deductions: applies to the building structure itself, at 2.5% of the original construction cost per year, available for 40 years from when construction was completed. A building that cost $300,000 to construct generates $7,500 in capital works deductions per year until the 40-year period ends. Division 40 — plant and equipment: applies to removable fixtures and fittings (ovens, dishwashers, carpet, blinds, hot water systems) at various effective life rates published by the ATO. Rates vary — carpets at 10 years (diminishing value 20% p.a.), ovens at 12 years.",
      },
      {
        heading: "The 2017 Budget changes: second-hand property restrictions",
        body: "From 1 July 2017, investors who purchase a second-hand residential property can no longer claim Division 40 depreciation on plant and equipment that was already installed in the property at purchase — even if the equipment is genuinely worn. This change was legislated in the 2017 Federal Budget and significantly reduced depreciation benefits for buyers of established properties. Plant and equipment purchased new (after settlement) can still be depreciated. Division 43 capital works deductions remain available for second-hand properties if construction commenced after 16 September 1987.",
      },
      {
        heading: "Who prepares a depreciation schedule",
        body: "A depreciation schedule should be prepared by a registered quantity surveyor who has inspection access to the property. Firms such as BMT Tax Depreciation, Washington Brown, and Depreciator are specialist providers. A schedule costs $600–$900 (tax-deductible) and is valid for the life of the property. It itemises every eligible item with its cost, effective life, and annual deduction. Some accountants estimate depreciation from building cost data, but a professional quantity surveyor inspection maximises the claim and provides ATO-defensible documentation.",
      },
      {
        heading: "How depreciation reduces tax on a negatively geared property",
        body: "Depreciation is a non-cash deduction — you don't spend money to claim it. It reduces the taxable income (or increases the tax loss) on an investment property, reducing the tax payable or increasing the refund from the ATO. Example: rental income $30,000, interest and maintenance costs $38,000 (rental loss $8,000), depreciation $9,000 — total deductible loss $17,000. On a 37% marginal rate, this generates a $6,290 tax refund. Without depreciation, the refund was $2,960. The $3,330 difference is entirely from a non-cash claim.",
      },
      {
        heading: "Depreciation and the cost base",
        body: "Capital works deductions (Division 43) reduce the cost base of the property for CGT purposes. If you have claimed $50,000 in capital works over 10 years, the cost base is reduced by $50,000, potentially increasing the capital gain on sale. Plant and equipment deductions do not reduce the property's cost base — each item is depreciable asset in its own right with a separate cost base. When a depreciable item is sold (e.g., a dishwasher included in a property sale), a balancing adjustment may arise if the proceeds differ from the written-down value.",
      },
    ],
    faqs: [
      {
        q: "Is a depreciation schedule worth it for an older property?",
        a: "Generally yes, even for older properties. Capital works deductions are available on construction costs for buildings completed after 16 September 1987 — many properties built in the 1990s and 2000s still have significant remaining Division 43 claims. A quantity surveyor can estimate construction cost from comparable projects if original records are unavailable. For very old buildings (pre-1987) or properties already past 40 years from construction, only Division 40 plant deductions apply (post-2017 rules apply to second-hand plant as noted).",
      },
      {
        q: "Can I use a depreciation schedule prepared for the previous owner?",
        a: "No. Each new owner requires a fresh depreciation schedule reflecting their purchase price and any renovations they undertake. Some quantity surveying firms provide 'update reports' for purchasers of properties where a prior schedule exists, at reduced cost, by adjusting the prior report to the new owner's cost base.",
      },
      {
        q: "What if I renovate the investment property?",
        a: "Renovation costs to the building structure create new Division 43 capital works deductions from the date of the renovation. New plant and equipment installed during renovation is depreciable under Division 40 regardless of the property's age or whether it is second-hand — the 2017 changes only affect items already in the property at purchase. Keep all renovation receipts and inform your quantity surveyor — they will add the new assets to your schedule.",
      },
    ],
    relatedSlugs: [
      "how-does-negative-gearing-work",
      "how-to-buy-property-in-australia",
      "how-does-mortgage-offset-work",
      "what-is-capital-gains-tax",
    ],
    relatedTools: [
      { label: "Compare property investment platforms", href: "/property-platforms" },
      { label: "Find a financial adviser", href: "/financial-advisers" },
    ],
  },
  {
    slug: "what-is-rentvesting",
    category: "property",
    question: "What is rentvesting and how does it work in Australia?",
    metaTitle: "What Is Rentvesting? Strategy, Tax & CGT in Australia (2026)",
    metaDescription:
      "Rentvesting means renting where you want to live while buying an investment property in a more affordable area. Learn the financial benefits, CGT implications, cash flow management, and when rentvesting makes sense.",
    shortAnswer:
      "Rentvesting is a strategy where you rent in a location you prefer to live (typically an expensive city) and buy an investment property in a more affordable area where the numbers stack up financially. The investment property generates rental income and negative gearing tax benefits, while you maintain lifestyle flexibility. The trade-off is that the investment property does not attract the principal place of residence CGT exemption — you will pay CGT on sale.",
    sections: [
      {
        heading: "How rentvesting works",
        body: "A rentvestor rents their home (keeping flexibility to live near work, good schools, or lifestyle amenities) and simultaneously buys an investment property in a market they can afford — often interstate or in a regional area with stronger rental yields. For example, renting in Sydney's inner suburbs for $2,800/month while owning a $550,000 townhouse in Brisbane's outer suburbs with $2,200/month rental income. The investment property mortgage and rental income partially cancel, generating negative gearing benefits.",
      },
      {
        heading: "CGT implications: no PPOR exemption",
        body: "The most significant financial implication of rentvesting is the loss of the principal place of residence (PPOR) CGT exemption on the investment property. If the Brisbane townhouse appreciates from $550,000 to $850,000 over 7 years, the $300,000 gain is fully subject to CGT (less the 50% discount for >12 months holding). At a 37% marginal rate with the 50% discount, the effective CGT is roughly $55,500 on a $300,000 gain. A homeowner who lived in the property would pay zero CGT. This is the core trade-off rentvestors accept.",
      },
      {
        heading: "Cash flow management",
        body: "Rentvesting creates two parallel cash flows: rent paid on your home (outgoing) and rent received on your investment property (incoming), less mortgage interest, rates, insurance, and property management fees. Negatively geared properties require cash top-up each month, while the ATO provides a tax refund after 30 June. Rentvestors should model after-tax cash flow carefully — a $2,200/month rent received minus $2,800/month mortgage and expenses generates a -$600/month shortfall before tax benefits. Lodging a PAYG Withholding Variation allows the ATO to reduce your tax at source each pay cycle rather than waiting for an annual refund.",
      },
      {
        heading: "Where rentvesting works best",
        body: "Rentvesting is most common in cities where purchase prices are far above what yields justify — particularly Sydney, Melbourne, and to a lesser extent Brisbane. A $1.2 million Sydney apartment might yield 2.5% gross ($30,000 rent), whereas a $550,000 Brisbane townhouse yields 4.5% ($24,750 rent). The rentvestor captures the better yield market for their investment capital and maintains lifestyle in the expensive market. Perth and Adelaide have historically offered better yields than Sydney and Melbourne, attracting rentvestors from eastern capitals.",
      },
      {
        heading: "First home buyer implications",
        body: "Purchasing an investment property first (before ever buying a PPOR) permanently disqualifies you from the First Home Owner Grant (FHOG) in most states, which requires the first property you buy to be your home and that you live in it within 12 months. Similarly, the First Home Guarantee (5% deposit, no LMI) requires owner-occupation. Rentvestors who intend to eventually buy a home should be aware that their investment property purchase may disqualify them from these schemes. Some states have cleaner rules than others — seek state-specific advice.",
      },
    ],
    faqs: [
      {
        q: "Can I convert my investment property to my PPOR later?",
        a: "Yes. If you move into your investment property and live in it as your main residence, it becomes your PPOR and starts accruing CGT exemption from that date. The portion of the gain accrued while it was an investment property (calculated on a time-proportion basis) remains taxable, but future growth from the date you move in is exempt. This is sometimes called 'flipping' a property from investment to PPOR.",
      },
      {
        q: "Is rentvesting financially better than buying a home to live in?",
        a: "There is no universal answer. Rentvesting can outperform if: (1) the investment property appreciates faster than the area you'd buy a PPOR in, (2) negative gearing tax benefits are significant, (3) rental yields in the investment market are strong. It underperforms if: (1) your would-be PPOR appreciates faster and is CGT-exempt, (2) the investment property has cash flow difficulties, (3) you incur significantly more in rent than a PPOR mortgage would cost. Run the numbers for your specific situation over a 10-year horizon.",
      },
      {
        q: "Does rentvesting affect my borrowing capacity?",
        a: "Rental income (at 70–80% of gross, as lenders apply a rental income discount) is added to income for serviceability, which may help future borrowing. However, investment mortgage debt is also counted against you. Lenders assess the investment property on a interest-only or principal-and-interest basis at a stressed rate. Some lenders treat investment and PPOR debt differently for serviceability calculations — a mortgage broker can model the impact for your specific situation.",
      },
    ],
    relatedSlugs: [
      "how-does-negative-gearing-work",
      "how-to-buy-property-in-australia",
      "what-is-capital-gains-tax",
      "what-is-an-investment-property-depreciation-schedule",
    ],
    relatedTools: [
      { label: "Compare property investment platforms", href: "/property-platforms" },
      { label: "Mortgage calculator", href: "/mortgage-calculator" },
    ],
  },
  {
    slug: "how-do-i-get-a-tax-file-number",
    category: "tax",
    question: "How do I get a tax file number (TFN) in Australia?",
    metaTitle: "How to Get a Tax File Number (TFN) in Australia (2026 Guide)",
    metaDescription:
      "A Tax File Number is essential for employment, super, and ATO identity. Learn how to apply via myGov or the ATO app, what withholding applies without a TFN, and why linking your TFN to super matters.",
    shortAnswer:
      "A Tax File Number (TFN) is a unique nine-digit identifier issued by the Australian Taxation Office for tax and super purposes. You can apply online through the ATO via myGov, through the ATO app, or in person at a participating Australia Post outlet. Processing takes approximately 28 days. Without a TFN, employers must withhold tax at the highest marginal rate (47% in FY2026) from your wages, and super funds must hold contributions at 47%.",
    sections: [
      {
        heading: "What a TFN is and why you need one",
        body: "Your Tax File Number is used by the ATO to match tax returns, super contributions, PAYG withholding, and investment income. It is required by employers to avoid maximum withholding, by super funds to accept contributions at the 15% concessional rate, by banks and investment platforms to avoid withholding on interest and dividends, and by the ATO for identity verification. You cannot lodge a tax return, access myGov tax services, or link your super accounts without a TFN. Australian citizens, permanent residents, and most temporary visa holders are eligible to apply.",
      },
      {
        heading: "How to apply for a TFN",
        body: "Online via myGov (Australian citizens with a passport or birth certificate): create a myGov account, verify identity online, complete the TFN application. Takes around 28 days. Via the ATO's online services (myTax): similar online process. ATO app: identity verification and application on a smartphone. In person at Australia Post: complete the form online, take identity documents to an Australia Post outlet that participates in the Document Verification Service. Overseas applicants: apply using the ATO's international form; process may take longer.",
      },
      {
        heading: "TFN without a TFN: withholding consequences",
        body: "If you start a job without providing your TFN to your employer, they are legally required to withhold tax at the top marginal rate (47% plus 2% Medicare Levy for most earners). This is not a permanent tax — you claim a credit for over-withheld amounts when you lodge your tax return — but it creates a cash flow problem until the refund arrives. Similarly, banks and investment platforms will withhold 47% on interest and dividends if no TFN is provided (or a withholding exemption is claimed for low-income earners).",
      },
      {
        heading: "Linking your TFN to superannuation",
        body: "When you join a super fund, you must provide your TFN. Under the Superannuation Industry (Supervision) Act, a fund that holds contributions without your TFN must tax those contributions at 47% (rather than the standard 15% concessional rate) and hold the funds in a suspense account. Once you provide your TFN, the ATO refunds the excess tax as a low-income super tax offset (LISTO) if applicable or as a credit in your super account. Government co-contributions also cannot be received without a TFN linked to the fund.",
      },
      {
        heading: "TFN privacy and security",
        body: "Your TFN is sensitive personal information protected by the Privacy Act 1988. You are not legally required to provide your TFN to employers, banks, or super funds — but the withholding consequence means it is in your interest to do so. Never provide your TFN by email — it should only be submitted through official government portals, in person, or via official paper forms. If you believe your TFN has been compromised, contact the ATO's fraud reporting line immediately. The ATO does not ask for TFNs by phone or email unprompted.",
      },
    ],
    faqs: [
      {
        q: "Can I get a TFN on the same day I start a job?",
        a: "No. TFN applications take approximately 28 days to process. However, if you apply online, the ATO issues a provisional TFN (visible in your myGov account) which you can provide to your employer to avoid the highest-rate withholding while your application is processed. Provide your full TFN to your employer once it arrives.",
      },
      {
        q: "Do I need a TFN if I'm on a working holiday visa?",
        a: "Yes. Working holiday visa holders (subclass 417, 462) are entitled to a TFN and should apply before starting work. Without a TFN, you will be taxed at the 47% no-TFN rate. Working holiday makers have a special flat 15% tax rate on earnings up to $45,000 (FY2026) — but this rate only applies if a TFN is provided. After $45,000, marginal rates apply.",
      },
      {
        q: "What if I lose my TFN?",
        a: "Your TFN never changes and is permanent. If you have lost it, the easiest way to find it is in myGov under ATO Online Services, on any previous tax return, on payment summaries or income statements from employers, or by calling the ATO on 13 28 61 (identity verification required). The ATO will never re-issue a new TFN — you have one TFN for life.",
      },
    ],
    relatedSlugs: [
      "what-is-capital-gains-tax",
      "how-does-superannuation-work",
      "what-is-salary-sacrifice-australia",
    ],
    relatedTools: [
      { label: "Find a financial adviser", href: "/financial-advisers" },
      { label: "Compare super funds", href: "/super" },
    ],
  },

  // ── INVESTING (9 new) ──────────────────────────────────────────────────────

  {
    slug: "index-funds-vs-managed-funds-australia",
    category: "investing",
    question: "What is the difference between index funds and managed funds in Australia?",
    metaTitle: "Index Funds vs Managed Funds Australia: Key Differences (2026)",
    metaDescription:
      "Index funds track a market index passively at low cost; managed funds use active stock-picking at higher fees. Compare performance, costs, tax efficiency, and when each suits Australian investors.",
    shortAnswer:
      "Index funds passively track a market benchmark (such as the ASX 200) at very low cost — typically 0.05–0.20% per year — while managed funds employ active portfolio managers who pick stocks in an attempt to beat the benchmark, charging 0.5–1.5% or more annually. The majority of actively managed Australian funds have underperformed their benchmark index over 10-year periods after fees.",
    sections: [
      {
        heading: "How index funds work",
        body: "An index fund holds every security in a chosen benchmark index (e.g., all 200 stocks in the S&P/ASX 200) in proportion to their market capitalisation. Because there is no active decision-making, management costs are minimal. In Australia, broad-market index ETFs from providers such as Vanguard, BlackRock iShares, and BetaShares charge management expense ratios (MERs) of 0.04–0.20% per annum. The fund's return closely mirrors the index return minus the MER.",
      },
      {
        heading: "How managed funds work",
        body: "Actively managed funds employ research teams and portfolio managers who select specific securities they believe will outperform. Investors access these through platforms like mFunds on the ASX or direct wholesale applications. MERs for Australian equity managed funds typically range from 0.50% to 1.50%, with some charging additional performance fees (e.g. 15–20% of returns above a hurdle rate). The investment thesis is that skilled managers can identify mispriced securities, producing net-of-fee returns superior to the index.",
      },
      {
        heading: "Performance: the SPIVA evidence",
        body: "S&P Global's SPIVA Australia Scorecard (December 2024) found that over 15 years, 83% of Australian large-cap equity managers underperformed the S&P/ASX 200 index after fees. International equity managers fared similarly. This does not mean every active fund underperforms — some deliver consistent alpha — but the odds are strongly in favour of low-cost index investing for most retail investors. Past outperformance is also weakly predictive of future performance, making selection difficult.",
      },
    ],
    faqs: [
      {
        q: "Can I get index funds inside my superannuation?",
        a: "Yes. Most industry super funds and some retail funds offer indexed investment options — typically labelled 'indexed diversified', 'indexed shares', or similar. These invest in index funds internally and pass through the low-fee advantage. Some funds charge a small administration fee on top of the underlying fund fee.",
      },
      {
        q: "Are index funds risk-free?",
        a: "No. An index fund carries full market risk — if the ASX 200 falls 30%, so does your index fund. Index investing eliminates manager underperformance risk and fee drag, but not market risk. Diversification across multiple index funds (Australian equities, global equities, bonds) reduces individual asset class risk.",
      },
      {
        q: "What is the difference between an ETF and an index fund?",
        a: "Most ETFs are index funds that trade on a stock exchange intraday, like shares. Traditional unlisted index funds (e.g. Vanguard's retail index funds) are priced once daily and accessed directly. The investment strategy and costs are similar; the difference is the mechanism of buying and selling.",
      },
    ],
    relatedSlugs: [
      "what-is-an-index-fund",
      "what-is-the-difference-between-etf-and-managed-fund",
      "how-does-dollar-cost-averaging-work",
      "how-does-portfolio-rebalancing-work",
    ],
    relatedTools: [
      { label: "Compare ETF brokers", href: "/etfs" },
      { label: "Compare share brokers", href: "/share-trading" },
    ],
  },
  {
    slug: "how-do-etf-fees-work-australia",
    category: "investing",
    question: "How do ETF fees work in Australia?",
    metaTitle: "How Do ETF Fees Work in Australia? MER, Brokerage & Hidden Costs (2026)",
    metaDescription:
      "ETF fees include the management expense ratio (MER), brokerage commission, bid-ask spread, and tracking error. Learn how to compare total cost of ownership across Australian ETFs.",
    shortAnswer:
      "ETF fees in Australia include the management expense ratio (MER) — charged as a percentage of your balance and deducted daily from the fund's net asset value — plus brokerage commission when you buy or sell, and a bid-ask spread on every transaction. The MER is the primary ongoing cost, typically 0.04–0.67% per year for broad-market ETFs listed on the ASX.",
    sections: [
      {
        heading: "Management Expense Ratio (MER)",
        body: "The MER covers the fund manager's operational, administration, and management costs. It is expressed as a percentage of net assets and accrues daily inside the fund — you never receive a bill. A $50,000 investment in a fund with a 0.10% MER costs $50 per year. Vanguard's ASX 200 ETF (VAS) has an MER of 0.07%; BetaShares' NDQ (Nasdaq 100) is 0.48%; some specialist sector ETFs charge 0.50–0.69%. Always check the current Product Disclosure Statement (PDS) for the official figure.",
      },
      {
        heading: "Brokerage and bid-ask spread",
        body: "Each time you buy or sell an ASX-listed ETF you pay brokerage to your stockbroker — typically $2–$20 per trade on discount brokers, though some platforms offer commission-free ETF trading. The bid-ask spread is a secondary cost: the difference between what buyers will pay and what sellers will accept. For liquid ETFs (e.g. VAS, IVV, A200) the spread is often 0.01–0.05%, but for less traded ETFs it can be 0.10–0.50%. Frequent small purchases amplify these transaction costs relative to your total investment.",
      },
      {
        heading: "Tracking error and total cost of ownership",
        body: "Tracking error measures how closely an ETF follows its benchmark. Even a zero-MER ETF might underperform its index due to sampling approaches, dividend timing differences, or securities lending. The total cost of ownership (TCO) is the most complete measure: MER + average annual spread cost + brokerage amortised over holding period + tracking error. For a long-term buy-and-hold investor in a liquid index ETF, the MER usually dominates. For an active trader buying frequently, brokerage and spreads add meaningfully to cost.",
      },
    ],
    faqs: [
      {
        q: "Is there GST on ETF management fees in Australia?",
        a: "Financial services such as ETF management are generally input-taxed for GST purposes, meaning the fee is not subject to GST that you pay directly. The MER quoted by ETF providers is the all-in ongoing fee; no additional GST is added on top of the stated rate.",
      },
      {
        q: "Do ETFs charge entry and exit fees?",
        a: "Most Australian ETFs listed on the ASX do not charge entry or exit fees — you simply pay brokerage to your broker. Some unlisted managed funds still charge contribution and withdrawal fees. Always check the PDS before investing.",
      },
      {
        q: "Which Australian ETF has the lowest management fee?",
        a: "As of 2026, some of the lowest-MER broad-market Australian ETFs include BetaShares Australia 200 ETF (A200) at 0.04%, Vanguard Australian Shares Index ETF (VAS) at 0.07%, and iShares Core S&P/ASX 200 ETF (IOZ) at 0.05%. For global equities, iShares Core S&P 500 ETF (IVV) charges 0.03% and Vanguard MSCI Index International Shares ETF (VGS) charges 0.18%. MERs change periodically — verify in each fund's current PDS.",
      },
    ],
    relatedSlugs: [
      "what-is-an-index-fund",
      "what-is-the-difference-between-etf-and-managed-fund",
      "how-does-dollar-cost-averaging-work",
      "index-funds-vs-managed-funds-australia",
    ],
    relatedTools: [
      { label: "Compare ETF brokers", href: "/etfs" },
      { label: "Trade cost calculator", href: "/trade-cost-calculator" },
    ],
  },
  {
    slug: "how-does-dividend-reinvestment-plan-work-australia",
    category: "investing",
    question: "How does a dividend reinvestment plan (DRP) work in Australia?",
    metaTitle: "Dividend Reinvestment Plans (DRP) Explained — Australia (2026)",
    metaDescription:
      "A DRP automatically converts cash dividends into new shares at a small discount. Learn the CGT treatment of DRP shares, the compounding effect, and whether to participate as an Australian investor.",
    shortAnswer:
      "A dividend reinvestment plan (DRP) automatically uses your cash dividends to purchase additional shares in the same company, typically at a small discount (1–5%) to market price, with no brokerage. Each DRP parcel creates a new CGT asset with its own acquisition date and cost base.",
    sections: [
      {
        heading: "How DRPs work in practice",
        body: "When you elect to participate in a company's DRP, instead of receiving a cash dividend your shares are used to subscribe for new shares at a set price. For example, if BHP pays a $1.50 dividend and you hold 500 shares, you receive $750 of dividend entitlement. At a DRP price of $45.00 per share (a 2% discount to the $45.92 market price), you receive 16 new shares worth $720, with the remaining $30 paid as cash. Optionally, some DRPs have an investment plan component allowing you to purchase additional shares beyond your dividend entitlement.",
      },
      {
        heading: "CGT implications of DRP participation",
        body: "Each DRP allotment is treated as a separate CGT acquisition. The cost base of DRP shares is the market value of the dividend used to purchase them (including any discount). Franking credits still attach to the original dividend even when taken as DRP shares — you report the grossed-up dividend in your tax return and claim the franking credit offset as normal. When you eventually sell, the gain or loss on each DRP parcel is calculated separately, applying the 50% CGT discount if held more than 12 months. Long-term DRP participation generates dozens of CGT events on sale, requiring careful record-keeping.",
      },
      {
        heading: "Compounding benefit of DRPs",
        body: "DRPs accelerate compounding because every dividend payment grows your share count, which in turn generates larger future dividends. Over long holding periods, the effect is material. An investor reinvesting all dividends in the ASX 200 from 2000–2024 achieved total returns roughly double those of a non-reinvesting investor in the same period (ASX data). The brokerage-free aspect is a secondary benefit — for small parcel sizes, regular brokerage would otherwise consume a meaningful portion of the dividend.",
      },
    ],
    faqs: [
      {
        q: "Can I participate in a DRP with ETFs?",
        a: "Many ASX-listed ETFs offer Distribution Reinvestment Plans (DRPs), functionally identical to share DRPs. Vanguard, iShares, and BetaShares ETFs all offer DRPs on most of their funds. Participation is elected through your broker. ETF DRP distributions also generate separate CGT assets with each allotment.",
      },
      {
        q: "Do I have to participate in the full DRP or can I take part cash?",
        a: "DRP rules vary by company. Many allow partial participation — you can nominate a percentage of your holding to DRP and receive the rest as cash. Some plans are all-or-nothing. Check the company's DRP terms, usually available from their share registry (e.g. Computershare or Link Market Services).",
      },
      {
        q: "Is the DRP discount considered a taxable benefit?",
        a: "No. The discount is built into the price at which new shares are allotted. Your cost base for CGT purposes is the full market value of the dividend entitlement used — not the discounted DRP price. This means the discount effectively reduces your initial cost base (increasing your future capital gain) rather than creating a separate taxable benefit.",
      },
    ],
    relatedSlugs: [
      "how-does-dividend-investing-work",
      "how-does-franking-credit-work",
      "how-does-dollar-cost-averaging-work",
      "what-is-capital-gains-tax-discount",
    ],
    relatedTools: [
      { label: "Dividend reinvestment calculator", href: "/dividend-reinvestment-calculator" },
      { label: "Compare share brokers", href: "/share-trading" },
    ],
  },
  {
    slug: "what-are-mfunds-vs-etfs-australia",
    category: "investing",
    question: "What is the difference between mFunds and ETFs in Australia?",
    metaTitle: "mFunds vs ETFs: What's the Difference? (Australia 2026)",
    metaDescription:
      "mFunds are unlisted managed funds accessed via the ASX settlement system; ETFs are exchange-traded and priced intraday. Compare pricing, liquidity, minimum investments, and tax treatment for Australian investors.",
    shortAnswer:
      "mFunds are unlisted managed funds accessed through the ASX Managed Fund Service — you apply and redeem directly with the fund manager at net asset value (NAV) priced once daily, with no secondary market trading. ETFs trade on the ASX like shares throughout the day at market prices that may differ slightly from NAV. Both settle through the standard CHESS system, but ETFs offer intraday liquidity while mFunds do not.",
    sections: [
      {
        heading: "How mFunds work",
        body: "The ASX mFunds service (launched 2013) lets investors buy and redeem units in unlisted managed funds through their standard stockbroker account. Orders are placed through CHESS and the fund manager processes them at the end-of-day NAV price — there is no bid-ask spread or market maker involved. Minimum investment amounts vary by fund, typically $5,000–$25,000 for institutional products, though some funds accept lower minimums. Settlement is T+3 for applications and T+4 for withdrawals. mFunds include many active managers not available as ETFs, such as specialist credit, infrastructure, and alternatives funds.",
      },
      {
        heading: "How ETFs differ",
        body: "ETFs issue units that trade on the ASX between market participants throughout the trading day. A market maker (authorised participant) maintains liquidity by creating and redeeming large unit blocks with the fund when prices diverge from NAV. For liquid ETFs tracking the ASX 200 or S&P 500, the market price stays within 0.01–0.05% of NAV continuously. ETFs typically have no minimum investment (you can buy a single unit), making them accessible for small, regular contributions. Settlement is T+2.",
      },
      {
        heading: "When to use each",
        body: "ETFs are generally preferred for: index investing, frequent contributions (DCA strategies), intraday flexibility, and very small balances. mFunds suit investors who want access to specialist active managers (infrastructure, global small-cap, absolute return strategies) not available in ETF form, and who are comfortable with daily pricing and slightly longer settlement. Some active managers offer identical strategies in both formats (e.g. Magellan, Hyperion) — compare MERs as they may differ slightly between the two vehicles.",
      },
    ],
    faqs: [
      {
        q: "Are mFunds tax-treated the same as ETFs?",
        a: "Yes, for most purposes. Both are managed investment schemes for tax purposes. Capital gains on units sold after 12 months qualify for the 50% CGT discount. Distributions from both are assessable income in the year received. mFunds do not benefit from the CGT-deferred capital gains distributions that ETFs can sometimes deliver (ETFs can in-specie transfer low-cost-base assets without triggering gains).",
      },
      {
        q: "Can I access mFunds in my super or SMSF?",
        a: "mFunds are accessible to SMSFs through a broker account. Some industry and retail super funds offer similar unlisted managed fund options internally. If you are managing your SMSF via a platform such as Netwealth or Hub24, many institutional managed funds are available alongside ETFs.",
      },
      {
        q: "Are there brokerage fees on mFunds?",
        a: "Standard brokerage applies when placing mFund orders through the ASX service (the same commission as for buying ETFs or shares). Some funds also charge application and withdrawal fees in addition to brokerage — check the PDS. There is no bid-ask spread as with ETFs because orders execute at the next-calculated NAV.",
      },
    ],
    relatedSlugs: [
      "what-is-the-difference-between-etf-and-managed-fund",
      "index-funds-vs-managed-funds-australia",
      "how-do-etf-fees-work-australia",
      "how-does-dollar-cost-averaging-work",
    ],
    relatedTools: [
      { label: "Compare ETF brokers", href: "/etfs" },
      { label: "Compare share brokers", href: "/share-trading" },
    ],
  },
  {
    slug: "what-are-listed-investment-companies-australia",
    category: "investing",
    question: "What are listed investment companies (LICs) and how do they work in Australia?",
    metaTitle: "Listed Investment Companies (LICs) Explained — Australia (2026)",
    metaDescription:
      "LICs are closed-end investment companies listed on the ASX that hold a portfolio of shares. They can trade at a premium or discount to NTA. Learn the tax differences from ETFs and the major Australian LICs.",
    shortAnswer:
      "A listed investment company (LIC) is a closed-end company listed on the ASX that manages a portfolio of investments (typically Australian or global shares). Unlike ETFs, LICs have a fixed number of shares and can trade at a discount or premium to their net tangible assets (NTA) per share. They pay fully franked dividends from retained profits and have no obligation to distribute capital gains, which makes their tax profile different from managed funds and ETFs.",
    sections: [
      {
        heading: "How LICs differ from ETFs and managed funds",
        body: "LICs are companies, not trusts. They have a fixed capital structure — new shares are only issued via capital raises or dividend reinvestment plans, not created on demand. This means the market price can diverge significantly from NTA: if investor sentiment is negative, a LIC may trade at a 10–15% discount to NTA (meaning you buy $1.10 of assets for $1.00). Conversely, popular LICs can trade at premiums. ETFs are open-ended — arbitrage ensures the market price stays within 0.05% of NAV. LICs include Australian Ethical (AEF), Argo Investments (ARG), Australian Foundation Investment Company (AFI), and Mirrabooka (MIR).",
      },
      {
        heading: "Dividend and franking credit advantages",
        body: "Because LICs are companies, they can smooth dividends by retaining profits in good years and paying out retained earnings in bad years — providing more stable income than pass-through ETF distributions. Most established LICs have long records of fully franked dividends, making them popular with retirees relying on imputation refunds. A fully franked $0.70 dividend grosses up to $1.00 including the $0.30 franking credit, reducing tax for low-rate and zero-rate (SMSF pension) investors.",
      },
      {
        heading: "Capital gains tax advantage inside the LIC",
        body: "LICs do not pass capital gains directly to shareholders — any gains from selling portfolio assets are retained inside the company. When eventually distributed as a dividend, shareholders may claim a 'LIC capital gain amount deduction' under section 115-280 of the Income Tax Assessment Act 1997, effectively receiving the 50% CGT discount benefit even though the payment is a dividend. This deduction must be claimed in your tax return and is reported on your dividend statement. This makes LICs tax-efficient for long-term investors who would otherwise trigger individual CGT events with direct shareholdings.",
      },
    ],
    faqs: [
      {
        q: "Should I buy a LIC at a discount or a premium to NTA?",
        a: "Buying at a discount to NTA provides a margin of safety — you get $1.00 of assets for $0.90. However, a persistent discount can reflect justified concerns (poor performance, high fees, illiquid underlying assets). Buying at a premium means you are paying more than the portfolio is worth, which is only justified if you believe the manager will outperform sufficiently to justify the premium. Most investors prefer to wait until a LIC is near or below NTA before purchasing.",
      },
      {
        q: "Are LICs suitable for SMSFs?",
        a: "Yes, LICs are popular SMSF holdings — particularly for pension-phase SMSFs that pay zero tax and can claim full franking credit refunds. The stable, franked dividends provide predictable income. However, LIC prices can be volatile, and buying at a premium to NTA carries the risk of capital loss if the premium compresses.",
      },
      {
        q: "What is the difference between a LIC and a LIT?",
        a: "A listed investment trust (LIT) is similar to a LIC but is structured as a trust rather than a company. LITs pass through income and capital gains to unitholders annually, like managed funds. This means less control over when taxable distributions occur. LICs retain flexibility by holding gains inside the company. LITs include Magellan Global Fund (MGF) and several fixed-income vehicles.",
      },
    ],
    relatedSlugs: [
      "what-is-the-difference-between-etf-and-managed-fund",
      "how-does-dividend-investing-work",
      "how-does-franking-credit-work",
      "how-do-franking-credits-work-in-super",
    ],
    relatedTools: [
      { label: "Compare share brokers", href: "/share-trading" },
      { label: "Franking credits calculator", href: "/franking-credits-calculator" },
    ],
  },
  {
    slug: "income-vs-growth-investing-australia",
    category: "investing",
    question: "What is the difference between income investing and growth investing in Australia?",
    metaTitle: "Income vs Growth Investing in Australia: Which Is Right for You? (2026)",
    metaDescription:
      "Income investing targets regular dividends and interest; growth investing targets capital appreciation. Learn tax implications, yield expectations, and when each strategy suits Australian investors.",
    shortAnswer:
      "Income investing focuses on generating regular cash flows from dividends, distributions, and interest — targeting assets like high-yield ASX shares, REITs, bonds, and hybrid securities. Growth investing prioritises capital appreciation, targeting assets with strong earnings growth where total returns are primarily realised on sale rather than as ongoing income. Most Australian investors blend both strategies, with the mix shifting toward income in retirement.",
    sections: [
      {
        heading: "Income investing in the Australian context",
        body: "Australia's dividend imputation system makes income investing particularly attractive compared to most other countries. Fully franked dividends from the major banks (ANZ, CBA, NAB, WBC), miners (BHP, RIO), and infrastructure companies (TCL, APA) often yield 4–6% grossed-up (including franking credits). REITs (A-REITs) and listed infrastructure trusts distribute 80–100% of taxable income, offering yields of 3–6%. Bond and hybrid securities provide fixed or floating interest payments. The appeal is predictable, recurring cash flow with significant franking credit benefits.",
      },
      {
        heading: "Growth investing and the ASX technology sector",
        body: "Growth stocks prioritise reinvesting earnings to expand the business rather than paying dividends. The ASX technology and healthcare sectors have the most pure-growth companies — WiseTech Global, REA Group, Pro Medicus, and CSL have delivered exceptional capital returns over 10+ years with low or zero dividend yields. Global growth investing via ETFs (Nasdaq 100, global technology ETFs) provides exposure to international growth companies. The tax implication: you defer tax until you sell, but the 50% CGT discount applies if held over 12 months.",
      },
      {
        heading: "Tax treatment differences",
        body: "Income from dividends and distributions is taxed in the year received at your marginal rate, with franking credits available as an offset. Capital gains are taxed only when you sell, and the 50% discount applies after 12 months — an effective maximum rate of 23.5% for individuals in the top bracket (47% × 50%). For high-income earners, this makes growth investing significantly more tax-efficient on an annual basis, as the tax is deferred and discounted. Retirees often prefer income for its predictability and the ability to receive franking credit refunds without triggering CGT events.",
      },
    ],
    faqs: [
      {
        q: "What is a good dividend yield for Australian shares?",
        a: "The ASX 200's historical average dividend yield is 4–5% grossed-up (including franking credits). Yields above 6–7% may signal elevated payout ratios or business risk — high yields can reflect markets pricing in a future dividend cut. A sustainable yield is typically 3–5.5% with strong dividend cover (earnings per share significantly above dividends per share). The major banks have historically paid 5–7% grossed-up yields.",
      },
      {
        q: "Can I receive income from ETFs?",
        a: "Yes. Many ASX-listed ETFs distribute income quarterly or half-yearly. Broad-market Australian equity ETFs (e.g. VAS, A200) yield 3–5% distributed annually including franking credits. High-income ETFs (e.g. BetaShares HVST) target higher current income but may sacrifice growth. Bond ETFs (e.g. VBND, IAF) distribute monthly interest income.",
      },
      {
        q: "Is income or growth investing better in superannuation?",
        a: "Inside super, the income vs growth distinction is less important because all earnings — income and capital gains — are taxed at 15% in accumulation phase (0% in pension phase). The compounding effect favours growth inside super because unrealised gains are not taxed annually. However, for SMSFs in pension phase that benefit from franking credit refunds, high-income Australian equity portfolios have a compelling tax advantage.",
      },
    ],
    relatedSlugs: [
      "how-does-dividend-investing-work",
      "how-does-franking-credit-work",
      "what-is-capital-gains-tax-discount",
      "how-does-inflation-affect-investments",
    ],
    relatedTools: [
      { label: "Dividend reinvestment calculator", href: "/dividend-reinvestment-calculator" },
      { label: "Compare share brokers", href: "/share-trading" },
    ],
  },
  {
    slug: "how-to-hedge-against-inflation-australia",
    category: "investing",
    question: "How do you hedge against inflation in Australia?",
    metaTitle: "How to Hedge Against Inflation in Australia: Assets & Strategies (2026)",
    metaDescription:
      "Inflation hedges in Australia include real assets (property, infrastructure), equities, commodities, inflation-linked bonds, and gold. Learn which assets have outpaced CPI and how to build a hedge portfolio.",
    shortAnswer:
      "The best long-run inflation hedges for Australian investors are diversified equities, real property, infrastructure assets, and commodity-linked investments. Inflation-linked government bonds (Treasury Indexed Bonds) provide direct CPI indexation. Cash and nominal fixed-rate bonds are the worst inflation performers because their real purchasing power falls when CPI rises faster than their stated return.",
    sections: [
      {
        heading: "Why inflation erodes investment returns",
        body: "Inflation reduces the real (purchasing-power-adjusted) value of returns. An investment returning 5% per year nominally returns only 2% real if CPI is running at 3%. Cash deposits at 4.5% with CPI at 4.0% deliver just 0.5% real return. Long-duration nominal bonds are particularly vulnerable — a 10-year bond at 4% locked in for a decade loses real value if inflation averages 5% over that period. Australian CPI averaged 3.5% in the decade to 2024, making inflation a persistent concern for long-term investment planning.",
      },
      {
        heading: "Assets that outpace inflation",
        body: "Equities: company revenues and earnings tend to grow with nominal GDP over the long run, passing inflation to consumers. The ASX 200's nominal total return (including dividends) has averaged roughly 9–10% per annum over 30 years, well ahead of 2–3% average CPI. Property: residential and commercial property prices and rents rise with inflation over time; rental income provides ongoing cash flow. Infrastructure: toll roads (Transurban), airports, and utilities with CPI-linked revenue escalators are direct inflation hedges. Commodities: gold, oil, and agricultural commodities are traditional inflation stores — the ASX has significant resources sector exposure. Australian government Treasury Indexed Bonds (TIBs): principal and coupons adjust with CPI quarterly.",
      },
      {
        heading: "Practical strategies for retail investors",
        body: "For most retail investors, broad-market equity index funds provide sufficient inflation protection via diversification. A specific inflation-hedge allocation might include: an A-REIT ETF (e.g. VAP from Vanguard, SLF from iShares) for real asset exposure; a global infrastructure ETF (e.g. MICH, GLIN); a commodities ETF (e.g. QCB); or a direct holding of inflation-linked government bonds via the ASX or through a bond ETF (e.g. FLOT targets floating-rate bonds with built-in rate sensitivity). The RBA's primary tool for controlling inflation is the cash rate; floating-rate instruments naturally adjust as rates rise.",
      },
    ],
    faqs: [
      {
        q: "Is gold a good inflation hedge for Australian investors?",
        a: "Gold has a mixed inflation-hedge record in Australia. In AUD terms, gold's performance depends on both global USD gold prices and the AUD/USD exchange rate. When global uncertainty drives gold demand and the AUD weakens simultaneously (common in crises), gold in AUD terms can perform very well. However, gold produces no income (no dividends or interest), which makes it a drag on total return in normal conditions. Most financial planners suggest limiting gold to 5–10% of a portfolio if included at all.",
      },
      {
        q: "What are Treasury Indexed Bonds and where do I buy them?",
        a: "Treasury Indexed Bonds (TIBs) are Australian Government securities where the principal is adjusted quarterly by the All Groups CPI index. Coupon payments are a fixed percentage of the inflation-adjusted principal. They can be purchased on the ASX through a broker (GSBG25, GSBG35 etc.) or held in a bond ETF. The Australian Office of Financial Management (AOFM) manages issuance. TIBs are considered the purest inflation hedge available to Australian investors.",
      },
      {
        q: "Does superannuation protect against inflation?",
        a: "Super funds in diversified investment options (balanced, growth) typically invest in a mix of equities, property, and infrastructure that historically outperforms inflation over long horizons. However, super in a 'capital stable' or 'cash' option may not keep pace with CPI. The RBA's 2–3% inflation target sets the benchmark super returns must exceed to preserve real purchasing power in retirement.",
      },
    ],
    relatedSlugs: [
      "how-does-inflation-affect-investments",
      "what-is-diversification-in-investing",
      "how-to-invest-in-reits-in-australia",
      "should-i-pay-off-mortgage-or-invest",
    ],
    relatedTools: [
      { label: "Compare ETF brokers", href: "/etfs" },
      { label: "Compound interest calculator", href: "/compound-interest-calculator" },
    ],
  },
  {
    slug: "what-is-dollar-cost-averaging-australia",
    category: "investing",
    question: "What is dollar-cost averaging and does it work in Australia?",
    metaTitle: "Dollar-Cost Averaging in Australia: Does It Work? (2026 Guide)",
    metaDescription:
      "Dollar-cost averaging (DCA) means investing a fixed dollar amount at regular intervals regardless of price. Compare DCA vs lump-sum investing using Australian data and learn when each strategy is optimal.",
    shortAnswer:
      "Dollar-cost averaging (DCA) means investing a fixed dollar amount at regular intervals — for example, $500 into a broad-market ETF every fortnight — regardless of whether prices are high or low. DCA reduces the risk of investing a lump sum at a market peak, but research consistently shows that lump-sum investing outperforms DCA in approximately two-thirds of historical periods because markets rise more than they fall over time.",
    sections: [
      {
        heading: "How DCA works in practice",
        body: "With DCA you buy more units when prices fall and fewer when prices rise, automatically lowering your average cost per unit over time. For example, investing $500 per month into VAS (Vanguard ASX 200 ETF): in month 1 at $90/unit you buy 5.55 units; in month 2 if the price drops to $80 you buy 6.25 units. Your average cost is lower than if you had simply bought at month 1 prices. DCA is naturally embedded in salary-linked super — employer SG contributions are invested automatically each fortnight, providing textbook DCA without any active decision.",
      },
      {
        heading: "DCA vs lump sum: the Australian evidence",
        body: "Vanguard's research (2023) covering the Australian market found that lump-sum investing outperformed DCA approximately 66% of the time over rolling 10-year periods. This is because the expected drift of markets is upward — the longer you hold cash waiting to invest, the more likely you miss returns. However, the 34% of periods where DCA outperformed lump sum were typically periods of high market volatility or corrections (such as 2007–2009, 2020). The psychological benefit of DCA — avoiding the regret of buying at a peak — is real but not always financially optimal.",
      },
      {
        heading: "When DCA makes practical sense",
        body: "DCA is the right strategy when you are investing from cash flow (salary, business income) rather than a windfall — because you have no choice but to invest incrementally. It also suits investors with low risk tolerance who would be distressed by watching a large lump sum immediately decline 10–15%. For investors receiving an inheritance, redundancy payout, or property sale proceeds, the lump-sum-vs-DCA question is genuine. A common compromise: invest 50% immediately and DCA the remainder over 6–12 months.",
      },
    ],
    faqs: [
      {
        q: "What is the best interval for dollar-cost averaging in Australia?",
        a: "Monthly or fortnightly intervals are most practical for Australian investors, aligning with pay cycles and minimising per-trade brokerage costs. Weekly contributions would increase brokerage drag on small amounts. Some ETF platforms and micro-investment apps offer automated recurring investments, removing the need for manual orders.",
      },
      {
        q: "Does DCA apply to superannuation?",
        a: "Yes — employer SG contributions are a form of DCA. Every pay cycle a fixed percentage of your salary is contributed to super and invested, regardless of market conditions. This is one reason super balances are less volatile than single lump-sum investments of the same amount.",
      },
      {
        q: "Does DCA reduce risk?",
        a: "DCA reduces timing risk — specifically the risk of investing everything at a market peak. It does not reduce market risk or volatility risk once your money is invested. Once your portfolio reaches a steady state (contributions offset by the growing balance), the ongoing DCA of new contributions has a diminishing effect on overall average cost.",
      },
    ],
    relatedSlugs: [
      "how-does-dollar-cost-averaging-work",
      "what-is-dollar-cost-averaging-vs-lump-sum",
      "what-is-an-index-fund",
      "how-do-etf-fees-work-australia",
    ],
    relatedTools: [
      { label: "Compound interest calculator", href: "/compound-interest-calculator" },
      { label: "Compare ETF brokers", href: "/etfs" },
    ],
  },
  {
    slug: "how-does-asset-allocation-work-australia",
    category: "investing",
    question: "How does asset allocation work for Australian investors?",
    metaTitle: "Asset Allocation for Australian Investors: Shares, Bonds & Property (2026)",
    metaDescription:
      "Asset allocation is dividing your portfolio between growth assets (shares, property) and defensive assets (bonds, cash) to match your risk tolerance and time horizon. Learn the standard models and how to build an allocation for Australian conditions.",
    shortAnswer:
      "Asset allocation is the process of dividing your investment portfolio between different asset classes — typically Australian shares, global shares, property, fixed interest (bonds), and cash — in proportions that reflect your risk tolerance, time horizon, and return objectives. The split between 'growth assets' (shares, property) and 'defensive assets' (bonds, cash) is the single most important driver of both long-run returns and portfolio volatility.",
    sections: [
      {
        heading: "The growth vs defensive split",
        body: "Super funds and financial advisers typically classify portfolios by their growth asset exposure: Conservative (0–30% growth), Moderate (30–60%), Balanced (60–70%), Growth (70–90%), High Growth (85–100%). The higher the growth allocation, the higher the expected long-run return — and the larger the potential drawdown in a market crash. The Australian Prudential Regulation Authority (APRA) uses a MySuper product benchmark requiring balanced options to target 60–70% growth assets. Over 30 years, a 70% growth portfolio has historically outperformed a 50% growth portfolio by roughly 1–2% per annum — but with significantly more short-term volatility.",
      },
      {
        heading: "Australian-specific considerations",
        body: "Australian investors often hold home-country bias: overweighting ASX shares relative to their 2% share of global market capitalisation. The ASX 200 is concentrated in financials (banks ~25%), materials (mining ~20%), and healthcare (~10%) — less diversified than the MSCI World Index. A globally diversified portfolio combining Australian and international equities provides broader sector exposure (technology in the US, consumer goods in Europe, emerging markets). The common recommendation from the Financial Services Council's investment research is 30–40% Australian equities, 30–40% international equities, and the remainder in bonds, cash, and alternatives for a growth-oriented portfolio.",
      },
      {
        heading: "Rebalancing to maintain your target allocation",
        body: "Market movements shift your actual allocation away from your target over time. A 70/30 growth/defensive portfolio that experiences a strong equity rally may drift to 80/20, taking on more risk than intended. Rebalancing — selling from over-weight asset classes and buying under-weight ones — restores the target allocation. Research shows annual or threshold-based rebalancing (e.g. rebalance when any class drifts more than 5% from target) provides most of the benefit with minimal trading costs. In superannuation, rebalancing is done within the fund and does not trigger CGT events — a significant tax advantage over rebalancing in a personal investment account.",
      },
    ],
    faqs: [
      {
        q: "How should my asset allocation change as I get older?",
        a: "The traditional rule is to reduce growth asset exposure as you approach retirement — sometimes expressed as '100 minus your age' equals your equity allocation (e.g. 65% equities at age 35, 35% at age 65). Modern thinking often uses '110 or 120 minus your age' given longer lifespans and low bond yields. Target date funds automate this 'glide path'. In practice, your specific health, income, other assets, and risk tolerance should drive the decision — not a formula.",
      },
      {
        q: "What is the role of bonds in an Australian portfolio?",
        a: "Bonds (fixed income) provide: (1) lower volatility — bond prices are less volatile than shares; (2) negative correlation in crises — when sharemarkets fall sharply, government bond prices often rise as investors seek safety; (3) regular income from coupon payments. Australian Government Bonds, the Bloomberg AusBond Composite Index, and international bond ETFs are common bond exposures. In low-interest-rate environments, bonds provide lower income but still serve their volatility-dampening role.",
      },
      {
        q: "Can I implement asset allocation using just ETFs?",
        a: "Yes. A simple three-ETF portfolio can implement a full asset allocation: (1) a broad Australian equity ETF (e.g. VAS, A200), (2) a global equity ETF (e.g. VGS, IVV, BGBL), and (3) a diversified bond ETF (e.g. VAF for Australian bonds, VBND for global bonds). Some investors add a fourth: an Australian or global property/infrastructure ETF. Adjusting the dollar amounts allocated to each ETF sets the growth/defensive split. Vanguard's Diversified ETF range (VDHG, VDGR, VDBA, VDCO) offer all-in-one pre-mixed options at a single MER.",
      },
    ],
    relatedSlugs: [
      "how-does-portfolio-rebalancing-work",
      "what-is-diversification-in-investing",
      "what-is-the-difference-between-shares-and-bonds",
      "index-funds-vs-managed-funds-australia",
    ],
    relatedTools: [
      { label: "Compare ETF brokers", href: "/etfs" },
      { label: "Compound interest calculator", href: "/compound-interest-calculator" },
    ],
  },

  // ── TAX (6 new) ─────────────────────────────────────────────────────────────

  {
    slug: "cgt-50-percent-discount-eligibility-australia",
    category: "tax",
    question: "Who is eligible for the 50% CGT discount in Australia?",
    metaTitle: "CGT 50% Discount: Eligibility Rules for Australian Investors (2026)",
    metaDescription:
      "The 50% CGT discount halves your taxable capital gain if you hold an asset for more than 12 months. Learn who qualifies, which entities get different discounts, and the exclusions under ATO rules.",
    shortAnswer:
      "The 50% capital gains tax (CGT) discount is available to Australian individual taxpayers and Australian resident beneficiaries of trusts who hold a CGT asset for more than 12 months before disposing of it. Companies do not receive the 50% discount. Superannuation funds (including SMSFs) receive a one-third discount (effective rate 10% on fund earnings). The 12-month holding period is measured from acquisition date to date of the CGT event.",
    sections: [
      {
        heading: "Eligibility requirements",
        body: "To qualify for the 50% CGT discount under Division 115 of the Income Tax Assessment Act 1997, you must: (1) be an individual resident in Australia (or an Australian resident trust or complying super fund), (2) have acquired the asset on or after 21 September 1999 (assets acquired before this date are generally eligible for indexation under the old method instead), (3) have held the asset for more than 12 months — the period from acquisition date to the date of the CGT event (not settlement). Mixed acquisitions (e.g. property with improvements) may require apportionment.",
      },
      {
        heading: "Which entities receive the discount — and at what rate",
        body: "Individual taxpayers: 50% discount. This means only half the net capital gain is included in assessable income. At the top 47% marginal rate (incl. Medicare Levy), the effective CGT rate on a discounted gain is 23.5%. Complying super funds (incl. SMSFs): one-third discount — 66.67% of the gain is taxable at 15%, giving an effective rate of 10%. Companies: no discount — 100% of the gain is taxable at 30%. Trusts: the discount is claimed at the beneficiary level (not the trust level), so a corporate beneficiary does not receive the discount, but an individual beneficiary does.",
      },
      {
        heading: "Common exclusions and edge cases",
        body: "The 50% discount is not available for: (1) assets acquired before 20 September 1985 (these are 'pre-CGT' and not assessable at all); (2) revenue assets (e.g. trading stock, or property held as a developer's stock in trade); (3) foreign residents — non-residents do not receive the CGT discount on taxable Australian property gains (as of May 2012 budget measures); (4) financial arrangements under the TOFA (Tax Consolidation) regime where gains are ordinary income. The 45-day rule for franking credits does not affect CGT discount eligibility.",
      },
    ],
    faqs: [
      {
        q: "Can I use the CGT discount to offset capital losses?",
        a: "Capital losses must be offset against capital gains before applying the 50% discount. If you have $20,000 gross gain and $5,000 capital loss, the net gain is $15,000. The discount then applies to the $15,000 net gain, giving a taxable amount of $7,500. You cannot apply the discount to the gross gain and then subtract losses.",
      },
      {
        q: "Does the 12-month holding period reset if I move assets to a trust or company?",
        a: "Generally yes. A CGT event occurs when you transfer an asset to a new legal entity — the new owner (trust or company) starts a fresh 12-month clock. Exceptions exist for certain tax-neutral rollovers (e.g. small business restructure rollovers under Subdivisions 328-G and 122-A), but these have strict conditions. Get specific advice before restructuring.",
      },
      {
        q: "Does the CGT discount apply to crypto assets?",
        a: "Yes, if the crypto is held as an investment (not trading stock or a personal use asset worth under $10,000 acquired for personal use). The ATO treats crypto as a CGT asset. Holding for more than 12 months before disposal entitles individual investors to the 50% discount on any capital gain, as confirmed in ATO Tax Determination TD 2014/26.",
      },
    ],
    relatedSlugs: [
      "what-is-capital-gains-tax-discount",
      "how-to-reduce-capital-gains-tax-australia",
      "how-does-tax-loss-harvesting-work",
      "how-do-i-report-crypto-tax-in-australia",
    ],
    relatedTools: [
      { label: "CGT calculator", href: "/cgt-calculator" },
      { label: "Find a financial adviser", href: "/financial-advisers" },
    ],
  },
  {
    slug: "how-to-calculate-negative-gearing-tax-benefit",
    category: "tax",
    question: "How do you calculate the tax benefit of negative gearing in Australia?",
    metaTitle: "How to Calculate Your Negative Gearing Tax Benefit (Australia 2026)",
    metaDescription:
      "Calculate your negative gearing tax saving: subtract gross rental income from total deductible expenses, multiply the net loss by your marginal tax rate. Step-by-step examples for FY2026.",
    shortAnswer:
      "Your negative gearing tax benefit equals the net rental loss multiplied by your marginal income tax rate. For example, if your investment property generates $28,000 in rent and incurs $42,000 in deductible expenses, the $14,000 net loss at a 37% marginal rate saves you $5,180 in income tax for the year.",
    sections: [
      {
        heading: "Step-by-step calculation",
        body: "Step 1: Calculate gross rental income (all rent received, plus any non-refundable bonds, insurance payouts for lost rent, etc.). Step 2: Add all deductible expenses: loan interest, property management fees (typically 7–10% of rent), council rates, water rates, landlord insurance, repairs and maintenance, building depreciation (Division 43, 2.5% of construction cost per year for post-1987 buildings), and plant and equipment depreciation (Division 40 per a quantity surveyor schedule). Step 3: Calculate the net loss: Gross Income − Total Deductible Expenses. Step 4: Multiply by your marginal tax rate (32.5%, 37%, or 45% for FY2026). The result is your annual tax saving. Remember: you still funded the cash shortfall from other income.",
      },
      {
        heading: "Worked example (FY2026)",
        body: "Scenario: $600,000 investment property, 80% LVR mortgage at 6.3% interest, $2,400/month rent. Gross rental income: $28,800. Deductible expenses: Loan interest $30,240 + property management $2,304 + council rates $1,800 + landlord insurance $1,200 + repairs $800 + building depreciation $7,500 + plant & equipment depreciation $3,200 = $47,044. Net loss: $28,800 − $47,044 = −$18,244. Tax saving at 37% marginal rate: $18,244 × 37% = $6,750. Cash flow reality: the investor still pays $18,244 − $6,750 = $11,494 out of pocket per year on top of loan principal repayments.",
      },
      {
        heading: "PAYG Withholding Variation to get the tax back early",
        body: "Instead of waiting until after 30 June for a tax refund, you can lodge a PAYG Withholding Variation application with the ATO (Form NAT 2036). This instructs your employer to reduce the tax withheld from your salary each pay cycle, effectively delivering the tax saving fortnightly rather than annually. The variation must be renewed each financial year. This improves cash flow — you receive the tax benefit continuously rather than as a lump-sum refund after lodging your return.",
      },
    ],
    faqs: [
      {
        q: "Can I include capital works (depreciation) if I did not commission a quantity surveyor report?",
        a: "You can self-estimate building construction costs for Division 43 depreciation if records are available. However, the ATO recommends engaging a Registered Quantity Surveyor (as per Tax Ruling TR 97/25) because they can identify all depreciable assets under Division 40 (plant and equipment), which often adds significant additional deductions. Most surveyors charge $400–$700 for a report and the fee itself is tax-deductible.",
      },
      {
        q: "Does a temporary rental vacancy affect the negative gearing deduction?",
        a: "You can still claim deductions during short periods of vacancy if you are genuinely trying to rent the property out and it is available for rent. If the property is not advertised or is used personally during the vacancy, you must apportion deductions for the days it was income-producing. The ATO expects a market-rate rent and genuine marketing effort to support vacancy-period claims.",
      },
      {
        q: "What happens to accumulated net rental losses when I sell the property?",
        a: "Net rental losses are deducted in the year incurred — there is no carry-forward of property rental losses in Australia (unlike most other countries). Each year, the net loss reduces your current-year taxable income. When you sell, the relevant consideration for tax is the capital gain (or loss) on sale, not the accumulated rental losses, which have already provided ongoing annual deductions.",
      },
    ],
    relatedSlugs: [
      "how-does-negative-gearing-work",
      "how-does-depreciation-work-for-investment-property",
      "what-is-an-investment-property-depreciation-schedule",
      "what-is-capital-gains-tax",
    ],
    relatedTools: [
      { label: "Negative gearing calculator", href: "/negative-gearing/calculator" },
      { label: "CGT calculator", href: "/cgt-calculator" },
    ],
  },
  {
    slug: "what-is-payg-withholding-for-investments-australia",
    category: "tax",
    question: "What is PAYG withholding on investment income in Australia?",
    metaTitle: "PAYG Withholding on Investment Income Australia: Interest, Dividends & More (2026)",
    metaDescription:
      "PAYG withholding applies to Australian investment income when no TFN or ABN is provided. Learn withholding rates for bank interest, dividends, and managed fund distributions, and how to reclaim over-withheld amounts.",
    shortAnswer:
      "Pay As You Go (PAYG) withholding on investment income occurs when a payer (bank, company, or fund manager) deducts tax from interest, dividends, or distributions before paying you, because no Tax File Number (TFN) or Australian Business Number (ABN) has been provided. The withholding rate is 47% (the top marginal rate plus Medicare Levy). You reclaim any excess when you lodge your tax return.",
    sections: [
      {
        heading: "When investment income withholding applies",
        body: "Australian banks, companies, and fund managers must withhold 47% from investment income if the investor: (1) has not provided a TFN to the payer, (2) has not provided an ABN (for business investors), or (3) has not lodged a withholding exemption declaration (available for investors below the tax-free threshold with no other income). This withheld amount is sent directly to the ATO and reported on your Investment Income Summary. Withholding is not a final tax — it is a prepayment of your actual tax liability.",
      },
      {
        heading: "How to avoid over-withholding",
        body: "Provide your TFN to every bank, brokerage, and fund manager you deal with. You can provide your TFN directly through online banking portals, brokerage account settings, or share registry accounts (Computershare, Link Market Services). If you have multiple accounts or holdings, each institution needs your TFN separately. For joint accounts, both account holders' TFNs should be provided. Once registered, withholding stops on future payments. For past over-withheld amounts, you claim credit in your annual income tax return.",
      },
      {
        heading: "PAYG instalments vs PAYG withholding",
        body: "PAYG withholding is deducted by a third party (your bank or company). PAYG instalments are a separate system where the ATO requires investors with significant investment income (typically where investment income tax liability exceeds ~$8,000 per year) to make quarterly or annual pre-payments of estimated tax. If you receive a PAYG instalment notice, the ATO has calculated an instalment rate based on your previous year's tax. You can vary this rate if your income has changed. PAYG instalments avoid a large tax bill at year-end but do not eliminate the need to lodge a return.",
      },
    ],
    faqs: [
      {
        q: "Do foreign dividends have Australian withholding tax?",
        a: "Foreign companies pay dividends subject to the source country's withholding tax rate (typically 15–30% under tax treaties). For Australian investors receiving US dividends via a US broker or ETF, 15% US withholding tax applies under the Australia–US tax treaty. You claim a foreign income tax offset (FITO) in your Australian tax return for this withholding, preventing double taxation.",
      },
      {
        q: "What is the unfranked dividend withholding rate for foreign shareholders?",
        a: "Non-resident investors receiving unfranked dividends from Australian companies are subject to a 30% Australian withholding tax, reduced to 15% for residents of countries with which Australia has a tax treaty (e.g. US, UK, Japan). Fully franked dividends are exempt from withholding tax for non-residents under section 128B(3)(ga) of the Income Tax Assessment Act 1936.",
      },
      {
        q: "Can managed investment schemes withhold from distributions?",
        a: "Yes. If a unitholder has not provided a TFN or ABN to a managed investment scheme, the scheme must withhold 47% from the taxable components of distributions. This includes Australian equity ETFs, unlisted managed funds, and property trusts. Provide your TFN to your fund registry to prevent this — the registry is usually different from your broker.",
      },
    ],
    relatedSlugs: [
      "how-do-i-get-a-tax-file-number",
      "how-does-franking-credit-work",
      "how-to-invest-in-us-shares-from-australia",
      "how-does-dividend-investing-work",
    ],
    relatedTools: [
      { label: "Franking credits calculator", href: "/franking-credits-calculator" },
      { label: "Find a financial adviser", href: "/financial-advisers" },
    ],
  },
  {
    slug: "share-splits-and-cgt-australia",
    category: "tax",
    question: "How do share splits affect CGT in Australia?",
    metaTitle: "Share Splits and CGT in Australia: What Investors Need to Know (2026)",
    metaDescription:
      "A share split increases your number of shares while reducing the price per share. Learn how the ATO treats share splits for CGT purposes, cost base adjustments, and the 12-month holding period.",
    shortAnswer:
      "A share split does not trigger a CGT event in Australia. Your original cost base and acquisition date remain unchanged — they are simply allocated across the greater number of shares after the split. For example, if you held 100 shares with a total cost base of $5,000 and the company performs a 2-for-1 split, you now hold 200 shares with the same $5,000 total cost base ($25 per share instead of $50 per share), and the original acquisition date carries forward.",
    sections: [
      {
        heading: "ATO treatment of share splits",
        body: "Under the CGT rules in the Income Tax Assessment Act 1997, a share split is treated as a 'bonus issue' of additional shares. Section 130-20 provides that when bonus shares are issued as part of a split, no CGT event occurs at the time of the split. The cost base of the original shares is reallocated across all shares (original plus new) proportionally. The acquisition date of all shares in a split reverts to the date the original shares were acquired — critical for the 12-month discount test.",
      },
      {
        heading: "Cost base allocation in practice",
        body: "Example: You bought 500 Afterpay shares at $20 each in January 2023, total cost base $10,000. In August 2024, the company performs a 5-for-1 split. You now hold 2,500 shares. Your $10,000 total cost base is reallocated: $4.00 per share. When you sell in March 2026, your cost base per share is $4.00, not $20.00 — but your total cost base remains $10,000 regardless of how many shares you hold. The January 2023 acquisition date still applies, so the 50% CGT discount is available.",
      },
      {
        heading: "Share consolidations (reverse splits) work the same way",
        body: "A share consolidation (reverse split) reduces the number of shares while proportionally increasing the price per share. The ATO treats consolidations identically to splits — no CGT event, cost base is reallocated to the reduced number of shares, and acquisition date is preserved. However, if a consolidation results in fractional entitlements being cashed out (small parcel holders receiving cash rather than a fractional share), that cash payment constitutes a CGT event on the fractional portion.",
      },
    ],
    faqs: [
      {
        q: "What about rights issues — do they trigger a CGT event?",
        a: "The CGT treatment of rights issues depends on whether you exercise the rights, sell the rights, or let them lapse. Exercising rights: no CGT event at exercise; the rights cost base is added to the new shares' cost base. Selling rights: CGT event A1 — a capital gain or loss arises. Rights lapsing: CGT event C2 if you paid for the rights (capital loss equal to amount paid); no loss if the rights were issued for free.",
      },
      {
        q: "Does a demerger trigger CGT?",
        a: "A demerger (e.g. a company spinning off a subsidiary as a separate listed entity) triggers special CGT rules under Division 125. If you choose to apply the demerger rollover relief, no CGT event occurs and you instead allocate your original cost base across the original and demerged entities in proportion to their relative values. If you do not elect rollover relief, CGT event G1 may apply. Most company demerger documentation will state whether rollover relief is available.",
      },
      {
        q: "Do I need to report a share split on my tax return?",
        a: "No CGT reporting is required in the year of a share split because no CGT event occurs. However, you must update your records to reflect the new number of shares and the adjusted per-share cost base. Failure to update records often leads to errors when you eventually sell — your online broker platform or share registry may automatically adjust your cost base, but verify this against the split ratio.",
      },
    ],
    relatedSlugs: [
      "what-is-capital-gains-tax-discount",
      "how-to-reduce-capital-gains-tax-australia",
      "cgt-50-percent-discount-eligibility-australia",
      "how-does-tax-loss-harvesting-work",
    ],
    relatedTools: [
      { label: "CGT calculator", href: "/cgt-calculator" },
      { label: "Compare share brokers", href: "/share-trading" },
    ],
  },
  {
    slug: "dividend-imputation-smsf-australia",
    category: "tax",
    question: "How does dividend imputation work for SMSFs in Australia?",
    metaTitle: "Dividend Imputation for SMSFs: Franking Credits & Tax Refunds (2026)",
    metaDescription:
      "SMSFs in accumulation phase pay 15% tax; fully franked dividends carry 30% credits that generate substantial refunds. In pension phase the fund pays 0% tax and receives the entire credit as cash. Learn the mechanics and ATO rules.",
    shortAnswer:
      "SMSFs benefit significantly from Australia's dividend imputation system. In accumulation phase (15% tax), a fully franked dividend carries a 30% franking credit that exceeds the fund's 15% tax rate — the surplus 15% is refunded by the ATO in cash. In pension phase (0% tax), the entire 30% credit is refunded. This makes fully franked Australian shares among the most tax-efficient assets an SMSF can hold.",
    sections: [
      {
        heading: "Franking credits in accumulation phase",
        body: "An SMSF in accumulation phase pays 15% tax on investment income. When the fund receives a fully franked dividend, it grosses up the dividend by the 30% credit and pays 15% tax on the grossed-up amount. The 30% credit exceeds the 15% tax liability, creating a 15% net refund. Example: $7,000 fully franked dividend, $3,000 franking credit attached. Grossed-up dividend = $10,000. Tax at 15% = $1,500. Net refund = $3,000 − $1,500 = $1,500 cash refund from the ATO. For a well-diversified Australian equity portfolio in an SMSF, annual franking credit refunds can total tens of thousands of dollars.",
      },
      {
        heading: "Franking credits in pension phase",
        body: "When all SMSF members are in retirement pension phase, the fund's tax rate is 0% on pension-supporting assets. All franking credits attached to dividends are fully refundable — there is no tax liability to offset them against. This makes pension-phase SMSFs the most advantaged vehicle for receiving fully franked dividends in Australia. A pension-phase SMSF holding $500,000 in Australian equities with an average 4% fully franked dividend yield receives $20,000 in dividends plus approximately $8,571 in franking credit refunds ($20,000 × 30/70) — total income $28,571 from a $500,000 holding.",
      },
      {
        heading: "Eligibility requirements and the 45-day rule",
        body: "To claim franking credit offsets, the SMSF must satisfy the 45-day holding rule: shares must be held 'at risk' for at least 45 days (not counting the acquisition and disposal dates) around the ex-dividend date. 'At risk' means the fund's economic exposure to the shares must not be materially reduced by hedging, put options, or short sales during this period. Preference shares require a 90-day holding period. The rule prevents dividend stripping — buying shares purely to capture the credit and then selling immediately. SMSFs that trade actively should track holding periods carefully.",
      },
    ],
    faqs: [
      {
        q: "Can an SMSF mix accumulation and pension members and still claim full franking refunds?",
        a: "Yes, but only on the pension proportion. SMSFs with both accumulation and pension members must apportion assets between accumulation and pension pools (or use the segregated or unsegregated asset method). Franking credits attributable to pension assets are fully refundable; those attributable to accumulation assets generate a partial refund (30% credit minus 15% accumulation tax = 15% net refund). Specialist SMSF accountants use actuarial certificates and the proportional (unsegregated) method to calculate the correct allocation.",
      },
      {
        q: "What is the 'disqualifying purpose' rule for franking credits in SMSFs?",
        a: "The ATO can deny franking credit offsets where a scheme has been entered into with a dominant purpose of enabling an entity to obtain a franking benefit (Part IVA anti-avoidance rules). For SMSFs this is most relevant to structured products or dividend-stripping arrangements — normal investment in listed Australian shares is not affected. The 45-day rule provides a specific bright-line test for ordinary dividend investments.",
      },
      {
        q: "How do I claim franking credit refunds in an SMSF tax return?",
        a: "Franking credits are reported in the SMSF annual return (SAR) lodged with the ATO each year. Dividend statements and ETF distribution statements show the franking credit amount. These are aggregated in the trust tax return schedule. Where credits exceed the fund's tax liability, the ATO issues a refund cheque or direct credit — typically within 4–8 weeks of the SAR lodgment.",
      },
    ],
    relatedSlugs: [
      "how-does-franking-credit-work",
      "how-do-franking-credits-work-in-super",
      "what-is-smsf-and-is-it-worth-it",
      "cgt-50-percent-discount-eligibility-australia",
    ],
    relatedTools: [
      { label: "SMSF calculator", href: "/smsf-calculator" },
      { label: "Franking credits calculator", href: "/franking-credits-calculator" },
    ],
  },
  {
    slug: "tax-deductions-investment-expenses-australia",
    category: "tax",
    question: "What investment-related expenses are tax deductible in Australia?",
    metaTitle: "Tax Deductions for Investment Expenses in Australia (2026 Guide)",
    metaDescription:
      "Interest on investment loans, adviser fees, platform fees, subscriptions, and some accounting costs are deductible against investment income. Learn what the ATO allows, what it denies, and how to substantiate claims.",
    shortAnswer:
      "Investment expenses that are incurred in producing assessable investment income are generally tax-deductible in Australia under section 8-1 of the Income Tax Assessment Act 1997. Deductible expenses include loan interest (on borrowed money to invest), ongoing financial advice fees, investment platform fees, tax agent fees (for investment-related work), subscriptions to investment research services, and some travel to inspect investments. Personal financial planning fees for personal-financial decisions (e.g. estate planning, insurance advice) are generally not deductible.",
    sections: [
      {
        heading: "Commonly deductible investment expenses",
        body: "Interest on borrowings: the most significant deduction for geared investors. Interest on margin loans, investment property loans, and personal loans used to buy income-producing shares is deductible. The loan purpose (investment, not personal) determines deductibility. Ongoing financial advice fees: fees charged for managing an existing investment portfolio or for advice that maintains or increases income from existing investments are deductible. Initial set-up advice fees and advice relating to salary, insurance, and super contributions generally are not. Investment platform and brokerage fees: platform administration fees and trade commissions are deductible against investment income, or add to the cost base of shares sold. Investment research subscriptions: costs of subscriptions to research services, financial data providers, and publications used for investment decision-making are deductible if the investments are held for income production (not capital growth only). Safe deposit box rental: deductible if used solely to store investment documents.",
      },
      {
        heading: "Financial advice deductibility — the contested area",
        body: "The deductibility of financial advice fees is a nuanced area under ATO guidance (Tax Ruling TR 95/35 and subsequent updates). Deductible: ongoing advice fees for investment management, restructuring an existing portfolio, tax advice relating to investments. Not deductible: initial financial plan fees, advice on establishing a super fund, advice on personal risk insurance (life, TPD, income protection), advice on estate planning and wills, and fees for advice that is capital in nature (e.g. setting up an investment structure). From 1 July 2013, financial advisers must provide an annual renewal notice for ongoing fee arrangements — clients should review whether their fee is for deductible investment advice.",
      },
      {
        heading: "Record-keeping requirements",
        body: "The ATO requires you to keep records supporting all deduction claims for five years after lodgment of the relevant return. For investment expenses this means: receipts or tax invoices for each deductible expense, bank statements showing interest charges on investment loans, brokerage confirmations showing commissions paid, and adviser fee disclosure statements. The ATO data-matches significant deduction categories including investment loan interest and large adviser fee claims. If you cannot substantiate a claim with written evidence, it may be disallowed upon audit.",
      },
    ],
    faqs: [
      {
        q: "Can I deduct the cost of attending investment seminars?",
        a: "Self-education expenses related to improving specific skills for your current investment activities can be deductible, but seminars marketed as 'wealth creation' or 'getting started in investing' are generally denied by the ATO on the basis they relate to income-earning activities you do not yet undertake. If you already hold a portfolio of shares or properties and attend a seminar directly related to managing those investments, a deduction is more defensible.",
      },
      {
        q: "Are home office expenses deductible for managing investments?",
        a: "Only in limited circumstances. Investors who actively manage a significant portfolio from a dedicated home office may be able to claim a proportion of home office running costs. However, the ATO does not consider passive investment management (checking prices, attending AGMs) to constitute carrying on a business. Traders (those with high turnover and active strategies assessed as a business) may have stronger claims under TR 97/11.",
      },
      {
        q: "Can I deduct the cost of a quantity surveyor report for my investment property?",
        a: "Yes. A depreciation report from a Registered Quantity Surveyor is a fully deductible investment expense in the year it is paid. The fee is typically $400–$700 for a residential property. It is reported under 'other deductions' in the rental property schedule of your tax return.",
      },
    ],
    relatedSlugs: [
      "how-does-negative-gearing-work",
      "what-is-a-margin-loan",
      "how-does-depreciation-work-for-investment-property",
      "how-to-reduce-capital-gains-tax-australia",
    ],
    relatedTools: [
      { label: "Negative gearing calculator", href: "/negative-gearing/calculator" },
      { label: "Find a financial adviser", href: "/financial-advisers" },
    ],
  },

  // ── PROPERTY (5 new) ────────────────────────────────────────────────────────

  {
    slug: "what-is-lenders-mortgage-insurance-australia",
    category: "property",
    question: "What is lenders mortgage insurance (LMI) in Australia?",
    metaTitle: "What Is Lenders Mortgage Insurance (LMI) in Australia? (2026 Guide)",
    metaDescription:
      "LMI protects the lender (not you) when you borrow more than 80% of a property's value. Learn typical LMI costs, how to avoid it, and whether paying LMI to enter the market sooner makes financial sense.",
    shortAnswer:
      "Lenders Mortgage Insurance (LMI) is a one-off premium charged by lenders when a borrower's loan-to-value ratio (LVR) exceeds 80% — meaning the deposit is less than 20% of the property's purchase price. LMI protects the lender, not the borrower, against the risk of default. The premium is typically capitalised into the loan, adding $8,000–$35,000+ to the amount borrowed depending on the loan size and LVR.",
    sections: [
      {
        heading: "How LMI is calculated",
        body: "LMI premiums are calculated as a percentage of the loan amount and vary by LVR band and loan size. At 85% LVR (15% deposit), LMI is typically 0.5–1.0% of the loan. At 90% LVR (10% deposit), premiums rise to 1.0–2.5%. At 95% LVR (5% deposit), the premium can reach 3.0–4.5% of the loan amount. For a $600,000 purchase with a 10% deposit ($60,000), LMI at 90% LVR on a $540,000 loan might be $8,000–$12,000. LMI is charged by the lender (paid to Genworth or QBE, Australia's main LMI providers) and is usually capitalised — added to your loan balance. It is not an insurance premium you pay annually; it is a one-off upfront cost.",
      },
      {
        heading: "Ways to avoid LMI",
        body: "Save a 20% deposit: the most straightforward path — LMI does not apply at 80% LVR or below. Use a guarantor loan: a family member provides equity in their own property as additional security, reducing the effective LVR below 80% without the borrower having a 20% deposit. Apply for the First Home Guarantee (FHBG): the federal government guarantees up to 15% of the loan for eligible first home buyers with 5% deposits, avoiding LMI entirely. Some professions (doctors, lawyers, accountants, engineers) qualify for LMI waivers up to 90% LVR from certain lenders due to their perceived low default risk.",
      },
      {
        heading: "Is paying LMI worth it to enter the market sooner?",
        body: "Whether to pay LMI or wait until you have a 20% deposit depends on how fast property prices are rising in your target market. If a $700,000 property you want to buy increases in value by $70,000 (10%) while you spend two years saving the extra 10% deposit ($70,000), you have paid $70,000 extra for the same property — significantly more than the $10,000 LMI would have cost. Conversely, in a flat or falling market, waiting avoids both LMI and potential overpayment. Run the numbers for your specific market and realistic savings timeline. LMI is not refundable if you sell within the first few years.",
      },
    ],
    faqs: [
      {
        q: "Is LMI transferable if I refinance?",
        a: "No. LMI is a one-off premium paid to the insurer for the specific loan and property at origination. If you refinance to a different lender — even at the same LVR — a new LMI premium is charged by the new lender's insurer. This is an important cost to factor into refinancing calculations if your LVR is still above 80%.",
      },
      {
        q: "Can I claim LMI as a tax deduction?",
        a: "LMI on an investment property is tax-deductible, but as a borrowing expense it must be spread over the lesser of the loan term and five years (not claimed in full in the first year). For an owner-occupier PPOR, LMI is not deductible as it is a personal expense. If you refinance and pay new LMI, any unamortised portion of the original LMI may be written off in the year of refinancing.",
      },
      {
        q: "Does LMI protect me if I can't repay my loan?",
        a: "No. LMI protects the lender, not the borrower. If you default on your mortgage, the lender sells the property and claims any shortfall from the LMI insurer. The insurer then has the right to pursue you for that amount. LMI does not prevent mortgage default proceedings against the borrower. For borrower protection, consider income protection insurance or mortgage protection insurance.",
      },
    ],
    relatedSlugs: [
      "how-to-buy-property-in-australia",
      "how-does-the-first-home-guarantee-work",
      "how-does-mortgage-offset-work",
      "what-is-rentvesting",
    ],
    relatedTools: [
      { label: "Mortgage calculator", href: "/mortgage-calculator" },
      { label: "Compare property investment platforms", href: "/property-platforms" },
    ],
  },
  {
    slug: "offset-account-vs-redraw-facility-australia",
    category: "property",
    question: "What is the difference between a mortgage offset account and a redraw facility?",
    metaTitle: "Offset Account vs Redraw Facility: Which Saves More? (Australia 2026)",
    metaDescription:
      "Offset accounts and redraw facilities both reduce your mortgage interest, but they work differently for tax, access, and investor use. Learn the key differences and when each is better for Australian homeowners.",
    shortAnswer:
      "A mortgage offset account is a separate transaction account where the balance reduces the loan principal on which interest is calculated — your money stays in your account, accessible anytime. A redraw facility allows you to make extra repayments into the loan and redraw them later — but the money legally belongs to the lender until redrawn. For investment properties, mixing offset and redraw can create tax complications — always use an offset account for tax clarity.",
    sections: [
      {
        heading: "How offset accounts work",
        body: "An offset account is a linked transaction account that 'offsets' your loan balance. If your loan is $500,000 and your offset account holds $80,000, you pay interest only on $420,000. The $80,000 remains in your account — you can spend it anytime via EFTPOS, transfer, or BPay. The interest reduction is equivalent to earning your mortgage interest rate on your cash — tax-free, because it is not an earning but an interest reduction. Most variable-rate home loans offer offset accounts; some fixed-rate loans do not (or charge a fee for the feature).",
      },
      {
        heading: "How redraw facilities work",
        body: "A redraw facility lets you make extra repayments above your minimum scheduled repayments, reducing your loan balance and saving interest. Unlike an offset, the extra money is paid into the loan — you do not have a separate account. The lender holds the funds as prepaid principal. You can 'redraw' the extra repayments if needed (subject to the lender's terms), but some lenders impose minimum redraw amounts, fees, or processing delays. The key legal distinction: money in a redraw is technically the lender's until withdrawn; money in an offset is always yours.",
      },
      {
        heading: "Tax implications for investment properties",
        body: "For investment property owners, using the wrong structure can have significant tax consequences. If you put extra money into your investment loan via redraw and then redraw it for personal use (e.g. a holiday or home renovations), the ATO may deny deductibility of the interest on the redrawn portion — because the loan is now partially funding non-income-producing activities. Using an offset account for personal savings while keeping the loan balance untouched preserves full interest deductibility, because you have not mixed the loan's purpose. Rule of thumb: for investment loans, always use an offset account rather than paying extra principal into the loan.",
      },
    ],
    faqs: [
      {
        q: "Can I have multiple offset accounts against one loan?",
        a: "Many lenders allow up to 10 offset accounts linked to a single home loan, which is useful for budgeting (e.g. separate accounts for bills, holidays, emergency fund). All linked offset balances aggregate to reduce the loan interest. Not all lenders offer this feature — check your lender's offset account terms before choosing a loan.",
      },
      {
        q: "Which is better for an owner-occupier: offset or redraw?",
        a: "For pure owner-occupiers with no investment property, the mathematical interest saving is identical (assuming the same balance held). The offset wins on flexibility — funds are immediately accessible without requiring a formal redraw application and there is no risk of the lender changing redraw terms. For large emergency fund balances, offset is the preferred structure.",
      },
      {
        q: "Does money in an offset account earn interest?",
        a: "No. The offset account reduces interest charged, not earns interest. If your loan rate is 6.2% and you hold $50,000 in an offset, you save approximately $3,100 per year in interest charges — the equivalent of a 6.2% return on $50,000, but it is a tax-free interest reduction rather than taxable interest income. This is often more valuable than a savings account at a lower after-tax rate.",
      },
    ],
    relatedSlugs: [
      "how-does-mortgage-offset-work",
      "should-i-pay-off-mortgage-or-invest",
      "how-does-negative-gearing-work",
      "what-is-rentvesting",
    ],
    relatedTools: [
      { label: "Mortgage calculator", href: "/mortgage-calculator" },
      { label: "Negative gearing calculator", href: "/negative-gearing/calculator" },
    ],
  },
  {
    slug: "fixed-vs-variable-rate-mortgage-australia",
    category: "property",
    question: "Should I choose a fixed or variable interest rate mortgage in Australia?",
    metaTitle: "Fixed vs Variable Mortgage Rate in Australia: Which Is Better? (2026)",
    metaDescription:
      "Fixed rates lock in certainty; variable rates offer flexibility and offset accounts. Learn the break costs, RBA rate outlook considerations, and how to decide between fixed and variable in 2026.",
    shortAnswer:
      "A fixed-rate mortgage locks your interest rate for a set term (typically 1–5 years), providing payment certainty but restricting extra repayments and typically not allowing an offset account. A variable-rate mortgage moves with the lender's standard variable rate (influenced by RBA cash rate changes), offering full flexibility to make extra repayments and use an offset account. Most Australian borrowers choose variable or a split (part fixed, part variable) for the combined benefits.",
    sections: [
      {
        heading: "Advantages and limitations of fixed rates",
        body: "Fixed rates provide: budget certainty (your repayment does not change for the fixed term), protection if rates rise, and sometimes a lower initial rate than variable (in an inverted yield curve environment). Limitations: break costs — if you pay off the loan early, refinance, or sell the property before the fixed term expires, lenders charge a 'break fee' reflecting their cost of funds; this can range from a few hundred to tens of thousands of dollars depending on how far rates have moved. Most fixed-rate loans do not allow an offset account, limiting interest-reduction flexibility. Extra repayments are usually capped at $10,000–$20,000 per year without incurring break costs.",
      },
      {
        heading: "Advantages and limitations of variable rates",
        body: "Variable rates offer: full flexibility to make extra repayments without penalty, offset account access (often including multiple offset accounts), ability to refinance freely, and participation in rate decreases (when the RBA cuts, variable rates typically follow). Limitations: rate uncertainty — when the RBA raises rates, your repayments increase. The 2022–2023 RBA tightening cycle raised the cash rate from 0.10% to 4.35%, increasing monthly repayments on a $600,000 loan by approximately $1,700. Variable rates require the borrower to absorb interest rate risk.",
      },
      {
        heading: "The split loan compromise",
        body: "Many Australian borrowers opt for a split: fix 40–60% of their loan for certainty while keeping 40–60% variable for flexibility. This provides partial protection against rate rises while maintaining offset and extra repayment benefits on the variable portion. For investors, keeping the investment loan variable (with offset) and the PPOR loan fixed is a common strategy — the variable investment loan preserves deductibility clarity. When considering fixing in 2026, compare the fixed rate offered against the current variable rate and market rate expectations. Fixed rates embed the market's view of future rate movements — paying a premium to fix when markets expect rate cuts may be costly.",
      },
    ],
    faqs: [
      {
        q: "What is a mortgage break cost and how is it calculated?",
        a: "A break cost compensates the lender for the cost of funding your fixed-rate loan on wholesale money markets. It is calculated as: outstanding loan balance × (fixed rate − current wholesale rate for the remaining term) × remaining term in years. If rates have risen since you fixed, break costs can be minimal or zero (because the lender can re-lend at a higher rate). If rates have fallen, break costs can be substantial. Always get a break cost quote from your lender before refinancing a fixed loan.",
      },
      {
        q: "Can I lock in a rate before settlement?",
        a: "Yes. Most lenders offer a rate lock facility for fixed-rate loans: you pay a fee (typically $500–$1,000 or 0.15% of the loan) to lock the fixed rate for 60–90 days from approval to settlement. This is useful in a rising rate environment when you are concerned the rate may increase between approval and settlement.",
      },
      {
        q: "Is it worth fixing my rate if the RBA is expected to cut rates?",
        a: "Generally not — if the market expects rate cuts, fixed rates will typically be offered below current variable rates but may still be above where variable rates will settle after cuts. You could miss out on multiple rate decreases. However, if your budget is sensitive to payment increases and you need certainty, a short fix (1–2 years) may provide valuable peace of mind even if it is not mathematically optimal.",
      },
    ],
    relatedSlugs: [
      "should-i-pay-off-mortgage-or-invest",
      "how-does-mortgage-offset-work",
      "offset-account-vs-redraw-facility-australia",
      "how-to-buy-property-in-australia",
    ],
    relatedTools: [
      { label: "Mortgage calculator", href: "/mortgage-calculator" },
      { label: "Compare property investment platforms", href: "/property-platforms" },
    ],
  },
  {
    slug: "how-does-property-depreciation-work-australia",
    category: "property",
    question: "How does property depreciation work as a tax deduction in Australia?",
    metaTitle: "Property Depreciation Deductions Australia: Division 40 & 43 (2026)",
    metaDescription:
      "Investment property owners can claim Division 43 (building allowance) and Division 40 (plant and equipment) depreciation. Learn eligibility, rates, quantity surveyor reports, and ATO rules for new vs second-hand properties.",
    shortAnswer:
      "Investment property owners can claim two types of depreciation deductions against rental income: Division 43 (capital works allowance at 2.5% per year of construction cost for eligible buildings) and Division 40 (decline in value of plant and equipment items like carpet, ovens, hot water systems, and air conditioning). Together, depreciation deductions can add $5,000–$25,000 per year to an investment property's total deductions without any cash outlay.",
    sections: [
      {
        heading: "Division 43: capital works deduction",
        body: "Division 43 applies to the construction cost of the building structure itself. For residential investment properties built after 18 July 1985, owners can claim 2.5% of the original construction cost per year for 40 years. For commercial buildings built after 20 July 1982, the rate is 2.5% over 40 years (or 4% for some industrial buildings). If you did not build the property, you estimate the original construction cost — either from council records, contracts of sale, or a quantity surveyor estimate. A $400,000 construction cost generates $10,000 per year in Division 43 deductions across 40 years. Buildings built before the relevant dates do not qualify, but improvements made after those dates (renovations) do qualify separately.",
      },
      {
        heading: "Division 40: plant and equipment",
        body: "Division 40 covers separately identifiable assets within the property that wear out and are replaced. Common Division 40 items include: carpets (effective life 10 years), ovens and stoves (12 years), dishwashers (10 years), air conditioning units (10 years), hot water systems (12 years), blinds (6 years), smoke alarms (5 years), and garbage disposal units (10 years). Depreciation is calculated under the diminishing value or prime cost method. ATO Tax Ruling TR 2021/3 contains the full effective life table. From 1 July 2017, Division 40 deductions for residential investment properties are restricted to new and substantially new assets — second-hand assets in a property purchased after May 2017 cannot be depreciated by the new owner (this is the 'second-hand plant and equipment' rule).",
      },
      {
        heading: "Quantity surveyor report and recordkeeping",
        body: "To maximise depreciation claims, engage a Tax Depreciation Specialist (Registered Quantity Surveyor). The surveyor inspects the property and prepares a depreciation schedule covering all eligible Division 43 and Division 40 items, with year-by-year deduction amounts. Report costs $400–$700 and are themselves tax-deductible. The schedule can be used each year without repeat inspections unless significant renovations occur. The ATO requires substantiation of all depreciation claims — a Quantity Surveyor report under Tax Ruling TR 97/25 satisfies this requirement.",
      },
    ],
    faqs: [
      {
        q: "Can I claim depreciation if I bought an old property (pre-1985)?",
        a: "No Division 43 deduction is available if the building was constructed before 18 July 1985. However, any renovations completed after that date (by you or previous owners) can be separately claimed. If the property has been renovated, a quantity surveyor can estimate the post-1985 construction cost of the renovations for Division 43 purposes. Division 40 is also restricted for second-hand assets in properties purchased after May 2017 — only new assets added by you are depreciable.",
      },
      {
        q: "Does claiming depreciation affect my capital gain when I sell?",
        a: "Yes, indirectly. Division 43 deductions reduce your cost base for CGT purposes — every dollar of capital works deductions claimed reduces your cost base by one dollar, increasing the taxable capital gain on sale. Division 40 (plant and equipment) deductions do not reduce the property cost base, but the balancing adjustment on the depreciable assets at sale will affect the gain or loss on those assets separately. This interaction means the tax benefits of depreciation are partially clawed back on sale via a higher CGT liability.",
      },
      {
        q: "Can I claim depreciation on a property I live in for part of the year?",
        a: "Deductions must be apportioned for the period the property was actually rented out or genuinely available for rent. If the property was rented for 9 out of 12 months, you can claim 9/12 of annual depreciation. For holiday homes used privately, only the days it was listed at market rate and available to unrelated parties count toward the deduction period — the ATO has specific rules (TR 93/32) for holiday properties.",
      },
    ],
    relatedSlugs: [
      "how-does-depreciation-work-for-investment-property",
      "what-is-an-investment-property-depreciation-schedule",
      "how-to-calculate-negative-gearing-tax-benefit",
      "how-does-negative-gearing-work",
    ],
    relatedTools: [
      { label: "Negative gearing calculator", href: "/negative-gearing/calculator" },
      { label: "Property yield calculator", href: "/property-yield-calculator" },
    ],
  },

  // ── SUPER (4 new) ───────────────────────────────────────────────────────────

  {
    slug: "insurance-in-super-australia",
    category: "super",
    question: "How does insurance inside superannuation work in Australia?",
    metaTitle: "Insurance in Super: Life, TPD & Income Protection Inside Your Fund (2026)",
    metaDescription:
      "Most Australian super funds provide default life, TPD, and income protection insurance paid from your super balance. Learn costs, opt-out rights, tax treatment, and when to hold insurance inside vs outside super.",
    shortAnswer:
      "Most Australian superannuation funds automatically provide default life insurance (death cover), total and permanent disability (TPD) insurance, and income protection insurance, with premiums deducted directly from your super balance. The premiums are paid from pre-tax super money (taxed at 15%), making it cost-effective compared to holding equivalent cover outside super, but the premiums erode your retirement savings over time.",
    sections: [
      {
        heading: "Types of super insurance",
        body: "Life insurance (death cover): pays a lump sum to your beneficiaries on death. Available to most members under age 65–70. TPD insurance (Total and Permanent Disablement): pays a lump sum if you become permanently unable to work due to illness or injury. Definitions vary between funds — 'any occupation' TPD requires you cannot work in any role; 'own occupation' requires you cannot return to your specific profession (own occupation is more favourable but less common in super). Income protection: pays a monthly benefit (typically 75–85% of salary) if you are temporarily unable to work due to illness or injury, for a maximum benefit period of 2 years, 5 years, or to age 65.",
      },
      {
        heading: "Tax efficiency of insurance in super",
        body: "Premiums paid inside super come from concessional (pre-tax) contributions taxed at 15% rather than from after-tax income at your marginal rate. For someone on 37% tax, holding $2,000 per year in super insurance premiums effectively costs them $2,000 of super balance versus $2,000 of after-tax salary worth $3,175 pre-tax — a meaningful difference. However, on claims, the tax treatment differs: life insurance paid to non-tax-dependants as a lump sum via super may attract a 15% (plus Medicare Levy) tax on the taxable component of the benefit. Insurance held outside super pays claims entirely tax-free to the beneficiary.",
      },
      {
        heading: "PMIF and automatic insurance changes",
        body: "The Protecting Your Super (PYS) reforms (effective July 2019) automatically cancelled default insurance for inactive super accounts — accounts that have not received a contribution in 16 consecutive months. This was followed by the Putting Members' Interests First (PMIF) reforms, which removed default insurance for members with balances under $6,000 and for members under age 25 who had not opted in. If you have changed jobs or taken career breaks, check whether your super insurance was cancelled automatically. You can opt back in, but you may need to satisfy health underwriting.",
      },
    ],
    faqs: [
      {
        q: "Should I hold my life insurance inside or outside super?",
        a: "Inside super: tax-effective premiums, no impact on personal cash flow, but claims may be partially taxed for non-dependant beneficiaries, and the payout process takes longer (the fund trustee must release funds). Outside super: immediate tax-free payout direct to the policy owner, simpler claims process for beneficiaries, but premiums come from after-tax money. Many Australians hold base death cover inside super (for cost efficiency) and additional own-occupation TPD and income protection outside super (for better definitions and faster claims).",
      },
      {
        q: "Can I increase my default cover without a medical assessment?",
        a: "Most super funds offer limited increases to insurance cover without underwriting (no medical questions) during life events such as marriage, birth of a child, or taking out a mortgage. This is called an 'automatic acceptance limit' or 'life event increase'. Above these limits, you must complete a health statement and possibly a medical examination. These windows are time-sensitive — apply within 60–90 days of the life event.",
      },
      {
        q: "How do I claim income protection through my super fund?",
        a: "Contact your super fund directly. Most funds require you to: (1) stop working due to illness or injury, (2) wait through the waiting period (typically 30, 60, or 90 days), then (3) submit a claim form with medical evidence from your treating doctor and employer confirmation of your salary. The fund's insurer (Metlife, TAL, AIA, etc.) assesses the claim. Approved claims pay monthly benefits directly to your super account (accumulation phase) or to you personally depending on the fund's structure.",
      },
    ],
    relatedSlugs: [
      "what-is-salary-sacrifice-super",
      "what-is-concessional-contribution",
      "when-can-i-access-my-super",
      "what-is-smsf-and-is-it-worth-it",
    ],
    relatedTools: [
      { label: "Compare super funds", href: "/super" },
      { label: "Super contributions calculator", href: "/super-contributions-calculator" },
    ],
  },
  {
    slug: "binding-death-benefit-nomination-super-australia",
    category: "super",
    question: "What is a binding death benefit nomination for superannuation?",
    metaTitle: "Binding Death Benefit Nominations in Super (Australia 2026)",
    metaDescription:
      "A binding death benefit nomination directs your super trustee to pay your death benefit to specific dependants or your estate. Learn who can be nominated, lapsing rules, and how a binding nomination differs from non-binding.",
    shortAnswer:
      "A binding death benefit nomination (BDBN) is a written instruction to your super fund trustee directing them to pay your death benefit — your account balance and any life insurance — to specific nominated beneficiaries upon your death. Unlike a non-binding nomination (which the trustee can override), a valid BDBN must be followed by the trustee, provided it complies with the Superannuation Industry (Supervision) Act 1993 requirements and the fund's trust deed.",
    sections: [
      {
        heading: "Who can be nominated",
        body: "Super death benefits can only be paid to: (1) dependants — your spouse or de facto partner (including same-sex), your children (of any age), any person in an interdependency relationship with you (living together with close personal relationship), and any person who is financially dependent on you at the time of death; or (2) your legal personal representative (LPR) — your estate — from which the executor distributes under your Will. Super cannot be directed to friends, siblings, parents, or adult children who are not financially dependent on you, unless those payments go via your estate. This is a frequent source of estate planning disputes.",
      },
      {
        heading: "Lapsing vs non-lapsing BDBNs",
        body: "Most super fund BDBNs lapse after three years if not renewed — your nomination becomes void and the trustee exercises discretion over who receives the death benefit. This default can be catastrophic if you separated from a partner, had children, or divorced after the nomination was made. Some super funds (particularly SMSFs and some retail platforms) offer non-lapsing BDBNs, which remain valid until revoked or the fund's trust deed changes. Industry super funds generally offer only lapsing BDBNs. Check your fund's documentation and set a reminder to review your BDBN every two to three years.",
      },
      {
        heading: "SMSF binding nominations and trustee discretion",
        body: "In an SMSF, the trustee and member are often the same person (individual trustees) or a corporate trustee where the member is a director. A BDBN in an SMSF directs the surviving trustee(s) as to how to distribute the benefit. Without a BDBN in an SMSF, the remaining trustee(s) have full discretion — which can create family disputes. SMSFs should have BDBNs (or reversionary pension nominations) reviewed alongside the trust deed by a specialist SMSF lawyer to ensure the deed supports the desired outcome.",
      },
    ],
    faqs: [
      {
        q: "What happens to my super if I have no valid nomination?",
        a: "If there is no valid BDBN, your super fund trustee has discretion to distribute your death benefit among eligible dependants. The trustee will consider your relationships, financial dependencies, and any non-binding nomination you made. Disputes between potential beneficiaries can result in extended delays and, in some cases, litigation. Making and regularly updating a BDBN is one of the most important steps in estate planning.",
      },
      {
        q: "Can I direct my super to my estate via a BDBN?",
        a: "Yes — you can nominate your Legal Personal Representative (LPR) as a binding beneficiary. This means the death benefit is paid to your estate and distributed according to your Will. This is useful if you want to direct super to someone who is not a SIS dependant (e.g. a sibling, parent, or friend). However, estate assets are subject to probate and can be challenged under family provision laws, which may delay distribution.",
      },
      {
        q: "Does a BDBN override my Will?",
        a: "Yes. Super is held in trust and is not part of your estate by default — it does not automatically pass according to your Will. A valid BDBN overrides any direction in your Will regarding super, because super is distributed by the trustee under the SIS Act, not by the executor under succession law. This is why coordinating your super nominations with your Will and overall estate plan is critical.",
      },
    ],
    relatedSlugs: [
      "what-is-salary-sacrifice-super",
      "what-is-smsf-and-is-it-worth-it",
      "when-can-i-access-my-super",
      "insurance-in-super-australia",
    ],
    relatedTools: [
      { label: "Compare super funds", href: "/super" },
      { label: "Find a financial adviser", href: "/financial-advisers" },
    ],
  },
  {
    slug: "what-is-a-reversionary-pension-nomination-super",
    category: "super",
    question: "What is a reversionary pension nomination in superannuation?",
    metaTitle: "Reversionary Pension Nominations in Super: How They Work (Australia 2026)",
    metaDescription:
      "A reversionary pension nomination ensures your super pension continues to your nominated beneficiary after your death, bypassing trustee discretion. Learn the tax and Centrelink implications for Australian retirees.",
    shortAnswer:
      "A reversionary pension nomination is a direction embedded in an account-based pension or transition-to-retirement pension that automatically continues the pension to a nominated 'reversionary beneficiary' — typically a spouse — upon the pensioner's death, without requiring the trustee to exercise discretion or the beneficiary to re-apply. The pension continues with the same balance and investment settings, subject to transfer balance cap rules.",
    sections: [
      {
        heading: "How reversionary pensions work",
        body: "When a member establishes an account-based pension (or TTR pension), they can elect a reversionary beneficiary at commencement. If the member dies, the pension does not cease — it automatically reverts to the nominated beneficiary and continues paying regular pension payments. This is different from a death benefit lump sum, where the super balance is paid out and the pension ends. The surviving spouse continues drawing on the pension account without needing to apply, wait for trustee decisions, or experience cash flow interruption. Reversionary pensions can only be nominated at commencement of the pension, not added later (though some funds have workarounds).",
      },
      {
        heading: "Transfer balance cap implications",
        body: "The transfer balance cap (TBC) — $1.9 million for FY2026, indexed — limits how much super can be held in tax-exempt pension phase. When a reversionary pension transfers to the surviving spouse, the value of the pension counts toward the survivor's transfer balance account at the date of death. Importantly, the beneficiary has a 12-month grace period before the reversionary pension amount is counted against their TBC. This allows time to plan — if the combined pensions would exceed the beneficiary's TBC, they may commute the excess to accumulation phase within the 12 months without penalty. This 12-month window is a material planning opportunity not available with lump sum death benefits.",
      },
      {
        heading: "Reversionary pension vs BDBN: which is better?",
        body: "Reversionary pension: ensures pension continuity without interruption, provides the 12-month TBC grace period, and avoids trustee discretion. Suitable where the surviving spouse is the intended beneficiary and will want ongoing pension income. BDBN: more flexible — can direct to multiple beneficiaries or the estate; but payment is a lump sum (the pension must be commuted), which removes the tax-exempt pension phase status for the beneficiary until they re-establish their own pension. The lump sum also immediately counts against the recipient's TBC with no grace period. For married couples with substantial super balances approaching the TBC, a reversionary pension combined with careful estate planning generally provides better tax outcomes.",
      },
    ],
    faqs: [
      {
        q: "Can I nominate a child as a reversionary beneficiary?",
        a: "Yes, but with restrictions. A child can only be nominated as a reversionary beneficiary if they are under 18, or if they are aged 18–24 and financially dependent on the deceased, or if they have a permanent disability at any age. An adult child who is not financially dependent cannot continue a pension reversion — the pension must be cashed out as a lump sum within a reasonable timeframe. This is an important consideration for SMSF members with adult children.",
      },
      {
        q: "Does the reversionary beneficiary pay tax on the pension they receive?",
        a: "If the deceased member was aged 60 or over when they died, the reversionary pension payments are fully tax-free for the surviving spouse (if aged 60 or over). If the surviving spouse is under 60, the taxable component of the pension is included in their assessable income with a 15% pension tax offset. From age 60, all pension payments become tax-free regardless of when the reversion occurred.",
      },
      {
        q: "Can I change a reversionary pension nomination?",
        a: "Generally, reversionary pension nominations cannot be changed once a pension is in payment — they are an irrevocable term of the pension contract at the fund level. If you wish to change your nomination, you may need to commute the pension back to accumulation phase and recommence a new pension with the updated nomination. This has TBC implications — seek specialist SMSF or super advice before commuting a pension in progress.",
      },
    ],
    relatedSlugs: [
      "binding-death-benefit-nomination-super-australia",
      "what-is-a-transition-to-retirement-pension",
      "when-can-i-access-my-super",
      "how-much-super-should-i-have-at-my-age",
    ],
    relatedTools: [
      { label: "Super contributions calculator", href: "/super-contributions-calculator" },
      { label: "Find a financial adviser", href: "/financial-advisers" },
    ],
  },
  {
    slug: "government-super-co-contribution-australia",
    category: "super",
    question: "How does the government super co-contribution work in Australia?",
    metaTitle: "Government Super Co-Contribution: How to Claim Up to $500 (Australia 2026)",
    metaDescription:
      "If you earn below $58,445 and make after-tax super contributions, the ATO adds up to $500 to your super. Learn the income thresholds, contribution amounts, and how to claim the co-contribution automatically.",
    shortAnswer:
      "The Australian Government super co-contribution pays up to $500 directly into your super fund if you earn below $43,445 per year and make at least $1,000 in eligible personal (after-tax) contributions. The maximum $500 co-contribution phases out as your income rises above $43,445, reaching zero at $58,445. It is paid automatically by the ATO — no separate application is required; you simply lodge your tax return and make the contribution to an eligible fund.",
    sections: [
      {
        heading: "How the co-contribution is calculated",
        body: "For income at or below the lower threshold ($43,445 in FY2026): the government contributes 50 cents for every $1 of eligible personal contributions, up to a maximum of $500 (achieved by contributing at least $1,000). For income above $43,445 but below $58,445: the co-contribution reduces by 3.333 cents for every $1 of income above $43,445. Formula: co-contribution = $500 − (0.03333 × (total income − $43,445)). Example: income $50,000, personal contribution $1,000. Co-contribution = $500 − (0.03333 × $6,555) = $500 − $218 = $282. The thresholds are indexed annually to AWOTE (Average Weekly Ordinary Time Earnings) and change each financial year.",
      },
      {
        heading: "Eligibility conditions",
        body: "To be eligible in FY2026 you must: (1) make one or more eligible personal super contributions during the financial year — these are after-tax (non-concessional) contributions you make yourself (not employer SG or salary sacrifice); (2) have income for surcharge purposes plus reportable fringe benefits plus reportable employer super contributions (total income) below $58,445; (3) be under 71 years old at the end of the financial year; (4) not hold an eligible temporary resident visa; (5) lodge a tax return for the financial year; (6) have your super fund reporting contributions to the ATO. The co-contribution is not available for concessional (pre-tax) contributions such as salary sacrifice — only personal after-tax contributions qualify.",
      },
      {
        heading: "How the payment is made",
        body: "The ATO calculates your co-contribution entitlement when you lodge your tax return and the ATO's super data matching confirms eligible contributions were received by your fund. Payment is made directly to your super fund — usually within 60 days of your return being processed. You do not receive the money personally. No separate application is required; the process is automatic. If you change super funds after making contributions, ensure the contribution was received before you rolled over — the ATO pays the co-contribution to the fund that received the eligible contribution.",
      },
    ],
    faqs: [
      {
        q: "Can I make a contribution specifically to receive the co-contribution?",
        a: "Yes — this is entirely legitimate and encouraged. If your income is below $43,445, contributing $1,000 of after-tax money to super triggers a $500 co-contribution — a 50% immediate return before any investment gains. For low-to-middle-income earners, this is one of the highest guaranteed returns available in Australia.",
      },
      {
        q: "Can self-employed people claim the co-contribution?",
        a: "Yes, if your total income (business income less deductible expenses) is below the $58,445 threshold. Self-employed individuals should note that personal deductible contributions (where you claim a tax deduction) are treated as concessional contributions and do not qualify for the co-contribution. Only after-tax contributions where no deduction is claimed count as eligible personal contributions for co-contribution purposes.",
      },
      {
        q: "Does the co-contribution count toward the non-concessional cap?",
        a: "No. The government co-contribution is not counted against your non-concessional contributions cap (currently $110,000 per year). It is a government payment made directly to the fund and is not treated as a contribution made by you. Your eligible personal contributions that triggered the co-contribution do count toward the non-concessional cap.",
      },
    ],
    relatedSlugs: [
      "what-is-concessional-contribution",
      "what-are-the-super-contribution-limits",
      "what-is-salary-sacrifice-super",
      "how-does-superannuation-work",
    ],
    relatedTools: [
      { label: "Super contributions calculator", href: "/super-contributions-calculator" },
      { label: "Compare super funds", href: "/super" },
    ],
  },

  // ── RETIREMENT (2 new) ───────────────────────────────────────────────────────

  {
    slug: "age-pension-assets-test-thresholds-australia",
    category: "retirement",
    question: "What are the Age Pension assets test thresholds in Australia?",
    metaTitle: "Age Pension Assets Test Thresholds Australia (FY2026 Figures)",
    metaDescription:
      "The Age Pension assets test reduces your pension once your assets exceed the lower threshold. Learn the July 2026 thresholds for homeowners and non-homeowners, what counts as an assessable asset, and the pension reduction taper rate.",
    shortAnswer:
      "For the Age Pension assets test (from July 2025, indexed), single homeowners can hold up to $314,000 in assets before their pension reduces; couples (combined) can hold up to $470,000. The pension reduces by $3 per fortnight for every $1,000 of assets above the lower threshold. Single homeowners are cut off from the pension entirely at $686,250 in assets; couples at $1,031,000. Non-homeowners have higher thresholds.",
    sections: [
      {
        heading: "FY2026 assets test thresholds",
        body: "Thresholds are indexed to CPI in September and March. As of July 2025 (current for FY2026): Single homeowner: lower threshold $314,000; full pension below this amount, reducing above; pension cuts off at $686,250. Single non-homeowner: lower threshold $566,000; cut-off $938,250. Couple homeowners (combined): lower threshold $470,000; cut-off $1,031,000. Couple non-homeowners (combined): lower threshold $722,000; cut-off $1,283,000. These are the full-rate thresholds — a part Age Pension is payable between the lower threshold and the cut-off amount. The 'lower threshold' is also called the 'full pension asset free area'.",
      },
      {
        heading: "Taper rate: $3 per $1,000",
        body: "For every $1,000 of assessable assets above the lower threshold, the fortnightly pension is reduced by $3 ($78 per year). This is the 'taper rate', which was increased from $1.50 to $3.00 from 1 January 2017. The higher taper rate means assets above the lower threshold reduce the pension much more rapidly than before. Example: a single homeowner with $500,000 in assessable assets has $186,000 above the $314,000 lower threshold. Pension reduction = 186 × $3 = $558 per fortnight less than the maximum rate. The maximum single pension rate is approximately $1,147 per fortnight (FY2026, indexed); so $558 reduction leaves a part pension of $589 per fortnight.",
      },
      {
        heading: "What counts as an assessable asset",
        body: "Assessable assets include: financial investments (bank accounts, shares, managed funds, crypto), super in accumulation phase (for those over Age Pension age), account-based pensions, investment properties, business assets, vehicles, and personal property above $10,000. Exempt assets include: your principal place of residence (the home you live in) with no upper dollar limit — this is a significant concession, income streams from certain defined benefit pensions, pre-12 July 1994 lifetime annuities, and some funeral bonds up to $15,000. The family home exemption creates a well-known disparity between homeowners and renters in retirement wealth assessments.",
      },
    ],
    faqs: [
      {
        q: "Is superannuation counted in the assets test?",
        a: "It depends on your age. For persons below Age Pension age (currently 67): super held in accumulation phase is generally not assessed (it is not considered readily accessible). Once you reach Age Pension age, accumulation super is included in the assets test. Account-based pensions (ABPs) commenced on or after 1 January 2015 are fully assessed under both the assets test (account balance) and the income test (deemed income). Super held by a younger spouse below Age Pension age is not assessed until that spouse reaches Age Pension age.",
      },
      {
        q: "Does the assets test or income test determine my pension?",
        a: "Centrelink applies both tests — the assets test and the income test — and pays the lower resulting pension. If the income test produces a lower pension than the assets test, your pension is based on the income test result, and vice versa. Both are always calculated, and you receive whichever outcome is less favourable to you. For retirees with large super balances in ABPs, the assets test is often the binding constraint.",
      },
      {
        q: "Can I reduce my assessable assets to qualify for a higher pension?",
        a: "Strategies exist but must comply with deprivation rules. Centrelink counts assets disposed of for less than market value within five years of the gift — 'gifting'. You can gift up to $10,000 per year and $30,000 over five years without it being treated as a deprived asset. Amounts above these limits are counted as assets for five years regardless of the actual gift. Legitimate strategies include spending on home renovations (the PPOR is exempt), prepaying funeral expenses (up to $15,000 per person via a funeral bond), contributing to super for a spouse below Age Pension age, or purchasing a retirement village entry contribution (assessed differently). Seek specialist financial advice before implementing any pension optimisation strategy.",
      },
    ],
    relatedSlugs: [
      "what-is-the-age-pension-assets-test",
      "how-much-super-should-i-have-at-my-age",
      "what-is-a-transition-to-retirement-pension",
      "when-can-i-access-my-super",
    ],
    relatedTools: [
      { label: "Retirement calculator", href: "/retirement-calculator" },
      { label: "Find a financial adviser", href: "/financial-advisers" },
    ],
  },
  {
    slug: "how-do-transition-to-retirement-income-streams-work",
    category: "retirement",
    question: "How do transition to retirement income streams work in Australia?",
    metaTitle: "Transition to Retirement (TTR) Income Streams: Rules & Tax Benefits (2026)",
    metaDescription:
      "A TTR income stream lets you draw 4–10% of your super account annually once you reach preservation age, while still working. Learn the tax benefits after 60, the salary sacrifice combination strategy, and how TTR compares to standard account-based pensions.",
    shortAnswer:
      "A transition to retirement (TTR) income stream — also called a TTR pension — is a super pension you can draw while still working, available once you reach preservation age (60 for those born after 30 June 1964). Annual drawdowns must be between 4% and 10% of your account balance. Payments are tax-free if you are aged 60 or over, making a TTR particularly powerful when combined with salary sacrifice to reduce tax while smoothly transitioning to reduced working hours.",
    sections: [
      {
        heading: "Core mechanics of a TTR income stream",
        body: "A TTR income stream is commenced by rolling part (or all) of your super accumulation balance into a TTR account-based pension. The account continues to be invested (the fund earns returns), and you draw regular pension payments. Minimum drawdown: 4% of account balance per year (reduced to 2% in COVID years, now back to 4%). Maximum drawdown: 10% per year — you cannot access more until you retire or reach age 65. No lump sum withdrawals are permitted from a TTR (unlike a standard retirement pension). The TTR is tax-exempt as a pension payment from age 60.",
      },
      {
        heading: "Tax treatment: before and after age 60",
        body: "From age 60: all TTR pension payments from a taxed super fund are completely tax-free — they are not included in your assessable income at all. This is a major benefit: instead of earning $90,000 in salary (taxed at 37% marginal rate), you might earn $70,000 in salary + $20,000 tax-free from a TTR pension, paying less total tax while maintaining the same take-home income. From preservation age but under 60: the taxable component of pension payments is taxed at your marginal rate minus a 15% pension tax offset. Most people implementing TTR strategies wait until age 60 to maximise the tax-free benefit.",
      },
      {
        heading: "TTR tax on fund earnings (post-2017 rules)",
        body: "Before 1 July 2017, investment earnings in an SMSF attributed to a TTR account were taxed at 0% (the same rate as retirement pension assets). The 2016 Budget removed this concession — since 1 July 2017, earnings in the TTR accumulation phase are taxed at 15% (same as standard accumulation). This change reduced the financial benefit of TTR strategies for SMSF members who were using TTR to shelter fund earnings rather than for genuine income purposes. The primary benefit of TTR remains the tax-free pension payment for over-60s, not the fund-level earnings rate.",
      },
    ],
    faqs: [
      {
        q: "Can I still contribute to super while drawing a TTR income stream?",
        a: "Yes. Drawing a TTR pension does not prevent you from making super contributions — concessional or non-concessional. In fact, the classic TTR strategy involves simultaneously drawing a tax-free TTR pension and salary sacrificing an equivalent amount into super. Net take-home pay remains similar, but you have shifted income from your marginal rate into super's 15% tax environment. The accumulation account receives salary sacrifice contributions while the TTR account pays pension — they are separate sub-accounts.",
      },
      {
        q: "What happens to my TTR account when I retire?",
        a: "When you permanently retire (cease work and notify the trustee you do not intend to resume full-time employment), your TTR converts to a standard retirement account-based pension. The 10% drawdown cap is removed, lump sum withdrawals become available, and for SMSFs, the earnings on pension-phase assets drop to 0% tax. The transition from TTR to full retirement pension is a significant event — coordinate timing with your financial adviser to manage the transfer balance cap.",
      },
      {
        q: "How does a TTR affect the Age Pension?",
        a: "A TTR income stream is assessed under Centrelink means tests. The account balance is counted in the assets test (for those at or above Age Pension age). TTR payments are counted as income under the income test and the deeming rules do not apply while the account balance is above $56,400 (the deeming threshold). For people who are simultaneously approaching Age Pension age and using a TTR strategy, the interaction of super assets and Centrelink assessments requires careful modelling.",
      },
    ],
    relatedSlugs: [
      "what-is-a-transition-to-retirement-pension",
      "what-is-the-super-preservation-age",
      "when-can-i-access-my-super",
      "age-pension-assets-test-thresholds-australia",
    ],
    relatedTools: [
      { label: "Retirement calculator", href: "/retirement-calculator" },
      { label: "Super contributions calculator", href: "/super-contributions-calculator" },
    ],
  },
  {
    slug: "how-to-buy-investment-property-with-smsf-australia",
    category: "property",
    question: "Can I buy an investment property through my SMSF in Australia?",
    metaTitle: "Buying Investment Property Through an SMSF: Rules & Risks (Australia 2026)",
    metaDescription:
      "SMSFs can purchase investment property but must comply with strict SIS Act rules: no personal use, arm's length terms, and limited recourse borrowing if using a loan. Learn the rules, costs, and ATO compliance requirements.",
    shortAnswer:
      "An SMSF can purchase investment property — including residential, commercial, or industrial real estate — provided the property is acquired solely for retirement purposes, meets the sole purpose test, is not purchased from or leased to a related party (for residential property), and is maintained at arm's length terms. If the SMSF needs to borrow to buy the property, a Limited Recourse Borrowing Arrangement (LRBA) is required, which significantly increases complexity and cost.",
    sections: [
      {
        heading: "The sole purpose test and residential property",
        body: "Under section 62 of the Superannuation Industry (Supervision) Act 1993, an SMSF must be maintained solely for the purpose of providing retirement benefits to members. Purchasing an investment property is permissible under the sole purpose test — but the property cannot be used personally by any fund member or related party, cannot be purchased from a related party (for residential property), and must be rented at market rates to unrelated tenants. A member cannot live in the property, holiday there, or store personal possessions there, even temporarily. Breaching the sole purpose test can result in the SMSF being made non-complying — a 45% tax on the entire fund balance.",
      },
      {
        heading: "Commercial property: different rules",
        body: "Commercial and business real property (office space, warehouses, retail premises) has more flexible rules for SMSFs. An SMSF can purchase business premises and lease them back to a related party (e.g. a member's business) — provided the lease is at market rent and on arm's length terms. This is a significant strategy for business owners: the SMSF buys the property, the business pays commercial rent to the SMSF (building equity in the fund), and on retirement, the member can draw down the property value as part of their retirement benefit. The property must be properly valued by an independent valuer at least every 3 years.",
      },
      {
        heading: "Limited Recourse Borrowing Arrangements (LRBAs)",
        body: "If the SMSF does not have sufficient cash to purchase the property outright, it can borrow under a Limited Recourse Borrowing Arrangement. An LRBA requires the property to be held in a bare trust (holding trust) separate from the main SMSF trust, with the SMSF as the beneficial owner. If the SMSF defaults on the loan, the lender can only claim the specific property held in the bare trust — other SMSF assets are protected ('limited recourse'). LRBA loans typically require a 20–30% deposit, charge commercial interest rates (often 7–8%+ in 2026), and have strict documentation requirements. Legal setup costs (bare trust deed, LRBA documentation) typically add $3,000–$6,000 to acquisition costs.",
      },
    ],
    faqs: [
      {
        q: "Can I live in a property owned by my SMSF in retirement?",
        a: "No. Even in retirement (pension phase), you cannot live in a residential property owned by your SMSF. The sole purpose test prohibits personal use of SMSF assets regardless of your age or retirement status. To access the property personally, the SMSF would need to sell the property and distribute the proceeds, or transfer it to you in-specie as part of your retirement benefit (triggering CGT and potentially stamp duty).",
      },
      {
        q: "What are the costs of buying property through an SMSF?",
        a: "Costs include: SMSF set-up ($1,500–$3,000 if new fund), property acquisition costs (stamp duty, conveyancing, inspections — same as any buyer), if borrowing: bare trust establishment ($1,500–$3,000), LRBA documentation ($1,500–$2,500), ongoing SMSF audit and administration ($1,500–$4,000 per year), property management fees (7–10% of rent), and property running costs. The total annual compliance cost of an SMSF holding one property is typically $3,000–$7,000, which must be covered by rental income or member contributions.",
      },
      {
        q: "Can two members pool their super to buy a property together in an SMSF?",
        a: "Yes. An SMSF can have up to six members (six-member SMSFs from July 2021). Multiple members can pool their super balances to purchase property that would be too expensive for a single member. Each member's proportion of the fund's assets is tracked through their account balance — returns and contributions are allocated proportionally. The property is owned by the SMSF as trustee, not by individual members.",
      },
    ],
    relatedSlugs: [
      "what-is-smsf-and-is-it-worth-it",
      "how-does-negative-gearing-work",
      "what-is-an-investment-property-depreciation-schedule",
      "how-to-buy-property-in-australia",
    ],
    relatedTools: [
      { label: "SMSF calculator", href: "/smsf-calculator" },
      { label: "Property yield calculator", href: "/property-yield-calculator" },
    ],
  },

  // ── BUDGETING (5 new) ────────────────────────────────────────────────────────

  {
    slug: "how-much-emergency-fund-australia",
    category: "budgeting",
    question: "How much should I have in an emergency fund in Australia?",
    metaTitle: "How Much Should You Have in an Emergency Fund in Australia? (2026 Guide)",
    metaDescription:
      "Financial planners recommend 3–6 months of essential living expenses in a liquid, high-interest savings account. Learn how to calculate your target, where to keep it, and how Australian cost of living affects the number.",
    shortAnswer:
      "Australian financial planners recommend holding 3–6 months of essential living expenses in a liquid, easily accessible account such as a high-interest savings account (HISA). For a single person spending $4,000 per month on essentials, that means $12,000–$24,000. Households with variable income, children, or a single income should target the higher end.",
    sections: [
      {
        heading: "Calculating your target emergency fund",
        body: "Start by listing essential monthly expenses only — rent or mortgage repayments, groceries, utilities, transport, insurance premiums, and minimum debt repayments. Exclude discretionary spending (dining out, subscriptions, holidays). Multiply by 3 for a minimum buffer and by 6 for a full buffer. For a Sydney renter spending $2,800/month on rent, $600 on groceries, $300 on utilities and transport, and $400 on insurance, the essentials total is $4,100. A 3-month fund = $12,300; a 6-month fund = $24,600. The ABS Consumer Price Index shows average Australian household spending was $3,453 per week in 2023-24, but this includes discretionary items — your essentials figure will be lower.",
      },
      {
        heading: "Where to keep your emergency fund",
        body: "An emergency fund must be liquid — accessible within one business day without penalty. High-interest savings accounts (HISAs) from institutions like ING, Macquarie, UBank, and ME Bank pay 4–5%+ p.a. (as of 2026) on amounts up to $250,000 (the Financial Claims Scheme guarantee limit). Avoid locking emergency savings in term deposits (early break fees apply), managed funds (market timing risk at withdrawal), or super (not accessible until preservation age). Some Australians keep 1 month of expenses in a transaction account for immediate access and the remaining 2–5 months in a HISA for better interest.",
      },
      {
        heading: "When 6 months is not enough",
        body: "Standard 3–6 month guidance suits steady employees with two incomes, stable housing, and good health. Increase your target if you are: self-employed or a contractor (income can stop without notice); a sole income earner supporting dependants; in an industry with seasonal employment (construction, hospitality, tourism); carrying significant non-mortgage debt; or approaching a major planned expense (surgery, car replacement). Some financial counsellors recommend 9–12 months for business owners and people with health conditions. Australian median household savings rates have trended around 3–5% of disposable income in recent years, meaning building a 6-month fund from a standing start takes 5–8 years at that rate — automate savings contributions to compress this.",
      },
    ],
    faqs: [
      {
        q: "Should my emergency fund be separate from my home loan offset account?",
        a: "Ideally yes, especially for investment property owners. Mixing your emergency fund with an investment loan offset can create tax complications if you withdraw money for personal use. For owner-occupiers, the offset approach is tax-equivalent to a HISA — the interest saved equals the after-tax return on a deposit — but the psychological benefit of a separate, clearly labelled emergency account often helps people resist spending it.",
      },
      {
        q: "Can I invest my emergency fund in ETFs or shares?",
        a: "No. Emergency funds must be in cash or near-cash because the entire purpose is certainty of access when you need it most. A sharemarket crash often coincides with job losses and economic downturns — exactly when you would need to draw on an emergency fund. Selling shares at a 20–30% loss to cover a three-month crisis destroys the fund's purpose. Keep emergency savings in cash.",
      },
      {
        q: "How does the Australian welfare safety net affect emergency fund sizing?",
        a: "Australia has a stronger safety net than many countries — JobSeeker payments, Medicare, and the rental assistance component of welfare reduce the magnitude of emergencies. However, JobSeeker in 2026 is approximately $762 per fortnight for a single person, far below most people's essential living costs. The safety net provides a floor but not a replacement income — an emergency fund bridges the gap between welfare payments and your actual essential expenses.",
      },
    ],
    relatedSlugs: [
      "how-to-avoid-living-paycheque-to-paycheque-australia",
      "what-is-the-50-30-20-budgeting-rule-australia",
      "best-high-interest-savings-accounts-australia",
    ],
    relatedTools: [
      { label: "Savings calculator", href: "/savings-calculator" },
      { label: "Compare savings accounts", href: "/savings-accounts" },
    ],
  },
  {
    slug: "what-is-the-50-30-20-budgeting-rule-australia",
    category: "budgeting",
    question: "What is the 50/30/20 budgeting rule and does it work in Australia?",
    metaTitle: "The 50/30/20 Budgeting Rule in Australia: Does It Work? (2026 Guide)",
    metaDescription:
      "The 50/30/20 rule allocates 50% of after-tax income to needs, 30% to wants, and 20% to savings. Learn how to apply it to Australian cost of living — and when to adjust the percentages for Sydney or Melbourne budgets.",
    shortAnswer:
      "The 50/30/20 rule allocates 50% of your after-tax income to essential needs (rent, groceries, utilities, transport), 30% to wants (dining, entertainment, subscriptions), and 20% to savings and debt repayment. In high-cost Australian cities like Sydney and Melbourne, where rent can consume 35–45% of take-home pay, many budgeters must adjust to a 60/20/20 or 65/15/20 split and prioritise saving the full 20%.",
    sections: [
      {
        heading: "How the 50/30/20 rule works",
        body: "Created by US Senator Elizabeth Warren in 'All Your Worth' (2005), the rule uses after-tax (take-home) income as the base. Step 1: calculate monthly take-home pay after income tax and Medicare Levy. Step 2: allocate up to 50% to needs — rent or mortgage, groceries, essential utilities (electricity, water, internet), public transport or minimum car costs, health insurance, and minimum loan repayments. Step 3: allocate up to 30% to wants — restaurants, Netflix, gym, clothing beyond basics, holidays. Step 4: direct the remaining 20% to savings, super top-ups, and debt reduction above minimums. The rule's appeal is its simplicity — one calculation, three buckets.",
      },
      {
        heading: "Adjusting for Australian cost of living",
        body: "The 50% 'needs' allocation is under pressure in major Australian cities. In Sydney, median rent for a 1-bedroom apartment is approximately $2,800/month (Domain rental data, 2026). A person earning $80,000 gross (approximately $5,900/month after tax at 2026 rates) would spend 47% of take-home pay on rent alone, leaving almost nothing for other essentials within the 50% cap. In Melbourne, the figure is slightly lower at $2,300/month but still high. Practical adjustments: (1) If needs genuinely exceed 50%, cap wants at 20% and protect the 20% savings. (2) Consider reducing needs — house-sharing, further from the CBD, a smaller car. (3) Increase income — the fastest way to make the maths work is a higher salary or side income.",
      },
      {
        heading: "Integrating super with the 20% savings bucket",
        body: "Australia's compulsory superannuation (11.5% SG in FY2026) is not part of your take-home pay, so it is not counted in the 50/30/20 calculation. Some financial planners count employer SG contributions toward the 20% savings target — so your voluntary savings goal above SG might be closer to 8–10% of gross income. For a person on $80,000, employer SG ($9,200/year) plus $5,000/year of voluntary savings or salary sacrifice equals roughly 18% of gross income — close to the intent of the 20% rule. Super is genuinely savings — long-dated and tax-advantaged.",
      },
    ],
    faqs: [
      {
        q: "Is 20% savings realistic for a first-time buyer saving for a house deposit in Australia?",
        a: "For most Australians saving for a first home, 20% of take-home pay is likely insufficient to accumulate a deposit at the pace required in rising markets. To save a $120,000 deposit (20% on a $600,000 home) within 5 years, you need to save $24,000 per year — approximately 41% of the take-home income of someone earning $70,000. This requires significant sacrifice in the 'wants' category and may need a higher income, a partner's income, or parental assistance (the Bank of Mum and Dad funded approximately 60% of first home purchases in 2023–24 according to APRA data).",
      },
      {
        q: "What is a zero-based budget vs the 50/30/20 rule?",
        a: "A zero-based budget assigns every dollar of income a specific purpose — every category gets a pre-set allocation — so income minus all allocations equals zero. It requires more tracking effort than 50/30/20 but can be more effective for people with inconsistent spending patterns or those who overspend in the 'wants' bucket. Many budgeting apps like YNAB (You Need a Budget) use zero-based budgeting. The 50/30/20 rule is better for those who find detailed budgeting unsustainable.",
      },
      {
        q: "Should I include my mortgage repayments in needs or savings?",
        a: "The principal component of a mortgage repayment is a form of forced saving (building equity), so some budgeters treat it as savings rather than a need. The interest component is a pure cost. For simplicity, most frameworks include the entire mortgage repayment in 'needs', since it is a non-negotiable commitment. Once the 50% needs and 20% savings allocations are made, the priority order within savings is: (1) emergency fund, (2) high-interest debt repayment, (3) super top-ups, (4) investment or offset contributions.",
      },
    ],
    relatedSlugs: [
      "how-much-emergency-fund-australia",
      "how-to-avoid-living-paycheque-to-paycheque-australia",
      "what-is-salary-packaging-australia",
    ],
    relatedTools: [
      { label: "Savings calculator", href: "/savings-calculator" },
    ],
  },
  {
    slug: "how-to-build-credit-score-australia",
    category: "budgeting",
    question: "How do you build a good credit score in Australia?",
    metaTitle: "How to Build Your Credit Score in Australia (2026 Guide)",
    metaDescription:
      "Australia uses comprehensive credit reporting from three bureaus: Equifax, Illion, and Experian. Learn how your credit score is calculated, what hurts it, and the fastest ways to improve it before applying for a mortgage or car loan.",
    shortAnswer:
      "In Australia, credit scores are calculated by three bureaus — Equifax, Illion, and Experian — based on your credit report including payment history, credit applications, outstanding debts, and defaults. To build a good score: pay all bills on time, limit credit applications, keep credit card balances low relative to limits, and maintain a long credit history. Australia does not use the US FICO system — scores vary by bureau but Equifax scores range from 0–1,200.",
    sections: [
      {
        heading: "How Australian credit scores work",
        body: "Australia operates a comprehensive credit reporting (CCR) system since 2018 that includes both negative information (defaults, late payments, bankruptcies) and positive information (on-time payments, credit limits, account types). Three main bureaus operate: Equifax (scores 0–1,200), Illion (scores 0–1,000), and Experian (scores 0–1,000). Lenders pull reports from one or more bureaus when assessing loan applications. There is no single universal score like the US FICO — each bureau calculates independently. You are entitled to one free credit report per year from each bureau (under the Privacy Act), and free real-time access to your Equifax score via services like Credit Savvy, ClearScore, or directly through credit card providers.",
      },
      {
        heading: "What affects your credit score",
        body: "Positive factors: consistent on-time repayments (the single largest factor under CCR), long credit history, low credit card utilisation (ideally below 30% of the credit limit), and a mix of credit types (card, personal loan, mortgage). Negative factors: payment defaults (missed payments of 60+ days reported by lenders), credit enquiries (each application creates a 'hard enquiry' visible to future lenders for 5 years), accounts in arrears, debt agreements (Part IX), and bankruptcy (Part X). Under comprehensive credit reporting, lenders can now see 24 months of repayment history on all credit facilities — a good run of 12–24 months of on-time payments can substantially repair a damaged score.",
      },
      {
        heading: "Practical steps to build and improve your score",
        body: "For someone starting from scratch or repairing a damaged score: (1) Get a credit card and pay it in full each month — this is the fastest way to build positive payment history. A low-limit secured credit card is available even with no prior credit history. (2) Set up direct debits for all bills to avoid accidental late payments. (3) Do not apply for multiple credit products in a short period — multiple hard enquiries in a short window signal financial stress. (4) Check your credit reports annually for errors — dispute inaccurate defaults or listings via the bureau's online process. (5) Pay any overdue accounts — a settled default is better than an active one, though the listing remains for 5–7 years. (6) Keep older credit accounts open even if unused — length of history matters.",
      },
    ],
    faqs: [
      {
        q: "Does buy now pay later (BNPL) affect my credit score in Australia?",
        a: "From 2025, the Australian government's reforms to BNPL regulation require many BNPL providers to conduct credit checks and report to credit bureaus. Previously, most BNPL products (Afterpay, Zip, Klarna) did not appear on credit reports. Under the new framework, BNPL defaults and repayment history may increasingly appear on credit files. Missed BNPL payments could negatively affect your score. Check your specific BNPL provider's reporting obligations.",
      },
      {
        q: "How long do negative listings stay on my credit file in Australia?",
        a: "The timeframes under the Privacy Act are: payment defaults — 5 years from the date of listing; serious credit infringements (e.g. fraud) — 7 years; debt agreements (Part IX) — 5 years from the agreement date or 2 years after the agreement is completed, whichever is later; bankruptcy (Part X) — 5 years from the date of bankruptcy or 2 years after discharge, whichever is later. Hard credit enquiries remain for 5 years but are weighted less over time.",
      },
      {
        q: "Does a credit score affect mortgage approval in Australia?",
        a: "Yes, though Australian lenders weigh serviceability (your ability to repay based on income and expenses) more heavily than the credit score itself in most cases. A low credit score can result in higher interest rates, reduced borrowing capacity, or outright decline. Lenders such as the major banks typically require a minimum Equifax score of around 600–650 for prime mortgage approval. Non-conforming lenders will lend to lower scores at higher rates. Improving your score before applying can meaningfully reduce your interest rate offer.",
      },
    ],
    relatedSlugs: [
      "what-is-the-50-30-20-budgeting-rule-australia",
      "how-much-emergency-fund-australia",
      "how-to-buy-property-in-australia",
    ],
    relatedTools: [
      { label: "Mortgage calculator", href: "/mortgage-calculator" },
      { label: "Debt repayment calculator", href: "/debt-calculator" },
    ],
  },
  {
    slug: "what-is-salary-packaging-australia",
    category: "budgeting",
    question: "What is salary packaging and what can Australians salary sacrifice?",
    metaTitle: "Salary Packaging in Australia: What You Can Salary Sacrifice (2026 Guide)",
    metaDescription:
      "Salary packaging lets you pay for certain expenses from pre-tax income, reducing your taxable income. Learn which benefits attract FBT exemptions, the $9,010 FBT threshold, and which employers offer the best salary packaging.",
    shortAnswer:
      "Salary packaging (salary sacrifice) lets you pay for approved benefits from your pre-tax salary, reducing your taxable income. Common packages include superannuation (the most tax-efficient option), novated car leases, laptops, childcare, and — for charity and hospital employees — living expenses up to an FBT-exempt threshold of $9,010 per year ($15,900 for hospital/public benevolent institutions). The tax saving depends on your marginal rate.",
    sections: [
      {
        heading: "How salary packaging reduces tax",
        body: "When you salary sacrifice, the packaged amount is paid from your gross salary before income tax is withheld. This reduces your taxable income. For example, a person earning $95,000 who salary sacrifices $10,000 into super has taxable income of $85,000, reducing their marginal tax rate exposure. The $10,000 enters super at 15% contributions tax instead of being taxed at their marginal rate of 32.5% (plus 2% Medicare Levy) — a saving of $1,850. Most Australian employers offer salary sacrifice into super. Other packaged benefits may attract Fringe Benefits Tax (FBT) charged to the employer — which the employer passes back to you, partially offsetting the benefit.",
      },
      {
        heading: "Benefits exempt from FBT",
        body: "Not all salary-packaged benefits attract FBT. Fully FBT-exempt benefits include: (1) Super contributions — no FBT, only 15% contributions tax. (2) Laptops and portable electronic devices — one per FBT year per category (work-related). (3) Protective clothing and tools of trade (work-related). (4) In-house expenses (gym, childcare at workplace) in some cases. Concessionally FBT-treated benefits include: novated car leases (the FBT value is calculated on a statutory formula, not actual use). Charity and public benevolent institution (PBI) employees — including most hospital workers, ambulance workers, and not-for-profit employees — can package up to $15,900 in general living expenses ($9,010 for other public benefit organisations) before FBT applies — this is one of the most valuable salary packaging benefits available in Australia.",
      },
      {
        heading: "Common salary packaging items and their limits",
        body: "Superannuation: up to the concessional contributions cap ($30,000 in FY2026, including employer SG). Novated car lease: covers lease payments, fuel, insurance, registration, and maintenance for a car under a three-way arrangement with employer and finance company. Electric vehicles purchased after 1 July 2022 are entirely FBT-exempt under the Electric Car Discount legislation — making EV novated leases extremely tax-effective. Childcare through employer-operated centres: FBT-exempt for on-site care. Portable electronic devices: one laptop, one phone per FBT year. Remote area benefits (housing, utilities) for employees in approved remote areas attract concessional FBT treatment. Meal entertainment: limited to $2,650 per FBT year for PBI/hospital employees under the meal entertainment cap.",
      },
    ],
    faqs: [
      {
        q: "Does salary packaging affect my Centrelink entitlements?",
        a: "Centrelink uses 'adjusted fringe benefits' in income assessments. If you package living expenses (a reportable fringe benefit), Centrelink adds the grossed-up value of those benefits to your income for means-testing purposes. This can reduce Family Tax Benefit, childcare subsidies, and other income-tested payments. The tax saving from packaging may be partly offset by reduced Centrelink entitlements — model your specific situation before packaging.",
      },
      {
        q: "Can I salary sacrifice if I am a contractor or casual employee?",
        a: "Salary sacrifice is only available if your employer offers it — casual employees and contractors working through their own entity cannot salary sacrifice, as there is no employer-employee relationship. Some labour-hire arrangements allow salary sacrifice if structured correctly. If you are a contractor working through a company, paying yourself a salary and then salary sacrificing super is possible but requires proper payroll setup.",
      },
      {
        q: "What is a novated lease and how does it work?",
        a: "A novated lease is a three-way agreement between you, your employer, and a finance company. Your employer takes on the lease obligation and deducts lease payments from your pre-tax salary. You drive the car; lease, running costs, registration, and insurance are all packaged. At lease end (typically 3 years) you can refinance, hand back, or buy out the residual. FBT applies on the personal-use component — but for EVs there is currently no FBT, making the saving very significant (effectively the entire lease is pre-tax).",
      },
    ],
    relatedSlugs: [
      "what-is-the-50-30-20-budgeting-rule-australia",
      "how-does-salary-sacrifice-super-work",
      "how-to-avoid-living-paycheque-to-paycheque-australia",
    ],
    relatedTools: [
      { label: "Super contributions calculator", href: "/super-contributions-calculator" },
    ],
  },
  {
    slug: "how-to-avoid-living-paycheque-to-paycheque-australia",
    category: "budgeting",
    question: "How do you stop living paycheque to paycheque in Australia?",
    metaTitle: "How to Stop Living Paycheque to Paycheque in Australia (2026 Guide)",
    metaDescription:
      "About 40% of Australians report running out of money before their next pay. Learn automated savings strategies, the envelope method adapted for Australian cost of living, and practical steps to build financial buffers.",
    shortAnswer:
      "The most effective way to stop living paycheque to paycheque is to automate your savings before you spend — set up a direct debit to a separate savings account on payday, even if it is only $50. Pair this with a clear picture of your essential expenses, eliminate or reduce discretionary spending that is not delivering value, and work toward a $2,000–$3,000 starter emergency buffer as your first milestone.",
    sections: [
      {
        heading: "Why automation is more effective than willpower",
        body: "Behavioural finance research consistently shows that automated savings outperform manual savings because they remove the decision to save from willpower to system. Set up two automatic transfers on the day your salary arrives: one to a high-interest savings account (your emergency fund or savings goal) and one to your everyday account with only the money you need for bills and living. If the savings account is with a different institution and has no linked card, it becomes harder to access on impulse. 'Pay yourself first' — automating savings before discretionary spending — is the foundation of every successful personal financial system.",
      },
      {
        heading: "Practical budgeting for Australian cost benchmarks",
        body: "Use Australian cost benchmarks to calibrate your budget. As a rough guide for a single Sydney renter on median wage (~$90,000 gross, ~$6,500/month take-home in 2026): rent at median 1-bed ($2,800), groceries ($400), transport ($200), utilities ($150), phone/internet ($80), health insurance ($150) = $3,780 essentials per month (58% of take-home). For a couple both working and splitting rent: individual essential spending could be $2,500/month, leaving meaningful savings capacity. If you are earning under $60,000 gross in Sydney, the maths genuinely do not work on median rents — increasing income (second job, upskilling, negotiating salary) is as important as cutting costs.",
      },
      {
        heading: "The envelope method adapted for Australia",
        body: "The envelope method allocates cash for each spending category into a physical or digital envelope — once an envelope is empty, spending stops. In Australia's near-cashless economy, digital envelope apps work better than physical ones. Apps like YNAB (You Need a Budget), Frollo, or the budgeting features of Up Bank and ING enable digital envelope budgeting linked to real accounts. Practical categories for Australians: rent/mortgage, groceries, transport, utilities, eating out, entertainment, clothing, personal care, and miscellaneous. Set a realistic limit for each, fund the envelopes on payday, and track in real time. The discipline of seeing an envelope depleting makes overspending viscerally uncomfortable.",
      },
    ],
    faqs: [
      {
        q: "What should my first savings goal be if I have zero savings right now?",
        a: "A $2,000 starter emergency fund. This covers most common financial emergencies — a car repair, dental bill, or one month of unexpected reduced income. Before this, a single unexpected expense pushes you into debt. Build $2,000 first, then work toward one month of expenses, then three months. Do not try to invest or top up super until you have the starter emergency fund — the guaranteed return of avoiding a high-interest credit card debt exceeds almost all investment returns.",
      },
      {
        q: "Should I pay off debt or save first?",
        a: "A small cash buffer ($1,000–$2,000) before aggressively paying down debt because without any cash reserve, every small emergency becomes more debt. Once the buffer is in place, focus on debt in order of interest rate — highest rate first (the avalanche method). Credit cards in Australia commonly charge 19–22% interest — paying off a $5,000 credit card balance is equivalent to a guaranteed 20% investment return. After high-interest consumer debt is cleared, resume building the full 3–6 month emergency fund.",
      },
      {
        q: "How does the HECS-HELP debt repayment threshold affect cash flow?",
        a: "HECS-HELP repayments are mandatory once your income exceeds the repayment threshold ($54,435 in 2026-27). Repayments are 1–10% of income depending on the bracket and are deducted through PAYG withholding — you may not notice them until your tax return. People who recently crossed the threshold may find their effective take-home pay lower than expected. Factor HECS repayments into your take-home pay calculation (subtract the repayment percentage before budgeting).",
      },
    ],
    relatedSlugs: [
      "how-much-emergency-fund-australia",
      "what-is-the-50-30-20-budgeting-rule-australia",
      "what-is-salary-packaging-australia",
    ],
    relatedTools: [
      { label: "Savings calculator", href: "/savings-calculator" },
      { label: "Debt repayment calculator", href: "/debt-calculator" },
    ],
  },

  // ── BUSINESS (4 new) ─────────────────────────────────────────────────────────

  {
    slug: "sole-trader-vs-company-australia",
    category: "business",
    question: "Sole trader vs company in Australia: which structure should I choose?",
    metaTitle: "Sole Trader vs Company Australia: Tax, Liability & Cost Comparison (2026)",
    metaDescription:
      "Sole traders pay tax at personal marginal rates; companies pay 25% or 30%. Learn the key differences in liability protection, admin cost, and tax treatment to choose the right structure for your Australian business.",
    shortAnswer:
      "Sole traders pay income tax at personal marginal rates (up to 47% including Medicare Levy), have unlimited personal liability, and cost almost nothing to set up. A company pays 25% tax (base rate entities with turnover under $50M) or 30% (others), provides limited liability protecting personal assets, but costs $576 to register and $310/year in ASIC fees plus compliance costs. Most businesses earning under $80,000–$100,000 profit start as sole traders; those above $150,000+ typically benefit from company structure.",
    sections: [
      {
        heading: "Tax comparison: sole trader vs company",
        body: "A sole trader's business profit is added directly to their personal tax return and taxed at marginal rates. At $150,000 net profit, the marginal rate on the last dollar is 37% (FY2026) — effective tax rate approximately 32%. A company paying 25% on the same $150,000 profit saves $10,500 in tax compared to the sole trader's effective rate. However, the company tax saving is only realised if profit is retained in the company — as soon as you pay a dividend to yourself, the shareholder pays income tax on the dividend (with franking credits offsetting company tax already paid). The benefit of a company is timing: you defer personal tax on retained earnings, which can compound in the business.",
      },
      {
        heading: "Liability and asset protection",
        body: "A sole trader has unlimited personal liability — if your business is sued or cannot pay debts, your personal assets (home, car, savings) are exposed. A company is a separate legal entity: shareholders' liability is limited to their paid-up share capital. This is significant for businesses with physical risks (trades, health services, events), employees, or significant contracts. In practice, banks often require personal guarantees from company directors on business loans, limiting the protection for debt financing. Professional indemnity and public liability insurance are essential regardless of structure. The limited liability benefit of a company is most relevant for trade creditors and negligence claims.",
      },
      {
        heading: "Admin cost and complexity",
        body: "Sole trader: register for an ABN (free via ABR), optionally register a business name ($44/year on ASIC), register for GST if turnover exceeds $75,000. Annual tax return via Schedule E (business income), no separate entity tax return. Estimated annual accounting cost: $500–$2,000. Company: register with ASIC ($576 initial registration fee, $310 annual review fee), requires a company constitution, maintain ASIC registers, file a separate company tax return, hold annual general meetings (or pass resolutions). Estimated annual accounting cost: $3,000–$8,000 for a small company. A discretionary (family) trust structure is a third option that combines income-splitting flexibility with simpler annual compliance than a company but is not a separate tax-paying entity at the company rate.",
      },
    ],
    faqs: [
      {
        q: "Can I switch from sole trader to company later?",
        a: "Yes. The ATO provides a small business restructure rollover (Subdivision 328-G of ITAA 1997) that allows eligible small businesses with turnover under $10M to transfer assets to a company without triggering CGT or stamp duty (in most states). Legal requirements apply including genuine business restructure intent. The rollover preserves the cost base of transferred assets. Clients should seek advice from a tax agent before restructuring to confirm eligibility.",
      },
      {
        q: "What is a discretionary trust and is it better than a company?",
        a: "A discretionary (family) trust is a structure where a trustee distributes income to beneficiaries at their discretion each year. Income is taxed in the hands of beneficiaries at their marginal rates — allowing income splitting (distributing to lower-income family members). Trusts do not pay tax at a company rate — all income is distributed. They offer moderate asset protection (trust assets are generally separate from the trustee's personal assets). Setup costs $2,000–$5,000. Trusts are popular for family businesses because of income splitting flexibility; companies are preferred when profit retention or capital raising is the goal.",
      },
      {
        q: "Do sole traders get access to the small business tax offset?",
        a: "Yes. Sole traders who are small business entities (aggregated turnover under $10M) are eligible for the small business income tax offset of 16% on the tax payable on business income, capped at $1,000 per year. This partially compensates for the higher marginal rate that sole traders pay compared to the 25% company rate.",
      },
    ],
    relatedSlugs: [
      "how-does-the-small-business-cgt-concession-work-australia",
      "what-is-division-7a-australia",
      "how-to-register-for-gst-australia",
    ],
    relatedTools: [
      { label: "Find a financial adviser", href: "/financial-advisers" },
    ],
  },
  {
    slug: "how-does-the-small-business-cgt-concession-work-australia",
    category: "business",
    question: "How does the small business CGT concession work in Australia?",
    metaTitle: "Small Business CGT Concessions in Australia: 4 Reliefs Explained (2026)",
    metaDescription:
      "Australia's small business CGT concessions can eliminate all tax on the sale of a qualifying business asset. Learn the 4 concessions, the $6M net assets test, the $2M turnover test, and the 15-year exemption.",
    shortAnswer:
      "Australia's small business CGT concessions (Subdivision 152 of ITAA 1997) can reduce or eliminate capital gains on disposing of active business assets. Four concessions apply: the 15-year exemption (full exemption if held for 15+ years and owner is 55+), the 50% active asset reduction, the retirement exemption (up to $500,000 lifetime into super), and the rollover. To qualify, you must pass either a $2M aggregated turnover test or a $6M maximum net assets test.",
    sections: [
      {
        heading: "The basic eligibility conditions",
        body: "To access any small business CGT concession, you must satisfy: (1) the basic conditions — either aggregated turnover under $2M or maximum net assets value of $6M. The $6M net assets test sums the net value of all assets of you, your affiliates, your connected entities, and spouses/children — excluding your home (if not used in the business), superannuation, personal use assets. (2) The asset must be an 'active asset' — used or ready for use in carrying on a business for at least half the period of ownership (or 7.5 years for assets held over 15 years). (3) You must be a CGT small business entity, a partner in a qualifying partnership, or a beneficiary of a qualifying trust.",
      },
      {
        heading: "The four concessions",
        body: "15-year exemption: if an asset has been held for at least 15 years continuously and the individual taxpayer (or entity) is at least 55 years old and retiring (or permanently incapacitated), the entire capital gain is exempt — no tax at all. This is the most powerful concession available to Australian small business owners planning their exit. 50% active asset reduction: after the standard 50% CGT discount (for 12-month+ holdings), an additional 50% reduction applies to the remaining gain. Combined, an individual may only include 25% of the original gain in their assessable income. Retirement exemption: up to $500,000 (lifetime cap) of capital gain can be disregarded; if you are under 55, the exempt amount must be contributed to super. Rollover: defer the capital gain for 2 years (or until you acquire a replacement asset) — the gain is rolled over rather than taxed immediately.",
      },
      {
        heading: "Practical example: selling a business",
        body: "Scenario: An individual sells a business with an active business goodwill value of $800,000. Cost base of goodwill: $50,000 (established from nothing). Capital gain: $750,000. Step 1: General 50% CGT discount (held 12+ months): $375,000. Step 2: 50% active asset reduction: $187,500. Step 3: Retirement exemption (individual is 58): $187,500 (all remaining gain exempt under the $500,000 cap). Final tax on the business sale: $0. Additionally, the $187,500 retirement exemption amount (for those over 55) does not need to go into super. The entire $800,000 sale proceeds are kept by the individual tax-free.",
      },
    ],
    faqs: [
      {
        q: "Does commercial property qualify for the small business CGT concessions?",
        a: "Only if it is an active asset used in the business. Commercial property that a business owner's company owns and leases to their operating business at arm's length terms can qualify as an active asset if the operating business contributes at least 51% of the total value of the entity. Pure investment commercial property with unrelated tenants does not qualify. The distinction between an active business asset and a passive investment asset is critical.",
      },
      {
        q: "Can a company or trust access the small business CGT concessions?",
        a: "Yes, but the concessions are often more complex for companies and trusts. For a company, the retirement exemption must be paid to individuals as a capital gain under section 152-325 (not retained in the company). For trusts, the concession can be passed through to beneficiaries. Companies do not receive the general 50% CGT discount, so for a company using the concessions, the sequence and calculations differ from an individual.",
      },
      {
        q: "What is the CGT Small Business Rollover?",
        a: "The small business rollover defers a capital gain on the disposal of an active asset for up to 2 years after the year of sale (or until you acquire a replacement active asset, whichever is earlier). If you acquire a replacement asset within the period, the deferred gain reduces its cost base. If no replacement asset is acquired, the gain becomes assessable at the end of the rollover period. The rollover is useful when selling a business and planning to acquire another business or asset.",
      },
    ],
    relatedSlugs: [
      "sole-trader-vs-company-australia",
      "what-is-capital-gains-tax-discount",
      "cgt-50-percent-discount-eligibility-australia",
    ],
    relatedTools: [
      { label: "CGT calculator", href: "/cgt-calculator" },
      { label: "Find a financial adviser", href: "/financial-advisers" },
    ],
  },
  {
    slug: "what-is-division-7a-australia",
    category: "business",
    question: "What is Division 7A and why does it matter for Australian business owners?",
    metaTitle: "Division 7A Explained: Loans from Company to Shareholder Australia (2026)",
    metaDescription:
      "Division 7A treats loans from a private company to shareholders or their associates as unfranked dividends unless a complying loan agreement is in place. Learn the minimum repayment rules, benchmark interest rate, and how to avoid costly mistakes.",
    shortAnswer:
      "Division 7A of the Income Tax Assessment Act 1936 treats loans, payments, or debt forgiveness from a private company to its shareholders or their associates as unfranked dividends — assessable to the individual at their marginal tax rate — unless a formal complying loan agreement is in place with minimum annual repayments at the ATO's benchmark interest rate (8.27% for 2024-25).",
    sections: [
      {
        heading: "What triggers a Division 7A deemed dividend",
        body: "Three situations trigger Division 7A: (1) a loan by a private company to a shareholder or associate, (2) a payment (advance, benefit, use of company asset) to a shareholder or associate, and (3) a debt the company forgives owed by a shareholder or associate. 'Associate' is defined broadly — it includes spouses, children, parents, siblings, trusts where the shareholder is a trustee or beneficiary, and partnerships. Director salary advances, company credit card use for personal expenses, and company-funded holidays all have the potential to trigger Division 7A if not properly documented and repaid. The division applies to payments made in an income year before the company lodges its tax return for that year.",
      },
      {
        heading: "Complying loan agreements: avoiding the deemed dividend",
        body: "A loan from a private company to a shareholder can be structured as a complying loan if: (1) a written loan agreement is in place by the earlier of the lodgment day or 30 June following the year the loan was made, (2) interest is charged at no less than the ATO's benchmark interest rate (published annually — 8.27% in 2024-25), (3) minimum annual repayments of principal and interest are made. The maximum loan term is 7 years for unsecured loans, or 25 years for loans secured by a registered mortgage over real property. If either the interest rate or minimum repayment is not met in any year, the shortfall is treated as a deemed dividend in that year.",
      },
      {
        heading: "Minimum repayment calculation",
        body: "The minimum yearly repayment (MYR) is calculated using an ATO formula that factors in the loan balance, interest rate, and remaining loan term. For a $100,000 loan on a 7-year term at 8.27%: the first year MYR is approximately $19,400 (principal plus interest). Failure to make the MYR by 30 June converts the shortfall to a deemed dividend — taxable to the shareholder at their marginal rate with no franking credit. Division 7A catches many business owners by surprise when they informally access company funds for personal use, particularly in trusts where companies act as trustees with unpaid present entitlements (UPEs) owed to related individuals.",
      },
    ],
    faqs: [
      {
        q: "Does Division 7A apply to distributions from discretionary trusts?",
        a: "Division 7A applies to trusts where a private company is a beneficiary and the trust does not pay the company the amount owed — the 'unpaid present entitlement' (UPE). Since 2010, UPEs owed to company beneficiaries can be caught by Division 7A if not placed on complying sub-trust or loan terms. This is one of the most complex areas of Australian tax law and requires careful trust distribution planning by tax advisers each year.",
      },
      {
        q: "Can I retrospectively fix a Division 7A breach?",
        a: "It is difficult to retrospectively reverse a deemed dividend once the lodgment date has passed. The ATO may allow the company to convert an existing non-complying loan to a complying loan agreement in limited circumstances, but the deemed dividend already assessed is generally not reversed. Prevention is far more effective — ensure all company payments to shareholders are tracked, properly documented as loans, and minimum repayments are met annually.",
      },
      {
        q: "What are the penalties for Division 7A non-compliance?",
        a: "The deemed dividend is included in the shareholder's assessable income at their marginal tax rate with no franking credit attached — so tax is payable on 100% of the amount at up to 47%. Penalties may apply for tax shortfalls, and general interest charge (GIC) accrues on underpaid tax. For significant amounts, Division 7A assessments from an ATO audit can produce large unexpected tax bills. The ATO publishes a Division 7A calculator on its website to help compute minimum repayments.",
      },
    ],
    relatedSlugs: [
      "sole-trader-vs-company-australia",
      "how-does-the-small-business-cgt-concession-work-australia",
      "how-to-register-for-gst-australia",
    ],
    relatedTools: [
      { label: "Find a financial adviser", href: "/financial-advisers" },
    ],
  },
  {
    slug: "how-to-register-for-gst-australia",
    category: "business",
    question: "How do you register for GST in Australia and when is it mandatory?",
    metaTitle: "How to Register for GST in Australia: When, How & BAS Guide (2026)",
    metaDescription:
      "GST registration is mandatory when annual turnover reaches $75,000 ($150,000 for non-profits). Learn how to register via the ATO, choose quarterly or monthly BAS, and understand input tax credits.",
    shortAnswer:
      "GST registration is mandatory in Australia once your business turnover reaches $75,000 per year ($150,000 for non-profit organisations). Below $75,000 you can register voluntarily. Registration is done online via the ATO's ABR (Australian Business Register) portal. Once registered, you must charge 10% GST on most taxable supplies, lodge Business Activity Statements (BAS), and remit net GST to the ATO quarterly, monthly, or annually.",
    sections: [
      {
        heading: "When GST registration is mandatory",
        body: "You must register for GST if: your business's GST turnover (gross revenue from taxable supplies) is $75,000 or more in any 12-month period (current or projected). The $75,000 threshold looks at current turnover plus anticipated future turnover — if you expect to exceed $75,000 within the next 12 months, you must register before reaching the threshold. Special rules: if you provide taxi, rideshare, or hire-car services, you must register regardless of turnover. If your turnover is below $75,000, registration is voluntary — but you cannot charge or claim GST until registered. Registration is effective from the date you apply or a date you request (e.g. business start date).",
      },
      {
        heading: "How to register for GST",
        body: "Register online via the ATO's Business Registration Service (business.gov.au) or ATO Business Portal, or through a registered tax agent. You must have an ABN before registering for GST. Registration is typically processed within a few days. Once registered, you receive confirmation and a GST registration start date. You then need to: (1) add 10% GST to your invoices, (2) issue tax invoices for sales over $82.50 (including GST), (3) track input tax credits (GST paid on business expenses), and (4) lodge BAS. The accounting method for GST can be cash basis (GST remitted when payment received) or accruals basis (GST remitted when invoice issued) — cash basis is available to small businesses with turnover under $10M.",
      },
      {
        heading: "Business Activity Statements (BAS) and lodgment",
        body: "Once GST-registered, you must lodge BAS to report and pay the net GST owed (GST collected on sales minus input tax credits on purchases). Lodgment frequency options: quarterly (most common for businesses under $20M), monthly (for larger businesses or those wanting more frequent reconciliation), or annually (for businesses under $75,000 who chose voluntary registration — only available with annual turnover under $75,000). The quarterly BAS is due on the 28th of the month after each quarter (October, February, April, July). Using a registered BAS agent gives a 4-week lodgment extension. GST is a cash-flow management tool — collect 10% on sales, remit it net of input credits each quarter.",
      },
    ],
    faqs: [
      {
        q: "What expenses can I claim input tax credits for?",
        a: "You can claim input tax credits (ITC) on GST paid for purchases used in carrying on your GST-registered business. Common examples: equipment, vehicles, supplies, contractor invoices (if supplier is GST-registered), commercial rent, and professional services. You cannot claim ITCs on: purchases for private use, wages, superannuation contributions, input-taxed supplies (residential rent, financial services), and purchases from non-registered suppliers. Apportion mixed-use items (e.g. a car used 60% for business) to the business percentage.",
      },
      {
        q: "Is there a difference between taxable, input-taxed, and GST-free supplies?",
        a: "Yes. Taxable supplies attract 10% GST. GST-free supplies (such as most basic food, medical services, education, and exports) are not subject to GST but you can still claim input tax credits on costs incurred. Input-taxed supplies (such as financial services, residential rent, and precious metals) are not subject to GST and you cannot claim ITCs on expenses that relate solely to making input-taxed supplies. Businesses with mixed supply types (e.g. a developer selling apartments — which are input-taxed residential supply — and commercial property) need to carefully apportion ITC claims.",
      },
      {
        q: "Should a new business under $75,000 register for GST voluntarily?",
        a: "It depends on your customer base. If you sell primarily to other businesses (B2B), they will want a tax invoice with GST so they can claim input credits — voluntary registration is often expected. If you sell to consumers (B2C), not registering below $75,000 means your prices are 10% cheaper than GST-registered competitors, which can be an advantage. Voluntary registration also lets you claim ITCs on business expenses — useful if you have significant start-up costs before revenue.",
      },
    ],
    relatedSlugs: [
      "sole-trader-vs-company-australia",
      "how-does-the-small-business-cgt-concession-work-australia",
      "what-is-division-7a-australia",
    ],
    relatedTools: [
      { label: "Find a financial adviser", href: "/financial-advisers" },
    ],
  },

  // ── CRYPTO (4 new) ───────────────────────────────────────────────────────────

  {
    slug: "how-is-cryptocurrency-taxed-in-australia",
    category: "crypto",
    question: "How is cryptocurrency taxed in Australia?",
    metaTitle: "Cryptocurrency Tax in Australia: ATO Rules for CGT & Income (2026 Guide)",
    metaDescription:
      "The ATO treats cryptocurrency as a CGT asset, not currency. Disposals trigger capital gains events. Mining and staking income is assessable income. Learn the ATO's rules for crypto tax in Australia.",
    shortAnswer:
      "The ATO treats cryptocurrency as a capital gains tax (CGT) asset — not foreign currency. Disposing of crypto (selling, trading, spending, gifting) triggers a CGT event. If held for more than 12 months, individuals receive the 50% CGT discount. Crypto received from mining or staking is ordinary income at its AUD value on receipt. All crypto transactions must be reported in your annual tax return.",
    sections: [
      {
        heading: "Cryptocurrency as a CGT asset",
        body: "The ATO confirmed in Tax Determination TD 2014/26 that cryptocurrency is a CGT asset under section 108-5 of the Income Tax Assessment Act 1997. Every time you dispose of cryptocurrency — sell for AUD, exchange for another crypto, use to pay for goods or services, or gift it — a CGT event occurs. The capital gain or loss is calculated as the proceeds (in AUD at the time of disposal) minus the cost base (in AUD at the time of acquisition, plus any additional costs such as exchange fees). Gains on assets held more than 12 months qualify for the 50% CGT discount for individual investors (not traders). Personal use assets exemption: if you acquire crypto solely for personal use and spend it, and the cost was under $10,000, it may be exempt — but the ATO scrutinises this closely for assets with investment intent.",
      },
      {
        heading: "Mining, staking, and other crypto income",
        body: "Crypto received from mining is assessed as ordinary income at the AUD market value on the date of receipt. The same amount becomes the cost base for future CGT purposes. If you mine as a business (commercial-scale GPU farms, etc.), the income is business income and associated expenses (electricity, equipment depreciation) are deductible. Hobby mining may not be business income but is still assessable under general income provisions. Staking rewards: the ATO's position (Tax Determination 2022/11, draft) treats staking rewards as ordinary income at market value on receipt. DeFi lending returns (yield farming), liquidity pool fees, and similar crypto income flows are also treated as assessable income. Airdrops may be ordinary income or capital gain depending on circumstances.",
      },
      {
        heading: "Record-keeping and CGT calculation",
        body: "Every crypto transaction requires a contemporaneous AUD record: date, coin, amount, AUD value at the time, exchange fees, and the purpose (purchase, sale, trade, staking reward). The ATO requires these records to be kept for 5 years after disposal. For investors with many transactions (hundreds of trades), specialist crypto tax software (Koinly, CoinTracker, Syla) integrates with Australian exchanges to automate CGT calculations. Cost base methods available in Australia: the default is FIFO (First In First Out), but the ATO's cost base rules actually allow individual asset identification if you have sufficient records — Specific Identification can minimise gains by identifying which acquisition lot to use for each disposal.",
      },
    ],
    faqs: [
      {
        q: "Is swapping one cryptocurrency for another a taxable event in Australia?",
        a: "Yes. When you exchange Bitcoin for Ethereum (or any crypto-to-crypto trade), the ATO treats this as a disposal of the first asset at its AUD market value at the time of the trade, and an acquisition of the second asset at the same value. A capital gain or loss arises on the disposed asset. This means every crypto-to-crypto trade is a taxable event, even if you never convert to AUD — you must value each trade in AUD at the time it occurs.",
      },
      {
        q: "Do I need to declare crypto on my tax return if I made a loss?",
        a: "Yes. All CGT events must be reported, including losses. Capital losses cannot be deducted against ordinary income, but they can offset capital gains in the same year or be carried forward indefinitely to offset future capital gains. Failing to report crypto transactions (including losses) may result in penalties if the ATO data-matches your account from exchange reporting.",
      },
      {
        q: "What is the ATO's personal use asset exemption for crypto?",
        a: "The personal use asset exemption (section 118-10 ITAA 1997) may apply if you acquire a crypto asset to purchase goods or services for personal use and dispose of it for that purpose within a short time. The exemption only applies if the cost was under $10,000. In practice, the ATO applies this narrowly — crypto bought and held for months before being spent, or crypto acquired partly for investment, does not qualify. Most crypto purchases are considered investment assets, not personal use assets.",
      },
    ],
    relatedSlugs: [
      "what-is-the-ato-approach-to-crypto-reporting-australia",
      "can-you-hold-cryptocurrency-in-an-smsf-australia",
      "cgt-50-percent-discount-eligibility-australia",
      "how-do-i-report-crypto-tax-in-australia",
    ],
    relatedTools: [
      { label: "CGT calculator", href: "/cgt-calculator" },
    ],
  },
  {
    slug: "what-is-the-ato-approach-to-crypto-reporting-australia",
    category: "crypto",
    question: "What is the ATO's approach to crypto tax reporting in Australia?",
    metaTitle: "ATO Crypto Tax Reporting: Data Matching, TFN Withholding & Obligations (2026)",
    metaDescription:
      "The ATO uses data matching from Australian crypto exchanges to identify unreported transactions. Learn what the ATO knows, mandatory exchange reporting, TFN withholding, and your obligations.",
    shortAnswer:
      "The ATO actively data-matches cryptocurrency transaction records from Australian exchanges (Coinbase, CoinSpot, Binance AU, Independent Reserve) to identify taxpayers who have not reported crypto gains. Australian exchanges are required to report customer data to the ATO. TFN withholding may apply if you have not provided your TFN to your exchange. All crypto disposals must be reported in your annual tax return.",
    sections: [
      {
        heading: "ATO data matching from exchanges",
        body: "The ATO has operated a dedicated cryptocurrency data-matching program since 2019 under its data matching guidelines (PCG 2017/10). Australian-registered exchanges are required under the Anti-Money Laundering and Counter-Terrorism Financing Act 2006 (AML/CTF) to maintain KYC (Know Your Customer) records. The ATO issues data requests to exchanges for customer identity data, account balances, and transaction histories. Customers identified through this matching who have not reported crypto transactions in their tax returns receive reminder letters from the ATO — and those who have under-reported face amended assessments, penalties, and interest. The ATO has stated it has data on hundreds of thousands of Australians with cryptocurrency holdings.",
      },
      {
        heading: "Mandatory reporting obligations",
        body: "Every Australian taxpayer with cryptocurrency transactions must report them in their individual tax return under capital gains (myTax has a dedicated crypto section). Obligations include: reporting all disposals in the income year (sales, trades, spending, gifts); reporting mining and staking income as 'other income'; maintaining adequate records for 5 years; and if you use an offshore exchange not registered in Australia, you are still obligated to report — the ATO does not have automatic data feeds from foreign exchanges but expects self-reporting. Voluntary disclosures (using the ATO's Voluntary Disclosure facility) typically result in reduced penalties compared to audit-identified non-compliance.",
      },
      {
        heading: "TFN withholding and exchange requirements",
        body: "Australian-registered exchanges are financial institutions for TFN withholding purposes. If you have not provided your Tax File Number to your exchange, the exchange may withhold 47% from any cash withdrawals or interest-bearing activities. This is not common with standard crypto trading but applies to any yield products, interest accounts, or AUD deposits on exchange platforms. Providing your TFN to your exchange is best practice and does not give the ATO any additional access — the ATO already receives data under the data-matching program regardless. AML/CTF rules also require exchanges to verify customer identity (passport, driver's licence) for accounts exceeding transaction thresholds.",
      },
    ],
    faqs: [
      {
        q: "Can the ATO see my hardware wallet or offshore exchange transactions?",
        a: "The ATO has limited direct visibility into hardware wallets and offshore exchanges. However, on-chain analytics firms (Chainalysis, Elliptic) provide blockchain analysis tools to tax authorities globally that can trace transactions across wallets. The ATO has access to blockchain analytics capabilities. Additionally, if you ever move crypto from an offshore exchange to an Australian exchange (for fiat withdrawal), the Australian exchange data-match creates a link. Attempting to hide crypto transactions in offshore wallets or exchanges is tax evasion and carries serious penalties.",
      },
      {
        q: "What are the penalties for not reporting crypto in Australia?",
        a: "Failing to report taxable crypto gains can result in: base penalty of 25% of the tax shortfall for a failure to take reasonable care; 50% for recklessness; 75% for intentional disregard. General Interest Charge (GIC) accrues from the original due date. For significant under-reporting, the ATO may refer cases to the Australian Federal Police for criminal tax fraud prosecution (rare but possible for deliberate evasion of large amounts). Voluntary disclosure before an ATO audit typically reduces penalties to zero or 10%.",
      },
      {
        q: "Do I need to report crypto held on overseas exchanges?",
        a: "Yes. Australian tax residents must report all worldwide income and capital gains, including crypto held on foreign exchanges (Binance, Kraken, Gemini, Coinbase international). The ATO's international data exchange agreements (CRS — Common Reporting Standard) increasingly capture foreign account data. Even without direct exchange reporting, Australian residents are legally obligated to self-report all crypto transactions regardless of the exchange's jurisdiction.",
      },
    ],
    relatedSlugs: [
      "how-is-cryptocurrency-taxed-in-australia",
      "can-you-hold-cryptocurrency-in-an-smsf-australia",
      "what-is-defi-and-how-is-it-taxed-australia",
    ],
    relatedTools: [
      { label: "CGT calculator", href: "/cgt-calculator" },
    ],
  },
  {
    slug: "can-you-hold-cryptocurrency-in-an-smsf-australia",
    category: "crypto",
    question: "Can you hold cryptocurrency in an SMSF in Australia?",
    metaTitle: "Cryptocurrency in an SMSF: Rules, Compliance & ATO Requirements (2026)",
    metaDescription:
      "SMSFs can invest in cryptocurrency if the investment strategy allows it, the sole purpose test is met, and assets are correctly valued at market. Learn the ATO's requirements and the custody and audit obligations.",
    shortAnswer:
      "An SMSF can hold cryptocurrency as an investment if: the fund's investment strategy explicitly allows it, the sole purpose test is met (investment is solely for retirement benefits), crypto is held in the fund's name (not commingled with members' personal crypto), assets are valued at market value each year for the annual audit, and custody arrangements are properly documented. The ATO has specific guidance on SMSF crypto holdings in SMSF Ruling 2012/1 (asset ownership).",
    sections: [
      {
        heading: "Investment strategy and trustee obligations",
        body: "SMSF trustees have a duty under regulation 4.09 of the Superannuation Industry (Supervision) Regulations 1994 to formulate, review regularly, and give effect to an investment strategy. To hold cryptocurrency, the strategy must explicitly include it as a permitted asset class and address: the expected return from crypto investments, liquidity (ability to meet pension payments and benefit payments), the risk of investing in crypto given its volatility, and diversification. The strategy should specify the maximum percentage of fund assets allocated to crypto (e.g. '5–15% in digital assets'). SMSF auditors will flag a crypto holding that is not reflected in the investment strategy as a compliance breach.",
      },
      {
        heading: "Sole purpose test and related party rules",
        body: "Cryptocurrency in an SMSF must meet the sole purpose test — held exclusively for the purpose of providing retirement benefits. This means: members cannot access or use the SMSF's crypto for personal purposes (no using SMSF private keys to make personal transactions), the fund's crypto must be stored separately from any personal crypto holdings (separate wallets/exchanges), and the fund must be able to demonstrate that any crypto transactions were conducted at arm's length and at market rates. The ATO's specific concern is that the trustee's personal crypto and the SMSF's crypto remain clearly separated, particularly for hardware wallet storage.",
      },
      {
        heading: "Valuation, custody, and annual audit requirements",
        body: "SMSF assets must be valued at market value each year (reg 8.02B of SIS Regulations). For listed crypto assets, the AUD exchange rate on 30 June is used. SMSF auditors require: account statements or screenshots from the exchange showing the SMSF's holdings as at 30 June; proof that the exchange account is in the fund's name (or trustee's name on behalf of the fund); transaction records for all crypto trades in the year; and AUD valuations for every transaction. Cold wallet (hardware wallet) custody is permitted but the fund's name/trustee details should be documented, and the private key should be held by the trustees under a documented custody procedure — not a single member. Multi-signature wallets are recommended for SMSFs.",
      },
    ],
    faqs: [
      {
        q: "What exchanges can an SMSF use to buy crypto in Australia?",
        a: "Any Australian-registered exchange that allows accounts in the name of a trustee or corporate trustee is suitable. Exchanges commonly used by SMSFs include Independent Reserve, CoinSpot, and Kraken (which allows corporate accounts). The exchange account should be in the format: '[SMSF Name] [Trustee Name] as Trustee for [Fund Name]'. Some exchanges only allow personal accounts — these are not suitable for SMSF crypto holdings as assets must be in the fund's name.",
      },
      {
        q: "Is crypto in an SMSF taxed the same as other SMSF investments?",
        a: "Yes. In accumulation phase, capital gains on crypto held in an SMSF are taxed at 15% (with a one-third discount for assets held over 12 months, giving an effective 10% rate). Staking income and mining income are taxed at 15% as ordinary income. In pension phase with all members drawing pensions, capital gains and income on pension-supporting assets are taxed at 0%. These are the same rates as for SMSF shares or other investments.",
      },
      {
        q: "Can an SMSF invest in DeFi or staking?",
        a: "Yes, but it adds compliance complexity. DeFi protocols are permissionless and pseudonymous — SMSF trustees need to ensure transactions are properly documented and that the sole purpose test is clearly met. Staking rewards are income to the fund. Each DeFi transaction (liquidity provision, yield farming, borrowing against collateral) is a separate event that may have CGT implications and must be recorded. Many SMSF auditors are not yet experienced with DeFi audit trails — use crypto tax software that generates a comprehensive transaction report.",
      },
    ],
    relatedSlugs: [
      "how-is-cryptocurrency-taxed-in-australia",
      "what-is-defi-and-how-is-it-taxed-australia",
      "what-is-smsf-and-is-it-worth-it",
    ],
    relatedTools: [
      { label: "SMSF calculator", href: "/smsf-calculator" },
      { label: "CGT calculator", href: "/cgt-calculator" },
    ],
  },
  {
    slug: "what-is-defi-and-how-is-it-taxed-australia",
    category: "crypto",
    question: "What is DeFi and how is it taxed in Australia?",
    metaTitle: "DeFi Tax in Australia: ATO Treatment of Yield Farming, Staking & Liquidity Pools (2026)",
    metaDescription:
      "DeFi involves smart contract-based financial services including liquidity pools, yield farming, and wrapped tokens. The ATO treats most DeFi income as assessable income. Learn how each DeFi activity is taxed.",
    shortAnswer:
      "Decentralised Finance (DeFi) refers to blockchain-based financial services including lending, borrowing, liquidity pools, and yield farming operated by smart contracts without intermediaries. The ATO treats most DeFi returns as assessable ordinary income at the time received (valued in AUD). Wrapping or bridging tokens may constitute a CGT disposal event. The ATO published consultation on DeFi taxation (2023 discussion paper) but final guidance remains in development.",
    sections: [
      {
        heading: "DeFi income: lending, staking, and yield farming",
        body: "The ATO's position, consistent with general income tax principles, is that DeFi returns received as compensation for providing capital or services are ordinary income assessed at market value in AUD on receipt. Lending (Aave, Compound): interest or fees received on deposited crypto are income in the year received. Liquidity pool fees (Uniswap, SushiSwap): trading fees earned by liquidity providers are income. Yield farming rewards: tokens distributed as incentives for providing liquidity are income at market value when received. Staking rewards (Ethereum PoS, Cardano, Solana): assessed as income when receivable/received. The cost base of income-assessed tokens is the AUD value included in assessable income — meaning future capital gains are calculated from the value at which you recognised income, not zero.",
      },
      {
        heading: "Wrapped tokens, bridging, and liquidity pool entry/exit",
        body: "The ATO's draft guidance (2023 DeFi consultation) indicated that wrapping a token (e.g. converting ETH to WETH) may constitute a CGT disposal — the original asset is disposed of and a new asset is acquired. This is controversial and the final ruling has not been published as of 2026. Bridging (moving tokens across chains) similarly may be a disposal depending on whether the bridge is custodial or non-custodial. Depositing into a liquidity pool in exchange for LP tokens (e.g. depositing ETH/USDC into Uniswap for LP tokens): the ATO may treat this as a disposal of the underlying assets and acquisition of LP tokens. Withdrawing from a pool is a disposal of LP tokens and acquisition of underlying assets. If treated as disposals, each pool entry and exit is a CGT event.",
      },
      {
        heading: "Record-keeping complexity for DeFi",
        body: "DeFi creates substantially greater record-keeping complexity than simple spot trading. Each protocol interaction is an on-chain transaction with a timestamp and token amounts but no automatic AUD conversion. To comply with ATO requirements, you need: a complete transaction history (exportable from most protocols or obtainable via the blockchain), AUD spot prices at the time of each transaction (sourced from reputable exchanges like CoinGecko or CMC), and categorisation of each transaction (income, disposal, acquisition, gas fee). Gas fees paid in ETH or other native tokens are themselves CGT events if the ETH was acquired at a different value. Specialist DeFi tax software (Koinly DeFi module, CryptoTaxCalculator) integrates with DeFi wallets and protocols to automate this, but manual review is still required for complex positions.",
      },
    ],
    faqs: [
      {
        q: "Are gas fees deductible for DeFi tax purposes in Australia?",
        a: "Gas fees paid to execute DeFi transactions may be deductible or added to the cost base depending on the type of transaction. Gas fees on income-producing transactions (e.g. claiming staking rewards) are deductible as a cost of earning assessable income. Gas fees on asset disposals add to the cost base (reducing the capital gain). Gas fees paid in ETH are themselves CGT events — you are disposing of ETH (a CGT asset) when paying gas. This creates a secondary CGT complexity where each gas payment must be tracked.",
      },
      {
        q: "How are stablecoins treated for Australian tax purposes?",
        a: "Stablecoins (USDC, USDT, DAI) are CGT assets for Australian tax purposes — not currency. Even though a stablecoin maintains parity with USD, the ATO treats it as a foreign currency-denominated CGT asset. Converting AUD to USDC and back may generate CGT gains or losses if the AUD/USD rate has changed. Small gains from stablecoin currency fluctuations are technically assessable but practically minimal. Using stablecoins in DeFi protocols (earning yield on USDC deposits) generates income in AUD equivalent.",
      },
      {
        q: "Does the ATO have specific guidance on DeFi?",
        a: "As of 2026, the ATO has published general guidance on crypto assets (crypto.ata.gov.au) and conducted a public consultation on DeFi taxation (2023 discussion paper). Final binding rulings specifically on DeFi (wrapping, liquidity pools, bridges) have not been published — the ATO has indicated these are being developed. In the absence of specific rulings, practitioners apply general income tax and CGT principles. The 2023 discussion paper's positions (wrapping = disposal, yield = income) are the most current indicator of ATO intent.",
      },
    ],
    relatedSlugs: [
      "how-is-cryptocurrency-taxed-in-australia",
      "can-you-hold-cryptocurrency-in-an-smsf-australia",
      "what-is-the-ato-approach-to-crypto-reporting-australia",
    ],
    relatedTools: [
      { label: "CGT calculator", href: "/cgt-calculator" },
    ],
  },

  // ── INSURANCE (4 new) ────────────────────────────────────────────────────────

  {
    slug: "types-of-life-insurance-australia",
    category: "insurance",
    question: "What types of life insurance exist in Australia?",
    metaTitle: "Types of Life Insurance in Australia: Term, TPD, IP & Trauma (2026 Guide)",
    metaDescription:
      "Australia has four main personal insurance types: life (term), total and permanent disability (TPD), income protection, and trauma (critical illness). Learn how each works, what it covers, and whether it can be held inside super.",
    shortAnswer:
      "Australia has four main types of personal insurance: life insurance (pays a lump sum on death or terminal illness), total and permanent disability (TPD) insurance (lump sum if you can never work again), income protection insurance (monthly income replacement of 70–75% if you cannot work temporarily), and trauma insurance (lump sum on diagnosis of serious illness like cancer, heart attack, or stroke). Life, TPD, and income protection can be held inside superannuation; trauma insurance cannot.",
    sections: [
      {
        heading: "Life (term) insurance",
        body: "Life insurance (also called term insurance in Australia) pays a lump sum death benefit to your beneficiaries when you die, or to you if you are diagnosed with a terminal illness with less than 12–24 months to live. Benefit amounts range from $100,000 to several million dollars. Premiums are calculated based on age, health, smoker status, occupation, and sum insured. Life insurance can be held inside superannuation (most industry and retail super funds include automatic default life cover) or purchased outside super via a financial adviser or direct insurer. Life cover inside super uses super assets to pay premiums — preserving your take-home pay — but reducing your retirement savings. Outside super, premiums are paid from after-tax income but the death benefit is paid directly to nominated beneficiaries without going through the super system.",
      },
      {
        heading: "Total and permanent disability (TPD) insurance",
        body: "TPD insurance pays a lump sum if you become permanently and totally disabled and are unlikely to ever work again. Two definitions exist: own occupation TPD (unable to work in your specific occupation — broader protection) and any occupation TPD (unable to work in any occupation for which you are reasonably qualified by education, training, or experience). TPD held inside super must use the 'any occupation' definition (this is an SIS Act requirement). Own occupation TPD must be held outside super. The distinction matters significantly — own occupation is far easier to claim and costs more in premiums. TPD benefits are typically equal to or slightly less than life cover. The lump sum purpose is to clear debt, fund ongoing care, and adapt living arrangements.",
      },
      {
        heading: "Income protection and trauma insurance",
        body: "Income protection (IP) insurance replaces 70–75% of your pre-disability income while you cannot work due to illness or injury, paid monthly. Policies have a waiting period (typically 30, 60, or 90 days) and a benefit period (2 years, 5 years, or to age 65). IP premiums are tax-deductible when held outside super. Inside super, IP premiums reduce your super balance but are not personally tax-deductible. Trauma insurance (also called critical illness or recovery insurance) pays a lump sum on diagnosis of one of 40–50 listed conditions, regardless of your ability to work. Common conditions: cancer (most common claim), heart attack, stroke, coronary artery bypass surgery, and kidney failure. Trauma insurance cannot be held inside super. It fills the gap between IP (which requires inability to work) and TPD (which requires permanent disability) — a cancer patient who recovers and returns to work gets nothing from IP or TPD, but would receive the trauma lump sum.",
      },
    ],
    faqs: [
      {
        q: "How much life insurance does the average Australian need?",
        a: "A common rule of thumb is 10x annual income. More precisely, calculate: outstanding mortgage balance + other debts + income replacement for dependants (10 × annual income) + childcare and education costs + funeral expenses. For a couple with a $600,000 mortgage, two young children, and combined income of $150,000, a reasonable total cover might be $1.5–$2M per person. Most Australians are underinsured — a 2022 Rice Warner (now Milliman) report found the median underinsurance gap was $160,000 per household.",
      },
      {
        q: "Should I hold insurance inside or outside super?",
        a: "Inside super: premiums are paid from super assets (no cash-flow impact, lower after-tax cost for those with significant super), but benefits are subject to super law restrictions (cannot pay income protection proceeds directly; death benefits may be taxed when paid to non-dependants). Outside super: premiums are paid from take-home pay (higher cash-flow cost), but benefits are paid directly, income protection premiums are tax-deductible, and own-occupation TPD is available. The optimal strategy for most people involves holding basic life and TPD inside super and own-occupation IP and trauma insurance outside super.",
      },
      {
        q: "What is the stepped vs level premium structure in Australian insurance?",
        a: "Stepped premiums start lower and increase each year as you age — they are cheaper in early years but can become expensive in your 40s and 50s. Level premiums start higher but remain relatively constant over the life of the policy (subject to insurer review). For long-term insurance needs (income protection to age 65), level premiums often provide better value over the full policy term. For short-term needs, stepped premiums are lower upfront. Most Australian insurers offer both; financial advisers typically model both options over a 10–20 year horizon.",
      },
    ],
    relatedSlugs: [
      "what-is-trauma-insurance-australia",
      "income-protection-insurance-vs-workers-compensation-australia",
      "how-much-life-insurance-do-i-need-australia",
    ],
    relatedTools: [
      { label: "Compare life insurance", href: "/life-insurance" },
    ],
  },
  {
    slug: "what-is-trauma-insurance-australia",
    category: "insurance",
    question: "What is trauma insurance and do I need it in Australia?",
    metaTitle: "Trauma Insurance in Australia: What It Covers and Who Needs It (2026 Guide)",
    metaDescription:
      "Trauma insurance pays a lump sum on diagnosis of 40+ serious conditions including cancer, heart attack, and stroke. It cannot be held inside super and fills the gap that income protection and TPD insurance leave.",
    shortAnswer:
      "Trauma insurance (also called critical illness or recovery insurance) pays a tax-free lump sum when you are diagnosed with one of 40–50 listed serious medical conditions — including cancer, heart attack, stroke, and coronary artery bypass surgery. Unlike income protection (which requires inability to work) or TPD (which requires permanent disability), trauma pays on diagnosis regardless of whether you can work. It cannot be held inside superannuation.",
    sections: [
      {
        heading: "What trauma insurance covers",
        body: "Trauma policies typically cover 40–50+ defined conditions. The core conditions covered by virtually all Australian trauma policies are: cancer (most commonly claimed — approximately 50% of trauma claims), acute myocardial infarction (heart attack), stroke, coronary artery bypass surgery, and kidney failure requiring dialysis. Other commonly covered conditions include: multiple sclerosis, major organ transplant, severe burns, blindness, deafness, paralysis, Parkinson's disease, Alzheimer's disease (early onset), and HIV from blood transfusion or workplace exposure. Policy quality varies significantly — some insurers define conditions narrowly (e.g. requiring specific cardiac enzyme levels for a heart attack claim), while others use broader definitions. Specialist life insurance advisers compare definitions across insurers.",
      },
      {
        heading: "Why trauma insurance fills a critical gap",
        body: "Consider a 45-year-old who is diagnosed with early-stage breast cancer, undergoes surgery and chemotherapy, and returns to full-time work 6 months later. She claims: Income protection insurance — pays for 6 months of recovery, then ends when she returns to work. TPD insurance — does not pay, because she recovered and returned to work. Life insurance — does not pay, because she survived. Trauma insurance — pays the full lump sum ($250,000) on diagnosis. The lump sum covers medical costs not covered by Medicare or private health insurance (e.g. reconstructive surgery, specialised chemotherapy, alternative therapies), lost income during recovery, mortgage costs, or a career pivot. Without trauma cover, this person bears all these costs personally.",
      },
      {
        heading: "Cost, structure, and limitations",
        body: "Trauma premiums are typically 20–40% higher than equivalent life insurance premiums because of the high claim frequency of cancer (1 in 2 Australians will be diagnosed with cancer by age 85 per AIHW data). Stepped premiums start around $80–$200/month for a 35-year-old non-smoking female with $250,000 sum insured; male premiums for similar cover are typically 30–50% higher given different claims frequencies. Trauma cannot be held inside super — there is no mechanism under super law to pay trauma benefits from a fund. Trauma policies often include a partial payment feature (30–50% of benefit on less severe conditions) and a buyback option (ability to reinstate life cover after a trauma claim). Pre-existing conditions are typically excluded; you must be in good health at application.",
      },
    ],
    faqs: [
      {
        q: "Is trauma insurance tax-deductible in Australia?",
        a: "No. Trauma insurance premiums are not tax-deductible when held personally (unlike income protection premiums, which are deductible). The benefit paid on a valid claim is also generally tax-free in the hands of the insured. For businesses, key person trauma insurance (where the employer insures a key employee) may be deductible as a business expense, though this has complexity depending on structure.",
      },
      {
        q: "What is the difference between trauma insurance and private health insurance?",
        a: "Private health insurance covers eligible medical treatment costs — hospital room costs, specialist fees, some extras. It does not replace income, pay off a mortgage, or provide a financial buffer during recovery. Trauma insurance provides a cash lump sum you can use for any purpose. The two products are complementary — private health covers the medical bills while trauma insurance covers the financial disruption of a serious diagnosis. An adequate trauma insurance payout is typically $200,000–$500,000, far exceeding what private health will reimburse.",
      },
      {
        q: "Can I get trauma insurance if I have a pre-existing condition?",
        a: "You can apply, but pre-existing conditions are typically excluded from cover. If you had a previous cancer diagnosis, the insurer will generally exclude cancer from your policy (an exclusion loading). Some conditions result in policy decline. Applying early — when young and healthy — is the key to securing comprehensive trauma cover without exclusions. If your application is declined, some group insurance products through super funds or employer schemes offer limited trauma cover without underwriting.",
      },
    ],
    relatedSlugs: [
      "types-of-life-insurance-australia",
      "how-much-life-insurance-do-i-need-australia",
      "income-protection-insurance-vs-workers-compensation-australia",
    ],
    relatedTools: [
      { label: "Compare life insurance", href: "/life-insurance" },
    ],
  },
  {
    slug: "how-much-life-insurance-do-i-need-australia",
    category: "insurance",
    question: "How much life insurance does an Australian need?",
    metaTitle: "How Much Life Insurance Do You Need in Australia? DIME Method (2026)",
    metaDescription:
      "Calculate your life insurance needs using the DIME method: Debt + Income replacement + Mortgage + Education. Learn what sum insured is appropriate for Australian households at different life stages.",
    shortAnswer:
      "The DIME method calculates your life insurance needs as: Debt (all non-mortgage debts) + Income (annual income × years until youngest child is independent) + Mortgage (outstanding balance) + Education (estimated private school or university costs for children). For most Australian families with a mortgage and young children, total cover of $1–$2 million per income-earner is appropriate.",
    sections: [
      {
        heading: "The DIME method explained",
        body: "DIME is a needs-based calculation framework: Debt: total all consumer debts your family would need to repay — car loans, credit cards, personal loans, business debts you have personally guaranteed. Income replacement: multiply your annual after-tax income by the number of years until your youngest child reaches financial independence (typically 18–25 years). This ensures your family can maintain their lifestyle even without your income. A common shortcut is 10× annual income. Mortgage: the outstanding balance of your home loan — so your family can pay it off and stay in the home. Education: if you have or plan to have children and want them to access private school or university, add an estimate — $50,000–$200,000 per child depending on schooling type. Adding these four components gives a total sum insured target.",
      },
      {
        heading: "Australian worked example",
        body: "Example: 38-year-old, $110,000 income, two children (aged 5 and 8), $650,000 remaining mortgage, $25,000 car loan + $8,000 credit card debt, wants to fund 12 years of private school for each child ($60,000 per child). Debt = $33,000. Income = $110,000 × 17 years = $1,870,000 (until youngest is 22). Mortgage = $650,000. Education = $120,000. Total DIME = $2,673,000. This is a theoretical maximum — many people insure for a lower amount based on: what they can afford in premiums, existing super death benefit (which effectively acts as life cover), dual-income households where the surviving partner could increase working hours, and the fact that mortgage and education are one-off finite costs.",
      },
      {
        heading: "Adjusting for existing cover and super",
        body: "Most Australians have default life insurance inside their superannuation fund. The median default life cover inside industry super funds is approximately $150,000–$300,000 depending on your age and occupational category — far less than the DIME calculation for most families. To find your existing super cover, log in to your fund's online portal or member statement. If you have multiple super funds (common in Australia due to job-changing), you may have duplicate cover with separate premiums reducing each fund balance — consolidating super and reviewing cover is worthwhile. The gap between your DIME target and your existing super cover represents the additional personal insurance you need outside super.",
      },
    ],
    faqs: [
      {
        q: "Does life insurance pay out if death is from suicide?",
        a: "Most Australian life insurance policies include a suicide exclusion for deaths occurring within the first 13 months of policy commencement (the standard exclusion period under the Code of Practice for Life Insurance). After the 13-month exclusion period, death from suicide is generally covered. This applies to policies taken out through an insurer directly — super fund default cover may have different exclusion periods. If you are experiencing mental health difficulties, please contact Lifeline on 13 11 14.",
      },
      {
        q: "Should stay-at-home parents have life insurance?",
        a: "Yes. The economic value of a stay-at-home parent's contributions — childcare, domestic work, household management — is substantial. If a stay-at-home parent died, the family would incur significant costs for childcare, cleaning, and household support. ABS data values unpaid domestic work at approximately $70,000–$90,000 per year. A stay-at-home parent should hold life insurance equivalent to the cost of replacing their contribution: $700,000–$1M (10 × economic value) is commonly recommended.",
      },
      {
        q: "How does the First Home Super Saver scheme affect insurance planning?",
        a: "The FHSS scheme allows first home buyers to save up to $50,000 in their super and withdraw it for a home deposit. Using super for a house deposit reduces the super balance and potentially the default life insurance amounts (which may be tied to account balances). Review your insurance cover after withdrawing under FHSS to ensure your remaining super insurance is still adequate for your new mortgage obligation.",
      },
    ],
    relatedSlugs: [
      "types-of-life-insurance-australia",
      "what-is-trauma-insurance-australia",
      "income-protection-insurance-vs-workers-compensation-australia",
    ],
    relatedTools: [
      { label: "Compare life insurance", href: "/life-insurance" },
    ],
  },
  {
    slug: "income-protection-insurance-vs-workers-compensation-australia",
    category: "insurance",
    question: "What is the difference between income protection insurance and workers compensation in Australia?",
    metaTitle: "Income Protection vs Workers Compensation in Australia (2026 Guide)",
    metaDescription:
      "Workers compensation covers work-related injuries only — income protection covers illness and injury anywhere. Learn how the two interact, own occupation vs any occupation definitions, and the 70-75% income replacement rule.",
    shortAnswer:
      "Workers compensation is compulsory employer-funded insurance covering work-related injuries and illnesses — managed by state schemes (WorkCover, icare, WorkSafe). Income protection insurance is personal insurance covering your inability to work from any illness or injury, regardless of where or how it occurred, paying 70–75% of pre-disability income. The two do not typically operate simultaneously — most income protection policies have a coordination of benefits clause that offsets workers compensation payments.",
    sections: [
      {
        heading: "Workers compensation: scope and limitations",
        body: "Workers compensation is governed by state and territory legislation (WorkCover QLD, SafeWork NSW/icare, WorkSafe VIC, ReturnToWork SA, etc.) and is compulsory for all employers. It covers: medical expenses for work-related injuries, weekly compensation payments (typically 80–95% of pre-injury earnings, reducing over time under most state schemes), rehabilitation and return-to-work support, and a lump sum for permanent impairment. Limitations: covers only work-related injuries and diseases — a cancer diagnosis, car accident outside work, or mental illness unrelated to work is not covered. Self-employed contractors are generally not covered by workers compensation (though some states allow voluntary registration). Premium costs are paid by employers — workers do not pay for workers compensation.",
      },
      {
        heading: "Income protection insurance: scope and definitions",
        body: "Income protection (IP) insurance covers you when you are unable to work due to any illness or injury — inside or outside work, anywhere in the world. Benefits are paid monthly at 70–75% of your pre-disability income (some policies cover 85% for shorter periods). The two critical definitions: own occupation (unable to perform the specific duties of your current occupation — a surgeon who loses fine motor control cannot perform surgery and claims) versus any occupation (unable to work in any occupation reasonably suited to your education, training, and experience — harder to claim). Own occupation IP outside super costs more but provides significantly broader protection for specialised professionals. Benefit periods range from 2 years to age 65 (or 70 for some products).",
      },
      {
        heading: "How the two interact and the 70% rule",
        body: "If you are injured at work and receiving workers compensation payments, most income protection policies will not pay simultaneously — they contain coordination of benefits clauses that offset workers compensation receipts dollar-for-dollar. This prevents over-insurance (receiving more than 100% of your income). If workers compensation ends (e.g. after the maximum payment period, or if a dispute results in reduced payments) and you are still unable to work, income protection then pays. The 70–75% income replacement cap exists because insurers argue that paying 100% of your income creates no incentive to return to work. Many policies have a rehabilitation incentive clause that temporarily increases the benefit during an active return-to-work program.",
      },
    ],
    faqs: [
      {
        q: "Can I claim both income protection and the government's Disability Support Pension simultaneously?",
        a: "Generally no — IP policies contain offset clauses that reduce your IP benefit by any government disability payments received. If you receive the Disability Support Pension (DSP), your IP payment is reduced by the DSP amount. Some older policies do not have DSP offsets, but modern policies typically do. The DSP itself has strict eligibility criteria (permanent and significant functional impairment) — most IP claimants who are expected to recover would not qualify for DSP.",
      },
      {
        q: "Are income protection premiums tax-deductible in Australia?",
        a: "Yes — income protection insurance premiums are fully tax-deductible when the policy is held outside super (section 8-1 of ITAA 1997). This is a significant benefit — a person on the 37% marginal rate saving $3,600/year in IP premiums receives a $1,332 tax refund, making the effective cost $2,268. Premiums on life, TPD, and trauma insurance are not deductible. Income protection premiums inside super are paid from your pre-tax super contributions (not personally deductible, but reduce your super taxable income).",
      },
      {
        q: "What happens to my IP cover if I change jobs or become self-employed?",
        a: "IP policies follow the individual, not the employer — you retain cover regardless of employment changes. However, you must notify your insurer if your occupation changes significantly (e.g. from office-based to manual labour) as this may affect your policy terms or premiums. Self-employed individuals have different income documentation requirements for IP claims (typically 2 years of business tax returns to establish pre-disability income). Ensure your sum insured reflects your current income — a policy taken out when you earned $60,000 that has not been updated will only replace $60,000 even if you now earn $120,000.",
      },
    ],
    relatedSlugs: [
      "types-of-life-insurance-australia",
      "what-is-trauma-insurance-australia",
      "how-much-life-insurance-do-i-need-australia",
    ],
    relatedTools: [
      { label: "Compare life insurance", href: "/life-insurance" },
    ],
  },

  // ── RETIREMENT (3 new) ───────────────────────────────────────────────────────

  {
    slug: "how-to-use-ttr-to-reduce-work-hours-australia",
    category: "retirement",
    question: "How can a transition to retirement strategy help you reduce work hours in Australia?",
    metaTitle: "Using a TTR to Reduce Work Hours in Australia: Practical Strategy (2026 Guide)",
    metaDescription:
      "A TTR pension lets you drop to part-time work at 60 while maintaining your income by drawing tax-free super. Learn the step-by-step strategy, the transfer balance cap considerations, and how to time the switch to full retirement.",
    shortAnswer:
      "A transition to retirement (TTR) pension lets Australians aged 60+ replace lost salary when dropping to part-time by drawing tax-free super income. For example, a person on $110,000 who moves to 3-day weeks ($66,000 salary) draws $44,000 from a TTR pension tax-free — maintaining $110,000 gross income. This gradually depletes the TTR account but smooths the shift from full-time work to retirement rather than stopping abruptly.",
    sections: [
      {
        heading: "The part-time TTR strategy in practice",
        body: "The income-replacement TTR strategy suits people approaching retirement who want to reduce working hours without reducing income. Step 1: Negotiate a reduction in employment from full-time to part-time. Step 2: Roll part of your super accumulation into a TTR pension — the TTR pays tax-free pension income to replace the lost part-time salary. Step 3: Keep making super contributions from part-time employment (including employer SG contributions) to partially offset the TTR drawdown. Example: $900,000 super balance, aged 63, earning $110,000 full-time. Move to 3 days/week at $66,000 salary. Roll $500,000 into a TTR pension; draw 8.8% ($44,000/year) to restore total income to $110,000. TTR pension payments are 100% tax-free at 60+ — no income tax on the $44,000 drawn. The remaining $400,000 stays in accumulation for future growth.",
      },
      {
        heading: "How the TTR balance behaves over time",
        body: "A TTR account is invested the same way as an accumulation account but with different drawdown rules. If you draw $44,000/year from a $500,000 TTR account invested in a balanced option returning 6% p.a., the account balance declines gradually — not immediately. At 6% return ($30,000 income) minus $44,000 drawn, the net depletion is $14,000/year. The account lasts approximately 25–30 years under this scenario. In practice, most TTR users transition to full retirement within 3–7 years of starting — the TTR is a bridge, not a permanent income stream. Timing the conversion from TTR to full retirement pension (which removes the 10% drawdown cap and eliminates the 15% earnings tax on the account) is the key planning decision.",
      },
      {
        heading: "Transfer balance cap and TTR to retirement conversion",
        body: "When you permanently retire and convert your TTR pension to a standard retirement pension, the balance at conversion counts against your transfer balance cap ($1.9M in FY2026). The transfer balance cap limits the total amount you can hold in tax-free retirement pension phase. If your TTR balance at conversion plus any other retirement pension interests exceeds the cap, the excess must be returned to accumulation phase. Planning the TTR drawdown rate with this cap in mind is important — you may want to draw down the TTR more aggressively before conversion if you anticipate exceeding the cap. Get advice from a financial planner before converting, as the timing affects how much goes into the zero-tax retirement phase.",
      },
    ],
    faqs: [
      {
        q: "Can I start a TTR while still employed full-time?",
        a: "Yes. A TTR does not require you to reduce hours or change your employment in any way — you simply need to have reached preservation age. Full-time employees at 60+ commonly use a TTR solely for the tax arbitrage benefit (salary sacrifice + TTR draws to reduce overall tax) without reducing work hours at all. The income-replacement use case described above is one application; tax minimisation while maintaining full income is another.",
      },
      {
        q: "What is the minimum TTR pension payment I must draw?",
        a: "The minimum drawdown from a TTR pension is 4% of your account balance per year (as at 1 July each year, or the day you start the pension if mid-year). This is the same minimum as standard account-based pensions. The maximum is 10% per year. You cannot skip drawdowns — if you start a TTR, you must draw at least 4% per year. If you draw nothing in a year, the ATO may deem the TTR non-complying.",
      },
      {
        q: "Does my employer know I am drawing a TTR pension?",
        a: "No. A TTR pension is paid directly from your super fund to your bank account — your employer has no visibility into it. You manage the TTR through your super fund's online portal or by notifying your fund of your chosen drawdown amount and frequency. Many people prefer quarterly or annual drawdowns rather than monthly to simplify administration, though monthly draws can assist with cash-flow budgeting.",
      },
    ],
    relatedSlugs: [
      "how-do-transition-to-retirement-income-streams-work",
      "what-is-the-super-preservation-age",
      "when-can-i-access-my-super",
      "asfa-retirement-standard-australia",
    ],
    relatedTools: [
      { label: "Retirement calculator", href: "/retirement-calculator" },
      { label: "Super contributions calculator", href: "/super-contributions-calculator" },
    ],
  },
  {
    slug: "asfa-retirement-standard-australia",
    category: "retirement",
    question: "How does the ASFA Retirement Standard work in Australia?",
    metaTitle: "ASFA Retirement Standard: Modest vs Comfortable Benchmarks (2026 Guide)",
    metaDescription:
      "The ASFA Retirement Standard sets quarterly benchmarks for what modest and comfortable retirement costs. In 2026, a comfortable retirement needs $51,278/year single or $72,148/year couple. Learn what's included and how much super you need.",
    shortAnswer:
      "The ASFA (Association of Superannuation Funds of Australia) Retirement Standard provides quarterly benchmarks for retirement living costs. A comfortable retirement requires approximately $51,278 per year for a single person and $72,148 for a couple (as at March 2026 quarter, ASFA figures). A modest retirement requires $32,666 (single) and $47,387 (couple). These figures assume you own your home outright and exclude aged care costs.",
    sections: [
      {
        heading: "What the ASFA benchmarks include",
        body: "ASFA publishes two benchmarks: comfortable and modest. The comfortable standard covers: a good standard of living including regular leisure activities, domestic and some international travel, private health insurance, reasonable clothing and household goods, a reliable car, and some restaurant meals. The modest standard covers: a more basic lifestyle than the comfortable level but better than just relying on the Age Pension — it allows for items like a small car, occasional travel, and some social activities. Key assumption: both benchmarks assume you own your home outright and have no housing costs beyond rates and maintenance. Renting retirees need substantially more than these figures to fund market-rate rent. Both figures are updated quarterly for CPI inflation by ASFA.",
      },
      {
        heading: "How much super you need to fund the benchmarks",
        body: "ASFA and Treasury use a 4% sustainable withdrawal rate for lump-sum-to-income conversion. To generate $51,278 per year at a 4% drawdown rate, you need approximately $1.28M in super at retirement (age 65–67). The Age Pension partially offsets this — at the full Age Pension rate in 2026-27 ($29,754/year for a single person), approximately $21,524/year needs to come from super for a comfortable retirement. To generate $21,524 at 4%, you need approximately $538,000 in super at retirement. For couples, the combined full Age Pension ($44,855/year) means the shortfall to comfortable retirement ($72,148) is approximately $27,293/year — requiring approximately $682,000 combined in super. These are estimates — actual super required depends on investment returns, inflation, age of retirement, and partial Age Pension interactions.",
      },
      {
        heading: "Limitations of the ASFA benchmark",
        body: "The ASFA benchmark has been criticised for several limitations. Renters need significantly more: the benchmark assumes home ownership — adding median Sydney or Melbourne rent ($2,200–$2,800/month in 2026) adds $26,400–$33,600/year to the required income, effectively doubling or tripling the required super balance. Aged care costs are excluded: residential aged care can cost $30,000–$100,000+ per year — the benchmark does not model this major late-life expense. The comfortable standard may be aspirational: ASFA describes comfortable as able to participate fully in the community — critics note it does not include luxuries like international business class travel or investment properties. Despite limitations, it is Australia's most commonly cited retirement income benchmark and is used by super funds, financial advisers, and Treasury modelling.",
      },
    ],
    faqs: [
      {
        q: "Does the ASFA retirement standard apply at what age?",
        a: "The ASFA benchmarks are modelled for people aged 65 (the standard retirement age for Age Pension eligibility in 2026). The figures assume a 25-30 year retirement. Early retirees (retiring at 55–60) need to fund a longer retirement period and cannot rely on Age Pension until 67 — requiring a substantially larger balance. ASFA publishes separate commentary on early retirement needs.",
      },
      {
        q: "How does the Age Pension interact with the ASFA comfortable standard?",
        a: "The full Age Pension ($29,754/year for singles in 2026-27) partially funds comfortable retirement ($51,278/year). If you receive the full Age Pension, you need an additional $21,524/year from super. Many retirees will be on a partial Age Pension (assets test or income test reduces the pension), meaning they need more from super. The super fund industry's Retirement Income Covenant (effective 1 July 2022) requires funds to help members target sustainable retirement income — funds now publish retirement income projections to help members see if they are on track.",
      },
      {
        q: "Is the 4% withdrawal rate appropriate for Australian retirees?",
        a: "The 4% rule originated from US research (the Trinity Study, 1998) using US market data. Australian-specific research (Finsia, 2019; various actuarial studies) suggests 3.5–4% is appropriate for Australian portfolios given Australia's dividend imputation system (which boosts returns for super fund share holdings), longevity risk (Australians have among the world's highest life expectancy), and the Age Pension backstop. The Australian Treasury's retirement income review (2020) used 4.5–5% drawdown for illustrative projections, noting that many retirees significantly under-draw from super.",
      },
    ],
    relatedSlugs: [
      "what-is-a-transition-to-retirement-strategy-australia",
      "can-i-retire-early-in-australia-what-is-fire",
      "when-can-i-access-my-super",
      "age-pension-assets-test-thresholds-australia",
    ],
    relatedTools: [
      { label: "Retirement calculator", href: "/retirement-calculator" },
    ],
  },
  {
    slug: "can-i-retire-early-in-australia-what-is-fire",
    category: "retirement",
    question: "Can I retire early in Australia? What is the FIRE movement?",
    metaTitle: "Early Retirement in Australia: FIRE Movement, Super Access & the 4% Rule (2026)",
    metaDescription:
      "FIRE (Financial Independence, Retire Early) is a movement to retire decades before 65 by saving 50–70% of income. In Australia, the challenge is super preservation age (60) — FIRE before 60 needs non-super assets. Learn the strategy.",
    shortAnswer:
      "The FIRE (Financial Independence, Retire Early) movement involves aggressively saving 50–70% of income to accumulate 25× your annual spending — enough to live off a 4% safe withdrawal rate indefinitely. In Australia, the key challenge is superannuation's preservation age of 60 — if you retire at 40 or 45, you cannot access super for 15–20 years. FIRE before 60 requires building sufficient non-super assets (shares, property, cash) to bridge the gap.",
    sections: [
      {
        heading: "How FIRE works: the 25x rule and 4% SWR",
        body: "FIRE's financial foundation is the safe withdrawal rate (SWR) research: studies of historical market returns (the 'Trinity Study' and subsequent updates) found that withdrawing 4% of your portfolio in year one of retirement and increasing for inflation has an extremely high probability of lasting 30 years. The corollary: to sustain a given lifestyle indefinitely, accumulate 25× your annual expenses (1 ÷ 0.04 = 25). If you spend $50,000/year, target $1.25M. If you spend $70,000/year, target $1.75M. The path to FIRE requires both: maximising your savings rate (saving 50–70% of income rather than the typical 5–20%) and investing savings in broad-market index funds for equity growth. A 70% savings rate historically leads to financial independence in approximately 8.5 years from a zero starting point.",
      },
      {
        heading: "The super preservation age challenge for Australian FIRE seekers",
        body: "Australia's superannuation system has a preservation age of 60 for those born after June 1964. Super cannot be accessed as a lump sum or income stream before preservation age (with limited exceptions: severe financial hardship, compassionate grounds, terminal illness, permanent incapacity). This means an Australian who achieves FIRE at age 40 cannot touch their super for 20 years. The solution: build a two-bucket portfolio. Bucket 1 (non-super): sufficient assets to fund your lifestyle from retirement date to preservation age. At a 4% SWR and 20-year bridge, you may need 70–80% of your total FIRE target in non-super assets. Bucket 2 (super): continue contributing and compounding until age 60, when you convert to a retirement pension. Employer SG contributions continue providing the incentive to not abandon super even in early FIRE.",
      },
      {
        heading: "FIRE variants and the Australian context",
        body: "Lean FIRE: living frugally on $30,000–$40,000/year, requiring a $750,000–$1M portfolio. Fat FIRE: living well on $100,000+/year, requiring $2.5M+. Barista FIRE (Coast FIRE): accumulating enough to coast to full retirement while working part-time for income and social engagement. In Australia, the Age Pension provides a genuine safety net below most FIRE target incomes — an early retiree's portfolio only needs to last until Age Pension age (67) on the non-super assets, after which Age Pension plus super drawdown provides a more robust floor. The franking credit system benefits FIRE investors holding Australian equity ETFs (dividend imputation boosts effective yield). FIRE is most achievable for high-income Australians in the technology, finance, law, and medicine sectors where savings rates of 50%+ are realistic.",
      },
    ],
    faqs: [
      {
        q: "What is the best investment strategy for FIRE in Australia?",
        a: "Most Australian FIRE practitioners use a combination of: broad-market index ETFs (e.g. VAS for Australian equities, VGS for global equities) for the non-super portfolio; maximising super contributions (salary sacrifice to the $30,000 concessional cap) for the super bucket; and possibly an investment property for passive income, though property is illiquid and less suited to the drawdown phase than shares. Low-cost index funds align with the FIRE philosophy of minimising fees — even a 1% MER difference compounds significantly over a 20-40 year accumulation phase.",
      },
      {
        q: "Does the Australian Age Pension affect FIRE planning?",
        a: "Yes, positively. The Age Pension (from age 67) acts as a substantial safety net for FIRE retirees who live long enough to access it. If your portfolio is depleted, the full Age Pension ($29,754/year for a single in 2026-27) provides a floor. Some FIRE proponents argue you can target a lower non-super portfolio by factoring in eventual Age Pension access — 'half-FIRE' strategies plan to live off a smaller portfolio until 67 and then reduce drawdown with Age Pension support. The assets test threshold means significant super balances will reduce Age Pension access, but partial pension is likely for most.",
      },
      {
        q: "How do I calculate my FIRE number in Australian dollars?",
        a: "Step 1: Calculate your annual spending in AUD (use actuals from your bank statements — be honest). Include all costs: housing, food, transport, health, travel, entertainment. Step 2: Subtract any passive income sources you will have (rental income, part-time work if planning Barista FIRE). Step 3: Multiply the net annual spending by 25 (4% SWR) to get your total FIRE number. For the pre-60 bridge: multiply the net annual spending by the number of years until age 60 — this is approximately the non-super target. Adjust for inflation (multiply by 1.03^n for n years). FIRE calculators like cFIREsim allow Monte Carlo simulation with Australian market inputs.",
      },
    ],
    relatedSlugs: [
      "asfa-retirement-standard-australia",
      "what-is-a-transition-to-retirement-strategy-australia",
      "when-can-i-access-my-super",
      "what-is-dollar-cost-averaging-australia",
    ],
    relatedTools: [
      { label: "Retirement calculator", href: "/retirement-calculator" },
      { label: "Compound interest calculator", href: "/compound-interest-calculator" },
    ],
  },

  // ── ADDITIONAL (5 new) ───────────────────────────────────────────────────────

  {
    slug: "how-to-set-financial-goals-australia",
    category: "budgeting",
    question: "How do you set and achieve financial goals in Australia?",
    metaTitle: "How to Set Financial Goals in Australia: SMART Framework (2026 Guide)",
    metaDescription:
      "Setting SMART financial goals — Specific, Measurable, Achievable, Relevant, Time-bound — is the foundation of personal financial planning. Learn how to prioritise goals, use automation, and adapt to Australian cost of living.",
    shortAnswer:
      "Effective financial goals in Australia should be SMART: Specific (save $20,000 house deposit), Measurable (track monthly progress), Achievable (consistent with your income), Relevant (aligned with your life priorities), and Time-bound (within 18 months). Rank goals by urgency: emergency fund first, then high-interest debt, then medium-term targets like a property deposit or car, then long-term wealth building through super and investments.",
    sections: [
      {
        heading: "The SMART framework for Australian financial goals",
        body: "Vague goals like 'save more money' fail because they have no deadline or measurement. SMART goals succeed because they create a clear plan. Example: 'Save $30,000 for a home deposit by 30 June 2028 by directing $800 per fortnight into a dedicated high-interest savings account.' Each element can be tracked and adjusted. In Australia, common financial goal milestones are: $2,000 starter emergency buffer (typically 2–4 months), $1,000 car maintenance reserve, $10,000–$30,000 emergency fund (3–6 months expenses), home deposit (20% of target purchase price in your market), and retirement readiness (super balance tracking to ASFA comfortable standard by age 67).",
      },
      {
        heading: "Prioritising competing goals",
        body: "Most Australians face multiple competing financial goals simultaneously. A practical priority order: (1) Build a $2,000 starter emergency fund — prevents new debt from small emergencies. (2) Get the employer super match — if your employer will match salary sacrifice contributions, capture this free money first. (3) Eliminate high-interest consumer debt (credit cards at 19–22%) — the guaranteed return is exceptional. (4) Build a full 3–6 month emergency fund. (5) Save for medium-term goals (house deposit, car, parental leave). (6) Maximise super contributions (concessional cap $30,000/year in FY2026) and build investment portfolio. Goals 1–4 are sequential prerequisites; goals 5 and 6 can run simultaneously once you have financial stability.",
      },
      {
        heading: "Automation and goal accounts",
        body: "The most effective implementation of financial goals uses automation and account separation. Set up named savings accounts for each goal — 'House Deposit', 'Emergency Fund', 'Car Replacement' — at a bank with competitive HISA rates. Schedule automatic transfers on payday to each account before the money reaches your everyday account. Review goals quarterly: have circumstances changed (new income, new expense, goal achieved)? Australian banking apps (ING, Up Bank, Macquarie) support multiple labelled savings pockets within a single account, making goal separation simple without requiring multiple bank relationships.",
      },
    ],
    faqs: [
      {
        q: "How do I set a realistic home deposit savings goal for Sydney or Melbourne?",
        a: "Start with your target suburb's median property price and your deposit target (20% to avoid LMI, or 5% with the First Home Guarantee). Subtract any existing savings and the First Home Super Saver Scheme (FHSS) amount you can withdraw ($50,000 max). Divide the gap by your monthly savings capacity. If the result is more than 7–10 years, reconsider: a smaller property, a different suburb, the FHBG (5% deposit with no LMI), or a co-purchase with a partner or family member.",
      },
      {
        q: "Should I set goals around my superannuation?",
        a: "Yes — though super goals are longer-dated. Useful super goal: 'Increase concessional contributions to $25,000/year by FY2027 via salary sacrifice.' Check your super balance against the ASFA Retirement Standard milestones: at age 35 you should target approximately $100,000–$150,000 to stay on track for a comfortable retirement at 67 (based on ASFA modelling). Most industry super funds provide online projections showing whether your current balance and contributions will reach a comfortable retirement.",
      },
      {
        q: "What tools help Australians track financial goals?",
        a: "Free tools: ATO's MoneySmart budget planner and savings calculator, MoneySmart's financial goal calculator, Up Bank's Savers pockets (for Up customers), and spreadsheet templates from MoneySmart. Paid tools: YNAB (You Need a Budget) — the most popular zero-based budgeting app in Australia — and PocketSmith (NZ/Australian focus, bank feed integration). Many major banks also provide spending categorisation and goal-tracking in their mobile apps.",
      },
    ],
    relatedSlugs: [
      "how-much-emergency-fund-australia",
      "what-is-the-50-30-20-budgeting-rule-australia",
      "how-to-avoid-living-paycheque-to-paycheque-australia",
    ],
    relatedTools: [
      { label: "Savings calculator", href: "/savings-calculator" },
      { label: "Compound interest calculator", href: "/compound-interest-calculator" },
    ],
  },
  {
    slug: "what-is-a-family-trust-australia",
    category: "business",
    question: "What is a family (discretionary) trust in Australia and how does it work?",
    metaTitle: "Family Trusts in Australia: How Discretionary Trusts Work for Tax (2026 Guide)",
    metaDescription:
      "A family discretionary trust lets a trustee distribute income to beneficiaries at their discretion each year, enabling income splitting. Learn the tax benefits, setup costs, and compliance obligations in Australia.",
    shortAnswer:
      "A family (discretionary) trust is a legal structure where a trustee holds and manages assets for the benefit of a class of beneficiaries, distributing income and capital at their discretion each year. The trustee chooses how much each beneficiary receives — allowing income to be directed to lower-tax-rate family members. Trusts are widely used in Australia for business income splitting, asset protection, and investment holding.",
    sections: [
      {
        heading: "How income splitting works in a family trust",
        body: "A discretionary trust does not pay tax itself — all income must be distributed to beneficiaries (or it is taxed at 47% in the trust). The trustee decides, by 30 June each year, how to allocate income among beneficiaries. In a family where the principal earner is on 45% marginal rate but has a spouse on 19% and adult children in the 0–19% bracket, distributing trust income to lower-bracket beneficiaries can save substantial tax. Example: $200,000 trust income distributed $90,000 to principal, $80,000 to spouse, $30,000 to adult child. Total tax is far less than if $200,000 went to the principal alone. From 1 July 2022 (following AAT's Owies case and ATO guidance), distributions to adult children must be carefully documented to withstand ATO scrutiny of 'effective economic benefit'.",
      },
      {
        heading: "Trust set-up and ongoing compliance",
        body: "Setting up a family trust requires: a trust deed (legal document specifying the trustee, beneficiaries class, and terms — typically $1,500–$3,500 from a solicitor or trustee company); appointment of a trustee (individual trustee or corporate trustee company); registration of the trust for an ABN and TFN; and potentially a corporate trustee company (recommended for asset protection and succession — ASIC registration $576 initial + $310/year). Annual compliance: the trust must lodge a trust tax return (Form T), record trustee distribution resolutions before 30 June, maintain financial statements, and keep trust records for 5 years. A trust cannot simply 'lend' money to beneficiaries without triggering trust deed terms or potential Division 7A issues if a company is involved.",
      },
      {
        heading: "Asset protection and estate planning uses",
        body: "Trusts provide asset protection because assets held in a trust belong to the trustee on behalf of beneficiaries — not personally to any individual. If a beneficiary is sued or goes bankrupt, trust assets are generally not accessible to their creditors (though courts can look through trusts in some circumstances). For estate planning, a trust can continue across generations without triggering capital gains events (unlike estate distributions, where CGT may apply on death). However, trusts do not receive the CGT discount at the trust level — capital gains are passed through to individual beneficiaries who claim the discount personally. Trusts do not have their own tax rate on capital gains.",
      },
    ],
    faqs: [
      {
        q: "Can a family trust hold shares and receive dividends?",
        a: "Yes. A family trust can hold a share portfolio and receive dividends, franking credits, and capital gains. Franking credits are distributed to beneficiaries who can offset them against their personal tax liability. The trust is a popular vehicle for holding share portfolios because of income splitting flexibility, though the CGT discount applies at the beneficiary level. Note: trusts cannot directly claim the CGT discount — individual beneficiaries do when they receive their share of the capital gain.",
      },
      {
        q: "What is the difference between a family trust and a company?",
        a: "A company is a separate legal entity that pays tax at 25–30% — retained earnings stay in the company. A family trust passes all income to beneficiaries and pays no tax itself — but the trustee must distribute (or risk 47% trust tax). A company suits profit retention and capital raising; a trust suits income splitting and flexibility. Many sophisticated structures use both: a family trust as the shareholder of a company, allowing income splitting on dividends and asset protection at both levels.",
      },
      {
        q: "Does a family trust have to distribute all income each year?",
        a: "Yes — under the trust taxation rules, all net income of a trust is assessed to beneficiaries in the year it is earned (whether distributed as cash or not). If the trustee does not make a distribution resolution before 30 June, the ATO taxes the accumulated income at 47%. Unlike a company, a trust cannot retain earnings within the structure for reinvestment without tax consequences. Some trusts hold investments that generate only capital gains (which can be unrealised) rather than income — these have more flexibility.",
      },
    ],
    relatedSlugs: [
      "sole-trader-vs-company-australia",
      "how-does-the-small-business-cgt-concession-work-australia",
      "what-is-division-7a-australia",
    ],
    relatedTools: [
      { label: "Find a financial adviser", href: "/financial-advisers" },
      { label: "CGT calculator", href: "/cgt-calculator" },
    ],
  },
  {
    slug: "how-to-choose-a-crypto-exchange-australia",
    category: "crypto",
    question: "How do you choose a cryptocurrency exchange in Australia?",
    metaTitle: "Best Cryptocurrency Exchanges in Australia: How to Choose (2026 Guide)",
    metaDescription:
      "Australian crypto exchanges must be registered with AUSTRAC. Compare fees, coin selection, security, AUD on/off ramp, and AUSTRAC registration when choosing where to trade crypto in Australia.",
    shortAnswer:
      "Australian cryptocurrency exchanges must be registered with AUSTRAC (the anti-money-laundering regulator). Key factors when choosing: AUSTRAC registration (mandatory), fee structure (maker/taker fees, deposit/withdrawal fees), AUD deposit and withdrawal options (bank transfer, PayID, OSKO), coin selection, security (cold storage, 2FA, insurance), and whether the exchange provides transaction reports for tax purposes. Major exchanges operating in Australia include CoinSpot, Independent Reserve, Swyftx, and international platforms with Australian operations.",
    sections: [
      {
        heading: "AUSTRAC registration: the mandatory baseline",
        body: "All cryptocurrency exchanges operating in Australia must be registered as a Digital Currency Exchange (DCE) provider with AUSTRAC under the Anti-Money Laundering and Counter-Terrorism Financing Act 2006. AUSTRAC publishes a register of all registered DCEs. Before depositing funds on any exchange, verify it appears on the AUSTRAC register at austrac.gov.au. Unregistered exchanges operate illegally in Australia and provide no regulatory recourse if funds are lost. In 2022, AUSTRAC fined several exchanges for non-compliance and deregistered others — the regulatory environment has tightened significantly since then. Australian-registered exchanges are also required to perform KYC (Know Your Customer) identity verification for all accounts.",
      },
      {
        heading: "Fee comparison: what to look for",
        body: "Crypto exchange fees vary significantly and compound over time for active traders. Spot trading fees: most Australian exchanges charge 0.1–1.0% per trade (maker/taker fee structure — makers who provide liquidity pay less than takers who fill orders). AUD deposit fees: bank transfers via OSKO/PayID are typically free; credit/debit card deposits attract 1.5–3% surcharges. Withdrawal fees: converting crypto back to AUD and withdrawing to bank account — typically free or small flat fee on reputable Australian exchanges. Network (gas) fees for on-chain withdrawals are set by the blockchain, not the exchange. For infrequent investors, a higher per-trade fee is less important than platform reliability and AUD access. For active traders, even 0.1% fee differences multiply significantly over many trades.",
      },
      {
        heading: "Security, custody, and tax reporting features",
        body: "Security: look for exchanges that keep the majority of funds in cold storage (offline), provide two-factor authentication (2FA — use an authenticator app, not SMS), and ideally carry crime insurance covering theft or hacks. Reputable Australian exchanges publish proof-of-reserves or undergo third-party audits. Tax reporting: Australian crypto investors are required to report all transactions to the ATO. Choose an exchange that provides downloadable transaction histories in CSV format compatible with Australian crypto tax software (Koinly, CryptoTaxCalculator, Syla). Some exchanges provide built-in tax reports (cost base calculation, capital gains summaries) — a significant time-saver at year end.",
      },
    ],
    faqs: [
      {
        q: "Can I use overseas exchanges like Binance or Coinbase from Australia?",
        a: "Australians can use international exchanges that have registered their Australian-facing operations with AUSTRAC. Binance Australia operated and then exited the Australian market in 2023 due to banking relationship difficulties — its international platform (Binance.com) is not registered as an Australian DCE and using it may leave you without regulatory protection. Coinbase's international platform is not AUSTRAC-registered. Independent Reserve, CoinSpot, Swyftx, and Kraken (through Australian operations) are among the major AUSTRAC-registered platforms. Using a non-AUSTRAC-registered exchange does not make you legally liable, but you have no recourse under Australian law if funds are lost.",
      },
      {
        q: "What is OSKO and PayID and why does it matter for crypto?",
        a: "OSKO and PayID are near-instant bank transfer systems in Australia (operated by the NPP — New Payments Platform). Most major Australian crypto exchanges support PayID deposits, meaning you can transfer AUD from your bank account to the exchange in seconds (rather than waiting 1–2 business days for traditional bank transfers). This is important for seizing time-sensitive market opportunities. Some exchanges also support BPAY for deposits, though this is slower. PayID deposits are typically free with no surcharges.",
      },
      {
        q: "Should I leave my crypto on the exchange or transfer to a wallet?",
        a: "The crypto security maxim is 'not your keys, not your coins.' Keeping crypto on an exchange means trusting the exchange's security — if the exchange is hacked, defrauded, or goes insolvent (as happened with FTX globally in 2022), you may lose access. For significant holdings (above $10,000–$20,000), consider a hardware wallet (Ledger, Trezor) for cold storage. For small amounts and active trading, exchange storage is convenient. The tradeoff: hardware wallets require careful private key management — lose your seed phrase and you lose your crypto permanently.",
      },
    ],
    relatedSlugs: [
      "how-is-cryptocurrency-taxed-in-australia",
      "what-is-the-ato-approach-to-crypto-reporting-australia",
      "can-you-hold-cryptocurrency-in-an-smsf-australia",
    ],
    relatedTools: [
      { label: "CGT calculator", href: "/cgt-calculator" },
    ],
  },
  {
    slug: "do-i-need-private-health-insurance-australia",
    category: "insurance",
    question: "Do I need private health insurance in Australia?",
    metaTitle: "Do You Need Private Health Insurance in Australia? Medicare vs PHI (2026 Guide)",
    metaDescription:
      "Medicare covers most essential health services, but private health insurance can reduce wait times, offer extra coverage, and help avoid the Medicare Levy Surcharge. Learn when PHI makes financial sense in Australia.",
    shortAnswer:
      "Private health insurance (PHI) is not mandatory in Australia — Medicare provides universal coverage for essential medical treatment. However, high earners (single income above $93,000; family above $186,000) pay the Medicare Levy Surcharge (MLS) of 1–1.5% unless they hold hospital cover. PHI also reduces public hospital wait times for elective surgery, provides access to private hospitals, and includes extras like dental, optical, and physiotherapy not covered by Medicare.",
    sections: [
      {
        heading: "Medicare vs private health insurance",
        body: "Australia's Medicare system provides: free treatment as a public patient in public hospitals, rebates for GP and specialist consultations (Medicare rebate typically 85% of the schedule fee for out-of-hospital services), and access to the Pharmaceutical Benefits Scheme (PBS) for subsidised medicines. What Medicare does not cover: private hospital accommodation, choice of surgeon, dental (except limited emergency), optical, physiotherapy, podiatry, psychology (beyond 10 Mental Health Plan sessions), and ambulance (varies by state). Private health insurance fills these gaps. Hospital cover pays for private hospital room, meals, and theatre fees. Extras (ancillary) cover pays rebates for dental, optical, physio, and allied health services up to annual benefit limits.",
      },
      {
        heading: "The Medicare Levy Surcharge and Lifetime Health Cover loading",
        body: "Two financial incentives push higher-income Australians toward PHI. Medicare Levy Surcharge (MLS): if your income exceeds $93,000 (single) or $186,000 (family) and you do not hold hospital cover, you pay an extra 1–1.5% MLS on top of the standard 2% Medicare Levy. At $100,000 income, the 1% MLS is $1,000/year — often exceeding the cost of basic hospital cover ($800–$1,200/year), making PHI financially rational even ignoring health benefits. Lifetime Health Cover (LHC) loading: if you do not take out hospital cover before 1 July following your 31st birthday, you pay a 2% loading on your hospital premiums for every year you delay — up to a maximum of 70% loading. Taking out hospital cover at 31 is significantly cheaper than waiting until 40.",
      },
      {
        heading: "How to choose the right level of cover",
        body: "Hospital cover tiers (as of April 2019 reforms): Basic, Bronze, Silver, Gold. Basic is the minimum to avoid MLS. Gold covers all hospital treatment categories including joint replacements and pregnancy. Extras cover is highly discretionary — calculate your likely annual dental, optical, and physiotherapy costs versus the premium paid. Typical extras cover: $1,200–$2,000/year premium, annual dental benefit limit $500–$800, optical $150–$250, physiotherapy $400–$600. Many people find they claim less than they pay in extras premiums — calculate your historical usage before purchasing. The Australian Government's privatehealth.gov.au comparison tool allows side-by-side comparison of all approved private health insurance products.",
      },
    ],
    faqs: [
      {
        q: "Is private health insurance tax deductible in Australia?",
        a: "Private health insurance premiums are not directly tax-deductible for individuals. However, the government provides a Private Health Insurance Rebate — a means-tested subsidy that reduces your premium cost. The rebate is 24.608% for singles earning under $93,000 and reduces to 0% for incomes above $140,000. You can claim the rebate as a premium reduction (paid directly to your insurer, reducing your annual premium) or as a tax offset in your tax return. The rebate effectively makes a portion of your premium government-subsidised.",
      },
      {
        q: "Can I use my super to pay private health insurance premiums?",
        a: "No — private health insurance premiums cannot be paid from superannuation directly. However, if you have income protection insurance inside super, premiums are paid from your super balance. Once you retire and start drawing a pension from super, you can use that pension income to pay PHI premiums. Some employer salary packaging schemes (particularly for non-profit/hospital employees) allow PHI premiums to be packaged through salary sacrifice.",
      },
      {
        q: "What is the 'excess' and 'gap' in private health insurance?",
        a: "The excess is the amount you pay out of pocket when you are admitted to hospital — typically $250, $500, or $750. Choosing a higher excess reduces your annual premium. The gap is the difference between what your surgeon or specialist charges and what Medicare plus your fund pays. Doctors can charge above the MBS schedule fee — if your insurer offers 'no gap' arrangements with certain doctors, the gap is covered. Always ask your doctor or hospital if they participate in your fund's no-gap scheme before a procedure.",
      },
    ],
    relatedSlugs: [
      "types-of-life-insurance-australia",
      "what-is-trauma-insurance-australia",
      "income-protection-insurance-vs-workers-compensation-australia",
    ],
    relatedTools: [
      { label: "Compare life insurance", href: "/life-insurance" },
    ],
  },
  {
    slug: "what-is-the-age-pension-income-test-australia",
    category: "retirement",
    question: "How does the Age Pension income test work in Australia?",
    metaTitle: "Age Pension Income Test in Australia: Thresholds & Deeming Explained (2026)",
    metaDescription:
      "The Age Pension income test uses actual income plus deemed income from financial assets to assess entitlements. Learn the deeming rates, the pension reduction formula, and how super in accumulation phase is treated.",
    shortAnswer:
      "The Age Pension income test reduces your pension by 50 cents for every dollar of income above the threshold ($204/fortnight for singles; $360/fortnight for couples combined). Investment income from financial assets (super, bank accounts, shares) is assessed using the deeming rate (2.25% above $62,600 for singles as of 2026) rather than actual returns, regardless of what the assets actually earn.",
    sections: [
      {
        heading: "How the income test works",
        body: "Centrelink applies both an assets test and an income test to Age Pension eligibility — the test that produces the lower pension amount applies. The income test counts: employment income, business income, rental income (net of expenses — but not the same deductions as the ATO's investment property rules), overseas pensions, and deemed income from financial investments. The reduction rate is 50 cents per dollar of income above the threshold. For a single person with $600/fortnight income above the threshold ($204), the pension reduction is $300/fortnight — so pension income is reduced from the full rate ($1,144/fortnight in 2026-27) by $300, leaving $844/fortnight.",
      },
      {
        heading: "Deeming rates: how financial assets are assessed",
        body: "Rather than assessing actual investment returns (which vary with market conditions), Centrelink deems financial assets to earn a standardised return. Deeming rates (2026): 0.25% on financial assets up to $62,600 (singles) or $103,800 (couples combined); 2.25% above those thresholds. Financial assets include: savings accounts, term deposits, super in drawdown phase (account-based pensions for those reaching Age Pension age after 1 January 2015), shares, managed funds, and crypto. Key exception: superannuation in accumulation phase for people below Age Pension age is not assessed under the income test (though it is assessable once the holder reaches pension age).",
      },
      {
        heading: "Strategies to manage income test exposure",
        body: "For retirees approaching the Age Pension income test threshold: (1) If drawing more super than needed, reduce account-based pension payments to the 4% minimum — deeming applies to the balance regardless of what you draw, but drawing less may help with the assets test. (2) Gifting rules: you can gift $10,000/year (up to $30,000 over 5 years) without the gifted amount continuing to be counted — excess gifting is assessed under the assets test for 5 years. (3) Pre-retirement home improvements: spending on your principal home (assessed-exempt asset) reduces financial assets subject to deeming. (4) Funeral bonds up to $15,000 are exempt from both tests — can be a small planning tool. Always model the interaction of income test, assets test, and the combined rate of pension reduction before making large financial moves.",
      },
    ],
    faqs: [
      {
        q: "What is the income-free area for the Age Pension?",
        a: "The income-free area is the amount of income you can receive without any reduction in your Age Pension. As of 2026-27: $204/fortnight for singles, $360/fortnight for couples combined ($180 each). These thresholds are indexed to CPI movements in March and September each year. Additionally, the Work Bonus allows pensioners who earn employment income to have the first $300/fortnight of employment income exempt from the income test — up to a maximum accrual of $11,800 in the pensioner's 'Work Bonus Balance'.",
      },
      {
        q: "Are account-based pensions (super drawdown) assessed under the income test?",
        a: "For people who reached Age Pension age on or after 1 January 2015, account-based pensions are subject to deeming under the income test (the balance is deemed to earn the standard rates regardless of actual payments). For grandfathered pensioners (reached age pension age before 1 January 2015 and had a pre-existing account-based pension), the pension payments themselves are counted as income — not deeming. Grandfathered status is lost if the account is rolled over to a new product.",
      },
      {
        q: "How does rental income affect the Age Pension?",
        a: "Net rental income (rent received minus allowable deductions — mortgage interest, rates, insurance, repairs, management fees, and depreciation on a continuing basis) is counted as income for the Age Pension income test. The deductions are similar to but not identical to ATO deductions — check with Services Australia for the exact formula. Negative gearing losses are not offset against other income for Centrelink purposes. If your investment property is positively geared, the net income increases your assessable income and may reduce your pension.",
      },
    ],
    relatedSlugs: [
      "asfa-retirement-standard-australia",
      "can-i-retire-early-in-australia-what-is-fire",
      "age-pension-assets-test-thresholds-australia",
      "how-to-use-ttr-to-reduce-work-hours-australia",
    ],
    relatedTools: [
      { label: "Retirement calculator", href: "/retirement-calculator" },
    ],
  },
];

/** Lookup by slug — O(1) for static-generation. */
export const QUESTIONS_BY_SLUG = new Map<string, InvestingQuestion>(
  QUESTIONS.map((q) => [q.slug, q])
);

/** Sorted list of unique categories. */
export const QUESTION_CATEGORIES: QuestionCategory[] = [
  ...new Set(QUESTIONS.map((q) => q.category)),
].sort() as QuestionCategory[];

export const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  tax: "Tax",
  super: "Superannuation",
  property: "Property",
  investing: "Investing",
  retirement: "Retirement",
  budgeting: "Budgeting",
  business: "Business",
  crypto: "Cryptocurrency",
  insurance: "Insurance",
};
