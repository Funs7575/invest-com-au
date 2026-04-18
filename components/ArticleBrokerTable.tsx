import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import Icon from "@/components/Icon";

/**
 * ArticleBrokerTable
 * ------------------
 * Top-of-article compact broker compare table. Queries the brokers
 * table server-side, filters by vertical, orders by rating, and
 * renders the top N with affiliate CTAs.
 *
 * `vertical` is a free-form string that maps to the existing
 * broker-categorisation columns — 'shares', 'crypto', 'cfd',
 * 'savings', 'super', 'robo', or '*' for "any".
 */

interface Props {
  vertical: string;
  maxBrokers?: number;
  /** Optional label replacing the default "Compare top brokers" heading */
  heading?: string;
}

interface BrokerRow {
  slug: string;
  name: string;
  logo_url: string | null;
  rating: number | string | null;
  asx_fee: string | null;
  us_fee: string | null;
  tagline: string | null;
  chess_sponsored: boolean | null;
  smsf_support: boolean | null;
  platform_type: string | null;
  is_crypto: boolean | null;
  affiliate_url: string | null;
  deal: boolean | null;
  deal_text: string | null;
}

async function fetchBrokers(
  vertical: string,
  maxBrokers: number,
): Promise<BrokerRow[]> {
  try {
    const supabase = createAdminClient();
    let query = supabase
      .from("brokers")
      .select(
        "slug, name, logo_url, rating, asx_fee, us_fee, tagline, chess_sponsored, smsf_support, platform_type, is_crypto, affiliate_url, deal, deal_text",
      )
      .eq("status", "active");

    const v = vertical.toLowerCase();
    if (v === "crypto") query = query.eq("is_crypto", true);
    else if (v === "shares" || v === "etf" || v === "etfs") query = query.eq("is_crypto", false);
    else if (v === "cfd") query = query.eq("platform_type", "cfd_forex");
    else if (v === "savings") query = query.eq("platform_type", "savings_account");
    else if (v === "super") query = query.eq("platform_type", "super_fund");
    else if (v === "robo") query = query.eq("platform_type", "robo_advisor");
    else if (v === "smsf") query = query.eq("smsf_support", true);
    // default ('*' or unknown): no category filter

    const { data } = await query
      .order("rating", { ascending: false })
      .limit(maxBrokers);
    return (data as BrokerRow[] | null) || [];
  } catch {
    return [];
  }
}

function formatRating(value: number | string | null): string {
  if (value == null) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(num)) return "—";
  return num.toFixed(1);
}

function ratingStars(value: number | string | null): string {
  const num =
    value == null
      ? 0
      : typeof value === "string"
        ? parseFloat(value)
        : value;
  if (!Number.isFinite(num)) return "";
  const full = Math.round(num);
  return "★".repeat(full) + "☆".repeat(Math.max(0, 5 - full));
}

export default async function ArticleBrokerTable({
  vertical,
  maxBrokers = 3,
  heading,
}: Props) {
  const brokers = await fetchBrokers(vertical, maxBrokers);
  if (brokers.length === 0) return null;

  return (
    <aside
      aria-label="Recommended brokers"
      className="my-8 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden"
    >
      <header className="bg-slate-900 text-white px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-amber-400">
          Editorial picks
        </p>
        <h3 className="text-sm md:text-base font-extrabold">
          {heading ?? "Top platforms for this topic"}
        </h3>
      </header>
      <ul className="divide-y divide-slate-200">
        {brokers.map((b) => {
          const cta = b.affiliate_url
            ? { href: b.affiliate_url, label: "Visit site", external: true }
            : { href: `/broker/${b.slug}`, label: "Read review", external: false };
          return (
            <li key={b.slug} className="flex items-center gap-4 px-4 py-3 bg-white">
              <div className="w-10 h-10 rounded-lg bg-slate-100 shrink-0 flex items-center justify-center overflow-hidden">
                {b.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.logo_url}
                    alt={b.name}
                    className="max-w-full max-h-full"
                  />
                ) : (
                  <Icon name="briefcase" size={18} className="text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-slate-900 truncate">
                  {b.name}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {b.tagline ??
                    [b.asx_fee && `ASX ${b.asx_fee}`, b.us_fee && `US ${b.us_fee}`]
                      .filter(Boolean)
                      .join(" · ")}
                </p>
                <p className="text-[11px] text-amber-600 font-semibold mt-0.5">
                  <span aria-hidden="true" className="mr-1">
                    {ratingStars(b.rating)}
                  </span>
                  {formatRating(b.rating)} / 5
                  {b.chess_sponsored ? " · CHESS" : ""}
                  {b.smsf_support ? " · SMSF" : ""}
                </p>
              </div>
              <div className="shrink-0">
                <Link
                  href={cta.href}
                  {...(cta.external
                    ? { target: "_blank", rel: "sponsored nofollow noopener" }
                    : {})}
                  className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3 py-2 rounded-lg transition-colors"
                >
                  {cta.label}
                  <Icon name="arrow-right" size={12} />
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
      <footer className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-500">
        Rankings are editorial, based on published fees, rating, and platform
        features. Some links are affiliate links — see our{" "}
        <Link href="/how-we-earn" className="underline">
          how we earn
        </Link>{" "}
        page.
      </footer>
    </aside>
  );
}
