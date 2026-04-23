import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";
import BrokerLogo from "@/components/BrokerLogo";

describe("BrokerLogo", () => {
  const baseBroker = {
    name: "Stake",
    slug: "stake",
    color: "#ff6b35",
    icon: "S",
  };

  it("renders the letter fallback when logo_url is absent", () => {
    render(<BrokerLogo broker={baseBroker} />);
    // The icon text "S" should be visible in the fallback
    expect(screen.getByText("S")).toBeInTheDocument();
  });

  it("defaults the icon to the first letter of the name when icon is omitted", () => {
    render(
      <BrokerLogo broker={{ name: "CommSec", slug: "commsec", color: "#111" }} />,
    );
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("renders an <img> tag for .ico logos (native img avoids Next/Image)", () => {
    const { container } = render(
      <BrokerLogo
        broker={{ ...baseBroker, logo_url: "https://x/favicon.ico" }}
      />,
    );
    const img = container.querySelector("img");
    expect(img).toBeTruthy();
    expect(img?.getAttribute("src")).toBe("https://x/favicon.ico");
    expect(img?.getAttribute("alt")).toBe("Stake logo");
  });

  it("uses lazy loading by default", () => {
    const { container } = render(
      <BrokerLogo
        broker={{ ...baseBroker, logo_url: "https://x/favicon.ico" }}
      />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("loading")).toBe("lazy");
  });

  it("uses eager loading when priority=true", () => {
    const { container } = render(
      <BrokerLogo
        broker={{ ...baseBroker, logo_url: "https://x/favicon.ico" }}
        priority
      />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("loading")).toBe("eager");
  });

  it("renders non-ico logos via next/image (mocked to <img> in tests)", () => {
    const { container } = render(
      <BrokerLogo
        broker={{ ...baseBroker, logo_url: "https://x/logo.png" }}
      />,
    );
    const img = container.querySelector("img");
    expect(img).toBeTruthy();
    expect(img?.getAttribute("src")).toBe("https://x/logo.png");
  });

  it("size=sm applies the small container classes", () => {
    const { container } = render(
      <BrokerLogo broker={baseBroker} size="sm" />,
    );
    const fallback = container.querySelector("div");
    expect(fallback?.className).toContain("w-8");
    expect(fallback?.className).toContain("h-8");
  });

  it("size=xl applies the extra-large container classes", () => {
    const { container } = render(
      <BrokerLogo broker={baseBroker} size="xl" />,
    );
    const fallback = container.querySelector("div");
    expect(fallback?.className).toContain("w-16");
    expect(fallback?.className).toContain("h-16");
  });
});
