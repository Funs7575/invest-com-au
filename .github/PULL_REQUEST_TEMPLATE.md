<!--
  Default PR template. The `## Supersedes` section is read by
  `.github/workflows/auto-close-superseded.yml` on merge — fill it in
  honestly. Empty section = no auto-close, but the section MUST be
  present so the workflow's grep is reliable.

  For launch hotfixes, switch to: ?template=launch-hotfix.md
-->

## Summary

<!-- 1–2 sentences: what changed and why now. -->

## Tier

<!-- A / B / C / D / E per docs/audits/MERGE_AUTHORIZATION.md.
     - A: tests / docs / content / page UI / loop PRs
     - B: refactors / additive API tests / RLS migrations passing isolation gate
     - C: webhooks, cron, middleware/proxy, auth, compliance, lib/stripe,
          lib/supabase/admin, .github/workflows, new schema migrations
     - D: PR body says "set X env var first"
     - E: force-push / branch delete / repo settings -->

## Supersedes

_None._

<!--
  If this PR replaces or bundles in earlier PR(s), list them as a
  bulleted list of `#NNN` references — the auto-close workflow will
  close each on merge with a pointer comment. Examples:

  ## Supersedes
  - #648 — earlier attempt at the same X-09 ratchet (this PR uses createStaticClient)
  - #649 — separate-workflow approach to bundle gate (this PR scripts inside ci.yml)

  Always include the section, even if empty. The workflow greps for
  `## Supersedes` literally; missing the section silently disables the
  auto-close path.
-->

## Test plan

<!--
- [ ] vitest local: <result>
- [ ] type-check: clean
- [ ] CI: green
- [ ] Visual / functional: <how to verify>
-->
