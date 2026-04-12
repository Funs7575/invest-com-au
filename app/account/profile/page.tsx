import type { Metadata } from "next";
import { Suspense } from "react";
import ProfileClient from "./ProfileClient";

export const metadata: Metadata = {
  title: "Edit Profile",
  robots: "noindex, nofollow",
};

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center animate-pulse">
          <div className="h-8 w-48 bg-slate-200 rounded mx-auto" />
        </div>
      }
    >
      <ProfileClient />
    </Suspense>
  );
}
