import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Disabled pre-AFSL: this endpoint emitted imperative tax directives
// ("Sell BHP to harvest a loss…") with no compliance filter and had no live UI
// caller. It returns 410 Gone until a compliant rebuild. The prior analysis
// implementation is preserved in git history.
export async function POST(_req: Request) {
  return NextResponse.json(
    { error: "This endpoint is no longer available." },
    { status: 410 },
  );
}
