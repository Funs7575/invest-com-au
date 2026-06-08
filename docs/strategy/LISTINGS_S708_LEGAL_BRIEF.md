# Legal sign-off brief — wholesale-only (s708) listings for capital-markets verticals

**Status:** awaiting legal sign-off · **Created:** 2026-06-07 · **Owner:** Fin (founder)
**Companions:** `REGULATORY-AVOID-LIST.md`, `AFSL-LAWYER-BRIEF.md` (Q2), `docs/plans/LISTINGS_MARKETPLACE_CONSOLIDATION.md` (D4)

> **Why this exists:** `REGULATORY-AVOID-LIST.md` classifies facilitating capital
> raises / investor matching as a **never-autonomous escalator** — it must not be
> built, enabled, or un-gated **without explicit founder + legal sign-off recorded
> in this repo**. The founder has chosen the **wholesale-only (s708)** direction
> (2026-06-07). This brief is the remaining gate: **engineering will not build the
> s708 listing flow until legal answers the questions below in writing here.**

## 1. What we want to do
Let owners list **capital-markets** opportunities — verticals `startup`
("equity crowdfunding / angel raise"), `fund` ("managed fund / scheme"), and
`pre_ipo` — on `/invest/list`, **restricted to wholesale / sophisticated (s708)
investors**, as a **factual listing + lead-routing** service, **not** a retail
offer and **not** an offer facilitation we conduct as principal.

## 2. Current state (today, pre-build)
- These verticals are **live and selectable** on `/invest/list`.
- **Interim de-risk already shipped (PR #1459):** posting now **requires an
  account** (no anonymous submissions); a securities disclaimer + general-advice
  warning already render for fund/startup/pre_ipo.
- **No s708 gate exists** on either the lister or the enquirer. AFSL **not yet
  granted** (`getAfslStatus().granted = false`).

## 3. Proposed mechanics to review (what we'd build on your yes)
1. **Wholesale attestation gate** (reuse `components/invest/WholesaleAttestationGate.tsx`)
   on **both** the person posting and any investor enquiring — self-certified
   s708 (net assets ≥ $2.5m / income ≥ $250k / investment ≥ $500k), persisted as
   `wholesale_only` / `s708_required` on the listing (already honoured by
   `lib/listing-match.ts`).
2. **No retail exposure:** these verticals hidden from retail discovery + enquiry
   routing suppressed unless the viewer has attested wholesale.
3. **AFSL gate:** keep the whole capital-markets flow behind
   `getAfslStatus()` — **off until the AFSL is granted**, even with attestation,
   unless you advise the s766B(6)/(7) factual carve-out covers it pre-licence.
4. **Disclosures:** `lib/compliance.ts` securities/general-advice copy + an
   explicit "information only, not an offer; we are not the issuer and do not
   facilitate the offer" statement.

## 4. Questions for legal (answer inline; build is gated on these)
1. Does **wholesale-only (s708) matching** keep us inside a **standard AFSL**, or
   does facilitating these listings still require a **CSF intermediary**
   authorisation (RG 261/262) or an **Australian Market Licence**? *(ties to
   `AFSL-LAWYER-BRIEF.md` Q2)*
2. Is **self-certified** s708 attestation sufficient, or do we need an
   **accountant's certificate** before showing terms / accepting an enquiry?
3. Pre-AFSL: may any of this run under the **factual-information carve-out**, or
   must it stay **fully gated off until the licence is granted**?
4. Does routing an enquiry from an attested wholesale investor to the lister
   constitute **"arranging"/"dealing"** that needs specific AFSL authorisation?
5. For the **`fund`** vertical specifically (MIS / product issuer territory): can
   we list third-party funds factually at all, or must `fund` stay disabled?
6. **Cross-border:** if a listing is shown to / enquired on by a foreign investor,
   what geo-scoping is required to avoid foreign-regulator exposure (US SEC/FINRA,
   UK FCA)?

## 5. Decision record (to be completed by legal)
- [ ] Reviewed by: __________ (name / firm), date: __________
- [ ] Outcome per vertical — `startup`: ☐ s708-gated ☐ factual-only ☐ disabled-until-AFSL
- [ ] Outcome per vertical — `fund`: ☐ s708-gated ☐ factual-only ☐ disabled-until-AFSL
- [ ] Outcome per vertical — `pre_ipo`: ☐ s708-gated ☐ factual-only ☐ disabled-until-AFSL
- [ ] Attestation standard: ☐ self-certified ☐ accountant's certificate
- [ ] Pre-AFSL: ☐ permitted under carve-out ☐ gate off until granted
- [ ] Conditions / disclosures required: __________

**Until §5 is completed, engineering keeps these verticals as-is (auth-gated,
disclaimer-bearing) and does not build the s708 flow.**
