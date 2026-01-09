export type ScanStatus = 'VALID' | 'DUPLICATE' | 'WRONG_MODEL';

export interface ScanRecord {
  id: number;
  code: string;
  expectedModel: string;
  timestamp: string; // ISO string
  formattedTimestamp: string; // yyyy-MM-dd HH:mm:ss
  status: ScanStatus;
}

export interface AppSettings {
  activeModel: string;
  allowReset: boolean;
  operatorName: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  activeModel: 'MODEL-A',
  allowReset: true,
  operatorName: 'OP-01',
};