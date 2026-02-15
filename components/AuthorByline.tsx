import { Linkedin, Twitter } from "lucide-react";

export default function AuthorByline() {
  const today = new Date().toLocaleDateString("en-AU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex items-center justify-center gap-3 my-6">
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-semibold text-sm">
        IM
      </div>

      {/* Text column */}
      <div className="text-left">
        <p className="font-bold text-gray-900">Market Research Team</p>
        <p className="text-sm text-green-700 font-medium">
          Data verified: {today}
        </p>
      </div>

      {/* Social icons */}
      <div className="flex items-center gap-2 ml-2">
        <a
          href="#"
          aria-label="LinkedIn"
          className="text-gray-400 hover:text-blue-700 transition-colors"
        >
          <Linkedin className="w-4 h-4" />
        </a>
        <Twitter className="w-4 h-4 text-gray-400" />
      </div>
    </div>
  );
}
