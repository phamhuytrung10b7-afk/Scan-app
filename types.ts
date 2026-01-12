export interface ScanRecord {
  id: string;
  stt: number;
  productCode: string;
  model: string;
  employeeId: string;
  timestamp: string; // ISO string
  status: 'valid' | 'error' | 'defect'; // Added 'defect' for manufacturing errors (NG)
  note?: string; 
  stage: number; // The stage where this scan happened (1-5)
  measurement?: string; // New: Recorded value (e.g. "12V", "PASS", "0.5kg")
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
  enableMeasurement?: boolean; // New: Does this stage require a measurement?
  measurementLabel?: string;   // New: Label for the measurement (e.g. "Điện áp (V)", "Trọng lượng")
}

export const DEFAULT_PROCESS_STAGES: Stage[] = [
  { id: 1, name: "Công đoạn 1: SMT / Lắp ráp", enableMeasurement: false, measurementLabel: "" },
  { id: 2, name: "Công đoạn 2: Kiểm tra ngoại quan", enableMeasurement: false, measurementLabel: "" },
  { id: 3, name: "Công đoạn 3: Function Test", enableMeasurement: true, measurementLabel: "Kết quả Test" },
  { id: 4, name: "Công đoạn 4: Đóng gói", enableMeasurement: false, measurementLabel: "" },
  { id: 5, name: "Công đoạn 5: OBA / Xuất xưởng", enableMeasurement: false, measurementLabel: "" },
];