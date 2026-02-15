import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";

export default async function ComparePage() {
  const supabase = await createClient();

  const { data: brokers } = await supabase
    .from('brokers')
    .select('*')
    .eq('status', 'active')
    .order('rating', { ascending: false });

  return (
    <div className="py-12">
      <div className="container-custom">
        <h1 className="text-4xl font-bold mb-8">Compare Australian Brokers</h1>

        <div className="overflow-x-auto">
          <table className="w-full border border-slate-200 rounded-lg">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Broker</th>
                <th className="px-4 py-3 text-left font-semibold">ASX Fee</th>
                <th className="px-4 py-3 text-left font-semibold">US Fee</th>
                <th className="px-4 py-3 text-left font-semibold">FX Rate</th>
                <th className="px-4 py-3 text-center font-semibold">CHESS</th>
                <th className="px-4 py-3 text-center font-semibold">SMSF</th>
                <th className="px-4 py-3 text-center font-semibold">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {brokers?.map((broker: Broker) => (
                <tr key={broker.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <a href={`/broker/${broker.slug}`} className="font-semibold text-brand hover:text-amber">
                      {broker.name}
                    </a>
                    <div className="text-sm text-slate-600">{broker.tagline}</div>
                  </td>
                  <td className="px-4 py-3">{broker.asx_fee || 'N/A'}</td>
                  <td className="px-4 py-3">{broker.us_fee || 'N/A'}</td>
                  <td className="px-4 py-3">{broker.fx_rate}%</td>
                  <td className="px-4 py-3 text-center">
                    {broker.chess_sponsored ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-red-600">✗</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {broker.smsf_support ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-red-600">✗</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-amber font-semibold">
                      {broker.rating}★
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
