import Link from "next/link";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { firstHomeBuyerSavingsUrl } from "@/lib/first-home-buyer/savings-match";

/**
 * <FhbSavingsMatch> — First Home Buyer savings-match framing (W3.19 lever).
 *
 * Presentational only: explains where the cash portion of a deposit should
 * sit (high-interest savings out of super) vs the FHSS portion (inside super),
 * and links to the curated high-interest-savings directory. The ranked account
 * list itself is rendered by <ArticleBrokerTable vertical="savings"> alongside
 * this block in the page, so this component stays sync + trivially testable.
 */
export default function FhbSavingsMatch() {
  return (
    <section
      className="container-custom max-w-4xl py-8"
      data-testid="fhb-savings-match"
      aria-labelledby="fhb-savings-match-heading"
    >
      <h2
        id="fhb-savings-match-heading"
        className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2"
      >
        Where to keep your deposit while you save
      </h2>
      <p className="text-sm text-slate-600 leading-relaxed mb-3 max-w-2xl">
        Most first home buyers split their deposit: up to{" "}
        <strong>$50,000 inside super via the FHSS scheme</strong> (taxed at just
        15% going in), and the rest in cash. The cash portion belongs in a
        high-interest savings account — not a transaction account earning near
        0%. Every account below is from an ADI-authorised bank, so your balance
        is covered by the{" "}
        <strong>Australian Government deposit guarantee up to $250,000</strong>.
      </p>
      <Link
        href={firstHomeBuyerSavingsUrl()}
        className="inline-flex items-center gap-1 text-sm font-semibold text-violet-600 hover:text-violet-800 transition-colors"
        data-lever="lead_routing"
      >
        Compare all high-interest savings accounts &rarr;
      </Link>
      <p className="text-[11px] text-slate-400 leading-relaxed mt-4">
        <strong className="text-slate-500">General advice warning.</strong>{" "}
        {GENERAL_ADVICE_WARNING}
      </p>
    </section>
  );
}
