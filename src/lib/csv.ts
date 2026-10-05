// Safely format a value as a CSV cell: quotes it and neutralises spreadsheet formulas.
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  // Numbers (including negatives) are safe — escape only when the cell could be
  // read as a spreadsheet formula (=, +, @, tab, CR, or a leading '-' followed by
  // a non-digit like '-SUM(A1)').
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(',');
}
