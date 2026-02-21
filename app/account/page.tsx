import type { Metadata } from "next";
import AccountClient from "./AccountClient";

export const metadata: Metadata = {
  title: "My Account",
  robots: "noindex, nofollow",
};

export default function AccountPage() {
  return <AccountClient />;
}
