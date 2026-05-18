import Link from "next/link";

export default function NewsletterProUpsell() {
  return (
    <div
      data-testid="newsletter-pro-upsell"
      className="mb-4 md:mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 md:p-5"
    >
      <div className="flex items-start gap-3 md:gap-4">
        <div className="hidden md:flex shrink-0 w-10 h-10 rounded-full bg-amber-500 text-white items-center justify-center font-extrabold">
          ★
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs md:text-sm font-extrabold text-amber-900 mb-0.5">
            Get the Pro edition every week
          </p>
          <p className="text-xs md:text-sm text-amber-800/90 leading-snug mb-2">
            Pro members get deep-dive fee-change analysis, exclusive broker
            deals, and quarterly platform reports. $99/yr.
          </p>
          <Link
            href="/pro"
            className="inline-block text-xs md:text-sm font-extrabold text-amber-900 underline hover:text-amber-700"
          >
            Upgrade to Pro &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
