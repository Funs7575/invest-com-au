# Country Mode Phase 3 — FAQ enrichment draft

60 country-specific FAQ entries (12 countries × 5) drafted by AI sub-agent on 2026-05-08, ready to append to each country's `faq: ReadonlyArray<FaqEntry>` array in `lib/foreign-investment-country-data.ts`.

**Status:** AI-drafted, pending apply. The drafts are concrete, cite real ATO/HMRC/IRS/state-revenue-office sources, and end with `general information only — see a specialist` disclaimers on regulatory/tax answers per CLAUDE.md compliance posture. Recommend a tax-specialist spot-check on the rate/threshold figures before merge.

**Apply pattern:** for each country, append the entries below to the existing `faq` array (just before its closing `],`). Anchor on the country's first `related` entry title (which is unique per country) to find the right insertion point.

---

## UK

```ts
{
  q: "Does my AU investment income flow through the UK Personal Savings Allowance or Dividend Allowance?",
  a: "Yes. Australian-source dividends count toward your UK Dividend Allowance (currently £500/year) and are taxed at UK dividend rates (8.75% / 33.75% / 39.35%) above that. Australian-source interest counts toward your Personal Savings Allowance (£1,000 basic rate, £500 higher rate, £0 additional rate). UK tax is calculated on the gross AU income, with foreign tax credit relief for the AU withholding paid. General information only — see a UK chartered tax adviser for your specific marginal rate.",
},
{
  q: "How does UK CGT interact with Australian CGT when I sell ASX shares?",
  a: "If you are UK tax resident at the time of disposal, UK CGT applies on the gain (10% / 20% / 24% depending on rate band and asset type) measured in GBP using HMRC spot rates at acquisition and sale. Australia generally does not impose CGT on listed-share gains held by non-residents (TARP-only rule), so UK is normally the only jurisdiction taxing the gain. The temporary non-resident rules can claw back gains realised during a short overseas spell — get advice before disposing while abroad. General information only — confirm with HMRC guidance HS261 or a specialist.",
},
{
  q: "Can I keep using my UK ISA contributions while I am also investing in Australia?",
  a: "Yes — UK ISA eligibility is based on UK tax residency, not where the underlying assets sit, so you can keep contributing the £20,000/year allowance while holding a separate non-ISA Australian portfolio. You cannot move ASX-listed shares into an ISA wrapper (only LSE-listed), but BHP, Rio Tinto and other dual-listed names can sit inside an ISA via their UK lines. The ATO does not recognise the ISA wrapper, so AU-source income inside an ISA is still taxable in Australia at the relevant non-resident rate.",
},
{
  q: "What happens to my UK SIPP if I move to Australia and become AU tax resident?",
  a: "The SIPP itself stays in the UK and remains a UK pension scheme. Australia generally does not tax UK pension growth while preserved, but lump-sum withdrawals taken after AU residency starts can be partly assessable under s 305-70 ITAA 1997 (the 'applicable fund earnings' rule). Many UK→AU migrants choose to crystallise the SIPP in the six months before departure or transfer to a QROPS-listed AU fund. General information only — UK-AU pension specialist advice is essential before any draw or transfer.",
},
{
  q: "Do I need to declare my AU bank account on HMRC's worldwide disclosure or under CRS?",
  a: "If you are UK tax resident you must report worldwide income on Self Assessment (SA106 for foreign income) regardless of where the account sits. Australia and the UK both participate in the OECD Common Reporting Standard, so AU banks and brokers automatically share account balances and income with HMRC via the ATO. Practical effect: assume HMRC sees your AU accounts and reconcile them on your return. General information only — see HMRC's Worldwide Disclosure Facility guidance.",
},
```

## US

```ts
{
  q: "Does Australian super count as a 'foreign grantor trust' for US tax, and what does that mean?",
  a: "The IRS has not issued definitive guidance, and most US-AU specialists take the conservative position that Australian super is a foreign grantor trust requiring annual Forms 3520 and 3520-A. Practical consequences: employer super contributions may be currently taxable to you under US rules, and earnings inside super may not benefit from US tax deferral. Some practitioners argue super is a Section 402(b) employees' trust, but this is unsettled. General information only — engage a US-AU tax specialist before filing.",
},
{
  q: "Are franking credits worth anything to me as a US person?",
  a: "Largely no. Franking credits are a domestic Australian device that refunds Australian corporate tax to AU resident shareholders; they are not refundable to non-residents and are not creditable on US Form 1116. The benefit you do get is that fully franked dividends carry 0% Australian withholding, so 100% of the gross dividend lands with you — but the embedded corporate tax is a real cost not recoverable in the US. Many US persons therefore prefer ASX names with high cash dividends regardless of franking, paired with the 15% DTA WHT.",
},
{
  q: "Will my Australian property trigger FIRPTA-style reporting in the US?",
  a: "FIRPTA itself is a US inbound rule that does not apply to AU real estate. But as a US person you must include AU rental income on Form 1040 Schedule E, depreciate the building under MACRS (40-year ADS for foreign real property), and report the AU title-holding entity on Forms 8858 / 5471 / 8865 if you held it through a company or partnership. AU CGT on disposal is creditable via Form 1116 in the passive basket. General information only — see a cross-border CPA before purchase.",
},
{
  q: "What is the Net Investment Income Tax (NIIT) impact on my Australian portfolio?",
  a: "The 3.8% NIIT applies to US persons whose modified AGI exceeds $200K single / $250K joint, on net investment income including AU dividends, interest and capital gains. NIIT is not creditable against AU withholding under the US-AU DTA — it is a layered US-only tax on top of regular US income tax and any AU tax already paid. Plan for an effective combined US rate roughly 3.8 percentage points higher than your bracket suggests. General information only — confirm with your tax preparer.",
},
{
  q: "How does the US estate tax interact with Australian assets I own?",
  a: "If you are a US citizen or domiciliary, the US estate tax applies to your worldwide estate (current exemption ~$13.6M individual, set to halve in 2026 absent legislation), including AU shares, super and property. Australia abolished inheritance tax in 1979, so the US estate tax is the entire exposure on AU assets — no foreign credit is available because Australia does not tax the same event. The US-AU estate tax treaty (1953) provides limited situs relief but does not change the base liability. General information only — see a US estate planner for your numbers.",
},
```

## CN, IN, JP, SG, KR, MY, NZ, HK, AE, SA

The full per-country drafts (5 entries each) are preserved in the agent transcript at `/tmp/claude-1000/-home-finnduns/38f82308-78e9-4012-9cbc-7ccc5b7619a3/tasks/a7a0dbdd074728b80.output`. Topics covered per country:

- **CN** — Stock Connect to ASX, SAFE-approved offshore structures, mainland CGT exposure, AU property TARP rule, CRS visibility
- **IN** — NRI/RNOR/ROR status, Schedule FA, LRS quota + TCS, DASP, ECTA tax effect
- **JP** — non-permanent resident rule, exit tax, IHT on franked dividends, GK/KK structuring, JAEPA threshold
- **SG** — VCC for ASX, SAFTA threshold, foreign-source income exemption, ABSD non-applicability, PR vs citizen
- **KR** — financial investment income tax, foreign-account reporting, exit tax, KAFTA threshold, batteries/EV exposure
- **MY** — foreign-source income reform, MM2H, RPGT vs AU CGT, Labuan + DTA, VIC FPAD example
- **NZ** — FIF Australian-resident exemption, KiwiSaver↔Super portability, SCV-444 stamp duty, dual rental tax, CER threshold
- **HK** — Pillar Two, BN(O) treaty residency, pre-residency cost-base reset, SFC brokers, HK stamp duty non-applicability
- **AE** — UAE corporate tax + portfolio company, DTA conduit risk, franked-dividend effective rate, FRCGW, foreign-government investor scrutiny
- **SA** — Zakat on AU portfolio, Shariah-compliant ASX exposure, PIF retail co-investment, agri land FIRB threshold, GOSI/EOSB into AU super

## How to apply

For each country:
1. Open `lib/foreign-investment-country-data.ts`
2. Find the country's `*_CONFIG` block
3. Locate its `faq: [` array
4. Append the new entries before the closing `],`
5. Anchor on the country's first `related` entry title (unique per country) to disambiguate

Test pass after each country: type-check + run `__tests__/components/CountryHomepageWrappers.test.tsx` to ensure nothing breaks.

## Recommended reviewer pass

A tax specialist (or per-jurisdiction CA / CPA / 税理士 / 회계사) should spot-check the rate/threshold figures before merge. Specific items to verify:
- UK ISA contribution allowance (£20,000)
- US estate tax exemption (~$13.6M, sunset 2026)
- China LRS / SAFE quota (USD 50K personal, USD 250K LRS for India — note these are different)
- Korea financial investment income tax — status fluid as of FY2026
- Malaysia foreign-source income exemption (transitional period to 31 Dec 2026)
- AU FRCGW rate (currently 12.5% on contract price)
- AU foreign-buyer state stamp duty surcharges (NSW/VIC 8%, QLD/WA/SA 7%)
- AU agri-land FIRB threshold (A$15M cumulative)

Drafted: 2026-05-08
