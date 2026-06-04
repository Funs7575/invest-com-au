import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function centsToAud(cents: number): string {
  if (cents >= 1_000_000_00) return `$${(cents / 1_000_000_00).toFixed(1)}M`;
  if (cents >= 1_000_00) return `$${(cents / 1_000_00).toFixed(0)}k`;
  return `$${(cents / 100).toFixed(0)}`;
}

export default async function StartupPortalRoundPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/startup-portal/round");

  const { data: profile } = await supabase
    .from("startup_profiles")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (!profile) redirect("/startup-signup");

  const { data: rounds } = await supabase
    .from("startup_rounds")
    .select("id, instrument, status, target_aud_cents, raised_aud_cents, lead_investor_name, closes_at, wholesale_only, created_at")
    .eq("startup_id", profile.id)
    .order("created_at", { ascending: false });

  const STATUS_COLOURS: Record<string, string> = {
    open: "bg-blue-100 text-blue-800",
    committed: "bg-purple-100 text-purple-800",
    closed: "bg-gray-100 text-gray-600",
    withdrawn: "bg-red-100 text-red-700",
  };

  const INSTRUMENT_LABELS: Record<string, string> = {
    safe: "SAFE", safe_t: "SAFE-T",
    convertible_note: "Convertible Note", priced_equity: "Priced Equity",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <Link href="/startup-portal" className="text-xs text-gray-400 hover:text-gray-600">← Dashboard</Link>
            <h1 className="text-lg font-semibold text-gray-900 mt-0.5">Round management</h1>
          </div>
          <Link
            href="/startup-portal/round/new"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New round
          </Link>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {!rounds || rounds.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center">
            <p className="text-gray-600 font-medium mb-2">No rounds yet</p>
            <p className="text-sm text-gray-400 mb-4">Open your first funding round to start connecting with investors.</p>
            <Link
              href="/startup-portal/round/new"
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Open a round
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {rounds.map((r) => (
              <div key={r.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {INSTRUMENT_LABELS[r.instrument] ?? r.instrument}
                  </h3>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOURS[r.status] ?? "bg-gray-100"}`}>
                    {r.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-gray-600">
                  <div>
                    <span className="text-gray-400 block">Target</span>
                    {centsToAud(r.target_aud_cents)}
                  </div>
                  <div>
                    <span className="text-gray-400 block">Raised</span>
                    {centsToAud(r.raised_aud_cents ?? 0)}
                  </div>
                  {r.closes_at && (
                    <div>
                      <span className="text-gray-400 block">Closes</span>
                      {new Date(r.closes_at).toLocaleDateString("en-AU")}
                    </div>
                  )}
                  {r.lead_investor_name && (
                    <div className="col-span-2 sm:col-span-3">
                      <span className="text-gray-400">Lead investor: </span>{r.lead_investor_name}
                    </div>
                  )}
                  {r.wholesale_only && (
                    <div><span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-700">Wholesale only</span></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
