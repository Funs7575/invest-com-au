import { Suspense } from "react";
import LoginClient from "./LoginClient";

export const metadata = {
  title: "Sign In",
  robots: "noindex, nofollow",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16">
          <div className="container-custom max-w-md">
            <div className="bg-white border border-slate-200 rounded-2xl p-8 animate-pulse">
              <div className="h-8 bg-slate-200 rounded w-48 mx-auto mb-2" />
              <div className="h-4 bg-slate-200 rounded w-64 mx-auto mb-6" />
              <div className="h-10 bg-slate-200 rounded w-full mb-4" />
              <div className="h-10 bg-slate-200 rounded w-full" />
            </div>
          </div>
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
