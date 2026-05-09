import Link from "next/link";

export default function FindAdvisorNotFound() {
  return (
    <div className="container-custom py-16 text-center">
      <h1 className="text-2xl font-bold text-slate-900 mb-3">No advisors found</h1>
      <p className="text-slate-500 mb-6">
        We don&apos;t have any advisors listed for that type and location yet.
      </p>
      <Link
        href="/advisors"
        className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Browse all advisors
      </Link>
    </div>
  );
}
