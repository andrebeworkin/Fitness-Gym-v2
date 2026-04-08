export type ScheduleView = "day" | "week";

export function toDateYmd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseYmd(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const d = new Date(year, month - 1, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfWeekMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const delta = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + delta);
  return d;
}

export function getViewRange(anchor: Date, view: ScheduleView) {
  if (view === "day") {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
    const end = addDays(start, 1);
    return { start, end };
  }
  const start = startOfWeekMonday(anchor);
  const end = addDays(start, 7);
  return { start, end };
}

export function parseTimeToMinutes(time: string): number | null {
  const m = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(time);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

export function overlapsRange(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
): boolean {
  return startA < endB && endA > startB;
}

export function parseDateTimeLocal(value: string): Date | null {
  // Accept "YYYY-MM-DDTHH:mm" from <input type="datetime-local">
  const m =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
    0,
    0,
  );
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function toDateTimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}
