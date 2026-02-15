import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-20">
      {/* Compliance Blocks */}
      <div className="border-b border-slate-800">
        <div className="container-custom py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400 leading-relaxed">
            <div className="border border-slate-700 rounded-lg p-4">
              <h4 className="font-semibold text-slate-300 mb-1">General Advice Warning</h4>
              <p>The information on Invest.com.au is general in nature and does not consider your personal objectives, financial situation, or needs. You should consider whether the information is appropriate to your needs, and where appropriate, seek professional advice from a financial adviser.</p>
            </div>
            <div className="border border-slate-700 rounded-lg p-4">
              <h4 className="font-semibold text-slate-300 mb-1">Affiliate Disclosure</h4>
              <p>Invest.com.au may receive compensation from the companies listed on this site. This compensation may impact how and where products appear (including the order in which they appear). Our site does not include all available offers.</p>
            </div>
            <div className="border border-slate-700 rounded-lg p-4">
              <h4 className="font-semibold text-slate-300 mb-1">Crypto Warning</h4>
              <p>Cryptocurrency is highly speculative and not legal tender. Past performance is not an indicator of future returns. You could lose all of your investment. Only invest what you can afford to lose.</p>
            </div>
            <div className="border border-slate-700 rounded-lg p-4">
              <h4 className="font-semibold text-slate-300 mb-1">Regulatory Note</h4>
              <p>Invest.com.au is not a financial product issuer, credit provider, or financial adviser. We are an information service. Always verify information with the product issuer before making a decision.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Links */}
      <div className="container-custom py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white font-bold mb-4">Invest.com.au</h3>
            <p className="text-sm">
              Australia&apos;s independent broker comparison platform. No bank bias, just honest reviews.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Compare</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/compare" className="hover:text-white transition-colors">All Brokers</Link></li>
              <li><Link href="/versus" className="hover:text-white transition-colors">Versus Tool</Link></li>
              <li><Link href="/reviews" className="hover:text-white transition-colors">Reviews</Link></li>
              <li><Link href="/quiz" className="hover:text-white transition-colors">Broker Quiz</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Learn</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/articles" className="hover:text-white transition-colors">Articles</Link></li>
              <li><Link href="/calculators" className="hover:text-white transition-colors">Calculators</Link></li>
              <li><Link href="/scenarios" className="hover:text-white transition-colors">Scenarios</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">About</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/how-we-earn" className="hover:text-white transition-colors">How We Earn</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-8 pt-8 text-sm text-center">
          <p>&copy; {new Date().getFullYear()} Invest.com.au. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
