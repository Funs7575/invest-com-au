import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET — list all pipeline entries
export async function GET() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("bd_pipeline")
      .select("*")
      .order("updated_at", { ascending: false });
    return NextResponse.json(data || []);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch pipeline" }, { status: 500 });
  }
}

// POST — create or update a pipeline entry
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  const { id, ...fields } = body;

  if (!fields.company_name) {
    return NextResponse.json({ error: "company_name required" }, { status: 400 });
  }

  fields.updated_at = new Date().toISOString();

  if (id) {
    // Update existing
    const { data, error } = await supabase
      .from("bd_pipeline")
      .update(fields)
      .eq("id", id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } else {
    // Create new
    const { data, error } = await supabase
      .from("bd_pipeline")
      .insert(fields)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }
}

// DELETE — remove a pipeline entry
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await supabase.from("bd_pipeline").delete().eq("id", id);
  return NextResponse.json({ deleted: true });
}
