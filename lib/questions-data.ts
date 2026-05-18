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
  | "business";

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
};
