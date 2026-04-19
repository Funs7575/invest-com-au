import type { Metadata } from "next";
import BrokerReviewInviteClient from "./BrokerReviewInviteClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leave a review — invest.com.au",
  robots: { index: false, follow: false },
};

export default async function BrokerReviewInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <BrokerReviewInviteClient token={token} />;
}
