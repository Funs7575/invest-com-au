import type { Metadata } from "next";
import AcceptInviteClient from "./AcceptInviteClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Accept team invitation · Invest.com.au",
  // Token-bearing landing page — never index.
  robots: { index: false, follow: false },
};

/**
 * Landing page for an expert-team invitation link (AJ-2). The invite email
 * points here with `?token=`. Existing providers (with an advisor session)
 * accept in one click; new providers are guided to create a profile and
 * return. Acceptance is bound to the invited identity server-side.
 */
export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <div className="min-h-screen bg-slate-50 py-16">
      <div className="container-custom max-w-md">
        <AcceptInviteClient token={token ?? ""} />
      </div>
    </div>
  );
}
