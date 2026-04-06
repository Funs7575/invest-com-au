import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Home & Contents Insurance Australia (${CURRENT_YEAR}) — Complete Guide`,
  description: `Building vs contents insurance, underinsurance risks, what's covered and excluded, and how to get the right sum insured. Guide for homeowners and renters. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Home & Contents Insurance Australia (${CURRENT_YEAR})`,
    description: "Building vs contents insurance, underinsurance, and what's covered — complete guide for Australian homeowners and renters.",
    url: `${SITE_URL}/insurance/home-contents`,
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/insurance/home-contents` },
};

const SECTIONS = [
  {
    heading: "Building insurance vs contents insurance — what each covers",
    body: `Home and contents insurance is actually two separate products — building insurance and contents insurance — that are often bundled together by insurers but can also be purchased separately.

**Building insurance (also called home insurance):**
Covers the physical structure of your home — the walls, roof, floors, fixed fittings, garages, sheds, and permanent fixtures like built-in wardrobes, kitchen cabinets, and bathroom fittings. It also typically covers fences, driveways, and in-ground swimming pools.

Building insurance is essential for homeowners and compulsory in many mortgage contracts. If your home is destroyed by fire, storm, or another insured event, building insurance pays to rebuild or repair the structure. Without it, a total loss could leave you with a mortgage but no home.

**Contents insurance:**
Covers your personal belongings — furniture, appliances, electronics, clothing, jewellery, artwork, and other personal property inside your home. Contents insurance pays to repair or replace these items if they're damaged, stolen, or destroyed by an insured event.

Contents insurance also typically covers accidental damage to contents within your home (under comprehensive policies), and many policies extend limited cover to items you take outside the home (portable items cover — useful for laptops, jewellery, and cameras).

**Who needs what:**
- **Owners (with mortgage):** Building insurance is usually required by your lender. Contents insurance is strongly recommended.
- **Owners (no mortgage):** Building insurance is technically optional but would be financially catastrophic to skip. Contents insurance strongly recommended.
- **Renters:** Your landlord's building insurance covers the structure — but NOT your belongings. Renters need contents insurance for their personal property.
- **Strata/apartment owners:** Body corporate typically holds building insurance for the common areas and external structure. Check what your strata covers before buying building insurance — you may only need contents plus cover for internal fittings.`,
  },
  {
    heading: "The underinsurance trap — rebuilding cost vs market value",
    body: `Underinsurance is the most common and most costly mistake Australians make with home and building insurance. Research consistently shows that around 1 in 8 Australian homes are underinsured — meaning the sum insured is significantly less than the true cost of rebuilding.

**The critical distinction: rebuilding cost ≠ market value**

Your home's market value includes the land, location, and current market conditions. Your insurance sum insured should reflect only the **rebuilding cost** — the cost to demolish the remains and rebuild the structure from scratch.

Rebuilding costs are often surprisingly high:
- Demolition and debris removal
- Architect and engineering fees
- Council approval costs
- Construction labour (which has risen sharply since COVID)
- Materials at current prices
- Upgrades required to meet current building codes (older homes often need compliance upgrades when rebuilt)

**Example of the underinsurance trap:**
A home with a market value of $1,000,000 (with land worth $400,000) might have a rebuilding cost of $700,000–$900,000. If the owner insures for $600,000 (a "safe margin below market value"), they'd be underinsured by $100,000–$300,000 and face a major shortfall after a total loss.

**How to calculate your rebuilding cost:**
1. Use your insurer's online building cost calculator (most insurers provide one)
2. Get a quote from a local builder for your home type and size
3. Use a quantity surveyor for high-value or complex properties
4. Review your sum insured every 2–3 years or after renovations

**Inflation indexing:** Many policies include an automatic inflation adjustment each year — but this may not keep pace with rapid construction cost increases. Review your sum insured annually, not just at renewal.`,
  },
  {
    heading: "What's typically covered and what's excluded",
    body: `Home and contents policies vary, but most comprehensive policies cover a similar range of events. Understanding inclusions and exclusions before you need to claim is essential.

**Typically covered (standard inclusions):**
- Fire and smoke damage
- Storm, lightning, and hail
- Theft and attempted theft
- Vandalism and malicious damage
- Burst or leaking pipes (sudden and accidental)
- Flood (increasingly standard, but check carefully)
- Earthquake
- Falling trees (onto your home)
- Impact damage (vehicle or aircraft hitting your home)
- Glass breakage

**Common exclusions — read the PDS carefully:**
- **Gradual damage and wear and tear:** If a pipe has been slowly leaking for months and causes damage, this is typically excluded — only sudden, unexpected damage is covered.
- **Mould:** Often excluded, particularly if it results from gradual moisture build-up rather than a sudden event.
- **Pest damage:** Termite damage, rodent damage, and other pest-related damage is almost universally excluded.
- **Structural defects:** Pre-existing structural issues and building defects are excluded.
- **Flood vs storm surge:** Some policies distinguish between flood (rising water from rivers/creeks) and storm surge (sea water). Check which applies to your area.

**Optional add-ons worth considering:**
- **Accidental damage:** Covers accidents inside your home (e.g., spilling wine on the carpet, dropping your TV). Standard policies typically don't cover this.
- **Portable items (valuables):** Extends contents cover to items you take away from home — jewellery, laptops, cameras, sporting equipment.
- **Motor burnout:** Covers electrical motor damage to appliances like fridges and washing machines.`,
  },
  {
    heading: "Contents insurance for renters — the overlooked necessity",
    body: `An estimated 40% of Australian renters have no contents insurance at all — leaving their personal belongings completely unprotected against theft, fire, or damage.

**The common misconception:** Many renters assume their landlord's building insurance covers their belongings. It does not. The landlord's policy covers the building structure. If there's a break-in and your laptop, TV, and jewellery are stolen, the landlord's insurer won't pay a cent to you.

**What renters' contents insurance covers:**
- All personal belongings in your rental property
- Theft and break-in
- Accidental damage to your contents (comprehensive policies)
- Damage to the landlord's fittings that you accidentally cause (liability cover)
- Legal liability if a visitor is injured in your home

**Renters' liability coverage — often overlooked:**
Many renters' contents policies include significant liability coverage (e.g., $10–$20 million). This covers you if a guest slips and injures themselves in your home, or if you accidentally start a fire that damages the landlord's property or neighbouring units.

**Cost:** Renters' contents insurance is typically inexpensive — $200–$600/year depending on your belongings' value and location. For someone with a laptop, phone, furniture, and general household goods worth $20,000+, this is very cost-effective protection.

**Specific high-value items:** Standard policies limit cover for individual high-value items (jewellery, art, collectibles). If you own items worth more than $2,000–$3,000 individually, list them as specified items on your policy for full cover.`,
  },
  {
    heading: "Factors affecting your home insurance premiums",
    body: `Home and contents insurance premiums vary significantly based on factors within and outside your control. Understanding these factors helps you manage costs while maintaining adequate protection.

**Location risk — the biggest factor:**
- Properties in flood-prone areas, bushfire zones, or cyclone regions attract significantly higher premiums
- Coastal properties may pay more for storm and cyclone risk
- Some areas are now facing availability problems — insurers in very high-risk flood or fire zones are increasing premiums dramatically or declining to cover certain properties
- The ICA (Insurance Council of Australia) provides a risk map by address

**Age and construction of the building:**
- Older homes with timber frames cost more to insure than modern brick construction
- Newer homes generally attract lower premiums due to current building standards
- Roof type matters: metal or tile roofs are lower risk than some older materials

**Security measures — potential discounts:**
- Deadbolts and window locks (standard requirement for theft coverage)
- Monitored alarm system: typically earns a premium discount
- Security cameras: may attract discounts with some insurers
- Being part of a Neighbourhood Watch area

**Claims history:**
- Multiple recent claims can increase premiums significantly
- Some insurers offer a no-claims discount or protect it as an add-on
- Insurers may decline to renew if you've had frequent claims

**Your sum insured:**
Higher sum insured means higher premium. This is the wrong place to cut costs — the sum insured should accurately reflect rebuilding costs, and you should compare insurers rather than reducing cover to lower premiums.

**Excess choices:**
Choosing a higher excess (e.g., $2,000 instead of $500) meaningfully reduces premiums. This can make sense if you have savings to self-insure small claims and want to focus insurance on catastrophic events.`,
  },
];

const FAQS = [
  {
    question: "How do I work out how much building insurance I need?",
    answer: "Use your insurer's online building cost calculator, which asks about your home's size, age, construction type, and features to estimate a rebuilding cost. For more accuracy, ask a local builder or quantity surveyor for a rebuilding estimate — particularly for heritage homes, large homes, or unusual construction. Your sum insured should reflect the cost to demolish and fully rebuild your home, NOT the current market value (which includes land). Review and update your sum insured every year, especially after renovations or in periods of high construction cost inflation.",
  },
  {
    question: "Am I covered for flood damage?",
    answer: "Flood cover has historically been an area of confusion in Australian insurance. Since 2012, most insurers include flood cover by default, but the definition of 'flood' matters — some policies distinguish between 'storm surge' (from the sea), 'flash flood' (rapid surface water runoff from storms), and 'riverine flood' (rising water levels from rivers and creeks). Read your Product Disclosure Statement carefully, or ask your insurer specifically whether your postcode is flood-rated and what types of flooding are covered. Properties in declared flood-prone zones pay significantly higher premiums.",
  },
  {
    question: "What happens if I'm underinsured when I make a claim?",
    answer: "Most home insurance policies include an 'underinsurance' or 'average' clause. If you're insured for significantly less than the rebuilding cost and you make a claim, the insurer may apply proportional reduction — paying only a fraction of your claim in proportion to how underinsured you are. For example, if your home would cost $800,000 to rebuild but you're insured for $600,000 (75% of the rebuilding cost), the insurer might only pay 75% of your claim for a partial loss. Always aim to insure for the full rebuilding cost.",
  },
  {
    question: "Does building insurance cover accidental damage?",
    answer: "Standard building policies typically do NOT cover accidental damage — they cover specific insured events like fire, storm, theft, and burst pipes. Accidental damage to your building (e.g., accidentally cracking a bathroom tile, spilling paint on a floor) usually requires you to add an 'accidental damage' rider to your policy. Check your policy carefully if this cover matters to you. Comprehensive policies for contents sometimes include accidental damage as standard — building policies less commonly do.",
  },
  {
    question: "Can I claim home insurance if my fence blows down?",
    answer: "Fences are typically covered under building insurance as part of the insured property. If your fence is damaged by an insured event — storm, falling tree, vehicle impact — you can claim. However, gradual deterioration, wear and tear, and rotting timber are excluded. There's also the question of shared boundary fences — these may be shared with your neighbour, and insurance responsibilities can be complex. Check whether the fence damage exceeds your excess before claiming, as claiming for a small repair can affect your no-claims bonus and future premiums.",
  },
];

export default function HomeContentsInsurancePage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Insurance", url: `${SITE_URL}/insurance` },
    { name: "Home & Contents Insurance" },
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* Hero */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <Link href="/insurance" className="hover:text-slate-900">Insurance</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Home &amp; Contents Insurance</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              Home &amp; Contents · {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              Home &amp; Contents Insurance Australia{" "}
              <span className="text-amber-600">({CURRENT_YEAR})</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              1 in 8 Australian homes is underinsured. We explain the difference between building and contents cover,
              how to avoid the underinsurance trap, and what renters need to know.
            </p>
          </div>
        </div>
      </section>

      {/* Callouts */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-green-200 p-5">
              <p className="text-xs font-bold text-green-800 uppercase tracking-wide mb-1">Underinsurance Rate</p>
              <p className="text-xl font-black text-green-700">1 in 8</p>
              <p className="text-xs text-slate-600 mt-1">Around 1 in 8 Australian homes is significantly underinsured relative to true rebuilding costs</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Two Separate Products</p>
              <p className="text-xl font-black text-slate-900">Building + Contents</p>
              <p className="text-xs text-slate-600 mt-1">Building and contents are separate policies — renters need contents insurance even though they don't own the building</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Key Distinction</p>
              <p className="text-xl font-black text-slate-900">Rebuild ≠ Market Value</p>
              <p className="text-xs text-slate-600 mt-1">Sum insured should equal rebuilding cost — not market value, which includes land you already own</p>
            </div>
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="py-10 md:py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Home Insurance Guide" title="Building & Contents Insurance Explained" />
          <div className="mt-8 space-y-10">
            {SECTIONS.map((sec) => (
              <div key={sec.heading}>
                <h2 className="text-lg font-extrabold text-slate-900 mb-3">{sec.heading}</h2>
                <div className="text-sm text-slate-600 leading-relaxed space-y-3">
                  {sec.body.split("\n\n").map((para, i) => (
                    <p key={i} className="whitespace-pre-line">{para}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-10 md:py-12">
        <div className="container-custom max-w-2xl">
          <SectionHeading eyebrow="FAQ" title="Home & Contents Insurance Questions" />
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

      {/* CTA */}
      <section className="py-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container-custom text-center max-w-xl">
          <h2 className="text-xl font-extrabold mb-3">Make sure you're not underinsured</h2>
          <p className="text-sm text-slate-300 mb-6">An insurance broker can compare home and contents policies and help you set the right sum insured for your property.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/best/insurance-brokers" className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-colors">
              Find an Insurance Broker →
            </Link>
            <Link href="/insurance" className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm rounded-xl transition-colors">
              All Insurance Guides →
            </Link>
          </div>
        </div>
      </section>

      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING} Policy inclusions, exclusions, and premium factors vary significantly between insurers. Always read the Product Disclosure Statement before purchasing home or contents insurance.</p>
        </div>
      </section>
    </div>
  );
}
