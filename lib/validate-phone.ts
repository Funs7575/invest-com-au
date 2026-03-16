/**
 * Australian phone number validation.
 *
 * Accepted formats (all normalise to 10 digits or E.164 +61):
 *   Mobile:   04XX XXX XXX  (04 prefix, 10 digits total)
 *   Landline: 0X XXXX XXXX  (0[2-9] prefix, 10 digits total)
 *   Intl AU:  +61 4XX XXX XXX or +61 X XXXX XXXX
 *   Intl AU:  0061 ...
 *
 * Explicitly rejected:
 *   - Fewer than 8 digits after stripping formatting
 *   - Known fake patterns: 0400000000, 0412345678, 1234567890, etc.
 *   - Non-numeric content beyond the optional leading +
 */

/** Strip spaces, dashes, parentheses, dots from a phone string */
function normalisePhone(phone: string): string {
  return phone.replace(/[\s\-().]/g, "");
}

/** Well-known obviously-fake AU phone sequences */
const FAKE_PATTERNS = new Set([
  "0400000000",
  "0411111111",
  "0422222222",
  "0433333333",
  "0444444444",
  "0455555555",
  "0466666666",
  "0477777777",
  "0488888888",
  "0499999999",
  "0412345678",
  "0423456789",
  "0398765432",
  "1234567890",
  "0000000000",
  "9999999999",
]);

/**
 * Returns true if the phone string looks like a real Australian phone number.
 * Accepts mobile (04xx), landline (02–09), and +61 international format.
 */
export function isValidAuPhone(phone: string): boolean {
  if (!phone || typeof phone !== "string") return false;

  const stripped = normalisePhone(phone.trim());

  // Must be at least 8 digits (short regional numbers) and at most 15 (E.164 max)
  const digitCount = stripped.replace(/\D/g, "").length;
  if (digitCount < 8 || digitCount > 15) return false;

  // Reject non-numeric after stripping (except optional leading + or 00)
  if (!/^\+?[\d]+$/.test(stripped)) return false;

  // Normalise to local format for AU checks
  let local = stripped;
  if (local.startsWith("+61")) {
    local = "0" + local.slice(3);
  } else if (local.startsWith("0061")) {
    local = "0" + local.slice(4);
  }

  // After normalisation AU numbers should be 8-10 digits
  if (!/^\d{8,10}$/.test(local)) return false;

  // 10-digit AU numbers must start with 0
  if (local.length === 10 && !local.startsWith("0")) return false;

  // Mobile: 04xx (10 digits)
  const isMobile = /^04\d{8}$/.test(local);
  // Landline: 02-09 (10 digits), 8-digit short forms also accepted
  const isLandline = /^0[2-9]\d{6,8}$/.test(local);

  if (!isMobile && !isLandline) return false;

  // Reject known fake sequences (normalised to 10-digit)
  if (local.length === 10 && FAKE_PATTERNS.has(local)) return false;

  // Reject repeating-digit sequences like 0400000000 (already in set above,
  // but also catch any 10-digit number with 7+ same digits in a row)
  if (/(.)\1{6,}/.test(local)) return false;

  return true;
}
