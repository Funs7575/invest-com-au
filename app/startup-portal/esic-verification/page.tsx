import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import EsicVerificationClient from "./EsicVerificationClient";

export const dynamic = "force-dynamic";

export default async function EsicVerificationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?next=/startup-portal/esic-verification");

  const { data: profile } = await supabase
    .from("startup_profiles")
    .select("id, esic_verified_at, esic_eligible_self_attested")
    .eq("owner_user_id", user.id)
    .in("status", ["active", "draft"])
    .maybeSingle();

  if (!profile) redirect("/startup-signup");

  // Most recent verification record for this startup
  const { data: verification } = await supabase
    .from("esic_verifications")
    .select("id, outcome, created_at, reviewed_at, notes")
    .eq("startup_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <nav aria-label="Breadcrumb" className="text-xs text-gray-500 mb-1">
            <Link href="/startup-portal" className="hover:text-blue-600">
              Founder Portal
            </Link>
            <span className="mx-1.5">/</span>
            <span>ESIC Verification</span>
          </nav>
          <h1 className="text-lg font-semibold text-gray-900">ESIC Verification</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Verified ESIC-eligible startups display a badge on their public listing and in investor search results.
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <EsicVerificationClient
          existing={verification}
          esicVerifiedAt={profile.esic_verified_at}
        />
      </main>
    </div>
  );
}
