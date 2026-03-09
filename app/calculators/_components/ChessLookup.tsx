"use client";

import { useState, useEffect } from "react";
import type { Broker } from "@/lib/types";
import { trackClick, trackEvent, getAffiliateLink, AFFILIATE_REL } from "@/lib/tracking";
import Icon from "@/components/Icon";
import { getParam, useUrlSync, ShareResultsButton, CalcSection, SelectField } from "./CalcShared";

interface Props {
  brokers: Broker[];
  searchParams: URLSearchParams;
}

export default function ChessLookup({ brokers, searchParams }: Props) {
  const [selectedSlug, setSelectedSlug] = useState(() => getParam(searchParams, "ch_bk") || "");
  const broker = brokers.find((b) => b.slug === selectedSlug);

  useUrlSync({ calc: "chess", ch_bk: selectedSlug });

  // Track calculator usage (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedSlug) {
        trackEvent('calculator_use', { calc_type: 'chess', selected_broker: selectedSlug }, '/calculators');
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [selectedSlug]);

  return (
    <CalcSection
      id="chess"
      iconName="shield-check"
      title="CHESS Sponsorship Lookup"
      desc="Check if a platform uses CHESS sponsorship or a custodial model, and what it means for you."
    >
      <div className="max-w-md mb-6">
        <SelectField label="Select Platform" value={selectedSlug} onChange={setSelectedSlug} placeholder="Choose a platform...">
          {brokers.map((b) => (
            <option key={b.slug} value={b.slug}>{b.name}</option>
          ))}
        </SelectField>
      </div>

      {broker && (
        <div className="space-y-6">
          <div
            className={`border rounded-xl p-6 ${
              broker.chess_sponsored ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-300"
            }`}
          >
            <div className="flex items-start gap-4">
              {broker.chess_sponsored
                ? <Icon name="check-circle" size={36} className="text-emerald-600 shrink-0" />
                : <Icon name="shield-check" size={36} className="text-amber-500 shrink-0" />
              }
              <div className="flex-1">
                <h4 className="text-lg font-bold text-slate-900 mb-1">
                  {broker.name} &mdash; {broker.chess_sponsored ? "CHESS Sponsored" : "Custodial Model"}
                </h4>
                {broker.chess_sponsored ? (
                  <div className="text-sm text-slate-700 space-y-2 mt-2">
                    <p><strong>What this means:</strong> Your shares are held directly in your name on the ASX CHESS sub-register. You receive a unique Holder Identification Number (HIN) from ASX.</p>
                    <p><strong>Safety:</strong> If {broker.name} were to go bankrupt, your shares are still registered in your name with the ASX. They are not the broker&apos;s assets and cannot be claimed by their creditors.</p>
                    <p><strong>Trade-off:</strong> CHESS-sponsored brokers may charge slightly higher fees for the added safety and direct ownership benefits.</p>
                  </div>
                ) : (
                  <div className="text-sm text-slate-700 space-y-2 mt-2">
                    <p><strong>What this means:</strong> Your shares are held in a pooled custodial account (an &ldquo;omnibus&rdquo; account) under the broker&apos;s name, not directly in your name on the ASX register.</p>
                    <p><strong>Safety:</strong> The broker is required by ASIC to segregate your holdings from their own assets. However, in a broker insolvency, recovery can be slower and more complex than with CHESS sponsorship.</p>
                    <p><strong>Trade-off:</strong> Custodial models often enable lower fees, fractional shares, and access to international markets that CHESS-sponsored brokers may not offer.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* All brokers table */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">All Brokers at a Glance</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Broker</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Model</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-slate-700">ASX Fee</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-slate-700"><span className="sr-only">Action</span></th>
                  </tr>
                </thead>
                <tbody>
                  {brokers.map((b) => (
                    <tr
                      key={b.slug}
                      className={`border-b border-slate-100 last:border-0 transition-colors ${
                        b.slug === selectedSlug ? "bg-emerald-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="px-4 py-2.5 font-medium text-slate-800">{b.name}</td>
                      <td className="px-4 py-2.5">
                        {b.chess_sponsored ? (
                          <span className="inline-flex items-center px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded border border-emerald-200 font-medium">CHESS</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded border border-slate-200 font-medium">Custodial</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-700">{b.asx_fee || "N/A"}</td>
                      <td className="px-4 py-2.5 text-right">
                        <a
                          href={getAffiliateLink(b)}
                          target="_blank"
                          rel={AFFILIATE_REL}
                          onClick={() => trackClick(b.slug, b.name, "calculator-chess", "/calculators", "cta")}
                          className="inline-block px-2.5 py-1 text-[0.69rem] font-bold rounded-md bg-slate-100 text-slate-600 hover:bg-amber-600 hover:text-white transition-all duration-200 whitespace-nowrap active:scale-[0.97]"
                        >
                          Try →
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      <ShareResultsButton />
    </CalcSection>
  );
}
