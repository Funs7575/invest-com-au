import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import SwitchClient from "./SwitchClient";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";

export const metadata = {
  title: "Switching Plan Generator — Calculate Your Savings",
  description: "Generate a step-by-step switching plan between Australian brokers. See how much you'll save on fees per year.",
  openGraph: {
    title: `Switching Plan Generator — ${SITE_NAME}`,
    description: "Generate a step-by-step switching plan between Australian brokers.",
    images: [{ url: "/api/og?title=Switching+Plan+Generator&subtitle=Calculate+Your+Annual+Savings&type=default", width: 1200, height: 630 }],
  },
  alternates: { canonical: "/switch" },
};

export default async function SwitchPage() {
  const supabase = await createClient();
  const { data: brokers } = await supabase
    .from("brokers")
    .select("*")
    .eq("status", "active")
    .order("name");

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Switch Brokers" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <SwitchClient brokers={(brokers as Broker[]) || []} />
    </>
  );
}
