import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function StartupPortalInvestorsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/startup-portal/investors");

  const { data: profile } = await supabase
    .from("startup_profiles")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (!profile) redirect("/startup-signup");

  const { data: inquiries } = await supabase
    .from("startup_investor_inquiries")
    .select("id, status, inquiry_message, created_at, data_room_access_granted_at, startup_rounds!inner(startup_id)")
    .eq("startup_rounds.startup_id", profile.id)
    .order("created_at", { ascending: false });

  const STATUS_COLOURS: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    accepted: "bg-emerald-100 text-emerald-800",
    declined: "bg-red-100 text-red-700",
    expired: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <Link href="/startup-portal" className="text-xs text-gray-400 hover:text-gray-600">← Dashboard</Link>
          <h1 className="text-lg font-semibold text-gray-900 mt-0.5">Investor pipeline</h1>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {!inquiries || inquiries.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center">
            <p className="text-gray-600 font-medium mb-2">No inquiries yet</p>
            <p className="text-sm text-gray-400">Investor inquiries will appear here once your round is live.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {inquiries.map((inq) => (
              <div key={inq.id} className="px-5 py-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">{new Date(inq.created_at).toLocaleDateString("en-AU")}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOURS[inq.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {inq.status}
                  </span>
                </div>
                {inq.inquiry_message && (
                  <p className="text-sm text-gray-700 mt-1 line-clamp-2">{inq.inquiry_message}</p>
                )}
                {inq.data_room_access_granted_at && (
                  <p className="text-xs text-emerald-700 mt-1">
                    Data room access granted {new Date(inq.data_room_access_granted_at).toLocaleDateString("en-AU")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
