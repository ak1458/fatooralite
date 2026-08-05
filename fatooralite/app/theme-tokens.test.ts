import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * globals.css states the rule: "Components reference ONLY these vars — never
 * literal colors." It was not enforced, and 74 literals had accumulated. Some
 * were harmless; several were not, because the token they bypassed differs
 * between themes — `#1a1200` on `var(--warn)` is fine in dark mode and ~3.2:1
 * in light mode, which is below AA.
 *
 * This is a structural test rather than a visual one: a screenshot review
 * catches the literal that is on screen today, this catches the next one.
 */

const ROOT = process.cwd();

/**
 * Metadata cannot read a CSS variable, so `themeColor` has to carry real
 * values. It declares one per `prefers-color-scheme`, which is the correct
 * shape; the values are kept in step with --bg by hand.
 */
const ALLOWED_FILES = new Set(["app/layout.tsx"]);

const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d/;

function tsxFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) tsxFiles(rel, out);
    else if (rel.endsWith(".tsx")) out.push(rel);
  }
  return out;
}

describe("theme token discipline", () => {
  it("has no hardcoded colors in app/ or components/", () => {
    const offenders: string[] = [];
    for (const file of [...tsxFiles("app"), ...tsxFiles("components")]) {
      if (ALLOWED_FILES.has(file)) continue;
      readFileSync(join(ROOT, file), "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (COLOR_LITERAL.test(line)) offenders.push(`${file}:${i + 1} ${line.trim().slice(0, 90)}`);
        });
    }
    expect(offenders).toEqual([]);
  });

  it("defines every token in both themes", () => {
    const css = readFileSync(join(ROOT, "app/globals.css"), "utf8");
    const block = (selector: string) => {
      const start = css.indexOf(selector);
      expect(start, `${selector} block missing`).toBeGreaterThan(-1);
      return css.slice(start, css.indexOf("}", start));
    };
    const names = (s: string) => new Set([...s.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));

    const dark = names(block(':root,\n[data-theme="dark"]'));
    const light = names(block('[data-theme="light"]'));

    // Without this the two filters below both pass on empty sets, and the
    // test asserts nothing at all.
    expect(dark.size).toBeGreaterThan(15);
    expect(light.size).toBeGreaterThan(15);

    // A token defined in only one theme silently falls back to the other
    // theme's value, which is exactly the bug this pass fixed.
    expect([...dark].filter((n) => !light.has(n))).toEqual([]);
    expect([...light].filter((n) => !dark.has(n))).toEqual([]);
  });

  it("defines a foreground token for each colored surface text sits on", () => {
    const css = readFileSync(join(ROOT, "app/globals.css"), "utf8");
    ["--on-ac", "--on-warn", "--on-dang"].forEach((t) => expect(css).toContain(`${t}:`));
  });
});
