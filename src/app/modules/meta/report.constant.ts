export function getWeek(date: Date): string {
  const d = new Date(date);
  const firstJan = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor(
    (d.getTime() - firstJan.getTime()) / (24 * 60 * 60 * 1000),
  );
  return `${d.getFullYear()}-W${Math.ceil((d.getDay() + 1 + days) / 7)}`;
}
