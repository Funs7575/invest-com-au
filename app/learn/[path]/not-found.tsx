import RouteNotFound from "@/components/RouteNotFound";

export default function LearnPathNotFound() {
  return (
    <RouteNotFound
      iconName="book-open"
      title="Lesson Not Found"
      description="We couldn't find that learning path. It may have been renamed or removed."
      primaryCta={{ href: "/courses", label: "Browse Courses" }}
      secondaryCta={{ href: "/academy", label: "Visit Academy" }}
    />
  );
}
