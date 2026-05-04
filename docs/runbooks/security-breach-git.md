# Security breach — leaked credential in git

## What just fired

A production secret (API key, service-role key, webhook secret, or
other credential) has been committed to the git repository. This
includes: appearing in a commit diff, in a `.env` file that was
accidentally staged, in a log statement, or in a test fixture.

GitHub's secret-scanning workflow (CI) may have already flagged it.
Or a human spotted it in a PR diff or `git log`.

## Severity

A committed secret is a **P0** incident regardless of whether the
repo is public or private. Private repos can be forked, keys can
be logged by GitHub audit trails, and CI runners have access to the
full history.

**Assume the secret is compromised from the moment it entered git.**

## Step 1 — Rotate the secret immediately (< 15 minutes)

Do not wait for git history cleanup. Rotate first, clean later.

| Secret | Where to rotate |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe dashboard → Developers → API keys → Roll |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks → endpoint → Roll signing secret |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → Roll |
| `RESEND_API_KEY` | Resend → API Keys → Revoke + create new |
| `CRON_SECRET` / `INTERNAL_API_KEY` / `REVALIDATE_SECRET` | `openssl rand -base64 32`; update Vercel env |
| `ANTHROPIC_API_KEY` | Anthropic console → API keys → Revoke + create new |
| `ADMIN_MFA_COOKIE_SECRET` | `openssl rand -base64 32`; update Vercel env; forces all admin re-auth |

Update the new key in **Vercel** immediately:

```bash
vercel env rm <SECRET_NAME> production
vercel env add <SECRET_NAME> production  # paste new value
# Redeploy:
vercel --prod
```

See `secret-rotation.md` for the full per-key rotation procedure.

## Step 2 — Audit access logs (within 1 hour)

Was the secret used by an attacker?

```sql
-- Supabase: look for service-role queries from unexpected origins
-- (Supabase logs in dashboard → Logs → PostgREST)
-- Look for requests at unusual hours or from non-Vercel IPs.

-- Admin action log — unexpected admin actions in the window:
SELECT * FROM admin_action_log
WHERE created_at > now() - interval '24 hours'
ORDER BY created_at;

-- Stripe: check for API key usage in the Stripe dashboard
-- → Developers → Logs → filter by the compromised key
-- → look for unexpected charge/payout/customer calls
```

Check Sentry for any `401` errors that stopped after the attacker
tried the rotated (now invalid) key.

## Step 3 — Remove from git history

> **Warning:** rewriting git history on a shared repo disrupts
> every contributor's local clone. Coordinate before doing this.
> If the repo is private and the window was short, weigh the
> disruption cost vs. the benefit — the rotation in Step 1 is the
> real fix.

### Option A — BFG Repo Cleaner (recommended)

```bash
# 1. Clone a fresh bare mirror
git clone --mirror git@github.com:funs7575/invest-com-au.git invest-repo-mirror.git
cd invest-repo-mirror.git

# 2. Create a passwords file with the leaked value
echo 'LEAKED_SECRET_VALUE' > ../secrets.txt

# 3. Run BFG to replace all occurrences with ***REMOVED***
java -jar bfg.jar --replace-text ../secrets.txt .

# 4. Expire reflogs and GC
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 5. Force-push (Tier E — requires founder explicit consent each time)
git push --force
```

### Option B — `git filter-repo`

```bash
pip install git-filter-repo
git filter-repo --replace-text <(echo 'LEAKED_SECRET_VALUE==>***REMOVED***')
git push --force
```

After force-push:
- All contributors must `git fetch && git reset --hard origin/main`
  (their local clones still hold the old history).
- Any forks will still contain the old history — contact GitHub
  support to purge cached data.

### Caches and CDN

- GitHub caches commits for its web UI. Open a GitHub Support ticket
  to request a cache purge for the affected commits.
- If the secret appeared in a CI log, contact GitHub to purge the
  run log.

## Step 4 — Notify (if data was exfiltrated)

If Step 2 confirms the secret was used by an attacker:

1. Follow `breach-notification.md` for the full notification
   procedure (OAIC 30-day clock, individual notification).
2. If `STRIPE_SECRET_KEY` was used to create charges or access
   customer data, notify Stripe's risk team.
3. If `SUPABASE_SERVICE_ROLE_KEY` was used, treat all PII tables
   as potentially read — escalate to P0 breach.

## Post-incident

- Add the leaked value pattern to `gitleaks` config
  (`.gitleaks.toml`) so the CI secret-scan catches it in future.
- Run `gitleaks git --no-banner` locally to verify clean history.
- Review `.gitignore` — was the file that leaked secrets excluded?
  Add it if not.
- Add a pre-commit hook (or strengthen lint-staged) to block `.env`
  files from being staged.
- Document the rotation in `docs/secret-rotation-log.md` (Q-12
  tracker).
- Conduct a post-mortem within 5 business days:
  `docs/post-mortems/YYYY-MM-DD-credential-leak.md`.

## Do NOT

- Do **not** delete the commit — that leaves a dangling object in
  the reflog and confused history. Use BFG or `filter-repo` instead.
- Do **not** assume private = safe. Private repo access logs show
  all cloners; CI runners read full history.
- Do **not** reuse a rotated secret for any purpose — generate a
  fresh value every time.
- Do **not** push the history rewrite until the new secret is live
  in Vercel and the old one is already revoked.
