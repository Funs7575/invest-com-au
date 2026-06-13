import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";
import AdvisorPrompt from "@/components/AdvisorPrompt";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Rental Property Tax Australia (${CURRENT_YEAR}) — Complete Deductions Guide`,
  description: `What you can (and cannot) deduct for an Australian rental property: interest, depreciation, repairs, management fees. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Rental Property Tax Australia (${CURRENT_YEAR}) — Deductions, Depreciation & Gearing`,
    description:
      "Complete guide to rental property tax in Australia — what you can deduct, how depreciation works, negative vs positive gearing, and ATO record-keeping rules.",
    url: absoluteUrl("/tax/rental-property"),
    images: [{ url: `/api/og?title=${encodeURIComponent("Rental Property Tax Australia")}&sub=${encodeURIComponent("Deductions · Depreciation · Negative Gearing · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: absoluteUrl("/tax/rental-property") },
};

// ─── Static data ───────────────────────────────────────────────────────────────

const DEDUCTIBLE_ITEMS = [
  {
    label: "Loan interest",
    detail: "Investment-loan portion only (not principal). Split if the loan covers mixed purposes.",
  },
  {
    label: "Property management fees",
    detail: "Typically 7–10% of gross rent charged by the managing agent, plus letting fees and lease-renewal fees.",
  },
  {
    label: "Council & water rates",
    detail: "Fully deductible in the year paid (or accrued if you use an accruals method).",
  },
  {
    label: "Landlord insurance",
    detail: "Building insurance, contents insurance, and landlord liability cover.",
  },
  {
    label: "Repairs & maintenance",
    detail:
      "Work that restores the property to its original condition — not improvements. Deductible in the year incurred.",
  },
  {
    label: "Depreciation (Div 43 & Div 40)",
    detail:
      "Building allowance (2.5%/yr on construction cost post-Sep 1987) and plant & equipment wear-and-tear — see the depreciation section below.",
  },
  {
    label: "Body corporate / strata fees",
    detail: "Annual levies are deductible. Special levies for capital work are generally not (they add to cost base).",
  },
  {
    label: "Advertising for tenants",
    detail: "Online listing fees, print ads, and photography costs between tenancies.",
  },
  {
    label: "Bank charges",
    detail: "Account-keeping fees on your investment loan account, loan establishment fees (over the loan term).",
  },
  {
    label: "Accountant & tax agent fees",
    detail: "Fees for preparing the rental schedule and investment tax advice.",
  },
  {
    label: "Land tax",
    detail: "Deductible where levied on the income-producing property (rules differ by state).",
  },
  {
    label: "Pest control, gardening & cleaning",
    detail: "Ongoing maintenance to keep the property in a rentable condition.",
  },
];

const NON_DEDUCTIBLE_ITEMS = [
  {
    label: "Principal repayments",
    detail:
      "The principal component of your mortgage repayment is not deductible — only the interest portion.",
  },
  {
    label: "Purchase costs",
    detail:
      "Stamp duty, conveyancing, building inspections at acquisition — these go into the cost base for CGT instead.",
  },
  {
    label: "Capital improvements",
    detail:
      "Renovations that improve the property beyond its original state (e.g., adding a deck, new kitchen) are capital expenditure — not immediately deductible. Add to cost base or depreciate under Div 43.",
  },
  {
    label: "Travel to inspect property",
    detail:
      "Abolished from 1 July 2017. You can no longer deduct travel to inspect, collect rent, or carry out maintenance at a residential rental property.",  // dated-ok
  },
  {
    label: "Borrowing costs (immediate)",
    detail:
      "Loan establishment fees, mortgage insurance, and title search fees are spread over the lesser of the loan term or 5 years — not deducted upfront.",
  },
  {
    label: "Private-use periods",
    detail:
      "Expenses during periods the property was unavailable for rent (e.g. you used it as a holiday house) must be apportioned and the private-use portion disallowed.",
  },
];

const SECTIONS = [
  {
    id: "what-qualifies",
    heading: "What is a rental property for tax purposes?",
    body: `For Australian tax purposes, a rental property is any property you rent out or make genuinely available for rent. The ATO's definition is intentionally broad:

**Income-producing property includes:**
- Residential houses, apartments, and townhouses let to long-term tenants
- Holiday homes and investment properties listed on short-term platforms (Airbnb, Stayz) — but only the portion of time the property is genuinely available to the public at a market rate
- Commercial properties (separate rules apply — GST, commercial depreciation schedules)
- Granny flats and secondary dwellings rented separately

**The "available for rent" test:** A property only needs to be available for rent to qualify — it doesn't need to be continuously occupied. However, if you only make it available to friends at below-market rates, or you list it at an unrealistically high price to avoid tenants, the ATO may treat it as not genuinely available and deny deductions for vacant periods.

**Mixed use (holiday home):** If you personally use the property for some weeks and rent it out for others, you must apportion income and expenses on a time basis. Only the proportion relating to the rental period is deductible. The 6-year absence rule (discussed below) may interact with this for your main residence.

**Not rental property:**
- Your principal place of residence (PPOR) — unless you derive rental income by renting out a room
- A holiday house held purely for private use with no genuine rental activity`,
  },
  {
    id: "what-you-can-deduct",
    heading: "What you can deduct — the complete list",
    body: `Rental property deductions fall into three categories: immediately deductible expenses, borrowing costs spread over time, and depreciation (non-cash deductions for capital decline).

**Immediately deductible:**
All ordinary costs of earning rental income are deductible in the year you incur them. The most significant are: loan interest, property management fees (7–10% of rent is typical), council and water rates, landlord insurance, repairs and maintenance, body corporate levies, advertising, bank charges, land tax, and gardening or cleaning.

**Borrowing costs (amortised):**
If your total borrowing costs (loan establishment fee, mortgage stamp duty, title search fees, lenders mortgage insurance) exceed $100, they are deducted proportionally over the shorter of the loan term or five years. Amounts under $100 are deducted upfront in Year 1.

**Depreciation — the non-cash deduction:**
Depreciation under Division 43 (building allowance) and Division 40 (plant and equipment) reduces your taxable rental income without any cash outlay. See the dedicated depreciation section below for full detail.

**Interest — the most important deduction:**
The interest on money borrowed to purchase or improve an investment property is deductible. The key rule is purpose: you can only deduct interest that relates to the income-producing use of the borrowed funds. If the same loan funded both investment and personal purposes (e.g., you drew down on an offset-linked home loan), you must apportion. Paying down personal debt first and keeping investment debt separate is the most common strategy to preserve interest deductibility.

**Property management fees in detail:**
Managing agents typically charge:
- Management fee: 7–10% of collected rent (varies by state and property type)
- Letting fee: 1–2 weeks rent when a new tenant is placed
- Lease renewal fee: 0.5–1 week rent
- Routine inspection fees: $30–$80 per inspection
All of these are deductible in the year incurred.`,
  },
  {
    id: "cannot-deduct",
    heading: "What you cannot deduct",
    body: `Several costs relating to investment property are specifically excluded from immediate deductions. Getting this wrong can attract ATO scrutiny and penalties.

**Principal repayments:** The single most common error. The repayment of loan principal reduces your debt — it is not a cost of earning income. Only the interest component of each repayment is deductible.

**Purchase costs go to cost base:** Stamp duty, legal fees, conveyancing, and building/pest inspection costs at purchase are not deductible expenses. Instead, they form part of the property's cost base for CGT purposes — they reduce your capital gain when you eventually sell.

**Capital improvements vs repairs:** The distinction between a repair (deductible) and a capital improvement (not immediately deductible) is one of the most litigated areas of rental tax. A repair restores something to its original working condition — fixing a leaking roof, replacing broken tiles, repainting. A capital improvement makes the property better than it was — adding a deck, installing a dishwasher where there wasn't one, converting a carport to a garage. Capital improvements must be either added to cost base or depreciated under Division 43 (building works) over 25–40 years.

**Travel to inspect:** From 1 July 2017, travel expenses for residential rental property are no longer deductible. This includes travel to collect rent, carry out repairs, or inspect the property. The exception is if property management and inspection is your main income-producing activity (i.e., you're a property manager as a business).  // dated-ok

**Private-use apportionment:** Expenses during periods the property was used privately — including a holiday home you use for some of the year — must be apportioned. Only the rental-available proportion is deductible.

**Pre-tenancy and post-vacancy expenses:** Expenses incurred before the property was first rented or after it is no longer available for rent may be disallowed if there is a long gap between private use and rental.`,
  },
  {
    id: "depreciation",
    heading: "Depreciation explained — Division 43 and Division 40",
    body: `Depreciation is one of the most powerful rental property deductions because it reduces your taxable income without requiring a cash outlay. It recognises that buildings and their contents wear out over time.

**Division 43 — Building Allowance:**
Division 43 allows a deduction for the decline in value of the building structure itself (not the land). Key rules:
- Rate: 2.5% of the original construction cost per year (or 4% for buildings built between 18 July 1985 and 26 February 1992)  // dated-ok
- Only applies to residential buildings originally constructed after 17 September 1987  // dated-ok
- Applies to commercial buildings regardless of construction date (different rules)
- You claim on the original construction cost — not the price you paid for the property
- If you do not know the original construction cost, a quantity surveyor estimate is required
- The building allowance reduces your cost base dollar-for-dollar when you sell (which increases your eventual capital gain)

**Example — Div 43 on a $600K property:**
If the original construction cost was $200,000, you claim $200,000 × 2.5% = $5,000 per year as a building allowance deduction, regardless of what you paid for the property.

**Division 40 — Plant & Equipment:**
Division 40 covers the depreciable "plant and equipment" items within a property — things that can be removed: hot water systems, air conditioners, carpets, blinds, ceiling fans, dishwashers, ovens, smoke alarms.

**The 2017 Budget rule — critical for used properties:**
From 9 May 2017 (2017 Budget), Division 40 claims were restricted for residential investment properties. You can only claim Div 40 depreciation on plant and equipment items:  // dated-ok
1. That you purchased new (never previously used), OR
2. That you personally installed or acquired new after purchasing the property

If you purchased an established residential property after 9 May 2017, you generally CANNOT claim Division 40 depreciation on the pre-existing fittings and fixtures. The assets are notionally "excluded" from your depreciation schedule for those items. Note: new builds purchased off-the-plan are not affected — all plant and equipment in a new property qualifies.  {/* // dated-ok */}

**Effective life schedules:**
The ATO publishes effective life tables for every type of plant and equipment. Some common examples:
- Hot water system: 12 years (8.33%/yr diminishing value or 5.88% prime cost)
- Air conditioner (split system): 10 years
- Carpet: 10 years
- Blinds/curtains: 6 years
- Oven/cook top: 12 years
- Smoke alarm: 6 years

**Depreciating assets below $1,000:**
Low-value assets (under $1,000 after the first year) can be pooled in a low-value pool and depreciated at 37.5% per year (18.75% in the first year of pooling).`,
  },
  {
    id: "quantity-surveyor",
    heading: "Quantity surveyor reports — when you need one and what they cost",
    body: `A tax depreciation schedule (also called a depreciation report) prepared by a registered quantity surveyor (QS) is effectively mandatory if you want to claim Division 43 and Division 40 depreciation on an existing property.

**Why you need a QS report:**
The ATO requires that depreciation claims be based on a reasonable estimate of construction costs and effective lives. Unless you built the property yourself (in which case you have actual cost records), you need a QS to inspect the property and estimate:
- The original construction cost of the building (for Div 43)
- The value and effective life of each depreciable plant and equipment item (for Div 40, where eligible)

**Cost of a QS report:** Typically $500–$1,000 depending on property size and location. The fee itself is tax-deductible as a cost of managing your tax affairs.

**How many years does it last?**
A depreciation schedule is prepared once and lasts the life of the property. It is updated when you make capital improvements (the QS adds the new works to the schedule). Most QS firms provide a multi-decade projection showing annual deductions falling gradually over time as assets reach the end of their effective lives.

**When a QS report is NOT cost-effective:**
- Properties built before September 1987 (no Div 43 allowance applies to the structure)
- Established properties purchased after May 2017 where no eligible Div 40 items exist and the building is older (lower Div 43 base)
- Properties where the expected depreciation deductions are minimal relative to the QS fee
- A good rule of thumb: if estimated annual depreciation is under $2,000, the QS fee may take several years to recoup

**Qualified preparers:**
QS firms must be registered with the Australian Institute of Quantity Surveyors (AIQS) or equivalent. The ATO does not accept depreciation schedules prepared by the property owner, the real estate agent, or an unqualified third party.`,
  },
  {
    id: "repairs-vs-improvements",
    heading: "Repairs vs capital improvements — the critical distinction",
    body: `The ATO's repair-vs-improvement distinction determines whether you get an immediate deduction or are forced to depreciate the cost (or add it to cost base) over many years.

**Repairs — immediately deductible:**
A repair restores an asset to its former condition without changing its character. Common deductible repairs:
- Fixing a broken fence to its original state
- Replacing a section of damaged guttering (same material, same functionality)
- Repainting interior walls that have deteriorated
- Fixing a leaking tap or broken window
- Replacing worn carpet with equivalent carpet
- Plumbing repairs to restore original function

**Capital improvements — not immediately deductible:**
A capital improvement makes the property materially better than it was, or changes its character. Examples:
- Adding a deck, pergola, or pool that did not exist before
- Installing ducted air conditioning in a property that had window units
- Converting a single garage to a double garage
- Replacing a standard kitchen with a premium renovation
- Replacing a wooden floor with marble (significant upgrade in quality)
- Adding a second bathroom where one did not exist

**The "initial repairs" trap:**
If you purchase a property that needs work and carry out repairs before it has ever been rented, those repairs may be classified as "initial repairs" — capital expenditure, not deductible repairs. The ATO takes the view that the cost was factored into the purchase price.

**The "replacement" grey area:**
Replacing an entire asset (replacing a whole roof rather than patching it; replacing an entire fence rather than fixing a section) is more likely to be treated as a capital improvement than a repair. The test is whether you are restoring the original functionality or effectively acquiring a new asset.

**Mixed work:**
Where a single job includes both repairs and improvements (e.g., fixing storm damage plus upgrading the roof material), you must apportion the cost. The repair portion is deductible; the improvement portion is capitalised.

**Practical tip:**
If you are uncertain, get two quotes — one for a like-for-like repair and one for the upgrade — and document the incremental cost of any improvement. The ATO accepts that only the improvement component need be capitalised.`,
  },
  {
    id: "rental-income",
    heading: "What counts as rental income?",
    body: `Gross rental income is assessable in the year you receive it (cash basis for most individuals). The ATO's definition of assessable rental income is broader than just the rent cheques:

**Included in rental income:**
- Gross rent received from tenants (weekly/monthly rent × weeks/months occupied)
- Rent in advance received in a prior year — technically assessable when received, but see transitional rules
- Retained security deposits (bond money) where you have made a claim and the bond is awarded to you — the retained amount is income in the year you retain it. A deposit merely held in trust is not income.
- Insurance payouts for loss of rent (e.g., tenant damage, rental default insurance claim proceeds)
- Reimbursements from tenants for repairs or utility charges they were contractually liable for
- Letting fees paid back by a new tenant (uncommon but assessable)
- Government rental assistance or subsidies paid directly to you

**Not rental income:**
- Bond money held in a state bond board trust (it remains the tenant's money until a dispute is resolved)
- Deposits forfeited before a lease commences (may be treated as ordinary income — seek advice)
- Capital grants or first home buyer grants (not assessable rental income)

**Timing rules:**
Cash-basis taxpayers (individuals not in a business) include rental income in the year they actually receive it. If rent is paid in advance crossing a financial year (e.g., tenant pays 3 months in advance in May covering through August), the prepaid component for the following year is still assessable in the year of receipt for most individuals.

**Gross vs net:**
You always report gross rental income and claim deductions separately. Never report net rent (after subtracting agent fees) — you must gross up both the income and the deductions.`,
  },
  {
    id: "negative-positive-gearing",
    heading: "Negative vs positive gearing — the tax line",
    body: `Whether your investment property is negatively or positively geared is simply a question of arithmetic: are your allowable deductions more or less than your rental income?

**Negative gearing (deductions > income):**
If your total deductible expenses (interest, management fees, rates, insurance, repairs, depreciation, etc.) exceed your gross rental income, the net loss is offset against your other income — typically your salary.

Example: $25,000 rental income − $35,000 total deductions = $10,000 net rental loss.
This $10,000 loss is deducted from your salary income. At a 47% marginal tax rate (45% + 2% Medicare Levy), you save $4,700 in income tax for the year.

The tax saving does not make you cash-positive — your real annual cash shortfall is $10,000 minus the $4,700 tax refund = $5,300 out of pocket. The strategy only makes long-term sense if capital growth exceeds the cumulative net losses.

**Positive gearing (income > deductions):**
If your rental income exceeds all deductible costs, you have a net rental profit. This is added to your taxable income and taxed at your marginal rate.

This is common in regional areas with high rental yields relative to property prices, or in later years when the loan balance has decreased significantly and interest costs fall.

**Neutral gearing:**
When income approximately equals costs. No tax impact in the current year, but you are still building equity and (hopefully) benefiting from capital growth.

**The gearing shift over time:**
Most investment properties start negatively geared and shift toward neutral or positive gearing as:
- Rents increase with inflation and market demand
- Interest costs fall as the loan balance reduces (on P&I loans)
- Depreciation deductions naturally diminish over time

**Tax variation (PAYG withholding variation):**
If you expect to be negatively geared, you can apply to the ATO to reduce your PAYG withholding each pay cycle, effectively receiving the tax benefit in each pay cheque rather than waiting for your annual refund. This is done via a PAYG withholding variation application (ATO Form NAT 2036).`,
  },
  {
    id: "worked-example",
    heading: "Worked example — $550K investment property",
    body: `This worked example illustrates how a typical negatively geared investment property is reported at tax time.

**Property details:**
- Purchase price: $550,000
- Investment loan: $440,000 at 6.5% interest = $28,600 annual interest
- Construction cost (estimated by QS): $220,000 (built 1999)
- Annual rent: $500/week × 50 weeks occupied = $25,000

**Rental income:**
$25,000 gross rent

**Deductible expenses:**
- Loan interest: $28,600
- Property management fee (8.5%): $2,125
- Council rates: $1,800
- Landlord insurance: $1,200
- Repairs and maintenance: $900
- Div 43 building allowance (2.5% × $220,000): $5,500
- Div 40 plant & equipment depreciation (QS estimate): $1,800
- Body corporate fees: $2,400
- Bank charges: $150
- Accountant fee (rental schedule): $400
**Total deductions: $44,875**

**Net rental result:**
$25,000 income − $44,875 deductions = −$19,875 net loss

**Tax saving at 47% MTR (income $200K+):**
$19,875 × 47% = $9,341 tax saving

**Real cash position:**
- Gross cash outflows during the year: ~$39,375 (interest + non-depreciation cash costs)
- Rental income received: $25,000
- Cash shortfall before tax: $14,375
- Tax refund/reduction: $9,341
- Net annual cash cost (after tax): approximately $5,034

**Key observations from the example:**
1. Depreciation ($5,500 Div 43 + $1,800 Div 40 = $7,300) contributes significantly to the loss without any cash outlay.
2. At a lower marginal rate of 32.5%, the tax saving would be only $6,459 and the net cash cost would jump to $7,916.
3. The cost base starts at $550,000 plus purchase costs (stamp duty ~$21,000 + legals ~$2,000 = ~$573,000). It reduces over time as Div 43 building allowance is claimed.`,
  },
  {
    id: "short-term-rental",
    heading: "Short-term rental (Airbnb) — different rules apply",
    body: `Short-term rental platforms (Airbnb, Stayz, Vrbo) are popular with Australian property owners, but the tax treatment differs in important ways from long-term residential letting.

**Same core principle:**
Income from short-term rentals is still assessable income, and expenses relating to the rental period are still deductible. The core difference is apportionment.

**Pro-rata for mixed personal/rental use:**
If you rent your property through Airbnb for part of the year and use it yourself for the rest, you must apportion all expenses based on the proportion of time it is genuinely available for rent at market rates.

Example: A coastal holiday house is rented for 20 weeks and used personally for 10 weeks, vacant 22 weeks. The "available for rent" ratio is 20/42 of the non-personally-used time, but the ATO generally treats it as: rental weeks ÷ total weeks in the year.

If the property is available (listed and bookable) for 30 weeks and personally used for 8 weeks:
- Rental-period expenses: deductible
- Personally-used period expenses: not deductible
- Vacant periods where genuinely listed at market rate: arguably deductible (ATO accepts reasonable vacancy periods between rentals)

**Inflated "unavailability" — ATO alert:**
If you list a property at a clearly above-market nightly rate to discourage bookings while claiming deductions for the whole year, the ATO will likely disallow deductions for that period. The listing must reflect genuine market intent.

**6-year absence rule and Airbnb:**
If your main residence is your principal place of residence (PPOR) and you temporarily rent it out (e.g., move overseas for a couple of years), the 6-year absence rule may allow you to retain the PPOR CGT exemption for up to 6 years. However, if you derive rental income during that absence, you cannot claim the full PPOR exemption — the CGT-free period is proportional to the non-rental portion of your ownership.

**GST consideration:**
Short-term residential accommodation is input-taxed for GST purposes — you do not charge GST and generally cannot claim GST credits. However, if your Airbnb operation is considered a commercial residential premises arrangement (e.g., providing substantial hotel-like services), different rules may apply. Seek advice if your operation resembles a hotel or serviced apartment model.`,
  },
  {
    id: "co-ownership",
    heading: "Co-ownership — each owner reports their share",
    body: `When two or more people own a rental property together, each owner reports their share of the income and expenses in their own tax return — not a combined return.

**Joint tenants vs tenants in common:**
- **Joint tenants:** Each owner holds an equal, undivided interest (50/50 for two owners). Income and expenses are split equally.
- **Tenants in common:** Owners hold defined percentage interests that do not need to be equal. A 70/30 split is valid. Each owner reports their respective percentage of income and expenses. This is commonly used between spouses at different marginal rates to direct more income to the lower-earning partner.

**The 50/50 default does not always apply:**
Many couples assume a 50/50 split is automatic. If you hold as tenants in common with an unequal split (e.g., 80/20), each partner reports their ownership percentage of all income and all deductions. You cannot, however, allocate income and deductions in different ratios — you must report both income and expenses in the same ownership proportion.

**Mixed ownership scenarios:**
If one co-owner has a significantly higher marginal tax rate, structuring the tenancy-in-common split to give the lower-income partner a larger share can reduce the household tax bill over the holding period. However, this must reflect the actual legal ownership interest documented in the transfer of land — the ATO does not accept informal ownership reallocation.

**Spousal co-ownership and loan interest:**
Where only one partner is on the loan but both are on the title, the interest deduction generally flows to the borrower (the person legally liable for the debt). This requires careful structuring if you want both partners to claim interest deductions — both need to be on the loan or the non-borrower needs to demonstrate they are jointly liable.

**SMSFs and companies:**
Co-ownership between an individual and an SMSF or company involves the same proportional reporting, but each entity is a separate taxpayer with different rate structures. The SMSF or company reports its share in its own return.`,
  },
  {
    id: "record-keeping",
    heading: "Record keeping — 5 years after sale can be decades",
    body: `The ATO requires you to keep rental property records for 5 years after you lodge the tax return to which they relate. For income and expense records, this is effectively 5 years from the date you lodge your annual return. But the most important records are those relating to the property's cost base — these must be kept for 5 years after the year you sell the property.

**Why cost base records matter so much:**
If you hold an investment property for 20 years, your purchase contract, stamp duty receipt, and legal invoices from Day 1 must survive the entire 20 years plus another 5 years after sale. Losing these records means you cannot prove your cost base, and the ATO will use the lowest defensible figure — increasing your capital gain.

**What to keep:**
- Purchase contract, transfer of land, settlement statement
- All purchase costs: stamp duty receipts, conveyancing invoices, building inspection fees
- Loan documents and all interest statements
- Annual summaries from your property manager (income and expenses)
- Receipts for all repairs and maintenance (to distinguish from capital improvements)
- Capital improvement invoices and contracts (these modify the cost base and/or depreciation schedule)
- Quantity surveyor depreciation schedule
- Insurance policy documents and renewal invoices
- Council rates notices
- Body corporate levy notices
- Bank statements for the investment loan account
- Correspondence with the ATO regarding the property

**Digital records:**
The ATO accepts digital records. Consider scanning all paper receipts and storing in a dedicated folder structure by financial year. Cloud storage (Google Drive, Dropbox, etc.) provides offsite backup. Keep the folder accessible even if you switch accountants — do not assume your tax agent retains everything.

**After sale:**
Even after you sell, keep all sale-related records (contract of sale, agent commission invoices, legal fees, settlement statement) for a minimum of 5 years past the lodgement of the return in which you reported the capital gain.

For more detail on general tax record-keeping obligations, see our <a href="/tax/record-keeping">record-keeping guide</a>.`,
  },
];

const FAQS = [
  {
    q: "Can I deduct interest on my home loan if I rent out a room?",
    a: "Yes, but only proportionally. If you rent out one room in a four-bedroom house, approximately 25% of the interest (and other expenses like rates and insurance) relating to the home is deductible. You must apportion based on the floor area rented relative to the total home. Income from the rented room is assessable. You may also partially lose the main residence CGT exemption for the rented portion when you eventually sell.",
  },
  {
    q: "What happens if my rental property is empty between tenants?",
    a: "Expenses during genuine vacancy periods between tenants — where the property is listed, available, and marketed at a market rate — are generally still deductible. The ATO accepts that vacancies are a normal part of property investment. However, extended vacancies where the property is not genuinely being marketed (e.g., you leave it empty for months without listing it) may result in deductions being disallowed for that period.",
  },
  {
    q: "Can I claim depreciation on a property built before 1987?",
    a: "Not for Division 43 (building allowance) — that only applies to residential buildings originally constructed after 17 September 1987. However, Division 40 (plant and equipment) depreciation may still be available for eligible items you installed yourself new after the 2017 Budget date. A quantity surveyor can assess whether any Div 40 claims are available for your pre-1987 property.",  // dated-ok
  },
  {
    q: "How does negative gearing interact with my PAYG salary withholding?",
    a: "If you expect your investment property to produce a net loss, you can apply to the ATO for a PAYG withholding variation. This reduces the tax withheld from your salary each fortnight, delivering the tax benefit throughout the year rather than as a lump-sum refund at tax time. You apply using the ATO's online form (NAT 2036). The variation is based on an estimate — if your actual loss differs from the estimate, your final tax return will reconcile the difference.",
  },
  {
    q: "Can I negatively gear an investment property held in a family trust or company?",
    a: "Losses in a company or discretionary trust cannot be distributed to individual beneficiaries to offset their personal income — losses are trapped in the entity. For a trust, losses carry forward and can only be used against future trust income (subject to trust loss rules). A company carries losses forward against future company income. Negative gearing's loss-offsetting benefit only works for properties held in your own name (or a partnership where you are a partner). If an investment structure is your goal, seek advice from a tax specialist before purchasing.",
  },
  {
    q: "Are there ATO limits on how many investment properties I can claim?",
    a: "There is no limit on the number of investment properties you can hold or claim deductions for. Each property is reported on a separate rental schedule, and the net result from all schedules is combined. If your total rental losses across all properties exceed your other income in a year, the excess loss is carried forward as a deferred loss rather than lost entirely — it offsets rental or other income in future years.",
  },
];

// ─── Page component ────────────────────────────────────────────────────────────

export default function RentalPropertyTaxPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Tax", url: `${SITE_URL}/tax` },
    { name: "Rental Property Tax" },
  ]);

  const faqSchema = faqJsonLd(FAQS);

  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <Link href="/tax" className="hover:text-slate-900">Tax</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Rental Property Tax</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              Rental Property Tax · {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              Rental Property Tax Australia{" "}
              <span className="text-amber-600">({CURRENT_YEAR})</span>
              {" "}&mdash; Complete Deductions Guide
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              Everything Australian investors need to know about rental property tax: what you can deduct,
              how depreciation works, negative vs positive gearing, and the record-keeping rules that can
              protect thousands of dollars when you sell.
            </p>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Building Allowance</p>
              <p className="text-xl font-black text-amber-700">2.5% / yr</p>
              <p className="text-xs text-slate-600 mt-1">Division 43 deduction on construction cost for post-1987 residential buildings</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Management Fees</p>
              <p className="text-xl font-black text-slate-900">7 &ndash; 10%</p>
              <p className="text-xs text-slate-600 mt-1">Typical property manager charge as a percentage of gross rent — fully deductible</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Record Keeping</p>
              <p className="text-xl font-black text-slate-900">5 yrs post-sale</p>
              <p className="text-xs text-slate-600 mt-1">Cost base records must survive the full holding period plus 5 years after you sell</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Table of contents ────────────────────────────────────────────── */}
      <section className="py-8 bg-white border-b border-slate-100">
        <div className="container-custom max-w-3xl">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">On this page</h2>
          <ol className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {SECTIONS.map((sec, i) => (
              <li key={sec.id}>
                <a href={`#${sec.id}`} className="text-amber-700 hover:text-amber-900 font-medium">
                  {i + 1}. {sec.heading}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── What you CAN deduct ──────────────────────────────────────────── */}
      <section className="py-10 bg-slate-50 border-b border-slate-200">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Deductions" title="What you can deduct at a glance" />
          <div className="mt-6 grid sm:grid-cols-2 gap-3">
            {DEDUCTIBLE_ITEMS.map((item) => (
              <div key={item.label} className="bg-white rounded-xl border border-green-100 p-4">
                <p className="text-sm font-bold text-slate-900 mb-1">{item.label}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What you CANNOT deduct ───────────────────────────────────────── */}
      <section className="py-10 bg-white border-b border-slate-200">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Exclusions" title="What you cannot deduct" />
          <div className="mt-6 grid sm:grid-cols-2 gap-3">
            {NON_DEDUCTIBLE_ITEMS.map((item) => (
              <div key={item.label} className="bg-red-50 rounded-xl border border-red-100 p-4">
                <p className="text-sm font-bold text-slate-900 mb-1">{item.label}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── In-depth content sections ────────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Complete Guide" title="Rental Property Tax Explained" />
          <div className="mt-8 space-y-12">
            {SECTIONS.map((sec) => (
              <div key={sec.id} id={sec.id} className="scroll-mt-20">
                <h2 className="text-lg font-extrabold text-slate-900 mb-3">{sec.heading}</h2>
                <div className="text-sm text-slate-600 leading-relaxed space-y-3">
                  {sec.body.split("\n\n").map((para, i) => (
                    <p key={i} className="whitespace-pre-line break-words">{para}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="py-10 md:py-12">
        <div className="container-custom max-w-2xl">
          <SectionHeading eyebrow="FAQ" title="Rental Property Tax Questions" />
          <div className="mt-6 divide-y divide-slate-200">
            {FAQS.map((faq) => (
              <details key={faq.q} className="py-4 group">
                <summary className="text-sm font-semibold text-slate-900 cursor-pointer list-none flex items-center justify-between gap-2">
                  {faq.q}
                  <span className="text-slate-500 group-open:rotate-180 transition-transform shrink-0" aria-hidden="true">&#9662;</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Related guides ───────────────────────────────────────────────── */}
      <section className="py-10 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Related Guides" title="More on property investment tax" />
          <div className="mt-6 grid sm:grid-cols-3 gap-4">
            <Link
              href="/tax/negative-gearing"
              className="bg-white rounded-xl border border-slate-200 p-5 hover:border-amber-300 transition-colors block"
            >
              <p className="text-xs font-bold text-amber-700 mb-1">Negative Gearing</p>
              <p className="text-sm font-semibold text-slate-900">How negative gearing works for property &amp; shares</p>
              <p className="text-xs text-slate-500 mt-2">Tax savings by marginal rate, real after-tax costs, and when it makes sense</p>
            </Link>
            <Link
              href="/tax/capital-gains"
              className="bg-white rounded-xl border border-slate-200 p-5 hover:border-amber-300 transition-colors block"
            >
              <p className="text-xs font-bold text-amber-700 mb-1">Capital Gains Tax</p>
              <p className="text-sm font-semibold text-slate-900">CGT on investment property — cost base and the 50% discount</p>
              <p className="text-xs text-slate-500 mt-2">How CGT applies when you sell, cost base calculation, and the 12-month rule</p>
            </Link>
            <Link
              href="/tax/record-keeping"
              className="bg-white rounded-xl border border-slate-200 p-5 hover:border-amber-300 transition-colors block"
            >
              <p className="text-xs font-bold text-amber-700 mb-1">Record Keeping</p>
              <p className="text-sm font-semibold text-slate-900">What records to keep and for how long</p>
              <p className="text-xs text-slate-500 mt-2">ATO requirements for rental property documents, receipts, and cost base records</p>
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container-custom text-center max-w-xl">
          <h2 className="text-xl font-extrabold mb-3">Get your rental tax return right</h2>
          <p className="text-sm text-slate-300 mb-6">
            A specialist investment property tax agent can maximise your deductions, prepare a depreciation
            schedule, and ensure your records are audit-proof.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/advisors/tax-agents"
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-colors"
            >
              Find a Tax Agent &rarr;
            </Link>
            <Link
              href="/tax"
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm rounded-xl transition-colors"
            >
              Tax Strategy Hub &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── Advisor prompt ───────────────────────────────────────────────── */}
      <section className="py-10 bg-white border-t border-slate-200">
        <div className="container-custom max-w-3xl space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Find a mortgage broker for your investment loan</h2>
          <AdvisorPrompt type="mortgage_broker" />
          <h2 className="text-lg font-bold text-slate-900 pt-2">Get your depreciation schedule and rental return done</h2>
          <AdvisorPrompt type="tax_agent" />
        </div>
      </section>

      {/* ── Compliance footer ────────────────────────────────────────────── */}
      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">
            {GENERAL_ADVICE_WARNING} Information on this page is general in nature and does not constitute
            tax advice. Tax rules for rental properties are complex and depend on your individual
            circumstances, ownership structure, and the specific property. ATO interpretations and
            legislation may change. Always obtain advice from a registered tax agent (BAS agent or tax
            agent registered with the Tax Practitioners Board) before lodging claims for rental deductions.
            Verify current rules at{" "}
            <a
              href="https://www.ato.gov.au/individuals-and-families/investments-and-assets/residential-rental-properties"
              className="underline hover:text-slate-700"
              target="_blank"
              rel="noopener noreferrer"
            >
              ato.gov.au
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
