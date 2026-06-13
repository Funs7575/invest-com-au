import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent } from "@testing-library/react";
import { render, screen, waitFor, act } from "./setup";
import CalculatorShell from "@/components/CalculatorShell";

vi.mock("@/components/Icon", () => ({
  default: ({ name, ...rest }: { name: string; [key: string]: unknown }) => (
    <span data-testid={`icon-${name}`} {...rest} />
  ),
}));

const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: mockWriteText },
  writable: true,
});

const mockFetch = vi.fn().mockResolvedValue({ ok: true });
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({ ok: true });
});

describe("CalculatorShell", () => {
  it("renders the title in the header", () => {
    render(<CalculatorShell title="My Calculator">content</CalculatorShell>);
    expect(screen.getByText("My Calculator")).toBeInTheDocument();
  });

  it("renders children", () => {
    render(
      <CalculatorShell title="Calc">
        <span data-testid="child-content">inner</span>
      </CalculatorShell>
    );
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
  });

  it("renders the calculator icon by default", () => {
    render(<CalculatorShell title="Calc">x</CalculatorShell>);
    expect(screen.getByTestId("icon-calculator")).toBeInTheDocument();
  });

  it("renders an optional scenario slot when provided", () => {
    render(
      <CalculatorShell
        title="Calc"
        scenario={<div data-testid="scenario-slot">bar</div>}
      >
        body
      </CalculatorShell>
    );
    expect(screen.getByTestId("scenario-slot")).toBeInTheDocument();
  });

  it("renders no scenario slot by default (zero footprint)", () => {
    render(<CalculatorShell title="Calc">body</CalculatorShell>);
    expect(screen.queryByTestId("scenario-slot")).not.toBeInTheDocument();
  });

  it("renders a custom icon name", () => {
    render(<CalculatorShell title="Calc" iconName="bar-chart">x</CalculatorShell>);
    expect(screen.getByTestId("icon-bar-chart")).toBeInTheDocument();
  });

  it("renders the data-testid attribute", () => {
    render(<CalculatorShell title="Calc">x</CalculatorShell>);
    expect(screen.getByTestId("calculator-shell")).toBeInTheDocument();
  });

  it("renders disclaimer text when provided", () => {
    render(
      <CalculatorShell title="Calc" disclaimer="General info only.">
        x
      </CalculatorShell>
    );
    expect(screen.getByTestId("disclaimer")).toHaveTextContent("General info only.");
  });

  it("does not render disclaimer when not provided", () => {
    render(<CalculatorShell title="Calc">x</CalculatorShell>);
    expect(screen.queryByTestId("disclaimer")).not.toBeInTheDocument();
  });

  it("renders lead form slot when leadForm prop provided", () => {
    render(
      <CalculatorShell title="Calc" leadForm={<div data-testid="my-form">form</div>}>
        x
      </CalculatorShell>
    );
    expect(screen.getByTestId("lead-form-slot")).toBeInTheDocument();
    expect(screen.getByTestId("my-form")).toBeInTheDocument();
  });

  it("does not render lead form slot when leadForm not provided", () => {
    render(<CalculatorShell title="Calc">x</CalculatorShell>);
    expect(screen.queryByTestId("lead-form-slot")).not.toBeInTheDocument();
  });

  describe("share results", () => {
    it("does not render share button by default", () => {
      render(<CalculatorShell title="Calc">x</CalculatorShell>);
      expect(screen.queryByTestId("share-button")).not.toBeInTheDocument();
    });

    it("renders share button when shareResults=true", () => {
      render(
        <CalculatorShell title="Calc" shareResults>
          x
        </CalculatorShell>
      );
      expect(screen.getByTestId("share-button")).toBeInTheDocument();
    });

    it("copies URL to clipboard when share button clicked", async () => {
      Object.defineProperty(window, "location", {
        value: { href: "https://example.com/calc" },
        writable: true,
      });
      render(
        <CalculatorShell title="Calc" shareResults>
          x
        </CalculatorShell>
      );
      await act(async () => {
        screen.getByTestId("share-button").click();
      });
      expect(mockWriteText).toHaveBeenCalledWith("https://example.com/calc");
    });

    it('shows "Copied!" feedback after share click', async () => {
      render(
        <CalculatorShell title="Calc" shareResults>
          x
        </CalculatorShell>
      );
      expect(screen.getByTestId("share-button")).toHaveTextContent("Share Results");
      await act(async () => {
        screen.getByTestId("share-button").click();
      });
      await waitFor(() => {
        expect(screen.getByTestId("share-button")).toHaveTextContent("Copied!");
      });
    });
  });

  describe("email gate", () => {
    it("does not render email gate by default", () => {
      render(<CalculatorShell title="Calc">x</CalculatorShell>);
      expect(screen.queryByTestId("email-gate")).not.toBeInTheDocument();
    });

    it("renders email gate when emailGate prop provided", () => {
      render(
        <CalculatorShell title="Calc" emailGate={{ source: "test_calc" }}>
          x
        </CalculatorShell>
      );
      expect(screen.getByTestId("email-gate")).toBeInTheDocument();
    });

    it("renders default prompt text", () => {
      render(
        <CalculatorShell title="Calc" emailGate={{ source: "test_calc" }}>
          x
        </CalculatorShell>
      );
      expect(screen.getByText("Get these results emailed to you")).toBeInTheDocument();
    });

    it("renders custom prompt text", () => {
      render(
        <CalculatorShell
          title="Calc"
          emailGate={{ source: "test_calc", prompt: "Email me the breakdown" }}
        >
          x
        </CalculatorShell>
      );
      expect(screen.getByText("Email me the breakdown")).toBeInTheDocument();
    });

    it("renders custom ctaLabel", () => {
      render(
        <CalculatorShell
          title="Calc"
          emailGate={{ source: "test_calc", ctaLabel: "Email Report" }}
        >
          x
        </CalculatorShell>
      );
      expect(screen.getByTestId("email-submit")).toHaveTextContent("Email Report");
    });

    it("posts to /api/email-capture with correct source on submit", async () => {
      render(
        <CalculatorShell title="Calc" emailGate={{ source: "rd_calculator" }}>
          x
        </CalculatorShell>
      );
      const emailInput = screen.getByLabelText("Email address");
      await act(async () => {
        fireEvent.change(emailInput, { target: { value: "user@example.com" } });
        screen.getByTestId("email-submit").click();
      });
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/email-capture",
          expect.objectContaining({
            method: "POST",
            body: expect.stringContaining('"source":"rd_calculator"'),
          })
        );
      });
    });

    it("shows confirmation after email submission", async () => {
      render(
        <CalculatorShell title="Calc" emailGate={{ source: "test_calc" }}>
          x
        </CalculatorShell>
      );
      const emailInput = screen.getByLabelText("Email address");
      await act(async () => {
        fireEvent.change(emailInput, { target: { value: "user@example.com" } });
        screen.getByTestId("email-submit").click();
      });
      await waitFor(() => {
        expect(screen.getByTestId("email-confirmation")).toBeInTheDocument();
        expect(screen.queryByTestId("email-gate")).not.toBeInTheDocument();
      });
    });

    it("does not submit with invalid email", async () => {
      render(
        <CalculatorShell title="Calc" emailGate={{ source: "test_calc" }}>
          x
        </CalculatorShell>
      );
      const emailInput = screen.getByLabelText("Email address");
      await act(async () => {
        fireEvent.change(emailInput, { target: { value: "notanemail" } });
        screen.getByTestId("email-submit").click();
      });
      expect(mockFetch).not.toHaveBeenCalled();
      expect(screen.queryByTestId("email-confirmation")).not.toBeInTheDocument();
    });
  });
});
