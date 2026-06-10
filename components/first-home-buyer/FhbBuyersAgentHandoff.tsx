import Link from "next/link";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { firstHomeBuyerBuyersAgentUrl } from "@/lib/first-home-buyer/buyers-agent-handoff";

/**
 * <FhbBuyersAgentHandoff> — First Home Buyer buyers-agent handoff (W3.19 lever).
 *
 * Presentational only: closes the FHB funnel on the buy side. Once the deposit
 * (FHSS + cash savings) and the loan (mortgage broker) are sorted, a buyer's
 * agent finds, evaluates, and negotiates the actual purchase. Links to the
 * buyers-agent directory pre-filtered to first-home-buyer specialists.
 */
export default function FhbBuyersAgentHandoff() {
  return (
    <section
      className="container-custom max-w-4xl py-8"
      data-testid="fhb-buyers-agent-handoff"
      aria-labelledby="fhb-buyers-agent-heading"
    >
      <h2
        id="fhb-buyers-agent-heading"
        className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2"
      >
        Found your deposit and loan? Get help buying the property
      </h2>
      <p className="text-sm text-slate-600 leading-relaxed mb-3 max-w-2xl">
        A <strong>buyer&apos;s agent works only for you</strong> — they search
        (including off-market listings), run due diligence, and negotiate or bid
        at auction on your behalf. Selling agents represent the vendor; a buyer&apos;s
        agent is your advocate. For first home buyers, a good agent often saves
        more than their fee through a sharper negotiation. The specialists below
        all handle <strong>first-home purchases</strong>.
      </p>
      <Link
        href={firstHomeBuyerBuyersAgentUrl()}
        className="inline-flex items-center gap-1 text-sm font-semibold text-violet-600 hover:text-violet-800 transition-colors"
        data-lever="lead_routing"
      >
        Find a first-home-buyer specialist buyer&apos;s agent &rarr;
      </Link>
      <p className="text-[11px] text-slate-500 leading-relaxed mt-4">
        <strong className="text-slate-500">General advice warning.</strong>{" "}
        {GENERAL_ADVICE_WARNING}
      </p>
    </section>
  );
}
