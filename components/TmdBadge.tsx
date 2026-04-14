import { getCurrentTmd, type TmdProductType } from "@/lib/tmds";

interface Props {
  productType: TmdProductType;
  productRef: string;
  className?: string;
}

/**
 * Server component that fetches the current TMD for a product and
 * renders a small "Target Market Determination" link. If there's
 * no TMD on file, this component renders nothing — the admin
 * dashboard is responsible for flagging that case.
 *
 * DDO requires the TMD link to be "prominent and easily accessible"
 * on the product page; dropping this inline next to the CTA satisfies
 * that standard.
 */
export default async function TmdBadge({
  productType,
  productRef,
  className,
}: Props) {
  const tmd = await getCurrentTmd(productType, productRef);
  if (!tmd) return null;

  const versionLabel = tmd.tmd_version ? ` (${tmd.tmd_version})` : "";
  return (
    <a
      href={tmd.tmd_url}
      target="_blank"
      rel="noopener"
      className={
        className ||
        "inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-primary transition-colors"
      }
      title={`View the Target Market Determination for ${tmd.product_name}`}
    >
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      Target Market Determination{versionLabel}
    </a>
  );
}
