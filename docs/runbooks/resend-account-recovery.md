# Resend account recovery

## What just fired

Email delivery stopped — Resend dashboard is inaccessible, the API key was revoked, or the sending domain lost verification.

## Impact

- **Who:** All users who expect transactional emails (advisor leads, newsletter, quiz results, drip campaigns).
- **What breaks:** Outbound email delivery; `sendEmail()` calls return 401 or 422. Users don't receive confirmations, lead notifications silently fail.
- **Revenue exposure:** Advisor leads with no email notification may go cold. Drip sequences stall.

## Diagnosis

1. Check Resend status at `status.resend.com`.
2. Try the API directly:
   ```bash
   curl https://api.resend.com/emails \
     -H "Authorization: Bearer $RESEND_API_KEY" \
     -d '{"from":"noreply@invest.com.au","to":"test@example.com","subject":"test","html":"test"}'
   ```
   - `401`: key revoked or wrong key.
   - `422`: domain verification failed or `from` address not allowed.
   - `5xx`: Resend infrastructure issue — check status page.
3. Log in to `resend.com/dashboard` → Domains → check `invest.com.au` DNS status (SPF / DKIM / DMARC).

## Mitigations

### API key revoked or lost

1. Log in to `resend.com` → API Keys → Create new key. Scope: **Full access** (needed for domain management) or **Sending access** (minimal scope for production use).
2. Update `RESEND_API_KEY` in Vercel → Settings → Environment Variables for production and preview.
3. Re-deploy the latest commit to pick up the new key.
4. Verify with the `curl` above — expect `{"id":"..."}` response.

### Domain verification failed (DNS records removed or expired)

1. `resend.com/dashboard` → Domains → `invest.com.au` → copy the three DNS records (DKIM TXT, SPF include, DMARC TXT).
2. Add/re-add records in the domain registrar (or Vercel DNS if domain is managed there).
3. DNS propagation: typically < 30 min for TXT records. Verify at `dnschecker.org`.
4. Resend auto-verifies every 10 min. Or click "Verify" manually in the Domains panel.
5. Send a test email to confirm delivery.

### Account locked / MFA lost

1. Use the backup email address on file to request account recovery at `resend.com/support`.
2. Resend support response time: typically < 4 h on business days.
3. If the email address itself is inaccessible, recover Google Workspace first (see `vercel-team-recovery.md`).

### Audience / contact list export (before closing account)

```bash
# Via the Resend API — exports all contacts in a given audience
curl https://api.resend.com/audiences/<AUDIENCE_ID>/contacts \
  -H "Authorization: Bearer $RESEND_API_KEY" > resend-audience-export.json
```

Find `AUDIENCE_ID` in `resend.com/dashboard` → Audiences → select audience → URL contains the ID. Store the export in the secure ops bucket before any account action.

## Recovery

1. Send a real transactional email through the app (e.g., submit a test advisor enquiry that triggers a notification).
2. Confirm the email lands in the inbox — not spam.
3. Check `resend.com/dashboard` → Emails → confirm delivery status shows `delivered`.
4. Check the bounce rate in Resend analytics — if it spiked during the outage, suppress bounced addresses to protect sender reputation.

## Post-incident

- Rotate `RESEND_API_KEY` even if the root cause was domain DNS — a lockout is a good rotation trigger.
- Store the new key and any new backup codes in `1Password` → `resend-prod`.
- Update `docs/runbooks/secret-rotation.md` with the rotation date.
- If bounce rate > 5% during the outage window, pause drip campaigns temporarily (`/admin/automation` kill switch).
