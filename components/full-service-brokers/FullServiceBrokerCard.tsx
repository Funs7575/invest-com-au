import Link from "next/link";
import Image from "next/image";
import Icon from "@/components/Icon";
import type { Professional } from "@/lib/types";

interface Props {
  firm: Professional;
}

/**
 * Card for a full-service stockbroker / private wealth firm.
 *
 * Key UX difference vs the DIY broker card: this card highlights *fit*
 * (minimum portfolio, fee model, specialties), not *price*. A user
 * with $300k looking for an advisory broker should be filtering by
 * minimum + service tier, not chasing the lowest brokerage. Mixing
 * full-service firms into the existing /compare/ table would be
 * actively misleading because the discount-platform sort-by-price
 * heuristic would always pick the wrong answer.
 */
export default function FullServiceBrokerCard({ firm }: Props) {
  const minimum = firm.minimum_investment_cents
    ? formatMinimum(firm.minimum_investment_cents)
    : null;

  const feeLabel = firm.fee_model
    ? FEE_MODEL_LABELS[firm.fee_model]
    : firm.fee_structure || null;

  const specialties = firm.specialties?.slice(0, 3) || [];

  return (
    <article className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-slate-300 hover:shadow-md transition-all">
      <div className="p-5 md:p-6">
        {/* Header: logo + name + AFSL */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
            {firm.photo_url ? (
              <Image
                src={firm.photo_url}
                alt={`${firm.name} logo`}
                width={56}
                height={56}
                className="w-full h-full object-contain p-1"
                sizes="56px"
              />
            ) : (
              <Icon name="briefcase" size={24} className="text-slate-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-extrabold text-slate-900 truncate">
              {firm.name}
            </h3>
            {firm.firm_type && (
              <p className="text-xs text-slate-500 capitalize">{firm.firm_type}</p>
            )}
            <div className="flex items-center gap-3 mt-1 text-[0.65rem] text-slate-400">
              {firm.afsl_number && <span>AFSL {firm.afsl_number}</span>}
              {firm.year_founded && <span>Est. {firm.year_founded}</span>}
              {firm.aum_aud_billions && (
                <span>${firm.aum_aud_billions}B AUM</span>
              )}
            </div>
          </div>
        </div>

        {/* Bio / tagline */}
        {firm.bio && (
          <p className="text-sm text-slate-600 line-clamp-2 mb-4 leading-relaxed">
            {firm.bio}
          </p>
        )}

        {/* Key facts grid: minimum + fee model + offices */}
        <dl className="grid grid-cols-3 gap-3 mb-4 pt-4 border-t border-slate-100">
          <div>
            <dt className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
              Minimum
            </dt>
            <dd className="text-sm font-bold text-slate-900">
              {minimum || <span className="text-slate-400 font-normal">Enquire</span>}
            </dd>
          </div>
          <div>
            <dt className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
              Fee model
            </dt>
            <dd className="text-sm font-bold text-slate-900">
              {feeLabel || <span className="text-slate-400 font-normal">—</span>}
            </dd>
          </div>
          <div>
            <dt className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
              Offices
            </dt>
            <dd className="text-sm font-bold text-slate-900">
              {firm.office_states?.length
                ? firm.office_states.join(", ")
                : firm.location_state || <span className="text-slate-400 font-normal">—</span>}
            </dd>
          </div>
        </dl>

        {/* Specialties */}
        {specialties.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {specialties.map((s) => (
              <span
                key={s}
                className="px-2 py-0.5 text-[0.65rem] font-semibold rounded-full bg-slate-50 text-slate-600 border border-slate-100"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Single CTA — leads to the firm profile, where the contact form
            lives. We deliberately do NOT show a "Visit Site" affiliate
            link here because full-service firms aren't affiliate-monetised. */}
        <Link
          href={`/brokers/full-service/${firm.slug}`}
          className="block w-full text-center px-4 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-colors"
        >
          View {firm.name} Profile →
        </Link>
      </div>
    </article>
  );
}

const FEE_MODEL_LABELS: Record<string, string> = {
  percent_aum: "% of AUM",
  commission: "Commission",
  flat_retainer: "Flat retainer",
  hybrid: "Hybrid",
};

function formatMinimum(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(0)}k`;
  return `$${dollars.toLocaleString("en-AU")}`;
}
