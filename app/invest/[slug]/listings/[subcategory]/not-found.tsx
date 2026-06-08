import Link from "next/link";
import Icon from "@/components/Icon";

// Co-located not-found boundary. Without it, `notFound()` (called here for an
// unknown category or sub-category) falls back to the root boundary, which the
// @netlify/plugin-nextjs runtime serves as a 500 instead of a graceful 404.
// This route handles every vertical that lacks a dedicated `listings/[slug]`
// detail route (funds, digital-infrastructure, venture-capital, …), so the
// missing boundary made every such listing-detail link 500 on the live mirror.
export default function InvestListingNotFound() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4 py-12">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Icon name="trending-up" size={28} className="text-slate-300" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Listing Category Not Found</h1>
        <p className="text-sm text-slate-500 mb-6">
          That investment listing category doesn&apos;t exist. Browse our investment verticals below.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <Link
            href="/invest"
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors text-center"
          >
            Explore Investments
          </Link>
          <Link
            href="/invest/listings"
            className="w-full sm:w-auto px-5 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors text-center"
          >
            All Listings
          </Link>
        </div>
        <div className="border-t border-slate-100 pt-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Popular verticals</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/invest/funds/listings" className="px-3 py-1.5 rounded-full min-h-9 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-600 transition-colors">
              Funds
            </Link>
            <Link href="/invest/commercial-property/listings" className="px-3 py-1.5 rounded-full min-h-9 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-600 transition-colors">
              Commercial property
            </Link>
            <Link href="/invest/farmland/listings" className="px-3 py-1.5 rounded-full min-h-9 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-600 transition-colors">
              Farmland
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
