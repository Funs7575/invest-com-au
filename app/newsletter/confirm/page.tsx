import type { Metadata } from "next";
import Link from "next/link";
import { confirmSubscription } from "@/lib/newsletter";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Confirm your subscription",
  description: "Confirm your Invest.com.au newsletter subscription.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/newsletter/confirm" },
};

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function NewsletterConfirmPage({ searchParams }: Props) {
  const { token } = await searchParams;

  // Missing token — show instructions, don't try to confirm anything.
  if (!token) {
    return (
      <ConfirmShell heading="Confirmation link missing" tone="error">
        <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-4">
          We couldn&apos;t find a confirmation token in the link you clicked.
          The link may be old or incomplete.
        </p>
        <p className="text-sm md:text-base text-slate-600 leading-relaxed">
          If you just subscribed and haven&apos;t received a confirmation
          email,{" "}
          <Link
            href="/newsletter/subscribe"
            className="font-semibold text-amber-700 underline hover:text-amber-900"
          >
            try subscribing again
          </Link>{" "}
          — we&apos;ll re-send the link.
        </p>
      </ConfirmShell>
    );
  }

  const result = await confirmSubscription(token);

  if (result.ok) {
    return (
      <ConfirmShell heading="You're all set!" tone="success">
        <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-4">
          Thanks{result.email ? `, ${result.email}` : ""} — your subscription
          is confirmed. The next weekly digest will land in your inbox on
          Monday morning.
        </p>
        <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-6">
          Want to dig in now? Start with the latest broker fee changes or our
          top picks.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/brokers"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-colors"
          >
            Browse brokers
          </Link>
          <Link
            href="/newsletter"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors"
          >
            Past editions
          </Link>
        </div>
      </ConfirmShell>
    );
  }

  // Error branch — token invalid, already used, or not found.
  const friendlyError =
    result.error === "invalid_token"
      ? "This confirmation link looks malformed."
      : result.error === "not_found"
        ? "This confirmation link doesn't match any subscription. It may have already been used, or the link may be expired."
        : "Something went wrong confirming your subscription.";

  return (
    <ConfirmShell heading="Couldn't confirm" tone="error">
      <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-4">
        {friendlyError}
      </p>
      <p className="text-sm md:text-base text-slate-600 leading-relaxed">
        You can{" "}
        <Link
          href="/newsletter/subscribe"
          className="font-semibold text-amber-700 underline hover:text-amber-900"
        >
          subscribe again
        </Link>{" "}
        and we&apos;ll send a fresh confirmation link.
      </p>
    </ConfirmShell>
  );
}

function ConfirmShell({
  heading,
  tone,
  children,
}: {
  heading: string;
  tone: "success" | "error";
  children: React.ReactNode;
}) {
  const toneStyles =
    tone === "success"
      ? "from-emerald-50 via-white to-white border-emerald-200"
      : "from-red-50 via-white to-white border-red-200";
  const iconBg =
    tone === "success"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-red-100 text-red-700";
  const icon = tone === "success" ? "✓" : "!";

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
          <span className="text-slate-700">Confirm</span>
        </nav>

        <div
          className={`bg-gradient-to-br ${toneStyles} border rounded-2xl p-6 md:p-10`}
        >
          <div
            aria-hidden
            className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center text-2xl font-extrabold mb-4`}
          >
            {icon}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
            {heading}
          </h1>
          {children}
          <div className="mt-8 pt-5 border-t border-slate-200">
            <p className="text-[11px] text-slate-500">
              Need help?{" "}
              <Link
                href="/contact"
                className="underline hover:text-slate-900"
              >
                Contact us
              </Link>{" "}
              — we reply to every email.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
