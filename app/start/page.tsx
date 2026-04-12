import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Get Started Investing",
  description: "Start your investing journey with personalised guidance. Find the right broker, strategy, and tools for your financial goals in Australia.",
  alternates: { canonical: "/start" },
};

export default function StartPage() {
  redirect("/quiz");
}
