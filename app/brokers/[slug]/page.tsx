import { permanentRedirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

/**
 * /brokers/[slug] → /broker/[slug] (singular) redirect.
 *
 * The canonical broker profile lives at /broker/[slug]. This route
 * catches the natural plural URL — users, search engines and
 * inbound links occasionally use /brokers/foo instead of /broker/foo
 * — and forwards them to the real profile with a 308 so link
 * equity transfers cleanly.
 *
 * Mirrors the existing /brokers (plural list) → /compare redirect.
 */
export default async function BrokersSlugRedirectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(`/broker/${encodeURIComponent(slug)}`);
}
