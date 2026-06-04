import RouteNotFound from "@/components/RouteNotFound";

export default function CertificateNotFound() {
  return (
    <RouteNotFound
      iconName="award"
      title="Certificate Not Found"
      description="We couldn't find a certificate with that number. It may have been revoked or entered incorrectly."
      primaryCta={{ href: "/academy", label: "Visit Academy" }}
      secondaryCta={{ href: "/courses", label: "Browse Courses" }}
    />
  );
}
