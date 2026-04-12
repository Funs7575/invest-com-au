"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import type { Broker } from "@/lib/types";
import ChessLookup from "@/app/calculators/_components/ChessLookup";

export default function ChessLookupClient({ brokers }: { brokers: Broker[] }) {
  const searchParams = useSearchParams();

  return (
    <div className="py-5 md:py-12">
      <div className="container-custom max-w-3xl">
        {/* Breadcrumb */}
        <nav className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <Link href="/calculators" className="hover:text-slate-900">Calculators</Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <span className="text-slate-700">CHESS Sponsorship Lookup</span>
        </nav>

        {/* Hero */}
        <div className="bg-gradient-to-br from-slate-700 to-blue-900 rounded-2xl p-5 md:p-8 text-white mb-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full mb-3">
              <Icon name="shield-check" size={14} className="text-white" />
              <span className="text-xs font-bold uppercase tracking-wide">CHESS Sponsorship Lookup</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold mb-2 leading-tight">
              Is Your Broker CHESS Sponsored?
            </h1>
            <p className="text-sm md:text-base text-slate-200 max-w-2xl">
              CHESS sponsorship means you directly own your ASX shares under a Holder Identification Number (HIN).
              Check any Australian broker&apos;s sponsorship status and understand what it means for the safety of
              your shares.
            </p>
          </div>
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full" />
          <div className="absolute -right-24 -top-16 w-64 h-64 bg-white/5 rounded-full" />
        </div>

        <ChessLookup brokers={brokers} searchParams={searchParams} />

        <div className="mt-8 md:mt-12 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 md:p-6">
            <h2 className="text-base md:text-lg font-bold text-slate-900 mb-3">What CHESS sponsorship means for Australian investors</h2>
            <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
              <p>
                CHESS stands for the Clearing House Electronic Subregister System — the ASX&apos;s central registry that records
                who legally owns every listed Australian share. When you buy shares through a CHESS-sponsored broker, the shares
                are registered in your name under a unique Holder Identification Number (HIN) that belongs solely to you. You
                are the legal owner of record, and the broker is simply your nominated sponsor who transacts on your behalf.
              </p>
              <p>
                <strong className="text-slate-900">Sponsored vs custodial — the key difference:</strong> In a custodial model,
                your broker holds the shares on your behalf in a pooled or nominee account. You have beneficial ownership but
                not legal ownership — the broker&apos;s name is on the ASX register. Custodial brokers (like Stake&apos;s ASX
                product, Superhero standard, and Sharesies) can often offer lower fees and fractional shares, but you rely on
                the broker&apos;s custodian to maintain accurate records of who owns what.
              </p>
              <p>
                <strong className="text-slate-900">Why CHESS matters:</strong> If your CHESS-sponsored broker fails or goes
                bankrupt, your shares are still yours. They sit on the ASX register under your HIN and can be transferred to
                another sponsoring broker in days. In a custodial failure, recovering your shares depends on the custodian&apos;s
                records and insolvency processes — generally still safe under ASIC regulation, but the process is slower and
                less transparent.
              </p>
              <p>
                <strong className="text-slate-900">What happens if a broker fails:</strong> For CHESS-sponsored shareholders,
                the process is straightforward: you simply nominate a new sponsoring broker and your HIN moves across. Your
                shares never actually leave the ASX register. For custodial clients, ASIC and the custodian work through the
                reconciliation process, which has historically been successful but can take weeks or months.
              </p>
              <p>
                <strong className="text-slate-900">How to check yours:</strong> If you&apos;ve received a CHESS holding statement
                by mail or email with an &quot;X&quot; followed by 10 digits, you&apos;re CHESS-sponsored. If you can only access
                your holdings via a broker app with no HIN reference, you&apos;re likely in a custodial account. Use the lookup
                above to confirm the CHESS status of every major Australian broker instantly.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-base md:text-lg font-bold text-slate-900">Frequently Asked Questions</h2>
            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
              {[
                {
                  q: "What does CHESS mean?",
                  a: "CHESS stands for Clearing House Electronic Subregister System. It is the ASX's centralised system for recording legal ownership of Australian listed shares. A CHESS-sponsored investor has their own Holder Identification Number (HIN) that identifies them directly on the ASX register as the legal owner of their shares.",
                },
                {
                  q: "Is a custodial broker bad?",
                  a: "Not bad — just different. Custodial brokers are ASIC-regulated and must segregate client assets. Custodial models enable features CHESS-sponsored brokers often can't offer: lower fees, fractional shares, instant settlement, and easier international trading. The main trade-off is that you rely on the broker's custodian, not the ASX register, for proof of ownership.",
                },
                {
                  q: "How do I get a HIN?",
                  a: "Open an account with any CHESS-sponsored broker (CommSec, CMC Invest, nabtrade, Selfwealth, Pearler, Bell Direct and others). Once you place your first trade, the broker issues a unique HIN for you and registers the shares under that number. You'll receive a CHESS holding statement confirming the HIN.",
                },
                {
                  q: "Can I transfer my shares between brokers?",
                  a: "Yes. If you're CHESS-sponsored, you can transfer your HIN between brokers using a Broker-to-Broker transfer form, usually within 5 business days and at no cost. If you're custodial, you typically need to sell your holdings and rebuy through the new broker — which can trigger capital gains tax.",
                },
                {
                  q: "What if my broker goes bust?",
                  a: "If you're CHESS-sponsored, your shares remain safely on the ASX register under your HIN — you simply nominate a new sponsoring broker and continue. If you're custodial, ASIC and the custodian manage the reconciliation process; shares are still legally segregated from the broker's own assets, but recovery can take longer.",
                },
              ].map(({ q, a }) => (
                <div key={q} className="p-4 md:p-5">
                  <p className="text-sm font-semibold text-slate-900 mb-1">{q}</p>
                  <p className="text-xs md:text-sm text-slate-500 leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-[0.69rem] md:text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Related Tools</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/chess-sponsored" className="text-xs px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-white transition-colors">
                CHESS-Sponsored Brokers →
              </Link>
              <Link href="/trade-cost-calculator" className="text-xs px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-white transition-colors">
                Trade Cost Calculator →
              </Link>
              <Link href="/compare" className="text-xs px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-white transition-colors">
                Compare Brokers →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
