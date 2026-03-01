"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useCallback } from "react";
const Search = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
);

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
    <div className="relative mb-2 md:mb-4">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" />
      <input
        type="text"
        defaultValue={current}
        onChange={handleChange}
        placeholder="Search articles..."
        className="w-full md:w-80 pl-9 md:pl-10 pr-3 md:pr-4 py-2.5 md:py-2.5 min-h-[44px] border border-slate-200 rounded-lg text-xs md:text-sm focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700/40"
        aria-label="Search articles"
      />
    </div>
  );
}
