import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `How to Buy US Shares from Australia (${CURRENT_YEAR}) — Brokers, Tax, FX Compared`,
  description: `The complete guide to buying US shares from Australia. Compare 10 brokers, FX spreads, W-8BEN, US estate tax, CGT in AUD, and direct US shares vs AU-listed ETFs. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `How to Buy US Shares from Australia (${CURRENT_YEAR})`,
    description:
      "Compare brokers, FX spreads, W-8BEN, US estate tax and tax treatment for Australian residents buying US shares.",
    url: `${SITE_URL}/global-investing/shares/us`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Buy US Shares from Australia")}&sub=${encodeURIComponent(`Brokers · FX · W-8BEN · Tax · ${CURRENT_YEAR}`)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/global-investing/shares/us` },
};

// ───────────────────────────────────────────────────────────────────────────
// Broker comparison data. All fees / spreads dated-ok (verified 2026-05).
// Amounts are in AUD unless explicitly noted. Where a broker publishes a
// brokerage tier we use the standard retail rate; sophisticated-investor or
// volume-tier pricing is not represented.
// ───────────────────────────────────────────────────────────────────────────
const BROKERS = [
  {
    name: "Interactive Brokers (IBKR)",
    slug: "interactive-brokers",
    brokerage: "From US$0.0035/share (min US$0.35); IBKR Lite: $0", // dated-ok
    fxSpread: "~0.002% + US$2 fee per FX trade", // dated-ok
    custody: "Custodial — IBKR LLC nominee (SIPC US$500k incl. US$250k cash)",
    w8ben: "Yes — captured in account-opening flow, auto-renewed",
    audFriendly: "Yes — full AU entity, AUD funding via OSKO/PayID + EFT",
    bestFor: "Cost-focused investors, larger balances, multi-market access",
    verdict:
      "The institutional-grade choice. Cheapest FX in the market by a wide margin and brokerage that scales down for active traders. The platform has a steep learning curve and the fee schedule is genuinely complex, but the savings on a $50k+ portfolio more than pay for the friction.",
  },
  {
    name: "Stake",
    slug: "stake",
    brokerage: "$3 flat per US trade (under US$30k); 0.10% above", // dated-ok
    fxSpread: "0.70% on AUD↔USD conversions", // dated-ok
    custody: "Custodial — DriveWealth (US-licensed clearing broker)",
    w8ben: "Yes — captured in onboarding, auto-renewed every 3 years",
    audFriendly: "Yes — Sydney-based, AUD funding via PayID + bank transfer",
    bestFor: "Beginners, smaller trades, app-first users",
    verdict:
      "The friendliest on-ramp to US shares for Australians. Onboarding takes minutes, the UI is genuinely good, and the $3 brokerage is competitive for sub-$5k trades. The 0.70% FX spread is the catch — on a $10,000 conversion you pay $70 to Stake versus roughly $2 with IBKR. Excellent for getting started; less compelling once you hit five figures of activity.",
  },
  {
    name: "Tiger Brokers (AU)",
    slug: "tiger-brokers",
    brokerage: "US$1.99 per trade (first 6 months free promo common)", // dated-ok
    fxSpread: "0.35% AUD↔USD (varies by tier)", // dated-ok
    custody: "Custodial — Tiger Brokers (AU) Pty Ltd / US clearing partners",
    w8ben: "Yes — submitted electronically during onboarding",
    audFriendly: "Yes — AFSL-licensed AU subsidiary; AUD funding accepted",
    bestFor: "Active traders wanting low brokerage and decent FX",
    verdict:
      "The middle ground between Stake and IBKR. Cheaper FX than Stake, cheaper brokerage than CommSec International, and a polished mobile app. Tiger's parent is a Nasdaq-listed Singapore group with a meaningful regulatory footprint, but it's still a younger AU presence than the incumbents.",
  },
  {
    name: "moomoo (AU)",
    slug: "moomoo",
    brokerage: "US$0.99 per trade (promo); US$1.99 standard", // dated-ok
    fxSpread: "~0.40% AUD↔USD (varies)", // dated-ok
    custody: "Custodial — Futu Clearing / Moomoo Securities Australia",
    w8ben: "Yes — submitted in app during account opening",
    audFriendly: "Yes — AFSL-licensed; supports AUD funding",
    bestFor: "Active traders, options users, social-feature seekers",
    verdict:
      "Aggressive pricing and a feature-rich app aimed at engaged traders, including options on US single names. The promotional rates are eye-catching but standard pricing is the figure to plan around. Treat it as a competitor to Tiger rather than a replacement for IBKR.",
  },
  {
    name: "Webull (AU)",
    slug: "webull",
    brokerage: "$0 commission on US shares (regulatory fees pass-through)", // dated-ok
    fxSpread: "~0.60% AUD↔USD (built into FX rate)", // dated-ok
    custody: "Custodial — Webull Securities clearing arrangements",
    w8ben: "Yes — handled in onboarding",
    audFriendly: "Yes — AU AFSL entity launched 2024",
    bestFor: "Frequent low-value US trades where FX spread is acceptable",
    verdict:
      "Headline-zero brokerage is genuinely zero on US trades, which is rare in Australia. The cost has been moved into the FX spread, so the all-in cost on round-trip AUD↔USD↔AUD trades is similar to or higher than competitors. Most useful when you're holding USD positions long-term and only converting infrequently.",
  },
  {
    name: "eToro",
    slug: "etoro",
    brokerage: "$0 commission on US shares; spreads embedded", // dated-ok
    fxSpread: "0.50–1.50% effective via FX + withdrawal fees", // dated-ok
    custody: "Custodial — eToro AUS Capital Limited (CFD model on some assets)",
    w8ben: "Yes — collected at onboarding",
    audFriendly: "Yes — AFSL-licensed AU subsidiary",
    bestFor: "Social trading, copy trading, multi-asset experimentation",
    verdict:
      "eToro markets US-share access alongside crypto and CFDs and the social-trading layer is genuinely differentiated. For pure long-only US share investing, however, the all-in cost (FX spread plus a US$5 withdrawal fee) is meaningfully higher than dedicated brokers. Use it for the social features, not as your cost-optimised core.",
  },
  {
    name: "CommSec International",
    slug: "commsec",
    brokerage: "US$5 + 0.10% (under US$10k); higher tiers above", // dated-ok
    fxSpread: "~0.60% AUD↔USD (CBA wholesale + margin)", // dated-ok
    custody: "Pershing LLC (third-party custodian); DRS available on request",
    w8ben: "Yes — paper / e-form during international account application",
    audFriendly: "Yes — domestic incumbent; AUD funding through CommBank",
    bestFor: "Existing CommSec clients who want everything under one roof",
    verdict:
      "The legacy choice for buy-and-hold investors who already bank with CommBank. Brokerage and FX are uncompetitive against newer entrants, but Pershing custody and the option to direct-register shares (DRS) appeals to investors worried about broker failure. Pay the premium for the institutional plumbing if that risk profile matters to you.",
  },
  {
    name: "CMC International",
    slug: "cmc-markets",
    brokerage: "US$0 brokerage on US shares (CMC Invest tier)", // dated-ok
    fxSpread: "~0.60% AUD↔USD on conversion", // dated-ok
    custody: "Custodial — CMC Markets Stockbroking nominee",
    w8ben: "Yes — captured during international module application",
    audFriendly: "Yes — long-established AU broker; AUD funding native",
    bestFor: "Existing CMC users wanting commission-free US trades",
    verdict:
      "CMC's pivot to zero-commission US trades in 2023 made it competitive again on headline cost. The FX spread keeps round-trip costs in the same ballpark as Stake or moomoo, but if you're already a CMC ASX client there's no extra account to open. A sensible default for existing customers; less compelling as a greenfield choice.",
  },
  {
    name: "Pearler (US)",
    slug: "pearler",
    brokerage: "US$6.50 flat per US trade (no Pearler subscription required)", // dated-ok
    fxSpread: "~0.60% AUD↔USD via partner", // dated-ok
    custody: "Custodial — DriveWealth (US-licensed clearing broker)",
    w8ben: "Yes — collected in onboarding",
    audFriendly: "Yes — Sydney-based; AUD funding via PayID + bank transfer",
    bestFor: "Long-term holders running auto-invest plans",
    verdict:
      "Pearler positions itself as the long-term, set-and-forget broker — auto-invest, goal tracking, and a deliberately calm UI. Per-trade brokerage is higher than Stake but you typically place fewer trades, so total cost over a year can be similar. Worth considering if you want US exposure inside the same dashboard as your ASX ETF auto-invest.",
  },
  {
    name: "Vested",
    slug: "vested",
    brokerage: "$0 commission on US shares (premium tier)", // dated-ok
    fxSpread: "~0.50% AUD↔USD on conversion", // dated-ok
    custody: "Custodial — DriveWealth (US clearing broker)",
    w8ben: "Yes — captured during onboarding",
    audFriendly: "Yes — operates under AU AFSL via partner; AUD funding",
    bestFor: "Investors who want curated US ETF and stock baskets (Vests)",
    verdict:
      "Smaller player aimed at the migrant Australian and Indian-diaspora segments. The 'Vests' (curated baskets) are a differentiated product if you want themed exposure without picking 30 individual stocks. Cost stack is reasonable but custody and product depth lag the larger brokers — fine as a complement, not necessarily as a primary account.",
  },
] as const;

// ───────────────────────────────────────────────────────────────────────────
// FAQ entries. Each answer ≥ 150 words, written in AU English, and avoids
// specific buy/sell/hold recommendations.
// ───────────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    question: "What is the minimum to start buying US shares from Australia?",
    answer:
      "Most Australian-friendly brokers have no formal account minimum. You can fund a Stake, Tiger, moomoo, Webull, CMC, eToro, Pearler or Vested account with as little as a few hundred dollars and place your first trade. Interactive Brokers also has no minimum deposit for retail accounts. The practical minimum is set by two things: the brokerage fee and the FX spread. On a broker charging $3 + 0.70% FX, a $200 trade incurs roughly $4.40 in round-trip cost — about 2.2% — which is steep against typical equity returns. A more reasonable starting parcel is around $1,000–$2,000, where total transaction cost falls below 1%. Fractional shares (offered by Stake, moomoo, Webull, eToro and others) let you buy slices of expensive names like Berkshire Hathaway or Alphabet without needing the full share price, which is genuinely useful for smaller portfolios.",
  },
  {
    question: "Can I buy US shares inside my SMSF?",
    answer:
      "Yes. A self-managed superannuation fund (SMSF) can hold direct US shares, and several brokers — Interactive Brokers, CommSec International and CMC International among them — offer SMSF-specific account types. The fund itself becomes the legal holder of the shares, not you personally. There are a few practical wrinkles. First, the SMSF must complete a W-8BEN-E (the entity form, not the individual W-8BEN) so US dividend withholding drops from 30% to 15% under the Australia–US tax treaty. Second, the fund's investment strategy must explicitly contemplate international and currency-exposed assets. Third, custody and audit trails matter more inside an SMSF — your auditor will want clean confirmation of beneficial ownership, which is straightforward with custodial brokers but worth confirming during onboarding. Finally, US estate tax exposure (covered below) applies to SMSFs holding US-situs assets above the US$60,000 threshold, just as it does to individuals.",
  },
  {
    question: "What happens if my broker fails — am I protected?",
    answer:
      "Most Australian brokers offering US shares hold them via a US clearing partner (commonly DriveWealth, Pershing, or the broker's own US affiliate). Those US clearing brokers are members of the Securities Investor Protection Corporation (SIPC), which protects up to US$500,000 per customer (including up to US$250,000 in cash) against the failure of the clearing broker — not against market losses. The wrinkle is that you are typically a beneficial owner of pooled custody assets rather than a direct holder. If your AU-facing broker fails but the US clearing broker is solvent, your shares are usually transferred to another broker. If the clearing broker also fails, SIPC steps in. CommSec International is unusual in offering DRS (Direct Registration System) on request, which moves shares onto the company's transfer-agent register in your name and removes the broker from the chain entirely. DRS shares are slower to trade but eliminate this layer of counterparty risk.",
  },
  {
    question: "Do I need to declare US shares on my Australian tax return?",
    answer:
      "Yes — Australian tax residents are taxed on worldwide income, so US dividends and US share capital gains both go on your Australian return regardless of where the shares are held. Dividends are reported as foreign income and converted to AUD at the rate prevailing on the date of receipt. Capital gains are calculated in AUD using the AUD value of the cost base on the purchase date and the AUD value of the proceeds on the sale date — meaning currency movement alone can create a taxable gain or loss even if the USD price didn't move. Where US tax has been withheld (typically 15% on dividends under the AU–US treaty if you've lodged a W-8BEN), you can usually claim a Foreign Income Tax Offset (FITO) up to the Australian tax payable on that same income. For SMSFs and trusts, the rules are similar but reporting flows through the entity's return. Most brokers issue an annual tax statement summarising distributions and FX-converted figures.",
  },
  {
    question: "Are fractional shares available, and are they treated the same for tax?",
    answer:
      "Yes — Stake, moomoo, Webull, eToro, Vested and Pearler all support fractional US shares, typically down to 1/100,000th of a share or a minimum trade value of US$1–$10. Interactive Brokers also offers fractionals on most large-cap US names. Fractionals matter most for high-priced shares: a single Berkshire Hathaway A share trades above US$600,000, so dollar-based investing only works fractionally. From a tax perspective, fractional shares are treated identically to whole shares — each parcel has a cost base, a holding period, and CGT on disposal. The complication is record-keeping: if your broker invests $50 a week into the same ticker, you may end up with dozens of small parcels, each with its own AUD cost base on the purchase date. Most brokers' annual tax statements aggregate this for you, but it's worth confirming the parcel-level detail is preserved in case the ATO asks for a CGT working.",
  },
  {
    question: "How do I transfer US shares between brokers without selling?",
    answer:
      "The mechanism is the Automated Customer Account Transfer Service (ACATS) — the US equivalent of Australia's broker-to-broker portfolio transfer. You initiate the transfer at the receiving broker by providing your sending broker's name, account number, and a list of holdings. The sending broker validates and releases, and the assets move in-kind, preserving your cost base and holding period — no CGT event in Australia. ACATS transfers usually settle in 5–10 business days. The catches: not every Australian-facing broker supports outbound ACATS, fees can run to US$75–$150 per transfer at the sending broker, and partial transfers are sometimes harder than full transfers. Stake and Pearler use the same DriveWealth clearing broker, which can simplify movement between them. Interactive Brokers supports ACATS in both directions and is often the destination of choice for portfolios scaling beyond beginner brokers. Always check that fractional shares survive the transfer — they sometimes don't and may be liquidated.",
  },
  {
    question: "What is W-8BEN and what happens if I don't submit one?",
    answer:
      "W-8BEN is the IRS form that certifies you are not a US person and claims treaty benefits between the US and your country of tax residence. As an Australian tax resident, lodging a valid W-8BEN reduces US dividend withholding from the default 30% (the rate the IRS applies to non-US persons who haven't certified treaty residence) to 15% under the Australia–US Double Tax Agreement. Without it, you give up 15 percentage points of every US dividend permanently — that is real money that will not be refunded by the ATO via FITO, because the FITO offset is capped at the treaty rate, not the punitive rate. Every Australian-friendly broker captures the W-8BEN inside the account-opening flow, usually as a digital form you sign electronically. The form is valid for three calendar years plus the year of signing, and reputable brokers automatically prompt you to re-certify before expiry. Missing a renewal flips you back to 30% withholding until you re-lodge.",
  },
  {
    question: "What is US estate tax and how can Australians manage it?",
    answer:
      "US estate tax is one of the least-discussed risks for Australians who own US shares directly. The US imposes estate tax of up to 40% on the value of US-situs assets owned by a non-resident alien at death, with an exemption of only US$60,000 — far below the US$13.6 million exemption available to US citizens. US-situs assets include shares of US-incorporated companies (Apple, Microsoft, Tesla and so on) held in any account, including SMSFs. Australian-listed ETFs that hold US shares (such as IVV, NDQ, VTS) are not US-situs from the US estate-tax perspective because the ETF unit is an Australian-domiciled security, even though the underlying assets are American. That structural difference is the main argument for using AU-listed ETFs for the US-equity portion of a portfolio once it grows beyond the US$60,000 threshold. Specialist tax and estate-planning advice is generally worth the cost above that level — the rules interact with treaty exemptions, US$ basis-step-up, and probate.",
  },
  {
    question: "Direct US shares or AU-listed US ETFs — which is better?",
    answer:
      "Both can be sensible, and many Australian portfolios use a mix. Direct US shares give you control over which companies you own, fractional access to names not represented in any Australian-listed product, and the ability to harvest losses against specific positions. AU-listed US ETFs (IVV, NDQ, VTS, IHVV and similar) sidestep US estate-tax exposure on the unit, settle through CHESS, distribute in AUD, and generally produce a much simpler tax return. The trade-off is tracking — an ETF gives you the index, not the specific picks — and a small management fee (0.03–0.48%) on top of the underlying. A common framing: use AU-listed ETFs as the core US-equity exposure (especially above the US$60k US-situs threshold), and direct US shares for higher-conviction single names or themes that no ETF cleanly captures. For a deeper comparison see the calculator at /global-investing/calculators/direct-vs-asx-cost when it ships.",
  },
  {
    question: "How are FX costs hidden in 'zero brokerage' US share offers?",
    answer:
      "When an Australian broker advertises 'free' or 'zero commission' US trades, the cost has almost always been moved into the foreign-exchange leg of the transaction. Buying a US share from an AUD account requires converting AUD to USD at the spot rate plus a margin — and the broker keeps the margin. Typical retail FX spreads sit in the 0.40–0.70% range; some brokers advertise 'no FX fee' but use an inflated rate that bakes in 1% or more. Interactive Brokers is the outlier at roughly 0.002% plus a US$2 fixed fee per FX trade. The dollar impact is easy to underestimate: on a $10,000 conversion, a 0.70% spread costs $70, while IBKR's spread costs roughly $2. Round-tripping the position (convert in, convert out) doubles the cost. The lesson is to compare the all-in transaction cost — brokerage plus FX — rather than the headline brokerage figure, especially if you plan to convert larger amounts.",
  },
  {
    question: "Can I avoid converting AUD to USD by holding USD in my broker?",
    answer:
      "Most Australian-friendly US share brokers settle trades in USD and let you hold a USD cash balance between trades, dividends and sales. This means you can convert AUD to USD once at a favourable spread (or in a few large parcels), hold the USD wallet over time, and avoid round-trip FX on every trade. Interactive Brokers and CommSec International support multi-currency balances natively. Stake, Tiger, moomoo and Pearler hold USD on your behalf within a US wallet you can see in-app. The catches: the AUD value of your USD wallet still moves with the exchange rate (and that movement is potentially taxable when realised in some scenarios), and not every broker pays interest on idle USD cash. If you receive USD dividends, holding them as USD until you have enough to reinvest avoids spread leakage on small repatriations. The main behavioural risk is letting idle cash drift, which costs real return over a long horizon.",
  },
  {
    question: "Is it legal for Australians to use US-based brokers like Robinhood or Schwab?",
    answer:
      "It depends. US retail brokers are licensed by FINRA / the SEC for US-resident customers; their account-opening forms typically require a US Social Security Number and a US residential address. Robinhood does not currently accept Australian residents. Charles Schwab International does accept some Australian clients but with a US$25,000 minimum deposit and a more limited product set than the domestic Schwab brand. Saxo and DriveWealth (white-labelled to Stake, Pearler and others) are the main 'globally licensed' alternatives that legitimately serve Australian residents. Using a US-only broker as an Australian resident — for instance, by using a relative's US address — is contractually a violation of the customer agreement and can result in the account being frozen or closed when discovered. It also creates messy AU tax reporting because the broker won't issue Australian-format tax statements. The safer path is one of the AFSL-licensed Australian-facing brokers covered in this guide.",
  },
  {
    question: "How do I report capital gains in AUD when prices are quoted in USD?",
    answer:
      "Australian CGT is calculated in AUD, full stop — but US shares are bought and sold in USD, which means you have to convert each leg at the prevailing FX rate on the relevant date. Your cost base in AUD is the USD purchase price multiplied by the AUD/USD rate on the purchase date, plus any incidental costs (brokerage, FX margin) also expressed in AUD. Your proceeds in AUD are the USD sale price multiplied by the AUD/USD rate on the sale date, less brokerage. The AUD gain or loss is the difference. This produces an outcome that surprises many investors: you can sell a stock for the same USD price you paid and still have a taxable AUD gain because the AUD weakened in the interim — or vice versa. The ATO publishes monthly average exchange rates that are typically acceptable for non-trader investors, and most Australian-facing brokers issue annual tax statements with AUD figures pre-converted. Keep parcel-level records, especially for partial sales using FIFO or specific identification.",
  },
];

// ───────────────────────────────────────────────────────────────────────────
// Common mistakes — short bullets the FAQ doesn't cover.
// ───────────────────────────────────────────────────────────────────────────
const COMMON_MISTAKES = [
  {
    title: "Letting your W-8BEN expire",
    detail:
      "The form lapses after three calendar years plus the year of signing. Missed renewals flip you to 30% US withholding until you re-lodge, and the FITO claim back home is capped at the 15% treaty rate — not the higher rate actually withheld.",
  },
  {
    title: "Ignoring US estate tax on US-situs shares",
    detail:
      "The US$60,000 exemption for non-resident aliens is a hard cliff. Above it, US estate tax can claim up to 40% of the value of US-listed shares at death. AU-listed ETFs holding US shares sidestep this because the unit itself is Australian-domiciled.",
  },
  {
    title: "Comparing brokers on brokerage alone",
    detail:
      "A broker advertising '$0 commission' may be charging 0.7% on the FX spread, which dwarfs any per-trade fee on a meaningful position. Always compute the all-in cost: brokerage plus FX spread on the AUD↔USD conversion.",
  },
  {
    title: "Paying retail bank FX spreads to fund your account",
    detail:
      "Funding a US trading account by an international SWIFT transfer through your bank can layer another 1.5–3% on top of the broker's own FX. Use the broker's native AUD funding rail (PayID, OSKO, EFT) and let the broker's FX engine do the conversion.",
  },
  {
    title: "Forgetting that AUD CGT moves even when USD doesn't",
    detail:
      "If the AUD weakens 10% over your holding period, you can owe AUD CGT on a US share that sold for the same USD price you paid. Currency movement is not a separate tax event — it's baked into the AUD cost base and AUD proceeds calculation.",
  },
  {
    title: "Not claiming Foreign Income Tax Offset (FITO)",
    detail:
      "Australian tax residents can claim back US dividend withholding against AU tax on the same income, up to the FITO cap. Many investors leave this on the table by not entering the foreign tax paid into their AU return — the broker's annual tax statement is your source document.",
  },
  {
    title: "Trading micro-parcels and burning cost",
    detail:
      "On a fixed brokerage of $3–US$5 plus 0.7% FX, a $200 trade can cost 2%+ in round-trip transaction cost. Batching contributions into less-frequent, larger parcels meaningfully improves long-term net return.",
  },
];

// ───────────────────────────────────────────────────────────────────────────
// 4-step process for the "How it works" explainer.
// ───────────────────────────────────────────────────────────────────────────
const STEPS = [
  {
    n: 1,
    title: "Open an Australian-facing US share broker",
    body:
      "Most Australian residents apply through one of the AFSL-licensed brokers covered below. Onboarding takes 5–30 minutes and uses your driver's licence or passport for KYC. Some brokers (Interactive Brokers, CommSec International) take longer because they verify against multiple databases and capture an extended financial profile.",
  },
  {
    n: 2,
    title: "Fund the account in AUD and execute the FX leg",
    body:
      "AUD funding is via PayID, OSKO, or domestic EFT — usually instant or same day. The broker then converts AUD to USD at the prevailing rate plus an FX margin. A handful of brokers let you hold a USD balance, which means you only convert occasionally rather than on every trade — often the single biggest cost saver.",
  },
  {
    n: 3,
    title: "Submit your W-8BEN",
    body:
      "Every Australian-facing US broker captures the W-8BEN form during onboarding. This certifies your Australian tax residency and reduces US dividend withholding from 30% to 15% under the Australia–US treaty. Reputable brokers auto-renew the form before its three-year expiry.",
  },
  {
    n: 4,
    title: "Place your first US trade",
    body:
      "US markets trade 09:30–16:00 ET (roughly 11:30 PM–6:00 AM AEST during daylight savings). You can place orders outside hours — most brokers queue them for the next session. Settlement is T+1 in the US as of mid-2024; your USD balance updates the next business day, and the AUD-equivalent value moves with the exchange rate until you convert back.",
  },
];

export default function BuyUSSharesFromAustraliaPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Global Investing", url: `${SITE_URL}/global-investing` },
    { name: "Shares", url: `${SITE_URL}/global-investing/shares` },
    { name: "US Shares" },
  ]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <Link href="/global-investing" className="hover:text-slate-900">Global Investing</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">US Shares</span>
          </nav>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
              Cornerstone Guide · {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              How to buy US shares{" "}
              <span className="text-amber-600">from Australia</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              A complete walk-through for Australian residents buying direct US shares in {CURRENT_YEAR}: which brokers
              accept Australians, what FX really costs, why W-8BEN matters, the US estate-tax trap most investors miss,
              and how Australian CGT applies to gains earned in USD.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="#brokers"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-xs transition-colors"
              >
                Compare 10 brokers &rarr;
              </Link>
              <Link
                href="#tax"
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 hover:border-amber-300 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
              >
                Tax for AU residents &rarr;
              </Link>
              <Link
                href="#faq"
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 hover:border-amber-300 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
              >
                FAQ &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Key callouts ───────────────────────────────────────────────── */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Cheapest FX</p>
              <p className="text-xl font-black text-amber-700">~0.002%</p>
              <p className="text-xs text-slate-600 mt-1">IBKR — vs 0.40–0.70% retail</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">US dividend WHT</p>
              <p className="text-xl font-black text-slate-900">15%</p>
              <p className="text-xs text-slate-600 mt-1">With W-8BEN under AU–US DTA</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">US estate tax</p>
              <p className="text-xl font-black text-slate-900">40%</p>
              <p className="text-xs text-slate-600 mt-1">Above US$60k US-situs threshold</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Brokers compared</p>
              <p className="text-xl font-black text-slate-900">10</p>
              <p className="text-xs text-slate-600 mt-1">All AU-resident friendly</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Intro narrative ────────────────────────────────────────────── */}
      <section className="py-10 md:py-14">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Why this matters"
            title="The Australian market is roughly 2% of global market cap"
          />
          <div className="text-sm text-slate-600 leading-relaxed space-y-4">
            <p>
              Australian investors are famously home-biased. The ASX represents around 2% of world equity market
              capitalisation, yet Australian household portfolios routinely allocate 70% or more to domestic shares.
              The structural reason is franking — fully franked dividends are extremely tax-efficient for Australian
              residents — but the cost of that tilt is concentration. Six of the top ten ASX names are banks, miners
              and supermarkets. There is no Australian Apple, no Australian Microsoft, no Australian Nvidia.
            </p>
            <p>
              Buying US shares directly is one way to broaden that exposure. The other is buying Australian-listed
              ETFs that hold US shares under the bonnet — a different trade-off, covered briefly below and in depth
              at <Link href="/global-investing/etfs/us" className="text-amber-700 hover:text-amber-800 font-semibold underline">our AU-listed US ETF guide</Link>.
              This page focuses on the direct route: opening a US share account from Australia, funding it in AUD,
              choosing what to buy, and reporting it correctly to the ATO.
            </p>
            <p>
              The mechanics aren&apos;t complicated, but the cost stack is wider than most beginners expect. A single
              round-trip US$10,000 trade can cost between roughly $4 and $140 depending on which broker you use —
              and the difference is almost entirely in the FX spread, not the headline brokerage. The tax side adds
              another layer: US dividend withholding, Australian CGT calculated in AUD, and a little-known US estate
              tax that applies to US-situs assets above US$60,000. The rest of this page walks through each piece.
            </p>
          </div>
        </div>
      </section>

      {/* ── How it works in 4 steps ────────────────────────────────────── */}
      <section className="py-10 md:py-14 bg-slate-50">
        <div className="container-custom">
          <SectionHeading
            eyebrow={`How it works in ${CURRENT_YEAR}`}
            title="From AUD in your bank to a US share parcel"
            sub="Four steps. Most Australians complete the whole sequence in a single afternoon."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STEPS.map((step) => (
              <div key={step.n} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col">
                <div className="text-2xl font-black text-amber-300 leading-none mb-2">{step.n}</div>
                <p className="text-sm font-extrabold text-slate-900 mb-2">{step.title}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Broker comparison ─────────────────────────────────────────── */}
      <section id="brokers" className="py-10 md:py-14">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Broker comparison"
            title="10 US share brokers that accept Australian residents"
            sub="Brokerage and FX figures are typical retail rates as of mid-2026. Verify current pricing on each broker's site before applying — promotional tiers and volume discounts change frequently."
          />
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="min-w-full text-xs border-collapse">
              <thead className="bg-slate-100">
                <tr>
                  <th className="text-left px-3 py-2 font-bold text-slate-700 border-b border-slate-200 sticky left-0 bg-slate-100 z-10">Broker</th>
                  <th className="text-left px-3 py-2 font-bold text-slate-700 border-b border-slate-200">Brokerage</th>
                  <th className="text-left px-3 py-2 font-bold text-slate-700 border-b border-slate-200">FX spread</th>
                  <th className="text-left px-3 py-2 font-bold text-slate-700 border-b border-slate-200">Custody</th>
                  <th className="text-left px-3 py-2 font-bold text-slate-700 border-b border-slate-200">W-8BEN in flow?</th>
                  <th className="text-left px-3 py-2 font-bold text-slate-700 border-b border-slate-200">AU friendly</th>
                  <th className="text-left px-3 py-2 font-bold text-slate-700 border-b border-slate-200">Best for</th>
                </tr>
              </thead>
              <tbody>
                {BROKERS.map((b, i) => (
                  <tr key={b.slug} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-3 py-3 font-bold text-slate-900 border-b border-slate-100 sticky left-0 z-10 align-top whitespace-nowrap" style={{ backgroundColor: i % 2 === 0 ? "white" : "rgb(248,250,252)" }}>
                      <Link href={`/broker/${b.slug}`} className="hover:text-amber-700">{b.name}</Link>
                    </td>
                    <td className="px-3 py-3 text-slate-700 border-b border-slate-100 align-top">{b.brokerage}</td>
                    <td className="px-3 py-3 text-slate-700 border-b border-slate-100 align-top">{b.fxSpread}</td>
                    <td className="px-3 py-3 text-slate-700 border-b border-slate-100 align-top">{b.custody}</td>
                    <td className="px-3 py-3 text-slate-700 border-b border-slate-100 align-top">{b.w8ben}</td>
                    <td className="px-3 py-3 text-slate-700 border-b border-slate-100 align-top">{b.audFriendly}</td>
                    <td className="px-3 py-3 text-slate-700 border-b border-slate-100 align-top">{b.bestFor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Per-broker verdicts */}
          <div className="mt-10 space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Per-broker verdict</p>
            {BROKERS.map((b) => (
              // <Product> schema marker — loop wires structured data later.
              <div key={b.slug} className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                  <h3 className="text-base font-extrabold text-slate-900">{b.name}</h3>
                  <Link href={`/broker/${b.slug}`} className="text-xs font-bold text-amber-700 hover:text-amber-800">
                    Full review &rarr;
                  </Link>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{b.verdict}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FX costs explained ─────────────────────────────────────────── */}
      <section className="py-10 md:py-14 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="FX costs"
            title="The hidden cost in 'zero commission' US trading"
            sub="Brokerage gets the marketing. FX gets your money."
          />
          <div className="text-sm text-slate-600 leading-relaxed space-y-4">
            <p>
              Almost every Australian retail broker offering US shares sits in a 0.40–0.70% FX-spread band on AUD↔USD
              conversions. A handful (Webull, eToro) bake more than that into a wider rate. Interactive Brokers is the
              outlier at roughly 0.002% plus a US$2 fee per FX trade — about two orders of magnitude cheaper than the
              typical retail broker.
            </p>
            <p className="font-semibold text-slate-800">Worked example — converting A$10,000 to USD:</p>
            <ul className="space-y-1 list-disc pl-6">
              <li>
                Stake at 0.70%: ~$70 cost, leaving roughly US$6,580 (assuming a 0.66 AUD/USD rate). {/* dated-ok */}
              </li>
              <li>
                CommSec International at ~0.60%: ~$60 cost.
              </li>
              <li>
                Tiger AU at 0.35%: ~$35 cost.
              </li>
              <li>
                IBKR at ~0.002% + US$2 fee: roughly $2 cost in total.
              </li>
            </ul>
            <p>
              Round-tripping the conversion (AUD → USD → AUD) doubles the cost. On a $50,000 portfolio that you fully
              convert in and out, the difference between the cheapest and the typical retail spread is around $700 in
              one direction and $1,400 round-trip — money that simply leaves your portfolio. For long-term buy-and-hold
              positions the impact is smaller (you only convert in once), but the lesson is clear: compare all-in cost,
              not headline brokerage.
            </p>
            <p>
              If you trade frequently or hold five-figure-plus USD balances, a broker that offers a multi-currency wallet
              (so you can hold USD between trades and avoid round-trip FX) can matter more than the per-trade brokerage.
              For a deeper comparison of dedicated FX providers including non-broker options, see <Link href="/global-investing/currency/best-fx-providers" className="text-amber-700 hover:text-amber-800 font-semibold underline">our FX provider guide</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* ── W-8BEN explained ───────────────────────────────────────────── */}
      <section className="py-10 md:py-14">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Tax form"
            title="W-8BEN — what it is and why it matters"
            sub="A two-page IRS form is the difference between 30% withholding and 15%."
          />
          <div className="text-sm text-slate-600 leading-relaxed space-y-4">
            <p>
              The W-8BEN is the IRS&apos;s certificate of foreign status for individuals. By signing it, you certify that
              you are not a US person and that you are claiming the reduced withholding rate available under the tax
              treaty between the United States and your country of residence — Australia, in our case.
            </p>
            <p>
              Without a valid W-8BEN, the default US withholding rate on dividends paid to non-US persons is 30%. With a
              valid W-8BEN claiming Australian residence, that rate drops to 15% under Article 10 of the Australia–US
              Double Tax Agreement. The 15-percentage-point gap is real, permanent and uncreditable: the Foreign Income
              Tax Offset back in Australia is capped at the treaty rate, not the punitive default rate, so anything
              withheld above 15% is a permanent loss.
            </p>
            <p>
              Every Australian-facing US broker captures the W-8BEN inside its account-opening flow as an electronic
              signature. The form is valid for three calendar years plus the year of signing — i.e. a form signed in
              June 2026 expires at the end of 2029 — and reputable brokers automatically prompt re-certification.
              Interactive Brokers, Stake, Tiger, moomoo, Webull, eToro, CommSec International, CMC International, Pearler
              and Vested all handle this.
            </p>
            <p>
              You don&apos;t lodge the W-8BEN with the ATO. It lives at your broker (or, for SMSFs, the W-8BEN-E entity
              variant lives there). If your broker prompts you to renew, do it that day — a lapsed form means the next
              dividend is withheld at 30% with no easy recovery. Read the deeper explainer at <Link href="/global-investing/tax/w-8ben" className="text-amber-700 hover:text-amber-800 font-semibold underline">our W-8BEN guide</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* ── Custody model ──────────────────────────────────────────────── */}
      <section className="py-10 md:py-14 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Custody"
            title="Custodial vs CHESS-equivalent — who actually owns your shares?"
            sub="In Australia we're spoiled by CHESS. The US has no equivalent for retail."
          />
          <div className="text-sm text-slate-600 leading-relaxed space-y-4">
            <p>
              Australian-listed shares settle through CHESS — the ASX-operated registry that records each holder&apos;s
              shares directly in their HIN. This means CommSec, Stake AU, Pearler, SelfWealth and most ASX brokers are
              CHESS-sponsored: the share is unambiguously yours, registered against your HIN, separate from the broker&apos;s
              own assets.
            </p>
            <p>
              The US has no consumer-facing equivalent at scale. Almost every Australian broker offering US shares uses
              a custodial model: shares are held in &quot;street name&quot; by a US clearing broker (DriveWealth, Pershing, or
              the broker&apos;s own US affiliate) on your behalf. You are the beneficial owner; the clearing broker is the
              record-holder. SIPC insurance protects up to US$500,000 per customer (US$250,000 of that in cash) against
              the failure of the clearing broker — not against market losses.
            </p>
            <p>
              CommSec International is unusual in offering DRS (Direct Registration System) on request, which moves
              your shares onto the company&apos;s own transfer-agent register in your name. This eliminates the custodial
              middle-layer entirely but is slower to trade — DRS shares typically can&apos;t be sold same-day without
              first re-registering them with a broker. For most retail investors, custodial is fine; DRS appeals to
              long-term holders who want to remove broker counter-party risk from the picture.
            </p>
            <p>
              The practical implication: if your AU-facing broker fails but the US clearing broker is solvent, your
              shares are usually transferred to another broker in the SIPC process. If the clearing broker also fails,
              SIPC steps in. The chain is more layered than CHESS sponsorship — investors moving large balances may
              prefer the institutional plumbing of an IBKR or CommSec International over a smaller white-labelled retail
              broker.
            </p>
          </div>
        </div>
      </section>

      {/* ── Tax treatment for AU residents ─────────────────────────────── */}
      <section id="tax" className="py-10 md:py-14">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="AU tax treatment"
            title="How US shares are taxed for Australian residents"
            sub="Worldwide income, AUD-converted CGT, and one offset that matters."
          />
          <div className="text-sm text-slate-600 leading-relaxed space-y-4">
            <p>
              Australian tax residents are taxed on worldwide income. US dividends and US share capital gains both flow
              into your Australian return, regardless of where the brokerage account sits. Two mechanisms govern the
              numbers: dividend withholding (handled at source by the broker) and CGT calculated in AUD (handled by you
              when you sell).
            </p>
            <p className="font-semibold text-slate-800">Dividends.</p>
            <p>
              US-incorporated companies pay dividends in USD into your broker account. Under your W-8BEN, 15% is
              withheld by the US payer and remitted to the IRS. The remaining 85% lands as USD cash. On your Australian
              return, you declare the full gross AUD-equivalent dividend as foreign income, then claim a Foreign Income
              Tax Offset (FITO) for the 15% US tax already paid. Net effect: you pay AU tax at your marginal rate, but
              with credit for the US withholding so you&apos;re not taxed twice on the same dividend. Read more at <Link href="/global-investing/tax/fito" className="text-amber-700 hover:text-amber-800 font-semibold underline">our FITO guide</Link>.
            </p>
            <p className="font-semibold text-slate-800">Capital gains.</p>
            <p>
              Australian CGT is calculated in AUD. Your cost base is the USD purchase price multiplied by the AUD/USD
              rate on the purchase date, plus brokerage and FX margin in AUD. Your proceeds are the USD sale price
              multiplied by the AUD/USD rate on the sale date, less brokerage. The difference is your gross AUD gain or
              loss. If you held the parcel for more than 12 months, the 50% individual CGT discount applies (33% for
              SMSFs in pension phase, complete denial for trusts holding for less than 12 months). Currency movement
              flows directly into the AUD result — you can sell at the same USD price you paid and still record an AUD
              gain or loss. The full mechanics, including parcel-level cost basing for partial sales, are covered in <Link href="/global-investing/tax/cgt-on-foreign-shares" className="text-amber-700 hover:text-amber-800 font-semibold underline">our CGT on foreign shares guide</Link>.
            </p>
            <p className="font-semibold text-slate-800">FX rates and record-keeping.</p>
            <p>
              The ATO publishes monthly average AUD/USD rates that are accepted for non-trader investors; daily spot
              rates are also acceptable and sometimes more accurate for individual large parcels. Most Australian-facing
              brokers issue an annual tax statement that pre-converts dividends and disposals into AUD using the
              applicable rate, which is your primary source document. Keep parcel-level records for partial sales — the
              FIFO default applies unless you specifically identify a parcel.
            </p>
          </div>
        </div>
      </section>

      {/* ── US estate tax ──────────────────────────────────────────────── */}
      <section className="py-10 md:py-14 bg-amber-50 border-y border-amber-200">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="The hidden risk"
            title="US estate tax — 40% above US$60,000"
          />
          <div className="text-sm text-slate-600 leading-relaxed space-y-4">
            <p>
              US estate tax is the most consequential risk that many Australians never hear about. The US imposes
              estate tax of up to 40% on the value of US-situs assets owned by a non-resident alien at death, with an
              exemption of just US$60,000. For comparison, US citizens get an exemption of around US$13.6 million.
              Non-residents do not.
            </p>
            <p>
              US-situs assets include shares of US-incorporated companies — Apple, Microsoft, Tesla, Berkshire Hathaway
              — held in any account, including SMSFs. They generally do not include Australian-listed ETFs that hold
              US shares (IVV, NDQ, VTS, IHVV and similar) because the ETF unit itself is an Australian-domiciled
              security, even though the underlying assets are American.
            </p>
            <p>
              That structural difference is the strongest argument for using AU-listed ETFs for the US-equity portion of
              a portfolio that grows above the US$60,000 US-situs threshold. Some investors mix the two: direct US
              shares for high-conviction picks while keeping the bulk of US exposure inside AU-listed ETFs.
            </p>
            <p>
              Above the threshold, the rules interact with treaty exemptions, basis-step-up provisions, joint-tenancy
              treatment, and probate — and the planning is genuinely complex. Specialist tax and estate-planning advice
              is generally worth the cost. Our deep dive at <Link href="/global-investing/tax/us-estate-tax" className="text-amber-700 hover:text-amber-800 font-semibold underline">US estate tax for Australians</Link>{" "}
              covers the planning options including ETF substitution, joint structures and Australian-incorporated
              holding structures.
            </p>
          </div>
        </div>
      </section>

      {/* ── Direct US shares vs AU-listed ETFs ─────────────────────────── */}
      <section className="py-10 md:py-14">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Two tracks"
            title="Direct US shares vs AU-listed US ETFs"
            sub="Different costs, different control, different tax surface."
          />
          <div className="text-sm text-slate-600 leading-relaxed space-y-4">
            <p>
              Both routes give you US-equity exposure from Australia, but the trade-offs are materially different.
              Direct US shares (the subject of this page) give you precise control over which companies you own,
              fractional access to names not represented in any Australian-listed product, and the ability to harvest
              losses against specific positions for tax purposes.
            </p>
            <p>
              AU-listed US ETFs (IVV, NDQ, VTS, IHVV and similar) sidestep US estate tax on the unit, settle through
              CHESS, distribute in AUD, and produce a much simpler tax return. The trade-off is that an ETF gives you
              the index, not specific picks, and a small management fee (0.03% to 0.48% depending on the product) sits
              on top of the underlying.
            </p>
            <p className="font-semibold text-slate-800">A common framing:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Use AU-listed ETFs as the core US-equity exposure, especially as your US-situs holdings approach the
                US$60k estate-tax threshold.
              </li>
              <li>
                Use direct US shares for higher-conviction single names, themes that no ETF cleanly captures, or tax-loss
                harvesting where parcel-level control matters.
              </li>
              <li>
                Periodically check the all-in cost of each route — a 0.03% MER plus 0.04% spread on IVV is hard to beat
                for set-and-forget core exposure, but ETFs don&apos;t let you own Berkshire at any price you choose.
              </li>
            </ul>
            <p>
              For a side-by-side cost calculator including brokerage, FX, MER and assumed-holding-period assumptions,
              see <Link href="/global-investing/calculators/direct-vs-asx-cost" className="text-amber-700 hover:text-amber-800 font-semibold underline">our direct-vs-ETF calculator</Link>.
              For the AU-listed ETF deep dive see <Link href="/global-investing/etfs/us" className="text-amber-700 hover:text-amber-800 font-semibold underline">Track B — AU-listed US ETFs</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* ── Common mistakes ────────────────────────────────────────────── */}
      <section className="py-10 md:py-14 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Pitfalls"
            title="Common mistakes Australians make buying US shares"
          />
          <div className="space-y-4">
            {COMMON_MISTAKES.map((m) => (
              <div key={m.title} className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-sm font-extrabold text-slate-900 mb-1">{m.title}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{m.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-10 md:py-14">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="FAQ" title="Buying US shares from Australia — common questions" />
          <div className="mt-6 divide-y divide-slate-200">
            {FAQS.map((faq) => (
              <details key={faq.question} className="py-4 group">
                <summary className="text-sm font-semibold text-slate-900 cursor-pointer list-none flex items-center justify-between gap-2">
                  {faq.question}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform shrink-0">▾</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cross-links ────────────────────────────────────────────────── */}
      <section className="py-8 bg-slate-50 border-t border-slate-200">
        <div className="container-custom">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Related guides</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/global-investing" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">Global investing hub →</Link>
            <Link href="/global-investing/etfs/us" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">AU-listed US ETFs (Track B) →</Link>
            <Link href="/global-investing/tax/us-estate-tax" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">US estate tax →</Link>
            <Link href="/global-investing/tax/w-8ben" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">W-8BEN explained →</Link>
            <Link href="/global-investing/tax/fito" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">Foreign Income Tax Offset (FITO) →</Link>
            <Link href="/global-investing/tax/cgt-on-foreign-shares" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">CGT on foreign shares →</Link>
            <Link href="/global-investing/currency/best-fx-providers" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">Best FX providers →</Link>
            <Link href="/share-trading" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">AU-listed only? See AU brokers →</Link>
            <Link href="/foreign-investment" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">Inbound: investing in Australia from overseas →</Link>
          </div>
        </div>
      </section>

      {/* ── Compliance footer ──────────────────────────────────────────── */}
      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
        </div>
      </section>
    </div>
  );
}
