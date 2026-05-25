import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import { personCredentialJsonLd } from "@/lib/schema-markup";
import ShareCertificateActions from "./ShareCertificateActions";

// Public-by-design: ISR 24h — certificate content is immutable after issue.
export const revalidate = 86400;

// ── Types ──────────────────────────────────────────────────────────────────────

interface Course {
  id: string;
  title: string;
  slug: string;
  cpd_hours: number | null;
  cpd_category: string | null;
}

interface CertRow {
  id: string;
  certificate_number: string;
  issued_at: string;
  cpd_hours: number | null;
  cpd_category: string | null;
  /**
   * Display name sourced from the user's profile at certificate-issue time,
   * stored on the certificate row so the public page never touches auth tables.
   * Falls back to "Certificate Holder" when null (older rows).
   */
  holder_display_name: string | null;
  course: Course | null;
}

// ── Data fetch ─────────────────────────────────────────────────────────────────
//
// Privacy justification (CLAUDE.md § "Two Supabase clients"):
//   `course_certificates` has per-user RLS — anonymous visitors have no JWT so
//   the regular `createClient()` would return zero rows. A public verification
//   page is the correct use of the service-role escape hatch: the lookup key is
//   a random, unguessable `certificate_number` (never enumerable), and only the
//   holder's chosen display name + credential title are exposed — no email,
//   user_id, or PII. This matches the "lib/* helpers serving anonymous paths
//   with deny-all-anon RLS" allowed scope documented in CLAUDE.md.

async function getCertificate(number: string): Promise<CertRow | null> {
  // Dynamically import admin client — service-role bypasses per-user RLS.
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("course_certificates")
    .select(
      "id, certificate_number, issued_at, cpd_hours, cpd_category, holder_display_name, course:courses(id, title, slug, cpd_hours, cpd_category)",
    )
    .eq("certificate_number", number)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as CertRow;
}

// ── Metadata ───────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ number: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { number } = await params;
  const cert = await getCertificate(number);

  if (!cert) {
    return {
      title: "Certificate Not Found | Invest.com.au Academy",
      robots: { index: false },
    };
  }

  const holderName = cert.holder_display_name ?? "Certificate Holder";
  const courseTitle = cert.course?.title ?? "Course";

  return {
    title: `${holderName} — ${courseTitle} | Certificate Verification`,
    description: `Verify the authenticity of certificate ${cert.certificate_number} issued to ${holderName} for completing ${courseTitle} on ${new Date(cert.issued_at).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}.`,
    alternates: { canonical: `/certificate/${number}` },
    openGraph: {
      title: `${holderName} — ${courseTitle}`,
      description: `Certificate of completion issued by ${SITE_NAME} Academy. Certificate number: ${cert.certificate_number}.`,
      url: `/certificate/${number}`,
    },
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const CPD_CATEGORY_LABELS: Record<string, string> = {
  technical: "Technical",
  conduct: "Conduct",
  client_care: "Client Care",
  regulatory: "Regulatory",
};

function formatIssueDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function CertificateVerificationPage({ params }: PageProps) {
  const { number } = await params;
  const cert = await getCertificate(number);

  if (!cert) notFound();

  const holderName = cert.holder_display_name ?? "Certificate Holder";
  const courseTitle = cert.course?.title ?? "Course";
  const cpd_hours = cert.cpd_hours ?? cert.course?.cpd_hours ?? null;
  const cpd_category = cert.cpd_category ?? cert.course?.cpd_category ?? null;
  const issueDate = formatIssueDate(cert.issued_at);

  // ── JSON-LD ────────────────────────────────────────────────────────────────
  // breadcrumb: Home → Academy → this certificate
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Academy", url: absoluteUrl("/academy") },
    { name: "Certificate Verification", url: absoluteUrl(`/certificate/${number}`) },
  ]);

  // Use the shared personCredentialJsonLd builder so the JSON-LD gate stays green
  // and the schema pattern is consistent across all credential pages.
  const { credential: credentialJsonLd, person: personJsonLd } = personCredentialJsonLd({
    holderName,
    credentialTitle: courseTitle,
    certificateNumber: cert.certificate_number,
    issuedAt: cert.issued_at,
    cpdHours: cpd_hours,
  });

  return (
    <>
      {/* Structured data — breadcrumb + credential + person */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(credentialJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />

      <div className="min-h-screen bg-slate-50 py-8 px-4 print:bg-white print:py-0">
        <div className="max-w-3xl mx-auto">

          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="text-sm text-slate-500 mb-6 print:hidden"
          >
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/academy" className="hover:text-slate-900">Academy</Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700">Certificate Verification</span>
          </nav>

          {/* Page heading */}
          <div className="mb-6 print:hidden">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Certificate Verification</h1>
            <p className="text-slate-500 text-sm">
              Verify the authenticity of an Invest.com.au Academy certificate.
            </p>
          </div>

          {/* Valid badge */}
          <div className="mb-6 print:hidden">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-sm">
              <svg
                className="w-4 h-4 text-emerald-500"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Valid certificate
            </div>
          </div>

          {/* Certificate card */}
          <div
            className="relative bg-white rounded-2xl overflow-hidden shadow-xl print:shadow-none print:rounded-none print:border-0"
            aria-label="Certificate of completion"
          >
            {/* Gradient border effect */}
            <div
              className="absolute inset-0 rounded-2xl print:rounded-none"
              style={{
                background:
                  "linear-gradient(135deg, #d4af37 0%, #0d9488 50%, #1e3a5f 100%)",
                padding: "3px",
                borderRadius: "inherit",
              }}
              aria-hidden="true"
            >
              <div className="absolute inset-[3px] bg-white rounded-[calc(1rem-3px)] print:rounded-none" />
            </div>

            <div className="relative px-8 py-10 md:px-14 md:py-14">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="flex justify-center mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 14l9-5-9-5-9 5 9 5z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
                        />
                      </svg>
                    </div>
                    <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                      Invest.com.au Academy
                    </span>
                  </div>
                </div>

                {/* Decorative divider */}
                <div
                  className="h-px w-24 mx-auto mb-6"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, #d4af37, transparent)",
                  }}
                  aria-hidden="true"
                />

                <p className="text-xs uppercase tracking-[0.3em] text-slate-400 font-semibold mb-3">
                  Certificate of Completion
                </p>
                <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight mb-2">
                  {courseTitle}
                </h2>
              </div>

              {/* Body */}
              <div className="text-center mb-8">
                <p className="text-base text-slate-500 mb-2">This certifies that</p>
                <p className="text-2xl md:text-3xl font-bold text-teal-700 mb-2">
                  {holderName}
                </p>
                <p className="text-base text-slate-500 leading-relaxed max-w-lg mx-auto">
                  has successfully completed{" "}
                  <span className="font-semibold text-slate-700">{courseTitle}</span>{" "}
                  on <span className="font-semibold text-slate-700">{issueDate}</span>.
                </p>
              </div>

              {/* CPD badge */}
              {cpd_hours != null && cpd_hours > 0 && (
                <div className="flex justify-center mb-8">
                  <div className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-teal-50 border border-teal-200">
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-extrabold text-teal-700 leading-none">
                        {cpd_hours}
                      </span>
                      <span className="text-[0.6rem] uppercase tracking-wider text-teal-500 font-semibold">
                        CPD
                      </span>
                    </div>
                    <div className="h-8 w-px bg-teal-200" aria-hidden="true" />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-teal-800">
                        {cpd_hours === 1 ? "1 Hour" : `${cpd_hours} Hours`}
                      </span>
                      {cpd_category && (
                        <span className="text-xs text-teal-600">
                          {CPD_CATEGORY_LABELS[cpd_category] ?? cpd_category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Decorative divider */}
              <div
                className="h-px w-32 mx-auto mb-6"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, #d4af37, transparent)",
                }}
                aria-hidden="true"
              />

              {/* Seal / signature row */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Issued by</p>
                  <p className="text-sm font-semibold text-slate-700">Invest.com.au Academy</p>
                  <p className="text-xs text-slate-500">invest.com.au</p>
                </div>

                <div
                  className="w-16 h-16 rounded-full border-2 border-amber-400 flex items-center justify-center flex-shrink-0"
                  style={{
                    background:
                      "radial-gradient(circle, #fffbeb 0%, #fef3c7 100%)",
                  }}
                  aria-label="Invest.com.au Academy seal"
                >
                  <svg
                    className="w-8 h-8 text-amber-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                    />
                  </svg>
                </div>

                <div className="flex flex-col gap-1 text-right">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Issue date</p>
                  <p className="text-sm font-semibold text-slate-700">{issueDate}</p>
                </div>
              </div>

              {/* Certificate number */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs text-slate-400">
                  Certificate No.{" "}
                  <span className="font-mono text-slate-500 select-all">
                    {cert.certificate_number}
                  </span>
                </p>
                <p className="text-xs text-slate-400">
                  Verify at{" "}
                  <span className="font-mono text-slate-500">
                    invest.com.au/certificate/{cert.certificate_number}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Share / print actions */}
          <div className="mt-6 flex flex-col items-center gap-4 print:hidden">
            <ShareCertificateActions
              certificateNumber={cert.certificate_number}
              credentialTitle={courseTitle}
              holderName={holderName}
              issuedAt={cert.issued_at}
            />

            <p className="text-xs text-slate-400 text-center">
              <Link
                href="/certificate"
                className="text-teal-600 hover:underline"
              >
                Verify another certificate
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
