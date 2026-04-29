# Marketplace v2 — UX / UI demo URLs

Live Vercel preview for branch `claude/advisor-platform-comparison-5vAIE` (PR #291).

**Base URL:**
```
https://invest-com-au-git-claude-advisor-78b38b-finns-projects-2deaa68c.vercel.app
```

Click any link below to open the page in a new tab.

> Note on data: re-opens, expiry reminders, and review flows depend on the
> new database migration being applied. Until that runs, those features
> render but won't have anything to operate on. The pages themselves render
> correctly on the empty state.

---

## 1. The marketplace front door

The most important page to show first — it's the entire pitch for what was built.

- **Quote marketplace landing**
  https://invest-com-au-git-claude-advisor-78b38b-finns-projects-2deaa68c.vercel.app/quotes

  What to point at: hero pitch, "X open requests" live counter, three filter dropdowns, job cards with green "X quotes" pill, "Compare" checkboxes on bid cards.

- **Post a job (consumer flow)**
  https://invest-com-au-git-claude-advisor-78b38b-finns-projects-2deaa68c.vercel.app/quotes/post

  What to point at: 2-minute form, advisor-type checkboxes, budget bands, state picker, honeypot anti-spam.

---

## 2. A live job page (deep features)

Pick one of the open jobs from `/quotes` and click it. The job detail page shows nine of the fifteen new features at once:

- Hero with countdown pill
- "Request details" + advisor-types tags
- **Instant matches panel** (3 pre-matched advisors, only when 0 bids yet)
- **Re-open block** (only when expired, no winner)
- **Quote bids** with avatars, ratings, response time
- **Compare checkboxes** + "Compare N" pill button → drawer
- **Public Q&A panel** (advisor or owner can post)
- "How this works" sidebar
- Trust & safety panel

Example URL pattern (replace `<slug>` with a real job slug from `/quotes`):
```
https://invest-com-au-git-claude-advisor-78b38b-finns-projects-2deaa68c.vercel.app/quotes/<slug>
```

---

## 3. Long-tail SEO landing pages

These are the 104 auto-generated pages for each (advisor-type × state) combination — a single content surface that compounds organic traffic.

- **Financial Planner in NSW**
  https://invest-com-au-git-claude-advisor-78b38b-finns-projects-2deaa68c.vercel.app/quotes/by/financial_planner/nsw

- **SMSF Accountant in QLD**
  https://invest-com-au-git-claude-advisor-78b38b-finns-projects-2deaa68c.vercel.app/quotes/by/smsf_accountant/qld

- **Mortgage Broker in VIC**
  https://invest-com-au-git-claude-advisor-78b38b-finns-projects-2deaa68c.vercel.app/quotes/by/mortgage_broker/vic

- **Buyers Agent in WA**
  https://invest-com-au-git-claude-advisor-78b38b-finns-projects-2deaa68c.vercel.app/quotes/by/buyers_agent/wa

- **Tax Agent in SA**
  https://invest-com-au-git-claude-advisor-78b38b-finns-projects-2deaa68c.vercel.app/quotes/by/tax_agent/sa

What to point at: dedicated H1, intro copy with location + advisor-type, top-rated advisor sidebar, open requests in that slice. Multiply by 13 types × 8 states = **104 pages** all in the sitemap.

---

## 4. Recent wins (social-proof feed)

Anonymised feed of accepted quotes — proof the marketplace works.

- https://invest-com-au-git-claude-advisor-78b38b-finns-projects-2deaa68c.vercel.app/quotes/recent-wins

Pattern: "Financial Planner job in NSW — accepted in 18 hours · 2d ago · Budget $2k–$5k"

---

## 5. Advisor portal (the supply side)

If you log in as an advisor, this tab is the new one to show off.

- **Marketplace settings tab**
  https://invest-com-au-git-claude-advisor-78b38b-finns-projects-2deaa68c.vercel.app/advisor-portal/marketplace

  Four blocks all in one place:
  1. **Win/loss analytics** — 30-day stats vs category average + median response time
  2. **Availability toggle** — "currently accepting new clients" on/off
  3. **Job alert preferences** — pill checkboxes for type/state/budget
  4. **Bid templates** — up to 5 saved messages

- **Existing auctions page** (the public-bid retract-with-reason flow lives here)
  https://invest-com-au-git-claude-advisor-78b38b-finns-projects-2deaa68c.vercel.app/advisor-portal/auctions

---

## 6. The review flow (post-engagement)

This is end-of-funnel — only reachable via the email link sent 14 days after a consumer accepts a quote. To preview the page itself, you can hit it with any token (it'll fail validation but render the form):

```
https://invest-com-au-git-claude-advisor-78b38b-finns-projects-2deaa68c.vercel.app/quotes/<slug>/review?token=demo
```

What to point at: 5-star picker (hover state shows preview), email + display name fields, optional review body, character counter.

---

## 7. Round 1 features still worth pointing at

These were built in PR #291's first commit but are still core demo material:

- **Community forum** (verified-advisor badges)
  https://invest-com-au-git-claude-advisor-78b38b-finns-projects-2deaa68c.vercel.app/community

  Open any thread → look for the green "Verified Advisor" badge next to advisor authors.

- **Listing/enquiry forms with advisor opt-ins**
  https://invest-com-au-git-claude-advisor-78b38b-finns-projects-2deaa68c.vercel.app/list-investment

  Scroll to bottom of the form: "I'd also like to hear from these advisor types about this" checkboxes.

---

## Recommended demo flow (5 minutes)

If you only have time to show off five pages, do this in order:

1. `/quotes` — *"This is the marketplace front door."*
2. `/quotes/post` — *"Anyone can post a job in 2 minutes, no account."*
3. `/quotes/<any-job-slug>` — *"Here's what bidding + compare + Q&A look like."*
4. `/quotes/by/financial_planner/nsw` — *"And there are 104 of these auto-generated SEO pages."*
5. `/advisor-portal/marketplace` — *"The advisor side: analytics, templates, alert prefs, availability."*

That covers all 15 new features plus the round-1 marketplace core in one tab-walk.

---

## Direct download

This file is at `docs/demo-urls.md` in the repo so you always have it. Latest commit on the branch: `bd658fd`.
