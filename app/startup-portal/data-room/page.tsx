import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DataRoomClient from "./DataRoomClient";

export const dynamic = "force-dynamic";

async function getDataRoomData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/account/login?redirect=/startup-portal/data-room");

  const { data: profile } = await supabase
    .from("startup_profiles")
    .select("id, company_name, status")
    .eq("owner_user_id", user.id)
    .in("status", ["active", "draft"])
    .maybeSingle();
  if (!profile) redirect("/startup-signup");

  const [filesRes, inquiriesRes] = await Promise.all([
    supabase
      .from("startup_data_room_files")
      .select("id, filename, category, requires_wholesale_cert, uploaded_at, storage_path")
      .eq("startup_id", profile.id)
      .order("uploaded_at", { ascending: false }),
    supabase
      .from("startup_investor_inquiries")
      .select("id, investor_user_id, status, created_at, startup_rounds!inner(startup_id)")
      .eq("startup_rounds.startup_id", profile.id)
      .in("status", ["pending", "accepted"])
      .order("created_at", { ascending: false }),
  ]);

  return {
    profile,
    files: filesRes.data ?? [],
    inquiries: inquiriesRes.data ?? [],
  };
}

export default async function DataRoomPage() {
  const { profile, files, inquiries } = await getDataRoomData();
  return (
    <DataRoomClient
      profile={profile}
      initialFiles={files}
      inquiries={inquiries}
    />
  );
}
