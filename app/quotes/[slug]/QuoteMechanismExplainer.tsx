import Icon from "@/components/Icon";
import type { BidVisibility } from "@/lib/auction-rounds";

/**
 * Factual explainer for the richer auction mechanics (idea #11): sealed bidding,
 * best-and-final rounds, and counter-offers. Server component — pure copy, no
 * state. Framing stays factual and lead-routing only: fees are the adviser's own
 * and the platform never takes a cut of, or intermediates, the money the
 * consumer pays the adviser. Counter-offers are factual price discussion, not
 * platform-set pricing.
 */
export default function QuoteMechanismExplainer({
  visibility,
  isOwner,
}: {
  visibility: BidVisibility;
  isOwner: boolean;
}) {
  const sealed = visibility === "sealed";
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
        <Icon name="sliders" size={14} className="text-slate-500" />
        How quoting works here
      </h3>
      <ul className="space-y-3 text-xs text-slate-600 leading-relaxed">
        <li className="flex gap-2">
          <Icon name="lock" size={13} className="text-indigo-600 mt-0.5 shrink-0" />
          <span>
            <strong className="text-slate-800">Sealed bidding.</strong>{" "}
            {sealed ? (
              isOwner ? (
                <>
                  This request is sealed: you see every quote amount, but advisers
                  can only see how many quotes have come in — not each other&apos;s
                  numbers — until the request closes.
                </>
              ) : (
                <>
                  This request is sealed. Advisers see the quote count but not
                  competing amounts until it closes, so each quote is priced on its
                  own merits.
                </>
              )
            ) : (
              <>
                When a request is posted as sealed, advisers can&apos;t see
                competing quote amounts until it closes — only the quote count.
              </>
            )}
          </span>
        </li>
        <li className="flex gap-2">
          <Icon name="zap" size={13} className="text-amber-600 mt-0.5 shrink-0" />
          <span>
            <strong className="text-slate-800">Best-and-final round.</strong> Once
            quotes are in, you can invite up to three advisers into a single 24-hour
            round where each may submit one revised quote. Revising is always
            optional for the adviser.
          </span>
        </li>
        <li className="flex gap-2">
          <Icon name="message-circle" size={13} className="text-emerald-600 mt-0.5 shrink-0" />
          <span>
            <strong className="text-slate-800">Counter-offer.</strong> You can ask a
            single adviser whether they&apos;d do the work for a different figure.
            They accept or decline — it&apos;s a factual price conversation, nothing
            is binding, and the adviser sets their own fee.
          </span>
        </li>
      </ul>
      <p className="mt-3 pt-3 border-t border-slate-100 text-[0.65rem] text-slate-400 leading-relaxed">
        Invest.com.au routes your request to licensed advisers and never takes a
        share of, or handles, the fee you agree with the adviser you choose. Quotes
        and any counter figures are the adviser&apos;s own. This is general
        information, not financial advice.
      </p>
    </div>
  );
}
