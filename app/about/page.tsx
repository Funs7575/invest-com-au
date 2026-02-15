import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="py-12">
      <div className="container-custom">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-6">About Invest.com.au</h1>

          <div className="space-y-6 text-slate-700 leading-relaxed">
            <p className="text-lg">
              Invest.com.au is Australia&apos;s independent broker comparison platform. We help
              everyday Australians find the right share trading platform without bank bias or paid rankings.
            </p>

            <h2 className="text-2xl font-bold text-brand mt-8">Our Mission</h2>
            <p>
              The Australian brokerage market is confusing. Banks charge hidden fees, comparison sites
              rank whoever pays them the most, and new investors have no idea where to start.
              We built Invest.com.au to change that.
            </p>

            <h2 className="text-2xl font-bold text-brand mt-8">How We&apos;re Different</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-amber font-bold text-lg">1.</span>
                <div>
                  <strong>Independent Rankings</strong> — Our ratings are based on real fee data, platform
                  features, and user experience. Not who pays us the most.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-amber font-bold text-lg">2.</span>
                <div>
                  <strong>Transparent Monetisation</strong> — We earn affiliate commissions when you
                  sign up to a broker through our links. This doesn&apos;t affect our rankings.{" "}
                  <Link href="/how-we-earn" className="text-amber hover:underline">Learn more</Link>.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-amber font-bold text-lg">3.</span>
                <div>
                  <strong>Scenario-Based Advice</strong> — Instead of one-size-fits-all recommendations,
                  we help you find the best broker for your specific situation.
                </div>
              </li>
            </ul>

            <h2 className="text-2xl font-bold text-brand mt-8">What We Cover</h2>
            <p>
              We compare 10+ Australian share trading platforms across ASX fees, US share access,
              FX rates, CHESS sponsorship, SMSF support, and more. We also cover cryptocurrency
              exchanges for Aussie investors.
            </p>

            <div className="mt-10 p-6 bg-slate-50 border border-slate-200 rounded-lg">
              <h3 className="font-bold text-lg mb-2">Disclaimer</h3>
              <p className="text-sm text-slate-600">
                Invest.com.au provides general information only and does not constitute financial advice.
                Always do your own research and consider seeking professional advice before making
                investment decisions. Past performance is not indicative of future results.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
