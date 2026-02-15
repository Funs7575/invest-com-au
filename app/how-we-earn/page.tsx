import Link from "next/link";

export const metadata = {
  title: "How We Earn Money — Invest.com.au",
  description: "Full transparency on how Invest.com.au makes money. Affiliate commissions explained, and what it means for our rankings and your experience.",
};

export default function HowWeEarnPage() {
  return (
    <div className="py-12">
      <div className="container-custom">
        <div className="max-w-3xl mx-auto">
          {/* Breadcrumb */}
          <div className="text-sm text-slate-500 mb-6">
            <Link href="/" className="hover:text-brand">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/about" className="hover:text-brand">About</Link>
            <span className="mx-2">/</span>
            <span className="text-brand">How We Earn</span>
          </div>

          <h1 className="text-4xl font-extrabold mb-4">How We Earn Money</h1>
          <p className="text-lg text-slate-600 mb-10 leading-relaxed">
            Transparency is important to us. Here&apos;s exactly how Invest.com.au makes money
            and how it does (and doesn&apos;t) affect our content.
          </p>

          {/* Revenue Model */}
          <section className="mb-10">
            <h2 className="text-2xl font-extrabold text-brand mb-3">Our Revenue Model</h2>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 leading-relaxed text-slate-700 space-y-4">
              <p>
                When you click a &quot;Visit Broker&quot; or &quot;Sign Up&quot; button on our site and open an
                account with that broker, we may receive a referral commission from the broker.
                This is the primary way we fund the site.
              </p>
              <p>
                These commissions allow us to keep the site free, pay for hosting and data,
                and continue to research and update our reviews regularly.
              </p>
            </div>
          </section>

          {/* What This Means For You */}
          <section className="mb-10">
            <h2 className="text-2xl font-extrabold text-brand mb-3">What This Means For You</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-4 border border-green-200 bg-green-50 rounded-xl p-4">
                <span className="text-green-600 font-bold text-xl shrink-0 mt-0.5">&#10003;</span>
                <div>
                  <h3 className="font-bold text-slate-900">Free to use</h3>
                  <p className="text-sm text-slate-600 mt-0.5">You never pay us anything. Our comparison tools, calculators, and guides are completely free.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 border border-green-200 bg-green-50 rounded-xl p-4">
                <span className="text-green-600 font-bold text-xl shrink-0 mt-0.5">&#10003;</span>
                <div>
                  <h3 className="font-bold text-slate-900">No extra cost</h3>
                  <p className="text-sm text-slate-600 mt-0.5">Using our links costs you nothing extra — broker fees are the same whether you come through us or go direct.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 border border-green-200 bg-green-50 rounded-xl p-4">
                <span className="text-green-600 font-bold text-xl shrink-0 mt-0.5">&#10003;</span>
                <div>
                  <h3 className="font-bold text-slate-900">Independent rankings</h3>
                  <p className="text-sm text-slate-600 mt-0.5">We don&apos;t rank based on commission rates. Our methodology scores every broker on the same criteria, whether they pay us or not.</p>
                </div>
              </div>
            </div>
          </section>

          {/* What We Don't Do */}
          <section className="mb-10">
            <h2 className="text-2xl font-extrabold text-brand mb-3">What We Don&apos;t Do</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-4 border border-red-200 bg-red-50 rounded-xl p-4">
                <span className="text-red-500 font-bold text-xl shrink-0 mt-0.5">&#10007;</span>
                <span className="text-slate-700">We don&apos;t accept payment to rank brokers higher</span>
              </div>
              <div className="flex items-start gap-4 border border-red-200 bg-red-50 rounded-xl p-4">
                <span className="text-red-500 font-bold text-xl shrink-0 mt-0.5">&#10007;</span>
                <span className="text-slate-700">We don&apos;t sell your data to third parties</span>
              </div>
              <div className="flex items-start gap-4 border border-red-200 bg-red-50 rounded-xl p-4">
                <span className="text-red-500 font-bold text-xl shrink-0 mt-0.5">&#10007;</span>
                <span className="text-slate-700">We don&apos;t write sponsored reviews disguised as editorial</span>
              </div>
              <div className="flex items-start gap-4 border border-red-200 bg-red-50 rounded-xl p-4">
                <span className="text-red-500 font-bold text-xl shrink-0 mt-0.5">&#10007;</span>
                <span className="text-slate-700">We don&apos;t hide affiliate relationships — every CTA button is clearly labelled</span>
              </div>
            </div>
          </section>

          {/* Support Us */}
          <section className="mb-10">
            <div className="bg-amber/5 border border-amber/20 rounded-xl p-6">
              <h3 className="font-extrabold text-lg mb-2">Want to support us?</h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                If you find our site useful, using our affiliate links is the best way to support us
                at no extra cost to you. But we&apos;d rather you pick the right broker than click our link.
                Our goal is to help you make a smart decision — if that means choosing a broker we don&apos;t
                earn from, that&apos;s a win for us too.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="mb-10">
            <h2 className="text-2xl font-extrabold text-brand mb-3">Contact Us</h2>
            <p className="text-slate-700 leading-relaxed">
              Have questions about how we operate? Want to report an error or suggest a broker we should review?
              Get in touch at{" "}
              <a href="mailto:hello@invest.com.au" className="text-amber hover:underline font-semibold">
                hello@invest.com.au
              </a>.
            </p>
          </section>

          <div className="text-center">
            <Link href="/about" className="text-amber font-semibold hover:underline">
              &larr; Back to About
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
