export interface ValidationRule {
  id: string;
  name: string; // Tên gợi nhớ (VD: List Model A, Check độ dài)
  type: 'contains' | 'not_contains' | 'starts_with' | 'length_eq';
  value: string; // Giá trị để so sánh (List phân cách bởi khoảng trắng/phẩy, hoặc số)
  isActive: boolean; // Trạng thái bật tắt
  errorMessage: string; // Câu báo lỗi riêng
}

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
  additionalFieldValidationLists?: string[]; // New: Whitelists for the 8 fields (string data).
  validationRules?: ValidationRule[]; // New: List of flexible validation rules
}

// Helper to create empty arrays of size 8
const EMPTY_8 = Array(8).fill("");

export const DEFAULT_PROCESS_STAGES: Stage[] = [
  { 
    id: 1, 
    name: "Kiểm tra sản phẩm", 
    enableMeasurement: true, 
    measurementLabel: "Kết quả Test", 
    measurementStandard: "OK", 
    additionalFieldLabels: [...EMPTY_8], 
    additionalFieldDefaults: [...EMPTY_8],
    additionalFieldValidationLists: [...EMPTY_8],
    validationRules: []
  }
];