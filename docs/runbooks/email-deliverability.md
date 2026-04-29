# Email deliverability validation (DMARC + SPF + DKIM)

**Owner:** Founder (DNS) + on-call engineer (verification).
**SLA:** mail-tester.com score ≥ 9/10 on every sender before launch.
**Refs:** U-03 in `docs/audits/REMEDIATION_QUEUE.md`.

## Why this matters

We send transactional, advisory, and marketing email from seven addresses on
`invest.com.au` (see `.env.local.example` lines 23–30 and `lib/resend.ts`).
If SPF/DKIM/DMARC are misaligned, mailbox providers (Gmail, Outlook) drop or
spam-folder our mail — privacy verifications, Stripe receipts, advisor
notifications, and the weekly newsletter all fail silently. Gmail's
February 2024 policy enforces DMARC for bulk senders; landing in spam at
launch is unrecoverable for a brand-new domain.

## Sender addresses in production

All configured in Resend → Domains → `invest.com.au`. Every address must be
verified individually (Resend issues per-mailbox DKIM where applicable, but
the domain-level DKIM CNAMEs are shared).

| Address | Used by | Volume class |
| --- | --- | --- |
| `fees@invest.com.au` | default sender, privacy verify, Stripe receipts (`lib/resend.ts:40`) | transactional |
| `hello@invest.com.au` | advisor + consultation flows (`lib/advisor-emails.ts:14`) | transactional |
| `partners@invest.com.au` | broker comms | transactional |
| `leads@invest.com.au` | lead notifications | transactional |
| `weekly@invest.com.au` | newsletter | bulk |
| `alerts@invest.com.au` | alert notifications | transactional |
| `billing@invest.com.au` | billing alerts | transactional |

## DNS records that MUST exist

These are added at the registrar (or Vercel if DNS is delegated). Resend
publishes the exact values under Domains → invest.com.au → DNS Records.

### 1. SPF (TXT on `invest.com.au`)

```
v=spf1 include:amazonses.com include:_spf.resend.com ~all
```

- `~all` (softfail) is acceptable; `-all` (hardfail) is preferred once
  every legitimate sender is enumerated.
- We use Resend exclusively for outbound; remove any leftover `include:`
  for old providers (SendGrid, Mailgun, Postmark) to avoid the 10-DNS-lookup
  SPF limit.
- Verify the lookup count stays below 10:
  ```bash
  dig +short TXT invest.com.au | tr -d '"' | grep '^v=spf1'
  # then paste into https://www.kitterman.com/spf/validate.html
  ```

### 2. DKIM (CNAME on `resend._domainkey.invest.com.au`)

Resend uses a single domain-level key. The exact CNAME target (e.g.
`resend._domainkey.invest-com-au.dkim.amazonses.com`) is shown in the Resend
dashboard.

```bash
dig +short CNAME resend._domainkey.invest.com.au
# expect: a *.dkim.amazonses.com or *.resend.com target
```

### 3. DMARC (TXT on `_dmarc.invest.com.au`)

Launch posture (monitor-first):

```
v=DMARC1; p=none; rua=mailto:dmarc@invest.com.au; ruf=mailto:dmarc@invest.com.au; fo=1; adkim=s; aspf=s
```

After 14 days of clean aggregate reports → tighten to `p=quarantine`
(pct=25 first), then `p=reject` after another 14 days at quarantine=100.
**Never go straight to `p=reject`** — one misaligned sender will null-route
all of our mail.

DMARC report aggregator: forward `dmarc@invest.com.au` into a free
parser (`postmarkapp.com/dmarc`, `dmarcian.com`, or self-host
`dmarc-report-converter`).

### 4. MX (so `dmarc@`, `hello@`, etc. can receive)

```bash
dig +short MX invest.com.au
```

Required for inbound; without MX you can't receive DMARC reports or replies.
Founder configures via Google Workspace / Fastmail / etc. (separate from
sending — Resend is outbound-only).

### 5. BIMI (optional, post-launch)

Once DMARC is at `p=quarantine` or stricter, add a BIMI record with our
verified-mark certificate to show the brand logo in Gmail. Defer until
30 days post-launch.

## Verification — run before every launch checkpoint

### Quick check (script)

```bash
bash scripts/check-email-deliverability.sh
```

Exits 0 if SPF, DKIM, DMARC, and MX all resolve and parse correctly. Exits
non-zero with the failing record name for any miss. Run this in CI as part
of `pre-launch-check.sh` or manually.

### Deep check (mail-tester)

For each of the seven sender addresses:

1. Open https://www.mail-tester.com/ — copy the unique address it shows.
2. Trigger a real send to that address from production. Easiest path per
   sender:
   - `fees@` → request a privacy-policy verification email from `/account/privacy` while logged in.
   - `hello@` → submit an advisor consultation request (or call `lib/advisor-emails.ts:sendAdvisorEmail` from a one-off script with the test address).
   - `partners@`, `leads@`, `alerts@`, `billing@` → trigger via the admin "send test email" affordance, or temporarily flip the recipient in the relevant cron.
   - `weekly@` → enrol the test address in the newsletter audience and run the next scheduled send manually.
3. Refresh mail-tester within ~2 min. Score must be **≥ 9/10**.
4. Investigate any deductions immediately — common failures:
   - "SPF: softfail" → add the missing `include:` or fix DNS propagation.
   - "DKIM: not signed" → Resend hasn't verified the domain; re-check DNS.
   - "Listed in Spamhaus" → escalate to Resend support; brand-new domains occasionally get caught.
   - "Body contains spammy phrases" → tweak template (rare for our copy).
5. Record the score per sender in this runbook's log section below.

### Gmail postmaster

Once we're sending >100 emails/day to Gmail (post-launch), enrol
`invest.com.au` in https://postmaster.google.com/ and watch:

- Domain reputation: must stay **High** or **Medium**.
- Spam rate: keep **< 0.1%** (Google's enforcement threshold is 0.3%).
- Authentication: must be 100% pass on SPF + DKIM + DMARC.

## Rollback / mitigation

If a DNS change breaks delivery:

1. Re-check the diff in registrar history; revert to the prior TXT/CNAME.
2. SPF/DKIM/DMARC propagation can take up to 24h on some resolvers — but
   most see updates within 5 min. Use `dig @8.8.8.8` and `dig @1.1.1.1` to
   confirm both Google and Cloudflare resolvers see the new value.
3. While propagation is in flight, `lib/resend.ts:sendEmail` returns
   `{ ok: false, error }` rather than throwing — calling code logs and
   moves on. No retries pile up.
4. If we must pause sending entirely, unset `RESEND_API_KEY` in Vercel
   project settings → Resend client logs `RESEND_API_KEY not set` and
   skips. Re-set after DNS is fixed.

## Escalation

- **DNS not propagating in >2h:** Founder contacts registrar support.
- **mail-tester score < 9 with no obvious deduction:** Resend support
  (support@resend.com) — they have direct visibility into Amazon SES
  reputation buckets.
- **Spam rate > 0.3% in Gmail postmaster:** Stop the next bulk send,
  triage the offending campaign, file a Google sender-review request.

## Pre-launch sign-off log

Append a row each time the check is run. Don't go-live without all green.

| Date (AEST) | Operator | SPF | DKIM | DMARC | MX | mail-tester (each sender) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| _YYYY-MM-DD_ | _name_ | ✓/✗ | ✓/✗ | ✓/✗ | ✓/✗ | fees: __, hello: __, partners: __, leads: __, weekly: __, alerts: __, billing: __ | _link to mail-tester reports_ |

## Related

- `lib/resend.ts` — sender wrapper.
- `lib/advisor-emails.ts` — `hello@` sender.
- `docs/runbooks/resend-rate-limited.md` — what to do when 429s start.
- `docs/runbooks/launch-day.md` — broader launch checklist.
- `scripts/check-email-deliverability.sh` — automated DNS check.
