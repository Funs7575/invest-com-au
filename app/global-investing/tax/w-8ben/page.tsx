import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, CURRENT_YEAR, UPDATED_LABEL, breadcrumbJsonLd } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import type { FaqItem } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `W-8BEN Form for Australians (${CURRENT_YEAR}) — Reduce US Withholding Tax to 15%`,
  description: `Complete guide to the W-8BEN form for Australian investors. Certify your non-US status, claim the Australia-US tax treaty rate of 15% on dividends (vs 30% default), and correctly apply your Foreign Income Tax Offset (FITO). ${UPDATED_LABEL}.`,
  openGraph: {
    title: `W-8BEN Form for Australians (${CURRENT_YEAR})`,
    description:
      "How to complete the W-8BEN, claim the 15% treaty rate on US dividends, and offset the withholding against your Australian tax. Step-by-step with worked examples.",
    url: `${SITE_URL}/global-investing/tax/w-8ben`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("W-8BEN for Australians")}&sub=${encodeURIComponent("US Withholding Tax · Treaty Rate 15% · FITO · " + CURRENT_YEAR)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/global-investing/tax/w-8ben` },
};

const FAQS: FaqItem[] = [
  {
    q: "What is the W-8BEN form and who needs to complete it?",
    a: "The W-8BEN (Certificate of Foreign Status of Beneficial Owner for United States Tax Withholding and Reporting) is an IRS form that non-US persons submit to their US broker or financial institution to certify they are not a US taxpayer. Any Australian resident who holds US shares, US-listed ETFs, or receives any US-source income through a foreign broker must complete a W-8BEN. Without it, the broker is required by US law to withhold 30% of all US-source dividends and certain other payments. With a valid W-8BEN, Australian residents qualify for the reduced 15% rate under Article 10 of the Australia-US Double Tax Treaty.",
  },
  {
    q: "How much withholding tax do Australians pay on US dividends?",
    a: "With a valid W-8BEN: 15% on US dividends (the Australia-US tax treaty rate under Article 10). Without a W-8BEN — or with an expired one: 30% (the default US withholding rate applied to non-residents who have not claimed a treaty). US interest income: 0% withholding for Australian residents who have lodged a W-8BEN. US capital gains: generally 0% US withholding — gains realised by non-US persons on the sale of US shares are not subject to US withholding tax (unless the shares qualify as a US real property interest, which ordinary listed shares do not).",
  },
  {
    q: "How do I get credit for US withholding tax in my Australian return?",
    a: "US withholding tax you have paid qualifies as a Foreign Income Tax Offset (FITO) in your Australian income tax return. You must declare the GROSS dividend (before withholding) as assessable income — not just the net amount received. The FITO then directly reduces your Australian tax liability dollar-for-dollar, up to the Australian tax payable on that income. Example: $1,000 gross dividend, $150 US withholding, Australian marginal rate 34.5% (32.5% + 2% Medicare). Australian tax on $1,000 = $345. FITO of $150 offsets that, leaving $195 net Australian tax payable. Total effective tax = $195 + $150 = $345 (34.5% MTR). The 15% is not double-taxed — it is credited.",
  },
  {
    q: "How long is a W-8BEN valid for?",
    a: "A W-8BEN is valid for three calendar years from the date of signature, expiring on 31 December of the third year. For example, a form signed on 15 March 2024 remains valid until 31 December 2026. After expiry, most brokers will continue sending renewal reminders, but if you fail to re-submit, they revert to withholding 30% on US dividends until a new valid form is on file. Set a calendar reminder roughly 60 days before expiry to allow time for your broker to process the updated form.",
  },
  {
    q: "Do I need a W-8BEN if I only invest in Australian ETFs that hold US shares?",
    a: "Generally no — not directly. When you buy an ASX-listed ETF such as IVV or VGS, you are buying units in an Australian-domiciled fund. The fund itself handles any US tax obligations at the fund level. Distributions you receive are classified under Australian tax rules, not US withholding rules, and you do not need to complete a W-8BEN. However, if you open a foreign broker account and buy US-listed ETFs (e.g. VOO or QQQ directly on NYSE), then yes — you need a W-8BEN for that account.",
  },
];

const WITHHOLDING_TABLE = [
  {
    income: "US dividends — no W-8BEN",
    rate: "30%",
    note: "Default US withholding rate",
    highlight: true,
  },
  {
    income: "US dividends — with W-8BEN (Australian resident)",
    rate: "15%",
    note: "Treaty rate, Article 10",
    highlight: false,
  },
  {
    income: "US interest payments — with W-8BEN",
    rate: "0%",
    note: "Treaty exemption for Australian residents",
    highlight: false,
  },
  {
    income: "US capital gains on listed shares",
    rate: "0%",
    note: "Not US-taxable for non-US persons (listed shares)",
    highlight: false,
  },
  {
    income: "US capital gains — US Real Property Interest",
    rate: "15% / 21%",
    note: "FIRPTA applies — different rules, seek specialist advice",
    highlight: false,
  },
];

const COMMON_MISTAKES = [
  {
    mistake: "Using a PO Box for the residential address",
    consequence:
      "The IRS requires a physical residential address, not a post office box. Brokers may reject the form or treat you as not eligible for the treaty rate.",
    fix: "Enter your actual Australian street address. Use the mailing address field separately if needed.",
  },
  {
    mistake: "Skipping the treaty benefits section",
    consequence:
      "If you do not complete Part II (Claim of Tax Treaty Benefits), the broker applies the 30% default rate even if your name and address are correct.",
    fix: "Complete Part II: tick the treaty resident box, specify 'Dividends' as the income type, enter '15' as the rate, and cite Article 10.",
  },
  {
    mistake: "Forgetting to renew every three years",
    consequence:
      "Once the form expires, the broker reverts to 30% withholding on all US dividends until a new form is on file.",
    fix: "Set a calendar reminder 60 days before the expiry date (31 December of the third year after signing).",
  },
  {
    mistake: "Reporting only the net dividend received in your tax return",
    consequence:
      "The ATO requires you to declare the GROSS dividend (before US withholding). Reporting only the net amount you received understates your income and the FITO you can claim.",
    fix: "Declare the gross dividend as income. Separately claim the FITO using your broker's annual tax statement which shows gross dividends and foreign tax paid.",
  },
  {
    mistake: "Submitting a W-8BEN when you are a US person",
    consequence:
      "US citizens and green card holders are required to submit a W-9 (or other FATCA forms). Submitting a W-8BEN as a US person is incorrect and can trigger IRS penalties.",
    fix: "If you hold or have ever held US citizenship, a green card, or a substantial presence in the US, consult a US-qualified tax adviser before completing any IRS form.",
  },
];

export default function W8BENPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Global Investing", url: `${SITE_URL}/global-investing` },
    { name: "Tax", url: `${SITE_URL}/global-investing/tax` },
    { name: "W-8BEN" },
  ]);

  const faqSchema = faqJsonLd(FAQS);

  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-600 mb-5 flex items-center gap-1.5">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/global-investing" className="hover:text-slate-900">Global Investing</Link>
            <span className="text-slate-300">/</span>
            <Link href="/global-investing/tax" className="hover:text-slate-900">Tax</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">W-8BEN</span>
          </nav>

          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 mb-4">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                {UPDATED_LABEL} — IRS Form W-8BEN
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
                W-8BEN form{" "}
                <span className="text-amber-500">for Australian investors</span>
              </h1>
              <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-5">
                The W-8BEN certifies that you are a non-US person. Without it, your US broker
                withholds{" "}
                <span className="font-semibold text-slate-800">30%</span> of every US dividend.
                With it, Australian residents pay{" "}
                <span className="font-semibold text-slate-800">15%</span> under the Australia-US
                Double Tax Treaty. Here is exactly how to complete it, where to submit it, and how
                to claim the offset in your Australian tax return.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="#how-to-complete"
                  className="inline-block px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-xs transition-colors shadow-lg shadow-amber-500/20"
                >
                  How to complete the form &rarr;
                </Link>
                <Link
                  href="#fito"
                  className="inline-block px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                >
                  FITO worked example &rarr;
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <div className="text-xl md:text-2xl font-extrabold text-red-600">30%</div>
                <div className="text-[0.65rem] font-bold text-slate-900 mt-0.5">Without W-8BEN</div>
                <div className="text-[0.6rem] text-slate-500 mt-0.5">Default US withholding on dividends</div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                <div className="text-xl md:text-2xl font-extrabold text-emerald-600">15%</div>
                <div className="text-[0.65rem] font-bold text-slate-900 mt-0.5">With W-8BEN</div>
                <div className="text-[0.6rem] text-slate-500 mt-0.5">Australia-US treaty rate (Article 10)</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="text-xl md:text-2xl font-extrabold text-slate-700">3 yrs</div>
                <div className="text-[0.65rem] font-bold text-slate-900 mt-0.5">Validity period</div>
                <div className="text-[0.6rem] text-slate-500 mt-0.5">Renew before 31 Dec of third year</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div className="text-xl md:text-2xl font-extrabold text-amber-600">FITO</div>
                <div className="text-[0.65rem] font-bold text-slate-900 mt-0.5">Tax credit</div>
                <div className="text-[0.6rem] text-slate-500 mt-0.5">Withheld tax offsets AU liability</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── What is the W-8BEN ────────────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom max-w-4xl">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">Overview</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-4">
            What is the W-8BEN?
          </h2>
          <div className="prose prose-sm max-w-none text-slate-700 space-y-4">
            <p>
              The <strong>W-8BEN</strong> (Certificate of Foreign Status of Beneficial Owner for United
              States Tax Withholding and Reporting) is an Internal Revenue Service (IRS) form. It does
              one thing: it tells your US broker that you are <em>not</em> a US person and are
              therefore subject to different tax treatment on US-source income.
            </p>
            <p>
              You do <strong>not</strong> submit the form to the IRS directly. You submit it to your
              broker or financial institution (IBKR, Stake, Superhero, SelfWealth, CMC Markets, Tiger
              AU, moomoo AU, eToro, CommSec International). The broker holds it on file and uses it to
              determine the correct withholding rate on every US dividend payment you receive.
            </p>
            <p>
              By completing Part II of the form (Claim of Tax Treaty Benefits), you invoke the
              Australia-US Income Tax Treaty, which reduces the withholding rate on dividends from
              the 30% default to <strong>15%</strong> under Article 10 of that treaty. This is a
              legally binding entitlement for Australian tax residents — not a discretionary concession.
            </p>
            <p>
              The form is valid for three years. After expiry, your broker defaults to 30% withholding
              on US dividends until a new W-8BEN is on file.
            </p>
          </div>
        </div>
      </section>

      {/* ── Withholding tax table ─────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom max-w-4xl">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">
            Why it matters
          </p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
            US withholding rates for Australian investors
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            The withholding rates below apply at the point the US payer (company or fund) makes the
            payment. They are deducted before the funds reach your brokerage account.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm" aria-label="US withholding tax rates for Australian investors by income type">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-slate-700">Income type</th>
                  <th scope="col" className="text-center px-4 py-3 text-xs font-bold text-slate-700">Rate</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-slate-700">Notes</th>
                </tr>
              </thead>
              <tbody>
                {WITHHOLDING_TABLE.map((row) => (
                  <tr
                    key={row.income}
                    className={`border-b border-slate-100 last:border-0 ${row.highlight ? "bg-red-50" : ""}`}
                  >
                    <td className="px-4 py-3 text-xs text-slate-800 font-medium">{row.income}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          row.highlight
                            ? "bg-red-100 text-red-700"
                            : row.rate === "0%"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {row.rate}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Capital gains on ordinary US-listed shares are generally not subject to US withholding for
            non-US persons. US estate tax is a separate matter — see the note below.
          </p>
        </div>
      </section>

      {/* ── How to complete the form ──────────────────────────────────── */}
      <section id="how-to-complete" className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom max-w-4xl">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">
            Step by step
          </p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-6">
            How to complete the W-8BEN (field by field)
          </h2>

          <div className="space-y-4">
            {/* Part I */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="bg-slate-100 px-5 py-3 border-b border-slate-200">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Part I — Identification of beneficial owner
                </p>
              </div>
              <div className="divide-y divide-slate-100">
                <div className="px-5 py-4 grid sm:grid-cols-3 gap-3">
                  <div>
                    <p className="text-[0.65rem] font-bold text-amber-600 uppercase tracking-wider mb-0.5">Line 1 — Name</p>
                    <p className="text-xs text-slate-800 font-semibold">Your legal full name</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-slate-600">
                      Enter your full legal name exactly as it appears on your government-issued ID.
                      This must match the name on your brokerage account.
                    </p>
                  </div>
                </div>
                <div className="px-5 py-4 grid sm:grid-cols-3 gap-3">
                  <div>
                    <p className="text-[0.65rem] font-bold text-amber-600 uppercase tracking-wider mb-0.5">Line 2 — Country of citizenship</p>
                    <p className="text-xs text-slate-800 font-semibold">Australia</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-slate-600">
                      Enter &quot;Australia&quot;. This is your country of citizenship, not your tax
                      residency. If you hold dual citizenship with a third country (not the US),
                      Australia is still the correct entry here as long as you are an Australian
                      tax resident.
                    </p>
                  </div>
                </div>
                <div className="px-5 py-4 grid sm:grid-cols-3 gap-3">
                  <div>
                    <p className="text-[0.65rem] font-bold text-amber-600 uppercase tracking-wider mb-0.5">Lines 3-4 — Permanent address</p>
                    <p className="text-xs text-slate-800 font-semibold">Australian residential address</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-slate-600">
                      Enter your current Australian residential address — the street address where
                      you physically live. <strong>Do not use a PO Box</strong> — brokers and the
                      IRS require a physical address for this field. If your mailing address differs,
                      use Line 5 for that.
                    </p>
                  </div>
                </div>
                <div className="px-5 py-4 grid sm:grid-cols-3 gap-3">
                  <div>
                    <p className="text-[0.65rem] font-bold text-amber-600 uppercase tracking-wider mb-0.5">Line 5 — Mailing address</p>
                    <p className="text-xs text-slate-800 font-semibold">Only if different from Line 3</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-slate-600">
                      Leave blank if the same as your residential address. If you use a PO Box for
                      correspondence, enter it here — but the residential address in Lines 3-4 must
                      still be a physical street address.
                    </p>
                  </div>
                </div>
                <div className="px-5 py-4 grid sm:grid-cols-3 gap-3">
                  <div>
                    <p className="text-[0.65rem] font-bold text-amber-600 uppercase tracking-wider mb-0.5">Line 6 — US TIN</p>
                    <p className="text-xs text-slate-800 font-semibold">Leave blank (most Australians)</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-slate-600">
                      The US Taxpayer Identification Number (SSN or ITIN) is only required if you
                      have one. Most Australian residents do not have a US SSN or ITIN — leave this
                      blank. If you do have a US ITIN, enter it here.
                    </p>
                  </div>
                </div>
                <div className="px-5 py-4 grid sm:grid-cols-3 gap-3">
                  <div>
                    <p className="text-[0.65rem] font-bold text-amber-600 uppercase tracking-wider mb-0.5">Line 7 — Foreign TIN</p>
                    <p className="text-xs text-slate-800 font-semibold">Your Australian TFN</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-slate-600">
                      Enter your Australian Tax File Number (TFN). This is your &quot;foreign&quot;
                      taxpayer identification number from the US perspective. Some brokers require
                      this; others do not. If your broker asks for a foreign TIN, enter your TFN
                      here. If you do not have a TFN, enter the reason (e.g. &quot;applied for&quot;).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Part II */}
            <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden">
              <div className="bg-amber-50 px-5 py-3 border-b border-amber-200">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                  Part II — Claim of tax treaty benefits (critical — do not skip)
                </p>
              </div>
              <div className="divide-y divide-slate-100">
                <div className="px-5 py-4 grid sm:grid-cols-3 gap-3">
                  <div>
                    <p className="text-[0.65rem] font-bold text-amber-600 uppercase tracking-wider mb-0.5">Line 9 — Treaty country</p>
                    <p className="text-xs text-slate-800 font-semibold">Australia</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-slate-600">
                      Tick the box confirming &quot;The beneficial owner is a resident of
                      <strong> Australia</strong> within the meaning of the income tax treaty
                      between the United States and Australia.&quot; Enter &quot;Australia&quot;
                      as the treaty country.
                    </p>
                  </div>
                </div>
                <div className="px-5 py-4 grid sm:grid-cols-3 gap-3">
                  <div>
                    <p className="text-[0.65rem] font-bold text-amber-600 uppercase tracking-wider mb-0.5">Line 10 — Type of income</p>
                    <p className="text-xs text-slate-800 font-semibold">Dividends</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-slate-600">
                      Enter &apos;Dividends&apos; as the type of income for which you are claiming
                      treaty benefits. This is the primary income type for share investors.
                    </p>
                  </div>
                </div>
                <div className="px-5 py-4 grid sm:grid-cols-3 gap-3">
                  <div>
                    <p className="text-[0.65rem] font-bold text-amber-600 uppercase tracking-wider mb-0.5">Withholding rate</p>
                    <p className="text-xs text-slate-800 font-semibold">15%</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-slate-600">
                      Enter <strong>15</strong> as the withholding rate. This is the rate specified
                      in Article 10 of the Australia-US Double Tax Treaty for dividends paid to an
                      individual Australian resident who is the beneficial owner.
                    </p>
                  </div>
                </div>
                <div className="px-5 py-4 grid sm:grid-cols-3 gap-3">
                  <div>
                    <p className="text-[0.65rem] font-bold text-amber-600 uppercase tracking-wider mb-0.5">Treaty article</p>
                    <p className="text-xs text-slate-800 font-semibold">Article 10</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-slate-600">
                      Enter <strong>Article 10</strong> as the treaty article. Article 10 of the
                      Convention Between the Government of Australia and the Government of the
                      United States of America for the Avoidance of Double Taxation covers
                      dividend withholding rates.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Signature */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="bg-slate-100 px-5 py-3 border-b border-slate-200">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Part III — Certification and signature
                </p>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Sign and date the form. By signing, you certify under penalty of perjury that the
                  information is true, correct, and complete, and that you are not a US citizen,
                  green card holder, or other US person. Most brokers accept an electronic signature
                  through their online portal. The form does not need to be notarised.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Where to submit ───────────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom max-w-4xl">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">Submission</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-4">
            Where to submit the W-8BEN
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            The W-8BEN is submitted to your <strong>broker</strong>, not to the IRS. You never file
            it with any government agency directly. Most Australian-friendly brokers accept the form
            electronically as part of their account-opening flow or via a dedicated section in their
            online portal.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-emerald-800 mb-3">Brokers with electronic W-8BEN submission</p>
              <ul className="space-y-1.5">
                {[
                  "Interactive Brokers (IBKR) — in-account tax forms section",
                  "Stake — part of onboarding flow",
                  "Superhero — via account settings",
                  "CMC Markets — tax documentation section",
                  "Tiger AU — part of account setup",
                  "moomoo AU — account settings",
                  "CommSec International — guided onboarding",
                ].map((b) => (
                  <li key={b} className="flex items-start gap-2 text-xs text-slate-700">
                    <span className="text-emerald-500 font-bold mt-0.5">&#x2713;</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-slate-700 mb-3">Key submission rules</p>
              <ul className="space-y-2">
                {[
                  "Submit before your first dividend payment to ensure the treaty rate is applied from day one.",
                  "Do NOT send to the IRS — the broker holds it on file.",
                  "Some brokers accept a PDF upload if the portal form is unavailable. Use the current IRS form version (check irs.gov for the latest revision).",
                  "Confirm receipt with your broker — check your account settings or email confirmation.",
                ].map((rule) => (
                  <li key={rule} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                    <span className="text-amber-500 font-bold mt-0.5">&#x2022;</span>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Validity and renewal ──────────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom max-w-4xl">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">Renewal</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-4">
            Validity period — 3 years, then renew
          </h2>
          <div className="bg-white border border-amber-200 rounded-2xl p-5 mb-6">
            <p className="text-sm text-slate-800 leading-relaxed">
              A W-8BEN is valid from the date of signature until{" "}
              <strong>31 December of the third calendar year</strong> following the year it was
              signed. A form signed on 10 June 2024 expires on 31 December 2026. After that date,
              the broker reverts to the 30% default withholding rate on all US dividends until a
              new, valid form is submitted and processed.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                step: "1",
                title: "Find your expiry date",
                body: "Check when you originally signed the form. Expiry = 31 December of the third year after your signing year. Example: signed 2024 → expires 31 Dec 2026.",
              },
              {
                step: "2",
                title: "Set a calendar reminder",
                body: "Set a reminder 60 days before expiry (around 1 November). This gives enough time to submit a new form and have it processed before year-end.",
              },
              {
                step: "3",
                title: "Submit the new form",
                body: "Log into your broker&apos;s portal and re-submit the W-8BEN with updated information and a new signature. The process is the same as the original submission.",
              },
            ].map((s) => (
              <div key={s.step} className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-900 font-bold text-xs flex items-center justify-center mb-3">
                  {s.step}
                </div>
                <p className="text-xs font-bold text-slate-900 mb-1">{s.title}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Australian tax treatment + FITO ──────────────────────────── */}
      <section id="fito" className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom max-w-4xl">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">
            Australian tax
          </p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-4">
            Australian tax treatment and Foreign Income Tax Offset (FITO)
          </h2>
          <div className="prose prose-sm max-w-none text-slate-700 space-y-4 mb-8">
            <p>
              The W-8BEN reduces US withholding — but it does not eliminate your Australian tax
              obligations on that income. As an Australian tax resident, your worldwide income is
              assessable in Australia, including US dividends. The two tax systems interact through
              the <strong>Foreign Income Tax Offset (FITO)</strong> mechanism.
            </p>
            <p>
              The key rule: you must declare the <strong>gross dividend</strong> (the full amount
              before US withholding) as assessable income in your Australian return. The 15% US
              withholding you have already paid then becomes a FITO, which offsets your Australian
              tax liability dollar-for-dollar — up to the Australian tax payable on that income.
              You do not pay tax twice; the US withholding is credited against the Australian tax.
            </p>
          </div>

          {/* FITO worked example */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden mb-6">
            <div className="bg-amber-100 border-b border-amber-200 px-5 py-3">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                FITO worked example — $1,000 gross US dividend
              </p>
            </div>
            <div className="px-5 py-5">
              <p className="text-xs text-slate-600 mb-4">
                Assumptions: Australian resident, 32.5% marginal tax rate, 2% Medicare levy (34.5%
                combined), valid W-8BEN lodged with broker.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs" aria-label="FITO worked example — $1,000 gross US dividend tax calculation">
                  <tbody className="divide-y divide-amber-200">
                    {[
                      { label: "Gross US dividend declared", value: "$1,000", note: "Declare this in your AU return — not the net amount" },
                      { label: "US withholding at 15% (W-8BEN rate)", value: "–$150", note: "Deducted by broker before you receive funds" },
                      { label: "Amount received in your account", value: "$850", note: "Cash actually received" },
                      { label: "Australian tax on $1,000 at 34.5% MTR", value: "$345", note: "Before any offset" },
                      { label: "Foreign Income Tax Offset (FITO)", value: "–$150", note: "The US withholding credited against AU tax" },
                      { label: "Net Australian tax payable", value: "$195", note: "After FITO is applied" },
                      { label: "Total tax paid (US + AU)", value: "$345", note: "= 34.5% of gross — no double taxation" },
                    ].map((row) => (
                      <tr key={row.label}>
                        <td className="py-2 pr-4 text-slate-700 font-medium w-64">{row.label}</td>
                        <td className="py-2 pr-4 font-bold text-slate-900 w-20 text-right">{row.value}</td>
                        <td className="py-2 text-slate-500 italic">{row.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500 mt-4">
                The FITO cannot exceed the Australian tax otherwise payable on the foreign income. If
                your Australian tax on the dividend would be less than $150 (e.g. you are in the 19%
                bracket), the FITO is capped at the Australian tax and any excess is not refundable.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <p className="text-xs font-bold text-slate-800 mb-2">How to claim the FITO in your return</p>
            <ol className="space-y-2">
              {[
                "Your broker's annual tax statement lists gross dividends and foreign tax withheld. Download this from your broker portal at year-end.",
                "In your Australian tax return (myTax or tax agent software), enter the gross dividend amount as foreign income.",
                "Enter the US tax withheld as a foreign income tax offset in the FITO section.",
                "The ATO&apos;s system automatically caps the FITO at the Australian tax payable on that income.",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-xs text-slate-600 leading-relaxed">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-900 font-bold text-[0.6rem] flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ── US estate tax note ────────────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom max-w-4xl">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-red-600 mb-1">
            Important — not covered by W-8BEN
          </p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-4">
            US estate tax — a separate risk
          </h2>
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-4">
            <p className="text-sm text-slate-800 leading-relaxed mb-3">
              The W-8BEN deals with income tax withholding during your lifetime. It does{" "}
              <strong>not</strong> protect against US estate tax. The US imposes federal estate tax
              on US-situs assets (including US shares and ETFs held directly through a foreign broker)
              owned by non-US persons at death. The exemption for non-US persons is only{" "}
              <strong>US$60,000</strong> — compared to US$13.6 million for US residents.
            </p>
            <p className="text-sm text-slate-800 leading-relaxed">
              If your US-situs assets exceed US$60,000 at death, your estate may owe up to 40%
              federal estate tax on the excess. The Australia-US Estate Tax Treaty provides a
              unified credit that can significantly reduce this liability, but it is not automatic
              and requires proper planning. AU-listed ETFs (IVV, VGS, NDQ) are{" "}
              <strong>not</strong> US-situs assets and are not exposed to this risk.
            </p>
          </div>
          <Link
            href="/global-investing/tax/us-estate-tax"
            className="inline-flex items-center gap-1 text-sm font-bold text-amber-600 hover:text-amber-700"
          >
            Full US estate tax explainer for Australians &rarr;
          </Link>
        </div>
      </section>

      {/* ── US person warning ─────────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom max-w-4xl">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">
            Special cases
          </p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-6">
            When the W-8BEN does not apply
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-white border border-red-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-red-700 mb-3">US citizens, green card holders, or US persons</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                If you are or have ever been a US citizen, hold or have held a green card, or meet the
                substantial presence test for the US, you are a &quot;US person&quot; for tax purposes
                and must not submit a W-8BEN. The correct form is a <strong>W-9</strong> (or specific
                FATCA reporting forms). Filing a W-8BEN as a US person is incorrect and can trigger
                IRS penalties. Consult a US-qualified tax adviser before completing any IRS form.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-slate-800 mb-3">CHESS vs custodial accounts</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                For CHESS-sponsored international share holdings (where you hold directly), the broker
                applies the treaty rate at the account level using your W-8BEN. For custodial accounts
                (the more common structure for foreign brokers), the custodian holds the shares on your
                behalf and applies the withholding based on your W-8BEN declaration. The W-8BEN
                process is the same in both cases, but confirm with your specific broker that they have
                your current form on file and the 15% rate is being applied.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-slate-800 mb-3">ASX-listed ETFs holding US shares (IVV, VGS)</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                If you invest in US shares <em>indirectly</em> via an ASX-listed ETF, you do not
                submit a W-8BEN. The Australian-domiciled fund handles any US tax obligations at the
                fund level. The distributions you receive are treated as Australian income. A W-8BEN
                is only needed if you open a foreign broker account and buy US-listed securities directly.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-slate-800 mb-3">Non-residents and recent migrants</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                The treaty rate of 15% is available to Australian <em>tax residents</em>. If you are
                a temporary visa holder or recently arrived in Australia, confirm your Australian tax
                residency status with a tax adviser before claiming the treaty rate. The ATO&apos;s
                residency test is fact-specific and not solely based on your visa type.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Common mistakes ───────────────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom max-w-4xl">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">
            Pitfalls
          </p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-6">
            Common W-8BEN mistakes and how to avoid them
          </h2>
          <div className="space-y-3">
            {COMMON_MISTAKES.map((item, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-start gap-3 mb-2">
                  <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 font-bold text-[0.6rem] flex items-center justify-center flex-shrink-0 mt-0.5">
                    !
                  </span>
                  <p className="text-xs font-bold text-slate-900">{item.mistake}</p>
                </div>
                <p className="text-xs text-red-700 leading-relaxed mb-2 pl-8">
                  <strong>Consequence:</strong>{" "}
                  <span>{item.consequence}</span>
                </p>
                <p className="text-xs text-emerald-700 leading-relaxed pl-8">
                  <strong>Fix:</strong>{" "}
                  <span>{item.fix}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom max-w-4xl">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">FAQ</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-6">
            Common questions about the W-8BEN
          </h2>
          <div className="space-y-2">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group bg-white border border-slate-200 rounded-2xl overflow-hidden"
              >
                <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer list-none hover:bg-slate-50 transition-colors">
                  <span className="text-sm font-semibold text-slate-900">{faq.q}</span>
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center group-open:rotate-180 transition-transform">
                    &#x2303;
                  </span>
                </summary>
                <div className="px-5 pb-5 pt-1">
                  <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Related pages ─────────────────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom max-w-4xl">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">
            Related guides
          </p>
          <h2 className="text-lg font-extrabold text-slate-900 mb-4">
            More on global investing tax
          </h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              {
                href: "/global-investing/tax/us-estate-tax",
                label: "US estate tax for Australians",
                description: "The US$60k exemption, the unified credit, and how to structure around it.",
              },
              {
                href: "/global-investing/tax",
                label: "Tax hub — global investing",
                description: "FITO, CGT on foreign shares, DTA tables, W-8BEN, QROPS transfers.",
              },
              {
                href: "/global-investing/shares/us",
                label: "Buy US shares from Australia",
                description: "Compare IBKR, Stake, Tiger, moomoo, CommSec International for US shares.",
              },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group block bg-white border border-slate-200 rounded-2xl p-5 hover:border-amber-300 hover:shadow-md transition-all"
              >
                <p className="font-bold text-sm text-slate-900 mb-1.5 group-hover:text-amber-700">
                  {link.label}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">{link.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Compliance footer ─────────────────────────────────────────── */}
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
