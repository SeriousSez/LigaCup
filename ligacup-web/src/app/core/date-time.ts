/** Format an instant for local date/time controls, using the same zone as DatePipe. */
export function localDateTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Never let the API infer the browser's timezone from an unqualified timestamp. */
export function utcDateTime(value: string | null): string | null {
  return value ? new Date(value).toISOString() : null;
}
