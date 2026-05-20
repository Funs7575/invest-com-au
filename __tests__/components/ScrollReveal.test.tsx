import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "./setup";
import ScrollReveal from "@/components/ScrollReveal";

type IOCallback = (entries: IntersectionObserverEntry[]) => void;
const observers: Array<{
  cb: IOCallback;
  observe: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}> = [];

class MockIntersectionObserver {
  observe: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  cb: IOCallback;
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
  // Default getBoundingClientRect for HTMLElement: zeros — bottom>0 fails so
  // the IO path is taken unless a test overrides it.
  // @ts-expect-error -- attaching to global for tests
  globalThis.IntersectionObserver = MockIntersectionObserver;
});

afterEach(() => {
  // @ts-expect-error -- cleanup
  delete globalThis.IntersectionObserver;
});

describe("ScrollReveal", () => {
  it("renders its children", () => {
    render(
      <ScrollReveal>
        <p>hello child</p>
      </ScrollReveal>,
    );
    expect(screen.getByText("hello child")).toBeInTheDocument();
  });

  it("defaults to a <div> wrapper", () => {
    const { container } = render(
      <ScrollReveal>
        <p>x</p>
      </ScrollReveal>,
    );
    expect(container.firstElementChild?.tagName).toBe("DIV");
  });

  it("renders as a <section> when `as=\"section\"` is passed", () => {
    const { container } = render(
      <ScrollReveal as="section">
        <span>x</span>
      </ScrollReveal>,
    );
    expect(container.firstElementChild?.tagName).toBe("SECTION");
  });

  it("renders as a <ul> when `as=\"ul\"` is passed", () => {
    const { container } = render(
      <ScrollReveal as="ul">
        <li>x</li>
      </ScrollReveal>,
    );
    expect(container.firstElementChild?.tagName).toBe("UL");
  });

  it("renders as a <table> when `as=\"table\"` is passed", () => {
    const { container } = render(
      <ScrollReveal as="table">
        <tbody>
          <tr>
            <td>x</td>
          </tr>
        </tbody>
      </ScrollReveal>,
    );
    expect(container.firstElementChild?.tagName).toBe("TABLE");
  });

  it("merges the supplied className onto the wrapper after hydration", () => {
    const { container } = render(
      <ScrollReveal className="my-extra">
        <p>x</p>
      </ScrollReveal>,
    );
    expect(container.firstElementChild?.className).toContain("my-extra");
  });

  it("applies the default animation class after hydration", () => {
    const { container } = render(
      <ScrollReveal>
        <p>x</p>
      </ScrollReveal>,
    );
    expect(container.firstElementChild?.className).toContain("scroll-fade-in");
  });

  it("applies a custom animation class when provided", () => {
    const { container } = render(
      <ScrollReveal animation="slide-up">
        <p>x</p>
      </ScrollReveal>,
    );
    expect(container.firstElementChild?.className).toContain("slide-up");
  });

  it("appends a delay-N class when delay is provided", () => {
    const { container } = render(
      <ScrollReveal delay={200}>
        <p>x</p>
      </ScrollReveal>,
    );
    expect(container.firstElementChild?.className).toContain("delay-200");
  });

  it("does not append a delay-N class when delay is omitted", () => {
    const { container } = render(
      <ScrollReveal>
        <p>x</p>
      </ScrollReveal>,
    );
    expect(container.firstElementChild?.className).not.toMatch(/delay-/);
  });

  it("subscribes to IntersectionObserver when not initially in viewport", () => {
    render(
      <ScrollReveal>
        <p>x</p>
      </ScrollReveal>,
    );
    expect(observers).toHaveLength(1);
    expect(observers[0]?.observe).toHaveBeenCalledTimes(1);
  });

  it("adds 'is-visible' once the observer fires with an intersecting entry", () => {
    const { container } = render(
      <ScrollReveal>
        <p>x</p>
      </ScrollReveal>,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).not.toContain("is-visible");

    act(() => {
      observers[0]?.cb([
        { isIntersecting: true } as IntersectionObserverEntry,
      ]);
    });
    expect(wrapper.className).toContain("is-visible");
    expect(observers[0]?.unobserve).toHaveBeenCalledTimes(1);
  });

  it("does not add 'is-visible' when the entry is non-intersecting", () => {
    const { container } = render(
      <ScrollReveal>
        <p>x</p>
      </ScrollReveal>,
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
      <ScrollReveal>
        <p>x</p>
      </ScrollReveal>,
    );
    const obs = observers[0];
    unmount();
    expect(obs?.disconnect).toHaveBeenCalledTimes(1);
  });

  it("adds 'is-visible' immediately and skips the observer when the element already overlaps the viewport", () => {
    // Patch getBoundingClientRect to claim the element is currently visible.
    const spy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockReturnValue({
        top: 100,
        bottom: 200,
        left: 0,
        right: 0,
        width: 0,
        height: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

    const { container } = render(
      <ScrollReveal>
        <p>x</p>
      </ScrollReveal>,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain("is-visible");
    // No observer created — early return short-circuits before `new IO()`.
    expect(observers).toHaveLength(0);

    spy.mockRestore();
  });
});
