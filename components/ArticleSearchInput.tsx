"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useCallback } from "react";
import { Search } from "lucide-react";

export default function ArticleSearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const current = searchParams.get("q") || "";

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (val.trim()) {
          params.set("q", val.trim());
        } else {
          params.delete("q");
        }
        router.replace(`/articles?${params.toString()}`, { scroll: false });
      }, 300);
    },
    [router, searchParams]
  );

  return (
    <div className="relative mb-4">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        type="text"
        defaultValue={current}
        onChange={handleChange}
        placeholder="Search articles..."
        className="w-full md:w-80 pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
        aria-label="Search articles"
      />
    </div>
  );
}
