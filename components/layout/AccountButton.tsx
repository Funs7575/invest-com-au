"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/hooks/useUser";
import { createClient } from "@/lib/supabase/client";

/**
 * Top-right account button for the main navigation.
 *
 * - Logged out: shows "Sign In" + "Sign Up" buttons
 * - Logged in: shows avatar + dropdown menu with Account, Saved, Profile,
 *   Notifications, Sign Out links
 *
 * Mobile-friendly: dropdown closes on outside click and Escape.
 */
export default function AccountButton() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [profileName, setProfileName] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Fetch display name from user_profiles for personalization
  // (user_metadata isn't kept in sync — display_name lives in our profile table)
  useEffect(() => {
    if (!user) {
      setProfileName(null);
      return;
    }
    let cancelled = false;
    fetch("/api/user-profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.profile?.display_name) {
          setProfileName(data.profile.display_name);
        }
      })
      .catch(() => {
        // Silently fall back to email username
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Close on outside click + Escape
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  const handleSignOut = useCallback(async () => {
    setOpen(false);
    try {
      // 1. Client-side signOut fires SIGNED_OUT event so useUser updates
      //    immediately without needing to remount the component
      const supabase = createClient();
      await supabase.auth.signOut();
      // 2. Server-side signOut clears HttpOnly session cookies so
      //    server-rendered pages also see the user as logged out
      await fetch("/api/auth/signout", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch {
      // Best-effort — already navigated
    }
  }, [router]);

  // Loading state — avoid layout shift, show a small skeleton
  if (loading) {
    return (
      <div className="hidden lg:flex items-center">
        <div className="h-9 w-20 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  // ─── Logged out ─────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="hidden lg:flex items-center gap-1.5">
        <Link
          href="/auth/login"
          className="px-3 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors"
        >
          Sign In
        </Link>
        <Link
          href="/auth/signup"
          className="px-3 py-2 text-sm font-semibold text-slate-900 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl transition-colors"
        >
          Sign Up
        </Link>
      </div>
    );
  }

  // ─── Logged in ──────────────────────────────────────────────────
  const displayName = profileName || user.user_metadata?.display_name || user.email?.split("@")[0] || "Account";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div ref={ref} className="hidden lg:flex relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
          {initial}
        </div>
        <span className="text-sm font-semibold text-slate-700 max-w-[120px] truncate">
          {displayName}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/60 overflow-hidden z-50"
          role="menu"
        >
          {/* Profile header */}
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <p className="text-sm font-bold text-slate-900 truncate">{displayName}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <MenuLink href="/account" onClick={() => setOpen(false)} icon="dashboard">
              My Account
            </MenuLink>
            <MenuLink href="/account/saved" onClick={() => setOpen(false)} icon="bookmark">
              Saved Comparisons
            </MenuLink>
            <MenuLink href="/shortlist" onClick={() => setOpen(false)} icon="heart">
              My Shortlist
            </MenuLink>
            <MenuLink href="/account/profile" onClick={() => setOpen(false)} icon="user">
              Edit Profile
            </MenuLink>
            <MenuLink href="/account/referrals" onClick={() => setOpen(false)} icon="gift">
              Refer a Friend
            </MenuLink>
            <MenuLink href="/fee-alerts" onClick={() => setOpen(false)} icon="bell">
              Fee Alerts
            </MenuLink>
          </div>

          {/* Sign out */}
          <div className="border-t border-slate-100 py-1">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors text-left"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  children,
  onClick,
  icon,
}: {
  href: string;
  children: React.ReactNode;
  onClick: () => void;
  icon: "dashboard" | "bookmark" | "heart" | "user" | "gift" | "bell";
}) {
  const icons = {
    dashboard: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
    bookmark: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />,
    heart: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />,
    user: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
    gift: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />,
    bell: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />,
  };
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-900 transition-colors"
    >
      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {icons[icon]}
      </svg>
      {children}
    </Link>
  );
}
