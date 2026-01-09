
import { ScanRecord } from '../types';

export const getCurrentTimestamp = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

export const exportToCSV = (records: ScanRecord[]) => {
  if (records.length === 0) return;

  const headers = ['No.', 'Scanned Code', 'Model Name', 'Scan Date & Time', 'Status'];
  
  // Wrap values in quotes to prevent CSV breakage if data contains commas
  const rows = records.map((r, index) => [
    `"${records.length - index}"`,
    `"${r.code}"`,
    `"${r.model}"`,
    `"${r.timestamp}"`,
    `"${r.status}"`
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(e => e.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `scan_report_${new Date().toISOString().split('T')[0]}_${Date.now()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
