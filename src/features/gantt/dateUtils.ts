export const MS = 86400000;
export const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const parse = (s: string): number => {
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
export const toISO = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
export const diffDays = (a: number, b: number): number => Math.round((b - a) / MS);
export const fmtShort = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getUTCDate()} ${MES[d.getUTCMonth()]} '${String(d.getUTCFullYear()).slice(2)}`;
};
