const TrendingUp = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
);
const TrendingDown = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>
);

const tickerData = [
  { label: "ASX 200", value: "8,247.30", change: "+0.64%", up: true },
  { label: "BTC/AUD", value: "$152,430", change: "+2.18%", up: true },
  { label: "AUD/USD", value: "0.6384", change: "-0.12%", up: false },
  { label: "ETH/AUD", value: "$4,215", change: "+1.43%", up: true },
  { label: "Gold/AUD", value: "$4,312", change: "+0.38%", up: true },
  { label: "S&P 500", value: "6,128.18", change: "+0.22%", up: true },
];

export default function MarketTicker() {
  return (
    <div className="bg-slate-900 border-b border-slate-800 overflow-hidden relative ticker-strip" tabIndex={0} aria-label="Market ticker — hover or focus to pause">
      <div className="flex items-center">
        {/* Scrolling content — duplicated for seamless loop */}
        <div
          className="flex items-center gap-8 py-2 px-4 whitespace-nowrap ticker-track motion-reduce:animate-none"
          style={{
            animation: "marquee 30s linear infinite",
          }}
        >
          {[...tickerData, ...tickerData].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="text-slate-300 font-medium">{item.label}</span>
              <span className="text-white font-semibold">{item.value}</span>
              <span
                className={`flex items-center gap-0.5 font-semibold ${
                  item.up ? "text-amber-400" : "text-red-400"
                }`}
              >
                {item.up ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {item.change}
              </span>
              {i < [...tickerData, ...tickerData].length - 1 && (
                <span className="text-slate-700 ml-2">|</span>
              )}
            </div>
          ))}
        </div>
      </div>
      {/* Compliance disclaimer */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[0.6rem] text-slate-400 hidden lg:block bg-slate-900 pl-4">
        Indicative only. Not financial advice.
      </div>
    </div>
  );
}
