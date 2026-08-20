/**
 * Asia/Riyadh is the single business timezone for anything tax/reporting-
 * facing (Phase 3 / W9). Fixed UTC+3, no DST, so no timezone-database
 * dependency is needed — a documented constant offset plus `Intl` is enough.
 *
 * Policy:
 *  - `Invoice.issueDate`/`issueTime` are Asia/Riyadh wall-clock strings (the
 *    Saudi tax point) — parse and produce them ONLY through this module.
 *  - `DateTime` columns (createdAt, lastSubmitAt, SecurityEvent timestamps,
 *    etc.) stay UTC instants, unchanged — that part was already correct.
 *  - "Current period" boundaries for business-facing reads (the trial
 *    invoice cap, "today"/"this month" labels) are computed at Riyadh
 *    midnight, then converted to a UTC instant for DateTime comparisons.
 *
 * Do not blindly convert every timestamp in the app to Riyadh — only the
 * ones a Saudi business or ZATCA cares about as a calendar date.
 */

const RIYADH_OFFSET_HOURS = 3;
const RIYADH_TZ = "Asia/Riyadh";

/** "YYYY-MM-DD" for the given instant, read in Asia/Riyadh. */
export function riyadhToday(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: RIYADH_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** "HH:mm:ss" for the given instant, read in Asia/Riyadh. */
export function riyadhTimeOfDay(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: RIYADH_TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  // en-GB renders midnight as "24:00:00" with hour12:false in some ICU
  // versions — normalize, since ZATCA/DB expect a real 00-23 hour.
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${hour}:${get("minute")}:${get("second")}`;
}

/** UTC instant of the first moment of the current Riyadh calendar month. */
export function riyadhMonthStartUtc(now: Date = new Date()): Date {
  const today = riyadhToday(now); // "YYYY-MM-DD"
  const [y, m] = today.split("-");
  return new Date(`${y}-${m}-01T00:00:00${offsetSuffix()}`);
}

/**
 * Parse an Asia/Riyadh wall-clock date+time (as stored on Invoice) into a
 * real instant. Riyadh has no DST, so a fixed +03:00 suffix is always
 * correct — this is the one place that assumption is allowed to live.
 */
export function parseRiyadhTimestamp(date: string, time: string): Date {
  return new Date(`${date}T${time}${offsetSuffix()}`);
}

function offsetSuffix(): string {
  return `+${String(RIYADH_OFFSET_HOURS).padStart(2, "0")}:00`;
}

/**
 * D2 (docs/audit/decision-register.md) — Option B, a soft warning only:
 * whether `issueDate` falls in an already-elapsed Riyadh calendar month
 * relative to `today`. There is deliberately no `TaxPeriod` "filed" concept
 * yet (that's D2's Option C, not chosen) — "past period" here means the
 * simplest thing that doesn't invent one: the invoice's own month has
 * already ended. The current month is never flagged, even late in it.
 */
export function isPastReportingPeriod(issueDate: string, today: string = riyadhToday()): boolean {
  return issueDate.slice(0, 7) < today.slice(0, 7);
}
