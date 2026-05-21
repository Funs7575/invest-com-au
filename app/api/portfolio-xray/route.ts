import { NextResponse } from "next/server";

export const runtime = "edge";

// Disabled pre-AFSL: this endpoint emitted imperative "switch to [Broker]" and
// risk directives with no compliance filter and had no live UI caller (the
// /portfolio-xray page computes client-side). It returns 410 Gone until a
// compliant rebuild. The prior analysis implementation is preserved in git history.
export async function POST() {
  return NextResponse.json(
    { error: "This endpoint is no longer available." },
    { status: 410 },
  );
}
