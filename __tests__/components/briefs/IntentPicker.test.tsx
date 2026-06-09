import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent } from "../setup";

import IntentPicker from "@/components/briefs/IntentPicker";

function setup(overrides: Partial<React.ComponentProps<typeof IntentPicker>> = {}) {
  const onSelect = vi.fn();
  const onFreeform = vi.fn();
  render(
    <IntentPicker
      selectedIntentId={null}
      onSelect={onSelect}
      onFreeform={onFreeform}
      aiEnabled={false}
      {...overrides}
    />,
  );
  return { onSelect, onFreeform };
}

describe("IntentPicker", () => {
  it("renders the freeform hero and a grouped gallery", () => {
    setup();
    expect(
      screen.getByRole("button", { name: /describe it in your own words/i }),
    ).toBeInTheDocument();
    // A canonical intent card is present.
    expect(
      screen.getByRole("button", { name: /home loan or refinance/i }),
    ).toBeInTheDocument();
  });

  it("shows an AI badge in the hero when aiEnabled", () => {
    setup({ aiEnabled: true });
    const hero = screen.getByRole("button", { name: /describe it in your own words/i });
    expect(hero).toHaveTextContent(/AI/);
  });

  it("calls onFreeform when the hero is clicked", async () => {
    const user = userEvent.setup();
    const { onFreeform } = setup();
    await user.click(
      screen.getByRole("button", { name: /describe it in your own words/i }),
    );
    expect(onFreeform).toHaveBeenCalledTimes(1);
  });

  it("calls onSelect with the chosen intent", async () => {
    const user = userEvent.setup();
    const { onSelect } = setup();
    await user.click(screen.getByRole("button", { name: /home loan or refinance/i }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0]?.[0]?.template).toBe("mortgage");
  });

  it("filters intents by search query (quiz vocabulary)", async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByRole("searchbox"), "refinance");
    // The mortgage card surfaces…
    expect(
      screen.getByRole("button", { name: /home loan or refinance/i }),
    ).toBeInTheDocument();
    // …and an unrelated card drops out of the results.
    expect(
      screen.queryByRole("button", { name: /buying a business/i }),
    ).not.toBeInTheDocument();
  });

  it("offers the freeform escape hatch when nothing matches", async () => {
    const user = userEvent.setup();
    const { onFreeform } = setup();
    await user.type(screen.getByRole("searchbox"), "zzzqqxnomatch");
    expect(screen.getByText(/no exact match/i)).toBeInTheDocument();
    // Both the hero and the empty-state link share wording; the inline link is last.
    const buttons = screen.getAllByRole("button", {
      name: /describe it in your own words/i,
    });
    await user.click(buttons[buttons.length - 1]!);
    expect(onFreeform).toHaveBeenCalled();
  });
});
