import Link from "next/link";
import Image from "next/image";
import Icon from "@/components/Icon";
import { createClient } from "@/lib/supabase/server";
import { batchAdvisorResponseTimes, formatResponseTimeLabel } from "@/lib/advisor-response-time";

interface Props {
  advisorTypes: string[];
  locationState: string | null;
  excludeAdvisorIds: number[];
}

interface MatchedAdvisor {
  id: number;
  slug: string;
  name: string;
  firm_name: string | null;
  type: string;
  photo_url: string | null;
  rating: number | null;
  review_count: number | null;
  location_display: string | null;
  verified: boolean;
  accepts_new_clients: boolean | null;
}

/**
 * Server component: renders 3 pre-matched advisor cards on the job page so
 * the consumer has something to engage with while waiting for bids (#3).
 *
 * Filters: same advisor types as the job; same state preferred; only
 * verified, active, accepting-new-clients advisors. Sorts by rating × review_count.
 * Excludes any advisor who already bid on this auction.
 */
export default async function InstantMatchPanel({ advisorTypes, locationState, excludeAdvisorIds }: Props) {
  if (advisorTypes.length === 0) return null;

  const supabase = await createClient();

  let query = supabase
    .from("professionals")
    .select("id, slug, name, firm_name, type, photo_url, rating, review_count, location_display, verified, accepts_new_clients")
    .in("type", advisorTypes)
    .eq("status", "active")
    .eq("verified", true)
    .neq("accepts_new_clients", false)
    .order("rating", { ascending: false, nullsFirst: false })
    .order("review_count", { ascending: false, nullsFirst: false })
    .limit(20);

  if (excludeAdvisorIds.length > 0) {
    query = query.not("id", "in", `(${excludeAdvisorIds.join(",")})`);
  }

  const { data: rawAdvisors } = await query;
  let candidates = ((rawAdvisors ?? []) as unknown as MatchedAdvisor[]).filter(Boolean);

  // Prefer same-state matches; fall back to any state if too few.
  if (locationState) {
    const sameState = candidates.filter(
      (a) => a.location_display?.toUpperCase().includes(locationState) ?? false,
    );
    if (sameState.length >= 3) candidates = sameState;
  }
  candidates = candidates.slice(0, 3);

  if (candidates.length === 0) return null;

  const responseTimes = await batchAdvisorResponseTimes(candidates.map((a) => a.id));

  return (
    <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-2">
        <Icon name="zap" size={16} className="text-amber-600" />
        <h2 className="text-base font-bold text-slate-900">Instant matches</h2>
      </div>
      <p className="text-xs text-slate-600 mb-4 leading-relaxed">
        While verified advisors prepare their quotes, here are some who match your request and are accepting new clients.
        You can browse their profiles right now.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {candidates.map((a) => {
          const rtLabel = formatResponseTimeLabel(responseTimes.get(a.id));
          return (
            <Link
              key={a.id}
              href={`/advisor/${a.slug}`}
              className="bg-white border border-slate-200 rounded-xl p-4 hover:border-amber-300 hover:shadow-sm transition"
            >
              <div className="flex items-start gap-3 mb-2">
                {a.photo_url ? (
                  <Image src={a.photo_url} alt={a.name} width={40} height={40} className="rounded-full object-cover border border-slate-200 shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <Icon name="user" size={16} className="text-slate-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-900 truncate">{a.name}</p>
                  {a.firm_name && <p className="text-xs text-slate-500 truncate">{a.firm_name}</p>}
                </div>
              </div>
              <p className="text-xs text-slate-600 capitalize">{a.type.replace(/_/g, " ")}</p>
              {(a.review_count ?? 0) > 0 && (
                <p className="text-xs text-slate-700 flex items-center gap-1 mt-1">
                  <Icon name="star" size={11} className="text-amber-500" />
                  {a.rating?.toFixed(1)} ({a.review_count})
                </p>
              )}
              {rtLabel && (
                <p className="text-[11px] text-emerald-700 font-semibold mt-1.5 flex items-center gap-1">
                  <Icon name="clock" size={10} />
                  {rtLabel}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
