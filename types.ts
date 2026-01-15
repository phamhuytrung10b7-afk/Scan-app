
export enum ScanStatus {
  VALID = 'VALID',
  DUPLICATE = 'DUPLICATE',
  ERROR = 'ERROR'
}

export interface TestParameterConfig {
  id: number;
  name: string;
  defaultValue: string;
}

export interface TestConfig {
  enabled: boolean;
  stepName: string;
  mainResult: {
    name: string;
    standardValue: string;
  };
  parameters: TestParameterConfig[];
}

export interface ScanRecord {
  id: string;
  code: string;
  modelName: string;
  errorCode?: string; 
  stepName?: string; // Saved snapshot of step name
  testResult?: string; // Saved value of main result
  testParams?: string[]; // Saved values of extended params
  timestamp: string;
  status: ScanStatus;
  index: number;
}

export interface AppState {
  scans: ScanRecord[];
  lastScan: ScanRecord | null;
  error: string | null;
}
