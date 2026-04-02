import Link from "next/link";

interface Props {
  href: string;
  verticalName: string;
  keyRule: string;
}

/**
 * Compact banner shown on vertical hub pages to surface
 * the foreign investment guide for that vertical.
 */
export default function ForeignInvestorCallout({ href, verticalName, keyRule }: Props) {
  return (
    <div className="bg-amber-50 border-y border-amber-200">
      <div className="container-custom py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
          <div className="flex items-start gap-2.5">
            <span className="text-base shrink-0 mt-0.5">🌏</span>
            <div>
              <p className="text-sm font-bold text-amber-900 leading-snug">
                Investing in {verticalName} from overseas?
              </p>
              <p className="text-xs text-amber-700/80 mt-0.5 leading-relaxed">{keyRule}</p>
            </div>
          </div>
          <Link
            href={href}
            className="shrink-0 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-lg text-xs transition-colors whitespace-nowrap"
          >
            Foreign Investor Guide &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
