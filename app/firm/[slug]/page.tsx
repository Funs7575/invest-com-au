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
    .select("name, afsl_number, location_display, bio")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!firm) return {};

  const title = `${firm.name} — Advisory Firm Profile | Invest.com.au`;
  const description = firm.bio
    ? firm.bio.slice(0, 155)
    : `${firm.name} is a verified advisory firm${firm.location_display ? ` based in ${firm.location_display}` : ""}${firm.afsl_number ? ` (AFSL ${firm.afsl_number})` : ""}. View team members and request a consultation.`;

  return {
    title,
    description,
    openGraph: {
      title: `${firm.name} — Invest.com.au`,
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

  const firstMemberSlug = members[0]?.slug;

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
            <div className="bg-gradient-to-r from-violet-600 to-violet-500 h-24 sm:h-28" />
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
                    />
                  ) : (
                    <span className="text-2xl sm:text-3xl font-bold text-violet-600">
                      {firmInitials(typedFirm.name)}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0 pt-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 truncate">
                    {typedFirm.name}
                  </h1>
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

          {/* ── Trust Signals + Contact ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Trust Signals */}
            <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Icon name="shield" size={16} className="text-violet-600" />
                Trust Signals
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
