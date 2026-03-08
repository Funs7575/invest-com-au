import type { Metadata } from "next";
import { ToastProvider } from "@/components/Toast";
import AdminSidebar from "@/components/AdminSidebar";

export const metadata: Metadata = {
  title: "Admin — Invest.com.au",
  robots: "noindex, nofollow",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AdminSidebar />
      <div className="md:ml-56">{children}</div>
    </ToastProvider>
  );
}
