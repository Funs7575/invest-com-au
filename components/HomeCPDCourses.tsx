import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";

interface CourseOrganisation {
  name: string;
  slug: string;
  logo_url: string | null;
}

interface CourseProfessional {
  name: string;
  slug: string;
}

interface Course {
  id: number;
  slug: string;
  title: string;
  price_cents: number | null;
  cpd_hours: number | null;
  avg_rating: number | null;
  review_count: number | null;
  organisation: CourseOrganisation | null;
  professional: CourseProfessional | null;
}

function StarRating({ rating, count }: { rating: number; count: number | null }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
      <span style={{ color: "#f59e0b", fontSize: 11, letterSpacing: "-1px" }} aria-hidden>
        {"★".repeat(full)}
        {half ? "½" : ""}
        {"☆".repeat(Math.max(0, 5 - full - (half ? 1 : 0)))}
      </span>
      <span style={{ fontSize: 10.5, color: "var(--color-ink-500)", fontWeight: 600 }}>
        {rating.toFixed(1)}
        {count ? ` (${count})` : ""}
      </span>
    </span>
  );
}

function CourseCard({ course }: { course: Course }) {
  const isFree = !course.price_cents || course.price_cents === 0;
  const priceDisplay = isFree
    ? "Free"
    : `$${Math.round(course.price_cents! / 100).toLocaleString("en-AU")}`;
  const creatorName = course.organisation?.name ?? course.professional?.name ?? null;
  const logoUrl = course.organisation?.logo_url ?? null;
  const creatorInitials = creatorName
    ? creatorName
        .split(/\s+/)
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : null;

  return (
    <Link
      href={`/academy/${course.slug}`}
      className="iv2-card iv2-card-hover"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        padding: 0,
        overflow: "hidden",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div style={{ padding: "14px 14px 12px", flex: 1 }}>
        <h3
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "var(--color-ink-900)",
            lineHeight: 1.3,
            margin: "0 0 10px",
          }}
        >
          {course.title}
        </h3>

        {creatorName && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                overflow: "hidden",
                flexShrink: 0,
                background: "var(--color-ink-100)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 9,
                color: "var(--color-ink-600)",
                position: "relative",
              }}
            >
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={creatorName}
                  fill
                  sizes="24px"
                  style={{ objectFit: "contain", padding: 2 }}
                />
              ) : (
                creatorInitials
              )}
            </div>
            <span style={{ fontSize: 11.5, color: "var(--color-ink-500)" }}>{creatorName}</span>
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {course.cpd_hours && course.cpd_hours > 0 ? (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--color-teal-700)",
                background: "var(--color-teal-50)",
                border: "1px solid var(--color-teal-200)",
                borderRadius: 99,
                padding: "2px 8px",
                letterSpacing: "0.03em",
              }}
            >
              {course.cpd_hours} CPD hr{course.cpd_hours !== 1 ? "s" : ""}
            </span>
          ) : null}
        </div>
      </div>

      <div
        style={{
          padding: "10px 14px",
          borderTop: "1px solid #e5e7eb",
          background: "var(--color-sand-50)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: isFree ? "var(--color-emerald-700)" : "var(--color-ink-900)",
            }}
          >
            {priceDisplay}
          </span>
          {course.avg_rating ? (
            <StarRating rating={course.avg_rating} count={course.review_count ?? null} />
          ) : null}
        </div>
        <span className="iv2-cta-ghost" style={{ fontSize: 11, padding: "5px 9px" }}>
          View →
        </span>
      </div>
    </Link>
  );
}

async function fetchPublishedCourses(): Promise<Course[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("courses")
      .select(
        "id, slug, title, price_cents, cpd_hours, avg_rating, review_count, organisation:organisations(name, slug, logo_url), professional:professionals(name, slug)",
      )
      .eq("status", "published")
      .order("avg_rating", { ascending: false, nullsFirst: false })
      .limit(4);
    return (data as unknown as Course[]) ?? [];
  } catch {
    return [];
  }
}

export default async function HomeCPDCourses() {
  const courses = await fetchPublishedCourses();
  if (courses.length === 0) return null;

  return (
      <section
        style={{
          padding: "52px 36px",
          background: "white",
          borderTop: "1px solid #e5e7eb",
        }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              marginBottom: 20,
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <span className="iv2-mini" style={{ color: "var(--color-teal-700)" }}>
                ● CPD &amp; Professional Development
              </span>
              <h2
                className="font-display"
                style={{
                  fontSize: 28,
                  letterSpacing: "-.026em",
                  fontWeight: 800,
                  margin: "4px 0 0",
                  lineHeight: 1.1,
                  textWrap: "balance",
                  color: "var(--color-ink-900)",
                }}
              >
                Earn CPD hours. Stay sharp.
              </h2>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--color-ink-500)",
                  margin: "6px 0 0",
                  maxWidth: 520,
                  lineHeight: 1.5,
                }}
              >
                Accredited courses for financial advisors, planners and investment professionals.
              </p>
            </div>
            <Link href="/academy" className="iv2-cta-ghost" style={{ fontSize: 12.5 }}>
              Browse all courses →
            </Link>
          </div>

          <div className="home-courses-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </div>

        <style>{`
          @media (max-width: 1024px) {
            .home-courses-grid { grid-template-columns: repeat(2, 1fr) !important; }
          }
          @media (max-width: 640px) {
            .home-courses-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </section>
    );
}
