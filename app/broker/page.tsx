import { redirect } from "next/navigation";

export const revalidate = 3600;

/**
 * /broker — no index page exists; redirect to the compare page
 * which is the primary broker discovery experience.
 */
export default function BrokerIndexPage() {
  redirect("/compare");
}
