import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";

export default async function HomePage() {
  const supabase = await createClient();

  // Fetch top 5 brokers (active, highest rated)
  const { data: brokers } = await supabase
    .from('brokers')
    .select('*')
    .eq('status', 'active')
    .order('rating', { ascending: false })
    .limit(5);

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-slate-50 to-white py-20">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">
              Stop <em className="text-amber not-italic">Overpaying</em> Your Broker.
            </h1>
            <p className="text-xl text-slate-600 mb-8">
              Compare 10+ Australian share trading platforms. Real fees, real data, no bank bias.
              Find the broker that actually fits your situation.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/compare"
                className="px-8 py-3 bg-amber text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors"
              >
                Compare Brokers
              </Link>
              <Link
                href="#quiz"
                className="px-8 py-3 border-2 border-brand text-brand font-semibold rounded-lg hover:bg-slate-50 transition-colors"
              >
                Take The Quiz
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-8 border-y border-slate-200">
        <div className="container-custom">
          <div className="flex flex-wrap justify-center gap-12 text-center">
            <div>
              <div className="text-3xl font-bold text-brand">52,000+</div>
              <div className="text-sm text-slate-600">Monthly Visitors</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-brand">4.8/5</div>
              <div className="text-sm text-slate-600">User Rating</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-brand">100%</div>
              <div className="text-sm text-slate-600">Independent</div>
            </div>
          </div>
        </div>
      </section>

      {/* Top Brokers */}
      <section className="py-16">
        <div className="container-custom">
          <h2 className="text-3xl font-bold mb-8">Top Rated Brokers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {brokers?.map((broker: Broker) => (
              <Link
                key={broker.id}
                href={`/broker/${broker.slug}`}
                className="border border-slate-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{broker.name}</h3>
                    <p className="text-sm text-slate-600">{broker.tagline}</p>
                  </div>
                  {broker.rating && (
                    <div className="text-amber font-bold text-lg">
                      {broker.rating}★
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-600">ASX Fee:</span>
                    <span className="font-semibold">{broker.asx_fee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">US Fee:</span>
                    <span className="font-semibold">{broker.us_fee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">FX Rate:</span>
                    <span className="font-semibold">{broker.fx_rate}%</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {broker.chess_sponsored && (
                    <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded border border-green-200">
                      CHESS
                    </span>
                  )}
                  {broker.smsf_support && (
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded border border-blue-200">
                      SMSF
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link
              href="/compare"
              className="text-amber font-semibold hover:underline"
            >
              View All Brokers →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
