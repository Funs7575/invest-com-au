# Secret rotation runbook

Schedule and procedure for rotating production credentials. Rotation
is cheap and uneventful when done routinely; expensive and risky when
done in an incident.

## Rotation schedule

| Secret                            | Frequency       | Owner    |
|-----------------------------------|-----------------|----------|
| `CRON_SECRET`                     | Every 90 days   | Eng lead |
| `INTERNAL_API_KEY`                | Every 90 days   | Eng lead |
| `REVALIDATE_SECRET`               | Every 90 days   | Eng lead |
| `SUPABASE_SERVICE_ROLE_KEY`       | Every 180 days  | Eng lead |
| `RESEND_API_KEY`                  | Every 180 days  | Eng lead |
| `STRIPE_SECRET_KEY`               | Annually        | Eng lead |
| `STRIPE_WEBHOOK_SECRET`           | Annually        | Eng lead |
| `IP_HASH_SALT` / `VOTE_HASH_SALT` | Never (rotation breaks lookup) | — |
| `ANTHROPIC_API_KEY`               | When a leak is suspected | Eng lead |

If any secret is suspected of compromise (appeared in a log, error
trace, or git history), rotate immediately regardless of schedule.

## Rotation procedure (general)

The pattern is the same for most secrets:

1. **Generate the new secret.**
   - Random bytes: `openssl rand -base64 32`
   - Provider dashboard: most have a "Rotate" button (Stripe, Resend,
     Supabase) which gives you the new one without invalidating the
     old one immediately.

2. **Add as a NEW Vercel env var** (don't replace yet).
   - Naming: `CRON_SECRET_NEW`, etc. while both are active.

3. **Deploy code that accepts BOTH old and new** for the rotation
   window. Example for `CRON_SECRET`:

   ```ts
   const valid = [process.env.CRON_SECRET, process.env.CRON_SECRET_NEW]
     .filter(Boolean);
   if (!valid.includes(token)) return 401;
   ```

4. **Update consumers** (cron schedules, webhooks, third-party
   integrations) to use the new secret.

5. **Wait at least 24 hours.** Watch the access logs to confirm
   nothing is still using the old secret.

6. **Remove the old secret** from Vercel env. Deploy code that only
   accepts the new one. Rename `CRON_SECRET_NEW` back to
   `CRON_SECRET`.

7. **Document the rotation** in `docs/secret-rotation-log.md` with
   date, secret name, and operator.

## Rotation procedure (Supabase service-role key)

The service-role key is special — Supabase only allows one active
service-role key at a time, so the rotation window is forced to zero.

1. Notify on-call: there will be ~5 minutes of degraded admin/cron
   functionality during the swap.
2. In Supabase dashboard → Project Settings → API → click "Roll" on
   the service-role key. Copy the new value immediately (only shown
   once).
3. In Vercel: replace `SUPABASE_SERVICE_ROLE_KEY` env var. Trigger a
   redeploy.
4. During the redeploy, in-flight admin requests using the old key
   will 401. Cron jobs scheduled during the window will fail and
   need to be re-run.
5. After redeploy: verify `/api/health` returns 200; spot-check an
   admin page; trigger a cron manually.

## Rotation procedure (Stripe webhook secret)

Stripe allows multiple webhook signing secrets simultaneously, so
this can be done with zero downtime:

1. In Stripe dashboard → Webhooks → endpoint settings → "Roll signing
   secret". Copy the new value.
2. Add `STRIPE_WEBHOOK_SECRET_NEW` to Vercel.
3. Update webhook handler to verify against either secret:

   ```ts
   const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_WEBHOOK_SECRET_NEW].filter(Boolean);
   let event;
   for (const secret of secrets) {
     try { event = stripe.webhooks.constructEvent(body, sig, secret); break; }
     catch { /* try next */ }
   }
   if (!event) return 400;
   ```

4. Deploy. Watch Stripe dashboard for webhook delivery — should be
   100% success.
5. After 24h, in Stripe → expire the old secret.
6. Remove old env var, deploy clean code.

## What to do if a secret leaks

1. **Don't panic — rotate immediately.** Every minute matters but the
   procedure is well-rehearsed.
2. **Rotate the affected secret** using the procedure above.
3. **Audit access logs** for unauthorized use (Supabase logs, Stripe
   events, Vercel logs). Look for activity from unexpected IPs.
4. **Notify Sentry / your security contact** if user data was
   accessed.
5. **Determine the leak source** — was it a git commit? An error
   message? A log line? Fix the root cause before closing the
   incident.
6. **Write up the incident** with timeline, impact, and fix. Add
   prevention to this runbook.

## Tools

- `openssl rand -base64 32` — generate a random secret (32 bytes,
  base64-encoded ≈ 43 chars).
- `gitleaks git --no-banner --redact --exit-code 1` — scan git
  history for known secret patterns. CI runs this on every PR.
- Vercel CLI: `vercel env add` / `vercel env rm` / `vercel env ls`.
- Supabase CLI: `supabase secrets set` / `supabase secrets list`.
