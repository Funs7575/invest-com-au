/**
 * /teams/new — Pro Squad self-service creation wizard.
 *
 * Server component wrapper:
 *   - Emits breadcrumb JSON-LD (public route SEO gate per CLAUDE.md).
 *   - Renders the client wizard (`TeamNewWizard`) which posts to /api/teams/new.
 *
 * Auth happens server-side in the POST handler — the page itself is
 * publicly addressable so we can deep-link advisors in onboarding emails;
 * unauthenticated callers see the wizard but cannot submit.
 */

import type { Metadata } from "next";

import {
  absoluteUrl,
  breadcrumbJsonLd,
  CURRENT_YEAR,
  SITE_URL,
} from "@/lib/seo";
import TeamNewWizard from "./_components/TeamNewWizard";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Create a Pro Squad — Invest.com.au (${CURRENT_YEAR})`,
  description:
    "Verified advisors can form a Pro Squad in under 2 minutes — bundle complementary specialists so Match Requests in your chosen templates route to one team.",
  alternates: { canonical: `${SITE_URL}/teams/new` },
};

export default function CreateSquadPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Experts", url: absoluteUrl("/advisors") },
    { name: "Create a Pro Squad" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-3xl mx-auto px-4 py-3 text-xs text-slate-500">
            Home / Experts / <span className="text-slate-800 font-medium">Create a Pro Squad</span>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 py-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3">
            Create a Pro Squad
          </h1>
          <p className="text-slate-600 mb-8 leading-relaxed">
            A Pro Squad bundles complementary specialists so consumer Match Requests
            in your selected templates route to one team. New squads enter a verification
            queue and become public after admin approval — usually within 1 business day.
          </p>
          <TeamNewWizard />
        </div>
      </div>
    </>
  );
}
