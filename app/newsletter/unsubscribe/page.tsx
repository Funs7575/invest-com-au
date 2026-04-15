import type { Metadata } from "next";
import Link from "next/link";
import { unsubscribeByToken } from "@/lib/newsletter";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Unsubscribe from the newsletter",
  description: "Unsubscribe from the Invest.com.au newsletter.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/newsletter/unsubscribe" },
};

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function NewsletterUnsubscribePage({
  searchParams,
}: Props) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <UnsubShell heading="Unsubscribe link missing" tone="error">
        <p className="text-sm md:text-base text-slate-600 leading-relaxed">
          We couldn&apos;t find an unsubscribe token in the link you clicked.
          If you received an email from us, use the unsubscribe link at the
          bottom of that email — it&apos;s the only one we can use to identify
          your subscription.
        </p>
      </UnsubShell>
    );
  }

  const result = await unsubscribeByToken(token);

  if (result.ok) {
    return (
      <UnsubShell heading="You're unsubscribed" tone="neutral">
        <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-4">
          {result.email ? (
            <>
              <strong className="font-semibold text-slate-900">
                {result.email}
              </strong>{" "}
              has been removed from the newsletter. You won&apos;t receive any
              further emails from us.
            </>
          ) : (
            <>
              You&apos;ve been removed from the newsletter. You won&apos;t
              receive any further emails from us.
            </>
          )}
        </p>
        <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-6">
          Sorry to see you go. If there&apos;s something we could do better,
          we&apos;d genuinely like to hear it.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/contact"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-colors"
          >
            Send feedback
          </Link>
          <Link
            href="/newsletter/subscribe"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors"
          >
            Resubscribe
          </Link>
        </div>
      </UnsubShell>
    );
  }

  const friendlyError =
    result.error === "invalid_token"
      ? "This unsubscribe link looks malformed."
      : result.error === "not_found"
        ? "This unsubscribe link doesn't match any subscription — it may have already been used."
        : "Something went wrong removing you from the list.";

  return (
    <UnsubShell heading="Couldn't unsubscribe" tone="error">
      <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-4">
        {friendlyError}
      </p>
      <p className="text-sm md:text-base text-slate-600 leading-relaxed">
        If you keep receiving emails from us,{" "}
        <Link
          href="/contact"
          className="font-semibold text-slate-900 underline hover:text-amber-700"
        >
          contact us directly
        </Link>{" "}
        and we&apos;ll remove you manually.
      </p>
    </UnsubShell>
  );
}

function UnsubShell({
  heading,
  tone,
  children,
}: {
  heading: string;
  tone: "neutral" | "error";
  children: React.ReactNode;
}) {
  const toneStyles =
    tone === "neutral"
      ? "from-slate-50 via-white to-white border-slate-200"
      : "from-red-50 via-white to-white border-red-200";

  return (
    <div className="pt-5 pb-8 md:py-12">
      <div className="container-custom max-w-2xl">
        <nav className="text-xs md:text-sm text-slate-500 mb-2 md:mb-4">
          <Link href="/" className="hover:text-slate-900">
            Home
          </Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <Link href="/newsletter" className="hover:text-slate-900">
            Newsletter
          </Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <span className="text-slate-700">Unsubscribe</span>
        </nav>

        <div
          className={`bg-gradient-to-br ${toneStyles} border rounded-2xl p-6 md:p-10`}
        >
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
            {heading}
          </h1>
          {children}
        </div>
      </div>
    </div>
  );
}
