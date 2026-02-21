import type { Metadata } from "next";
import { Suspense } from "react";
import AccountClient from "./AccountClient";

export const metadata: Metadata = {
  title: "My Account",
  robots: "noindex, nofollow",
};

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center animate-pulse"><div className="h-8 w-48 bg-slate-200 rounded mx-auto" /></div>}>
      <AccountClient />
    </Suspense>
  );
}
