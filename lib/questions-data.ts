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
