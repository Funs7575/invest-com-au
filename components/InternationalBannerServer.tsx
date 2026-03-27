import { headers } from "next/headers";
import InternationalBanner from "./InternationalBanner";

export default async function InternationalBannerServer() {
  const hdrs = await headers();
  // Vercel sets x-vercel-ip-country on all edge requests; falls back to null in dev
  const countryCode = hdrs.get("x-vercel-ip-country");
  return <InternationalBanner countryCode={countryCode} />;
}
