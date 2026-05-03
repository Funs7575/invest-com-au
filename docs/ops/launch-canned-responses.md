# Launch canned responses

Three short templates for the launch window. Use them, edit them, don't agonise over them. The point is consistency and speed — the founder shouldn't be drafting from scratch at 2am.

Pairs with `docs/ops/severity-matrix.md` (when to send what), `docs/ops/launch-ops-plan.md` (intake + dashboard), and `docs/runbooks/launch-day.md` (timeline).

---

## When to use which

| Template | Trigger | Send via |
|---|---|---|
| Bug-report ack | Someone submits via the "Report a problem" button (PR 6) | Reply from `hello@invest.com.au` to the email they left, if any |
| Outage notice | P0 active or a P1 visible to users for > 2 hr | Status page first, then proactive email to known affected users only |
| Fixed-now | Closing the loop on a previously-acked report or outage | Same channel as the original ack/notice |

Rules:

- Plain Australian English. No "we apologise for any inconvenience this may cause" filler.
- Name the issue concretely. Vague reassurance erodes trust faster than the bug did.
- Never promise a fix ETA you can't hit. "We're on it" is fine. "We'll have this fixed by 5pm" only if you genuinely will.
- Compliance copy is not flexible — if you're acknowledging anything that touches AFSL / GDPR / disclosure correctness, defer to `lib/compliance.ts` for any quoted text.

---

## 1. Bug-report acknowledgement

For replies to a `bug_reports` row that included an email. Send within the working day during launch week.

**Subject:** Got it — we're looking at this

```
Hi {{first_name_or_blank}},

Thanks for the report. I can see what you described on {{page_url}} —
that's not what's meant to happen, and we're looking at it now.

I'll come back to you when it's fixed, or sooner if I need more info
to reproduce. If you want to add anything (a screenshot, the time it
happened, what you were trying to do), just reply to this email.

— Finn
invest.com.au
```

Do NOT include:

- A ticket ID. We don't have a ticketing system v1; the `bug_reports.id` is internal.
- A promise about response time. The severity matrix sets internal SLAs, not customer-facing ones.
- An apology paragraph. One sentence is plenty.

---

## 2. Outage notice

For an active P0 or a long-running P1. Status page is the canonical channel. Proactive email is for users who *just* hit the broken flow (e.g. a recent advisor enquiry that 5xx'd, a Stripe checkout that errored).

### 2a. Status page entry

**Title:** Investigating issues with {{affected_surface}}

```
We're investigating reports that {{specific_observed_symptom}}.
Other parts of invest.com.au are unaffected.

You don't need to do anything — we'll update this page when we know
more or have a fix in place.

Last updated: {{timestamp_AET}}.
```

Update the same entry every 30 minutes while the incident is open, even if it's just "still investigating, no new info". Silence reads as abandoned.

### 2b. Proactive email (only when we know who was affected)

**Subject:** Heads up — your {{flow_name}} earlier today

```
Hi {{first_name_or_blank}},

You tried to {{describe_the_action — "submit an advisor enquiry",
"complete checkout", etc.}} on invest.com.au {{when}}, and it didn't
go through because of an issue on our side.

We've got it working again {{or: we're still working on it — I'll
write again once it's fixed}}. {{If action_required: To get back on
track, just {{describe action — "resubmit the form", "try checkout
again"}}.}}

Sorry about that.

— Finn
invest.com.au
```

Only send to users where you have evidence the flow failed for them. Mass-emailing the whole list during an outage tends to make a small incident feel like a big one.

---

## 3. Fixed-now

For closing the loop with the original reporter, or for the status page once an incident is resolved.

### 3a. Reply to the bug-report submitter

**Subject:** Re: Got it — we're looking at this

```
Hi {{first_name_or_blank}},

Quick update — this is fixed. {{One sentence describing what was
wrong and what changed.}}

If you've still got time, give it another go on {{page_url}} and let
me know if it's behaving for you now. If anything else looks off,
hit the "Report a problem" button at the bottom-right of any page
and it'll reach me directly.

Thanks for flagging it.

— Finn
invest.com.au
```

### 3b. Status page resolution

**Title:** Resolved — {{affected_surface}}

```
This is now fixed. {{One-sentence summary of what was wrong.}}

If you tried {{flow_name}} between {{start_AET}} and {{end_AET}} and
it didn't work, please give it another go.

Thanks for your patience while we sorted it out.
```

Move the entry into the "resolved" section of the status page; do not delete it.

---

## What not to send

These are tempting but harmful during launch.

- **A weekly "what's improved" digest.** Every email to the full list is a chance to bounce, complain, or unsubscribe. Save it for post-launch.
- **A "we're aware of intermittent issues" notice with no specifics.** Either you can name the symptom or the user will assume it's worse than it is.
- **An apology email for a P2 that 12 people saw.** The blast radius doesn't justify the inbox real estate.
- **Anything from a personal email address.** Always `hello@invest.com.au` (set in `lib/email-templates.ts`) so reply chains are findable.

---

## Cross-references

- Severity matrix (when to escalate, public comm thresholds): `docs/ops/severity-matrix.md`
- Launch-ops plan (bug intake, alerts, dashboard): `docs/ops/launch-ops-plan.md`
- Launch timeline (status page, smoke tests, rollback): `docs/runbooks/launch-day.md`
- Email helper + From-address conventions: `lib/resend.ts`, `lib/email-templates.ts`
- Compliance copy source of truth: `lib/compliance.ts`
