// Daftar report yang bisa dijadwalkan. Menambah report baru = tambah satu entri
// di sini + satu halaman print di frontend (route `printPath`).
export interface ReportDefinition {
  label: string;
  // Route frontend (tanpa layout) yang dirender headless browser menjadi PDF.
  printPath: string;
}

export const REPORT_REGISTRY: Record<string, ReportDefinition> = {
  alert_summary: {
    label: 'Alert Summary',
    printPath: '/print/report-alert-summary',
  },
};

export const REPORT_TYPES = Object.keys(REPORT_REGISTRY);
