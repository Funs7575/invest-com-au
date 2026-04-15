# Runbook: commodity news brief stuck in draft

**Symptom:** Editorial tried to publish a rapid news brief via
the commodity news API (Wave 13) and the response said
`status=draft` with compliance flags, even though the body
looked clean to the editor.

**Severity:** P3 — content delay, not a data integrity issue.
But for time-sensitive news (hours matter) this is a real
bottleneck.

## Diagnosis

1. **Check the brief row.**
   ```sql
   select id, article_slug, event_title, event_date, status,
          compliance_flags, reviewed_by
   from commodity_news_briefs
   where article_slug = '{{SLUG}}';
   ```

2. **Understand the flags.** The rapid-publish API runs
   `detectForwardLookingStatements()` from `lib/text-moderation.ts`
   and refuses to auto-publish if anything is found. Common hits:
   - `forward_looking:forward_looking_price_target` — contains
     "will hit $X" or similar
   - `forward_looking:guaranteed_returns_language` — contains
     "risk-free", "guaranteed"
   - `forward_looking:multiplier_return_prediction` — "double
     your money"
   - `missing_general_advice_warning_in_body` — needs the
     "general advice only" phrase
   - `missing_or_invalid_source_url` — source_url field empty or
     not https
   - `body_too_short` — body under 300 characters

3. **If none of the above fits**: the admin might have overridden
   something in the underlying `articles` row. Check
   `articles.status` separately.

## Fix

### Edit the body to clear the flag
1. Open `/admin/articles/editor/{slug}` (Wave 14 editor).
2. The split-pane scorecard shows the same remediation messages
   in plain English.
3. Edit the body, watch the grade climb back to A/B/C.
4. Click "Save + publish" once the scorecard is green.

### Manual override (rare — requires compliance sign-off)
If the flag is a false positive (e.g. a historical price
reference that the regex caught):
1. Leave the brief in `draft` and add the slug to an
   internal compliance-override ticket.
2. Have compliance review the actual copy.
3. Use `/api/admin/commodity-news-briefs` PATCH with
   `action=publish` to publish anyway.
4. Document the override in the brief's `compliance_flags`
   column manually so the audit trail shows the reasoning.

## Prevention

- Writers should use the Wave 14 editor (`/admin/articles/editor/[slug]`)
  as their authoring surface, not paste markdown directly into
  the API. The editor runs the scorecard live so the flag is
  visible before submit.
- The four news_brief template sections (Wave 14 seed) guide
  writers away from forward-looking claims by default.
- If false positives are common, the regexes in
  `lib/text-moderation.ts` need tightening — open a ticket
  rather than bypass them.
