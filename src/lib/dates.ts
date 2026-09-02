const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateString(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !isNaN(d.getTime());
}

// Parses "YYYY-MM-DD" into a UTC-midnight Date, matching Prisma's @db.Date storage.
export function parseDateOnly(s: string): Date {
  return new Date(s + "T00:00:00.000Z");
}

export function formatDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d.getTime());
  copy.setUTCDate(copy.getUTCDate() + n);
  return copy;
}

// Today's date string in the server's local timezone (set TZ env var on Railway
// if "today" should roll over at local midnight rather than UTC midnight).
export function todayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Returns the Monday (as YYYY-MM-DD) of the week containing the given date string.
export function mondayOf(dateStr: string): string {
  const d = parseDateOnly(dateStr);
  const dow = d.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
  const diff = dow === 0 ? -6 : 1 - dow;
  return formatDateOnly(addDays(d, diff));
}

export function isMonday(dateStr: string): boolean {
  return mondayOf(dateStr) === dateStr;
}

const MONTH_RE = /^\d{4}-\d{2}$/;

export function isValidMonthString(s: string): boolean {
  if (!MONTH_RE.test(s)) return false;
  const m = Number(s.slice(5, 7));
  return m >= 1 && m <= 12;
}

export function daysInMonth(monthStr: string): string[] {
  const [y, m] = monthStr.split("-").map(Number);
  const count = new Date(y, m, 0).getDate();
  const out: string[] = [];
  for (let day = 1; day <= count; day++) {
    out.push(`${monthStr}-${String(day).padStart(2, "0")}`);
  }
  return out;
}
