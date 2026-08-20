import { describe, it, expect } from "vitest";
import { riyadhToday, riyadhTimeOfDay, riyadhMonthStartUtc, parseRiyadhTimestamp } from "./riyadh";

describe("riyadh time policy", () => {
  it("rolls a late-UTC-evening instant into the next Riyadh calendar day", () => {
    // 21:30 UTC = 00:30 Riyadh (+3h) the NEXT day.
    expect(riyadhToday(new Date("2026-08-31T21:30:00Z"))).toBe("2026-09-01");
  });

  it("keeps an early-UTC-morning instant on the same Riyadh day", () => {
    // 05:00 UTC = 08:00 Riyadh, same calendar day.
    expect(riyadhToday(new Date("2026-08-31T05:00:00Z"))).toBe("2026-08-31");
  });

  it("handles the year-end boundary", () => {
    expect(riyadhToday(new Date("2026-12-31T22:00:00Z"))).toBe("2027-01-01");
  });

  it("reads the correct Riyadh time-of-day, wrapping past midnight", () => {
    expect(riyadhTimeOfDay(new Date("2026-08-31T21:30:15Z"))).toBe("00:30:15");
    expect(riyadhTimeOfDay(new Date("2026-08-31T05:00:00Z"))).toBe("08:00:00");
  });

  it("computes the Riyadh month start as a UTC instant", () => {
    // 2026-08-31T21:30Z is Riyadh Sept 1 — month start is Sept 1 00:00 Riyadh = Aug 31 21:00 UTC.
    const start = riyadhMonthStartUtc(new Date("2026-08-31T21:30:00Z"));
    expect(start.toISOString()).toBe("2026-08-31T21:00:00.000Z");
  });

  it("month start for a plain mid-month instant is the 1st at Riyadh midnight", () => {
    const start = riyadhMonthStartUtc(new Date("2026-08-15T12:00:00Z"));
    expect(start.toISOString()).toBe("2026-07-31T21:00:00.000Z");
  });

  it("parses a stored Riyadh date+time back to the correct UTC instant", () => {
    const d = parseRiyadhTimestamp("2026-08-12", "10:00:00");
    // 10:00 Riyadh = 07:00 UTC.
    expect(d.toISOString()).toBe("2026-08-12T07:00:00.000Z");
  });

  it("round-trips: parse then re-derive the same Riyadh day", () => {
    const d = parseRiyadhTimestamp("2026-08-12", "23:59:59");
    expect(riyadhToday(d)).toBe("2026-08-12");
  });

  it("an invoice issued just after Riyadh midnight round-trips to the same day, not the previous UTC day", () => {
    const d = parseRiyadhTimestamp("2026-08-12", "00:05:00");
    // 00:05 Riyadh = 21:05 UTC on the 11th — confirms storage is a real instant, not a naive string echo.
    expect(d.toISOString()).toBe("2026-08-11T21:05:00.000Z");
    expect(riyadhToday(d)).toBe("2026-08-12");
  });
});
