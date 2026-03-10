import type { Metadata } from "next";
import { ToastProvider } from "@/components/Toast";
import AdminSidebar from "@/components/AdminSidebar";
import AdminAuthGuard from "./_components/AdminAuthGuard";

export const metadata: Metadata = {
  title: "Admin — Invest.com.au",
  robots: "noindex, nofollow",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AdminAuthGuard>
        <AdminSidebar />
        <div className="md:ml-56">{children}</div>
      </AdminAuthGuard>
    </ToastProvider>
  );
}
