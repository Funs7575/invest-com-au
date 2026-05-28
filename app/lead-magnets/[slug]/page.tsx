import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { breadcrumbJsonLd, absoluteUrl, SITE_URL } from "@/lib/seo";
import { LEAD_MAGNETS } from "@/lib/lead-magnets";
import LeadMagnetCapture from "@/components/LeadMagnetCapture";
import Link from "next/link";

export const revalidate = 86400;

export function generateStaticParams() {
  return LEAD_MAGNETS.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const magnet = LEAD_MAGNETS.find((m) => m.slug === slug);
  if (!magnet) return {};
  return {
    title: `${magnet.title} — Free Download | invest.com.au`,
    description: magnet.description,
    alternates: { canonical: `${SITE_URL}/lead-magnets/${slug}` },
    openGraph: {
      title: magnet.title,
      description: magnet.description,
      url: `${SITE_URL}/lead-magnets/${slug}`,
    },
  };
}

export default async function LeadMagnetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const magnet = LEAD_MAGNETS.find((m) => m.slug === slug);
  if (!magnet) notFound();

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Free Guides", url: absoluteUrl("/lead-magnets") },
    { name: magnet.title },
  ]);

  const hubHref = `/${magnet.hubSlug}`;

  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      {/* Hero */}
      <div className="bg-gradient-to-br from-amber-900 to-amber-700 text-white py-14">
        <div className="container-custom max-w-3xl">
          <nav className="text-sm text-amber-200 mb-4 flex items-center gap-1.5">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link href={hubHref} className="hover:text-white transition-colors capitalize">
              {magnet.hubSlug.replace(/-/g, " ")}
            </Link>
            <span>/</span>
            <span className="text-white">Free Guide</span>
          </nav>
          <div className="inline-block bg-amber-800 text-amber-200 text-xs font-medium px-3 py-1 rounded-full mb-4">
            Free download
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            {magnet.title}
          </h1>
          <p className="text-lg text-amber-100 max-w-2xl">{magnet.description}</p>
        </div>
      </div>

      {/* Capture Form */}
      <div className="py-12">
        <div className="container-custom max-w-3xl">
          <LeadMagnetCapture magnet={magnet} />
        </div>
      </div>

      {/* Back to Hub */}
      <div className="pb-12">
        <div className="container-custom max-w-3xl text-center">
          <Link
            href={hubHref}
            className="inline-block text-amber-700 font-medium hover:underline text-sm"
          >
            ← Back to {magnet.hubSlug.replace(/-/g, " ")} hub
          </Link>
        </div>
      </div>
    </div>
  );
}
