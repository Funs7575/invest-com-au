import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Broker } from "@/lib/types";

export default async function ReviewsPage() {
  const supabase = await createClient();

  const { data: brokers } = await supabase
    .from('brokers')
    .select('*')
    .eq('status', 'active')
    .order('rating', { ascending: false });

  return (
    <div className="py-12">
      <div className="container-custom">
        <h1 className="text-4xl font-bold mb-4">Broker Reviews</h1>
        <p className="text-lg text-slate-600 mb-8">
          In-depth reviews of every broker we cover. Real fees, real analysis, no fluff.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {brokers?.map((broker: Broker) => (
            <Link
              key={broker.id}
              href={`/broker/${broker.slug}`}
              className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h2 className="text-xl font-bold">{broker.name}</h2>
                  {broker.rating && (
                    <span className="text-amber font-bold">{broker.rating}&#9733;</span>
                  )}
                </div>
                <p className="text-sm text-slate-600 mb-4">{broker.tagline}</p>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">ASX Fee</span>
                    <span className="font-medium">{broker.asx_fee || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">US Fee</span>
                    <span className="font-medium">{broker.us_fee || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">FX Rate</span>
                    <span className="font-medium">{broker.fx_rate != null ? `${broker.fx_rate}%` : 'N/A'}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {broker.chess_sponsored && (
                    <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded border border-green-200">CHESS</span>
                  )}
                  {broker.smsf_support && (
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded border border-blue-200">SMSF</span>
                  )}
                  {broker.is_crypto && (
                    <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded border border-purple-200">Crypto</span>
                  )}
                  {broker.deal && (
                    <span className="px-2 py-1 bg-amber/10 text-amber text-xs rounded border border-amber/30 font-semibold">Deal</span>
                  )}
                </div>
              </div>
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-center">
                <span className="text-sm font-semibold text-amber">Read Full Review &rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
