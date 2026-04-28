# Pre-launch competitor audit

> Surface-level audit of the 4 most relevant Australian financial-comparison
> / advisor-discovery sites. Done via WebFetch on 2026-04-28 so the snapshot
> is fixed in time. Goal: identify gaps and (just as important) things
> we already do that competitors don't.
>
> **Scope limitation.** This is a *public-marketing-page* audit. It tells
> you what competitors *show off*, not how their conversion funnels actually
> perform or what their advisor-side onboarding feels like. For a deeper
> audit, run the Claude Browser prompt in `claude-browser-prompts.md` §4
> with screenshots, or do it yourself for 4 hours.

## Competitors surveyed

| Competitor | Relevance | Status |
|---|---|---|
| **Finder** (finder.com.au) | Most direct competitor — same comparison-driven model | ✅ surveyed |
| **Canstar** (canstar.com.au) | Strong brand, research authority, comparison hub | ✅ surveyed |
| **MoneySmart** (moneysmart.gov.au) | ASIC's own consumer site — sets the regulatory baseline | ✅ surveyed |
| **Adviser Ratings** (adviserratings.com.au) | Closest direct comp on the advisor-discovery side | ✅ surveyed |
| RateCity (ratecity.com.au) | Was a comp; now redirects to Canstar | ⚠️ acquired |
| InvestSmart (investsmart.com.au) | Boutique competitor | ❌ blocked our fetch (403); use Claude Browser for live look |

## What each does well

### Finder
- **Rewards program** as the lead-capture hook ($120M claimed displayed prominently). Free membership = lead. Smart.
- **AFSL 547310 + ACL 385509 + CAR 432664** in footer. Three distinct authorisations, all displayed.
- **General-advice disclaimer is short and clear** — "Finder is an information service…provides general information and advice".
- **Email-based viral loop** — refer-a-friend $50 incentive.
- **No AI/chatbot.** Trust gate may be why.

### Canstar
- **Star ratings as the hook.** "Research provided by Canstar Research AFSL" — ratings authority is the brand moat.
- **15+ product category dropdowns.** Wider category coverage than us today.
- **Mobile app + interest rate alerts.** Cross-platform engagement.
- **No homepage email signup** — trusts the comparison flow to do the lead capture.
- **PDS/TMD references in footer** — DDO obligations met explicitly.
- **No AI/chatbot.**

### MoneySmart (regulator's own site)
- **Calculator-first homepage** — Retirement Planner, Budget Planner, Super Calculator are the three top tiles. **This is what regulators want consumers to see.** Match it.
- **Topic-grouped tools** (Banking, Loans, Investing, Super, Insurance) — same vertical structure as our hub model.
- **No commercial CTAs, no lead capture.** Pure consumer education.
- **No disclaimers because they're the government.** Sets the bar for "trustworthy" presentation.
- **No AI/chatbot.**

### Adviser Ratings
- **Ask-an-adviser Q&A as the hook** — different lead-capture pattern than ours.
- **Reviews + ratings flow** — leverages user-generated content.
- **No advisor-match algorithm** — direct adviser search and Q&A only. **We have a richer match flow than they do.**
- **Compliance posture is light** — "does not provide personal financial advice" line, but no AFSL/AFCA prominent.

## Gaps we have (vs what competitors do better)

### Things competitors do that we don't (yet)
1. **A rewards program / loyalty hook for lead capture** (Finder's $120M-claimed counter is brutally effective). Worth queuing as a post-launch item if conversion is weak.
2. **Star-rating authority** (Canstar's wedge). We have advisor reviews but not a branded "InvestSmart Awards"-style rating system.
3. **Dedicated mobile app + push notifications** (Canstar). Probably not in scope pre-launch — but if competitors invest here, our PWA at minimum should support push for advisor-match alerts.
4. **Financial-product comparison breadth.** Finder/Canstar cover 15+ product categories (credit cards, insurance, utilities, etc.). We're investment-only by design. Stay focused; don't fall into this trap.
5. **A Q&A surface like Adviser Ratings** — a forum where advisors answer public questions. Could be a long-tail SEO play post-launch.

### Compliance posture
1. **Prominently displayed AFSL/ACL numbers in footer** (Finder shows 3 separate licence numbers). Make sure ours is at least as prominent — currently in `lib/compliance.ts` but check the actual rendered footer.
2. **DDO PDS/TMD references** (Canstar does this). If we ship products covered by DDO, the footer needs the disclosure.
3. **General-advice warning placement.** Finder and Canstar both put theirs in the page footer plus next to product comparison tables. Audit our placement: is it next to every "compare brokers" table?

### UX patterns
1. **Calculator-first homepage** (MoneySmart). Even one prominent calculator above the fold lifts engagement vs a pure-content homepage.
2. **Footer disclaimers in plain English** (Finder's is one sentence). Long legalese paragraphs in our compliance copy might benefit from a shorter top-line + expandable detail.

## Things we do better

### Architecture / capability
1. **None of them have AI integrated** — even though we're deferring AI ourselves, this means when we *do* reactivate it, the wedge is still open. (Be careful: "no chatbot" might be a deliberate compliance choice on their part, not a gap.)
2. **Our advisor-match flow is richer than Adviser Ratings'** — they have search + Q&A; we have a quiz-driven match. If positioning is "less searching, better matching", that's a real differentiator.
3. **Vertical hub structure mirrors MoneySmart's topic-grouping** — meaning we already match the regulator's preferred information architecture. Use this in regulator-facing conversations.
4. **GDPR + AU Privacy Act endpoints** — we have `/api/account/export-data`, `/api/account/delete`, `/api/privacy/correct`, `/api/privacy/request` working. Most competitors don't surface these; the AU Privacy Act increasingly expects them. Quiet compliance moat.

### Brand position
1. **`invest.com.au` is the strongest exact-match domain in the Australian investment-information space.** Finder, Canstar, MoneySmart all have generic / educational names; ours says exactly what it is.
2. **Pre-launch positioning is open.** None of the above are explicitly "for new investors" or "for migrants" or "for retirees" as a top-level positioning. Whatever wedge we choose at launch is uncontested.

## What to do with this audit

### Right now (pre-launch)
1. **Audit the rendered footer** on the preview deploy. AFSL number, AFCA membership, general-advice warning — visible and prominent? Compare side-by-side with Finder.
2. **Move at least one calculator above the fold on the homepage.** MoneySmart's pattern.
3. **Decide on positioning**: are we "comparison" (Finder/Canstar competitor), "match" (Adviser Ratings competitor), or "education" (MoneySmart competitor)? Each leads to different homepage hierarchy. Pre-launch is the cheapest time to choose.

### Month +1 to +3 post-launch
4. **Watch Finder's rewards-program engagement metrics** if they publish them. If we hit a conversion plateau, a rewards hook is the proven lever in this market.
5. **Canstar-style branded ratings.** "InvestSmart Brokers of the Year 2027" is a marketing moat that takes a year to build but compounds.
6. **AI reactivation** — when we turn AI back on, the chatbot wedge is empty. First-mover advantage is real here.

### Don't do
- Don't compete on category breadth. We'll lose to Finder and Canstar — they've spent decades on it.
- Don't build a mobile app pre-launch. PWA is enough; native is post-Series-A territory.
- Don't copy Finder's rewards counter literally. Australian regulators dislike "money-making" framing on financial-information sites.

## Refresh cadence

This audit should be re-run every 6 months — competitor sites change, redirects happen (RateCity → Canstar in the last 12 months), regulator expectations shift. Use the same Claude Browser / WebFetch approach in `claude-browser-prompts.md`.

## Methodology note

This is a public-marketing-page audit. It does NOT cover:
- Conversion funnel performance (we'd need their analytics)
- Advisor-side experience (we'd need to sign up as an advisor on each)
- Mobile experience specifically
- Search-result rankings vs ours
- Backlink profile (use ahrefs / SEMrush for this)

For deeper audits on any of those, queue a separate iteration.
