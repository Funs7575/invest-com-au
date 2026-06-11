import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Learning — Invest.com.au",
  robots: "noindex, nofollow",
};

// ── Types ──────────────────────────────────────────────────────────────────────

type CourseRow = {
  id: string;
  slug: string;
  title: string;
  price_cents: number | null;
  cpd_hours: number | null;
  status: string;
  description: string | null;
};

type EnrollmentRow = {
  id: string;
  course_id: string;
  user_id: string;
  status: "active" | "completed";
  enrolled_at: string;
  completed_at: string | null;
  course: CourseRow | null;
};

type CertificateRow = {
  id: string;
  user_id: string;
  course_id: string;
  issued_at: string;
  certificate_url: string | null;
  cpd_hours: number | null;
  certificate_number: string | null;
  course: CourseRow | null;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "active" | "completed" }) {
  if (status === "completed") {
    return (
      <span
        className="bg-green-50 text-green-800 border border-green-200"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "2px 10px",
          borderRadius: "9999px",
          fontSize: "0.7rem",
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        Completed
      </span>
    );
  }
  return (
    <span
      className="bg-teal-50 text-teal-700 border border-teal-200"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 10px",
        borderRadius: "9999px",
        fontSize: "0.7rem",
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}
    >
      In Progress
    </span>
  );
}

function EnrollmentCard({ enrollment }: { enrollment: EnrollmentRow }) {
  const course = enrollment.course;
  const title = course?.title ?? "Unknown Course";
  const slug = course?.slug ?? null;
  const cpdHours = course?.cpd_hours ?? null;

  return (
    <div
      className="bg-white border border-slate-200"
      style={{
        borderRadius: "16px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {slug ? (
            <Link
              href={`/academy/${slug}`}
              className="text-slate-900"
              style={{
                fontWeight: 700,
                fontSize: "1rem",
                textDecoration: "none",
                lineHeight: 1.3,
              }}
            >
              {title}
            </Link>
          ) : (
            <p className="text-slate-900" style={{ fontWeight: 700, fontSize: "1rem", margin: 0 }}>
              {title}
            </p>
          )}
        </div>
        <StatusBadge status={enrollment.status} />
      </div>

      <div className="text-slate-500" style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "0.8rem" }}>
        <span>Enrolled: {formatDate(enrollment.enrolled_at)}</span>
        {enrollment.completed_at && (
          <span>Completed: {formatDate(enrollment.completed_at)}</span>
        )}
        {cpdHours != null && cpdHours > 0 && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              color: "var(--color-teal-600, #0d9488)",
              fontWeight: 600,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" d="M12 6v6l4 2" />
            </svg>
            {cpdHours} CPD hrs
          </span>
        )}
      </div>
    </div>
  );
}

function CertificateCard({ cert }: { cert: CertificateRow }) {
  const title = cert.course?.title ?? "Unknown Course";
  const slug = cert.course?.slug ?? null;
  const cpdHours = cert.cpd_hours ?? cert.course?.cpd_hours ?? null;

  return (
    <div
      className="bg-white border border-slate-200"
      style={{
        borderRadius: "16px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-teal-600, #0d9488)"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            {slug ? (
              <Link
                href={`/academy/${slug}`}
                className="text-slate-900"
                style={{
                  fontWeight: 700,
                  fontSize: "1rem",
                  textDecoration: "none",
                }}
              >
                {title}
              </Link>
            ) : (
              <span className="text-slate-900" style={{ fontWeight: 700, fontSize: "1rem" }}>
                {title}
              </span>
            )}
          </div>

          {cert.certificate_number && (
            <p className="text-slate-500" style={{ fontSize: "0.75rem", margin: 0 }}>
              Certificate #{cert.certificate_number}
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
          {cert.certificate_number && (
            <Link
              href={`/certificate/${cert.certificate_number}`}
              className="bg-teal-50 border border-teal-200"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                color: "var(--color-teal-600, #0d9488)",
                borderRadius: "8px",
                fontSize: "0.8rem",
                fontWeight: 600,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
              aria-label={`View and share certificate for ${cert.course?.title ?? "this course"}`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </Link>
          )}
          {cert.certificate_url ? (
            <a
              href={cert.certificate_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                background: "var(--color-teal-600, #0d9488)",
                borderRadius: "8px",
                fontSize: "0.8rem",
                fontWeight: 600,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </a>
          ) : (
            <span
              className="bg-slate-100 text-slate-500"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "6px 14px",
                borderRadius: "8px",
                fontSize: "0.8rem",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              Pending
            </span>
          )}
        </div>
      </div>

      <div className="text-slate-500" style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "0.8rem" }}>
        <span>Issued: {formatDate(cert.issued_at)}</span>
        {cpdHours != null && cpdHours > 0 && (
          <span style={{ color: "var(--color-teal-600, #0d9488)", fontWeight: 600 }}>
            {cpdHours} CPD hrs earned
          </span>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function MyLearningPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  // Declare outside try so TypeScript knows these are initialised
  let enrollments: EnrollmentRow[] = [];
  let certificates: CertificateRow[] = [];

  try {
    const [enrollRes, certRes] = await Promise.all([
      supabase
        .from("course_enrollments")
        .select("id, course_id, user_id, status, enrolled_at, completed_at, course:courses(id, slug, title, price_cents, cpd_hours, status, description)")
        .eq("user_id", user.id)
        .order("enrolled_at", { ascending: false }),
      supabase
        .from("course_certificates")
        .select("id, user_id, course_id, issued_at, certificate_url, cpd_hours, certificate_number, course:courses(id, slug, title, price_cents, cpd_hours, status, description)")
        .eq("user_id", user.id)
        .order("issued_at", { ascending: false }),
    ]);

    if (enrollRes.data) {
      enrollments = enrollRes.data as unknown as EnrollmentRow[];
    }
    if (certRes.data) {
      certificates = certRes.data as unknown as CertificateRow[];
    }
  } catch {
    /* fail-soft: render empty state */
  }

  // CPD hours summary: sum hours from certificates (unique by course)
  const totalCpdHours = certificates.reduce((sum, cert) => {
    const h = cert.cpd_hours ?? cert.course?.cpd_hours ?? 0;
    return sum + Number(h);
  }, 0);

  const completedCount = enrollments.filter((e) => e.status === "completed").length;
  const activeCount = enrollments.filter((e) => e.status === "active").length;

  return (
    <main style={{ maxWidth: "800px", margin: "0 auto", padding: "32px 16px 64px" }}>
      {/* Page header */}
      <header style={{ marginBottom: "32px" }}>
        <nav aria-label="Breadcrumb" className="text-slate-500" style={{ fontSize: "0.85rem", marginBottom: "12px" }}>
          <Link href="/" className="text-slate-500" style={{ textDecoration: "none" }}>Home</Link>
          <span style={{ margin: "0 8px" }}>/</span>
          <span className="text-slate-900">My Learning</span>
        </nav>

        <h1
          className="text-slate-900"
          style={{
            fontSize: "1.75rem",
            fontWeight: 800,
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          My Learning
        </h1>
        <p className="text-slate-500" style={{ marginTop: "6px", fontSize: "0.9rem" }}>
          {user.email}
        </p>
      </header>

      {/* Summary strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "12px",
          marginBottom: "32px",
        }}
      >
        <div
          className="bg-white border border-slate-200"
          style={{
            borderRadius: "12px",
            padding: "16px",
          }}
        >
          <p className="text-slate-500" style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, margin: "0 0 4px" }}>
            Enrolled
          </p>
          <p className="text-slate-900" style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>
            {enrollments.length}
          </p>
        </div>

        <div
          className="bg-white border border-slate-200"
          style={{
            borderRadius: "12px",
            padding: "16px",
          }}
        >
          <p className="text-slate-500" style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, margin: "0 0 4px" }}>
            Completed
          </p>
          <p className="text-slate-900" style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>
            {completedCount}
          </p>
        </div>

        <div
          style={{
            background: totalCpdHours > 0 ? "#f0fdfa" : "#ffffff",
            border: `1px solid ${totalCpdHours > 0 ? "#99f6e4" : "#e2e8f0"}`,
            borderRadius: "12px",
            padding: "16px",
          }}
        >
          <p className="text-slate-500" style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, margin: "0 0 4px" }}>
            CPD Hours
          </p>
          <p
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: totalCpdHours > 0 ? "var(--color-teal-600, #0d9488)" : "var(--color-ink-900, #0f172a)",
              margin: 0,
            }}
          >
            {totalCpdHours % 1 === 0 ? totalCpdHours.toFixed(0) : totalCpdHours.toFixed(1)}
          </p>
        </div>
      </div>

      {/* Enrollments section */}
      <section aria-labelledby="enrollments-heading" style={{ marginBottom: "40px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <h2
            id="enrollments-heading"
            className="text-slate-500"
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              margin: 0,
            }}
          >
            My Courses
            {enrollments.length > 0 && (
              <span className="text-slate-500" style={{ marginLeft: "8px", fontWeight: 400 }}>
                ({activeCount} active · {completedCount} completed)
              </span>
            )}
          </h2>
        </div>

        {enrollments.length === 0 ? (
          <div
            className="bg-white border-slate-300"
            style={{
              border: "1px dashed",
              borderRadius: "16px",
              padding: "40px 24px",
              textAlign: "center",
            }}
          >
            <p className="text-slate-500" style={{ marginBottom: "8px", fontWeight: 600 }}>
              You are not enrolled in any courses yet.
            </p>
            <p className="text-slate-500" style={{ fontSize: "0.875rem", marginBottom: "20px" }}>
              Browse CPD-accredited courses from Australian advisors and providers.
            </p>
            <Link
              href="/academy"
              className="text-white"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 20px",
                background: "var(--color-teal-600, #0d9488)",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "0.9rem",
                textDecoration: "none",
              }}
            >
              Browse Academy
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {enrollments.map((enrollment) => (
              <EnrollmentCard key={enrollment.id} enrollment={enrollment} />
            ))}
          </div>
        )}
      </section>

      {/* Certificates section */}
      {certificates.length > 0 && (
        <section aria-labelledby="certificates-heading" style={{ marginBottom: "40px" }}>
          <h2
            id="certificates-heading"
            className="text-slate-500"
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "16px",
            }}
          >
            Earned Certificates
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {certificates.map((cert) => (
              <CertificateCard key={cert.id} cert={cert} />
            ))}
          </div>
        </section>
      )}

      {/* CPD progress note */}
      {totalCpdHours > 0 && (
        <div
          className="bg-teal-50 border border-teal-200"
          style={{
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "40px",
          }}
        >
          <h3 style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-teal-600, #0d9488)", margin: "0 0 6px" }}>
            CPD Progress Summary
          </h3>
          <p className="text-teal-700" style={{ fontSize: "0.875rem", margin: 0 }}>
            You have earned <strong>{totalCpdHours % 1 === 0 ? totalCpdHours.toFixed(0) : totalCpdHours.toFixed(1)} CPD hours</strong> through courses on Invest.com.au.{" "}
            Australian financial advisors require 40 CPD hours per year under ASIC rules.
          </p>
        </div>
      )}

      {/* Browse more CTA */}
      <div
        style={{
          background: "linear-gradient(135deg, #0d9488, #0f766e)",
          borderRadius: "16px",
          padding: "28px 24px",
          textAlign: "center",
          color: "#ffffff",
        }}
      >
        <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 8px" }}>
          Discover More Courses
        </h3>
        <p style={{ fontSize: "0.875rem", color: "#ccfbf1", margin: "0 0 20px", lineHeight: 1.5 }}>
          Browse CPD-accredited and professional development courses from verified Australian advisors and providers.
        </p>
        <Link
          href="/academy"
          className="bg-white"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "10px 24px",
            color: "var(--color-teal-600, #0d9488)",
            borderRadius: "8px",
            fontWeight: 700,
            fontSize: "0.9rem",
            textDecoration: "none",
          }}
        >
          Browse Academy
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </main>
  );
}
