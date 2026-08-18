// @vitest-environment node
import { describe, it, expect } from "vitest";
import { splitBidiRuns, visualRuns, hasRtl } from "./bidi";

const shape = (s: string) => visualRuns(s).map((r) => `${r.rtl ? "R" : "L"}:${r.text}`);

describe("splitBidiRuns", () => {
  it("treats a pure Latin string as one left-to-right run", () => {
    const { runs, baseRtl } = splitBidiRuns("Acme Trading");
    expect(baseRtl).toBe(false);
    expect(runs).toEqual([{ text: "Acme Trading", rtl: false }]);
  });

  it("treats a pure Arabic string as one right-to-left run", () => {
    const { runs, baseRtl } = splitBidiRuns("شركة الفيصل");
    expect(baseRtl).toBe(true);
    expect(runs).toEqual([{ text: "شركة الفيصل", rtl: true }]);
  });

  it("takes the base direction from the first strong character", () => {
    expect(splitBidiRuns("123 شركة").baseRtl).toBe(true);
    expect(splitBidiRuns("123 Acme").baseRtl).toBe(false);
    expect(splitBidiRuns("(شركة)").baseRtl).toBe(true);
  });

  it("splits a mixed string into separate direction runs", () => {
    const { runs } = splitBidiRuns("Acme شركة");
    expect(runs.map((r) => r.rtl)).toEqual([false, true]);
    expect(runs[1].text).toBe("شركة");
  });

  it("gives a neutral run between two same-direction runs that direction", () => {
    // The space in "شركة الفيصل" must not break the Arabic phrase apart.
    expect(splitBidiRuns("شركة الفيصل").runs).toHaveLength(1);
  });

  it("keeps digits inside an Arabic phrase in that phrase", () => {
    const { runs } = splitBidiRuns("فاتورة 123 ريال");
    expect(runs).toHaveLength(1);
    expect(runs[0].rtl).toBe(true);
  });

  it("returns nothing for an empty string", () => {
    expect(splitBidiRuns("").runs).toEqual([]);
  });
});

describe("visualRuns — draw order", () => {
  // fontkit orders glyphs correctly WITHIN a single-direction run, so the only
  // thing left to get right is which run is drawn first.
  it("draws a Latin-first mixed string left to right", () => {
    expect(shape("Acme شركة")).toEqual(["L:Acme ", "R:شركة"]);
  });

  it("draws an Arabic-first mixed string with the Latin run on the left", () => {
    // Base direction is RTL, so the logically-first Arabic run sits furthest
    // right and is therefore drawn last.
    expect(shape("شركة Acme")).toEqual(["L:Acme", "R:شركة "]);
  });

  it("handles Arabic, Latin and Arabic again", () => {
    // Base direction is RTL. Each space sits between runs of disagreeing
    // direction, so it takes the base direction and joins the Arabic beside it
    // — the same resolution the UBA gives neutrals in rule N2.
    const out = shape("شركة Acme للتجارة");
    expect(out).toEqual(["R: للتجارة", "L:Acme", "R:شركة "]);
  });

  it("leaves a pure English string as a single unreversed run", () => {
    expect(shape("Consulting services")).toEqual(["L:Consulting services"]);
  });

  it("never drops or duplicates a character", () => {
    for (const s of ["Acme شركة", "شركة Acme", "فاتورة 123 ريال", "Faisal شركة Trading", "مرحبا"]) {
      const rejoined = visualRuns(s).map((r) => r.text).join("");
      expect([...rejoined].sort().join("")).toBe([...s].sort().join(""));
    }
  });
});

describe("hasRtl", () => {
  it("detects Arabic anywhere in the string", () => {
    expect(hasRtl("Acme")).toBe(false);
    expect(hasRtl("Acme شركة")).toBe(true);
    expect(hasRtl("١٢٣")).toBe(true); // Arabic-Indic digits
  });
});
