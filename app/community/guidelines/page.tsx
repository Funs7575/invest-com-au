import Link from "next/link";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING, REGULATORY_NOTE } from "@/lib/compliance";

export const metadata = {
  title: "Community Guidelines",
  description:
    "The rules of the Invest.com.au community forum: keep discussion general, no personal financial advice, no promotions, how moderation and reporting work.",
  alternates: { canonical: "/community/guidelines" },
};

const RULES: Array<{ heading: string; body: string[] }> = [
  {
    heading: "1. Keep it general — never personal advice",
    body: [
      "Nobody here — including verified advisers — can tell you what YOU should do with YOUR money through a forum post. Frame questions generally: \"How do people compare ETF fees?\" works; \"Should I buy VAS with my $50k?\" doesn't and may be removed.",
      "Verified advisers who reply are sharing general information only. If you want advice about your situation, book a consultation through their profile or use the adviser directory.",
    ],
  },
  {
    heading: "2. No buy/sell calls, price predictions, or guaranteed returns",
    body: [
      "Posts that tip specific securities (\"XYZ will hit $40\", \"get in before the run\"), promise returns, or use \"guaranteed / risk-free / can't lose\" language are removed automatically. This isn't bureaucracy — ramping and return promises are how people get hurt, and Australian law treats them seriously.",
    ],
  },
  {
    heading: "3. No promotions, referral codes, or affiliate links",
    body: [
      "The forum is for discussion, not distribution. Referral codes, sign-up links, Telegram/WhatsApp group invitations, and promotion dressed up as a question are removed and repeat offenders lose posting access.",
    ],
  },
  {
    heading: "4. Anonymity is for honesty, not mischief",
    body: [
      "Investment Confessions and anonymous posts hide your name from other readers — moderators can still see who posted, and the rules above apply unchanged.",
    ],
  },
  {
    heading: "5. Be straight with each other",
    body: [
      "Share real experience, disclose conflicts (e.g. you work for a platform you're praising), disagree with the idea rather than the person, and don't present opinion as fact.",
    ],
  },
  {
    heading: "How moderation works",
    body: [
      "Every thread and reply passes an automated screen before publishing. Clean posts go live immediately; borderline posts are held for a human moderator (usually a few hours); clear violations are declined at submission.",
      "Anyone can report a thread or reply — reports go straight to the moderation queue. Moderators can remove content, lock threads, and restrict accounts that repeatedly break the rules.",
    ],
  },
];

export default function CommunityGuidelinesPage() {
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Community", url: absoluteUrl("/community") },
    { name: "Guidelines" },
  ]);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white py-12">
        <div className="container-custom max-w-3xl text-center">
          <h1 className="text-3xl font-extrabold mb-3">Community Guidelines</h1>
          <p className="text-slate-300 text-sm max-w-xl mx-auto">
            Short version: keep it general, keep it honest, and remember nobody
            on a forum knows your full situation.
          </p>
        </div>
      </section>

      <div className="container-custom max-w-3xl py-10">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-500 mb-8">
          <Link href="/community" className="hover:text-slate-700">
            ← Back to Community
          </Link>
        </nav>

        <div className="space-y-8">
          {RULES.map((rule) => (
            <section key={rule.heading}>
              <h2 className="text-lg font-extrabold text-slate-900 mb-2">
                {rule.heading}
              </h2>
              {rule.body.map((paragraph, i) => (
                <p key={i} className="text-sm text-slate-600 leading-relaxed mb-2">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>

        <div className="mt-10 border-t border-slate-200 pt-6 space-y-3">
          <p className="text-xs text-slate-500 leading-relaxed">
            <strong>General advice warning:</strong> {GENERAL_ADVICE_WARNING}
          </p>
          <p className="text-xs text-slate-500 leading-relaxed">{REGULATORY_NOTE}</p>
        </div>
      </div>
    </div>
  );
}
