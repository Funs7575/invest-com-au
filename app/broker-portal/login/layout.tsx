export default function BrokerLoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-slate-900 py-3 flex items-center justify-center gap-2">
        <div className="w-6 h-6 rounded-md bg-amber-500 flex items-center justify-center">
          <span className="text-slate-900 font-extrabold text-xs">I</span>
        </div>
        <span className="text-white font-bold text-sm">Invest.com.au</span>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-extrabold text-slate-900">
              Partner Portal
            </h1>
            <p className="text-sm text-slate-500 mt-1">Manage your broker advertising</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
