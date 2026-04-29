# Article cover-image backfill (M-01b)

One-shot maintenance procedure for populating `articles.cover_image_url`
for the ~266 published articles. Pairs with the page-side wiring in
`app/article/[slug]/page.tsx` that prefers a real cover image for the
`og:image` / `twitter:image` whenever the column is non-null.

This is **not** an incident runbook. It's a content-ops procedure the
founder runs ad-hoc whenever a new batch of cover images is sourced.
The audit-remediation loop never runs it.

## Why we do this

- M-01a (PR #227) gave us a site-wide default OG card so every route
  has something. M-01b is the per-article custom cover work — usually
  worth ~30–50% social-share CTR over the generic default.
- The detail page already renders `cover_image_url` via
  `<ArticleCover>`; with this column populated the gradient
  placeholder disappears and Twitter/Facebook share cards show the
  real image.

## Inputs you need

1. `scripts/cover-images.json` — the per-slug mapping. Format:

   ```json
   {
     "best-asx-brokers": "https://cdn.invest.com.au/articles/asx-brokers.webp",
     "first-home-buyer-fhss": "https://cdn.invest.com.au/articles/fhss.webp"
   }
   ```

   Per-slug entries always win over category defaults. Add slugs as
   covers are commissioned; the file is git-tracked content (founder
   maintains).

2. `scripts/cover-images.defaults.json` — optional category-level
   fallback. Lets you ship one image per category in the first pass
   while per-article covers are being sourced. Format:

   ```json
   {
     "Investing": "https://cdn.invest.com.au/articles/cat/investing.webp",
     "Property": "https://cdn.invest.com.au/articles/cat/property.webp"
   }
   ```

3. Env: `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. The
   service-role key bypasses RLS — required because the script writes
   the column from a server context with no user session.

Both JSON files live in `scripts/` because they're operator inputs to
`scripts/backfill-cover-images.mjs`, not application data.

## Procedure

1. **Plan.** Always start with a dry-run. The script defaults to plan
   mode and prints the proposed updates without touching the DB:

   ```bash
   node scripts/backfill-cover-images.mjs
   ```

   Confirm the count looks right and skim the sample updates. If the
   list is empty, either the JSON files are missing or every article
   already has a cover.

2. **Apply.** Once the plan looks good, re-run with `--apply`:

   ```bash
   node scripts/backfill-cover-images.mjs --apply
   ```

   The script writes one `UPDATE` per row that needs it. Failures are
   logged per-slug and the exit code is non-zero if any row failed.

3. **Verify.** Spot-check a handful of slugs:

   ```bash
   curl -s https://invest.com.au/article/best-asx-brokers \
     | grep -oE 'og:image[^>]+content="[^"]+"' \
     | head
   ```

   The returned `og:image` should be the URL from the manifest, not a
   `/api/og?…` query string. (ISR revalidate is 3600s on the article
   route — wait up to an hour or hit the page once to warm the new
   cache.)

## Idempotency

- Re-running the script after a clean backfill is a no-op (every row
  is skipped with reason `already populated`).
- Adding a new slug to the manifest and re-running only updates that
  slug.
- Default behaviour is to leave already-populated rows alone. To
  intentionally overwrite — e.g. after rebranding the cover image
  catalogue — pass `--overwrite`:

  ```bash
  node scripts/backfill-cover-images.mjs --apply --overwrite
  ```

## Rollback

There is no destructive write; rolling back means setting the column
back to `NULL`. The fastest path is a targeted update:

```sql
update articles
   set cover_image_url = null
 where slug in ('slug-a', 'slug-b');
```

Or, to undo a full-corpus run, run the script with the same manifest
against a backup (PITR — see `docs/runbooks/database-rollback.md`) and
diff the two `cover_image_url` columns.

The page-side wiring degrades cleanly: any article with `null`
`cover_image_url` falls back to the M-01a default OG via the
`/api/og?…` template. Rollback never produces a broken share card.

## What the script does NOT do

- It does not upload images. The manifest URLs must already be live
  on the CDN before the script runs.
- It does not validate that the URLs return HTTP 200 — that's a
  founder/ops concern and adding network checks per row would slow
  the script and risk false negatives behind CDN auth.
- It does not bump `updated_at` (the column has a default trigger;
  Supabase handles this).
- It never runs from CI or the audit-remediation loop. Live-DB
  procedures are founder-run only — see
  `docs/audits/REMEDIATION_DEFAULTS.md` "Stuff the loop will never
  do".

## Related

- `scripts/backfill-cover-images.mjs` — the script itself.
- `app/article/[slug]/page.tsx` — `generateMetadata` consumes the
  populated column; `<ArticleCover>` renders it on the detail page.
- M-01a precedent: PR #227 (site-wide default OG card).
- Queue item: `docs/audits/REMEDIATION_QUEUE.md` Stream M, M-01b.
