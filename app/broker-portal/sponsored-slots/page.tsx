"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * Broker-portal view of the sponsored placements the logged-in
 * broker has booked. Shows tier, window, status, invoice link, and a
 * live impression/click count for any booking that's currently in
 * its active window.
 *
 * Reads `broker_accounts` to resolve the logged-in user to a
 * `broker_slug`, then queries:
 *   - sponsored_placement_bookings (source of truth for the slot)
 *   - affiliate_clicks (join filter: broker_slug + clicked_at BETWEEN)
 *
 * Everything is read-only here. Booking new slots happens at
 * /advertise/featured-placement.
 */

interface Booking {
  id: number;
  broker_slug: string;
  tier: string;
  starts_at: string;
  ends_at: string;
  amount_cents: number | null;
  status: string;
  stripe_invoice_url: string | null;
  invoice_ref: string | null;
  applied_at: string | null;
}

interface CampaignStats {
  booking_id: number;
  clicks: number;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function prettyTier(t: string): string {
  return t
    .split("_")
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(" ");
}

function statusBadge(status: string, now: number, starts: number, ends: number) {
  const base = "text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full";
  if (status === "active") {
    return (
      <span className={`${base} bg-emerald-50 text-emerald-800 border border-emerald-200`}>
        Active
      </span>
    );
  }
  if (status === "scheduled") {
    const daysToStart = Math.max(0, Math.ceil((starts - now) / 86_400_000));
    return (
      <span className={`${base} bg-amber-50 text-amber-800 border border-amber-200`}>
        Starts in {daysToStart}d
      </span>
    );
  }
  if (status === "ended" || now > ends) {
    return (
      <span className={`${base} bg-slate-100 text-slate-600`}>Ended</span>
    );
  }
  if (status === "cancelled") {
    return (
      <span className={`${base} bg-rose-50 text-rose-700 border border-rose-200`}>
        Cancelled
      </span>
    );
  }
  return <span className={`${base} bg-slate-100 text-slate-600`}>{status}</span>;
}

export default function SponsoredSlotsPage() {
  const [loading, setLoading] = useState(true);
  const [brokerSlug, setBrokerSlug] = useState<string>("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<CampaignStats[]>([]);
  const [notAuthorised, setNotAuthorised] = useState(false);
  // Snapshot of "now" taken at data-load time so status badge math
  // ("Starts in 4d", "Ended") stays stable across subsequent
  // cosmetic re-renders — react-hooks/purity forbids calling Date.now
  // directly in render.
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) {
          setNotAuthorised(true);
          setLoading(false);
        }
        return;
      }

      const { data: account } = await supabase
        .from("broker_accounts")
        .select("broker_slug")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!account?.broker_slug) {
        if (!cancelled) {
          setNotAuthorised(true);
          setLoading(false);
        }
        return;
      }

      const slug = account.broker_slug;
      setBrokerSlug(slug);

      const { data: bks } = await supabase
        .from("sponsored_placement_bookings")
        .select("id, broker_slug, tier, starts_at, ends_at, amount_cents, status, stripe_invoice_url, invoice_ref, applied_at")
        .eq("broker_slug", slug)
        .order("starts_at", { ascending: false })
        .limit(50);

      if (cancelled) return;
      setBookings((bks ?? []) as Booking[]);

      if (bks && bks.length > 0) {
        // Collect clicks per booking window in parallel
        const perBooking = await Promise.all(
          bks.map(async (b) => {
            const { count } = await supabase
              .from("affiliate_clicks")
              .select("*", { count: "exact", head: true })
              .eq("broker_slug", slug)
              .gte("clicked_at", b.starts_at)
              .lte("clicked_at", b.ends_at);
            return { booking_id: b.id, clicks: count ?? 0 };
          }),
        );
        if (!cancelled) setStats(perBooking);
      }

      if (!cancelled) {
        setNow(Date.now());
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const statsByBooking = useMemo(() => {
    const m = new Map<number, number>();
    for (const s of stats) m.set(s.booking_id, s.clicks);
    return m;
  }, [stats]);

  if (loading) {
    return (
      <div className="p-6 text-sm text-slate-500">
        Loading your sponsored placements…
      </div>
    );
  }

  if (notAuthorised) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-xl font-extrabold text-slate-900 mb-2">
          Sponsored placements
        </h1>
        <p className="text-sm text-slate-600 mb-4">
          Sign in to your Broker Portal to see the sponsorship slots you&apos;ve
          booked.
        </p>
        <Link
          href="/broker-portal/login"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-sm"
        >
          Go to Broker Portal login
        </Link>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-8 max-w-5xl">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-1">
            Sponsored placements
          </h1>
          <p className="text-sm text-slate-600">
            Campaigns booked via{" "}
            <Link
              href="/advertise/featured-placement"
              className="text-amber-700 underline"
            >
              /advertise/featured-placement
            </Link>
            . Clicks and impressions below reflect the current campaign
            window only.
          </p>
        </div>
        <Link
          href="/advertise/featured-placement"
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-lg"
        >
          + Book another slot
        </Link>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-sm text-slate-600 mb-4">
            No bookings yet for <strong>{brokerSlug}</strong>. Tiered
            Featured Partner placements start at A$500 / 30 days.
          </p>
          <Link
            href="/advertise/featured-placement"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-lg"
          >
            See placement tiers →
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-left">
              <tr className="text-[11px] uppercase tracking-wide text-slate-600">
                <th className="px-4 py-2.5">Tier</th>
                <th className="px-3 py-2.5">Window</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Amount</th>
                <th className="px-3 py-2.5 text-right">Clicks</th>
                <th className="px-3 py-2.5">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookings.map((b) => {
                const starts = new Date(b.starts_at).getTime();
                const ends = new Date(b.ends_at).getTime();
                const clicks = statsByBooking.get(b.id) ?? 0;
                return (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-semibold text-slate-800">
                      {prettyTier(b.tier)}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 text-xs">
                      {fmtDate(b.starts_at)} → {fmtDate(b.ends_at)}
                    </td>
                    <td className="px-3 py-2.5">
                      {statusBadge(b.status, now, starts, ends)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs">
                      {b.amount_cents != null
                        ? `A$${(b.amount_cents / 100).toLocaleString("en-AU")}`
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs">
                      {clicks.toLocaleString("en-AU")}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {b.stripe_invoice_url ? (
                        <a
                          href={b.stripe_invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-700 hover:text-amber-800 underline"
                        >
                          View PDF
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[11px] text-slate-500 mt-5 max-w-2xl leading-relaxed">
        Impressions are logged server-side when a sponsored card renders
        and may take up to 24h to appear. Clicks reflect every affiliate
        click routed through the sponsored placement during the campaign
        window.
      </p>
    </div>
  );
}
