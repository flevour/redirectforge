export const ExportFormat = {
  json: 'json',
  csv: 'csv',
} as const;
export type ExportFormat = (typeof ExportFormat)[keyof typeof ExportFormat];

export interface ExportOptions {
  format: ExportFormat;
}
