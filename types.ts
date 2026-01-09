
export enum ScanStatus {
  VALID = 'VALID',
  DUPLICATE = 'DUPLICATE',
  WRONG_MODEL = 'WRONG_MODEL',
  INVALID = 'INVALID'
}

export interface ScanRecord {
  id: string;
  code: string;
  model: string;
  timestamp: string;
  status: ScanStatus;
  errorMessage?: string;
}

export interface AppSettings {
  activeModel: string;
  operatorName: string;
  shift: string;
}
