/**
 * Reusable broker logo/avatar component. Shows the actual logo image
 * if logo_url exists, otherwise falls back to the color+icon pattern.
 */
import Image from "next/image";

interface BrokerLogoProps {
  broker: {
    name: string;
    slug: string;
    color: string;
    icon?: string;
    logo_url?: string;
  };
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZES = {
  xs: { container: "w-6 h-6", text: "text-[0.5rem]", img: 24 },
  sm: { container: "w-8 h-8", text: "text-xs", img: 32 },
  md: { container: "w-10 h-10", text: "text-sm", img: 40 },
  lg: { container: "w-12 h-12", text: "text-base", img: 48 },
  xl: { container: "w-16 h-16", text: "text-lg", img: 64 },
};

export default function BrokerLogo({ broker, size = "md", className = "" }: BrokerLogoProps) {
  const s = SIZES[size];

  if (broker.logo_url) {
    return (
      <div className={`${s.container} rounded-lg overflow-hidden shrink-0 ${className}`} style={{ background: `${broker.color}10` }}>
        <Image
          src={broker.logo_url}
          alt={`${broker.name} logo`}
          width={s.img}
          height={s.img}
          className="w-full h-full object-contain p-0.5"
          sizes={`${s.img}px`}
        />
      </div>
    );
  }

  return (
    <div
      className={`${s.container} rounded-lg flex items-center justify-center ${s.text} font-bold shrink-0 ${className}`}
      style={{ background: `${broker.color}20`, color: broker.color }}
    >
      {broker.icon || broker.name.charAt(0)}
    </div>
  );
}
