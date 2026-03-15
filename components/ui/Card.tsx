import type { ReactNode } from "react";

type Variant = "default" | "elevated" | "bordered" | "flat";
type Padding = "none" | "sm" | "md" | "lg";

interface CardProps {
  children: ReactNode;
  variant?: Variant;
  padding?: Padding;
  className?: string;
  onClick?: () => void;
  as?: "div" | "article" | "section";
}

const variantClasses: Record<Variant, string> = {
  default: "bg-white border border-slate-200 rounded-2xl",
  elevated: "bg-white rounded-2xl shadow-lg shadow-slate-100/80",
  bordered: "bg-white border-2 border-slate-200 rounded-2xl",
  flat: "bg-slate-50 rounded-2xl",
};

const paddingClasses: Record<Padding, string> = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  children,
  variant = "default",
  padding = "md",
  className = "",
  onClick,
  as: Tag = "div",
}: CardProps) {
  return (
    <Tag
      className={`${variantClasses[variant]} ${paddingClasses[padding]} ${onClick ? "cursor-pointer" : ""} ${className}`}
      onClick={onClick}
    >
      {children}
    </Tag>
  );
}
