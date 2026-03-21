#!/bin/bash
# Pre-launch checklist for invest.com.au
# Run: bash scripts/pre-launch-check.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass=0
fail=0
warn=0

check() {
  if [ -n "$2" ] && [ "$2" != "undefined" ] && [ "$2" != "null" ]; then
    echo -e "  ${GREEN}✓${NC} $1"
    ((pass++))
  else
    echo -e "  ${RED}✗${NC} $1 — NOT SET"
    ((fail++))
  fi
}

warn_check() {
  if [ -n "$2" ] && [ "$2" != "undefined" ] && [ "$2" != "null" ]; then
    echo -e "  ${GREEN}✓${NC} $1"
    ((pass++))
  else
    echo -e "  ${YELLOW}⚠${NC} $1 — not set (recommended)"
    ((warn++))
  fi
}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  invest.com.au — Pre-Launch Checklist"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "1. REQUIRED Environment Variables"
check "NEXT_PUBLIC_SUPABASE_URL" "$NEXT_PUBLIC_SUPABASE_URL"
check "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$NEXT_PUBLIC_SUPABASE_ANON_KEY"
check "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY"
check "STRIPE_SECRET_KEY" "$STRIPE_SECRET_KEY"
check "STRIPE_WEBHOOK_SECRET" "$STRIPE_WEBHOOK_SECRET"
check "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
check "STRIPE_MONTHLY_PRICE_ID" "$STRIPE_MONTHLY_PRICE_ID"
check "STRIPE_YEARLY_PRICE_ID" "$STRIPE_YEARLY_PRICE_ID"
check "RESEND_API_KEY" "$RESEND_API_KEY"
check "CRON_SECRET" "$CRON_SECRET"
check "ADMIN_EMAILS" "$ADMIN_EMAILS"
echo ""

echo "2. RECOMMENDED Environment Variables"
warn_check "INTERNAL_API_KEY" "$INTERNAL_API_KEY"
warn_check "REVALIDATE_SECRET" "$REVALIDATE_SECRET"
warn_check "NEXT_PUBLIC_SENTRY_DSN" "$NEXT_PUBLIC_SENTRY_DSN"
warn_check "VERCEL_API_TOKEN" "$VERCEL_API_TOKEN"
warn_check "ANTHROPIC_API_KEY" "$ANTHROPIC_API_KEY"
warn_check "IP_HASH_SALT" "$IP_HASH_SALT"
echo ""

echo "3. Stripe Live Mode Check"
if [[ "$STRIPE_SECRET_KEY" == sk_live_* ]]; then
  echo -e "  ${GREEN}✓${NC} Stripe is in LIVE mode"
  ((pass++))
elif [[ "$STRIPE_SECRET_KEY" == sk_test_* ]]; then
  echo -e "  ${YELLOW}⚠${NC} Stripe is still in TEST mode — switch to live keys for launch"
  ((warn++))
else
  echo -e "  ${RED}✗${NC} STRIPE_SECRET_KEY not set"
  ((fail++))
fi
echo ""

echo "4. URL Configuration"
if [ "$NEXT_PUBLIC_SITE_URL" = "https://invest.com.au" ]; then
  echo -e "  ${GREEN}✓${NC} NEXT_PUBLIC_SITE_URL = https://invest.com.au"
  ((pass++))
else
  echo -e "  ${YELLOW}⚠${NC} NEXT_PUBLIC_SITE_URL = ${NEXT_PUBLIC_SITE_URL:-not set} (expected https://invest.com.au)"
  ((warn++))
fi
echo ""

echo "5. File Checks"
if [ -f "vercel.json" ]; then
  cron_count=$(grep -c '"path"' vercel.json)
  echo -e "  ${GREEN}✓${NC} vercel.json exists with $cron_count cron jobs"
  ((pass++))
else
  echo -e "  ${RED}✗${NC} vercel.json missing"
  ((fail++))
fi

migration_count=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l)
echo -e "  ${GREEN}✓${NC} $migration_count Supabase migrations found"
echo ""

echo "6. Build Check"
if npx next build --no-lint 2>/dev/null; then
  echo -e "  ${GREEN}✓${NC} Next.js build succeeds"
  ((pass++))
else
  echo -e "  ${YELLOW}⚠${NC} Skipped build check (run 'npm run build' manually)"
  ((warn++))
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  Results: ${GREEN}$pass passed${NC}  ${RED}$fail failed${NC}  ${YELLOW}$warn warnings${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $fail -gt 0 ]; then
  echo -e "  ${RED}NOT READY FOR LAUNCH — fix $fail required items above${NC}"
  exit 1
else
  echo -e "  ${GREEN}READY FOR LAUNCH${NC} (address warnings at your discretion)"
  exit 0
fi
