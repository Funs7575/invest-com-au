# n8n Phase 2 — `lead_nurture_hourly` (agent #11, Loops lane)

## Purpose

Hourly Loops batch flush per `.claude/agents/11-email-lifecycle.md` §Schedule
(cron `5 * * * *`). Reads queued `agent_tasks` with
`task_type='loops_enqueue'`, enforces the lane + identity guardrails from
the spec, and (in production) would batch-push them to Loops.

**Scope is intentionally narrow — validation + routing scaffold only.** This
PR is a **dry-run-safe scaffold**: the actual Loops API dispatch is stubbed
because Loops MCP / Loops API credentials are not yet wired into the n8n
instance. The workflow validates every queued task, updates `agent_tasks`
with the validation verdict (rejected / validated), and logs the decision.
A future PR will add the Loops dispatch step and flip `status='completed'`
on successful send.

Not included here — explicit follow-ups required before activation:

- **Suppression-list lookup** before dispatch. Spec says authoritative list
  lives in `agent_memory:email:suppression` (MVP); a `suppression_list`
  table migration is a **hard pre-requisite** per spec §Forbidden actions
  line 60 + TODO.md. Do not activate `lead_nurture_hourly` until that
  migration lands and this workflow reads from it.
- **6-hour dedupe lookup** on `(contact_email, logical_event_key)` across
  both lanes (Resend + Loops). Spec §Prompt skeleton step 4.
- **Loops MCP / API call.** The `status='completed'` transition happens
  after Loops confirms enqueue; this workflow currently leaves validated
  tasks in `status='queued'` with `metadata.lead_nurture_hourly.decision
  = 'validated_pending_dispatch'`.

## Schedule + timezone

- Cron: `0 5 * * * *` (six-field: 5 minutes past every hour)
- Timezone: `Australia/Sydney`
- Matches `.claude/agents/11-email-lifecycle.md` §Schedule exactly.

## Node shape (8 nodes)

```
Schedule Trigger → Compute Window → Read queued loops tasks (alwaysOutputData)
  → If is real task
      ├── true  → Validate and classify → PATCH task status → Write per-task log
      └── false → Write empty-hour log
```

`Read queued loops tasks` pulls up to 50 rows with
`task_type='loops_enqueue' AND status='queued'` created in the last hour.
With `alwaysOutputData: true`, an empty response emits one dummy `{}` item
that takes the IF-false branch. Real items run the validation + patch path
once per task.

## Validation logic

Per `.claude/agents/11-email-lifecycle.md` §Capabilities + §Forbidden
actions, `Validate and classify` rejects a task if:

| Check | Rejection reason | log level |
|---|---|---|
| `payload.routed_by_agent` not in `{03, 04, 14, 17, cmo, editorial, growth, ai_search}` | `lane_violation` | warn |
| `payload.from` not in `{noreply, admin, billing}@invest.com.au` | `identity_violation` — T4 tripwire | **error** |
| `payload.contact_email` missing | `missing` | warn |
| `payload.sequence_slug` missing | `missing` | warn |
| `payload.logical_event_key` missing | `missing` | warn |

Rejected tasks → `status='failed'`, `error_message` set, log written with
the listed severity.

Passing tasks → `status='queued'` (unchanged), metadata stamped with
`lead_nurture_hourly.decision='validated_pending_dispatch'`, log written
at `info`.

**Severity split is intentional:** `identity_violation` is the only
rejection that flags `level='error'` because the spec calls it a T4
tripwire (line 47: "any task where `from` is not in the allow-list").
The CTO digest will pick it up via error-count escalation signals.

## Import instructions

1. n8n UI → **Workflows → Import from File** →
   `infra/n8n/lead_nurture_hourly.json`.
2. Replace placeholders (8 locations total):
   - `[HARDCODE_SUPABASE_SERVICE_ROLE_KEY_HERE]` — 2 each on the four
     Supabase HTTP nodes (`Read queued loops tasks`, `PATCH task status`,
     `Write per-task log`, `Write empty-hour log`).
3. Leave **Active** OFF — spec §Forbidden actions line 60 explicitly
   blocks production Loops batch sends while the suppression list is in
   MVP `agent_memory` form. Activating this workflow without first
   shipping the `suppression_list` table migration + a dispatch step
   would violate the spec.

Keys: 1Password → `Supabase / invest-com-au / service_role`.

## Smoke test plan

All tests run with `Active: OFF` via manual trigger. No Loops credits
burned (there's no Loops call yet).

### Test 1 — empty-hour path

1. Verify no queued loops tasks exist:
   ```sql
   select count(*) from agent_tasks
   where task_type = 'loops_enqueue' and status = 'queued'
     and created_at > now() - interval '1 hour';
   ```
2. Swap Schedule → Manual Trigger; execute.
3. Expected: `Write empty-hour log` writes one `agent_logs` row with
   `metadata.note='no_queued_tasks'`.

### Test 2 — reject case (lane_violation + identity_violation)

1. Seed a bad task (wrong originator AND wrong from):
   ```sql
   insert into agent_tasks (agent_name, task_type, status, priority, payload, metadata)
   values (
     'bogus_agent',
     'loops_enqueue',
     'queued',
     100,
     jsonb_build_object(
       'routed_by_agent', 'bogus_agent',
       'from', 'ceo@invest.com.au',
       'contact_email', 'test@example.com',
       'sequence_slug', 'smoke-test',
       'logical_event_key', 'smoke-1',
       'variables', '{}'::jsonb
     ),
     jsonb_build_object('smoke', true)
   );
   ```
2. Execute. Expected:
   - Task PATCH → `status='failed'`, `error_message` lists both
     violations.
   - Log row at `level='error'` (because identity_violation is present).
3. Clean up:
   ```sql
   delete from agent_tasks where metadata->>'smoke' = 'true';
   delete from agent_logs where metadata->>'lead_nurture_hourly' = 'true'
     and metadata->>'task_id' in (<from step 1>);
   ```

### Test 3 — valid case

1. Seed a valid task from an allow-listed originator + identity:
   ```sql
   insert into agent_tasks (agent_name, task_type, status, priority, payload, metadata)
   values (
     'growth',
     'loops_enqueue',
     'queued',
     100,
     jsonb_build_object(
       'routed_by_agent', '14',
       'from', 'noreply@invest.com.au',
       'contact_email', 'valid@example.com',
       'sequence_slug', 'nurture-broker-interest',
       'logical_event_key', 'smoke-2',
       'variables', '{"first_name":"Ada"}'::jsonb
     ),
     jsonb_build_object('smoke', true)
   );
   ```
2. Execute. Expected:
   - Task PATCH → `status='queued'` (unchanged),
     `metadata.lead_nurture_hourly.decision='validated_pending_dispatch'`.
   - Log at `level='info'` with the same task_id.
3. Clean up as in Test 2.

### Test 4 — scheduled

Activate only after the suppression-list migration + Loops dispatch step
have landed. Prior to that, running this workflow on schedule would
repeatedly validate the same tasks without dispatching them, accumulating
`metadata.lead_nurture_hourly` stamps without progressing the queue.

## Gotchas

1. **Dry-run stub — no Loops dispatch.** This workflow does not call the
   Loops API. Validated tasks stay in `status='queued'`; a future workflow
   (or an extension of this one) needs to call `Loops /v2/contacts` +
   `/v2/events` and flip the task to `status='completed'`.
2. **Suppression list blocker.** Per spec, activating this workflow in
   production before the `suppression_list` table migration lands is a
   T2 violation. The scaffold will happily mark tasks as
   `validated_pending_dispatch` without suppression lookup — do not
   interpret that status as "safe to send".
3. **No dedupe lookup yet.** Real production dedupe needs to read
   `agent_tasks` for the same `(payload.contact_email,
   payload.logical_event_key)` across both `loops_enqueue` and
   `resend_send` task types in the last 6 hours. This workflow skips
   that check — add it before the Loops dispatch step.
4. **`routed_by_agent` number vs name.** Per the original spec, the
   numeric IDs (`03`, `04`, `14`, `17`) are canonical, but current
   `agent_tasks.agent_name` values in the codebase use names
   (`cmo`, `editorial`, `growth`, `ai_search`). The validate node accepts
   both forms. If either the spec or the codebase picks one, tighten
   `PERMITTED_LOOPS_ORIGINATORS` accordingly.
5. **Identity violation is T4.** `level='error'` triggers CTO digest
   classification. If we see `identity_violation` in logs it means some
   agent tried to send from a personal identity (Fin, Friend's Dad, an
   AR/CR, etc.) — treat as an incident, not noise.
6. **6-field cron.** `0 5 * * * *` = second 0, minute 5 of every hour.
   Five-field `5 * * * *` will misfire on n8n v2.17+.
7. **Hardcoded keys.** Same as other Phase 2 workflows — 8 placeholders
   to paste.
