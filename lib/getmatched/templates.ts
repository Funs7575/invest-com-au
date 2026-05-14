/**
 * Result template resolver.
 *
 * `get_matched_result_templates` is keyed by (route, intent_slug?). Lookup
 * precedence:
 *   1. Exact (route, intent_slug) match — admin override for a specific
 *      intent (e.g. SMSF property → bespoke checklist + CTA).
 *   2. (route, NULL) — the default template for that route.
 *   3. Hard-coded fallback — minimal "general" content if neither row exists
 *      (defensive — admin can never delete the seed rows).
 */

// eslint-disable-next-line no-restricted-imports -- public read of admin config.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

import type { IntentSlug, ResultTemplate, RouteType } from "./types";

const log = logger("getmatched:templates");

export async function getResultTemplate(
  route: RouteType,
  intentSlug?: IntentSlug | null,
): Promise<ResultTemplate> {
  try {
    const admin = createAdminClient();
    let exact: ResultTemplate | null = null;
    if (intentSlug) {
      const { data } = await admin
        .from("get_matched_result_templates")
        .select("*")
        .eq("route", route)
        .eq("intent_slug", intentSlug)
        .eq("enabled", true)
        .maybeSingle();
      if (data) exact = data as ResultTemplate;
    }
    if (exact) return exact;

    const { data: generic } = await admin
      .from("get_matched_result_templates")
      .select("*")
      .eq("route", route)
      .is("intent_slug", null)
      .eq("enabled", true)
      .maybeSingle();
    if (generic) return generic as ResultTemplate;
  } catch (err) {
    log.warn("getResultTemplate failed", {
      route,
      intentSlug,
      err: err instanceof Error ? err.message : String(err),
    });
  }

  return fallbackTemplate(route);
}

function fallbackTemplate(route: RouteType): ResultTemplate {
  return {
    id: -1,
    route,
    intent_slug: null,
    headline: "Your Investment Action Plan",
    why_text:
      "Here is the route that matches your answers. Invest.com.au provides general information only — the professional, firm or team you engage delivers the service under their own licence.",
    checklist: [
      { label: "Review your answers" },
      { label: "Pick your next step" },
    ],
    primary_cta: { label: "Browse next steps", href: "/" },
    secondary_ctas: [],
    cross_sells: [],
    enabled: true,
  };
}
