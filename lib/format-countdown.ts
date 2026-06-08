/**
 * Formats a non-negative number of seconds as a "M:SS" countdown string
 * (e.g. 272 -> "4:32", 5 -> "0:05"). Used by the OTP expiry timer (ADV-015).
 * Clamps negatives to "0:00".
 */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Seconds remaining until `expiresAtMs`, given the current time `nowMs`.
 * Never returns a negative value.
 */
export function secondsRemaining(expiresAtMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((expiresAtMs - nowMs) / 1000));
}
