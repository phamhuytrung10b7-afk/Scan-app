export interface ScanRecord {
  id: string;
  stt: number;
  productCode: string;
  model: string; // Used as validation prefix/pattern (Mã IMEI)
  modelName?: string; // New field for the actual Model Name
  employeeId: string;
  timestamp: string; // ISO string
  status: 'valid' | 'error' | 'defect'; // Added 'defect' for manufacturing errors (NG)
  note?: string; 
  stage: number; // The stage where this scan happened (1-5)
  measurement?: string; // Recorded value (e.g. "12V", "PASS", "0.5kg")
  additionalValues?: string[]; // Values for the 8 custom fields
}

export interface Stats {
  success: number; // Count for current stage (OK)
  defect: number;  // Count for manufacturing defects (NG)
  error: number;   // System/Validation errors
}

export interface ErrorState {
  isOpen: boolean;
  message: string;
}

export interface Stage {
  id: number;
  name: string;
  // Removed isEnabled
  enableMeasurement?: boolean; // Does this stage require a measurement?
  measurementLabel?: string;   // Label for the measurement
  measurementStandard?: string; // New: Standard value to compare against (e.g. "PASS", "OK")
  additionalFieldLabels?: string[]; // Labels for 8 custom fields. Empty string = disabled.
  additionalFieldDefaults?: string[]; // New: Default values for the 8 fields.
}

// Helper to create empty arrays of size 8
const EMPTY_8 = Array(8).fill("");

export const DEFAULT_PROCESS_STAGES: Stage[] = [
  { id: 1, name: "Công đoạn 1: SMT / Lắp ráp", enableMeasurement: false, measurementLabel: "", additionalFieldLabels: [...EMPTY_8], additionalFieldDefaults: [...EMPTY_8] },
  { id: 2, name: "Công đoạn 2: Kiểm tra ngoại quan", enableMeasurement: false, measurementLabel: "", additionalFieldLabels: [...EMPTY_8], additionalFieldDefaults: [...EMPTY_8] },
  { id: 3, name: "Công đoạn 3: Function Test", enableMeasurement: true, measurementLabel: "Kết quả Test", measurementStandard: "PASS", additionalFieldLabels: [...EMPTY_8], additionalFieldDefaults: [...EMPTY_8] },
  { id: 4, name: "Công đoạn 4: Đóng gói", enableMeasurement: false, measurementLabel: "", additionalFieldLabels: [...EMPTY_8], additionalFieldDefaults: [...EMPTY_8] },
  { id: 5, name: "Công đoạn 5: OBA / Xuất xưởng", enableMeasurement: false, measurementLabel: "", additionalFieldLabels: [...EMPTY_8], additionalFieldDefaults: [...EMPTY_8] },
];