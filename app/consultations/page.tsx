import { createClient } from "@/lib/supabase/server";
import type { Consultation } from "@/lib/types";
import { Suspense } from "react";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import ConsultationsClient from "./ConsultationsClient";

export const metadata = {
  title: "Expert Investment Consultations",
  description:
    "Book 1-on-1 sessions with qualified investment experts. Get personalised advice on portfolio reviews, tax planning, broker selection, and more.",
  openGraph: {
    title: `Expert Investment Consultations — ${SITE_NAME}`,
    description:
      "Book 1-on-1 sessions with investment experts for personalised advice on your portfolio.",
    images: [
      {
        url: "/api/og?title=Expert+Consultations&subtitle=1-on-1+sessions+with+investment+experts&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/consultations" },
};

export const revalidate = 3600;

function jsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Expert Investment Consultations",
    description:
      "Book 1-on-1 sessions with qualified investment experts for personalised advice.",
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
    url: absoluteUrl("/consultations"),
    serviceType: "Financial Consulting",
    areaServed: { "@type": "Country", name: "Australia" },
  };
}

export default async function ConsultationsPage() {
  const supabase = await createClient();

  const { data: consultations } = await supabase
    .from("consultations")
    .select("*, consultant:team_members(*)")
    .eq("status", "published")
    .order("sort_order", { ascending: true });

  // Normalise Supabase join (returns array for single FK)
  const normalized = ((consultations as unknown as any[]) || []).map((c) => ({
    ...c,
    consultant: Array.isArray(c.consultant)
      ? c.consultant[0] ?? null
      : c.consultant ?? null,
  })) as Consultation[];

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Consultations" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <Suspense fallback={<ConsultationsLoading />}>
        <ConsultationsClient consultations={normalized} />
      </Suspense>
    </>
  );
}

function ConsultationsLoading() {
  return (
    <div className="py-12">
      <div className="container-custom max-w-5xl">
        <div className="h-10 w-80 bg-slate-200 rounded animate-pulse mb-4" />
        <div className="h-6 w-96 bg-slate-100 rounded animate-pulse mb-10" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="border border-slate-200 rounded-2xl p-6 animate-pulse"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-slate-200 rounded-full" />
                <div>
                  <div className="h-4 w-28 bg-slate-200 rounded mb-1" />
                  <div className="h-3 w-20 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="h-5 w-48 bg-slate-200 rounded mb-2" />
              <div className="h-3 w-full bg-slate-100 rounded mb-1" />
              <div className="h-3 w-3/4 bg-slate-100 rounded mb-4" />
              <div className="h-10 w-full bg-slate-200 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
