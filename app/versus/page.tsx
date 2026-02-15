"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Broker } from "@/lib/types";

export default function VersusPage() {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [brokerA, setBrokerA] = useState<string>("");
  const [brokerB, setBrokerB] = useState<string>("");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('brokers')
      .select('*')
      .eq('status', 'active')
      .order('name')
      .then(({ data }) => {
        if (data) setBrokers(data);
      });
  }, []);

  const a = brokers.find(b => b.slug === brokerA);
  const b = brokers.find(b => b.slug === brokerB);

  return (
    <div className="py-12">
      <div className="container-custom">
        <h1 className="text-4xl font-bold mb-4">Broker vs Broker</h1>
        <p className="text-lg text-slate-600 mb-8">
          Compare two brokers side by side to see which one suits you better.
        </p>

        {/* Selectors */}
        <div className="flex flex-col md:flex-row gap-4 mb-10">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">Broker A</label>
            <select
              value={brokerA}
              onChange={(e) => setBrokerA(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-brand bg-white"
            >
              <option value="">Select a broker...</option>
              {brokers.map(b => (
                <option key={b.slug} value={b.slug}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end justify-center pb-3">
            <span className="text-2xl font-bold text-slate-300">VS</span>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">Broker B</label>
            <select
              value={brokerB}
              onChange={(e) => setBrokerB(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-brand bg-white"
            >
              <option value="">Select a broker...</option>
              {brokers.map(b => (
                <option key={b.slug} value={b.slug}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Comparison Table */}
        {a && b && (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-500">Feature</th>
                  <th className="px-6 py-4 text-center text-sm font-bold">{a.name}</th>
                  <th className="px-6 py-4 text-center text-sm font-bold">{b.name}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <CompareRow label="Rating" valA={a.rating ? `${a.rating}★` : 'N/A'} valB={b.rating ? `${b.rating}★` : 'N/A'} />
                <CompareRow label="ASX Fee" valA={a.asx_fee || 'N/A'} valB={b.asx_fee || 'N/A'} />
                <CompareRow label="US Fee" valA={a.us_fee || 'N/A'} valB={b.us_fee || 'N/A'} />
                <CompareRow label="FX Rate" valA={a.fx_rate != null ? `${a.fx_rate}%` : 'N/A'} valB={b.fx_rate != null ? `${b.fx_rate}%` : 'N/A'} />
                <CompareRow label="CHESS Sponsored" valA={a.chess_sponsored ? '✓' : '✗'} valB={b.chess_sponsored ? '✓' : '✗'} />
                <CompareRow label="SMSF Support" valA={a.smsf_support ? '✓' : '✗'} valB={b.smsf_support ? '✓' : '✗'} />
                <CompareRow label="Crypto" valA={a.is_crypto ? '✓' : '✗'} valB={b.is_crypto ? '✓' : '✗'} />
                <CompareRow label="Inactivity Fee" valA={a.inactivity_fee || 'None'} valB={b.inactivity_fee || 'None'} />
                <CompareRow label="Min Deposit" valA={a.min_deposit || 'None'} valB={b.min_deposit || 'None'} />
              </tbody>
            </table>

            {/* Pros & Cons */}
            <div className="grid grid-cols-1 md:grid-cols-2 border-t border-slate-200">
              <div className="p-6 border-r border-slate-200">
                <h3 className="font-bold mb-3">{a.name} Pros</h3>
                <ul className="space-y-1 text-sm">
                  {a.pros?.map((p, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-green-600">&#10003;</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-6">
                <h3 className="font-bold mb-3">{b.name} Pros</h3>
                <ul className="space-y-1 text-sm">
                  {b.pros?.map((p, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-green-600">&#10003;</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {(!a || !b) && brokers.length > 0 && (
          <div className="text-center py-16 text-slate-400">
            Select two brokers above to compare them side by side.
          </div>
        )}
      </div>
    </div>
  );
}

function CompareRow({ label, valA, valB }: { label: string; valA: string; valB: string }) {
  return (
    <tr className="hover:bg-slate-50">
      <td className="px-6 py-3 text-sm text-slate-600 font-medium">{label}</td>
      <td className="px-6 py-3 text-sm text-center font-semibold">{valA}</td>
      <td className="px-6 py-3 text-sm text-center font-semibold">{valB}</td>
    </tr>
  );
}
