import { describe, it, expect } from "vitest";
import { render } from "./setup";
import Money from "@/components/Money";

/**
 * Currency formatting via Intl varies slightly across Node ICU builds
 * (NBSP vs regular space, "CN¥" vs "¥"). We assert on digit + symbol
 * substrings and tolerant regexes rather than exact strings.
 */

describe("Money", () => {
  it("renders a single AUD span for amounts < 1M with no intentCountry", () => {
    const { container } = render(<Money amount={50_000} />);
    const spans = container.querySelectorAll("span");
    // Only the wrapper span — no secondary currency span.
    expect(spans).toHaveLength(1);
    expect(container.textContent).toMatch(/A?\$\s?50,000/);
    expect(container.textContent).not.toContain("≈");
  });

  it("defaults to compact notation for amounts >= 1M", () => {
    const { container } = render(<Money amount={1_500_000} />);
    // ICU may prefix the AUD symbol as "$" or "A$" depending on the build.
    expect(container.textContent).toMatch(/A?\$\s?1\.5M/);
    // Compact means no grouped full digits.
    expect(container.textContent).not.toContain("1,500,000");
  });

  it("renders standard grouped digits when compact={false} on a >= 1M amount", () => {
    const { container } = render(<Money amount={1_500_000} compact={false} />);
    expect(container.textContent).toContain("1,500,000");
    expect(container.textContent).not.toMatch(/1\.5M/);
  });

  it("renders compact when compact={true} on a < 1M amount (explicit override)", () => {
    const { container } = render(<Money amount={50_000} compact />);
    // 50,000 in compact en-AU is "$50K" or "$50.0K" depending on ICU.
    expect(container.textContent).toMatch(/A?\$\s?50(\.0)?K/);
    expect(container.textContent).not.toContain("50,000");
  });

  it("renders both AUD primary and a secondary CNY span for intentCountry='cn'", () => {
    const { container } = render(<Money amount={1_500_000} intentCountry="cn" />);
    const text = container.textContent ?? "";

    // Primary AUD still present.
    expect(text).toMatch(/A?\$\s?1\.5M/);

    // Secondary marked with the approx symbol and the CNY symbol.
    expect(text).toContain("≈");
    expect(text).toContain("¥");

    // 1.5M AUD * 4.7 = 7.05M CNY. zh-CN compact ICU renders this with the
    // native 万 (10k) grouping ("705万") rather than a Latin "M" suffix.
    // Assert the ¥ symbol sits immediately before the converted digits.
    expect(text).toMatch(/¥\s?705/);

    // The secondary span carries an explanatory title attribute.
    const titled = container.querySelector("span[title]");
    expect(titled).not.toBeNull();
    const title = titled?.getAttribute("title") ?? "";
    expect(title).toContain("CNY");
    expect(title).toContain("not a settlement rate");
  });

  it("renders only the AUD span when intentCountry is null", () => {
    const { container } = render(<Money amount={500_000} intentCountry={null} />);
    expect(container.textContent).not.toContain("≈");
    expect(container.querySelector("span[title]")).toBeNull();
    expect(container.querySelectorAll("span")).toHaveLength(1);
  });

  it("renders only the AUD span for an unmapped intent code", () => {
    // 'xx' is not in the APPROX_FX_PER_AUD table.
    const { container } = render(
      // @ts-expect-error — intentionally passing an unmapped code to exercise the fallback.
      <Money amount={500_000} intentCountry="xx" />,
    );
    expect(container.textContent).not.toContain("≈");
    expect(container.querySelector("span[title]")).toBeNull();
  });

  it("applies the className prop to the wrapper span", () => {
    const { container } = render(
      <Money amount={50_000} className="text-emerald-600 font-bold" />,
    );
    const wrapper = container.firstElementChild;
    expect(wrapper?.tagName).toBe("SPAN");
    expect(wrapper).toHaveClass("text-emerald-600");
    expect(wrapper).toHaveClass("font-bold");
  });
});
