interface Props {
  sectorDisplayName?: string;
}

/**
 * ASIC RG 234 general advice warning.
 *
 * Required anywhere we talk about specific financial products
 * without holding an AFSL that covers personal advice. Rendered
 * as a visually distinct footer so it can't be missed. The
 * wording is deliberately close to ASIC MoneySmart's model
 * disclaimer — don't edit lightly.
 *
 * Used by CommodityHub and any other /invest/* page that discusses
 * specific tickers or products.
 */
export default function GeneralAdviceWarning({ sectorDisplayName }: Props) {
  const subjectLabel = sectorDisplayName
    ? `${sectorDisplayName.toLowerCase()} investments`
    : "the investments discussed";

  return (
    <aside
      className="bg-slate-900 text-slate-200 py-8 md:py-10"
      role="note"
      aria-label="General advice warning"
    >
      <div className="container-custom max-w-3xl">
        <h2 className="text-xs font-extrabold uppercase tracking-[0.2em] text-amber-400 mb-3">
          General advice warning
        </h2>
        <p className="text-sm leading-relaxed text-slate-300 mb-3">
          The information on this page is general in nature and doesn&rsquo;t
          take into account your personal objectives, financial situation or
          needs. Before acting on any of the information about{" "}
          {subjectLabel}, consider whether it is appropriate for you and
          read the relevant Product Disclosure Statement, Target Market
          Determination and{" "}
          <a
            href="/editorial-policy"
            className="text-amber-400 hover:underline"
          >
            our editorial policy
          </a>
          .
        </p>
        <p className="text-sm leading-relaxed text-slate-300 mb-3">
          Past performance is not a reliable indicator of future performance.
          Resource-sector investments carry commodity-price, operational,
          geopolitical and ESG-policy risks that may not suit every investor.
          If you are unsure whether an investment is right for you, speak
          to an{" "}
          <a
            href="/find-advisor"
            className="text-amber-400 hover:underline"
          >
            ASIC-registered financial adviser
          </a>
          .
        </p>
        <p className="text-[11px] text-slate-500">
          Invest.com.au is an independent comparison site. We may earn
          commissions from partner brokers when readers open accounts via our
          affiliate links — this does not affect the editorial content on this
          page.
        </p>
      </div>
    </aside>
  );
}
