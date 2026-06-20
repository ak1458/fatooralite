import "@testing-library/jest-dom/vitest";

// jsdom lacks matchMedia; theme code may read it. Guard for node-env test files.
if (typeof window !== "undefined") {
  window.matchMedia =
    window.matchMedia ||
    ((q: string) =>
      ({
        matches: false,
        media: q,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList);
}
