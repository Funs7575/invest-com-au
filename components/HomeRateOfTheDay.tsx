import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import DealExpiryCountdown from "@/components/DealExpiryCountdown";

/**
 * Editorial "Rate of the Day" strip on the homepage.
 *
 * Reads `site_settings.rate_of_the_day_broker_slug` (admin-client, auth-only table).
 * Fetches the matching broker via the server client (anon-accessible brokers table).
 * Renders nothing when the setting is unset, empty, or the broker slug is not found.
 *
 * Positioned between HomeHero and HomeRouteCards for maximum above-the-fold impact.
 * Compliance: general information only, not a personal recommendation.
 */
export default async function HomeRateOfTheDay() {
  const admin = createAdminClient();
  const { data: setting } = await admin
    .from("site_settings")
    .select("value")
    .eq("key", "rate_of_the_day_broker_slug")
    .maybeSingle();

  if (!setting?.value) return null;

  const supabase = await createClient();
  const { data: broker } = await supabase
    .from("brokers")
    .select(
      "slug, name, platform_type, asx_fee, deal, deal_text, deal_expiry"
    )
    .eq("slug", setting.value)
    .eq("status", "active")
    .maybeSingle();

  if (!broker) return null;

  const isRateType =
    broker.platform_type === "savings_account" ||
    broker.platform_type === "term_deposit";

  const valueDisplay = broker.asx_fee ?? "—";
  const typeLabel = isRateType ? "rate" : "deal";

  return (
    <section className="container-custom my-4">
      <div className="relative flex flex-wrap items-center gap-3 px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/70 rounded-xl">
        {/* Editorial label */}
        <div className="flex items-center gap-2 shrink-0">
          <span aria-hidden className="text-base leading-none">⭐</span>
          <div>
            <p className="text-[0.55rem] font-bold uppercase tracking-widest text-amber-600 leading-none mb-0.5">
              Today&apos;s standout {typeLabel}
            </p>
            <p className="text-xs font-bold text-slate-900 leading-none">{broker.name}</p>
          </div>
        </div>

        {/* Rate / deal value */}
        <div className="flex items-center gap-2 flex-1 min-w-0 ml-1">
          <span className="text-sm font-extrabold text-emerald-700">{valueDisplay}</span>
          {broker.deal && broker.deal_text && (
            <span className="text-[0.65rem] text-slate-600 truncate">{broker.deal_text}</span>
          )}
          {broker.deal && <DealExpiryCountdown dealExpiry={broker.deal_expiry} variant="standard" />}
        </div>

        {/* CTA */}
        <Link
          href={`/broker/${broker.slug}`}
          className="shrink-0 px-3 py-1.5 text-[0.69rem] font-bold rounded-lg bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700 transition-colors"
        >
          View details →
        </Link>

        {/* Compliance footnote */}
        <p className="w-full text-[0.5rem] text-slate-400 leading-none -mt-1">
          General information only. Rates and offers change — verify with the provider before making any decision.
        </p>
      </div>
    </section>
  );
}
