#!/bin/bash
# Email deliverability DNS check for invest.com.au.
#
# Verifies SPF, DKIM (Resend), DMARC, and MX records exist and parse
# sensibly. Exits 0 if all required records are present, non-zero with
# the failing record name otherwise.
#
# Usage:
#   bash scripts/check-email-deliverability.sh
#   bash scripts/check-email-deliverability.sh staging.invest.com.au   # alt domain
#
# See docs/runbooks/email-deliverability.md for full context.

set -u  # NOT -e: we want to keep checking after the first failure

DOMAIN="${1:-invest.com.au}"
DKIM_SELECTOR="${DKIM_SELECTOR:-resend}"
RESOLVER="${RESOLVER:-8.8.8.8}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

fail=0
warn=0

if ! command -v dig >/dev/null 2>&1; then
  echo -e "${RED}error:${NC} 'dig' is required (apt install dnsutils / brew install bind)" >&2
  exit 2
fi

echo -e "${BOLD}Email deliverability check — ${DOMAIN}${NC}  (resolver: ${RESOLVER})"
echo

# ── 1. SPF ────────────────────────────────────────────────────────────────
echo -e "${BOLD}1. SPF${NC}  (TXT on ${DOMAIN})"
spf_records=$(dig @"${RESOLVER}" +short TXT "${DOMAIN}" | tr -d '"' | grep '^v=spf1' || true)
spf_count=$(printf '%s\n' "${spf_records}" | grep -c '^v=spf1' || true)

if [ -z "${spf_records}" ]; then
  echo -e "  ${RED}FAIL${NC} no v=spf1 TXT record found"
  fail=$((fail + 1))
elif [ "${spf_count}" -gt 1 ]; then
  echo -e "  ${RED}FAIL${NC} multiple SPF records — RFC violation, providers will ignore both"
  printf '         %s\n' "${spf_records}"
  fail=$((fail + 1))
else
  echo -e "  ${GREEN}PASS${NC} ${spf_records}"
  if ! printf '%s' "${spf_records}" | grep -q 'resend.com\|amazonses.com'; then
    echo -e "  ${YELLOW}WARN${NC} SPF doesn't include resend.com or amazonses.com — Resend mail will softfail"
    warn=$((warn + 1))
  fi
  if printf '%s' "${spf_records}" | grep -qE '\+all|\?all'; then
    echo -e "  ${YELLOW}WARN${NC} SPF ends with +all/?all — too permissive, use ~all or -all"
    warn=$((warn + 1))
  fi
fi
echo

# ── 2. DKIM (Resend selector) ─────────────────────────────────────────────
echo -e "${BOLD}2. DKIM${NC}  (CNAME on ${DKIM_SELECTOR}._domainkey.${DOMAIN})"
dkim=$(dig @"${RESOLVER}" +short CNAME "${DKIM_SELECTOR}._domainkey.${DOMAIN}" || true)
if [ -z "${dkim}" ]; then
  # Some providers publish DKIM as a TXT record instead of CNAME — accept either.
  dkim_txt=$(dig @"${RESOLVER}" +short TXT "${DKIM_SELECTOR}._domainkey.${DOMAIN}" | tr -d '"' || true)
  if [ -n "${dkim_txt}" ]; then
    echo -e "  ${GREEN}PASS${NC} DKIM TXT present"
  else
    echo -e "  ${RED}FAIL${NC} no DKIM record at ${DKIM_SELECTOR}._domainkey.${DOMAIN}"
    echo -e "         Add the CNAME shown in Resend dashboard → Domains → ${DOMAIN}"
    fail=$((fail + 1))
  fi
else
  echo -e "  ${GREEN}PASS${NC} ${dkim}"
  if ! printf '%s' "${dkim}" | grep -qE 'dkim\.amazonses\.com|resend\.com'; then
    echo -e "  ${YELLOW}WARN${NC} DKIM target isn't *.dkim.amazonses.com or *.resend.com — verify in Resend"
    warn=$((warn + 1))
  fi
fi
echo

# ── 3. DMARC ──────────────────────────────────────────────────────────────
echo -e "${BOLD}3. DMARC${NC}  (TXT on _dmarc.${DOMAIN})"
dmarc=$(dig @"${RESOLVER}" +short TXT "_dmarc.${DOMAIN}" | tr -d '"' | grep '^v=DMARC1' || true)
if [ -z "${dmarc}" ]; then
  echo -e "  ${RED}FAIL${NC} no DMARC record — Gmail bulk-sender policy will reject"
  echo -e "         Add: v=DMARC1; p=none; rua=mailto:dmarc@${DOMAIN}; fo=1; adkim=s; aspf=s"
  fail=$((fail + 1))
else
  echo -e "  ${GREEN}PASS${NC} ${dmarc}"
  policy=$(printf '%s' "${dmarc}" | grep -oE 'p=[a-z]+' | head -1)
  if [ "${policy}" = "p=none" ]; then
    echo -e "  ${YELLOW}WARN${NC} policy is p=none — fine for first 14 days; tighten to quarantine then reject"
    warn=$((warn + 1))
  fi
  if ! printf '%s' "${dmarc}" | grep -q 'rua='; then
    echo -e "  ${YELLOW}WARN${NC} no rua= aggregate-report address — you'll be blind to alignment failures"
    warn=$((warn + 1))
  fi
fi
echo

# ── 4. MX (needed to receive DMARC reports + replies) ─────────────────────
echo -e "${BOLD}4. MX${NC}  (so dmarc@, hello@, etc. can receive)"
mx=$(dig @"${RESOLVER}" +short MX "${DOMAIN}" || true)
if [ -z "${mx}" ]; then
  echo -e "  ${RED}FAIL${NC} no MX record — inbound mail (incl. DMARC reports) will bounce"
  fail=$((fail + 1))
else
  echo -e "  ${GREEN}PASS${NC}"
  printf '         %s\n' "${mx}"
fi
echo

# ── Summary ───────────────────────────────────────────────────────────────
echo -e "${BOLD}Summary${NC}"
if [ "${fail}" -eq 0 ] && [ "${warn}" -eq 0 ]; then
  echo -e "  ${GREEN}all green${NC} — proceed to mail-tester.com per-sender check (target ≥ 9/10)."
  exit 0
elif [ "${fail}" -eq 0 ]; then
  echo -e "  ${YELLOW}${warn} warning(s)${NC} — required records present; address warnings before launch."
  exit 0
else
  echo -e "  ${RED}${fail} failure(s)${NC}, ${warn} warning(s) — fix before launch."
  echo -e "  See docs/runbooks/email-deliverability.md."
  exit 1
fi
