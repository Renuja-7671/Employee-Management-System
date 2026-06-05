import * as XLSX from 'xlsx';

export type XlsRow = (string | number | null | undefined)[];

/** Auto-calculate column widths based on content length */
function autoColWidths(data: XlsRow[]): XLSX.ColInfo[] {
  if (!data.length) return [];
  const numCols = Math.max(...data.map((r) => r.length));
  return Array.from({ length: numCols }, (_, ci) => {
    const max = data.reduce((w, row) => {
      const val = row[ci];
      const len = val != null ? String(val).length : 0;
      return Math.max(w, len);
    }, 10);
    return { wch: Math.min(max + 2, 60) };
  });
}

export interface XlsSheet {
  name: string;
  headers: string[];
  rows: XlsRow[];
}

/** Create a worksheet from headers + rows with auto column widths */
function makeSheet(headers: string[], rows: XlsRow[]): XLSX.WorkSheet {
  const data: XlsRow[] = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = autoColWidths(data);
  return ws;
}

/**
 * Build an xlsx workbook from one or more sheets and trigger a browser download.
 */
export function downloadXlsx(sheets: XlsSheet[], filename: string): void {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, headers, rows }) => {
    const ws = makeSheet(headers, rows);
    XLSX.utils.book_append_sheet(wb, ws, name);
  });
  const fname = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, fname);
}
