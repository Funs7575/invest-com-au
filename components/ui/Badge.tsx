import type { ReactNode } from "react";

type Variant = "default" | "success" | "warning" | "error" | "info" | "gold";
type Size = "sm" | "md";

interface BadgeProps {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
}

const variantClasses: Record<Variant, string> = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  error: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  gold: "bg-amber-50 text-amber-800 border border-amber-200",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-2 py-0.5 text-[0.65rem]",
  md: "px-2.5 py-1 text-xs",
};

export function Badge({
  children,
  variant = "default",
  size = "md",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </span>
  );
}
