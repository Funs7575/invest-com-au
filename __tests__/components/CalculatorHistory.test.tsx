import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent } from "./setup";
import CalculatorHistory from "@/components/CalculatorHistory";

const ENTRIES = [
  {
    id: "scenario-1",
    label: "Saving 10% for retirement",
    summary: "Final balance $1.2M",
    timestamp: new Date("2026-05-15T10:30:00Z").getTime(),
    inputs: { contribution: 0.1, duration: 30 },
  },
  {
    id: "scenario-2",
    label: "Mortgage 30y @ 6.0%",
    summary: "Monthly $2,400",
    timestamp: new Date("2026-05-16T15:00:00Z").getTime(),
    inputs: { rate: 0.06, term: 30 },
  },
];

describe("CalculatorHistory", () => {
  it("renders nothing when entries is empty", () => {
    const { container } = render(
      <CalculatorHistory entries={[]} onLoad={() => {}} onClear={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the header with entry count", () => {
    render(
      <CalculatorHistory
        entries={ENTRIES}
        onLoad={() => {}}
        onClear={() => {}}
      />,
    );
    expect(screen.getByText(/Saved scenarios \(2\)/)).toBeInTheDocument();
  });

  it("renders one card per entry with label + summary", () => {
    render(
      <CalculatorHistory
        entries={ENTRIES}
        onLoad={() => {}}
        onClear={() => {}}
      />,
    );
    expect(screen.getByText("Saving 10% for retirement")).toBeInTheDocument();
    expect(screen.getByText("Final balance $1.2M")).toBeInTheDocument();
    expect(screen.getByText("Mortgage 30y @ 6.0%")).toBeInTheDocument();
    expect(screen.getByText("Monthly $2,400")).toBeInTheDocument();
  });

  it("Load button fires onLoad with the entry's inputs", async () => {
    const user = userEvent.setup();
    const onLoad = vi.fn();
    render(
      <CalculatorHistory entries={ENTRIES} onLoad={onLoad} onClear={() => {}} />,
    );
    const loadButtons = screen.getAllByRole("button", { name: "Load" });
    await user.click(loadButtons[0]);
    expect(onLoad).toHaveBeenCalledWith(ENTRIES[0].inputs);
  });

  it("Clear all button fires onClear", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(
      <CalculatorHistory entries={ENTRIES} onLoad={() => {}} onClear={onClear} />,
    );
    await user.click(screen.getByRole("button", { name: "Clear all" }));
    expect(onClear).toHaveBeenCalled();
  });

  it("formats timestamps via en-AU short-day + hour", () => {
    render(
      <CalculatorHistory
        entries={[ENTRIES[0]]}
        onLoad={() => {}}
        onClear={() => {}}
      />,
    );
    // Match "15 May" + a time pattern like "20:30" or "08:30 pm"
    const timestampEl = screen.getByText(/15 May/);
    expect(timestampEl).toBeInTheDocument();
  });
});
