/**
 * Client-side frequency capping for sponsored/campaign broker placements.
 *
 * Uses sessionStorage to track how many times a user has seen a given
 * campaign in a given placement. If the cap is exceeded, the campaign
 * is suppressed from display until the session resets (tab/window close).
 *
 * This is a lightweight, privacy-friendly approach — no cookies, no
 * server round-trips, no PII. The server-side allocation still runs;
 * this layer just filters what gets rendered.
 */

const STORAGE_KEY = "inv_freq_caps";

interface FrequencyData {
  /** Map of "campaignId:placementSlug" → impression count */
  counts: Record<string, number>;
  /** Session start timestamp — used to auto-reset stale data */
  started: number;
}

const MAX_SESSION_AGE_MS = 4 * 60 * 60 * 1000; // 4 hours

function getData(): FrequencyData {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { counts: {}, started: Date.now() };
    const parsed: FrequencyData = JSON.parse(raw);

    // Auto-reset if session is too old
    if (Date.now() - parsed.started > MAX_SESSION_AGE_MS) {
      return { counts: {}, started: Date.now() };
    }
    return parsed;
  } catch {
    return { counts: {}, started: Date.now() };
  }
}

function saveData(data: FrequencyData): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

function makeKey(campaignId: number, placementSlug: string): string {
  return `${campaignId}:${placementSlug}`;
}

/**
 * Record an impression for a campaign+placement combination.
 * Call this each time a campaign winner is actually rendered on screen.
 */
export function recordFrequencyImpression(
  campaignId: number,
  placementSlug: string
): void {
  const data = getData();
  const key = makeKey(campaignId, placementSlug);
  data.counts[key] = (data.counts[key] || 0) + 1;
  saveData(data);
}

/**
 * Check how many times a campaign has been shown in this session.
 */
export function getImpressionCount(
  campaignId: number,
  placementSlug: string
): number {
  const data = getData();
  return data.counts[makeKey(campaignId, placementSlug)] || 0;
}

/**
 * Check if a campaign has exceeded the frequency cap.
 * Default cap is 8 impressions per session per placement.
 */
export function isFrequencyCapped(
  campaignId: number,
  placementSlug: string,
  maxImpressions: number = 8
): boolean {
  return getImpressionCount(campaignId, placementSlug) >= maxImpressions;
}

/**
 * Filter an array of placement winners through the frequency cap.
 * Returns only winners that haven't exceeded the cap.
 */
export function filterByFrequencyCap<
  T extends { campaign_id: number }
>(
  winners: T[],
  placementSlug: string,
  maxImpressions: number = 8
): T[] {
  return winners.filter(
    (w) => !isFrequencyCapped(w.campaign_id, placementSlug, maxImpressions)
  );
}

/**
 * Record impressions for all winners that pass the frequency cap.
 * Call this after rendering the winners on screen.
 */
export function recordWinnerImpressions<
  T extends { campaign_id: number }
>(
  winners: T[],
  placementSlug: string
): void {
  for (const w of winners) {
    recordFrequencyImpression(w.campaign_id, placementSlug);
  }
}
