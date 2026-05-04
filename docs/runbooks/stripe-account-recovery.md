# Stripe account recovery

## What just fired

The team can no longer log in to the Stripe dashboard — MFA device lost, team member departed, or account suspended/frozen.

## Impact

- **Who:** Engineering and finance. No customer-facing outage unless webhooks are also affected.
- **What breaks:** New API key generation, payout controls, dispute management, subscription plan changes.
- **Revenue exposure:** Payouts pause within 7 days if bank account re-verification is triggered. Dispute windows are time-bound (7–21 days); missing them forfeits disputes.

## Diagnosis

1. Attempt login at `dashboard.stripe.com`. Note exact error (MFA required / account frozen / email not recognised).
2. Check [Stripe status](https://status.stripe.com) — confirm this is account-specific, not a Stripe outage.
3. If MFA: confirm which team member holds the authenticator or backup codes (`1Password` → vault `stripe-prod`).
4. If frozen: check the email address on record for a Stripe compliance or identity verification request.

## Mitigations

### Lost MFA device (no backup codes)

1. Go to `dashboard.stripe.com` → "Sign in" → "Use backup method" → "Send an SMS" (if a phone is on file) or "Use a recovery code".
2. If no recovery path works, use **Stripe Identity Verification**:
   - Click "I can't access my authenticator" → submit identity verification via Stripe's flow.
   - Approval typically takes < 24 h on business days.
3. Once in: immediately generate new backup codes and store in `1Password`.

### Lost email access (Google Workspace locked)

1. Recover Google Workspace admin access first (see `vercel-team-recovery.md` pattern — same Google admin recovery applies).
2. Once email is restored, trigger a Stripe password reset.

### Compromised API keys (key leaked or rotated externally)

1. **Revoke immediately:** `dashboard.stripe.com` → Developers → API keys → Roll restricted keys / secret key.
2. Update `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Vercel environment variables (production + preview).
3. Re-deploy the latest commit to pick up new keys: `vercel --prod` or trigger via GitHub Actions.
4. Verify webhooks are receiving: `dashboard.stripe.com` → Developers → Webhooks → check recent deliveries.

### Account suspended / identity re-verification requested

1. Check email (including spam) for the Stripe compliance request. These are time-sensitive — respond within the stated window (usually 5–7 business days).
2. Required documents typically: government ID, business registration extract (ASIC), proof of address.
3. Contact `support.stripe.com` if the deadline has passed — escalation to Stripe Risk team usually takes 1–2 business days.

## Recovery

1. Confirm API keys in Vercel match the active keys in `dashboard.stripe.com` → Developers → API keys.
2. Fire a manual test webhook: `stripe trigger payment_intent.succeeded --api-key <new_key>`.
3. Verify `STRIPE_WEBHOOK_SECRET` by checking the signing secret in `dashboard.stripe.com` → Developers → Webhooks → click the endpoint → Signing secret.
4. Run a small real transaction end-to-end (or use Stripe test mode with a `4242 4242 4242 4242` card) to confirm checkout works.

## Post-incident

- Rotate all API keys (even ones that weren't the root cause) — a recovery incident means someone got closer than expected.
- Enable Stripe restricted keys instead of the full secret key if not already done.
- Store new backup codes and recovery contacts in `1Password` → `stripe-prod` vault.
- Update `docs/runbooks/secret-rotation.md` with dates and new rotation schedule.
- File an audit trail entry in `slo_incidents` if any customer data was at risk or payout was delayed.
