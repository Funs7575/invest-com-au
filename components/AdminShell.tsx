"use client";

import AdminSearch from "@/components/AdminSearch";
import AdminNotifications from "@/components/AdminNotifications";
import AdminHelpPanel from "@/components/AdminHelpPanel";
import ThemeToggle from "@/components/ThemeToggle";

interface AdminShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

/**
 * AdminShell — content wrapper for admin pages.
 * Provides: page title, top toolbar (search, notifications, theme), global search overlay, help panel.
 * Navigation sidebar is handled by AdminSidebar in the admin layout — NOT here.
 */
export default function AdminShell({ children, title, subtitle }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top toolbar — desktop only */}
      <div className="hidden md:flex items-center justify-end gap-2 bg-white border-b border-slate-200 px-6 py-3">
        <button
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
          }}
          className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Search...
          <kbd className="ml-2 text-[0.6rem] px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-medium">⌘K</kbd>
        </button>
        <AdminNotifications />
        <ThemeToggle />
      </div>

      {/* Page content */}
      <div className="p-4 md:px-6 md:pt-4 md:pb-6 lg:px-8 lg:pb-8">
        {title && (
          <div className="mb-4 md:mb-6">
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">{title}</h1>
            {subtitle && <p className="text-xs md:text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
        )}
        {children}
      </div>

      {/* Global Search */}
      <AdminSearch />

      {/* Page-specific help panel */}
      <AdminHelpPanel />
    </div>
  );
}
