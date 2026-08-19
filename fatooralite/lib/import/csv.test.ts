// @vitest-environment node
import { describe, it, expect } from "vitest";
import { parseCsv } from "./csv";

describe("parseCsv (N4)", () => {
  it("parses a simple file", () => {
    const { headers, rows, errors } = parseCsv("name,email\nAcme,a@b.com\nOther,o@b.com\n");
    expect(headers).toEqual(["name", "email"]);
    expect(rows).toEqual([
      { row: 2, cells: ["Acme", "a@b.com"] },
      { row: 3, cells: ["Other", "o@b.com"] },
    ]);
    expect(errors).toEqual([]);
  });

  it("handles quoted fields with embedded commas", () => {
    const { rows } = parseCsv('name,note\n"Acme, Inc.","says ""hi"""\n');
    expect(rows[0].cells).toEqual(["Acme, Inc.", 'says "hi"']);
  });

  it("handles CRLF line endings", () => {
    const { rows } = parseCsv("name,email\r\nAcme,a@b.com\r\n");
    expect(rows).toEqual([{ row: 2, cells: ["Acme", "a@b.com"] }]);
  });

  it("handles a quoted field containing a newline", () => {
    const { rows } = parseCsv('name,note\nAcme,"line1\nline2"\n');
    expect(rows[0].cells).toEqual(["Acme", "line1\nline2"]);
  });

  it("strips a UTF-8 BOM", () => {
    const { headers } = parseCsv("﻿name,email\nAcme,a@b.com\n");
    expect(headers).toEqual(["name", "email"]);
  });

  it("strips embedded NUL bytes", () => {
    const { rows } = parseCsv("name,email\nAc\0me,a@b.com\n");
    expect(rows[0].cells).toEqual(["Acme", "a@b.com"]);
  });

  it("reports an unmatched quote as a row-numbered error", () => {
    const { errors } = parseCsv('name,note\nAcme,"unterminated\n');
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/unmatched quote/i);
  });

  it("reports a cell-count mismatch (short row) as a row-numbered error, not silently padded", () => {
    const { rows, errors } = parseCsv("name,email,phone\nAcme,a@b.com\nOther,o@b.com,0500000000\n");
    expect(errors).toEqual([{ row: 2, message: "Expected 3 column(s), found 2" }]);
    expect(rows).toEqual([{ row: 3, cells: ["Other", "o@b.com", "0500000000"] }]);
  });

  it("reports a cell-count mismatch (long row) too", () => {
    const { errors } = parseCsv("name,email\nAcme,a@b.com,extra\n");
    expect(errors).toEqual([{ row: 2, message: "Expected 2 column(s), found 3" }]);
  });

  it("skips genuinely blank lines without treating them as malformed rows", () => {
    const { rows, errors } = parseCsv("name,email\nAcme,a@b.com\n\nOther,o@b.com\n");
    expect(rows.map((r) => r.cells[0])).toEqual(["Acme", "Other"]);
    expect(errors).toEqual([]);
  });

  it("an empty file produces a top-level error, not a crash", () => {
    const { headers, rows, errors } = parseCsv("");
    expect(headers).toEqual([]);
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(1);
  });

  it("a header-only file produces no rows and no errors", () => {
    const { rows, errors } = parseCsv("name,email\n");
    expect(rows).toEqual([]);
    expect(errors).toEqual([]);
  });
});
