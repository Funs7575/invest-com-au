import { describe, it, expect } from "vitest";
import { render, screen, userEvent } from "./setup";
import SwitchChecklist from "@/components/SwitchChecklist";
import type { Broker, BrokerTransferGuide, TransferStep } from "@/lib/types";

// Minimal Broker fixture — the component only ever reads `.name`.
function broker(name: string): Broker {
  return { name } as Broker;
}

function step(title: string): TransferStep {
  return {
    title,
    description: `${title} description`,
    time_estimate: "5 minutes",
  };
}

function guide(overrides: Partial<BrokerTransferGuide>): BrokerTransferGuide {
  return {
    id: 1,
    broker_slug: "broker",
    transfer_type: "outbound",
    steps: [],
    chess_transfer_fee: 5400,
    supports_in_specie: true,
    special_requirements: [],
    estimated_timeline_days: 5,
    helpful_links: [],
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...overrides,
  };
}

const source = broker("OldBroker");
const target = broker("NewBroker");

describe("SwitchChecklist", () => {
  it("renders only the 2 default verify steps when no guides are provided", () => {
    render(
      <SwitchChecklist
        sourceBroker={source}
        targetBroker={target}
        holdings={10}
        outboundGuide={null}
        inboundGuide={null}
      />,
    );

    // Two hardcoded verify steps.
    expect(screen.getByText("Verify all holdings transferred")).toBeInTheDocument();
    expect(screen.getByText("Update tax records")).toBeInTheDocument();

    // Progress starts at zero of 2.
    expect(screen.getByText("0 of 2 steps complete")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();

    // No Phase 1 / Phase 2 sections without inbound/outbound steps.
    expect(screen.queryByText(/Open NewBroker Account/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Transfer from OldBroker/)).not.toBeInTheDocument();
  });

  it("toggles a step's checkbox via aria-label and updates progress both ways", async () => {
    const user = userEvent.setup();
    render(
      <SwitchChecklist
        sourceBroker={source}
        targetBroker={target}
        holdings={10}
        outboundGuide={null}
        inboundGuide={null}
      />,
    );

    // Two verify steps -> two checkboxes, both initially "Check step".
    const checkButtons = screen.getAllByLabelText("Check step");
    expect(checkButtons).toHaveLength(2);

    await user.click(checkButtons[0]!);

    expect(screen.getByText("1 of 2 steps complete")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    // The clicked one flips to "Uncheck step".
    expect(screen.getAllByLabelText("Uncheck step")).toHaveLength(1);

    // Click the same checkbox again to decrement (Set delete).
    await user.click(screen.getByLabelText("Uncheck step"));
    expect(screen.getByText("0 of 2 steps complete")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.queryByLabelText("Uncheck step")).not.toBeInTheDocument();
  });

  it("shows the completion chip and 100% when all steps are checked", async () => {
    const user = userEvent.setup();
    render(
      <SwitchChecklist
        sourceBroker={source}
        targetBroker={target}
        holdings={10}
        outboundGuide={null}
        inboundGuide={null}
      />,
    );

    expect(
      screen.queryByText(/Nothing missed/),
    ).not.toBeInTheDocument();

    for (const btn of screen.getAllByLabelText("Check step")) {
      await user.click(btn);
    }

    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText(/Nothing missed/)).toBeInTheDocument();
  });

  it("renders Phase 1 and Phase 2 sections with their steps", () => {
    render(
      <SwitchChecklist
        sourceBroker={source}
        targetBroker={target}
        holdings={10}
        inboundGuide={guide({
          transfer_type: "inbound",
          steps: [step("Submit application")],
        })}
        outboundGuide={guide({
          transfer_type: "outbound",
          steps: [step("Request CHESS transfer")],
        })}
      />,
    );

    // Phase 1 header references the target broker.
    expect(screen.getByText(/Open NewBroker Account/)).toBeInTheDocument();
    expect(screen.getByText("Submit application")).toBeInTheDocument();

    // Phase 2 header references the source broker.
    expect(screen.getByText(/Transfer from OldBroker/)).toBeInTheDocument();
    expect(screen.getByText("Request CHESS transfer")).toBeInTheDocument();
  });

  it("computes the standard transfer cost without a non-standard note", () => {
    render(
      <SwitchChecklist
        sourceBroker={source}
        targetBroker={target}
        holdings={10}
        inboundGuide={null}
        outboundGuide={guide({ chess_transfer_fee: 5400 })}
      />,
    );

    // 5400 cents / 100 = $54 per holding * 10 = $540.
    expect(screen.getByText(/\$540/)).toBeInTheDocument();
    // Standard fee -> no non-standard note.
    expect(screen.queryByText(/non-standard fee/)).not.toBeInTheDocument();
  });

  it("flags a non-standard fee with the note", () => {
    render(
      <SwitchChecklist
        sourceBroker={source}
        targetBroker={target}
        holdings={4}
        inboundGuide={null}
        outboundGuide={guide({ chess_transfer_fee: 9900 })}
      />,
    );

    // 9900 / 100 = $99 * 4 = $396.
    expect(screen.getByText(/\$396/)).toBeInTheDocument();
    expect(screen.getByText(/non-standard fee/)).toBeInTheDocument();
  });

  it("shows the Sell & Rebuy warning when the outbound guide lacks in-specie support", () => {
    render(
      <SwitchChecklist
        sourceBroker={source}
        targetBroker={target}
        holdings={10}
        inboundGuide={null}
        outboundGuide={guide({ supports_in_specie: false })}
      />,
    );

    expect(screen.getByText(/Sell & Rebuy Required/)).toBeInTheDocument();
    expect(screen.queryByText(/In-Specie Transfer Available/)).not.toBeInTheDocument();
  });

  it("shows the In-Specie Available block when both guides support it", () => {
    render(
      <SwitchChecklist
        sourceBroker={source}
        targetBroker={target}
        holdings={10}
        inboundGuide={guide({ transfer_type: "inbound", supports_in_specie: true })}
        outboundGuide={guide({ supports_in_specie: true })}
      />,
    );

    expect(screen.getByText(/In-Specie Transfer Available/)).toBeInTheDocument();
    expect(screen.queryByText(/Sell & Rebuy Required/)).not.toBeInTheDocument();
  });

  it("expands and collapses the CGT section on header click", async () => {
    const user = userEvent.setup();
    render(
      <SwitchChecklist
        sourceBroker={source}
        targetBroker={target}
        holdings={10}
        inboundGuide={null}
        outboundGuide={null}
      />,
    );

    // Collapsed by default.
    expect(
      screen.queryByText("In-Specie Transfer (Recommended)"),
    ).not.toBeInTheDocument();

    const cgtHeader = screen.getByRole("button", {
      name: /Capital Gains Tax \(CGT\) Implications/,
    });

    await user.click(cgtHeader);
    expect(
      screen.getByText("In-Specie Transfer (Recommended)"),
    ).toBeInTheDocument();

    await user.click(cgtHeader);
    expect(
      screen.queryByText("In-Specie Transfer (Recommended)"),
    ).not.toBeInTheDocument();
  });
});
