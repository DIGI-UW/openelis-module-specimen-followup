import "@testing-library/jest-dom/vitest";

// Carbon's TextArea with a counter measures itself; jsdom has no ResizeObserver.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
