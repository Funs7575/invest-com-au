# n8n Phase 2 — `advisor_onboarding`

## Purpose

Once-a-day sweep of newly-registered advisors sitting in `professionals.profile_quality_gate = 'pending'`. For each advisor the workflow:

1. Scores profile completeness against a hard field-gate (photo, bio, specialties, email, location, years_experience, plus AFSL/registration for credentialed professions).
2. **Complete profiles:** asks Claude to draft a welcome email → enqueues an `agent_tasks` row for the (future) Loops email-lifecycle workflow to actually send → marks the advisor `profile_quality_gate='passed'`, stamps `onboarded_at`, sets `portal_onboarded=true`.
3. **Incomplete profiles:** marks `profile_quality_gate='needs_review'`, writes `profile_missing_fields[]` with the list of gaps so the advisor portal can prompt them. No Claude call, no email.

One `agent_logs` row per advisor (either `level='info'` onboarded or `level='warn'` needs-review). On an empty queue, writes a single sentinel `metadata.note='no_pending_advisors'` row — standard dry-day heartbeat pattern.

## Schedule + timezone

- Cron: `0 0 9 * * *` (six-field: second minute hour dom month dow)
- Timezone: `Australia/Sydney`
- Fires at 09:00 Sydney daily — immediately after the 06:00 `cto_daily` / `analytics_daily` digest slot, slightly before the 10:00 `editorial_publish_gate` review window.

## Node shape (13 nodes)

```
Schedule Trigger
  → Read pending advisors                           (GET professionals, alwaysOutputData)
  → Has advisor row?                                (IF $json.id notEmpty — filters dummies)
      ├── false (dummy/empty queue) → Write empty-day log → END
      └── true (real advisor)
          → Evaluate profile                        (Code: score completeness, build prompt)
          → Profile complete?                       (IF $json.is_complete === true)
              ├── false (missing fields)
              │     → Mark advisor needs_review     (PATCH professionals)
              │     → Write needs-review log        (POST agent_logs level=warn)
              └── true (complete)
                    → Call Claude                   (POST anthropic /v1/messages)
                    → Parse welcome draft           (Code: extract subject/body/next_steps)
                    → Enqueue welcome email task    (POST agent_tasks kind='welcome_email_send')
                    → Mark advisor passed           (PATCH professionals)
                    → Write onboarded log           (POST agent_logs level=info)
```

Key design notes:

- **Welcome email is drafted, not sent.** This workflow only drafts and queues. Actually sending belongs to the email-lifecycle workflow (agent #11) which owns the Loops/Resend integration. The task row hands the draft to that queue.
- **Incomplete path does not call Claude.** Saves an API call on profiles that aren't ready to onboard. The advisor portal uses `profile_missing_fields[]` to render inline guidance to the advisor.
- **No new migrations.** `professionals` already has `profile_quality_gate` (default `'pending'`), `profile_missing_fields text[]`, `onboarded_at`, `portal_onboarded`, `profile_gate_checked_at`. We write to all of these.
- **`runOnceForEachItem` on both Code nodes.** Ensures per-advisor isolation so a malformed row in one iteration can't pollute the next.

## Import instructions

1. n8n UI → **Workflows → Import from File** → pick `infra/n8n/advisor_onboarding.json`.
2. Replace placeholders — **15 locations total:**
   - `[HARDCODE_SUPABASE_SERVICE_ROLE_KEY_HERE]` — **14 locations**, two each on the seven Supabase HTTP nodes (`Read pending advisors`, `Write empty-day log`, `Enqueue welcome email task`, `Mark advisor passed`, `Write onboarded log`, `Mark advisor needs review`, `Write needs-review log`).
   - `[HARDCODE_ANTHROPIC_API_KEY_HERE]` — **1 location** on `Call Claude`.
3. In the workflow **Settings** sidebar, confirm:
   - **Timezone**: `Australia/Sydney`
   - **Error workflow**: `agent_error_logger`
4. Leave **Active** OFF until after smoke tests (and until the Anthropic credit balance is topped up — see 2026-04-23 incident note on overseer execution #25).

Keys live in 1Password (`Supabase / invest-com-au / service_role`, `Anthropic / invest-com-au`).

## Smoke test plan

Run in this order once credits are available.

### Test 1 — empty queue (zero credits burned)

1. Temporarily swap `Schedule Trigger` for a `Manual Trigger`.
2. Verify the queue:
   ```sql
   select count(*) from professionals where profile_quality_gate = 'pending';
   ```
   If zero, Test 1 is ready.
3. Execute. Expect: `Has advisor row` false-branch fires → one `agent_logs` row with `agent_name='advisor-onboarding'`, `metadata.note='no_pending_advisors'`. **Claude is not called.**

### Test 2 — incomplete advisor (zero credits burned)

1. Seed one incomplete advisor:
   ```sql
   insert into professionals (slug, name, type, profile_quality_gate)
   values ('smoke-incomplete', 'Smoke Test Incomplete', 'financial_advisor', 'pending')
   returning id;
   ```
2. Execute workflow.
3. Expect:
   - `Evaluate profile` scores most fields missing.
   - `Profile complete?` false-branch fires.
   - `Mark advisor needs review` PATCHes `profile_quality_gate='needs_review'`, `profile_missing_fields=['photo_url','bio','specialties','email','location','years_exp','afsl_or_reg']` (or similar).
   - `Write needs-review log` writes `level='warn'`.
   - **Claude is not called.**
4. Cleanup:
   ```sql
   delete from professionals where slug = 'smoke-incomplete';
   delete from agent_logs where metadata->>'advisor_slug' = 'smoke-incomplete';
   ```

### Test 3 — complete advisor (burns ~AUD$0.01–0.02 of Claude credits)

1. Seed one complete advisor:
   ```sql
   insert into professionals
     (slug, name, type, specialties, email, photo_url, bio, afsl_number,
      location_display, years_experience, profile_quality_gate)
   values
     ('smoke-complete', 'Smoke Test Complete', 'financial_advisor',
      '["SMSF","Retirement planning"]'::jsonb,
      'smoke@example.com',
      'https://example.com/photo.jpg',
      repeat('Qualified financial advisor with broad SMSF experience. ', 3),
      '123456', 'Sydney NSW', 12, 'pending')
   returning id;
   ```
2. Execute. Expect:
   - `Profile complete?` true-branch.
   - `Call Claude` returns a JSON block with `subject`, `body_plain`, `next_steps`.
   - `Parse welcome draft` extracts the draft.
   - `Enqueue welcome email task` creates one row in `agent_tasks` with `agent_name='email-lifecycle'`, `task_type='welcome_email_send'`, `status='queued'`, and the drafted email content in `payload`.
   - `Mark advisor passed` PATCHes `profile_quality_gate='passed'`, stamps `onboarded_at=now()`, `portal_onboarded=true`, clears `profile_missing_fields=[]`.
   - `Write onboarded log` writes `level='info'`.
3. Verify:
   ```sql
   select profile_quality_gate, onboarded_at, portal_onboarded
   from professionals where slug = 'smoke-complete';
   select agent_name, task_type, status, payload->'subject', payload->>'to_email'
   from agent_tasks where payload->>'advisor_slug' = 'smoke-complete';
   ```
4. Cleanup:
   ```sql
   delete from agent_tasks where payload->>'advisor_slug' = 'smoke-complete';
   delete from agent_logs where metadata->>'advisor_slug' = 'smoke-complete';
   delete from professionals where slug = 'smoke-complete';
   ```

### Test 4 — scheduled

Restore Schedule Trigger, confirm cron `0 0 9 * * *`, activate. Next 09:00 Sydney → one advisor_onboarding run writes one `agent_logs` row per pending advisor.

## Gotchas

1. **Empty PostgREST response kills the chain without `alwaysOutputData`.** Same pattern as every other Phase 2 workflow — `Read pending advisors` has `alwaysOutputData: true`, and the first IF gate uses `$json.id notEmpty` to strip the dummy pass-through item before it hits `Evaluate profile`.
2. **Six-field cron.** `0 0 9 * * *` on n8n v2.17+. A five-field `0 9 * * *` will misfire.
3. **Hardcoded API keys (no `$env`).** This n8n instance does not expand `{{ $env.VAR_NAME }}` inside HTTP Request node headers. All 15 key-bearing locations must hold the literal key.
4. **PATCH uses `=` prefix on URL field** so n8n evaluates the `{{ $json.advisor_id }}` interpolation. Without the `=` n8n would treat the URL as a literal string and the PATCH would 404.
5. **Welcome email is not sent from here.** We only enqueue `agent_tasks(task_type='welcome_email_send')`. The email-lifecycle workflow (agent #11) pulls this queue and actually sends via Loops/Resend. If #11 is down, drafted emails will sit in the queue — that's by design, not a bug.
6. **Credentialed-profession gate.** The completeness check requires AFSL **or** registration number only for `type ∈ ('financial_advisor','wealth_manager','stockbroker','accountant')`. Other types (mortgage brokers, coaches, etc.) pass without it. Adjust the `needsAfsl` list in `Evaluate profile` if the type taxonomy changes.
7. **Batch cap of 25 advisors per run.** `Read pending advisors` uses `limit=25`. Sufficient for current onboarding volume; raise once the SMB Sales funnel (#05) is producing >25 qualified advisors per day.
