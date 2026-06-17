/**
 * SVG icon path table, ported verbatim from the design's icon set.
 * Each entry is a list of primitive shapes drawn in a 24×24 viewBox.
 * Rendered by <Icon /> with stroke = currentColor.
 */
export type IconShape =
  | { t: "path"; d: string }
  | { t: "circle"; cx: number; cy: number; r: number }
  | { t: "rect"; x: number; y: number; width: number; height: number; rx: number };

export const ICONS: Record<string, IconShape[]> = {
  dashboard: [
    { t: "rect", x: 3, y: 3, width: 8, height: 9, rx: 1 },
    { t: "rect", x: 13, y: 3, width: 8, height: 5, rx: 1 },
    { t: "rect", x: 13, y: 10, width: 8, height: 11, rx: 1 },
    { t: "rect", x: 3, y: 14, width: 8, height: 7, rx: 1 },
  ],
  invoices: [
    { t: "path", d: "M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17l-3-2-3 2-3-2-3 2Z" },
    { t: "path", d: "M8 8h8" },
    { t: "path", d: "M8 12h8" },
    { t: "path", d: "M8 16h5" },
  ],
  creditNote: [
    { t: "path", d: "M14 3v4a1 1 0 0 0 1 1h4" },
    { t: "path", d: "M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" },
    { t: "path", d: "M9 14h6" },
  ],
  debitNote: [
    { t: "path", d: "M14 3v4a1 1 0 0 0 1 1h4" },
    { t: "path", d: "M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" },
    { t: "path", d: "M12 11v6" },
    { t: "path", d: "M9 14h6" },
  ],
  customers: [
    { t: "circle", cx: 9, cy: 8, r: 3.2 },
    { t: "path", d: "M3.8 19a5.2 5.2 0 0 1 10.4 0" },
    { t: "path", d: "M16.5 6.2a3 3 0 0 1 0 5.6" },
    { t: "path", d: "M17.6 13.4a5.2 5.2 0 0 1 2.6 5.6" },
  ],
  products: [
    { t: "path", d: "M21 8 12 3 3 8v8l9 5 9-5Z" },
    { t: "path", d: "M3 8l9 5 9-5" },
    { t: "path", d: "M12 13v8" },
  ],
  reports: [
    { t: "path", d: "M14 3v4a1 1 0 0 0 1 1h4" },
    { t: "path", d: "M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" },
    { t: "path", d: "M9 17v-2" },
    { t: "path", d: "M12 17v-4" },
    { t: "path", d: "M15 17v-1" },
  ],
  analytics: [
    { t: "path", d: "M4 4v16h16" },
    { t: "path", d: "m7 14 3-3 3 2 5-6" },
    { t: "path", d: "M18 7h2v2" },
  ],
  integration: [
    { t: "circle", cx: 12, cy: 12, r: 2.4 },
    { t: "circle", cx: 5, cy: 5, r: 2 },
    { t: "circle", cx: 19, cy: 5, r: 2 },
    { t: "circle", cx: 5, cy: 19, r: 2 },
    { t: "circle", cx: 19, cy: 19, r: 2 },
    { t: "path", d: "M6.4 6.4 10.3 10.3" },
    { t: "path", d: "M17.6 6.4 13.7 10.3" },
    { t: "path", d: "M6.4 17.6 10.3 13.7" },
    { t: "path", d: "M17.6 17.6 13.7 13.7" },
  ],
  compliance: [
    { t: "path", d: "M12 3 5 6v5c0 4.5 3 8 7 9 4-1 7-4.5 7-9V6Z" },
    { t: "path", d: "m9 12 2 2 4-4" },
  ],
  audit: [
    { t: "rect", x: 3, y: 4, width: 18, height: 4, rx: 1 },
    { t: "path", d: "M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" },
    { t: "path", d: "M10 12h4" },
  ],
  ai: [
    { t: "path", d: "M12 3l1.7 4.6L18.3 9.3 13.7 11 12 15.6 10.3 11 5.7 9.3l4.6-1.7Z" },
    { t: "path", d: "M18.5 14l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6Z" },
  ],
  notifications: [
    { t: "path", d: "M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" },
    { t: "path", d: "M10.5 19a2 2 0 0 0 3 0" },
  ],
  users: [
    { t: "circle", cx: 10, cy: 8, r: 3.2 },
    { t: "path", d: "M4 19a6 6 0 0 1 9-5" },
    { t: "path", d: "M18 12.2l3 1.1V16c0 2-1.5 3.3-3 3.9-1.5-.6-3-1.9-3-3.9v-2.7Z" },
  ],
  settings: [
    { t: "circle", cx: 12, cy: 12, r: 3 },
    {
      t: "path",
      d: "M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1",
    },
  ],
  check: [{ t: "path", d: "m4 12 4.5 4.5L19 6" }],
  lock: [
    { t: "path", d: "M12 3 5 6v5c0 4.5 3 8 7 9 4-1 7-4.5 7-9V6Z" },
    { t: "rect", x: 9, y: 11, width: 6, height: 5, rx: 1 },
    { t: "path", d: "M10.5 11v-1.5a1.5 1.5 0 0 1 3 0V11" },
  ],
  bolt: [{ t: "path", d: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z" }],
  up: [
    { t: "path", d: "M7 17 17 7" },
    { t: "path", d: "M8 7h9v9" },
  ],
  clock: [
    { t: "circle", cx: 12, cy: 12, r: 9 },
    { t: "path", d: "M12 7v5l3 2" },
  ],
  cert: [
    { t: "circle", cx: 12, cy: 9, r: 5 },
    { t: "path", d: "m9 13-1.5 8L12 19l4.5 2L15 13" },
    { t: "path", d: "m10 9 1.5 1.5L14.5 7.5" },
  ],
  sun: [
    { t: "circle", cx: 12, cy: 12, r: 4 },
    {
      t: "path",
      d: "M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
    },
  ],
  moon: [{ t: "path", d: "M20 13.5A8 8 0 1 1 10.5 4 6.5 6.5 0 0 0 20 13.5Z" }],
  // extras used by the shell / modules
  search: [
    { t: "circle", cx: 11, cy: 11, r: 7 },
    { t: "path", d: "m21 21-4.3-4.3" },
  ],
  chevron: [{ t: "path", d: "m6 9 6 6 6-6" }],
  plus: [{ t: "path", d: "M12 5v14M5 12h14" }],
  filter: [{ t: "path", d: "M3 5h18l-7 8v6l-4 2v-8Z" }],
  cloud: [{ t: "path", d: "M4 17.5a4.5 4.5 0 0 1 1-8.9 6 6 0 0 1 11.6-1.6A4.5 4.5 0 0 1 18 17.5Z" }],
};
