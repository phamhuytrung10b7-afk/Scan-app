import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Download, ScanLine, Users, CheckCircle, AlertOctagon, RefreshCw, Box, Settings, AlertTriangle, Layers, Edit, XCircle, Activity, List, Tag, Upload, Maximize, Minimize } from 'lucide-react';
import { format } from 'date-fns';
import { read, utils } from 'xlsx';

import { ScanRecord, Stats, ErrorState, DEFAULT_PROCESS_STAGES, Stage } from './types';
import { Button } from './Button';
import { ErrorModal } from './ErrorModal';
import { StatCard } from './StatCard';
import { StageSettingsModal } from './StageSettingsModal';

export default function App() {
  // --- STATE ---
  
  // Configuration
  const [stageEmployees, setStageEmployees] = useState<Record<number, string>>({});
  const [currentModel, setCurrentModel] = useState<string>(''); // Used for IMEI Validation (Space separated list)
  const [modelName, setModelName] = useState<string>(''); // New: Actual Model Name
  
  // Dynamic Stages with LocalStorage Persistence
  const [stages, setStages] = useState<Stage[]>(() => {
    try {
      const saved = localStorage.getItem('proscan_stages');
      if (saved) {
        // Migration support for old data
        const parsed = JSON.parse(saved);
        return parsed.map((s: any) => ({
          ...s,
          // Update default array size from potential old/new sizes to 8
          additionalFieldLabels: s.additionalFieldLabels ? [...s.additionalFieldLabels, ...Array(8).fill("")].slice(0, 8) : Array(8).fill(""),
          additionalFieldDefaults: s.additionalFieldDefaults ? [...s.additionalFieldDefaults, ...Array(8).fill("")].slice(0, 8) : Array(8).fill("")
        }));
      }
    } catch (e) {
      console.error("Failed to load stages from storage", e);
    }
    return DEFAULT_PROCESS_STAGES;
  });

  // Ensure currentStage is valid initially (fallback to first available stage)
  const [currentStage, setCurrentStage] = useState<number>(() => {
    return stages.length > 0 ? stages[0].id : 1;
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Data
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [productProgress, setProductProgress] = useState<Record<string, number>>({});
  const [productStatus, setProductStatus] = useState<Record<string, 'valid' | 'defect'>>({});
  
  // UI State
  const [stats, setStats] = useState<Stats>({ success: 0, defect: 0, error: 0 });
  
  // Inputs
  const [employeeInput, setEmployeeInput] = useState('');
  const [defectCode, setDefectCode] = useState(''); 
  const [measurementValue, setMeasurementValue] = useState(''); 
  const [productInput, setProductInput] = useState('');
  
  // New: State for 8 additional fields
  const [additionalValues, setAdditionalValues] = useState<string[]>(Array(8).fill(""));
  
  const [errorModal, setErrorModal] = useState<ErrorState>({ isOpen: false, message: '' });

  // Refs
  const employeeInputRef = useRef<HTMLInputElement>(null);
  const defectInputRef = useRef<HTMLInputElement>(null);
  const measurementInputRef = useRef<HTMLInputElement>(null);
  const productInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);
  const modelNameRef = useRef<HTMLInputElement>(null); // New Ref for Model Name
  // Refs for 8 additional inputs
  const extraInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // --- EFFECT: Save Stages to LocalStorage ---
  useEffect(() => {
    localStorage.setItem('proscan_stages', JSON.stringify(stages));
  }, [stages]);

  // --- EFFECT: Calculate Stats for Current Stage ---
  useEffect(() => {
    const currentStageSuccess = history.filter(
      r => r.status === 'valid' && r.stage === currentStage
    ).length;

    const currentStageDefect = history.filter(
      r => r.status === 'defect' && r.stage === currentStage
    ).length;
    
    setStats(prev => ({ 
      ...prev, 
      success: currentStageSuccess,
      defect: currentStageDefect
    }));
  }, [history, currentStage]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // --- HELPER: Get Current Stage Object & Employee ---
  const currentStageObj = useMemo(() => stages.find(s => s.id === currentStage), [stages, currentStage]);
  const currentEmployeeId = stageEmployees[currentStage];
  
  // Determine active extra fields (those with labels)
  const activeExtraFields = useMemo(() => {
    if (!currentStageObj?.additionalFieldLabels) return [];
    return currentStageObj.additionalFieldLabels.map((label, idx) => ({ label, idx })).filter(f => f.label.trim() !== "");
  }, [currentStageObj]);

  // Helper to load defaults for current stage
  const loadDefaults = useCallback(() => {
    if (currentStageObj?.additionalFieldDefaults) {
      // Create a copy of defaults, ensuring empty strings for missing values
      const defaults = [...currentStageObj.additionalFieldDefaults];
      while(defaults.length < 8) defaults.push("");
      setAdditionalValues(defaults);
    } else {
      setAdditionalValues(Array(8).fill(""));
    }
  }, [currentStageObj]);

  // Apply defaults when stage changes
  useEffect(() => {
    loadDefaults();
  }, [currentStage, loadDefaults]);

  // --- INITIAL FOCUS ---
  useEffect(() => {
    if (!modelName) modelNameRef.current?.focus();
    else if (!currentModel) modelInputRef.current?.focus();
    else if (!currentEmployeeId) employeeInputRef.current?.focus();
    else {
      // Logic for initial focus based on stage config
      if (currentStageObj?.enableMeasurement) measurementInputRef.current?.focus();
      else productInputRef.current?.focus();
    }
  }, [currentStage]);

  // --- HANDLERS ---
  
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = read(data);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Get data as array of arrays to be safe about column structure
      // Type 'any' used because sheet_to_json returns generic objects
      const jsonData = utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      // Extract 1st column, filter empties, join by space
      const codes = jsonData
          .map(row => row[0]) // Take first cell of each row
          .filter(cell => cell !== undefined && cell !== null && String(cell).trim() !== '')
          .map(cell => String(cell).trim().toUpperCase());

      if (codes.length === 0) {
        alert("File không có dữ liệu ở cột A!");
        return;
      }

      const resultString = codes.join(' ');
      setCurrentModel(resultString);
      alert(`Đã tải thành công ${codes.length} mã kiểm tra!`);
      
      // Reset file input
      e.target.value = '';
    } catch (err) {
      console.error(err);
      alert("Lỗi đọc file Excel. Vui lòng kiểm tra lại định dạng.");
    }
  };

  const handleEmployeeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = employeeInput.trim();
      if (val) {
        setStageEmployees(prev => ({ ...prev, [currentStage]: val }));
        setEmployeeInput('');
        
        // Smart Focus Next
        setTimeout(() => {
             if (currentStageObj?.enableMeasurement) measurementInputRef.current?.focus();
             else productInputRef.current?.focus();
        }, 50);
      }
    }
  };

  const handleDefectScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') productInputRef.current?.focus();
  };

  const handleMeasurementScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (measurementValue.trim()) {
        // Logic: Find the first ACTIVE field that DOES NOT have a value (skips defaults)
        const nextField = activeExtraFields.find(f => !additionalValues[f.idx]);
        
        if (nextField) {
           extraInputRefs.current[nextField.idx]?.focus();
        } else if (activeExtraFields.length > 0) {
           const hasManualFields = activeExtraFields.some(f => !currentStageObj?.additionalFieldDefaults?.[f.idx]);
           if (!hasManualFields) {
             productInputRef.current?.focus();
           } else {
             productInputRef.current?.focus();
           }
        } else {
           productInputRef.current?.focus();
        }
      }
    }
  };

  const handleExtraInputScan = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      // Find the next field in the ACTIVE list
      const currentActivePos = activeExtraFields.findIndex(f => f.idx === index);
      
      if (currentActivePos !== -1 && currentActivePos < activeExtraFields.length - 1) {
         let nextActivePos = currentActivePos + 1;
         let nextRealIdx = activeExtraFields[nextActivePos].idx;

         // Try to find the next empty field
         while (nextActivePos < activeExtraFields.length && additionalValues[activeExtraFields[nextActivePos].idx]) {
            const isDefaulted = !!currentStageObj?.additionalFieldDefaults?.[activeExtraFields[nextActivePos].idx];
            if (!isDefaulted) break; // Found a manual field
            nextActivePos++;
         }

         if (nextActivePos < activeExtraFields.length) {
            nextRealIdx = activeExtraFields[nextActivePos].idx;
            extraInputRefs.current[nextRealIdx]?.focus();
         } else {
            productInputRef.current?.focus();
         }

      } else {
         // End of list
         productInputRef.current?.focus();
      }
    }
  };

  const updateAdditionalValue = (index: number, value: string) => {
    const newValues = [...additionalValues];
    newValues[index] = value;
    setAdditionalValues(newValues);
  };

  const handleError = (message: string, scannedCode: string = '') => {
    setStats(prev => ({ ...prev, error: prev.error + 1 }));
    
    const errorRecord: ScanRecord = {
      id: crypto.randomUUID(),
      stt: history.length + 1,
      productCode: scannedCode || '---',
      model: currentModel || 'CHƯA CÓ',
      modelName: modelName || '',
      employeeId: currentEmployeeId || 'CHƯA CÓ',
      timestamp: new Date().toISOString(),
      status: 'error',
      note: message,
      stage: currentStage
    };
    setHistory(prev => [errorRecord, ...prev]);
    setErrorModal({ isOpen: true, message });
  };

  const handleSuccess = (code: string) => {
    setProductProgress(prev => ({ ...prev, [code]: currentStage }));
    setProductStatus(prev => ({ ...prev, [code]: 'valid' }));

    const newRecord: ScanRecord = {
      id: crypto.randomUUID(),
      stt: history.length + 1,
      productCode: code,
      model: currentModel,
      modelName: modelName,
      employeeId: currentEmployeeId || 'UNKNOWN',
      timestamp: new Date().toISOString(),
      status: 'valid',
      note: 'Thành công',
      stage: currentStage,
      measurement: currentStageObj?.enableMeasurement ? measurementValue : undefined,
      additionalValues: currentStageObj?.enableMeasurement ? [...additionalValues] : undefined
    };

    setHistory(prev => [newRecord, ...prev]);
    
    // Reset Inputs
    setProductInput('');
    setDefectCode('');
    setMeasurementValue(''); 
    
    // RESET TO DEFAULTS
    loadDefaults();
    
    // Return Focus logic
    setTimeout(() => {
        if (currentStageObj?.enableMeasurement) measurementInputRef.current?.focus();
        else productInputRef.current?.focus();
    }, 50);
  };

  const handleDefectRecord = (code: string, reason: string) => {
    setProductStatus(prev => ({ ...prev, [code]: 'defect' }));

    const newRecord: ScanRecord = {
      id: crypto.randomUUID(),
      stt: history.length + 1,
      productCode: code,
      model: currentModel,
      modelName: modelName,
      employeeId: currentEmployeeId || 'UNKNOWN',
      timestamp: new Date().toISOString(),
      status: 'defect',
      note: `Lỗi: ${reason}`,
      stage: currentStage,
      measurement: currentStageObj?.enableMeasurement ? measurementValue : undefined,
      additionalValues: currentStageObj?.enableMeasurement ? [...additionalValues] : undefined
    };

    setHistory(prev => [newRecord, ...prev]);
    
    setProductInput('');
    setDefectCode(''); 
    setMeasurementValue('');
    loadDefaults();

    setTimeout(() => {
        if (currentStageObj?.enableMeasurement) measurementInputRef.current?.focus();
        else productInputRef.current?.focus();
    }, 50);
  };

  const handleProductScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = productInput.trim();
      if (!code) return;

      // VALIDATIONS
      // 0. Model Name Check (MANDATORY)
      if (!modelName.trim()) return handleError("Lỗi: Chưa nhập Tên Model.", code);

      // 1. Check if Validation List is Configured
      if (!currentModel.trim()) return handleError("Lỗi: Chưa cài đặt Danh sách Mã chuẩn (Validation List).", code);
      
      // 2. Parse Valid Patterns (Split by whitespace)
      // REGEX: /\s+/ matches one or more whitespace characters
      const validPatterns = currentModel.trim().split(/\s+/).map(s => s.trim().toUpperCase()).filter(s => s.length > 0);
      
      // 3. Employee Check
      if (!currentEmployeeId) return handleError(`Lỗi: Chưa xác định nhân viên cho công đoạn ${currentStage}.`, code);
      
      // 4. Validate Code against Patterns (Contains ANY)
      const isMatch = validPatterns.some(pattern => code.toUpperCase().includes(pattern));
      if (!isMatch) {
         // Simplified Error Message as requested
         return handleError(`Lỗi: Mã không nằm trong kế hoạch sản xuất.\nMã quét: ${code}`, code);
      }

      if (defectCode.trim()) {
        handleDefectRecord(code, defectCode);
        return;
      }

      // MEASUREMENT VALIDATION
      if (currentStageObj?.enableMeasurement) {
        const val = measurementValue.trim();
        if (!val) {
           measurementInputRef.current?.focus();
           return handleError(`Lỗi: Công đoạn này yêu cầu nhập ${currentStageObj.measurementLabel || 'giá trị đo'}.`, code);
        }

        // CHECK AGAINST STANDARD
        const standard = currentStageObj.measurementStandard?.trim();
        if (standard) {
          const stdNum = parseFloat(standard.replace(',', '.'));
          const valNum = parseFloat(val.replace(',', '.'));

          if (!isNaN(stdNum)) {
             if (isNaN(valNum)) {
                return handleError(`Lỗi: Tiêu chuẩn là số (${standard}), vui lòng nhập kết quả là số.`, code);
             }
             if (valNum >= stdNum) {
                return handleError(`LỖI NG: Kết quả đo quá cao!\nTiêu chuẩn (Max): < ${standard}\nThực tế: ${val}`, code);
             }
          } else {
             if (val.toUpperCase() !== standard.toUpperCase()) {
                return handleError(`LỖI NG: Kết quả đo không đạt chuẩn!\nTiêu chuẩn: ${standard}\nThực tế: ${val}`, code);
             }
          }
        }
        
        // Validate Additional Fields
        for (const field of activeExtraFields) {
           if (!additionalValues[field.idx].trim()) {
             extraInputRefs.current[field.idx]?.focus();
             return handleError(`Lỗi: Chưa nhập giá trị cho "${field.label}".`, code);
           }
        }
      }

      // LOGIC CHECKS
      const currentProgress = productProgress[code] || 0;
      const lastStatus = productStatus[code];

      if (lastStatus === 'defect') {
        if (currentStage > currentProgress + 1) {
           return handleError("⛔ CẢNH BÁO: Sản phẩm bị LỖI (NG) chưa được xử lý.", code);
        }
      }
      if (currentProgress >= currentStage) {
        return handleError(`Lỗi: Mã đã PASS công đoạn ${currentStage} trước đó.`, code);
      }
      if (currentStage > 1 && currentProgress < currentStage - 1) {
        return handleError(`Lỗi: Sai trình tự. Chưa hoàn thành công đoạn ${currentStage - 1}.`, code);
      }

      handleSuccess(code);
    }
  };

  const handleCloseError = () => {
    setErrorModal({ isOpen: false, message: '' });
    setProductInput('');
    
    setTimeout(() => {
      // Smart Focus recovery
      if (!modelName.trim()) modelNameRef.current?.focus();
      else if (!currentModel.trim()) modelInputRef.current?.focus();
      else if (!currentEmployeeId) employeeInputRef.current?.focus();
      else if (currentStageObj?.enableMeasurement) {
         if (!measurementValue) measurementInputRef.current?.focus();
         else productInputRef.current?.focus(); // Simplified
      }
      else productInputRef.current?.focus();
    }, 50);
  };

  const exportCSV = useCallback(() => {
    // Determine headers based on CURRENT STAGE configuration
    const customHeaders = Array.from({length: 8}, (_, i) => {
      const label = currentStageObj?.additionalFieldLabels?.[i];
      // Use configured label if exists, otherwise fallback to "Thông số X"
      return (label && label.trim() !== "") ? label : `Thông số ${i+1}`;
    });

    const headers = ["STT", "Mã IMEI máy", "Tên Model", "Mã Kiểm Tra (IMEI)", "Công Đoạn", "Kết quả chính", ...customHeaders, "Nhân Viên", "Thời Gian", "Trạng Thái", "Ghi Chú"];
    
    const rows = history.map(item => {
      const stageName = stages.find(s => s.id === item.stage)?.name || `Công đoạn ${item.stage}`;
      let statusText = 'LỖI';
      if (item.status === 'valid') statusText = 'OK';
      if (item.status === 'defect') statusText = 'NG (Hàng Lỗi)';
      
      const extraVals = item.additionalValues || Array(8).fill("");

      return [
        item.stt,
        item.productCode,
        item.modelName || '',
        item.model,
        stageName,
        item.measurement || '-',
        ...extraVals.map(v => v || '-'),
        item.employeeId,
        format(new Date(item.timestamp), 'yyyy-MM-dd HH:mm:ss'),
        statusText,
        item.note || ''
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `scan_process_data_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
    link.click();
  }, [history, stages, currentStageObj]);

  const resetSession = () => {
    if (confirm("CẢNH BÁO: Hành động này sẽ xóa toàn bộ lịch sử và tiến độ sản xuất hiện tại. Bạn có chắc không?")) {
      setHistory([]);
      setProductProgress({});
      setProductStatus({});
      setStageEmployees({});
      setStats({ success: 0, defect: 0, error: 0 });
      setProductInput('');
      setDefectCode('');
      setMeasurementValue('');
      // Keep model settings? User might want to reset all.
      // But typically setup params stay.
      loadDefaults();
      employeeInputRef.current?.focus();
    }
  };

  const handleStageChange = (newStageId: number) => {
    setCurrentStage(newStageId);
    setMeasurementValue('');
    
    const newStage = stages.find(s => s.id === newStageId);
    const empForNewStage = stageEmployees[newStageId];
    
    setTimeout(() => {
        if (!empForNewStage) {
            employeeInputRef.current?.focus();
        } else if (newStage?.enableMeasurement) {
            measurementInputRef.current?.focus();
        } else {
            productInputRef.current?.focus();
        }
    }, 50);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-20">
        <div className="w-full px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shadow-blue-500/50 shadow-lg">
              <ScanLine size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">ProScan Process Gate</h1>
              <p className="text-slate-400 text-xs uppercase tracking-wider">Ver 3.6 (8 Params)</p>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
             
             {/* New: Actual Model Name */}
             <div className="flex items-center bg-slate-800 rounded px-3 py-1 border border-slate-700">
                 <Tag size={16} className="text-slate-400 mr-2" />
                 <input
                    ref={modelNameRef}
                    type="text"
                    className="bg-transparent text-white border-none focus:ring-0 text-sm font-bold py-1 w-32 placeholder-slate-500 uppercase"
                    placeholder="NHẬP TÊN MODEL"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                  />
             </div>

             {/* Existing: Model/IMEI Validation with Upload */}
             <div className="flex items-center bg-slate-800 rounded px-3 py-1 border border-slate-700">
                 <Settings size={16} className="text-slate-400 mr-2" />
                 <div className="flex items-center">
                    <input
                        ref={modelInputRef}
                        type="text"
                        className="bg-transparent text-white border-none focus:ring-0 text-sm font-bold py-1 w-32 placeholder-slate-500 uppercase"
                        placeholder="MÃ KIỂM TRA (LIST)"
                        title="Nhập danh sách mã hợp lệ (cách nhau bởi khoảng trắng) HOẶC upload file Excel"
                        value={currentModel}
                        onChange={(e) => setCurrentModel(e.target.value.toUpperCase())}
                      />
                      <label className="cursor-pointer hover:bg-slate-600 p-1 rounded transition-colors ml-1" title="Upload Excel (Cột A)">
                        <Upload size={16} className="text-green-400" />
                        <input 
                          type="file" 
                          className="hidden" 
                          accept=".xlsx, .xls, .csv" 
                          onChange={handleFileUpload}
                        />
                      </label>
                 </div>
             </div>
             
             <Button onClick={() => setIsSettingsOpen(true)} className="text-sm bg-slate-700 hover:bg-slate-600 border border-slate-600" title="Cấu hình công đoạn">
               <Edit size={16} />
             </Button>
             
             <Button onClick={toggleFullScreen} className="text-sm bg-slate-700 hover:bg-slate-600 border border-slate-600" title="Toàn màn hình">
                {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
             </Button>

            <Button onClick={exportCSV} variant="success" className="text-sm">
              <Download size={16} className="mr-1 inline" /> Excel
            </Button>
            <Button onClick={resetSession} variant="secondary" className="text-sm">
              <RefreshCw size={16} className="mr-1 inline" /> Reset
            </Button>
          </div>
        </div>
      </header>

      {/* STAGE SELECTOR BAR */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-[72px] z-10">
        <div className="w-full px-2 p-2 overflow-x-auto">
           <div className="flex space-x-2 min-w-max">
             {stages.map((stage) => {
               const hasEmp = !!stageEmployees[stage.id];
               return (
               <button
                 key={stage.id}
                 onClick={() => handleStageChange(stage.id)}
                 className={`flex items-center px-4 py-3 rounded-lg border-2 transition-all duration-200 font-bold text-sm ${
                   currentStage === stage.id
                     ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-105'
                     : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 hover:border-gray-300'
                 }`}
               >
                 <span className={`flex items-center justify-center w-6 h-6 rounded-full mr-2 text-xs border ${
                    currentStage === stage.id ? 'bg-white text-blue-600 border-white' : hasEmp ? 'bg-green-500 text-white border-green-500' : 'bg-gray-300 text-white border-gray-300'
                 }`}>
                   {stage.id}
                 </span>
                 {stage.name}
               </button>
             )})}
           </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT: INPUTS & STATS */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
               <div className="col-span-3">
                 <div className="bg-blue-600 text-white p-4 rounded-lg shadow-md">
                    <h3 className="text-xs uppercase font-bold opacity-80 mb-1">Công đoạn đang chọn</h3>
                    <div className="text-xl font-bold flex items-center gap-2">
                       <Layers size={24} /> {currentStageObj?.name || `Stage ${currentStage}`}
                    </div>
                    {currentEmployeeId && (
                       <div className="mt-2 text-sm bg-blue-700/50 p-1 px-2 rounded inline-block">
                         NV: <b>{currentEmployeeId}</b>
                       </div>
                    )}
                 </div>
               </div>
               <StatCard title="OK" value={stats.success} type="success" icon={<CheckCircle size={20} />} />
               <StatCard title="NG" value={stats.defect} type="error" icon={<XCircle size={20} />} />
               <StatCard title="System Err" value={stats.error} type="neutral" icon={<AlertOctagon size={20} />} />
            </div>

            {/* Scan Form */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
               <div className="p-4 bg-gray-50 border-b border-gray-200 font-bold text-gray-700 flex items-center gap-2">
                 <ScanLine size={18} /> QUÉT MÃ
               </div>
               <div className="p-6 space-y-6">
                  {/* Employee */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">
                      1. Nhân viên (Công đoạn {currentStage})
                    </label>
                    <div className="relative">
                      <input
                        ref={employeeInputRef}
                        className={`w-full text-lg p-3 pl-10 border-2 rounded focus:outline-none ${currentEmployeeId ? 'border-green-300 bg-green-50 focus:border-green-500' : 'border-gray-300 focus:border-blue-500'}`}
                        placeholder={currentEmployeeId ? "Đổi nhân viên..." : "Scan mã NV để bắt đầu..."}
                        value={employeeInput}
                        onChange={e => setEmployeeInput(e.target.value)}
                        onKeyDown={handleEmployeeScan}
                      />
                      <Users className="absolute left-3 top-3.5 text-gray-400" size={20} />
                      {currentEmployeeId && (
                        <div className="absolute right-3 top-3.5 text-green-700 font-bold text-xs bg-green-200 px-2 py-0.5 rounded border border-green-300">
                          {currentEmployeeId}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <hr className="border-gray-100"/>

                   {/* Defect Code Input */}
                   <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
                    <label className="block text-sm font-bold text-amber-700 mb-1 flex items-center gap-2">
                      <AlertTriangle size={14} />
                      2. Mã Lỗi (Tùy chọn - Scan khi hàng NG)
                    </label>
                    <input
                      ref={defectInputRef}
                      className="w-full text-base p-2 border-2 border-amber-300 rounded focus:border-amber-500 focus:outline-none placeholder-amber-300/70"
                      placeholder="Scan mã lỗi (Ví dụ: NG01)..."
                      value={defectCode}
                      onChange={e => setDefectCode(e.target.value)}
                      onKeyDown={handleDefectScan}
                    />
                  </div>

                  <hr className="border-gray-100"/>

                  {/* Measurement Input (CONDITIONAL) */}
                  {currentStageObj?.enableMeasurement && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                      {/* Main Measurement */}
                      <div>
                        <label className="block text-sm font-bold text-purple-700 mb-1 flex items-center gap-2">
                          <Activity size={18} className="text-purple-600"/>
                          3. Nhập {currentStageObj.measurementLabel || "Giá trị đo"} (Bắt buộc)
                        </label>
                        <input
                          ref={measurementInputRef}
                          className="w-full text-lg p-3 border-2 border-purple-300 bg-purple-50 rounded focus:border-purple-500 focus:outline-none"
                          placeholder={currentStageObj.measurementStandard ? `Nhập giá trị (Chuẩn: ${currentStageObj.measurementStandard})...` : `Nhập ${currentStageObj.measurementLabel || "giá trị"}...`}
                          value={measurementValue}
                          onChange={e => setMeasurementValue(e.target.value)}
                          onKeyDown={handleMeasurementScan}
                        />
                      </div>

                      {/* 8 Extra Fields (Grid) */}
                      {activeExtraFields.length > 0 && (
                        <div className="bg-gray-50 p-3 rounded border border-gray-200">
                           <label className="block text-xs font-bold text-gray-500 mb-2 uppercase flex items-center gap-1">
                             <List size={12}/> Thông số mở rộng
                           </label>
                           {/* Updated Grid for 8 items: 2 cols */}
                           <div className="grid grid-cols-2 gap-3">
                              {activeExtraFields.map((field) => (
                                <div key={field.idx}>
                                   <label className="block text-[10px] font-bold text-gray-500 mb-1 truncate" title={field.label}>
                                      {field.label}
                                   </label>
                                   <input
                                      ref={(el) => extraInputRefs.current[field.idx] = el}
                                      value={additionalValues[field.idx]}
                                      onChange={(e) => updateAdditionalValue(field.idx, e.target.value)}
                                      onKeyDown={(e) => handleExtraInputScan(e, field.idx)}
                                      className="w-full p-2 text-sm border border-gray-300 rounded focus:border-purple-500 focus:ring-1 focus:ring-purple-200 outline-none"
                                      placeholder={currentStageObj.additionalFieldDefaults?.[field.idx] ? "(Mặc định)" : "..."}
                                   />
                                </div>
                              ))}
                           </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Product */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">
                      {currentStageObj?.enableMeasurement ? "4" : "3"}. Mã IMEI máy (Enter)
                    </label>
                    <div className="relative">
                      <input
                        ref={productInputRef}
                        disabled={errorModal.isOpen}
                        className={`w-full text-xl font-mono p-4 pl-10 border-2 rounded shadow-inner focus:outline-none transition-colors
                          ${errorModal.isOpen 
                            ? 'bg-gray-100 cursor-not-allowed border-gray-300' 
                            : defectCode 
                              ? 'bg-amber-50 border-amber-500 ring-4 ring-amber-100'
                              : 'bg-white border-blue-600 ring-4 ring-blue-50/50'}
                        `}
                        placeholder={
                          !modelName ? "⚠️ Nhập Tên Model trước" :
                          !currentModel ? "⚠️ Nhập Mã Kiểm Tra (IMEI)" :
                          !currentEmployeeId ? "⚠️ Quét nhân viên trước" :
                          defectCode ? "⚠️ SẮP GHI LỖI NG..." :
                          "Sẵn sàng scan IMEI..."
                        }
                        value={productInput}
                        onChange={e => setProductInput(e.target.value)}
                        onKeyDown={handleProductScan}
                      />
                      <Box className={`absolute left-3 top-1/2 -translate-y-1/2 ${currentEmployeeId && currentModel && modelName ? (defectCode ? 'text-amber-600' : 'text-blue-600') : 'text-gray-400'}`} size={24} />
                    </div>
                  </div>
               </div>
            </div>
          </div>

          {/* RIGHT: HISTORY TABLE */}
          <div className="lg:col-span-2 h-[calc(100vh-220px)] min-h-[500px]">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
               <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center rounded-t-lg">
                  <h3 className="font-bold text-gray-700">Lịch sử Scan</h3>
                  <div className="text-xs flex gap-2">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> OK</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div> NG</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Err</span>
                  </div>
               </div>
               
               <div className="flex-1 overflow-auto">
                 <table className="w-full text-left text-sm">
                   <thead className="bg-gray-100 text-gray-600 sticky top-0 z-0 shadow-sm">
                     <tr>
                       <th className="p-3 font-semibold border-b w-12">STT</th>
                       <th className="p-3 font-semibold border-b">Mã IMEI máy</th>
                       <th className="p-3 font-semibold border-b text-blue-700">Tên Model</th>
                       <th className="p-3 font-semibold border-b">Công Đoạn</th>
                       <th className="p-3 font-semibold border-b">Kết quả đo</th>
                       <th className="p-3 font-semibold border-b">Tiến độ</th>
                       <th className="p-3 font-semibold border-b">Nhân Viên</th>
                       <th className="p-3 font-semibold border-b">Trạng Thái</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                     {history.length === 0 ? (
                       <tr><td colSpan={8} className="p-10 text-center text-gray-400">Chưa có dữ liệu</td></tr>
                     ) : (
                       history.map((row) => {
                         const rowProgress = productProgress[row.productCode] || 0;
                         const rowStageObj = stages.find(s => s.id === row.stage);
                         const rowStageName = rowStageObj?.name || `Stage ${row.stage}`;
                         
                         let rowClass = "";
                         if (row.status === 'valid') rowClass = "border-green-500 hover:bg-gray-50";
                         else if (row.status === 'defect') rowClass = "border-amber-500 bg-amber-50 hover:bg-amber-100";
                         else rowClass = "border-red-500 bg-red-50 hover:bg-red-100";
                         
                         // Helper to render extended values cleanly
                         const renderExtended = () => {
                           if (!row.additionalValues || row.additionalValues.every(v => !v)) return null;
                           // Only show values that correspond to configured labels (if we can find the stage config)
                           return (
                             <div className="mt-1 flex flex-wrap gap-1">
                               {row.additionalValues.map((v, i) => {
                                 if (!v) return null;
                                 const label = rowStageObj?.additionalFieldLabels?.[i];
                                 return (
                                   <span key={i} className="text-[10px] bg-purple-50 text-purple-700 px-1 rounded border border-purple-100 whitespace-nowrap">
                                     {label ? `${label}: ` : ''}<b>{v}</b>
                                   </span>
                                 )
                               })}
                             </div>
                           )
                         };

                         return (
                           <tr key={row.id} className={`border-l-4 ${rowClass}`}>
                             <td className="p-3 text-gray-500">{row.stt}</td>
                             <td className={`p-3 font-mono font-medium ${row.status === 'error' ? 'text-red-700 line-through' : row.status === 'defect' ? 'text-amber-800' : 'text-blue-700'}`}>
                               {row.productCode}
                             </td>
                             <td className="p-3 font-bold text-gray-700">
                               {row.modelName || <span className="text-gray-300">-</span>}
                             </td>
                             <td className="p-3">
                               <span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold border border-gray-200 block truncate max-w-[150px]" title={rowStageName}>
                                 {rowStageName}
                               </span>
                             </td>
                             <td className="p-3">
                                <div className="font-medium text-purple-700">{row.measurement || '-'}</div>
                                {renderExtended()}
                             </td>
                             <td className="p-3">
                               {(row.status === 'valid' || row.status === 'defect') && (
                                 <div className="flex gap-1">
                                    {[1,2,3,4,5].map(step => (
                                      <div key={step} className={`w-2 h-4 rounded-sm ${step <= rowProgress ? 'bg-green-500' : 'bg-gray-200'}`} title={`Step ${step}`}/>
                                    ))}
                                 </div>
                               )}
                             </td>
                             <td className="p-3 text-gray-900">{row.employeeId}</td>
                             <td className="p-3">
                               {row.status === 'valid' ? (
                                 <div className="text-xs text-gray-500">
                                   {format(new Date(row.timestamp), 'HH:mm:ss')}
                                 </div>
                               ) : row.status === 'defect' ? (
                                  <span className="text-amber-700 font-bold text-xs flex items-center gap-1">
                                   <XCircle size={12}/> {row.note}
                                 </span>
                               ) : (
                                 <span className="text-red-600 font-bold text-xs flex items-center gap-1">
                                   <AlertTriangle size={12}/> {row.note}
                                 </span>
                               )}
                             </td>
                           </tr>
                         );
                       })
                     )}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
      </main>

      <ErrorModal isOpen={errorModal.isOpen} message={errorModal.message} onClose={handleCloseError} />

      <StageSettingsModal 
        isOpen={isSettingsOpen}
        stages={stages}
        onSave={setStages}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}