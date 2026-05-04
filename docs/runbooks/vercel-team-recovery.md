# Vercel team recovery

## What just fired

The team can no longer deploy or manage the Vercel project — owner account locked, SSO broken, billing frozen, or team member departed taking ownership with them.

## Impact

- **Who:** Engineering. No immediate user-facing outage (existing deploy stays live).
- **What breaks:** New deployments, environment variable management, domain configuration changes, preview deployments.
- **Escalation risk:** If billing lapses, Vercel downgrades to free tier — function timeouts drop to 10 s, bandwidth caps apply. Site degrades rather than going fully down.

## Diagnosis

1. Attempt login at `vercel.com`. Note the exact error.
2. Check [Vercel status](https://vercel-status.com) — confirm account-specific, not platform-wide.
3. Identify who holds the **Owner** role: `vercel.com` → Team Settings → Members. At least two people should be Owners.
4. Check billing status: Team Settings → Billing → is there a failed payment or expired card?

## Mitigations

### SSO / identity provider broken (GitHub OAuth)

1. Vercel uses GitHub OAuth. If the GitHub account is inaccessible, recover GitHub first.
2. GitHub account recovery path:
   - Go to `github.com/login` → "Forgot password?" → email-based reset.
   - If email is also inaccessible: use SMS recovery or GitHub's identity verification flow.
3. Once GitHub access is restored, Vercel login via GitHub OAuth will work again.

### Owner account departed / only one owner

1. A current **Owner** must promote another member: Team Settings → Members → change role to Owner.
2. If all Owners are gone:
   - Contact Vercel support at `vercel.com/support` with proof of business ownership (ABN, domain registrar records showing you control `invest.com.au`).
   - Typical SLA: 1–2 business days.
3. To prevent recurrence: always maintain **at least two Owners** on the team.

### Billing frozen (payment failed)

1. Team Settings → Billing → update the payment method.
2. Pay any outstanding balance immediately.
3. Vercel re-activates the Pro plan within minutes of payment.
4. If the card was compromised: issue a new card, update Vercel billing, then report the old card to your bank.

### Environment variables lost / need rotation

```bash
# List all env vars (Vercel CLI)
vercel env ls

# Pull env vars to .env.local for local audit
vercel env pull .env.local --environment production
```

If a secret was leaked: rotate it at the source first (Stripe, Supabase, Resend), then update in Vercel:
```bash
vercel env rm VARIABLE_NAME production
vercel env add VARIABLE_NAME production  # prompts for new value
vercel --prod  # re-deploy to pick up new env
```

### Project ownership transfer

1. Current Owner: Team Settings → Projects → select project → Settings → Transfer.
2. Destination: another Vercel team or personal account.
3. After transfer: confirm all environment variables transferred (they do by default) and DNS settings are intact.

## Recovery

1. Confirm you can push a new commit and watch it deploy: `git commit --allow-empty -m "test deploy" && git push origin main`.
2. Verify the production domain (`invest.com.au`) resolves to the correct Vercel deployment: `curl -I https://invest.com.au` → check `x-vercel-id` header.
3. Check all P1 environment variables are present:
   - `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
   - `RESEND_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `ADMIN_MFA_COOKIE_SECRET`

## Post-incident

- Ensure **two Owners** at all times. Audit quarterly.
- Store Vercel billing email login credentials and backup codes in `1Password` → `vercel-prod`.
- If billing was frozen: check whether any Vercel-billed feature (e.g., analytics, speed insights) needs to be re-enabled after payment.
- Log the incident in `slo_incidents` if any deploy was blocked for > 30 min.
