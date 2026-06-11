import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ClubCreateForm from "@/components/clubs/ClubCreateForm";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Investment Clubs",
  description: "Create or join small groups to share investment research and watchlists. Information-sharing only — general information, not personal advice.",
  robots: "noindex, nofollow",
};

export default async function ClubsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/clubs");

  const { data: memberships } = await supabase
    .from("club_members")
    .select("role, joined_at, display_name, investment_clubs(id, name, slug, description, created_at)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  const clubs = (memberships ?? []).map((row) => {
    const club = row.investment_clubs as unknown as Record<string, unknown> | null;
    return {
      id: club?.id as string,
      name: club?.name as string,
      slug: club?.slug as string,
      description: club?.description as string | null,
      role: row.role,
      displayName: row.display_name,
    };
  });

  return (
    <div className="container-custom max-w-2xl py-10">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Investment Clubs</h1>
      <p className="text-sm text-slate-500 mb-6">
        Small groups for sharing research, watchlists, and ideas.{" "}
        <span className="text-amber-700">Information-sharing only — not personal advice.</span>
      </p>

      {/* Compliance notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 mb-6">
        {GENERAL_ADVICE_WARNING}
      </div>

      {/* My clubs */}
      {clubs.length > 0 && (
        <section className="mb-8">
          <h2 className="text-base font-bold text-slate-800 mb-3">My Clubs</h2>
          <ul className="space-y-2">
            {clubs.map((club) => (
              <li key={club.id}>
                <Link
                  href={`/clubs/${club.id}`}
                  className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-blue-300 transition-colors group"
                >
                  <div>
                    <p className="font-semibold text-slate-800 group-hover:text-blue-700">{club.name}</p>
                    {club.description && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{club.description}</p>
                    )}
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {club.role === "owner" ? "Owner" : "Member"} · {club.displayName}
                    </p>
                  </div>
                  <span className="text-slate-300 group-hover:text-blue-400">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Create club */}
      <section>
        <h2 className="text-base font-bold text-slate-800 mb-3">
          {clubs.length === 0 ? "Create your first club" : "Create another club"}
        </h2>
        <ClubCreateForm />
      </section>
    </div>
  );
}
