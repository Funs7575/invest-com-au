/**
 * Country Mode wrapper around HomeToolsStrip.
 *
 * Server component reading the iv_intent_country cookie. Hands the
 * resolved country's `homepageFeaturedTools` hrefs to HomeToolsStrip's
 * `featuredHrefs` prop, which hoists matching tools to the front of
 * the existing list. The strip never shrinks — Country Mode re-ranks,
 * doesn't replace. When no country is set or the country has no
 * featured tools, HomeToolsStrip renders in its default order.
 */

import { getIntentCountry } from "@/lib/intent-context-server";
import { getHomepageFiltersForCountry } from "@/lib/country-mode";
import HomeToolsStrip from "@/components/HomeToolsStrip";

export default async function CountryToolsStripWrapper() {
  const code = await getIntentCountry();
  if (!code) return <HomeToolsStrip />;

  const filters = getHomepageFiltersForCountry(code);
  const featuredHrefs = filters.tools.map((t) => t.slug);
  return <HomeToolsStrip featuredHrefs={featuredHrefs} />;
}
