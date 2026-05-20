import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import { render } from "./setup";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";

type SWGlobal = {
  serviceWorker?: { register: ReturnType<typeof vi.fn> };
};

const registerMock = vi.fn().mockResolvedValue(undefined);

function setHostname(hostname: string) {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, hostname },
  });
}

function installSwOnNavigator() {
  (navigator as unknown as SWGlobal).serviceWorker = {
    register: registerMock,
  };
}

function removeSwFromNavigator() {
  delete (navigator as unknown as SWGlobal).serviceWorker;
}

beforeEach(() => {
  registerMock.mockClear();
  registerMock.mockResolvedValue(undefined);
});

afterEach(() => {
  removeSwFromNavigator();
  vi.unstubAllEnvs();
  setHostname("localhost");
});

describe("ServiceWorkerRegistrar", () => {
  it("returns null and renders nothing in the DOM", () => {
    const { container } = render(<ServiceWorkerRegistrar />);
    expect(container.firstChild).toBeNull();
  });

  it("does NOT register when navigator.serviceWorker is unsupported", () => {
    removeSwFromNavigator();
    setHostname("invest.com.au");
    render(<ServiceWorkerRegistrar />);
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("skips registration on localhost by default", () => {
    installSwOnNavigator();
    setHostname("localhost");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_SW_LOCAL", "");
    render(<ServiceWorkerRegistrar />);
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("skips registration on 127.0.0.1 by default", () => {
    installSwOnNavigator();
    setHostname("127.0.0.1");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_SW_LOCAL", "");
    render(<ServiceWorkerRegistrar />);
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("registers on localhost when NEXT_PUBLIC_ENABLE_SW_LOCAL=1", () => {
    installSwOnNavigator();
    setHostname("localhost");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_SW_LOCAL", "1");
    // readyState in jsdom is "complete" — register fires immediately.
    render(<ServiceWorkerRegistrar />);
    expect(registerMock).toHaveBeenCalledTimes(1);
    expect(registerMock).toHaveBeenCalledWith("/sw.js", { scope: "/" });
  });

  it("registers on production hostnames", () => {
    installSwOnNavigator();
    setHostname("invest.com.au");
    render(<ServiceWorkerRegistrar />);
    expect(registerMock).toHaveBeenCalledTimes(1);
    expect(registerMock).toHaveBeenCalledWith("/sw.js", { scope: "/" });
  });

  it("swallows a register() rejection without throwing", async () => {
    installSwOnNavigator();
    setHostname("invest.com.au");
    registerMock.mockRejectedValueOnce(new Error("boom"));
    expect(() => render(<ServiceWorkerRegistrar />)).not.toThrow();
    // Flush microtasks so the .catch() runs.
    await Promise.resolve();
    expect(registerMock).toHaveBeenCalledTimes(1);
  });
});
