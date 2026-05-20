import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import { render, screen, act } from "./setup";
import ScrollFadeIn from "@/components/ScrollFadeIn";

type IOCallback = (entries: IntersectionObserverEntry[]) => void;
const observers: Array<{
  cb: IOCallback;
  observe: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}> = [];

class MockIO {
  cb: IOCallback;
  observe: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  constructor(cb: IOCallback) {
    this.cb = cb;
    this.observe = vi.fn();
    this.unobserve = vi.fn();
    this.disconnect = vi.fn();
    observers.push({
      cb,
      observe: this.observe,
      unobserve: this.unobserve,
      disconnect: this.disconnect,
    });
  }
}

beforeEach(() => {
  observers.length = 0;
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
    MockIO;
});

afterEach(() => {
  delete (globalThis as unknown as { IntersectionObserver?: unknown })
    .IntersectionObserver;
});

describe("ScrollFadeIn", () => {
  it("renders its children", () => {
    render(
      <ScrollFadeIn>
        <p>hello child</p>
      </ScrollFadeIn>,
    );
    expect(screen.getByText("hello child")).toBeInTheDocument();
  });

  it("applies the scroll-fade-in animation class after hydration", () => {
    const { container } = render(
      <ScrollFadeIn>
        <p>x</p>
      </ScrollFadeIn>,
    );
    expect(container.firstElementChild?.className).toContain(
      "scroll-fade-in",
    );
  });

  it("appends a delay-N class when delay is provided", () => {
    const { container } = render(
      <ScrollFadeIn delay={300}>
        <p>x</p>
      </ScrollFadeIn>,
    );
    expect(container.firstElementChild?.className).toContain("delay-300");
  });

  it("does not append a delay-N class when delay is omitted", () => {
    const { container } = render(
      <ScrollFadeIn>
        <p>x</p>
      </ScrollFadeIn>,
    );
    expect(container.firstElementChild?.className).not.toMatch(/delay-/);
  });

  it("merges the supplied className onto the wrapper", () => {
    const { container } = render(
      <ScrollFadeIn className="custom-x">
        <p>x</p>
      </ScrollFadeIn>,
    );
    expect(container.firstElementChild?.className).toContain("custom-x");
  });

  it("sets inline contain:'layout style' to prevent layout shift", () => {
    const { container } = render(
      <ScrollFadeIn>
        <p>x</p>
      </ScrollFadeIn>,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.contain).toBe("layout style");
  });

  it("subscribes to the IntersectionObserver on mount", () => {
    render(
      <ScrollFadeIn>
        <p>x</p>
      </ScrollFadeIn>,
    );
    expect(observers).toHaveLength(1);
    expect(observers[0]?.observe).toHaveBeenCalledTimes(1);
  });

  it("adds 'is-visible' and unobserves once the entry intersects", () => {
    const { container } = render(
      <ScrollFadeIn>
        <p>x</p>
      </ScrollFadeIn>,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    act(() => {
      observers[0]?.cb([
        { isIntersecting: true } as IntersectionObserverEntry,
      ]);
    });
    expect(wrapper.className).toContain("is-visible");
    expect(observers[0]?.unobserve).toHaveBeenCalledTimes(1);
  });

  it("does not add 'is-visible' for a non-intersecting entry", () => {
    const { container } = render(
      <ScrollFadeIn>
        <p>x</p>
      </ScrollFadeIn>,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    act(() => {
      observers[0]?.cb([
        { isIntersecting: false } as IntersectionObserverEntry,
      ]);
    });
    expect(wrapper.className).not.toContain("is-visible");
    expect(observers[0]?.unobserve).not.toHaveBeenCalled();
  });

  it("disconnects the observer on unmount", () => {
    const { unmount } = render(
      <ScrollFadeIn>
        <p>x</p>
      </ScrollFadeIn>,
    );
    const obs = observers[0];
    unmount();
    expect(obs?.disconnect).toHaveBeenCalledTimes(1);
  });
});
