# AFSL scoping brief — questions for the licensing adviser / lawyer

**Status:** draft for founder review · **Created:** 2026-05-21 · Companion to `REGULATORY-AVOID-LIST.md`

## Context
- Pre-AFSL today; operating under the s766B(6)/(7) factual-information carve-out.
- Plan: **launch licensed** (~Nov 2026, aligned to the Oct–Dec 2026 domain cutover).
- Objective: **keep ongoing compliance as lean as possible** — ideally a single AFSL covering general advice + arranging/dealing, wholesale-where-possible, with no client-money / issuing / custody.

## Questions

### 1. Consumer→adviser payments (live: #859 10%; draft: DD-03 15%)
- Does the intended AFSL scope cover **arranging/dealing** in payments between a consumer and an adviser?
- Do **Stripe Connect destination charges** (money goes to the adviser's connected account; platform takes an `application_fee`) avoid the **client-money provisions (s981A+)**, or do they trigger trust-account / audit obligations?
- Is a **flat referral/lead fee** materially safer than a **% of the advice fee** under **RG 246** (conflicted remuneration)? Can we take a % at all?

### 2. Startup Portal — capital-raising / investor matching (live schema #1057; portal #1048)
- Does facilitating startup raises / matching investors require a **CSF intermediary** authorisation (RG 261/262), or does **wholesale-only (s708)** matching keep us within a standard AFSL?
- If wholesale-only: what certification/attestation + disclaimers are required before showing raise terms or accepting an expression of interest?
- Does showing raise terms (valuation, instrument) to **retail** users constitute an **offer** needing disclosure (prospectus / CSF offer doc)?

### 3. Advice surfaces — general vs personal advice
- Are "general advice + `GENERAL_ADVICE_WARNING`" framings (wealth-stack named picks; quiz "top match") sufficient, or do they risk being **personal advice** (best-interests duty, SoA)?
- Do **directive outputs** ("Sell BHP to harvest a loss…", "switch to save $X/yr") cross into personal advice and/or **tax (financial) advice** needing **TPB** registration?

### 4. Credit (NCCP / ACL) — FHB mortgage-broker handoff (#1041)
- Is the mortgage-broker handoff a **referral** (no licence) or **credit assistance** (needs an **ACL**, separate from the AFSL)? Where's the line for our exact flow?

### 5. Cross-border line / DASP
- Does any cross-border activity (FX / remittance / non-resident-mortgage referral) make us a **reporting entity** under **AML/CTF** (designated services)?
- Does serving non-residents / foreign investors create **foreign-regulator** exposure (US SEC/FINRA, UK FCA)? How should we geo-scope?

### 6. Advertising / ranking (RG 246 + RG 234)
- Are paid ranking / lead auction / sponsored placement acceptable under **RG 246** when adjacent to advice, and is our **disclosure** adequate under **RG 234 / ACL s18**? (Current gaps: unlabelled quiz CPC winner; advisor "Featured" = paid, undisclosed.)

### 7. Open Banking (BB-04 / W2.15)
- For a bank-feed net-worth tracker: full **CDR accreditation** vs a **CDR representative / affiliate** model — which is the lightest compliant path?

## Pre-licence live exposures to triage now (don't wait for the meeting)
- **#859** consumer→adviser payment clip — live, env-gated → flag off until licensed.
- **Startup equity-raise listings** — retail-browsable + enquirable, no s708 gate → gate or unpublish. **Now also the `/invest/list` submission form** (verticals startup/fund/pre_ipo). **Founder decision 2026-06-07:** pursue **wholesale-only (s708)** for these (not disable) — see Q2. ⚠️ **Needs legal sign-off before build**; the s708 attestation gate is unbuilt pending this. Phase-1 interim (shipped, PR #1459): posting now requires an account, removing the anonymous path.
- **Disclosure gaps** — quiz CPC winner unlabelled; advisor "Featured" ordering undisclosed → cheap label fixes (misleading-conduct risk regardless of AFSL).
- **Security (separate from AFSL)** — over-open RLS on `site_ab_tests` and `affiliate_monthly_reports` (anon read/write of revenue data).
