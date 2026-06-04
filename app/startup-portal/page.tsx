import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

async function getStartupDashboardData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/startup-portal");

  const { data: profile } = await supabase
    .from("startup_profiles")
    .select("id, slug, company_name, stage, status, sector, esic_eligible_self_attested, esic_verified_at, created_at")
    .eq("owner_user_id", user.id)
    .in("status", ["active", "draft"])
    .maybeSingle();

  if (!profile) redirect("/startup-signup");

  const [roundsRes, inquiriesRes] = await Promise.all([
    supabase
      .from("startup_rounds")
      .select("id, instrument, status, target_aud_cents, raised_aud_cents, closes_at")
      .eq("startup_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(5),
    // Join through rounds: inquiries.round_id → rounds.startup_id
    supabase
      .from("startup_investor_inquiries")
      .select("id, status, created_at, startup_rounds!inner(startup_id)")
      .eq("startup_rounds.startup_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return {
    profile,
    rounds: roundsRes.data ?? [],
    inquiries: inquiriesRes.data ?? [],
  };
}

function StatusBadge({ status }: { status: string }) {
  const colours: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-800",
    active: "bg-emerald-100 text-emerald-800",
    archived: "bg-gray-100 text-gray-600",
    open: "bg-blue-100 text-blue-800",
    committed: "bg-purple-100 text-purple-800",
    closed: "bg-gray-100 text-gray-600",
    withdrawn: "bg-red-100 text-red-700",
    pending: "bg-yellow-100 text-yellow-800",
    accepted: "bg-emerald-100 text-emerald-800",
    declined: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colours[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

function centsToAud(cents: number): string {
  if (cents >= 1_000_000_00) return `$${(cents / 1_000_000_00).toFixed(1)}M`;
  if (cents >= 1_000_00) return `$${(cents / 1_000_00).toFixed(0)}k`;
  return `$${(cents / 100).toFixed(0)}`;
}

const NAV = [
  { href: "/startup-portal", label: "Dashboard", active: true },
  { href: "/startup-portal/round", label: "Round" },
  { href: "/startup-portal/data-room", label: "Data Room" },
  { href: "/startup-portal/investors", label: "Investors" },
  { href: "/startup-portal/profile", label: "Profile" },
  { href: "/startup-portal/esic-verification", label: "ESIC" },
];

export default async function StartupPortalPage() {
  const { profile, rounds, inquiries } = await getStartupDashboardData();

  const activeRound = rounds.find((r) => r.status === "open");
  const pendingInquiries = inquiries.filter((i) => i.status === "pending").length;
  const esicVerified = !!profile.esic_verified_at;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <Link href="/" className="text-xs text-gray-400 hover:text-gray-600">invest.com.au</Link>
            <h1 className="text-lg font-semibold text-gray-900 mt-0.5">{profile.company_name}</h1>
          </div>
          <StatusBadge status={profile.status} />
        </div>
        <nav className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-1 pb-0">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                n.active
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Draft status banner */}
        {profile.status === "draft" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-medium text-amber-900">Profile under review</p>
            <p className="text-xs text-amber-700 mt-1">
              Your startup profile is being reviewed by the invest.com.au team.
              You&apos;ll receive an email once approved — usually within 1–2 business days.
            </p>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active round</p>
            {activeRound ? (
              <>
                <p className="text-2xl font-semibold text-gray-900 mt-2">
                  {centsToAud(activeRound.raised_aud_cents ?? 0)}
                  <span className="text-base font-normal text-gray-400"> / {centsToAud(activeRound.target_aud_cents)}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1 capitalize">{activeRound.instrument.replace(/_/g, " ")} · <StatusBadge status={activeRound.status} /></p>
              </>
            ) : (
              <p className="text-sm text-gray-400 mt-2">No open round</p>
            )}
            <Link href="/startup-portal/round" className="text-xs text-blue-600 hover:underline mt-3 inline-block">
              {activeRound ? "Manage round →" : "Open a round →"}
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Investor inquiries</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">{inquiries.length}</p>
            <p className="text-xs text-gray-500 mt-1">{pendingInquiries} pending response</p>
            <Link href="/startup-portal/investors" className="text-xs text-blue-600 hover:underline mt-3 inline-block">
              View pipeline →
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">ESIC status</p>
            <div className="mt-2">
              {esicVerified ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700 text-sm font-medium">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Verified
                </span>
              ) : profile.esic_eligible_self_attested ? (
                <span className="text-sm text-amber-700">Self-attested — pending admin review</span>
              ) : (
                <span className="text-sm text-gray-400">Not attested</span>
              )}
            </div>
          </div>
        </div>

        {/* Recent rounds */}
        {rounds.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Rounds</h2>
              <Link href="/startup-portal/round/new" className="text-xs text-blue-600 hover:underline">
                + New round
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {rounds.map((r) => (
                <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-900 capitalize">{r.instrument.replace(/_/g, " ")}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {centsToAud(r.raised_aud_cents ?? 0)} / {centsToAud(r.target_aud_cents)} raised
                    </span>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent inquiries */}
        {inquiries.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Recent investor inquiries</h2>
              <Link href="/startup-portal/investors" className="text-xs text-blue-600 hover:underline">
                View all
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {inquiries.slice(0, 5).map((i) => (
                <div key={i.id} className="px-5 py-3 flex items-center justify-between">
                  <span className="text-xs text-gray-500">{new Date(i.created_at).toLocaleDateString("en-AU")}</span>
                  <StatusBadge status={i.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {rounds.length === 0 && inquiries.length === 0 && profile.status === "active" && (
          <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center">
            <p className="text-gray-600 font-medium mb-2">Ready to raise?</p>
            <p className="text-sm text-gray-400 mb-4">Open your first round to start connecting with wholesale investors.</p>
            <Link
              href="/startup-portal/round/new"
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Open a round
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
