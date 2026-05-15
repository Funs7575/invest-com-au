import type { Metadata } from "next";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Verified consumer testimonials (${CURRENT_YEAR}) | Invest.com.au`,
  description:
    "Real, verified testimonials from people who completed engagements with Australian providers via Invest.com.au.",
  alternates: { canonical: absoluteUrl("/testimonials") },
};

interface TestimonialRow {
  id: number;
  outcome: string;
  rating: number | null;
  testimonial: string | null;
  submitted_at: string;
  consumer_email: string;
}

function initialsOf(email: string): string {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length === 0) return "—";
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join(".");
}

export default async function TestimonialsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("brief_outcomes")
    .select("id, outcome, rating, testimonial, submitted_at, consumer_email, show_testimonial")
    .eq("outcome", "completed")
    .eq("show_testimonial", true)
    .not("testimonial", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(30);

  const rows = ((data ?? []) as TestimonialRow[]).filter(
    (r) => typeof r.testimonial === "string" && r.testimonial.trim().length > 0,
  );

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Testimonials", url: absoluteUrl("/testimonials") },
  ]);

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <nav className="text-xs text-slate-500 mb-3">
        <Link href="/" className="hover:underline">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">Testimonials</span>
      </nav>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
        Verified consumer testimonials
      </h1>
      <p className="text-slate-600 mb-8 leading-relaxed">
        Every testimonial below is from a verified engagement that the consumer
        marked &quot;completed&quot;. We don&apos;t accept paid reviews.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">
          No public testimonials yet. Check back soon — engagements close every week.
        </p>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => {
            const reviewJsonLd = {
              "@context": "https://schema.org",
              "@type": "Review",
              reviewRating: r.rating
                ? {
                    "@type": "Rating",
                    ratingValue: r.rating,
                    bestRating: 5,
                  }
                : undefined,
              author: { "@type": "Person", name: initialsOf(r.consumer_email) },
              reviewBody: r.testimonial,
              datePublished: r.submitted_at,
            };
            return (
              <li
                key={r.id}
                className="bg-white border border-slate-200 rounded-2xl p-5"
              >
                <script
                  type="application/ld+json"
                  dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewJsonLd) }}
                />
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-slate-900">
                    {initialsOf(r.consumer_email)}
                  </p>
                  {r.rating != null && (
                    <p className="text-xs text-amber-600 font-bold">
                      {"★".repeat(r.rating)}
                      <span className="text-slate-300">
                        {"★".repeat(5 - r.rating)}
                      </span>
                    </p>
                  )}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  &quot;{r.testimonial}&quot;
                </p>
                <p className="text-[11px] text-slate-400 mt-2">
                  {new Date(r.submitted_at).toLocaleDateString("en-AU", {
                    dateStyle: "medium",
                  })}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-[11px] text-slate-400 mt-10">
        General information only. Testimonials are individual experiences and not
        a guarantee of similar outcomes.
      </p>
    </main>
  );
}
