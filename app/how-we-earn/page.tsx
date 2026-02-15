import Link from "next/link";

export default function HowWeEarnPage() {
  return (
    <div className="py-12">
      <div className="container-custom">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-6">How We Earn Money</h1>

          <div className="space-y-6 text-slate-700 leading-relaxed">
            <p className="text-lg">
              Transparency is important to us. Here&apos;s exactly how Invest.com.au makes money
              and how it does (and doesn&apos;t) affect our content.
            </p>

            <h2 className="text-2xl font-bold text-brand mt-8">Affiliate Commissions</h2>
            <p>
              When you click a &quot;Visit Broker&quot; or &quot;Sign Up&quot; button on our site and open an
              account with that broker, we may receive a referral commission from the broker.
              This is the primary way we fund the site.
            </p>

            <h2 className="text-2xl font-bold text-brand mt-8">What This Means For You</h2>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">&#10003;</span>
                <span>Our content is <strong>free to use</strong> — you never pay us anything</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">&#10003;</span>
                <span>Using our links <strong>costs you nothing extra</strong> — broker fees are the same</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">&#10003;</span>
                <span>Our <strong>rankings are independent</strong> — we don&apos;t rank based on commission rates</span>
              </li>
            </ul>

            <h2 className="text-2xl font-bold text-brand mt-8">What We Don&apos;t Do</h2>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold mt-0.5">&#10007;</span>
                <span>We don&apos;t accept payment to rank brokers higher</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold mt-0.5">&#10007;</span>
                <span>We don&apos;t sell your data to third parties</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold mt-0.5">&#10007;</span>
                <span>We don&apos;t write sponsored reviews disguised as editorial</span>
              </li>
            </ul>

            <div className="mt-10 p-6 bg-amber/5 border border-amber/20 rounded-lg">
              <p className="text-sm">
                If you find our site useful, using our affiliate links is the best way to support us
                at no extra cost to you. But we&apos;d rather you pick the right broker than click our link.
              </p>
            </div>

            <div className="mt-8">
              <Link href="/about" className="text-amber font-semibold hover:underline">
                &larr; Back to About
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
