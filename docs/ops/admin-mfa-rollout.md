# Admin MFA Enforcement — Rollout Guide

**Audit ref:** V-NEW-07 (PR #256)  
**Status:** V-NEW-07a (foundation) merged; V-NEW-07b (UI + proxy gate) lands in this PR.

---

## What changes

Every `/admin/**` request now requires two proofs:

1. **Supabase session** — verified by the existing `proxy.ts` auth check (unchanged).
2. **MFA step-up cookie** (`admin_mfa_verified`) — a 12-hour HMAC-signed cookie issued by `POST /api/admin/mfa/verify` after the admin proves TOTP or recovery-code possession.

Admins who land on an admin page without a valid cookie are redirected to `/admin/mfa/verify?redirect=<original-path>`. After entering the correct code, they land on the original page. The cookie lasts 12 hours and is HttpOnly + SameSite=Strict.

**Exempt paths** (never checked for the MFA cookie):

- `/admin/login` — auth step, happens before MFA
- `/admin/mfa/verify` — this IS the MFA step
- `/admin/settings/mfa` — so admins can enroll even after their cookie expires

---

## Pre-deploy checklist

Complete **before** enabling this on Production:

### 1. Set `ADMIN_MFA_COOKIE_SECRET` in Vercel

```bash
# Generate a 32-byte random secret (64 hex chars)
openssl rand -hex 32
```

Go to Vercel → Project → Settings → Environment Variables and add:

| Variable | Environment | Value |
|---|---|---|
| `ADMIN_MFA_COOKIE_SECRET` | Production | `<output of openssl command>` |
| `ADMIN_MFA_COOKIE_SECRET` | Preview | `<can be a different value>` |
| `ADMIN_MFA_COOKIE_SECRET` | Development | `<local value ≥32 chars>` |

**Without this variable set:**

- The proxy gate reads the cookie but `verifyMfaCookieEdge` returns `false` (secret missing → fail closed).
- Every authenticated admin will be redirected to `/admin/mfa/verify` on every request.
- The verify route (`POST /api/admin/mfa/verify`) returns HTTP 500.

So set this variable **before** deploying the V-NEW-07b commit, or the admin panel will be inaccessible even to enrolled admins.

### 2. Enroll all admin accounts in MFA

For each admin email in `ADMIN_EMAILS`:

1. Sign in to the admin panel.
2. Go to **Admin → Settings → Two-factor authentication** (`/admin/settings/mfa`).
3. Click **Enable MFA** and scan the QR code with your authenticator app.
4. Save the recovery codes (copy + download).
5. Click **I've saved everything — finish enrolment**.

Do this BEFORE the proxy gate goes live, otherwise you'll be locked out (the `/admin/settings/mfa` page is exempt from the gate, so you can always enroll, but it's cleaner to enroll first).

### 3. Smoke-test on Preview

1. Deploy the V-NEW-07b branch to a Vercel preview (the PR triggers this automatically).
2. Confirm `ADMIN_MFA_COOKIE_SECRET` is set in Preview.
3. Sign in to the preview admin panel.
4. Confirm you're redirected to `/admin/mfa/verify`.
5. Enter your TOTP code. Confirm you land on `/admin`.
6. Navigate around `/admin/*`. Confirm no further redirects for 12 hours.
7. Test recovery-code path: toggle "Use a recovery code" on the verify page, enter a code.

---

## Rollback

To roll back the MFA gate:

```
git revert <V-NEW-07b commit SHA>
git push origin main
```

The gate is entirely in `proxy.ts` (the `verifyMfaCookieEdge` call and `ADMIN_MFA_EXEMPT` array). Reverting removes it; the underlying `lib/admin-mfa-cookie*.ts` and `app/api/admin/mfa/verify/route.ts` are inert without the proxy call.

**Do NOT** unset `ADMIN_MFA_COOKIE_SECRET` after rollback — keep it set so the secret is ready for re-deploy.

---

## Ongoing operations

### Cookie expiry

The cookie expires 12 hours after issuance. Admins will be redirected to `/admin/mfa/verify` on their next admin page visit after expiry. This is the intended behaviour — it bounds the window for session-hijacking even if the cookie is somehow captured.

There is no "remember this device" or "extend session" option. The 12-hour window is a deliberate SOC 2 / security posture choice.

### Secret rotation

To rotate the secret:

1. Generate a new secret: `openssl rand -hex 32`.
2. Update `ADMIN_MFA_COOKIE_SECRET` in Vercel (all environments).
3. Redeploy (env var change triggers a redeploy automatically in Vercel).
4. **All existing cookies are immediately invalidated.** Every admin will have to re-verify on their next admin page visit. This is a 30-second interruption.

Document the rotation in `docs/runbooks/secret-rotation-log.md` (see Q-12).

### Enrolling a new admin

1. Add the new email to `ADMIN_EMAILS` env var.
2. The new admin signs in and visits `/admin/settings/mfa`.
3. They enroll MFA before starting any admin work (the settings page is gate-exempt).
