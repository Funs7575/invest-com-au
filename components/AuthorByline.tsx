import { Linkedin, Twitter } from "lucide-react";

interface AuthorBylineProps {
  name?: string;
  title?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  verifiedDate?: string;
  variant?: "light" | "dark";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AuthorByline({
  name = "Market Research Team",
  title = "Invest.com.au",
  linkedinUrl,
  twitterUrl,
  verifiedDate,
  variant = "light",
}: AuthorBylineProps) {
  const displayDate =
    verifiedDate ||
    new Date().toLocaleDateString("en-AU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const initials = getInitials(name);
  const hasSocial = linkedinUrl || twitterUrl;

  const isDark = variant === "dark";

  return (
    <div className="flex items-center justify-center gap-3 my-6">
      {/* Avatar */}
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-sm ${
          isDark
            ? "bg-white/10 text-white/70"
            : "bg-gray-100 text-gray-500"
        }`}
      >
        {initials}
      </div>

      {/* Text column */}
      <div className="text-left">
        <p
          className={`font-bold ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          {name}
        </p>
        <p
          className={`text-sm font-medium ${
            isDark ? "text-green-400" : "text-green-700"
          }`}
        >
          Data verified: {displayDate}
        </p>
      </div>

      {/* Social icons */}
      {hasSocial && (
        <div className="flex items-center gap-2 ml-2">
          {linkedinUrl && (
            <a
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${name} on LinkedIn`}
              className={`transition-colors ${
                isDark
                  ? "text-white/40 hover:text-blue-400"
                  : "text-gray-400 hover:text-blue-700"
              }`}
            >
              <Linkedin className="w-4 h-4" />
            </a>
          )}
          {twitterUrl && (
            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${name} on Twitter`}
              className={`transition-colors ${
                isDark
                  ? "text-white/40 hover:text-sky-400"
                  : "text-gray-400 hover:text-sky-600"
              }`}
            >
              <Twitter className="w-4 h-4" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
