import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd, type FaqItem } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `CHESS vs Custodial for International Shares (${CURRENT_YEAR}) — Australian Investor Guide`,
  description: `Understand the difference between direct ownership (CHESS-equivalent) and custodial models when buying international shares from Australia. Covers broker failure risk, CGT implications, SIPC, ASIC RG 212, and which Australian brokers use each model. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `CHESS vs Custodial for International Shares (${CURRENT_YEAR})`,
    description:
      "When you buy US or global shares through an Australian broker, who actually owns them? Direct ownership vs custodial — what it means for your money if a broker fails.",
    url: `${SITE_URL}/global-investing/guides/chess-vs-custodial-international`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("CHESS vs Custodial — International Shares")}&sub=${encodeURIComponent("Ownership Model · Broker Failure · CGT · " + CURRENT_YEAR)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: {
    canonical: `${SITE_URL}/global-investing/guides/chess-vs-custodial-international`,
  },
};

// ─── Data ──────────────────────────────────────────────────────────────────

const COMPARISON_ROWS: { aspect: string; direct: string; custodial: string }[] = [
  {
    aspect: "Legal ownership",
    direct: "You are the legal owner",
    custodial: "Broker or nominee is the legal owner",
  },
  {
    aspect: "Name on share register",
    direct: "Yes — your name appears on the foreign registry",
    custodial: "No — broker's nominee name appears",
  },
  {
    aspect: "Broker failure risk",
    direct: "Low — shares belong to you, not the broker's estate",
    custodial: "Higher — you are an unsecured creditor if assets are not properly segregated",
  },
  {
    aspect: "Transfer to another broker",
    direct:
      "Yes — via DRS (US) or equivalent; no forced sale",
    custodial:
      "Often must sell and rebuy, triggering a CGT event",
  },
  {
    aspect: "SIPC protection (US shares)",
    direct:
      "Yes — up to US$500,000 against broker insolvency (not market losses)",
    custodial:
      "Yes — up to US$500,000, but only if assets are properly segregated",
  },
  {
    aspect: "Dividend administration",
    direct:
      "Complex — may receive foreign cheques or direct credits; you manage collection",
    custodial:
      "Broker collects and credits your account automatically",
  },
  {
    aspect: "Corporate actions",
    direct:
      "You receive rights issues, SPPs, and proxy votes directly",
    custodial:
      "Broker handles and may simplify or restrict your options",
  },
  {
    aspect: "Ongoing cost",
    direct:
      "Generally lower — no extra custodial layer or spread markup",
    custodial:
      "Sometimes higher FX spread or platform fee to cover custody infrastructure",
  },
];

const BROKER_ROWS: { name: string; model: "Direct" | "Custodial"; notes: string }[] = [
  {
    name: "Interactive Brokers (IBKR)",
    model: "Direct",
    notes:
      "Shares registered via DRS (US) and equivalent direct-registration systems on LSE, HKEX, TSE, and more. Lowest FX spread (~0.002%). Steeper learning curve.",
  },
  {
    name: "Stake",
    model: "Custodial",
    notes:
      "DriveWealth custodian holds US shares in nominee name on your behalf. Convenient; zero-commission on US trades. FX spread applies.",
  },
  {
    name: "CommSec International",
    model: "Custodial",
    notes:
      "Commonwealth Bank group custodian. Familiar brand with established trust. Higher FX spread; suits investors who value bank backing.",
  },
  {
    name: "SelfWealth",
    model: "Custodial",
    notes:
      "CHESS-sponsored for ASX; separate third-party custodian for international (US) shares. Simple flat-fee model.",
  },
  {
    name: "NAB Trade",
    model: "Custodial",
    notes:
      "International shares held via a custodian. Good for existing NAB banking customers. Higher FX fees than specialist brokers.",
  },
  {
    name: "Tiger Brokers AU",
    model: "Custodial",
    notes:
      "Custodial model via Singapore parent entity. Competitive pricing; popular with active traders.",
  },
  {
    name: "moomoo AU",
    model: "Custodial",
    notes:
      "Futu Holdings-backed; custodial for international shares. Low commissions; generous sign-up offers.",
  },
];

const PAGE_FAQS: FaqItem[] = [
  {
    q: "Is my money safe if my broker goes bankrupt?",
    a: "It depends on the model. Under direct ownership, the shares are registered in your name on the foreign exchange register — they are not part of the broker&apos;s estate and should be recoverable without selling. Under a custodial model, ASIC&apos;s RG 212 requires the broker to segregate client assets from its own assets, but in practice insolvency can mean delays of months or years while administrators untangle the books — as happened with MF Global clients in 2011. In the US, SIPC covers up to US$500,000 per customer against broker insolvency (not market losses), but this applies to both models only where assets are properly segregated. Neither model is backed by a government guarantee equivalent to the Australian Government Guarantee on bank deposits.",
  },
  {
    q: "What is a Holder Identification Number (HIN)?",
    a: "A HIN is a unique identifier issued to investors by CHESS — the Clearing House Electronic Sub-register System operated by ASX Settlement. Your HIN links your name to your shareholding on the CHESS sub-register, making you the registered legal owner of ASX-listed shares. CHESS only covers ASX-listed securities; international shares have no equivalent HIN. For international shares, direct ownership instead means your name appears on the foreign share registry (e.g. via the US Direct Registration System or CREST in the UK). Custodial accounts have no HIN for your international holdings — only the broker&apos;s nominee does.",
  },
  {
    q: "Can I transfer international shares between brokers?",
    a: "Only if at least one broker supports in-specie transfer. With direct ownership (e.g. IBKR), US shares held in DRS can be transferred to another broker that accepts DRS without triggering a sale, so there is no CGT event. With a custodial account, most brokers do not support incoming transfers of custodial interests — you must sell at the current market price (realising a capital gain or loss) and repurchase through the new broker. This can be a significant hidden cost for long-held positions with large unrealised gains.",
  },
  {
    q: "Do I need CHESS for international shares?",
    a: "No. CHESS is the ASX settlement system and applies only to ASX-listed securities. When you buy shares on the New York Stock Exchange, NASDAQ, London Stock Exchange, or any other foreign market, CHESS is not involved. The equivalent concepts are direct registration on the foreign exchange&apos;s own registry system (such as the US Direct Registration System) for direct ownership, or a custodial nominee arrangement for custodial brokers. Some Australian brokers market their international offering as &quot;CHESS-equivalent&quot; when they use direct registration, but the underlying system is the foreign exchange&apos;s own infrastructure.",
  },
  {
    q: "Which brokers offer direct ownership of international shares?",
    a: "Interactive Brokers (IBKR) is the clearest example available to Australian retail investors. IBKR holds US shares in the Direct Registration System (DRS) in your name and uses equivalent direct-registration infrastructure on other exchanges. CommSec International has offered DRS for US shares as an option. Most other retail brokers available in Australia — including Stake, SelfWealth&apos;s international offering, NAB Trade, Tiger Brokers, and moomoo — use a custodial model. Always confirm with your broker in writing which model they use before depositing.",
  },
];

// ─── Page ──────────────────────────────────────────────────────────────────

export default function ChessVsCustodialPage() {
  const faqSchema = faqJsonLd(PAGE_FAQS);

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Global Investing",
        item: `${SITE_URL}/global-investing`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Guides",
        item: `${SITE_URL}/global-investing/guides`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: "CHESS vs Custodial",
        item: `${SITE_URL}/global-investing/guides/chess-vs-custodial-international`,
      },
    ],
  };

  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 py-8 md:py-12">
        <div className="container-custom">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="text-xs text-slate-600 mb-5 flex flex-wrap items-center gap-1.5">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span className="text-slate-300">/</span>
            <Link href="/global-investing" className="hover:text-slate-900">
              Global Investing
            </Link>
            <span className="text-slate-300">/</span>
            <Link href="/global-investing/guides" className="hover:text-slate-900">
              Guides
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">CHESS vs Custodial</span>
          </nav>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
              {UPDATED_LABEL} — Ownership Model Guide
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-4 tracking-tight text-slate-900">
              CHESS vs Custodial for{" "}
              <span className="text-amber-500">international shares</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-4">
              When you buy US, UK, or global shares through an Australian broker, two fundamentally
              different ownership models are in play. Under a{" "}
              <strong className="text-slate-900">direct ownership model</strong> you are the
              registered legal owner of the shares on the foreign exchange&apos;s register. Under a{" "}
              <strong className="text-slate-900">custodial model</strong> the broker or a nominee
              company holds the shares in its own name on your behalf — you have a beneficial
              interest, but you are not on the register.
            </p>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              The distinction matters most in three situations: if your broker becomes insolvent,
              if you want to transfer your portfolio to another broker without triggering CGT, and
              for estate planning. This guide explains both models in plain language and compares
              every major Australian broker offering international shares.
            </p>
          </div>
        </div>
      </section>

      {/* ── CHESS + Direct + Custodial explained ──────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom max-w-4xl">
          <div className="grid md:grid-cols-2 gap-8">
            {/* CHESS + direct */}
            <div>
              <h2 className="text-lg md:text-xl font-extrabold text-slate-900 mb-1">
                CHESS and direct ownership explained
              </h2>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-4">
                Your name on the register
              </p>
              <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
                <p>
                  <strong>CHESS</strong> (Clearing House Electronic Sub-register System) is the ASX
                  registry for Australian-listed securities. It assigns you a{" "}
                  <strong>Holder Identification Number (HIN)</strong>, making you the registered
                  legal owner of ASX shares. CHESS only covers ASX-listed securities — it has no
                  role in foreign markets.
                </p>
                <p>
                  For international shares, the equivalent is{" "}
                  <strong>direct registration on the foreign exchange&apos;s own registry</strong> —
                  the US <strong>Direct Registration System (DRS)</strong>, UK{" "}
                  <strong>CREST</strong>, or analogous systems on other exchanges. Your name appears
                  on the foreign registry; you are the legal owner. If the broker fails, the shares
                  are not part of its estate.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">Key broker</p>
                  <p className="text-sm text-slate-700">
                    <strong>IBKR</strong> holds US shares via DRS and uses equivalent direct
                    registration on LSE, HKEX, TSE, SGX, and more — the only retail broker available
                    to Australians offering this model at scale.
                  </p>
                </div>
              </div>
            </div>

            {/* Custodial */}
            <div>
              <h2 className="text-lg md:text-xl font-extrabold text-slate-900 mb-1">
                The custodial model
              </h2>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-4">
                Beneficial interest, not legal ownership
              </p>
              <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
                <p>
                  Most Australian brokers offering international shares use a custodian — the broker
                  or a third-party nominee holds all client shares in a pooled omnibus account in
                  its own name. Your beneficial interest is recorded only in the broker&apos;s
                  internal ledger; your name does not appear on any external share register.
                </p>
                <p>
                  Dividends are collected and credited automatically; corporate actions are handled
                  by the broker. For most retail investors buying US ETFs or a handful of blue-chip
                  stocks, the custodial model is transparent and functional in normal conditions.
                </p>
                <div className="bg-slate-100 border border-slate-200 rounded-xl p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Custodial brokers include</p>
                  <p className="text-sm text-slate-700">
                    CommSec International, Stake (DriveWealth), SelfWealth international, NAB Trade,
                    Tiger Brokers AU, moomoo AU
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Comparison Table ───────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom">
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
            Direct ownership vs custodial — side-by-side comparison
          </h2>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-6">
            Eight factors that matter
          </p>
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100 text-left">
                  <th scope="col" className="px-4 py-3 font-bold text-slate-900 rounded-tl-xl">Aspect</th>
                  <th scope="col" className="px-4 py-3 font-bold text-slate-900">Direct ownership</th>
                  <th scope="col" className="px-4 py-3 font-bold text-slate-900 rounded-tr-xl">Custodial</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr
                    key={row.aspect}
                    className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900 align-top border-t border-slate-100">
                      {row.aspect}
                    </td>
                    <td className="px-4 py-3 text-slate-700 align-top border-t border-slate-100">
                      {row.direct}
                    </td>
                    <td className="px-4 py-3 text-slate-700 align-top border-t border-slate-100">
                      {row.custodial}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            SIPC = Securities Investor Protection Corporation (US). Coverage is per-customer per
            broker, not per account. Covers broker insolvency only — not investment losses.
          </p>
        </div>
      </section>

      {/* ── What happens if broker fails ───────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
            What happens if a custodial broker fails?
          </h2>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-5">
            ASIC RG 212, segregation, and the MF Global lesson
          </p>
          <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
            <p>
              ASIC&apos;s client money rules and Regulatory Guide 212 require Australian financial
              services licensees to hold client assets separately from their own — client shares
              must sit in a segregated omnibus account, not commingled with the broker&apos;s
              proprietary assets.
            </p>
            <p>
              In theory this means client assets are ring-fenced in insolvency. In practice,
              recovery is slow and uncertain: administrators must reconcile every client&apos;s
              interest before any assets are returned. If records are poor or the custodian itself
              has problems, the process becomes far more complicated.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 my-4">
              <p className="text-xs font-bold uppercase tracking-wider text-red-700 mb-2">
                Case study — MF Global (2011)
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                MF Global collapsed in October 2011 with approximately US$1.6 billion in client
                funds missing — allegedly used to fund the firm&apos;s own operations. Most clients
                ultimately recovered a significant portion of their assets, but the process took{" "}
                <strong>several years</strong> and some received substantially less. MF Global is
                cited as evidence that legal segregation requirements do not guarantee fast or
                complete recovery.
              </p>
            </div>
            <p>
              The UK FCA&apos;s client assets rules (CASS) are considered stricter than ASIC on
              operational requirements and audit obligations. Brokers regulated in weaker
              jurisdictions offer less practical protection. For large long-term holdings, direct
              ownership removes the dependency on broker operational quality entirely — the shares
              are already in your name on the foreign registry.
            </p>
          </div>
        </div>
      </section>

      {/* ── CGT implications ───────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
            CGT implications when switching brokers
          </h2>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-5">
            Why custody model determines your switching cost
          </p>
          <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
            <p>
              Switching custodial accounts between brokers is not administrative — it is a taxable
              event. Because custodial brokers generally do not support in-specie transfer of
              custodial interests, you must sell at Broker A, withdraw proceeds, and repurchase at
              Broker B. Each disposal is a CGT event at the current market price.
            </p>
            <p>
              If your Apple shares have doubled since purchase, switching broker crystallises that
              gain — assessable in Australia at your marginal rate, less the 50% CGT discount if
              held over 12 months. For large long-held positions this can be a very substantial
              hidden cost of changing brokers.
            </p>
            <p>
              With <strong>direct ownership via DRS</strong>, shares can be transferred in-specie
              to another broker that accepts DRS. No sale occurs, no CGT event is triggered, and
              your original cost base carries across. This is a material advantage for
              buy-and-hold investors over decades as fee structures and platforms evolve.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 my-2">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-2">
                Before switching — check your options
              </p>
              <ul className="text-sm text-slate-700 space-y-1.5">
                <li>Ask your current broker in writing whether in-specie transfer is supported.</li>
                <li>Ask the destination broker whether it accepts DRS or CREST transfers.</li>
                <li>If forced to sell, consider timing across two financial years to manage marginal rate exposure.</li>
                <li>Get tax advice specific to your situation — this guide is general information only.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Estate Planning + Corporate Actions ───────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom max-w-4xl">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Estate */}
            <div>
              <h2 className="text-lg md:text-xl font-extrabold text-slate-900 mb-1">
                Estate planning
              </h2>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-4">
                Chain of title and executors
              </p>
              <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
                <p>
                  Under <strong>direct ownership</strong>, the chain of title is clear — your name
                  is on the foreign share registry. The executor can transfer or sell the shares
                  by instructing the registry directly, similar to dealing with ASX/CHESS shares.
                </p>
                <p>
                  Under a <strong>custodial model</strong>, the executor must navigate the
                  broker&apos;s internal deceased-estate process. Procedures vary widely — some
                  brokers are streamlined; others require original court documents and take months.
                  If the broker itself is in difficulty, the estate has limited external recourse.
                </p>
                <p>
                  For substantial international portfolios, direct ownership simplifies the
                  executor&apos;s task and reduces dependency on broker cooperation.
                </p>
              </div>
            </div>

            {/* Corporate actions */}
            <div>
              <h2 className="text-lg md:text-xl font-extrabold text-slate-900 mb-1">
                Corporate actions and shareholder rights
              </h2>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-4">
                Proxy votes, rights issues, SPPs
              </p>
              <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
                <p>
                  <strong>Direct ownership</strong> gives you the full suite of shareholder
                  rights: proxy vote notices, rights issue entitlements, SPPs, and direct
                  notification of all corporate actions — you instruct the registry, not the broker.
                </p>
                <p>
                  <strong>Custodial brokers</strong> handle corporate actions on your behalf,
                  but experience varies. Some pass through votes and elections cleanly; others
                  elect defaults without prominent notification or let rights lapse. Rights
                  issues requiring cash payment are particularly variable.
                </p>
                <p>
                  For passive US-ETF investors, custodial handling is usually adequate. For
                  smaller-cap or non-US positions, direct ownership and full shareholder rights
                  may be worth the administrative overhead.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Broker Comparison ──────────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom">
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
            Australian brokers — direct vs custodial at a glance
          </h2>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-6">
            Which model does each broker use?
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {BROKER_ROWS.map((b) => (
              <div
                key={b.name}
                className={`rounded-2xl border p-5 ${
                  b.model === "Direct"
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-white border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="font-bold text-slate-900 text-sm">{b.name}</p>
                  <span
                    className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      b.model === "Direct"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {b.model}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{b.notes}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-4">
            Custody model classification based on broker PDS and product documentation as at{" "}
            {UPDATED_LABEL}. Always confirm directly with your broker before depositing.
          </p>
        </div>
      </section>

      {/* ── Which to choose ────────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
            Which model should you choose?
          </h2>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-5">
            A practical framework
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-3">Lean towards direct ownership if...</p>
              <ul className="space-y-1.5 text-sm text-slate-700">
                {[
                  "Portfolio over AU$100,000",
                  "Long-term hold with possible broker switch later",
                  "Lowest FX spread matters — IBKR is ~0.002%",
                  "Access to non-US markets (LSE, HKEX, TSE, SGX)",
                  "Estate planning simplicity is a priority",
                  "Full proxy votes and corporate action participation",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-emerald-600 font-bold shrink-0">+</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">Custodial is fine if...</p>
              <ul className="space-y-1.5 text-sm text-slate-700">
                {[
                  "Investing smaller amounts (under AU$20,000–30,000)",
                  "Simplicity — automatic dividends, clean UI",
                  "Buying US-listed ETFs or blue-chip stocks only",
                  "Existing bank relationship; brand trust matters (CommSec)",
                  "Testing international investing before larger commitment",
                  "Staying with the same broker long-term",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-slate-400 font-bold shrink-0">+</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
            Frequently asked questions
          </h2>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-6">
            CHESS, HIN, broker failure, and more
          </p>
          <div className="space-y-3">
            {PAGE_FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group bg-white border border-slate-200 rounded-2xl overflow-hidden"
              >
                <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer list-none select-none">
                  <span className="font-semibold text-slate-900 text-sm">{faq.q}</span>
                  <span className="shrink-0 w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold group-open:bg-amber-100 group-open:text-amber-700">
                    +
                  </span>
                </summary>
                <div className="px-5 pb-5">
                  <p className="text-sm text-slate-700 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Related guides ─────────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom">
          <h2 className="text-base font-extrabold text-slate-900 mb-5">Related guides</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Link
              href="/global-investing/shares/us"
              className="group block bg-slate-50 border border-slate-200 rounded-2xl p-5 hover:border-amber-300 hover:shadow-md transition-all"
            >
              <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Track A — Direct
              </p>
              <p className="font-bold text-sm text-slate-900 group-hover:text-amber-700 mb-2">
                Buy US shares from Australia
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Full broker comparison — IBKR, Stake, Tiger, moomoo, CommSec International. FX
                costs, W-8BEN, custody, minimum deposits.
              </p>
            </Link>
            <Link
              href="/global-investing/tax/cgt-on-foreign-shares"
              className="group block bg-slate-50 border border-slate-200 rounded-2xl p-5 hover:border-amber-300 hover:shadow-md transition-all"
            >
              <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Tax
              </p>
              <p className="font-bold text-sm text-slate-900 group-hover:text-amber-700 mb-2">
                CGT on foreign shares
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                How Australian CGT applies to international shares. Cost base in AUD, FX impact,
                12-month discount, and FITO for foreign withholding.
              </p>
            </Link>
            <Link
              href="/global-investing/tax/us-estate-tax"
              className="group block bg-slate-50 border border-slate-200 rounded-2xl p-5 hover:border-amber-300 hover:shadow-md transition-all"
            >
              <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Tax
              </p>
              <p className="font-bold text-sm text-slate-900 group-hover:text-amber-700 mb-2">
                US estate tax for Australians
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                US$60,000 situs threshold, DTA credits, and why AU-listed ETFs avoid the exposure
                that direct US shareholding creates.
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Compliance footer ──────────────────────────────────────── */}
      <section className="bg-slate-50 border-t border-slate-100 py-6">
        <div className="container-custom">
          <p className="text-[0.65rem] text-slate-500 leading-relaxed max-w-4xl">
            {GENERAL_ADVICE_WARNING}
          </p>
        </div>
      </section>
    </div>
  );
}
