import { describe, it, expect } from "vitest";
import { computeClearanceStats, type ClearanceInvoice } from "./clearance-stats";
import { riyadhToday, riyadhTimeOfDay } from "@/lib/time/riyadh";

// computeClearanceStats reads issueDate/issueTime as Asia/Riyadh wall-clock
// (Phase 3 / W9) — build fixtures in the same zone, not the test machine's
// local time, or "N hours ago" drifts by the local-vs-Riyadh offset.
function hoursAgoIssue(h: number) {
  const d = new Date(Date.now() - h * 3_600_000);
  return { issueDate: riyadhToday(d), issueTime: riyadhTimeOfDay(d) };
}

describe("computeClearanceStats", () => {
  it("returns zeros for no invoices", () => {
    const s = computeClearanceStats([]);
    expect(s.total).toBe(0);
    expect(s.successRate).toBe(0);
    expect(s.cleared).toBe(0);
  });

  it("counts statuses and computes success rate", () => {
    const invoices: ClearanceInvoice[] = [
      { kind: "standard", status: "cleared", vatAmount: 10, ...hoursAgoIssue(40) },
      { kind: "simplified", status: "reported", vatAmount: 5, ...hoursAgoIssue(40) },
      { kind: "standard", status: "rejected", vatAmount: 0, resultCode: "BR-KSA-83", ...hoursAgoIssue(40) },
      { kind: "standard", status: "signed", vatAmount: 0, ...hoursAgoIssue(1) },
    ];
    const s = computeClearanceStats(invoices);
    expect(s.total).toBe(4);
    expect(s.cleared).toBe(1);
    expect(s.reported).toBe(1);
    expect(s.rejected).toBe(1);
    expect(s.pending).toBe(1);
    // accepted (cleared+reported) / total = 2/4
    expect(s.successRate).toBe(50);
    expect(s.vatCollected).toBe(15);
  });

  it("flags simplified invoices near and past the 24h reporting deadline", () => {
    const invoices: ClearanceInvoice[] = [
      { kind: "simplified", status: "signed", vatAmount: 1, ...hoursAgoIssue(20) }, // near (18-24h)
      { kind: "simplified", status: "signed", vatAmount: 1, ...hoursAgoIssue(30) }, // overdue (>24h)
      { kind: "simplified", status: "reported", vatAmount: 1, ...hoursAgoIssue(30) }, // already reported -> ignored
      { kind: "standard", status: "signed", vatAmount: 1, ...hoursAgoIssue(30) }, // standard -> not a reporting-deadline case
    ];
    const s = computeClearanceStats(invoices);
    expect(s.nearDeadline).toBe(1);
    expect(s.overdue).toBe(1);
  });
});
