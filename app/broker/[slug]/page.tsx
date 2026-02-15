import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Broker } from "@/lib/types";
import { notFound } from "next/navigation";

export default async function BrokerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: broker } = await supabase
    .from('brokers')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .single();

  if (!broker) notFound();

  const b = broker as Broker;

  // Fetch similar brokers
  const { data: similar } = await supabase
    .from('brokers')
    .select('name, slug, rating, asx_fee, tagline')
    .eq('status', 'active')
    .neq('slug', slug)
    .order('rating', { ascending: false })
    .limit(3);

  return (
    <div className="py-12">
      <div className="container-custom">
        {/* Breadcrumb */}
        <div className="text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-brand">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/compare" className="hover:text-brand">Brokers</Link>
          <span className="mx-2">/</span>
          <span className="text-brand">{b.name}</span>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold">{b.name}</h1>
              {b.deal && (
                <span className="px-3 py-1 bg-amber text-white text-sm font-semibold rounded-full">
                  Deal
                </span>
              )}
            </div>
            <p className="text-lg text-slate-600">{b.tagline}</p>
            {b.deal_text && (
              <p className="mt-2 text-green-700 font-medium">{b.deal_text}</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            {b.rating && (
              <div className="text-center">
                <div className="text-3xl font-bold text-amber">{b.rating}</div>
                <div className="text-sm text-slate-500">Rating</div>
              </div>
            )}
            {b.affiliate_url && (
              <a
                href={b.affiliate_url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="px-6 py-3 bg-amber text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors"
              >
                {b.cta_text || "Visit Broker"}
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Fee Overview */}
            <section className="border border-slate-200 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Fee Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-sm text-slate-500">ASX Fee</div>
                  <div className="text-lg font-bold">{b.asx_fee || 'N/A'}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-sm text-slate-500">US Fee</div>
                  <div className="text-lg font-bold">{b.us_fee || 'N/A'}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-sm text-slate-500">FX Rate</div>
                  <div className="text-lg font-bold">{b.fx_rate != null ? `${b.fx_rate}%` : 'N/A'}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-sm text-slate-500">Inactivity Fee</div>
                  <div className="text-lg font-bold">{b.inactivity_fee || 'None'}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-sm text-slate-500">Min Deposit</div>
                  <div className="text-lg font-bold">{b.min_deposit || 'None'}</div>
                </div>
              </div>
            </section>

            {/* Features */}
            <section className="border border-slate-200 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Features</h2>
              <div className="grid grid-cols-2 gap-3">
                <Feature label="CHESS Sponsored" value={b.chess_sponsored} />
                <Feature label="SMSF Support" value={b.smsf_support} />
                <Feature label="Crypto Trading" value={b.is_crypto} />
              </div>
            </section>

            {/* Pros & Cons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {b.pros && b.pros.length > 0 && (
                <section className="border border-green-200 rounded-lg p-6 bg-green-50">
                  <h2 className="text-lg font-bold text-green-800 mb-3">Pros</h2>
                  <ul className="space-y-2">
                    {b.pros.map((pro: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-green-600 mt-0.5">&#10003;</span>
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {b.cons && b.cons.length > 0 && (
                <section className="border border-red-200 rounded-lg p-6 bg-red-50">
                  <h2 className="text-lg font-bold text-red-800 mb-3">Cons</h2>
                  <ul className="space-y-2">
                    {b.cons.map((con: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-red-600 mt-0.5">&#10007;</span>
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            {/* Platforms */}
            {b.platforms && b.platforms.length > 0 && (
              <section className="border border-slate-200 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">Available Platforms</h2>
                <div className="flex flex-wrap gap-2">
                  {b.platforms.map((platform: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-slate-100 text-slate-700 text-sm rounded-full">
                      {platform}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Payment Methods */}
            {b.payment_methods && b.payment_methods.length > 0 && (
              <section className="border border-slate-200 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">Payment Methods</h2>
                <div className="flex flex-wrap gap-2">
                  {b.payment_methods.map((method: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-slate-100 text-slate-700 text-sm rounded-full">
                      {method}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* CTA Card */}
            {b.affiliate_url && (
              <div className="border border-slate-200 rounded-lg p-6 bg-slate-50 sticky top-20">
                <h3 className="font-bold text-lg mb-2">{b.name}</h3>
                <p className="text-sm text-slate-600 mb-4">{b.tagline}</p>
                <a
                  href={b.affiliate_url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="block w-full text-center px-6 py-3 bg-amber text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors"
                >
                  {b.cta_text || "Visit Broker"}
                </a>
                <p className="text-xs text-slate-400 mt-3 text-center">
                  Capital at risk. T&Cs apply.
                </p>
              </div>
            )}

            {/* Similar Brokers */}
            {similar && similar.length > 0 && (
              <div className="border border-slate-200 rounded-lg p-6">
                <h3 className="font-bold text-lg mb-4">Similar Brokers</h3>
                <div className="space-y-3">
                  {similar.map((s: { name: string; slug: string; rating: number; asx_fee: string; tagline: string }) => (
                    <Link
                      key={s.slug}
                      href={`/broker/${s.slug}`}
                      className="block p-3 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold">{s.name}</div>
                          <div className="text-xs text-slate-500">{s.asx_fee}</div>
                        </div>
                        <span className="text-amber font-bold text-sm">{s.rating}&#9733;</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {value ? (
        <span className="text-green-600 font-bold">&#10003;</span>
      ) : (
        <span className="text-red-400">&#10007;</span>
      )}
      <span>{label}</span>
    </div>
  );
}
