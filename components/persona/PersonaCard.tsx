import Link from "next/link";
import type { PersonaResult } from "@/lib/persona";

interface Props {
  result: PersonaResult;
  showShare?: boolean;
  compact?: boolean;
}

export default function PersonaCard({ result, showShare = false, compact = false }: Props) {
  const shareUrl = `/persona/${result.slug}`;

  return (
    <div
      style={{
        background: result.bg,
        border: `1.5px solid ${result.border}`,
        borderRadius: 16,
        padding: compact ? "16px 20px" : "24px 28px",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        <div
          style={{
            width: compact ? 44 : 56,
            height: compact ? 44 : 56,
            borderRadius: 99,
            background: result.color + "1a",
            border: `2px solid ${result.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: compact ? 22 : 28,
            flexShrink: 0,
          }}
        >
          {result.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: result.color, marginBottom: 4 }}>
            Your investing persona
          </p>
          <h3 style={{ fontSize: compact ? 18 : 22, fontWeight: 800, color: "var(--color-ink-900)", marginBottom: 4, lineHeight: 1.2 }}>
            {result.persona}
          </h3>
          <p style={{ fontSize: 13, color: "var(--color-ink-500)", marginBottom: compact ? 0 : 14, lineHeight: 1.5 }}>
            {compact ? result.tagline : result.description}
          </p>
          {!compact && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <Link
                href={shareUrl}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: result.color,
                  textDecoration: "none",
                  padding: "5px 12px",
                  border: `1.5px solid ${result.border}`,
                  borderRadius: 8,
                  background: "white",
                }}
              >
                Explore this persona →
              </Link>
              {showShare && (
                <Link
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--color-ink-500)",
                    textDecoration: "none",
                    padding: "5px 12px",
                    border: "1.5px solid var(--color-ink-200)",
                    borderRadius: 8,
                    background: "white",
                  }}
                >
                  Share your persona ↗
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
