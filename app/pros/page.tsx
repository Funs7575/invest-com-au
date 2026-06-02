import { redirect } from "next/navigation";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Become a provider — Invest.com.au",
  alternates: { canonical: "/pros/join" },
};

/**
 * Bare `/pros` has no dashboard of its own (the provider workspace is
 * `/advisor-portal`); the public entry point is the join wizard. Redirect
 * instead of 404ing.
 */
export default function ProsIndexPage() {
  redirect("/pros/join");
}
