"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePathname } from "next/navigation";

/**
 * Client-side auth guard for the admin section.
 * Checks the logged-in Supabase user against the /api/admin/verify endpoint
 * which validates ADMIN_EMAILS server-side.
 *
 * - If not logged in → redirects to /admin/login
 * - If logged in but not admin → shows access denied
 * - If admin → renders children
 *
 * The /admin/login page is excluded from the guard.
 */
export default function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [status, setStatus] = useState<"loading" | "authenticated" | "denied" | "unauthenticated">("loading");

  // Don't guard the login page itself
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
          if (!cancelled) setStatus("unauthenticated");
          return;
        }

        // Verify admin status server-side
        const res = await fetch("/api/admin/verify");
        if (!cancelled) {
          setStatus(res.ok ? "authenticated" : "denied");
        }
      } catch {
        if (!cancelled) setStatus("unauthenticated");
      }
    }

    checkAuth();
    return () => { cancelled = true; };
  }, [pathname]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    if (typeof window !== "undefined") {
      window.location.href = `/admin/login?redirect=${encodeURIComponent(pathname)}`;
    }
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <p className="text-sm text-slate-500">Redirecting to login...</p>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-3">🔒</div>
          <h1 className="text-lg font-bold text-slate-900 mb-1">Access Denied</h1>
          <p className="text-sm text-slate-500 mb-4">
            Your account does not have admin access. If you believe this is an error, contact the site administrator.
          </p>
          <button
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              window.location.href = "/admin/login";
            }}
            className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800"
          >
            Sign Out & Try Again
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
