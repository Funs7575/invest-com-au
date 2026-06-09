"use client";

import { useId, useState, type ReactNode } from "react";
import Icon from "@/components/Icon";

export interface FilterGroupHeaderProps {
  label: string;
  icon?: string;
  activeCount?: number;
  defaultOpen?: boolean;
  open?: boolean;
  onToggle?: () => void;
  children: ReactNode;
  className?: string;
}

export default function FilterGroupHeader({
  label,
  icon,
  activeCount,
  defaultOpen = true,
  open: controlledOpen,
  onToggle,
  children,
  className = "",
}: FilterGroupHeaderProps) {
  const contentId = useId();
  const [localOpen, setLocalOpen] = useState(defaultOpen);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : localOpen;

  const handleToggle = () => {
    if (isControlled) {
      onToggle?.();
    } else {
      setLocalOpen((v) => !v);
    }
  };

  return (
    <div className={`border-b border-slate-100 last:border-0 ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className="flex w-full items-center justify-between gap-2 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 rounded"
      >
        <div className="flex items-center gap-2">
          {icon && <Icon name={icon} size={13} className="text-slate-400 shrink-0" />}
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            {label}
          </span>
          {typeof activeCount === "number" && activeCount > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[0.6rem] font-bold leading-none">
              {activeCount > 9 ? "9+" : activeCount}
            </span>
          )}
        </div>
        <Icon
          name="chevron-down"
          size={14}
          className={`text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <div
        id={contentId}
        className={`overflow-hidden transition-all duration-200 ${isOpen ? "max-h-[1000px] pb-3" : "max-h-0"}`}
      >
        {children}
      </div>
    </div>
  );
}
