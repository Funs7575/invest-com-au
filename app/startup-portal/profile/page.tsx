import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function StartupPortalProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/startup-portal/profile");

  const { data: profile } = await supabase
    .from("startup_profiles")
    .select("id, company_name, slug, abn, founded_at, stage, sector, linkedin_url, status")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (!profile) redirect("/startup-signup");

  const STAGE_LABELS: Record<string, string> = {
    pre_seed: "Pre-seed", seed: "Seed", series_a: "Series A",
    series_b: "Series B", series_c: "Series C", growth: "Growth",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <Link href="/startup-portal" className="text-xs text-gray-400 hover:text-gray-600">← Dashboard</Link>
          <h1 className="text-lg font-semibold text-gray-900 mt-0.5">Company profile</h1>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {[
            ["Company name", profile.company_name],
            ["Slug", profile.slug],
            ["ABN", profile.abn ?? "—"],
            ["Founded", profile.founded_at ? new Date(profile.founded_at).getFullYear().toString() : "—"],
            ["Stage", STAGE_LABELS[profile.stage] ?? profile.stage],
            ["Sectors", Array.isArray(profile.sector) ? profile.sector.join(", ") : "—"],
            ["LinkedIn", profile.linkedin_url ?? "—"],
            ["Status", profile.status],
          ].map(([label, value]) => (
            <div key={label} className="px-5 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-500">{label}</span>
              <span className="text-sm font-medium text-gray-900">{value}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Profile editing is available once your account is approved. Contact{" "}
          <a href="mailto:support@invest.com.au" className="text-blue-600 hover:underline">support</a> to update details.
        </p>
      </main>
    </div>
  );
}
