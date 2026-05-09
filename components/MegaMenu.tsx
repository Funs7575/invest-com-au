"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

export interface MegaMenuItem {
  label: string;
  href: string;
  desc?: string;
}

export interface MegaMenuColumn {
  title: string;
  items: MegaMenuItem[];
}

export interface MegaMenuSidebar {
  heading: string;
  links: MegaMenuItem[];
  ctaLabel: string;
  ctaHref: string;
}

interface MegaMenuProps {
  label: string;
  columns: MegaMenuColumn[];
  sidebar?: MegaMenuSidebar;
  isActive?: boolean;
  width?: number;
}

export function MegaMenu({
  label,
  columns,
  sidebar,
  isActive = false,
  width = 720,
}: MegaMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const enter = () => {
    clearTimeout(timeout.current);
    setOpen(true);
  };
  const leave = () => {
    timeout.current = setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => {
    return () => clearTimeout(timeout.current);
  }, []);

  return (
    <div ref={ref} className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-bold rounded-lg transition-colors flex items-center gap-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700/40 ${
          isActive ? "text-slate-900 bg-slate-50" : ""
        }`}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {label}
        <Icon
          name="chevron-down"
          size={14}
          className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50">
          <div
            className="bg-white rounded-xl border border-slate-200 shadow-xl p-5 flex gap-6"
            style={{ width: `${width}px` }}
          >
            {columns.map((col) => (
              <div key={col.title} className="flex-1 min-w-0">
                <p className="text-[0.65rem] font-extrabold uppercase tracking-wider text-amber-500 mb-2 px-2">
                  {col.title}
                </p>
                <div className="space-y-0.5">
                  {col.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="block px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors group"
                    >
                      <div className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                        {item.label}
                      </div>
                      {item.desc && (
                        <div className="text-[0.68rem] text-slate-400 leading-tight">{item.desc}</div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            {sidebar && (
              <div
                className="border-l border-slate-100 pl-5 flex flex-col justify-between"
                style={{ minWidth: "140px" }}
              >
                <div>
                  <p className="text-[0.65rem] font-extrabold uppercase tracking-wider text-amber-500 mb-2">
                    {sidebar.heading}
                  </p>
                  {sidebar.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="block text-sm font-bold text-slate-900 hover:text-amber-600 py-1 transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
                <Link
                  href={sidebar.ctaHref}
                  onClick={() => setOpen(false)}
                  className="mt-3 flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs px-3 py-2 rounded-lg transition-colors"
                >
                  {sidebar.ctaLabel} <Icon name="arrow-right" size={12} aria-hidden="true" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
