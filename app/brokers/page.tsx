import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

/**
 * /brokers → /compare redirect.
 *
 * The canonical broker listing lives at /compare. This redirect
 * catches the most natural URL a user or search engine would try
 * (/brokers) and sends them to the right place with a 308 so
 * link equity transfers.
 */
export default function BrokersRedirectPage() {
  redirect("/compare");
}
