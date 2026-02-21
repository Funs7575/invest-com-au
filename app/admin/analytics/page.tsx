import { Suspense } from "react";
import AdminAnalyticsClient from "./AdminAnalyticsClient";

export default function AdminAnalyticsPage() {
  return (
    <Suspense fallback={<div className="p-8 animate-pulse"><div className="h-8 w-64 bg-slate-200 rounded mb-4" /><div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-slate-200 rounded" />)}</div></div>}>
      <AdminAnalyticsClient />
    </Suspense>
  );
}
