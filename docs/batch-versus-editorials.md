# Batch-fill AI versus editorials

The daily cron at `/api/cron/versus-editorial-backfill` generates 5
missing editorials per run. With ~360 pairs to backfill, natural pacing
takes ~2-3 months. To accelerate, trigger it manually with a higher
`?max=` cap:

```bash
# Set CRON_SECRET from your Vercel env
CRON_SECRET="$(vercel env pull --environment=production /tmp/.env.cron && source /tmp/.env.cron && echo "$CRON_SECRET")"

# Fire a 40-pair batch (takes ~2-3 minutes; each call to Claude is ~3s)
curl -s "https://invest.com.au/api/cron/versus-editorial-backfill?max=40" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Each batch costs ~$0.40 in Anthropic API usage. A full 360-pair backfill
costs ~$3.60 and completes in ~10 batch runs (20 minutes with waits
between them to avoid rate limits).

## Quality check before merging into main flow

Every batch logs `{generated, failed, remaining}` — spot-check a few
generated pairs at `/versus/<pair-slug>` before running the next batch.
Good editorials have:

- A specific number comparison in the TL;DR (e.g. "0.7% FX vs 0.5%")
- Non-generic "Choose A if" / "Choose B if" copy that references real
  differences
- Three sections with distinct headings + 2-3 sentence bodies
- Two honest FAQs

Reject signs: any TL;DR containing "Both offer..." or "Depends on your
needs" is a fail — regenerate manually or mark the pair as skip.
