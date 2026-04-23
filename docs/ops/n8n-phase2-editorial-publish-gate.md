# n8n Phase 2 — `editorial_publish_gate` (agent #04)

## Purpose

Daily Tier 2 review pass for the Editorial agent. Reads up to 4 of the oldest
`editorial_articles` rows where `status='draft'`, asks Claude Opus 4.7 to
enforce the ASIC-compliance + brand-voice + structural checks from
`.claude/agents/04-editorial.md` §Prompt skeleton step 2, and applies one
of three decisions per draft:

- **approve** — status → `review_passed`, `review_passed_at` stamped (opens
  the 4h Fin no-objection window that a later auto-publish workflow will
  watch)
- **revise** — status → `revisions_requested`, plus an `agent_tasks` row
  with `task_type='content_revision'` routing the work back to #03 CMO
- **reject** — status → `rejected`, reason stored in metadata

Each decision also writes one structured row to `agent_logs` so the
`analytics_daily` rollup can attribute editorial volume and the CTO digest
can catch repeated Claude-unparseable responses.

**Not included in this PR — flagged as follow-up:**

- The every-15-minute auto-publish pass (`review_passed` → `published` after
  4h window, guarded by `fin_objection_at IS NULL`). This needs its own
  workflow + uses the `review_passed_at` column this PR introduces.
- Tier 1 pillar workflow (Friend's Dad email loop via Gmail MCP).
- Post-publish retraction handler.

Those three are deferred until Gmail MCP + `ceo_approvals` dashboard exist.

## Schedule + timezone

- Cron: `0 0 10 * * *` (six-field: second minute hour dom month dow)
- Timezone: `Australia/Sydney`
- Fires at 10:00 AEST daily. Matches `.claude/agents/04-editorial.md`
  §Schedule exactly.

## Node shape (12 nodes)

```
Schedule Trigger → Compute Run Metadata → Read pending drafts (alwaysOutputData)
  → If is real draft
      ├── true  → Build review prompt → Call Claude → Parse Claude decision
      │       → Apply status PATCH → If needs task
      │           ├── true  → Insert revision task → Write decision log
      │           └── false → Write decision log
      └── false → Write empty-day log
```

`If is real draft` branches per-item on `$json.id not empty`. With
`alwaysOutputData: true` on `Read pending drafts`, an empty response emits
one dummy `{}` item that takes the `false` branch. When real drafts exist,
downstream Code / HTTP nodes run once per draft (1-4 iterations per day).

## Migration included

This PR ships
`supabase/migrations/20260423142454_add_review_passed_at_to_editorial_articles.sql`
adding `editorial_articles.review_passed_at TIMESTAMPTZ` + a partial index
on non-null values. The agent spec §Capabilities line 20 and §Prompt skeleton
step 4 reference this column; it was missing from the live schema. The
`Apply status PATCH` node stamps `review_passed_at = now()` only on
`action='approve'` so the later auto-publish pass can enforce its 4h window
via `now() - review_passed_at >= interval '4 hours'`.

## Import instructions

1. n8n UI → **Workflows → Import from File** →
   `infra/n8n/editorial_publish_gate.json`.
2. Replace placeholders (11 locations total):
   - `[HARDCODE_SUPABASE_SERVICE_ROLE_KEY_HERE]` — **10 locations**, two
     each on the five Supabase HTTP nodes (`Read pending drafts`,
     `Apply status PATCH`, `Insert revision task`, `Write decision log`,
     `Write empty-day log`).
   - `[HARDCODE_ANTHROPIC_API_KEY_HERE]` — **1 location** on `Call Claude`.
3. In **Settings**: Timezone `Australia/Sydney`, Error workflow
   `agent_error_logger`.
4. Leave **Active** OFF until smoke tests pass (and Anthropic credits are
   topped up — same blocker as `cto_daily` and `overseer_hourly`).

Keys: 1Password → `Supabase / invest-com-au / service_role` and
`Anthropic / invest-com-au`.

## Smoke test plan

**Run in this order once credits exist.**

### Test 1 — empty-day path (no credits burned)

1. Verify no drafts exist:
   ```sql
   select count(*) from editorial_articles where status = 'draft';
   ```
2. Swap `Schedule Trigger` → `Manual Trigger`, execute.
3. Expected: `If is real draft` false branch fires, `Write empty-day log`
   writes one `agent_logs` row with `metadata.note='no_drafts_pending'`.
   Claude is **not** called.

### Test 2 — populated path, approve case (~AUD$0.02)

1. Seed a clean Tier 2 draft:
   ```sql
   insert into editorial_articles (tier, title, slug, status, byline, brief, metadata)
   values (
     2,
     'Smoke test — clean Tier 2 draft',
     'smoke-test-clean-tier2',
     'draft',
     'invest.com.au Research Team',
     '{"tldr":"...","body_md":"...","faq":[...],"compliance_refs":["afsl.general-advice"]}'::jsonb,
     '{"smoke":true}'::jsonb
   );
   ```
2. Execute. Expected:
   - Claude returns `action='approve'`.
   - `Apply status PATCH` sets `status='review_passed'`, stamps
     `review_passed_at`, merges `metadata.editorial_review`.
   - `If needs task` takes **false** branch (no agent_tasks insert).
   - `Write decision log` writes `agent_logs` row `level='info'`,
     `metadata.action='approve'`.
3. Clean up:
   ```sql
   delete from editorial_articles where metadata->>'smoke' = 'true';
   delete from agent_logs where metadata->>'smoke' = 'true';
   ```

### Test 3 — populated path, revise case

1. Seed a draft containing a forbidden phrase and missing FAQ:
   ```sql
   insert into editorial_articles (tier, title, slug, status, byline, brief, metadata)
   values (2, 'Smoke test — revise case', 'smoke-test-revise', 'draft',
     'invest.com.au Research Team',
     '{"tldr":"...","body_md":"We recommend... (no FAQ)"}'::jsonb,
     '{"smoke":true}'::jsonb);
   ```
2. Execute. Expected:
   - Claude returns `action='revise'`.
   - Status → `revisions_requested`.
   - **`agent_tasks` row inserted** with `task_type='content_revision'`,
     `priority=150`, payload referencing the editorial_article id.
   - `agent_logs` row written with `level='info'`, `metadata.action='revise'`.
3. Clean up as in Test 2, plus `delete from agent_tasks where
   payload->>'source_workflow' = 'editorial_publish_gate'`.

### Test 4 — scheduled

Restore Schedule Trigger, activate, verify next 10:00 AEST fire.

## Gotchas

1. **12 nodes, two IF branches** — more than the other Phase 2 workflows.
   Walk the chain end-to-end when reviewing; the convergence point is
   `Write decision log` which receives items from both the `true` and
   `false` branches of `If needs task`.
2. **`alwaysOutputData` only on `Read pending drafts`.** The `If is real
   draft` node handles the empty-response branching by checking `$json.id`
   not empty — the dummy pass-through item has no id. Other HTTP nodes in
   this workflow don't need `alwaysOutputData` because they're always fed
   by the per-draft Code pipeline, which only emits items when real drafts
   exist.
3. **`metadata` is merged, not replaced.** `Parse Claude decision`
   constructs the PATCH body as `{...existing_metadata, editorial_review:
   {...}}` so the editorial review history accumulates alongside any
   sibling metadata keys #03 CMO may have set. Without this merge,
   PostgREST's default `prefer-merge` absence would clobber the column.
4. **Severity is partially derived from action.** The `Write decision log`
   node uses `level='warn'` when `action='reject'`, otherwise `'info'`.
   The CTO digest flags a `warn`-count spike as an escalation signal.
   `action='revise'` intentionally stays `info` — revisions are routine.
5. **Claude output unparseable → fall back to `revise`.** Never auto-approve
   on a malformed Claude response. `Parse Claude decision` defaults
   unparseable output to `{action: 'revise', reason: 'Claude output
   unparseable - human review required'}`, so the draft gets routed to a
   human via the `agent_tasks` revision path instead of slipping through.
6. **Hardcoded API keys.** Same as all other Phase 2 workflows — this n8n
   version does not expand `{{ $env.VAR_NAME }}` in HTTP headers. Paste
   literal keys into the 11 placeholder locations.
7. **Tier 2 only.** This workflow hard-assumes the drafts it processes are
   Tier 2. It does not guard against a Tier 1 pillar draft sneaking in.
   If a Tier 1 row reaches this workflow, Claude will still review it but
   will (correctly) reject on the byline check (Tier 1 requires Friend's
   Dad's named byline, not "Research Team"). The reject path is safe but
   wasteful; a later PR should add a `.tier == 2` guard to `Read pending
   drafts` once Tier 1 volumes ramp up.
8. **Spec is bigger than this workflow.** The full editorial spec covers
   daily review (this PR), every-15-min auto-publish (deferred), pillar
   Tier 1 coordination with Friend's Dad via Gmail MCP (deferred), and
   post-publish retractions (deferred). Activate those in subsequent PRs
   as their dependencies ship.
