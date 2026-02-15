import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-12 mt-20">
      <div className="container-custom">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white font-bold mb-4">Invest.com.au</h3>
            <p className="text-sm">
              Australia's independent broker comparison platform. No bank bias, just honest reviews.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Compare</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/compare" className="hover:text-white">All Brokers</Link></li>
              <li><Link href="/versus" className="hover:text-white">Versus Tool</Link></li>
              <li><Link href="/reviews" className="hover:text-white">Reviews</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Learn</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/articles" className="hover:text-white">Articles</Link></li>
              <li><Link href="/calculators" className="hover:text-white">Calculators</Link></li>
              <li><Link href="/scenarios" className="hover:text-white">Scenarios</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">About</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-white">About Us</Link></li>
              <li><Link href="/how-we-earn" className="hover:text-white">How We Earn</Link></li>
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
