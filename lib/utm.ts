/**
 * Extract UTM parameters and referral info from a request.
 * Used by email capture, quiz leads, affiliate clicks, and advisor applications
 * to track which channels drive conversions.
 */

export interface UtmParams {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referral_url: string | null;
}

/** Extract UTM params from request body or URL search params */
export function extractUtm(body?: Record<string, unknown>, url?: URL): UtmParams {
  return {
    utm_source: (body?.utm_source as string) || url?.searchParams.get("utm_source") || null,
    utm_medium: (body?.utm_medium as string) || url?.searchParams.get("utm_medium") || null,
    utm_campaign: (body?.utm_campaign as string) || url?.searchParams.get("utm_campaign") || null,
    referral_url: (body?.referral_url as string) || (body?.referrer as string) || null,
  };
}

/** Strip null values for clean DB inserts */
export function utmForInsert(utm: UtmParams): Record<string, string> {
  const result: Record<string, string> = {};
  if (utm.utm_source) result.utm_source = utm.utm_source.slice(0, 100);
  if (utm.utm_medium) result.utm_medium = utm.utm_medium.slice(0, 100);
  if (utm.utm_campaign) result.utm_campaign = utm.utm_campaign.slice(0, 200);
  if (utm.referral_url) result.referral_url = utm.referral_url.slice(0, 500);
  return result;
}
