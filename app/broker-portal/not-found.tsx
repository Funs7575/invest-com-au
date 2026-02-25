import Link from "next/link";
import Icon from "@/components/Icon";

export default function BrokerPortalNotFound() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Icon name="search" size={28} className="text-slate-400" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900 mb-2">
          Page not found
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/broker-portal"
          className="inline-block px-5 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
