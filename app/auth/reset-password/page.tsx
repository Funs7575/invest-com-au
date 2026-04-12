import { Suspense } from "react";
import ResetPasswordClient from "./ResetPasswordClient";

export const metadata = {
  title: "Reset Password",
  robots: "noindex, nofollow",
};

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="py-8 md:py-16">
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
      <ResetPasswordClient />
    </Suspense>
  );
}
