import { redirect } from "next/navigation";

/**
 * /broker — no index page exists; redirect to the compare page
 * which is the primary broker discovery experience.
 */
export default function BrokerIndexPage() {
  redirect("/compare");
}
