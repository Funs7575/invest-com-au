import RouteNotFound from "@/components/RouteNotFound";

export default function CourseNotFound() {
  return (
    <RouteNotFound
      iconName="book-open"
      title="Course Not Found"
      description="We couldn't find that course. It may have been renamed or removed."
      primaryCta={{ href: "/courses", label: "Browse Courses" }}
      secondaryCta={{ href: "/academy", label: "Visit Academy" }}
    />
  );
}
