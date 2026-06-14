import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

type Membership = { kind: string; kind_id: string; status: string; display_label: string };

function stubActiveKind(memberships: Membership[], active: string | null = null) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => ({ memberships, active }) })),
  );
}

const m = (kind: string, display_label = kind): Membership => ({
  kind,
  kind_id: `${kind}-1`,
  status: "active",
  display_label,
});

describe("WorkspaceSwitcher", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("renders nothing for an unauthenticated user (no memberships)", async () => {
    stubActiveKind([]);
    const { container } = render(<WorkspaceSwitcher />);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for an investor-only user (investor has no portal)", async () => {
    stubActiveKind([m("investor", "Investor")], "investor");
    const { container } = render(<WorkspaceSwitcher />);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("renders a direct portal link for a single advisor membership (the nav gap)", async () => {
    stubActiveKind([m("advisor", "Kai / Nexus")], "advisor");
    render(<WorkspaceSwitcher />);
    const link = await screen.findByTestId("portal-link");
    expect(link).toHaveAttribute("href", "/advisor-portal");
    expect(link).toHaveTextContent(/advisor portal/i);
  });

  it("links a single broker_partner membership to the broker portal", async () => {
    stubActiveKind([m("broker_partner")], "broker_partner");
    render(<WorkspaceSwitcher />);
    const link = await screen.findByTestId("portal-link");
    expect(link).toHaveAttribute("href", "/broker-portal");
  });

  it("renders the switcher (not a single link) for 2+ memberships", async () => {
    stubActiveKind([m("investor", "Investor"), m("advisor", "Advisor")], "investor");
    render(<WorkspaceSwitcher />);
    expect(await screen.findByTestId("workspace-switcher")).toBeInTheDocument();
    expect(screen.queryByTestId("portal-link")).toBeNull();
  });
});
