"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Broker } from "@/lib/types";
import { PLATFORM_TYPE_LABELS } from "@/lib/types";
import BrokerLogo from "@/components/BrokerLogo";
import Icon from "@/components/Icon";

interface VersusHubSearchProps {
  brokers: Broker[];
}

export default function VersusHubSearch({ brokers }: VersusHubSearchProps) {
  const [brokerA, setBrokerA] = useState<string>("");
  const [brokerB, setBrokerB] = useState<string>("");
  const [searchA, setSearchA] = useState("");
  const [searchB, setSearchB] = useState("");
  const [focusA, setFocusA] = useState(false);
  const [focusB, setFocusB] = useState(false);

  const filteredA = useMemo(() => {
    if (!searchA.trim()) return brokers.slice(0, 8);
    const q = searchA.toLowerCase();
    return brokers
      .filter((b) => b.name.toLowerCase().includes(q) || b.slug.includes(q))
      .slice(0, 8);
  }, [searchA, brokers]);

  const filteredB = useMemo(() => {
    if (!searchB.trim()) return brokers.filter((b) => b.slug !== brokerA).slice(0, 8);
    const q = searchB.toLowerCase();
    return brokers
      .filter(
        (b) =>
          b.slug !== brokerA &&
          (b.name.toLowerCase().includes(q) || b.slug.includes(q))
      )
      .slice(0, 8);
  }, [searchB, brokers, brokerA]);

  const selectedA = brokers.find((b) => b.slug === brokerA);
  const selectedB = brokers.find((b) => b.slug === brokerB);

  const comparisonSlug = useMemo(() => {
    if (!brokerA || !brokerB) return null;
    const [first, second] = [brokerA, brokerB].sort();
    return `${first}-vs-${second}`;
  }, [brokerA, brokerB]);

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl p-3.5 md:p-6 mb-8 md:mb-14">
      <h3 className="text-sm md:text-base font-semibold text-slate-900 mb-3">
        Build Your Own Comparison
      </h3>
      <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-stretch">
        {/* Broker A */}
        <div className="flex-1 relative">
          <label className="text-[0.6rem] md:text-xs text-slate-500 mb-1 block">
            Platform 1
          </label>
          {selectedA && !focusA ? (
            <button
              onClick={() => {
                setBrokerA("");
                setSearchA("");
                setFocusA(true);
              }}
              className="w-full flex items-center gap-2 p-2.5 md:p-3 border border-slate-300 rounded-lg bg-white text-left hover:border-slate-400"
            >
              <BrokerLogo broker={selectedA} size="xs" />
              <span className="text-sm font-medium text-slate-900 flex-1">
                {selectedA.name}
              </span>
              <Icon name="x" size={14} className="text-slate-400" />
            </button>
          ) : (
            <>
              <input
                type="text"
                placeholder="Search platforms..."
                value={searchA}
                onChange={(e) => setSearchA(e.target.value)}
                onFocus={() => setFocusA(true)}
                onBlur={() => setTimeout(() => setFocusA(false), 200)}
                className="w-full p-2.5 md:p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-slate-500"
              />
              {focusA && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                  {filteredA.map((b) => (
                    <button
                      key={b.slug}
                      onMouseDown={() => {
                        setBrokerA(b.slug);
                        setSearchA("");
                        setFocusA(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left"
                    >
                      <BrokerLogo broker={b} size="xs" />
                      <span className="text-sm text-slate-900">{b.name}</span>
                      <span className="text-[0.6rem] text-slate-400 ml-auto">
                        {PLATFORM_TYPE_LABELS[b.platform_type]}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* VS divider */}
        <div className="flex items-end justify-center pb-1 md:pb-2">
          <span className="text-xs md:text-sm font-bold text-slate-400">VS</span>
        </div>

        {/* Broker B */}
        <div className="flex-1 relative">
          <label className="text-[0.6rem] md:text-xs text-slate-500 mb-1 block">
            Platform 2
          </label>
          {selectedB && !focusB ? (
            <button
              onClick={() => {
                setBrokerB("");
                setSearchB("");
                setFocusB(true);
              }}
              className="w-full flex items-center gap-2 p-2.5 md:p-3 border border-slate-300 rounded-lg bg-white text-left hover:border-slate-400"
            >
              <BrokerLogo broker={selectedB} size="xs" />
              <span className="text-sm font-medium text-slate-900 flex-1">
                {selectedB.name}
              </span>
              <Icon name="x" size={14} className="text-slate-400" />
            </button>
          ) : (
            <>
              <input
                type="text"
                placeholder="Search platforms..."
                value={searchB}
                onChange={(e) => setSearchB(e.target.value)}
                onFocus={() => setFocusB(true)}
                onBlur={() => setTimeout(() => setFocusB(false), 200)}
                className="w-full p-2.5 md:p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-slate-500"
              />
              {focusB && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                  {filteredB.map((b) => (
                    <button
                      key={b.slug}
                      onMouseDown={() => {
                        setBrokerB(b.slug);
                        setSearchB("");
                        setFocusB(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left"
                    >
                      <BrokerLogo broker={b} size="xs" />
                      <span className="text-sm text-slate-900">{b.name}</span>
                      <span className="text-[0.6rem] text-slate-400 ml-auto">
                        {PLATFORM_TYPE_LABELS[b.platform_type]}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Compare button */}
        <div className="flex items-end">
          {comparisonSlug ? (
            <Link
              href={`/versus/${comparisonSlug}`}
              className="w-full md:w-auto px-5 py-2.5 md:py-3 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors text-center whitespace-nowrap"
            >
              Compare
            </Link>
          ) : (
            <button
              disabled
              className="w-full md:w-auto px-5 py-2.5 md:py-3 bg-slate-200 text-slate-400 text-sm font-semibold rounded-lg cursor-not-allowed text-center whitespace-nowrap"
            >
              Compare
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
