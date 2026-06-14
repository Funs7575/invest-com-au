import { describe, it, expect, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import HideWhenCountryStrip from "@/components/country-mode/HideWhenCountryStrip";

function addStrip(kind: string) {
  const el = document.createElement("section");
  el.setAttribute("data-country-strip", kind);
  document.body.appendChild(el);
}

describe("HideWhenCountryStrip", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("shows the global section when no country strip is present", async () => {
    render(
      <HideWhenCountryStrip strip="listings">
        <div>global teaser</div>
      </HideWhenCountryStrip>,
    );
    expect(await screen.findByText("global teaser")).toBeVisible();
  });

  it("collapses the global section once its matching country strip is on the page", async () => {
    addStrip("listings");
    render(
      <HideWhenCountryStrip strip="listings">
        <div>global teaser</div>
      </HideWhenCountryStrip>,
    );
    const el = screen.getByText("global teaser");
    await waitFor(() => expect(el).not.toBeVisible()); // wrapper flipped to display:none
  });

  it("keeps the global section when only a different strip is present (no false hide)", async () => {
    addStrip("experts");
    render(
      <HideWhenCountryStrip strip="listings">
        <div>global teaser</div>
      </HideWhenCountryStrip>,
    );
    expect(await screen.findByText("global teaser")).toBeVisible();
  });
});
