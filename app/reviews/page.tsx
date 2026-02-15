import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Broker } from "@/lib/types";

export const metadata = {
  title: "Broker Reviews — Invest.com.au",
  description: "In-depth, honest reviews of every major Australian share trading platform. Fees, pros, cons, and our verdict.",
};

export default async function ReviewsPage() {
  const supabase = await createClient();

  const { data: brokers } = await supabase
    .from('brokers')
    .select('*')
    .eq('status', 'active')
    .order('rating', { ascending: false });

  const shareBrokers = (brokers || []).filter((b: Broker) => !b.is_crypto);
  const cryptoBrokers = (brokers || []).filter((b: Broker) => b.is_crypto);

  return (
    <div className="py-12">
      <div className="container-custom">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Broker Reviews</h1>
        <p className="text-slate-600 mb-8">
          In-depth reviews of every broker we cover. Real fees, real analysis, no fluff.
        </p>

        {/* Share Trading Brokers */}
        <h2 className="text-xl font-extrabold mb-4">Share Trading Brokers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {shareBrokers.map((broker: Broker) => (
            <BrokerReviewCard key={broker.id} broker={broker} />
          ))}
        </div>

        {/* Crypto Exchanges */}
        {cryptoBrokers.length > 0 && (
          <>
            <h2 className="text-xl font-extrabold mb-4">Crypto Exchanges</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cryptoBrokers.map((broker: Broker) => (
                <BrokerReviewCard key={broker.id} broker={broker} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BrokerReviewCard({ broker }: { broker: Broker }) {
  return (
    <Link
      href={`/broker/${broker.slug}`}
      className="border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
    >
      <div className="p-6">
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: `${broker.color}20`, color: broker.color }}
          >
            {broker.icon || broker.name.charAt(0)}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold">{broker.name}</h2>
            <div className="text-sm text-amber">
              {'★'.repeat(Math.floor(broker.rating || 0))}
              <span className="text-slate-400 ml-1">{broker.rating}/5</span>
            </div>
          </div>
        </div>
        <p className="text-sm text-slate-600 mb-4">{broker.tagline}</p>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">ASX Fee</span>
            <span className="font-medium">{broker.asx_fee || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">FX Rate</span>
            <span className="font-medium">{broker.fx_rate != null ? `${broker.fx_rate}%` : 'N/A'}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {broker.chess_sponsored && (
            <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[0.6rem] rounded border border-green-200 font-semibold">CHESS</span>
          )}
          {broker.smsf_support && (
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[0.6rem] rounded border border-blue-200 font-semibold">SMSF</span>
          )}
          {broker.deal && (
            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[0.6rem] rounded border border-amber-200 font-semibold">Deal</span>
          )}
        </div>
      </div>
      <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-center">
        <span className="text-sm font-semibold text-amber">Read Full Review →</span>
      </div>
    </Link>
  );
}
