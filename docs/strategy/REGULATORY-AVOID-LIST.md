# Regulatory avoid-list — escalators beyond a standard AFSL

**Status:** active · **Owner:** Fin (founder) · **Created:** 2026-05-21

This file lists activities that require **more** than the AFSL the business plans to launch with (~Nov 2026) — a *separate* licence, a *heavy add-on* authorisation, or conduct obligations a light AFSL does not discharge. The goal is to **keep compliance lean**: stay in the "lean lane" below and one AFSL is expected to cover us; anything that breaks out of it is an escalator to **avoid or tightly scope**.

> Not legal advice. This is an engineering/strategy gate and an input to the AFSL adviser — see `AFSL-LAWYER-BRIEF.md`. Confirm scope with the licensee's responsible manager / lawyer.

## ENFORCEMENT — read this if you are an automated loop or a session
- Treat **every escalator below as never-autonomous — Tier E-equivalent** (see `docs/audits/MERGE_AUTHORIZATION.md`).
- **Do not build, merge, un-draft, or enable (flip a feature flag on)** any feature matching an escalator **without explicit founder + legal sign-off recorded in this repo.**
- If a queue/scout item or product wave implies an escalator, **stop and surface it** instead of building it.
- Anything currently **live** that matches an escalator must stay **flag-gated off until the AFSL is granted** and the relevant question in `AFSL-LAWYER-BRIEF.md` is cleared.

## The lean lane (what a standard AFSL is expected to cover)
General advice / factual comparison **+** arranging/referral **+** wholesale-where-possible **+ no client money, no product issuing, no asset custody, no credit assistance, no self-ingested bank data.** Stay inside this lane.

## A. Activities needing a SEPARATE licence/authorisation (avoid)
| Escalator | Trigger | Why it's beyond a standard AFSL | Lean alternative |
|---|---|---|---|
| **CSF intermediary authorisation** | Facilitating startup capital-raises / matching investors to offers | Crowd-sourced funding is its own AFSL authorisation with gatekeeper duties (RG 261/262) | Wholesale-only (s708) matching, or factual listings with no offer facilitation |
| **Australian Market Licence** | Running an exchange/auction where financial products are traded/matched | Operating a "financial market" is a separate licence (s795B) | Keep auctions to *lead routing*, never trading financial products |
| **Australian Credit Licence (NCCP)** | Credit assistance — recommending/helping apply for specific loans/mortgages | Credit is a separate Act and licence, not part of an AFSL | Pure referral to a licensed broker; no specific-loan suggestions |
| **CDR accreditation** | Ingesting Open Banking bank-feed data ourselves | Multi-month accreditation with CPS-style obligations | Manual entry / read-only Sharesight, or a CDR-representative model |
| **AML/CTF reporting entity (AUSTRAC)** | Providing a "designated service" — remittance/FX, certain dealing | KYC, suspicious-matter reporting, AML program — a parallel regime | Referral-only to licensed remitters; don't provide the service |
| **Custodial / IDPS authorisation** | Holding or controlling client assets, or running a platform/wrap | Heavy capital + audit (RG 148/166) | Read-only *display* of holdings; never custody |
| **MDA authorisation** | Managing portfolios on a discretionary basis | Separate heavy authorisation | No discretionary management; client always acts |
| **Tax (financial) adviser registration (TPB)** | Giving tax advice for a fee | Tax Practitioners Board regime on top of the AFSL | General tax info + "see a registered tax agent" |
| **Product issuer + DDO/TMD** | Issuing our own or a co-branded financial product | Issuer obligations + Target Market Determinations | Only compare/refer third-party products (keep "own product" at Y5+) |
| **Crypto / digital-asset platform licensing** | Arranging/dealing crypto, or holding it | Emerging digital-asset platform regime + AML | Factual comparison only; don't arrange or hold |

## B. Obligations that turn a light AFSL into a heavy one (scope out)
- **Personal advice to retail** → best-interests duty (s961B), Statements of Advice, fee-disclosure statements. Stay general-advice + factual.
- **Handling/holding client money** → trust accounts, reconciliations, audits (s981A+). Don't intermediate consumer→adviser money; use flat B2B fees.
- **Conflicted remuneration (RG 246)** → bans/limits on %-of-advice-fee, volume bonuses, paid influence on advice. Flat fees; wall between advertising and advice; disclose.
- **Full retail-client suite** → AFCA, PI insurance, compensation, DDO. Go **wholesale-only** wherever possible to shed most of it.

## C. Product / sector-specific layers (extra rules on top)
Superannuation advice, insurance distribution, crypto, carbon/ACCU/commodity listings, and cross-border / foreign-investor activity (which can pull in *foreign* regulators — US SEC/FINRA, UK FCA). Keep each to factual comparison + referral; geo-scope cross-border carefully.

## D. Parallel regimes that scale with the above (not the AFSL, but real)
- **Privacy Act / notifiable data breaches** — intensifies with the document vault, KYC docs, bank data.
- **AFCA membership + PI insurance + compensation arrangements** — come with the retail AFSL and scale with advice + money-handling.

## Current codebase tripwires (2026-05-21 audit)
| Feature | Escalator | Status / action |
|---|---|---|
| Startup Portal (SP) — `/invest/startups/*`, `startup_rounds` | CSF / market | **LIVE on main, retail-exposed, no s708 gate** → wholesale-gate or unpublish equity raises |
| `createPaymentForBrief` 10% clip (#859 / MM34) | client money + RG 246 | **LIVE (env-gated)** → flag OFF until licensed |
| DD-03 booking 15% clip (#1034) | client money + RG 246 | draft — `do-not-merge` applied |
| FHB mortgage-broker handoff (#1041) | ACL (NCCP) | live → confirm *referral*, not credit assistance |
| Open Banking / net-worth (BB-04 / W2.15) | CDR | not built → keep gated until accreditation path chosen |
| Cross-border line / DASP | AML/CTF + foreign + TPB | live (factual) → keep referral-only |
| `tax-optimizer` / `portfolio-xray` directive outputs | personal advice + TPB | dead endpoints → disable |

## Lean-alternative defaults (build these instead)
- Recommendations → "general advice + `GENERAL_ADVICE_WARNING`", never personal-advice framing.
- Monetisation → flat B2B fees (lead credits / subscriptions / ads), never a % of an advice fee or consumer→adviser money intermediation.
- Securities / raises → wholesale-only (s708) gate + factual listing, never retail offer facilitation.
- Bank data → manual entry / read-only Sharesight, never self-ingested CDR.
- Credit → referral to a licensed broker, never credit assistance.
- Always wire `lib/compliance.ts` + a feature flag onto any advice / payment / data surface.

## Maintenance
Append new escalators as they arise; don't delete. Once the AFSL scope is confirmed, annotate each item: *covered / not covered / needs separate authorisation*.
