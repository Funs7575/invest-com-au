import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import type { Professional, AdvisorFirm } from "@/lib/types";
import { PROFESSIONAL_TYPE_LABELS } from "@/lib/types";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";

export const revalidate = 1800;

/* ─── Metadata ─── */

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: firm } = await supabase
    .from("advisor_firms")
    .select("name, afsl_number, location_display, bio, tagline")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!firm) return {};

  const title = `${firm.name} — Advisory Firm Profile`;
  const description = firm.tagline || (firm.bio
    ? firm.bio.slice(0, 155)
    : `${firm.name} is a verified advisory firm${firm.location_display ? ` based in ${firm.location_display}` : ""}${firm.afsl_number ? ` (AFSL ${firm.afsl_number})` : ""}. View team members and request a consultation.`);

  return {
    title,
    description,
    openGraph: {
      title: firm.name,
      description,
    },
    twitter: { card: "summary_large_image" },
    alternates: { canonical: `/firm/${slug}` },
  };
}

/* ─── Helpers ─── */

function firmInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function formatFee(pro: Professional): string | null {
  if (pro.hourly_rate_cents) return `$${(pro.hourly_rate_cents / 100).toLocaleString()}/hr`;
  if (pro.flat_fee_cents) return `$${(pro.flat_fee_cents / 100).toLocaleString()} flat fee`;
  if (pro.aum_percentage) return `${pro.aum_percentage}% AUM`;
  if (pro.fee_description) return pro.fee_description;
  return null;
}

function yearsActive(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  return Math.max(1, Math.floor((now.getTime() - created.getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
}

/* ─── Page ─── */

export default async function FirmProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: firm } = await supabase
    .from("advisor_firms")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!firm) notFound();

  const typedFirm = firm as AdvisorFirm;

  const { data: membersRaw } = await supabase
    .from("professionals")
    .select("id, name, slug, type, photo_url, rating, review_count, specialties, fee_description, hourly_rate_cents, flat_fee_cents, aum_percentage, initial_consultation_free, verified, is_firm_admin")
    .eq("firm_id", typedFirm.id)
    .eq("status", "active")
    .order("is_firm_admin", { ascending: false })
    .order("rating", { ascending: false });

  const members = (membersRaw as Professional[]) || [];

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Advisors", url: absoluteUrl("/advisors") },
    { name: typedFirm.name },
  ]);

  const firstMemberSlug = members.at(0)?.slug;

  const hasHighlightStats = Array.isArray(typedFirm.highlight_stats) && typedFirm.highlight_stats.length > 0;
  const hasFeaturedServices = Array.isArray(typedFirm.featured_services) && typedFirm.featured_services.length > 0;
  const hasCaseStudies = Array.isArray(typedFirm.case_studies) && typedFirm.case_studies.length > 0;

  const highlightStatsCols =
    !hasHighlightStats ? "" :
    typedFirm.highlight_stats!.length <= 2 ? "grid-cols-2" :
    typedFirm.highlight_stats!.length === 3 ? "grid-cols-3" :
    "grid-cols-2 sm:grid-cols-4";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <div className="min-h-screen bg-slate-50">
        {/* ── Breadcrumb ── */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 py-3">
            <nav className="flex items-center gap-1.5 text-xs text-slate-500">
              <Link href="/" className="hover:text-violet-600 transition-colors">Home</Link>
              <span>/</span>
              <Link href="/advisors" className="hover:text-violet-600 transition-colors">Advisors</Link>
              <span>/</span>
              <span className="text-slate-800 font-medium">{typedFirm.name}</span>
            </nav>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
          {/* ── Firm Header Card ── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Hero banner — custom image for Enhanced Partners, gradient fallback */}
            {typedFirm.header_image_url ? (
              <div className="h-28 sm:h-36 relative overflow-hidden">
                <Image
                  src={typedFirm.header_image_url}
                  alt={`${typedFirm.name} banner`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 768px"
                  priority
                />
              </div>
            ) : (
              <div className="bg-gradient-to-r from-violet-600 to-violet-500 h-24 sm:h-28" />
            )}

            <div className="px-6 pb-6 -mt-12">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                {/* Logo / Initials */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-4 border-white bg-white shadow-md flex items-center justify-center overflow-hidden shrink-0">
                  {typedFirm.logo_url ? (
                    <Image
                      src={typedFirm.logo_url}
                      alt={`${typedFirm.name} logo`}
                      width={96}
                      height={96}
                      className="w-full h-full object-contain"
                      priority
                    />
                  ) : (
                    <span className="text-2xl sm:text-3xl font-bold text-violet-600">
                      {firmInitials(typedFirm.name)}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0 pt-2">
                  <div className="flex items-start gap-2 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 truncate">
                      {typedFirm.name}
                    </h1>
                    {typedFirm.is_enhanced && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full border border-amber-200 shrink-0 mt-1">
                        <Icon name="star" size={12} className="text-amber-500" />
                        Enhanced Partner
                      </span>
                    )}
                  </div>
                  {typedFirm.tagline && (
                    <p className="text-sm text-violet-600 font-medium mt-0.5">{typedFirm.tagline}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
                    {typedFirm.location_display && (
                      <span className="flex items-center gap-1">
                        <Icon name="map-pin" size={14} className="text-slate-400" />
                        {typedFirm.location_display}
                      </span>
                    )}
                    {typedFirm.abn && (
                      <span className="flex items-center gap-1">
                        <Icon name="file-text" size={14} className="text-slate-400" />
                        ABN {typedFirm.abn}
                      </span>
                    )}
                    {typedFirm.afsl_number && (
                      <span className="flex items-center gap-1">
                        <Icon name="shield" size={14} className="text-slate-400" />
                        AFSL {typedFirm.afsl_number}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {typedFirm.bio && (
                <p className="mt-4 text-sm text-slate-600 leading-relaxed max-w-3xl">
                  {typedFirm.bio}
                </p>
              )}
            </div>
          </div>

          {/* ── Quick Stats Bar ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{members.length}</p>
              <p className="text-xs text-slate-500">Team Members</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">
                {members.reduce((sum, m) => sum + (m.review_count || 0), 0)}
              </p>
              <p className="text-xs text-slate-500">Client Reviews</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">
                {members.length > 0 ? (members.reduce((sum, m) => sum + (m.rating || 0), 0) / members.length).toFixed(1) : "—"}
              </p>
              <p className="text-xs text-slate-500">Avg Rating</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{yearsActive(typedFirm.created_at)}+</p>
              <p className="text-xs text-slate-500">Years Active</p>
            </div>
          </div>

          {/* ── Highlight Stats strip (Enhanced Partners only) ── */}
          {hasHighlightStats && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-5">
              <div className={`grid gap-4 ${highlightStatsCols}`}>
                {typedFirm.highlight_stats!.map((stat, i) => (
                  <div key={i} className="text-center">
                    <p className="text-2xl font-bold text-emerald-700">{stat.value}</p>
                    <p className="text-xs text-emerald-600 mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Featured Services (Enhanced Partners only) ── */}
          {hasFeaturedServices && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Icon name="zap" size={16} className="text-violet-600" />
                Featured Services
              </h2>
              <div className={`grid gap-4 ${
                typedFirm.featured_services!.length === 1 ? "grid-cols-1" :
                typedFirm.featured_services!.length === 2 ? "grid-cols-1 sm:grid-cols-2" :
                "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              }`}>
                {typedFirm.featured_services!.map((svc, i) => (
                  <div key={i} className="border border-slate-100 rounded-lg p-4 bg-slate-50 hover:border-violet-200 transition-colors">
                    {svc.icon && (
                      <span className="text-2xl mb-2 block" aria-hidden="true">{svc.icon}</span>
                    )}
                    <p className="text-sm font-semibold text-slate-800 mb-1">{svc.title}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{svc.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Case Studies / Client Success Stories (Enhanced Partners only) ── */}
          {hasCaseStudies && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Icon name="book-open" size={16} className="text-violet-600" />
                Client Success Stories
              </h2>
              <div className="space-y-4">
                {typedFirm.case_studies!.map((cs, i) => (
                  <div key={i} className="border-l-2 border-violet-200 pl-4 py-1">
                    <p className="text-sm font-semibold text-slate-800">{cs.title}</p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{cs.summary}</p>
                    {cs.outcome && (
                      <p className="text-xs text-emerald-600 font-medium mt-1.5 flex items-center gap-1">
                        <Icon name="check" size={11} />
                        {cs.outcome}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Services We Offer (derived from team member types) ── */}
          {members.length > 0 && (() => {
            const allTypes = [...new Set(members.map(m => PROFESSIONAL_TYPE_LABELS[m.type as keyof typeof PROFESSIONAL_TYPE_LABELS] || m.type))];
            const allSpecs = [...new Set(members.flatMap(m => m.specialties || []))].slice(0, 12);
            return (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h2 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Icon name="briefcase" size={16} className="text-violet-600" />
                  Services We Offer
                </h2>
                <div className="flex flex-wrap gap-2 mb-3">
                  {allTypes.map(t => (
                    <span key={t} className="px-3 py-1.5 bg-violet-50 text-violet-700 text-xs font-semibold rounded-lg border border-violet-200">{t}</span>
                  ))}
                </div>
                {allSpecs.length > 0 && (
                  <>
                    <p className="text-xs text-slate-400 mb-2">Specialties:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {allSpecs.map(s => (
                        <span key={s} className="px-2.5 py-1 bg-slate-50 text-slate-600 text-[0.65rem] font-medium rounded-full border border-slate-200">{s}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* ── Trust Signals + Contact ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Trust Signals */}
            <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Icon name="shield" size={16} className="text-violet-600" />
                Trust Signals
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {/* invest.com.au verified badge (B1) */}
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-center">
                  <Icon name="check-circle" size={20} className="text-emerald-600 mx-auto mb-1" />
                  <p className="text-xs font-semibold text-emerald-700">Verified by</p>
                  <p className="text-[0.6rem] text-emerald-500 font-medium mt-0.5">invest.com.au</p>
                </div>
                {typedFirm.afsl_number && (
                  <div className="bg-violet-50 border border-violet-100 rounded-lg p-3 text-center">
                    <Icon name="check-circle" size={20} className="text-violet-600 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-violet-700">AFSL Verified</p>
                    <p className="text-[0.65rem] text-violet-500 mt-0.5">{typedFirm.afsl_number}</p>
                  </div>
                )}
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-slate-800">{members.length}</p>
                  <p className="text-xs text-slate-500">Team {members.length === 1 ? "Member" : "Members"}</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-slate-800">{yearsActive(typedFirm.created_at)}+</p>
                  <p className="text-xs text-slate-500">{yearsActive(typedFirm.created_at) === 1 ? "Year" : "Years"} Active</p>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Icon name="mail" size={16} className="text-violet-600" />
                Contact
              </h2>
              <div className="space-y-3">
                {typedFirm.website && (
                  <a
                    href={typedFirm.website.startsWith("http") ? typedFirm.website : `https://${typedFirm.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 transition-colors"
                  >
                    <Icon name="globe" size={14} className="text-slate-400" />
                    <span className="truncate">{typedFirm.website.replace(/^https?:\/\//, "")}</span>
                  </a>
                )}
                {typedFirm.phone && (
                  <a
                    href={`tel:${typedFirm.phone}`}
                    className="flex items-center gap-2 text-sm text-slate-600 hover:text-violet-600 transition-colors"
                  >
                    <Icon name="phone" size={14} className="text-slate-400" />
                    {typedFirm.phone}
                  </a>
                )}
                {typedFirm.email && (
                  <a
                    href={`mailto:${typedFirm.email}`}
                    className="flex items-center gap-2 text-sm text-slate-600 hover:text-violet-600 transition-colors"
                  >
                    <Icon name="mail" size={14} className="text-slate-400" />
                    <span className="truncate">{typedFirm.email}</span>
                  </a>
                )}
                {!typedFirm.website && !typedFirm.phone && !typedFirm.email && (
                  <p className="text-xs text-slate-400">No contact details listed</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Our Team ── */}
          {members.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Icon name="users" size={20} className="text-violet-600" />
                  Our Team
                </h2>
                <span className="text-xs text-slate-500">{members.length} {members.length === 1 ? "member" : "members"}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {members.map((member) => {
                  const typeLabel = PROFESSIONAL_TYPE_LABELS[member.type as keyof typeof PROFESSIONAL_TYPE_LABELS] || "Advisor";
                  const fee = formatFee(member);

                  return (
                    <Link
                      key={member.id}
                      href={`/advisor/${member.slug}`}
                      className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-violet-300 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        {/* Photo / Initials */}
                        <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center overflow-hidden shrink-0">
                          {member.photo_url ? (
                            <Image
                              src={member.photo_url}
                              alt={member.name}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-bold text-violet-600">
                              {member.name?.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 group-hover:text-violet-700 transition-colors truncate">
                            {member.name}
                          </p>
                          <p className="text-xs text-slate-500">{typeLabel}</p>

                          {/* Rating */}
                          {member.rating > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <Icon name="star" size={12} className="text-amber-400" />
                              <span className="text-xs font-medium text-slate-700">
                                {member.rating.toFixed(1)}
                              </span>
                              {member.review_count > 0 && (
                                <span className="text-xs text-slate-400">
                                  ({member.review_count})
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {member.verified && (
                          <Icon name="check-circle" size={16} className="text-violet-500 shrink-0 mt-0.5" />
                        )}
                      </div>

                      {/* Specialties */}
                      {member.specialties && member.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {member.specialties.slice(0, 3).map((s) => (
                            <span
                              key={s}
                              className="text-[0.6rem] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full"
                            >
                              {s}
                            </span>
                          ))}
                          {member.specialties.length > 3 && (
                            <span className="text-[0.6rem] text-slate-400">
                              +{member.specialties.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Fee */}
                      {fee && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                          <Icon name="coins" size={12} className="text-slate-400" />
                          {fee}
                          {member.initial_consultation_free && (
                            <span className="ml-1 text-[0.6rem] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full font-medium">
                              Free consult
                            </span>
                          )}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Trust Mark Embed (B1 — for firms to embed on their own site) ── */}
          <div className="bg-white rounded-xl border border-emerald-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-1 flex items-center gap-2">
              <Icon name="check-circle" size={16} className="text-emerald-600" />
              Verified by invest.com.au
            </h2>
            <p className="text-xs text-slate-500 mb-3">
              Embed this trust mark badge on your website to show prospective clients that{" "}
              {typedFirm.name} is a verified firm on invest.com.au.{" "}
              <Link href="/how-we-verify" className="text-violet-600 hover:underline">
                How we verify →
              </Link>
            </p>
            <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[0.7rem] text-slate-600 overflow-x-auto whitespace-pre-wrap break-all">
              {`<script src="https://invest.com.au/api/widget/trust-mark?type=firm&slug=${typedFirm.slug}"></script>`}
            </pre>
            <p className="text-[0.65rem] text-slate-400 mt-2">
              Add <code className="bg-slate-100 px-1 py-0.5 rounded">?theme=dark</code> for a dark background.{" "}
              <Link href="/embed/licensing" className="text-violet-600 hover:underline">
                White-label licensing →
              </Link>
            </p>
          </div>

          {/* ── Join Our Team ── */}
          {(() => {
            const memberTypes = [...new Set(members.map(m => PROFESSIONAL_TYPE_LABELS[m.type as keyof typeof PROFESSIONAL_TYPE_LABELS] || m.type))];
            const hiringRoles: string[] = memberTypes.length > 0
              ? memberTypes.slice(0, 4)
              : ["Financial Planner", "Mortgage Broker", "Wealth Manager", "Investment Adviser"];
            const applyUrl = `/advisor-apply?firm_id=${typedFirm.id}&firm_name=${encodeURIComponent(typedFirm.name)}`;
            return (
              <div className="bg-white rounded-xl border border-violet-100 shadow-sm p-6 relative overflow-hidden">
                {/* Background accent */}
                <div className="absolute inset-0 bg-gradient-to-br from-violet-50/60 to-transparent pointer-events-none" />
                <div className="relative">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon name="users" size={18} className="text-violet-600" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Join {typedFirm.name}
                      </h2>
                      <p className="text-sm text-slate-500 mt-0.5">
                        This firm is growing and open to expressions of interest from qualified advisers.
                      </p>
                    </div>
                  </div>

                  <div className="mb-5">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2.5">
                      Roles typically sought
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {hiringRoles.map(role => (
                        <span
                          key={role}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-700 text-xs font-semibold rounded-lg border border-violet-200"
                        >
                          <Icon name="check-circle" size={12} className="text-violet-500" />
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Link
                    href={applyUrl}
                    className="inline-flex items-center gap-2 bg-violet-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-violet-700 transition-colors text-sm shadow-sm"
                  >
                    <Icon name="send" size={15} />
                    Express Interest
                  </Link>
                </div>
              </div>
            );
          })()}

          {/* ── Request a Consultation CTA ── */}
          <div className="bg-gradient-to-r from-violet-600 to-violet-500 rounded-xl p-6 sm:p-8 text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
              Ready to Get Started?
            </h2>
            <p className="text-sm text-violet-100 mb-5 max-w-lg mx-auto">
              Request a consultation with {typedFirm.name} and take the first step toward professional financial guidance.
            </p>
            {firstMemberSlug ? (
              <Link
                href={`/advisor/${firstMemberSlug}#enquiry`}
                className="inline-flex items-center gap-2 bg-white text-violet-700 font-semibold px-6 py-3 rounded-lg hover:bg-violet-50 transition-colors text-sm shadow-md"
              >
                <Icon name="mail" size={16} />
                Request a Consultation
              </Link>
            ) : (
              <Link
                href="/find-advisor"
                className="inline-flex items-center gap-2 bg-white text-violet-700 font-semibold px-6 py-3 rounded-lg hover:bg-violet-50 transition-colors text-sm shadow-md"
              >
                <Icon name="search" size={16} />
                Find an Advisor
              </Link>
            )}
          </div>

          {/* ── Footer disclaimer ── */}
          <p className="text-[0.65rem] text-slate-400 text-center max-w-2xl mx-auto leading-relaxed">
            Information displayed on this page is provided by the advisory firm and verified where possible.
            Invest.com.au does not provide personal financial advice. Always verify credentials independently
            via the ASIC Financial Advisers Register. &copy; {CURRENT_YEAR} Invest.com.au
          </p>
        </div>
      </div>
    </>
  );
}
