import type { Metadata } from "next";
import { Suspense } from "react";
import ReferralsClient from "./ReferralsClient";

export const metadata: Metadata = {
  title: "Refer a Friend | My Account",
  description: "Invite friends to Invest.com.au and earn free Pro access. Share your unique referral link.",
  robots: "noindex, nofollow",
};

export default function ReferralsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center animate-pulse">
          <div className="h-8 w-48 bg-slate-200 rounded mx-auto" />
        </div>
      }
    >
      <ReferralsClient />
    </Suspense>
  );
}
