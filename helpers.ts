import { ScanRecord } from '../types';

/**
 * Formats a date object to yyyy-MM-dd HH:mm:ss
 */
export const formatDateTime = (date: Date): string => {
  const pad = (num: number) => num.toString().padStart(2, '0');
  
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * Exports scan records to CSV
 */
export const exportToCSV = (records: ScanRecord[], activeModel: string) => {
  const headers = ['Index', 'Scanned Code', 'Expected Model', 'Scan Timestamp', 'Status'];
  
  const rows = records.map(r => [
    r.id,
    `"${r.code.replace(/"/g, '""')}"`, // Escape quotes
    r.expectedModel,
    r.formattedTimestamp,
    r.status
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `scan_report_${activeModel}_${new Date().toISOString().slice(0,10)}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};