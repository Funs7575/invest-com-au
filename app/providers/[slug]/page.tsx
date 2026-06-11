import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { breadcrumbJsonLd, absoluteUrl } from "@/lib/seo";
import { getOrganisationBySlug, ORG_TYPE_LABELS } from "@/lib/organisations";
import { getPublishedCourses } from "@/lib/course";
import type { Course } from "@/lib/types";

export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const org = await getOrganisationBySlug(slug);
  if (!org) return { title: "Provider Not Found" };
  return {
    title: `${org.name} — Training Provider | Invest.com.au`,
    description: org.bio?.slice(0, 160) ?? `${org.name} offers CPD and training courses for Australian financial professionals.`,
    alternates: { canonical: `/providers/${slug}` },
    openGraph: {
      title: `${org.name} — Training Provider`,
      description: org.bio?.slice(0, 160) ?? "",
      url: `/providers/${slug}`,
      images: [{ url: `/api/og?title=${encodeURIComponent(org.name)}&sub=${encodeURIComponent("CPD Training Provider · Australian Financial Professionals")}`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image" },
  };
}

function levelBadge(level: string) {
  const styles: Record<string, string> = {
    beginner: "bg-emerald-50 text-emerald-700",
    intermediate: "bg-blue-50 text-blue-700",
    advanced: "bg-purple-50 text-purple-700",
  };
  return styles[level] ?? "bg-slate-50 text-slate-600";
}

export default async function ProviderProfilePage({ params }: Props) {
  const { slug } = await params;
  const [org, allCourses] = await Promise.all([
    getOrganisationBySlug(slug),
    getPublishedCourses(),
  ]);

  if (!org) notFound();

  const typeLabel = ORG_TYPE_LABELS[org.organisation_type] ?? org.organisation_type;

  // Filter courses created by this org
  const orgCourses = (allCourses as (Course & { organisation_id?: number; creator_kind?: string })[]).filter(
    (c) => c.organisation_id === org.id && c.creator_kind === "organisation",
  );

  const jsonLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Providers", url: absoluteUrl("/providers") },
    { name: org.name, url: absoluteUrl(`/providers/${slug}`) },
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="bg-white border-b border-slate-200 py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-sm text-slate-500 mb-4">
            <Link href="/providers" className="hover:text-teal-600">Providers</Link>
            <span className="mx-2">/</span>
            <span className="text-slate-600">{org.name}</span>
          </div>
          <div className="flex items-start gap-5">
            {org.logo_url ? (
              <Image
                src={org.logo_url}
                alt={org.name}
                width={80}
                height={80}
                className="w-20 h-20 rounded-2xl object-contain border border-slate-200 bg-white flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-3xl font-bold text-teal-600 flex-shrink-0">
                {org.name[0]}
              </div>
            )}
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">{org.name}</h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-sm bg-teal-50 text-teal-700 px-3 py-1 rounded-full font-medium">
                  {typeLabel}
                </span>
                {org.cpd_provider_number && (
                  <span className="text-sm bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-medium flex items-center gap-1">
                    <span>✓</span> Verified CPD Provider
                  </span>
                )}
                {org.verification_status === "verified" && !org.cpd_provider_number && (
                  <span className="text-sm bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-medium flex items-center gap-1">
                    <span>✓</span> Verified
                  </span>
                )}
                {org.location_state && (
                  <span className="text-sm text-slate-500">{org.location_state}</span>
                )}
              </div>
            </div>
          </div>

          {org.bio && (
            <p className="mt-5 text-slate-600 leading-relaxed max-w-2xl">{org.bio}</p>
          )}

          <div className="flex gap-4 mt-5 flex-wrap">
            {org.website && (
              <a
                href={org.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-teal-600 hover:underline font-medium"
              >
                Website →
              </a>
            )}
            <a
              href={`mailto:${org.email}`}
              className="text-sm text-teal-600 hover:underline font-medium"
            >
              Contact →
            </a>
          </div>
        </div>
      </section>

      {/* Courses */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-xl font-bold text-slate-800 mb-5">
          Courses by {org.name}
          {orgCourses.length > 0 && (
            <span className="ml-2 text-sm font-normal text-slate-500">
              {orgCourses.length} course{orgCourses.length !== 1 ? "s" : ""}
            </span>
          )}
        </h2>

        {orgCourses.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
            <div className="text-3xl mb-2">📚</div>
            <p className="text-slate-500">No courses published yet.</p>
            <p className="text-sm text-slate-500 mt-1">Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {orgCourses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.slug}`}
                className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md hover:border-teal-200 transition-all flex flex-col gap-3"
              >
                {course.cover_image_url && (
                  <Image
                    src={course.cover_image_url}
                    alt={course.title}
                    width={400}
                    height={144}
                    className="w-full h-36 object-cover rounded-xl"
                  />
                )}
                <div>
                  <h3 className="font-semibold text-slate-900 leading-snug">{course.title}</h3>
                  {course.subtitle && (
                    <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{course.subtitle}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {course.level && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelBadge(course.level)}`}>
                      {course.level}
                    </span>
                  )}
                  {(course as Course & { is_cpd_eligible?: boolean }).is_cpd_eligible && (
                    <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">
                      CPD
                    </span>
                  )}
                  {course.estimated_hours && (
                    <span className="text-xs text-slate-500">{course.estimated_hours}h</span>
                  )}
                </div>
                <div className="mt-auto flex items-center justify-between">
                  <span className="font-bold text-slate-800">
                    {course.price === 0 ? "Free" : `$${course.price}`}
                  </span>
                  <span className="text-xs text-teal-600 font-medium">View course →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
