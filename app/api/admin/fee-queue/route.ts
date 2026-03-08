import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET — list pending fee changes
export async function GET() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("fee_update_queue")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    return NextResponse.json(data || []);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch fee queue" }, { status: 500 });
  }
}

// POST — approve or reject a fee change
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { id, action } = await request.json();

  if (!id || !action) return NextResponse.json({ error: "id and action required" }, { status: 400 });

  const { data: item } = await supabase
    .from("fee_update_queue")
    .select("*")
    .eq("id", id)
    .single();

  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "approve") {
    // Apply the fee change to the broker
    const updateField: Record<string, unknown> = {};
    updateField[item.field_name] = item.new_value;
    updateField.fee_last_checked = new Date().toISOString();

    // Also update numeric value if it's a parseable number
    const numMatch = item.new_value?.match(/([\d.]+)/);
    if (numMatch) {
      const numericFields: Record<string, string> = {
        asx_fee: "asx_fee_value",
        us_fee: "us_fee_value",
        fx_rate: "fx_rate",
      };
      const numField = numericFields[item.field_name];
      if (numField && numField !== item.field_name) {
        updateField[numField] = parseFloat(numMatch[1]);
      }
    }

    await supabase.from("brokers").update(updateField).eq("id", item.broker_id);

    // Log the change in broker_data_changes
    await supabase.from("broker_data_changes").insert({
      broker_id: item.broker_id,
      field_name: item.field_name,
      old_value: item.old_value,
      new_value: item.new_value,
      change_type: "fee_scraper_approved",
    }).catch(() => {});

    await supabase.from("fee_update_queue").update({
      status: "approved",
      reviewed_by: "admin",
      reviewed_at: new Date().toISOString(),
    }).eq("id", id);

    return NextResponse.json({ status: "approved", applied: true });
  }

  if (action === "reject") {
    await supabase.from("fee_update_queue").update({
      status: "rejected",
      reviewed_by: "admin",
      reviewed_at: new Date().toISOString(),
    }).eq("id", id);
    return NextResponse.json({ status: "rejected" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
