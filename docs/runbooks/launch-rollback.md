# Launch rollback runbook

When something is on fire and you need to revert to a known-good
state. The whole procedure should complete in **under 10 minutes**.

## Decision tree

```
Is the site returning 5xx for >25% of requests?
├── YES → ROLL BACK NOW (skip to "Code rollback" below).
│
└── NO  → Is a single feature broken but the rest of the site is OK?
         ├── YES → Hotfix PR. Don't roll back the whole deploy.
         │
         └── NO  → Is data being lost or corrupted?
                  ├── YES → STOP. Pause writes (see "Database freeze").
                  │         Then evaluate rollback vs PITR.
                  │
                  └── NO  → Triage in Sentry. Probably not a rollback.
```

## Code rollback (Vercel)

This restores the previous deployment. Reverts code only — the
database is untouched.

1. Open Vercel dashboard → Deployments tab.
2. Find the most recent deployment marked **Ready** before the
   broken one.
3. Click `…` → **Promote to Production**.
4. Confirm. The promotion is atomic: traffic switches in < 30 seconds.
5. Verify with a fresh incognito window: `https://invest.com.au/`
   loads, check `/api/health` returns 200.
6. Post in #launch: "Rolled back to deployment <sha>. Investigating."
7. Open a tracking issue. Tag it `rollback`.

CLI alternative (faster if you know the deployment URL):

```bash
vercel rollback https://invest-com-au-<short-sha>.vercel.app --yes --token=$VERCEL_TOKEN
```

## Database freeze (data corruption)

If you suspect writes are corrupting data, stop them before rolling
back code:

1. Supabase dashboard → Database → Replication → **Pause**.
   This blocks all writes via PostgREST and the SSR client.
2. Read traffic continues. Forms will fail loudly (good — better than
   silent corruption).
3. Take a manual backup snapshot before doing anything else.

To restore writes after fixing:

1. Verify the fix on staging.
2. Resume replication.
3. Run any compensating queries needed to fix corrupted rows.

## Database point-in-time restore (Supabase Pro+)

Only used when data has been deleted or corrupted irrecoverably.
**This wipes ALL changes since the chosen restore point.**

1. Supabase dashboard → Project → Database → Backups → PITR.
2. Pick a timestamp **before** the corrupting change.
3. Choose: "Restore in place" (overwrites current DB) or "Clone to new
   project" (safer, allows reconciliation).
4. Restore in place takes 5-30 minutes. The site will be down for the
   duration. Set the status page to "Major outage".
5. After restore: re-promote the rolled-back code if you haven't
   already; verify `/api/health`.

Always prefer "Clone to new project" if there's any chance you'll need
to recover data from the corrupted state.

## DNS rollback

If Vercel itself is down (rare but happens), point DNS back at the
previous host:

1. Cloudflare / DNS provider → A record for `invest.com.au`.
2. Change to previous host's IP. Save.
3. With TTL = 60s (already lowered at T - 1h), propagation is fast.
4. Update status page: "Investigating elevated errors via Vercel".

## Communication during a rollback

- **Status page first.** Update before you start fixing. Users will
  forgive an outage you communicate; they won't forgive silence.
- **Then Slack #launch.** What broke, what you're doing, ETA.
- **Then customers.** Email if any data was affected. Tweet if it was
  user-visible. Don't speculate on causes — say what you know.
- **Don't post-mortem in public.** Internal retro only until you have
  the full timeline. Then decide what's safe to share.

## Post-rollback

1. Open a P1 issue with the timeline.
2. Schedule a no-blame retro within 48 hours.
3. Add a regression test that would have caught this.
4. Update this runbook if any step felt wrong.

## What NOT to do

- **Do not** debug in production. Roll back first, debug in a dev
  branch.
- **Do not** push a "hotfix" directly to main without review. Two
  people on every emergency PR, no exceptions.
- **Do not** bypass CI on the rollback path. The previous deploy
  already passed CI; promoting it doesn't need to re-run anything.
- **Do not** delete data to "clean up". Even bad data is evidence.
