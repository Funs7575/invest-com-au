import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminEmails } from "@/lib/admin";
import { classifyText } from "@/lib/text-moderation";
import { classifyListingForScam } from "@/lib/invest-listing-scam-classifier";
import { classifyApplication } from "@/lib/advisor-application-classifier";
import { classifyCampaign } from "@/lib/marketplace-campaign-classifier";

/**
 * POST /api/admin/automation/dry-run
 *
 * Admin-only endpoint that runs a classifier with given input and
 * returns the verdict + signals WITHOUT writing anything to the DB
 * or triggering any side effects. Used by the dashboard's
 * classifier tester UI so admins can:
 *
 *   - Paste a review/listing/application and preview the verdict
 *   - Tune thresholds and re-run to check the change took effect
 *   - Debug why a particular row got escalated by seeing all signals
 *
 * Body: { classifier, input }
 *
 *   classifier: 'text_moderation' | 'listing_scam' | 'advisor_application' | 'marketplace_campaign'
 *   input:      classifier-specific context object
 *
 * The classifiers themselves are pure — the work here is just
 * dispatching and serialising the result. No side effects at all.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!getAdminEmails().includes(user.email.toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const classifier = typeof body.classifier === "string" ? body.classifier : null;
  const input = body.input;

  if (!classifier || !input || typeof input !== "object") {
    return NextResponse.json({ error: "Missing classifier / input" }, { status: 400 });
  }

  try {
    switch (classifier) {
      case "text_moderation": {
        const result = classifyText(input);
        return NextResponse.json({ ok: true, result });
      }
      case "listing_scam": {
        const result = classifyListingForScam(input);
        return NextResponse.json({ ok: true, result });
      }
      case "advisor_application": {
        const result = classifyApplication(input);
        return NextResponse.json({ ok: true, result });
      }
      case "marketplace_campaign": {
        const result = classifyCampaign(input);
        return NextResponse.json({ ok: true, result });
      }
      default:
        return NextResponse.json(
          { error: `Unknown classifier: ${classifier}` },
          { status: 400 },
        );
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "classifier_threw" },
      { status: 500 },
    );
  }
}
