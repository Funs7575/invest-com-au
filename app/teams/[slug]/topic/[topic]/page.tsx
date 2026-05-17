import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  generateAllCombos,
  getSquadTopicData,
} from "@/lib/squad-lead-magnet";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string; topic: string }>;
}

export async function generateStaticParams() {
  const combos = await generateAllCombos();
  return combos.map((c) => ({ slug: c.team_slug, topic: c.topic_slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, topic } = await params;
  const data = await getSquadTopicData(slug, topic);
  if (!data) return { title: "Not found" };
  return {
    title: `Looking for ${data.topic.label}? Talk to ${data.team.name} | Invest.com.au`,
    description: `Verified Pro Squad ${data.team.name} specialises in ${data.topic.label}. Send a Match Request to get started.`,
    alternates: {
      canonical: absoluteUrl(`/teams/${data.team.slug}/topic/${data.topic.slug}`),
    },
  };
}

export default async function SquadTopicLeadMagnetPage({ params }: PageProps) {
  const { slug, topic } = await params;
  const data = await getSquadTopicData(slug, topic);
  if (!data) notFound();

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: data.team.name, url: absoluteUrl(`/teams/${data.team.slug}`) },
    { name: data.topic.label, url: absoluteUrl(`/teams/${data.team.slug}/topic/${data.topic.slug}`) },
  ]);

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: `${data.team.name} — ${data.topic.label}`,
    url: absoluteUrl(`/teams/${data.team.slug}/topic/${data.topic.slug}`),
    areaServed: "AU",
  };

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />

      <nav className="text-xs text-slate-500 mb-4">
        <Link href="/" className="hover:underline">Home</Link>
        <span className="mx-2">/</span>
        <Link href={`/teams/${data.team.slug}`} className="hover:underline">
          {data.team.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">{data.topic.label}</span>
      </nav>

      <header className="mb-8">
        <p className="text-[11px] uppercase tracking-widest font-bold text-amber-700 mb-2">
          Verified Pro Squad · {data.topic.label}
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-2">
          Looking for {data.topic.label}?
        </h1>
        <p className="text-lg text-slate-600">
          Talk to <strong className="text-slate-900">{data.team.name}</strong>.
        </p>
      </header>

      {/* Trust strip */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <Trust label="Verified squad" value="Yes" tone="emerald" />
        {data.outcomeScore !== null && data.outcomeScore >= 50 && (
          <Trust label="Outcome score" value={String(data.outcomeScore)} tone="amber" />
        )}
        <Trust label="Active members" value={String(data.team.member_count)} tone="slate" />
      </section>

      {/* Primary CTA */}
      <section className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 mb-8">
        <h2 className="text-xl font-extrabold mb-2">
          Get matched with {data.team.name} in 60 seconds
        </h2>
        <p className="text-sm text-slate-300 mb-4">
          Tell us about your goal. We&apos;ll pre-stamp your Match Request so
          this squad sees it first.
        </p>
        <Link
          href={`/briefs/new?intent=${data.topic.slug}&team_slug=${data.team.slug}&utm_source=team_lead_magnet&utm_campaign=${data.topic.slug}`}
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm px-5 py-3 rounded-xl"
        >
          Send Match Request →
        </Link>
      </section>

      {/* Members preview */}
      {data.members.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5 mb-8">
          <h2 className="text-base font-bold text-slate-900 mb-3">
            Meet the squad
          </h2>
          <ul className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {data.members.map((m) => (
              <li key={m.id} className="text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center">
                  {(m.name ?? "?").charAt(0)}
                </div>
                <p className="text-xs text-slate-700 mt-1.5 truncate">
                  {m.name}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Testimonials */}
      {data.testimonials.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="text-base font-bold text-slate-900 mb-3">
            Why other consumers chose them
          </h2>
          <ul className="space-y-3">
            {data.testimonials.map((t, i) => (
              <li key={i} className="border-l-4 border-amber-300 pl-3">
                {t.rating != null && (
                  <p className="text-xs text-amber-600 font-bold">
                    {"★".repeat(t.rating)}
                    <span className="text-slate-300">
                      {"★".repeat(5 - t.rating)}
                    </span>
                  </p>
                )}
                <p className="text-sm text-slate-700 italic">
                  &quot;{t.testimonial}&quot;
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-[11px] text-slate-400 mt-10">
        General information only. {data.team.name} delivers their services
        under their own professional licence.
      </p>
    </main>
  );
}

function Trust({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "slate" | "amber" | "emerald";
}) {
  const cls =
    tone === "emerald"
      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
      : tone === "amber"
        ? "bg-amber-50 border-amber-200 text-amber-900"
        : "bg-slate-50 border-slate-200 text-slate-700";
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <p className="text-[10px] uppercase tracking-widest font-bold opacity-80">
        {label}
      </p>
      <p className="text-lg font-extrabold mt-0.5">{value}</p>
    </div>
  );
}
