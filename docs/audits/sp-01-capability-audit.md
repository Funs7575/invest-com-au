# SP-01 — Capability Audit: Advisor-Portal Reuse Map for Startup Portal

**Stream:** SP  
**Task:** SP-01  
**Date:** 2026-05-20  
**Audit ref:** `docs/audits/sp-startup-portal-brief.md`  
**Status:** Complete — output of iter 482

---

## Summary

The advisor-portal represents ~80% of what the startup portal needs. This document maps each advisor-portal primitive to one of:

- **Verbatim copy** — copy file, rename identifiers, no logic change
- **Copy-with-substitutions** — same logic, advisor-specific identifiers replaced with startup equivalents
- **Structural template** — same shell, different domain content (tabs, fields, column names)
- **Genuinely new** — no advisor-portal equivalent; build from scratch

---

## 1. Authentication Primitives

### `lib/require-advisor-session.ts` → `lib/require-startup-session.ts`

**Class:** Copy-with-substitutions

**What it does:** Resolves the authenticated advisor's `professional_id` from either a Supabase Auth JWT (via `professionals` table lookup) or a legacy `advisor_session` cookie. Uses `createAdminClient()` because `advisor_sessions` has no `auth.uid()` linkage — the deny-all-by-design RLS means service-role is the correct client per CLAUDE.md § 'Two Supabase clients'.

**Substitutions required:**

| Advisor pattern | Startup equivalent |
|---|---|
| Reads `professionals` table | Reads `startup_profiles` table |
| `.or("auth_user_id.eq.${uid},email.eq.${email}")` | `.eq("owner_user_id", uid)` (direct FK, no email fallback needed) |
| `.in("status", ["active", "pending"])` | `.in("status", ["active", "draft"])` |
| Returns `number` (numeric PK on `professionals`) | Returns `string` (uuid PK on `startup_profiles`) |
| Reads cookie `advisor_session` | Reads cookie `startup_session` |
| Queries `advisor_sessions.professional_id` | Queries `startup_sessions.startup_id` |
| Returns `advisor.id` (number) | Returns `startup.id` (uuid string) |

**Service-role justification:** `startup_sessions` is deny-all-anon by design (mirrors `advisor_sessions`). No `auth.uid()` linkage on the table. Exactly the "bypass intentional deny-all RLS" category in CLAUDE.md. Valid use of `createAdminClient()`.

**Signature change:**
```ts
// advisor: Promise<number | null>
// startup: Promise<string | null>
export async function requireStartupSession(request: NextRequest): Promise<string | null>
```

---

### `lib/portal-gate.ts` + `lib/account-kinds.ts`

**Class:** Additive modification (3 touch points, each 1-liner)

`lib/account-kinds.ts` changes:
1. `lib/account-types.ts` — add `"startup"` to `AccountKind` union (the canonical source of truth for `WorkspaceKind`)
2. `KNOWN_WORKSPACE_KINDS` set — add `"startup"` (line 119)
3. `portalForKind()` switch — add `case "startup": return "/startup-portal"` (line 161)

`lib/portal-gate.ts` changes:
1. `currentPortalPath()` switch — add `case "startup": return "/startup-portal"` (line 78)

No logic changes. The `enforcePortalKind("startup")` call in the layout will then work out-of-the-box via the existing `getKindsForUser` + `account_kind_membership` view, once `startup_profiles` is wired into the membership view (SP-02 migration concern).

**Important:** `account_kind_membership` is a VIEW that UNIONs across `*_accounts`/profiles tables. SP-02's migration must add a `startup_profiles` arm to this view so that `getKindsForUser()` correctly returns `kind: "startup"` for startup founders. Without this, `holdsExpected` is always `false` and every founder is redirected to the chooser.

---

## 2. Layout + Routing Shell

### `app/advisor-portal/layout.tsx` → `app/startup-portal/layout.tsx`

**Class:** Verbatim copy (3 substitutions)

```ts
// FROM
export const metadata: Metadata = {
  title: "Advisor Portal — Invest.com.au",
  description: "Manage your leads, profile, and billing on Invest.com.au's advisor directory.",
  ...
};
await enforcePortalKind("advisor");

// TO
export const metadata: Metadata = {
  title: "Startup Portal — Invest.com.au",
  description: "Manage your rounds, investors, and data room on Invest.com.au.",
  ...
};
await enforcePortalKind("startup");
```

Remaining boilerplate (`export const dynamic = "force-dynamic"`, `robots: { index: false }`, children passthrough) is identical.

---

### `app/advisor-portal/types.ts` → `app/startup-portal/types.ts`

**Class:** Structural template — replace advisor domain types with startup domain types

The advisor types file exports: `ViewType`, `Advisor`, `FirmMember`, `FirmDetails`, `Lead`, `BillingRecord`, `Stats`, `ViewDay`, `Review`, `WeeklyEnquiry`, `ProfileCompleteness`, `CategoryPricing`, `DisputeModal`.

Startup equivalents needed:

| Advisor type | Startup equivalent | Notes |
|---|---|---|
| `ViewType` | `ViewType` | Values: `"dashboard" \| "rounds" \| "data-room" \| "investors" \| "profile" \| "settings"` |
| `Advisor` | `Startup` | `id: string (uuid)`, `slug`, `company_name`, `abn`, `stage`, `sector[]`, `status`, `esic_eligible`, `esic_verified_at`, `owner_user_id` |
| `Lead` | `Inquiry` | `id`, `investor_user_id`, `status`, `inquiry_message`, `wholesale_cert_id`, `data_room_access_granted_at`, `created_at` |
| `BillingRecord` | _(omit in SP-05 — billing is SP extension, not MVP)_ | |
| `Stats` | `StartupStats` | `totalInquiries`, `openRounds`, `raisedCents`, `targetCents`, `dataRoomViews`, `esicStatus` |
| `FirmMember`, `FirmDetails` | _(omit — no firm concept in startup portal)_ | |
| `CategoryPricing` | _(omit — no lead purchase in startup portal)_ | |
| `DisputeModal` | _(omit)_ | |

New types unique to startup portal:

```ts
export type Round = {
  id: string; startup_id: string; instrument: "safe" | "safe_t" | "convertible_note" | "priced_equity";
  status: "open" | "committed" | "closed" | "withdrawn";
  target_aud_cents: number; raised_aud_cents: number;
  wholesale_only: boolean; closes_at?: string;
  lead_investor_name?: string; valuation_cap_aud_cents?: number;
  discount_pct?: number; min_ticket_aud_cents: number; created_at: string;
};

export type DataRoomFile = {
  id: string; filename: string; category: string;
  requires_wholesale_cert: boolean; uploaded_at: string;
  access_count?: number;
};

export type EsicVerification = {
  id: string; status: "pending" | "approved" | "rejected";
  created_at: string; reviewed_at?: string; notes?: string;
};
```

---

## 3. Portal Page Shell

### `app/advisor-portal/page.tsx` (811 LOC) → `app/startup-portal/page.tsx`

**Class:** Structural template

The advisor page is a large "use client" component with tab-based navigation driven by `ViewType`. The startup portal page follows the same pattern but with different tabs and data shapes.

**Tab mapping:**

| Advisor tabs | Startup tabs | Reuse |
|---|---|---|
| Dashboard | Dashboard | Template — different stats cards |
| Leads | Investors (inquiries) | Template — different columns |
| Profile | Profile | Template — different fields |
| Team | _(omit MVP)_ | |
| Analytics | _(omit MVP)_ | |
| Billing | _(omit MVP)_ | |
| Settings | Settings | Verbatim shell |
| — | Rounds | New — no advisor equivalent |
| — | Data Room | New — no advisor equivalent |

**Shared structural patterns to reuse:**
- Tab switcher rendering pattern (`selectedTab === "x"` conditionals)
- Server-side initial data fetch passed as props to "use client" root
- Loading state pattern (`isLoading`, skeleton renders)
- Toast notification pattern
- Form submission pattern (`handleSubmit`, `isSubmitting` state)

**Advisor-specific patterns to AVOID in startup portal** (hard-coded advisor terminology found via verification gate grep):

| Location | Hard-coded term | Action |
|---|---|---|
| `layout.tsx:6` | "Manage your leads, profile, and billing on Invest.com.au's **advisor** directory." | Replace with startup-specific copy |
| `layout.tsx:13` | `enforcePortalKind("advisor")` | Replace with `"startup"` |
| `types.ts:24` | `advisor_tier?: string \| null` | Omit — no tier concept in startup portal |
| `types.ts:27–28` | Comment references "advisor self-selected" | Remove / rewrite |
| `types.ts:56` | `advisor_notes?: string` on `Lead` | Startup equivalent uses `inquiry_message` |

---

## 4. API Routes

### `app/api/advisor-portal/` → `app/api/startup-portal/` (or `app/api/startups/`)

The advisor portal has 4 API routes:

| Advisor route | Pattern | Startup equivalent |
|---|---|---|
| `marketplace-analytics/route.ts` | GET — reads analytics, returns JSON | `app/api/startups/analytics/route.ts` (round views, inquiry pipeline stats) |
| `marketplace-settings/route.ts` | GET + PATCH — reads/updates advisor settings | `app/api/startups/profile/route.ts` (startup profile CRUD) |
| `reviews/respond/route.ts` | POST — advisor responds to review | _(no equivalent — startups don't respond to reviews in MVP)_ |
| `webhooks/route.ts` | POST — billing webhook ingest | _(no equivalent in MVP — startup billing not in scope until SP-08+)_ |

New API routes with no advisor equivalent (all belong to SP-05+):

- `app/api/startups/rounds/route.ts` — CRUD for `startup_rounds`
- `app/api/startups/rounds/[id]/route.ts` — individual round update + status transitions
- `app/api/startups/data-room/upload/route.ts` — multipart upload to Supabase Storage
- `app/api/startups/data-room/grant/route.ts` — grant/revoke investor data-room access
- `app/api/startups/inquiries/route.ts` — list inquiries + update status (accept/decline)
- `app/api/startups/signup/route.ts` — founder onboarding (SP-04)

**Pattern to follow:** all routes use `requireStartupSession(request)` for auth, `createClient()` from `@/lib/supabase/server` for RLS-scoped queries, and `withValidatedBody(Schema, handler)` from `lib/validation/withValidatedBody.ts`.

---

## 5. Proxy Route Protection

### `proxy.ts`

**Class:** Additive modification (2 touch points)

Line 194 — noindex block. Add:
```ts
pathname.startsWith('/startup-portal') ||
pathname.startsWith('/startup-signup')
```

Lines 203–205 — protected route detection. The advisor-portal uses `enforcePortalKind` from the layout RSC (not proxy.ts auth check). The proxy only adds the `X-Robots-Tag` header. The broker-portal and admin routes use the full `isProtected` supabase-auth check. For startup-portal, follow the advisor-portal pattern: add to the noindex block, rely on `enforcePortalKind("startup")` in the layout RSC for auth.

---

## 6. Genuinely New (no advisor equivalent)

These components/routes have no advisor-portal analog and must be built from scratch:

| Component | Description | Stream |
|---|---|---|
| `app/startup-portal/rounds/` | Round management UI (open/close/update) with instrument-conditional fields | SP-05 + SP-06 |
| `app/startup-portal/data-room/` | File upload, per-file wholesale gating, per-investor access grants | SP-07 |
| `app/account/wholesale-cert/` | Investor-side s708 certification upload + status display | SP-08 |
| `app/startup-portal/esic-verification/` | ESIC evidence upload + admin-review flow | SP-09 |
| `lib/require-startup-session.ts` | See §1 above — copy-with-substitutions, but the startup-sessions table doesn't exist yet | SP-03 |
| `supabase/migrations/*_startup_portal_schema.sql` | 8 new tables (see brief SP-02) | SP-02 |

---

## 7. Shared Utilities (use as-is, no changes needed)

| Utility | How startup portal uses it |
|---|---|
| `lib/supabase/server.ts` | All owner-scoped reads in portal routes |
| `lib/supabase/admin.ts` | `require-startup-session.ts` (deny-all sessions table) |
| `lib/logger.ts` | Structured logging in all new lib helpers |
| `lib/rate-limit.ts` | Rate-limit data-room upload + inquiry submission |
| `lib/validation/withValidatedBody.ts` | Wrap all new POST/PATCH/DELETE routes |
| `lib/compliance.ts` | Startup-specific disclaimers added here, not inline |
| `lib/portal-gate.ts` | After adding `"startup"` case (§1 above) |
| `lib/account-kinds.ts` | After adding `"startup"` to set and switch (§1 above) |

---

## 8. Implementation Order

Per `sp-startup-portal-brief.md` dependency graph:

1. **SP-02 first** — schema must exist before auth helpers reference the tables
2. **SP-03 second** — `require-startup-session.ts` + `proxy.ts` changes + `lib/account-kinds.ts` / `lib/portal-gate.ts` additions
3. **SP-04 third** — signup flow creates `startup_profiles` rows (depends on SP-02 tables + SP-03 session helper)
4. **SP-05+** — portal dashboard + sub-routes (depend on SP-03 auth surface)

The `lib/account-kinds.ts` / `lib/account-types.ts` changes (adding `"startup"` to `AccountKind`) must land in SP-03's PR (not a separate PR) since they're tightly coupled to the session helper wiring.

---

## 9. LOC Estimate

| Phase | Reuse LOC | New LOC | Total |
|---|---|---|---|
| SP-02 schema migration | 0 | ~250 (migration SQL + RLS) | ~250 |
| SP-03 auth surface | ~45 (require-advisor-session template) | ~30 (substitutions) | ~75 |
| SP-04 signup | ~0 | ~400 (multi-step form + API) | ~400 |
| SP-05 portal shell | ~400 (advisor-portal template) | ~600 (rounds + inquiries tabs) | ~1000 |
| SP-07 data room | ~0 | ~300 (upload + grant routes + UI) | ~300 |
| SP-08 wholesale cert | ~0 | ~250 | ~250 |
| Total (non-test) | ~445 | ~1830 | ~2275 |

Within the audit-remediation loop's per-iteration cap (≤500 LOC code, ≤1500 LOC content). Individual items fit within budget; SP-05 may need 2 iterations.
