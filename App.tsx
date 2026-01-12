import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Download, ScanLine, Users, CheckCircle, AlertOctagon, RefreshCw, Box, Settings, AlertTriangle, Layers, Edit, XCircle, Activity } from 'lucide-react';
import { format } from 'date-fns';

import { ScanRecord, Stats, ErrorState, DEFAULT_PROCESS_STAGES, Stage } from './types';
import { Button } from './Button';
import { ErrorModal } from './ErrorModal';
import { StatCard } from './StatCard';
import { StageSettingsModal } from './StageSettingsModal';

export default function App() {
  // --- STATE ---
  
  // Configuration
  // Track employee per stage ID
  const [stageEmployees, setStageEmployees] = useState<Record<number, string>>({});

  const [currentModel, setCurrentModel] = useState<string>('');
  const [currentStage, setCurrentStage] = useState<number>(1); // Default Stage 1
  
  // Dynamic Stages with LocalStorage Persistence
  const [stages, setStages] = useState<Stage[]>(() => {
    try {
      const saved = localStorage.getItem('proscan_stages');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load stages from storage", e);
    }
    return DEFAULT_PROCESS_STAGES;
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Data
  const [history, setHistory] = useState<ScanRecord[]>([]);
  // Map to track highest stage completed for each product: Record<ProductCode, HighestStageNumber>
  const [productProgress, setProductProgress] = useState<Record<string, number>>({});
  // New: Map to track the current status of a product: Record<ProductCode, 'valid' | 'defect'>
  const [productStatus, setProductStatus] = useState<Record<string, 'valid' | 'defect'>>({});
  
  // UI State
  const [stats, setStats] = useState<Stats>({ success: 0, defect: 0, error: 0 });
  
  // Inputs
  const [employeeInput, setEmployeeInput] = useState('');
  const [defectCode, setDefectCode] = useState(''); 
  const [measurementValue, setMeasurementValue] = useState(''); 
  const [productInput, setProductInput] = useState('');
  
  const [errorModal, setErrorModal] = useState<ErrorState>({ isOpen: false, message: '' });

  // Refs
  const employeeInputRef = useRef<HTMLInputElement>(null);
  const defectInputRef = useRef<HTMLInputElement>(null);
  const measurementInputRef = useRef<HTMLInputElement>(null);
  const productInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);

  // --- EFFECT: Save Stages to LocalStorage ---
  useEffect(() => {
    localStorage.setItem('proscan_stages', JSON.stringify(stages));
  }, [stages]);

  // --- EFFECT: Calculate Stats for Current Stage ---
  useEffect(() => {
    // Recalculate success count based on current stage
    const currentStageSuccess = history.filter(
      r => r.status === 'valid' && r.stage === currentStage
    ).length;

    const currentStageDefect = history.filter(
      r => r.status === 'defect' && r.stage === currentStage
    ).length;
    
    // Error count is global/total accumulator
    setStats(prev => ({ 
      ...prev, 
      success: currentStageSuccess,
      defect: currentStageDefect
    }));
  }, [history, currentStage]);

  // --- HELPER: Get Current Stage Object & Employee ---
  const currentStageObj = useMemo(() => stages.find(s => s.id === currentStage), [stages, currentStage]);
  const currentEmployeeId = stageEmployees[currentStage];

  // --- INITIAL FOCUS ---
  useEffect(() => {
    if (!currentModel) modelInputRef.current?.focus();
    else if (!currentEmployeeId) employeeInputRef.current?.focus();
    else productInputRef.current?.focus();
  }, [currentStage]); // Re-run when stage changes to check focus

  // --- HANDLERS ---

  const handleEmployeeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = employeeInput.trim();
      if (val) {
        // Set employee specifically for THIS stage
        setStageEmployees(prev => ({
          ...prev,
          [currentStage]: val
        }));
        setEmployeeInput('');
        
        // Logic to determine next focus
        if (currentStageObj?.enableMeasurement) {
           measurementInputRef.current?.focus();
        } else {
           productInputRef.current?.focus();
        }
      }
    }
  };

  const handleDefectScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      productInputRef.current?.focus();
    }
  };

  const handleMeasurementScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (measurementValue.trim()) {
        productInputRef.current?.focus();
      }
    }
  };

  const handleError = (message: string, scannedCode: string = '') => {
    setStats(prev => ({ ...prev, error: prev.error + 1 }));
    
    // Log error
    const errorRecord: ScanRecord = {
      id: crypto.randomUUID(),
      stt: history.length + 1,
      productCode: scannedCode || '---',
      model: currentModel || 'CHƯA CÓ',
      employeeId: currentEmployeeId || 'CHƯA CÓ',
      timestamp: new Date().toISOString(),
      status: 'error',
      note: message,
      stage: currentStage
    };
    setHistory(prev => [errorRecord, ...prev]);

    // Show Modal
    setErrorModal({ isOpen: true, message });
  };

  const handleSuccess = (code: string) => {
    // Update Global Progress Map
    setProductProgress(prev => ({
      ...prev,
      [code]: currentStage
    }));

    // Update Status Map -> Valid (Clear any previous defect status)
    setProductStatus(prev => ({
      ...prev,
      [code]: 'valid'
    }));

    const newRecord: ScanRecord = {
      id: crypto.randomUUID(),
      stt: history.length + 1,
      productCode: code,
      model: currentModel,
      employeeId: currentEmployeeId || 'UNKNOWN',
      timestamp: new Date().toISOString(),
      status: 'valid',
      note: 'Thành công',
      stage: currentStage,
      measurement: currentStageObj?.enableMeasurement ? measurementValue : undefined
    };

    setHistory(prev => [newRecord, ...prev]);
    
    // Reset Inputs
    setProductInput('');
    setDefectCode('');
    setMeasurementValue(''); 
    
    // Return Focus
    if (currentStageObj?.enableMeasurement) {
      measurementInputRef.current?.focus();
    } else {
      productInputRef.current?.focus();
    }
  };

  const handleDefectRecord = (code: string, reason: string) => {
    // Update Status Map -> Defect
    setProductStatus(prev => ({
      ...prev,
      [code]: 'defect'
    }));

    // Record as Defect (NG)
    const newRecord: ScanRecord = {
      id: crypto.randomUUID(),
      stt: history.length + 1,
      productCode: code,
      model: currentModel,
      employeeId: currentEmployeeId || 'UNKNOWN',
      timestamp: new Date().toISOString(),
      status: 'defect',
      note: `Lỗi: ${reason}`,
      stage: currentStage,
      measurement: currentStageObj?.enableMeasurement ? measurementValue : undefined
    };

    setHistory(prev => [newRecord, ...prev]);
    
    // Reset Inputs
    setProductInput('');
    setDefectCode(''); 
    setMeasurementValue('');

    // Return Focus
    if (currentStageObj?.enableMeasurement) {
        measurementInputRef.current?.focus();
    } else {
        productInputRef.current?.focus();
    }
  };

  const handleProductScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = productInput.trim();
      if (!code) return;

      // 1. Basic Validations
      if (!currentModel.trim()) return handleError("Lỗi: Chưa cài đặt Model.", code);
      // CHECK IF EMPLOYEE IS SET FOR CURRENT STAGE
      if (!currentEmployeeId) return handleError(`Lỗi: Chưa xác định nhân viên cho công đoạn ${currentStage}.`, code);
      
      if (!code.toUpperCase().includes(currentModel.toUpperCase())) {
        return handleError(`Lỗi: Sai Model. Mã không chứa "${currentModel}".`, code);
      }

      // 2. CHECK IF THIS IS A DEFECT SCAN (User manually entered defect code)
      if (defectCode.trim()) {
        handleDefectRecord(code, defectCode);
        return;
      }

      // 3. MEASUREMENT VALIDATION
      if (currentStageObj?.enableMeasurement && !measurementValue.trim()) {
         measurementInputRef.current?.focus();
         return handleError(`Lỗi: Công đoạn này yêu cầu nhập ${currentStageObj.measurementLabel || 'giá trị đo'}.`, code);
      }

      // 4. PROCESS GATE & STATUS LOGIC
      const currentProgress = productProgress[code] || 0;
      const lastStatus = productStatus[code];

      // Block if Previous Status was Defect
      if (lastStatus === 'defect') {
        if (currentStage > currentProgress + 1) {
           return handleError("⛔ CẢNH BÁO: Sản phẩm bị LỖI (NG) chưa được xử lý. Vui lòng quay lại công đoạn trước để sửa chữa.", code);
        }
      }

      // Rule A: Check Duplicate at Current Stage
      if (currentProgress >= currentStage) {
        return handleError(`Lỗi: Mã đã PASS công đoạn ${currentStage} trước đó.`, code);
      }

      // Rule B: Check Sequence (Previous Stage)
      if (currentStage > 1 && currentProgress < currentStage - 1) {
        return handleError(`Lỗi: Sai trình tự. Chưa hoàn thành công đoạn ${currentStage - 1}.`, code);
      }

      // All Passed
      handleSuccess(code);
    }
  };

  const handleCloseError = () => {
    setErrorModal({ isOpen: false, message: '' });
    setProductInput('');
    setTimeout(() => {
      if (!currentModel.trim()) modelInputRef.current?.focus();
      else if (!currentEmployeeId) employeeInputRef.current?.focus();
      else if (currentStageObj?.enableMeasurement && !measurementValue) measurementInputRef.current?.focus();
      else productInputRef.current?.focus();
    }, 50);
  };

  const exportCSV = useCallback(() => {
    const headers = ["STT", "Mã Sản Phẩm", "Model", "Công Đoạn", "Giá Trị Đo", "Nhân Viên", "Thời Gian", "Trạng Thái", "Ghi Chú"];
    const rows = history.map(item => {
      const stageName = stages.find(s => s.id === item.stage)?.name || `Công đoạn ${item.stage}`;
      let statusText = 'LỖI';
      if (item.status === 'valid') statusText = 'OK';
      if (item.status === 'defect') statusText = 'NG (Hàng Lỗi)';

      return [
        item.stt,
        item.productCode,
        item.model,
        stageName,
        item.measurement || '-', 
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
  }, [history, stages]);

  const resetSession = () => {
    if (confirm("CẢNH BÁO: Hành động này sẽ xóa toàn bộ lịch sử và tiến độ sản xuất hiện tại. Bạn có chắc không?")) {
      setHistory([]);
      setProductProgress({});
      setProductStatus({});
      setStageEmployees({}); // Clear all employees
      setStats({ success: 0, defect: 0, error: 0 });
      setProductInput('');
      setDefectCode('');
      setMeasurementValue('');
      
      // After reset, focus on employee
      employeeInputRef.current?.focus();
    }
  };

  const handleStageChange = (newStageId: number) => {
    setCurrentStage(newStageId);
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
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shadow-blue-500/50 shadow-lg">
              <ScanLine size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">ProScan Process Gate</h1>
              <p className="text-slate-400 text-xs uppercase tracking-wider">Ver 2.6 (Multi-Employee)</p>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
             {/* Model Input */}
             <div className="flex items-center bg-slate-800 rounded px-3 py-1 border border-slate-700">
                 <Settings size={16} className="text-slate-400 mr-2" />
                 <input
                    ref={modelInputRef}
                    type="text"
                    className="bg-transparent text-white border-none focus:ring-0 text-sm font-bold py-1 w-32 placeholder-slate-500 uppercase"
                    placeholder="NHẬP MODEL"
                    value={currentModel}
                    onChange={(e) => setCurrentModel(e.target.value.toUpperCase())}
                  />
             </div>
             
             {/* Configure Stages Button */}
             <Button 
                onClick={() => setIsSettingsOpen(true)} 
                className="text-sm bg-slate-700 hover:bg-slate-600 border border-slate-600"
                title="Cấu hình tên công đoạn"
             >
               <Edit size={16} />
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
        <div className="max-w-7xl mx-auto p-2 overflow-x-auto">
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
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
          
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
               <StatCard 
                 title="OK"
                 value={stats.success} 
                 type="success"
                 icon={<CheckCircle size={20} />} 
               />
               <StatCard 
                 title="NG" 
                 value={stats.defect} 
                 type="error"
                 icon={<XCircle size={20} />} 
               />
               <StatCard 
                 title="System Err" 
                 value={stats.error} 
                 type="neutral"
                 icon={<AlertOctagon size={20} />} 
               />
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
                      {currentStageObj?.enableMeasurement ? "2" : "2"}. Mã Lỗi (Tùy chọn)
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
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="block text-sm font-bold text-purple-700 mb-1 flex items-center gap-2">
                        <Activity size={18} className="text-purple-600"/>
                        3. Nhập {currentStageObj.measurementLabel || "Giá trị đo"} (Bắt buộc)
                      </label>
                      <input
                        ref={measurementInputRef}
                        className="w-full text-lg p-3 border-2 border-purple-300 bg-purple-50 rounded focus:border-purple-500 focus:outline-none"
                        placeholder={`Nhập ${currentStageObj.measurementLabel || "giá trị"}...`}
                        value={measurementValue}
                        onChange={e => setMeasurementValue(e.target.value)}
                        onKeyDown={handleMeasurementScan}
                      />
                    </div>
                  )}

                  {/* Product */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">
                      {currentStageObj?.enableMeasurement ? "4" : "3"}. Sản phẩm (Enter)
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
                          !currentModel ? "⚠️ Nhập Model trước" :
                          !currentEmployeeId ? "⚠️ Quét nhân viên trước" :
                          defectCode ? "⚠️ SẮP GHI LỖI NG..." :
                          "Sẵn sàng scan..."
                        }
                        value={productInput}
                        onChange={e => setProductInput(e.target.value)}
                        onKeyDown={handleProductScan}
                      />
                      <Box className={`absolute left-3 top-1/2 -translate-y-1/2 ${currentEmployeeId && currentModel ? (defectCode ? 'text-amber-600' : 'text-blue-600') : 'text-gray-400'}`} size={24} />
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
                       <th className="p-3 font-semibold border-b">Mã Sản Phẩm</th>
                       <th className="p-3 font-semibold border-b">Công Đoạn</th>
                       <th className="p-3 font-semibold border-b">Kết quả đo</th>
                       <th className="p-3 font-semibold border-b">Tiến độ</th>
                       <th className="p-3 font-semibold border-b">Nhân Viên</th>
                       <th className="p-3 font-semibold border-b">Trạng Thái</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                     {history.length === 0 ? (
                       <tr><td colSpan={7} className="p-10 text-center text-gray-400">Chưa có dữ liệu</td></tr>
                     ) : (
                       history.map((row) => {
                         const rowProgress = productProgress[row.productCode] || 0;
                         const rowStageName = stages.find(s => s.id === row.stage)?.name || `Stage ${row.stage}`;
                         let rowClass = "";
                         if (row.status === 'valid') rowClass = "border-green-500 hover:bg-gray-50";
                         else if (row.status === 'defect') rowClass = "border-amber-500 bg-amber-50 hover:bg-amber-100";
                         else rowClass = "border-red-500 bg-red-50 hover:bg-red-100";

                         return (
                           <tr key={row.id} className={`border-l-4 ${rowClass}`}>
                             <td className="p-3 text-gray-500">{row.stt}</td>
                             <td className={`p-3 font-mono font-medium ${row.status === 'error' ? 'text-red-700 line-through' : row.status === 'defect' ? 'text-amber-800' : 'text-blue-700'}`}>
                               {row.productCode}
                             </td>
                             <td className="p-3">
                               <span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold border border-gray-200 block truncate max-w-[150px]" title={rowStageName}>
                                 {rowStageName}
                               </span>
                             </td>
                             <td className="p-3 font-medium text-purple-700">
                                {row.measurement || '-'}
                             </td>
                             <td className="p-3">
                               {/* Progress Dots */}
                               {(row.status === 'valid' || row.status === 'defect') && (
                                 <div className="flex gap-1">
                                    {[1,2,3,4,5].map(step => (
                                      <div 
                                        key={step} 
                                        className={`w-2 h-4 rounded-sm ${step <= rowProgress ? 'bg-green-500' : 'bg-gray-200'}`}
                                        title={`Step ${step}`}
                                      />
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

      <ErrorModal 
        isOpen={errorModal.isOpen} 
        message={errorModal.message} 
        onClose={handleCloseError} 
      />

      <StageSettingsModal 
        isOpen={isSettingsOpen}
        stages={stages}
        onSave={setStages}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}