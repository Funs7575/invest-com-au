import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  SITE_NAME,
  REVIEW_AUTHOR,
} from "@/lib/seo";
import {
  GENERAL_ADVICE_WARNING,
  ADVERTISER_DISCLOSURE_SHORT,
} from "@/lib/compliance";
import type { Consultation } from "@/lib/types";
import ConsultationDetailClient from "./ConsultationDetailClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getConsultation(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("consultations")
    .select("*, consultant:team_members(*)")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!data) return null;

  // Normalise Supabase join
  return {
    ...data,
    consultant: Array.isArray(data.consultant)
      ? data.consultant[0] ?? null
      : data.consultant ?? null,
  } as Consultation;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const consultation = await getConsultation(slug);
  if (!consultation) return {};

  const title = `${consultation.title} — Expert Consultation`;
  const description =
    consultation.description ||
    `Book a ${consultation.duration_minutes}-minute 1-on-1 session with ${consultation.consultant?.full_name || "an expert"}.`;

  return {
    title,
    description,
    alternates: { canonical: `/consultations/${slug}` },
    openGraph: {
      title: `${title} — ${SITE_NAME}`,
      description,
      url: `/consultations/${slug}`,
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(consultation.title)}&subtitle=${encodeURIComponent(`${consultation.duration_minutes}-min session`)}&type=default`,
          width: 1200,
          height: 630,
          alt: consultation.title,
        },
      ],
    },
    twitter: { card: "summary_large_image" },
  };
}

export const revalidate = 3600;

export default async function ConsultationDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const consultation = await getConsultation(slug);
  if (!consultation) notFound();

  const priceDisplay = (consultation.price / 100).toFixed(0);
  const proPriceDisplay = consultation.pro_price
    ? (consultation.pro_price / 100).toFixed(0)
    : null;

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Consultations", url: absoluteUrl("/consultations") },
    { name: consultation.title },
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: consultation.title,
    description: consultation.description || "",
    provider: {
      "@type": "Person",
      name: consultation.consultant?.full_name || "Expert",
    },
    offers: {
      "@type": "Offer",
      price: (consultation.price / 100).toFixed(2),
      priceCurrency: "AUD",
      availability: "https://schema.org/InStock",
    },
    url: absoluteUrl(`/consultations/${slug}`),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="py-12">
        <div className="container-custom max-w-5xl">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="text-sm text-slate-500 mb-6">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link href="/consultations" className="hover:text-slate-900">
              Consultations
            </Link>
            <span className="mx-2">/</span>
            <span className="text-green-700">{consultation.title}</span>
          </nav>

          {/* Two-column layout */}
          <div className="grid lg:grid-cols-5 gap-10">
            {/* Left: Info */}
            <div className="lg:col-span-3">
              <h1 className="text-3xl md:text-4xl font-extrabold mb-4">
                {consultation.title}
              </h1>

              {consultation.description && (
                <p className="text-lg text-slate-600 mb-8">
                  {consultation.description}
                </p>
              )}

              {/* Consultant bio */}
              {consultation.consultant && (
                <div className="mb-8">
                  <h2 className="text-xl font-bold mb-4">Your Consultant</h2>
                  <div className="flex items-start gap-5 bg-slate-50 rounded-2xl p-6">
                    {consultation.consultant.avatar_url ? (
                      <Image
                        src={consultation.consultant.avatar_url}
                        alt={consultation.consultant.full_name}
                        width={64}
                        height={64}
                        className="rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-xl font-bold text-green-700 shrink-0">
                        {consultation.consultant.full_name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-slate-900">
                        {consultation.consultant.full_name}
                      </h3>
                      {consultation.consultant.credentials?.length ? (
                        <p className="text-xs text-slate-500 mb-2">
                          {consultation.consultant.credentials.join(" · ")}
                        </p>
                      ) : null}
                      {consultation.consultant.short_bio && (
                        <p className="text-sm text-slate-600">
                          {consultation.consultant.short_bio}
                        </p>
                      )}
                      <div className="flex gap-3 mt-3">
                        {consultation.consultant.linkedin_url && (
                          <a
                            href={consultation.consultant.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-green-700 hover:underline"
                          >
                            LinkedIn
                          </a>
                        )}
                        {consultation.consultant.twitter_url && (
                          <a
                            href={consultation.consultant.twitter_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-green-700 hover:underline"
                          >
                            Twitter
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* What to expect */}
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4">What to Expect</h2>
                <ul className="space-y-3">
                  {[
                    `A ${consultation.duration_minutes}-minute 1-on-1 video call`,
                    "Personalised advice tailored to your situation",
                    "Action items and next steps you can implement immediately",
                    "Follow-up summary via email after the session",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-slate-600">
                      <svg
                        className="w-5 h-5 text-green-600 shrink-0 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* FAQ */}
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4">
                  Frequently Asked Questions
                </h2>
                <div className="space-y-4">
                  {[
                    {
                      q: "Is this personal financial advice?",
                      a: "No. Consultations provide general guidance and education. For personal financial advice tailored to your specific situation, you should consult a licensed financial adviser.",
                    },
                    {
                      q: "How does scheduling work?",
                      a: "After payment, you'll see a calendar to pick a time that works for you. You'll receive a confirmation email with a video call link.",
                    },
                    ...(proPriceDisplay
                      ? [
                          {
                            q: "Do Pro subscribers get a discount?",
                            a: `Yes! Investor Pro members pay just $${proPriceDisplay} instead of $${priceDisplay}. The discount is applied automatically at checkout.`,
                          },
                        ]
                      : []),
                    {
                      q: "Can I reschedule?",
                      a: "Yes, you can reschedule through the booking calendar up to 24 hours before your session.",
                    },
                  ].map((faq) => (
                    <details
                      key={faq.q}
                      className="group rounded-xl border border-slate-200 bg-white"
                    >
                      <summary className="flex items-center justify-between cursor-pointer p-4 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors">
                        {faq.q}
                        <svg
                          className="w-4 h-4 shrink-0 text-slate-400 group-open:rotate-180 transition-transform"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </summary>
                      <div className="px-4 pb-4 text-sm text-slate-600">
                        {faq.a}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Booking CTA */}
            <div className="lg:col-span-2">
              <div className="sticky top-8">
                <ConsultationDetailClient consultation={consultation} />
              </div>
            </div>
          </div>

          {/* Compliance */}
          <div className="mt-16 space-y-3 text-center">
            <p className="text-xs text-slate-400">{GENERAL_ADVICE_WARNING}</p>
            <p className="text-xs text-slate-400">
              {ADVERTISER_DISCLOSURE_SHORT}
            </p>
            <p className="text-xs text-slate-400 mt-4">
              <Link
                href="/how-we-earn"
                className="underline hover:text-slate-900"
              >
                How we earn
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
