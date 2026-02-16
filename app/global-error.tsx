"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, -apple-system, sans-serif", color: "#0f172a", margin: 0 }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ textAlign: "center", maxWidth: "28rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>
              Something went wrong
            </div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Unexpected Error
            </h1>
            <p style={{ color: "#64748b", marginBottom: "1.5rem", lineHeight: 1.6 }}>
              We hit a critical error loading the page. Please try again.
            </p>
            <button
              onClick={reset}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#15803d",
                color: "white",
                fontWeight: 600,
                borderRadius: "0.5rem",
                border: "none",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
