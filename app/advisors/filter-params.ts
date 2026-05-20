import { AU_STATES } from "@/lib/types";
import type { ProfessionalType } from "@/lib/types";

export type ProviderTypeParam = "individual" | "firm" | "team";

export interface ResolvedDirectoryFilters {
  providerType?: ProviderTypeParam;
  types?: ProfessionalType[];
  state?: string;
  specialties?: string[];
  sort?: string;
  search?: string;
  language?: string;
}

interface ResolveOptions {
  /**
   * True when the page already fixes the professional type via its route
   * (e.g. /advisors/mortgage-brokers). The URL `type`/`state` params must
   * not override the route-derived type, so they are ignored in that case.
   */
  routeScoped: boolean;
  /** Predicate validating a `type` param value against the known filter keys. */
  validType: (key: string) => boolean;
}

/**
 * Resolve directory filter state from URL query params.
 *
 * `specialty` is orthogonal to the route-derived professional type, so it is
 * honoured even on route-scoped pages — this is what lets the First Home Buyer
 * hub deep-link into /advisors/mortgage-brokers?specialty=First Home Buyers and
 * have the FHB specialist filter pre-selected.
 */
export function resolveDirectoryFilters(
  params: { get(name: string): string | null },
  { routeScoped, validType }: ResolveOptions,
): ResolvedDirectoryFilters {
  const result: ResolvedDirectoryFilters = {};

  const pt = params.get("provider_type");
  if (pt === "individual" || pt === "firm" || pt === "team") result.providerType = pt;

  const sp = params.get("specialty");
  if (sp) {
    const specialties = sp.split(",").map((s) => s.trim()).filter(Boolean);
    if (specialties.length) result.specialties = specialties;
  }

  if (routeScoped) return result;

  const t = params.get("type");
  if (t) {
    const types = t.split(",").filter(validType) as ProfessionalType[];
    if (types.length) result.types = types;
  }

  const s = params.get("state");
  if (s && (AU_STATES as readonly string[]).includes(s)) result.state = s;

  const sort = params.get("sort");
  if (sort) result.sort = sort;

  const q = params.get("q");
  if (q) result.search = q;

  const lang = params.get("language");
  if (lang) result.language = lang;

  return result;
}
