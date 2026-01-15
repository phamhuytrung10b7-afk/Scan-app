
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Barcode, 
  Trash2, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Maximize2, 
  Settings,
  History,
  Tag,
  AlertOctagon, 
  X, 
  FileWarning, 
  FlaskConical, 
  ClipboardList,
  Save,
  PenLine,
  LayoutGrid,
  XCircle
} from 'lucide-react';
import { ScanRecord, ScanStatus, TestConfig } from './types';

// Utility for formatting dates
const formatTimestamp = (date: Date): string => {
  const pad = (num: number) => num.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
         `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const App: React.FC = () => {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [modelName, setModelName] = useState('');
  const [errorCode, setErrorCode] = useState(''); 
  
  // Advanced Test Config State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [testConfig, setTestConfig] = useState<TestConfig>({
    enabled: false,
    stepName: '',
    mainResult: { name: 'Kết quả Test', standardValue: 'PASS' },
    parameters: Array.from({ length: 15 }, (_, i) => ({ id: i, name: '', defaultValue: '' }))
  });

  // Temp Config State for Inline Modal
  const [tempConfig, setTempConfig] = useState<TestConfig>({
    enabled: false,
    stepName: '',
    mainResult: { name: 'Kết quả Test', standardValue: 'PASS' },
    parameters: Array.from({ length: 15 }, (_, i) => ({ id: i, name: '', defaultValue: '' }))
  });

  // Runtime Input States for Test Mode
  const [testResultInput, setTestResultInput] = useState('');
  const [testParamInputs, setTestParamInputs] = useState<string[]>(Array(15).fill(''));

  const [lastScan, setLastScan] = useState<ScanRecord | null>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [showMissingModelWarning, setShowMissingModelWarning] = useState(false);
  const [showMissingDataWarning, setShowMissingDataWarning] = useState(false); 
  
  const inputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Apply default values when config changes or enabled
  useEffect(() => {
    if (testConfig.enabled) {
      setTestResultInput(testConfig.mainResult.standardValue || '');
      setTestParamInputs(testConfig.parameters.map(p => p.defaultValue));
    }
  }, [testConfig]);

  const playSound = (type: 'success' | 'error') => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else {
      osc.type = 'square';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  };

  useEffect(() => {
    const keepFocus = () => {
      const activeId = document.activeElement?.id;
      // Allow focus on configuration modal inputs
      if (showConfigModal) return;
      
      // Allow focus on runtime inputs
      if (activeId === 'model-input' || activeId === 'error-input' || activeId === 'main-result-input' || activeId?.startsWith('param-input-')) return;
      
      if (showMissingModelWarning || showMissingDataWarning) return;

      if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'BUTTON') {
        inputRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', keepFocus);
    const interval = setInterval(keepFocus, 1000);
    return () => {
      document.removeEventListener('mousedown', keepFocus);
      clearInterval(interval);
    };
  }, [showMissingModelWarning, showConfigModal, showMissingDataWarning]);

  const handleScan = useCallback((code: string) => {
    const trimmedCode = code.trim();
    if (!trimmedCode) return;

    let scanStatus = ScanStatus.VALID;
    let systemErrorCode = errorCode.trim();
    let effectiveModelName = modelName.trim();

    // 1. Check Model Name
    if (!effectiveModelName) {
      scanStatus = ScanStatus.ERROR;
      systemErrorCode = systemErrorCode || 'THIẾU TÊN MODEL';
      effectiveModelName = '---';
      
      playSound('error');
      setShowMissingModelWarning(true);
      setTimeout(() => {
        setShowMissingModelWarning(false);
        modelInputRef.current?.focus();
      }, 2000);
    }

    // 2. Check Test Data Constraints
    if (scanStatus !== ScanStatus.ERROR && testConfig.enabled) {
      // Check Main Result
      const isMainResultMissing = !testResultInput.trim();
      
      // Check active parameters
      const isParamsMissing = testConfig.parameters.some((p, i) => {
         return p.name.trim() !== '' && !testParamInputs[i].trim();
      });

      if (isMainResultMissing || isParamsMissing) {
        scanStatus = ScanStatus.ERROR;
        systemErrorCode = systemErrorCode || 'THIẾU DỮ LIỆU TEST';

        playSound('error');
        setShowMissingDataWarning(true);
        setTimeout(() => setShowMissingDataWarning(false), 2500);
      }
    }

    // 3. Check Duplicate
    if (scanStatus === ScanStatus.VALID) {
      const isDuplicate = scans.some(s => s.code === trimmedCode && s.status === ScanStatus.VALID);
      if (isDuplicate) {
        scanStatus = ScanStatus.DUPLICATE;
        playSound('error');
        setShowDuplicateWarning(true);
        setTimeout(() => setShowDuplicateWarning(false), 2000);
      } else {
        playSound('success');
      }
    }

    const timestamp = formatTimestamp(new Date());
    
    const newRecord: ScanRecord = {
      id: crypto.randomUUID(),
      code: trimmedCode,
      modelName: effectiveModelName,
      errorCode: systemErrorCode, 
      stepName: testConfig.enabled ? testConfig.stepName : undefined,
      testResult: testConfig.enabled ? testResultInput : undefined,
      testParams: testConfig.enabled ? [...testParamInputs] : undefined,
      timestamp,
      status: scanStatus,
      index: scans.length + 1
    };

    setScans(prev => [newRecord, ...prev]);
    setLastScan(newRecord);
    setInputValue('');

    if (scanStatus === ScanStatus.VALID) {
      setErrorCode(''); 
      if (testConfig.enabled) {
        setTestResultInput(testConfig.mainResult.standardValue || '');
        setTestParamInputs(testConfig.parameters.map(p => p.defaultValue));
      }
    }

  }, [scans, modelName, errorCode, testConfig, testResultInput, testParamInputs]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleScan(inputValue);
    }
  };

  const clearAll = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử quét?')) {
      setScans([]);
      setLastScan(null);
    }
  };

  const exportCSV = () => {
    if (scans.length === 0) return;
    
    const baseHeaders = ['STT', 'Tên Model', 'Mã Đã Quét', 'Mã Lỗi (NG)', 'Tên Công Đoạn', 'Kết Quả Chính'];
    const paramHeaders = testConfig.enabled 
        ? testConfig.parameters.filter(p => p.name).map(p => p.name)
        : Array.from({length: 15}, (_, i) => `TS${i+1}`);
    
    const headers = [...baseHeaders, ...paramHeaders, 'Thời Gian Quét', 'Trạng Thái'];

    const rows = scans.map(s => {
      const baseData = [
        s.index, 
        s.modelName, 
        s.code,
        s.errorCode || '',
        s.stepName || '',
        s.testResult || ''
      ];
      
      let pData: string[] = [];
      if (testConfig.enabled) {
         const activeIndices = testConfig.parameters.map((p, i) => p.name ? i : -1).filter(i => i !== -1);
         pData = activeIndices.map(idx => s.testParams?.[idx] || '');
      } else {
         pData = s.testParams || Array(15).fill('');
      }

      let statusText = 'HỢP LỆ';
      if (s.status === ScanStatus.DUPLICATE) statusText = 'TRÙNG LẶP';
      if (s.status === ScanStatus.ERROR) statusText = 'LỖI';

      return [...baseData, ...pData, s.timestamp, statusText];
    });
    
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `du_lieu_quet_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for updating temp config parameters
  const handleTempParamChange = (idx: number, field: 'name' | 'defaultValue', value: string) => {
    const newParams = [...tempConfig.parameters];
    newParams[idx] = { ...newParams[idx], [field]: value };
    setTempConfig({ ...tempConfig, parameters: newParams });
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 overflow-hidden">
      {/* INLINED CONFIG MODAL */}
      {showConfigModal && (
         <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden border border-slate-200">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-2 text-indigo-700">
                  <Settings className="w-6 h-6" />
                  <h2 className="text-lg font-bold uppercase">Cấu hình chế độ Test</h2>
                </div>
                <button onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                  <X className="w-8 h-8" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                {/* Step Name & Enable */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                   <div className="flex-1">
                     <label className="block text-xs font-bold text-slate-400 uppercase mb-1">3. TÊN CÔNG ĐOẠN</label>
                     <input 
                       type="text" 
                       value={tempConfig.stepName}
                       onChange={e => setTempConfig({...tempConfig, stepName: e.target.value})}
                       className="w-full text-lg font-semibold border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                       placeholder="VD: CĐ 3 : Test nước"
                     />
                   </div>
                   <div className="flex items-end mb-1">
                     <label className="flex items-center gap-3 cursor-pointer bg-white px-4 py-3 rounded-lg border border-slate-300 hover:border-indigo-400 transition-all select-none shadow-sm">
                        <input 
                          type="checkbox" 
                          checked={tempConfig.enabled}
                          onChange={e => setTempConfig({...tempConfig, enabled: e.target.checked})}
                          className="w-6 h-6 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                        />
                        <span className="font-bold text-slate-700 flex items-center gap-2">
                           <FlaskConical size={20} className={tempConfig.enabled ? "text-indigo-600" : "text-slate-400"}/>
                           Kích hoạt Test?
                        </span>
                     </label>
                   </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 h-full">
                   {/* Left: Main Result Config */}
                   <div className="lg:w-1/3 bg-white p-5 rounded-xl border-2 border-indigo-100 shadow-sm h-fit">
                      <h3 className="text-indigo-700 font-bold mb-4 flex items-center gap-2">
                        <span className="bg-indigo-100 px-2 py-0.5 rounded text-xs">1</span>
                        TÊN KẾT QUẢ CHÍNH (BẮT BUỘC)
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <input 
                            type="text" 
                            value={tempConfig.mainResult.name}
                            onChange={e => setTempConfig({...tempConfig, mainResult: {...tempConfig.mainResult, name: e.target.value}})}
                            className="w-full border border-indigo-200 rounded-md px-3 py-2 text-indigo-900 font-medium focus:outline-none focus:border-indigo-500"
                            placeholder="Kết quả Test"
                          />
                        </div>
                        
                        <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                          <h4 className="text-green-700 text-xs font-bold uppercase mb-2 flex items-center gap-1">
                            <CheckCircle2 size={12}/> Giá trị tiêu chuẩn
                          </h4>
                          <input 
                            type="text" 
                            value={tempConfig.mainResult.standardValue}
                            onChange={e => setTempConfig({...tempConfig, mainResult: {...tempConfig.mainResult, standardValue: e.target.value}})}
                            className="w-full bg-white border border-green-200 rounded-md px-3 py-2 text-green-800 font-bold"
                            placeholder="PASS"
                          />
                          <p className="text-[10px] text-slate-400 mt-2">
                            * Mặc định sẽ điền giá trị này. Nếu sai khác sẽ cảnh báo (tính năng hiển thị).
                          </p>
                        </div>
                      </div>
                   </div>

                   {/* Right: Extended Params Config */}
                   <div className="lg:w-2/3">
                     <h3 className="text-slate-600 font-bold mb-4 flex items-center gap-2">
                        <span className="bg-slate-200 px-2 py-0.5 rounded text-xs">2</span>
                        CẤU HÌNH 15 THÔNG SỐ MỞ RỘNG
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 overflow-y-auto max-h-[500px] pr-2">
                        {tempConfig.parameters.map((param, idx) => (
                           <div key={param.id} className="bg-white p-3 rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors shadow-sm">
                              <div className="flex items-center gap-2 mb-2">
                                 <span className="text-slate-300 text-xs font-bold bg-slate-50 w-5 h-5 flex items-center justify-center rounded-full">{idx + 1}</span>
                                 <label className="text-xs font-bold text-slate-500 uppercase">Tên thông số</label>
                              </div>
                              <input 
                                type="text" 
                                value={param.name}
                                onChange={e => handleTempParamChange(idx, 'name', e.target.value)}
                                className="w-full text-sm border-slate-200 rounded-md mb-2 px-2 py-1.5 focus:border-indigo-500"
                                placeholder="Tắt..."
                              />
                              <label className="text-[10px] font-bold text-green-600 uppercase mb-1 block">Mặc định</label>
                              <input 
                                type="text" 
                                value={param.defaultValue}
                                onChange={e => handleTempParamChange(idx, 'defaultValue', e.target.value)}
                                className="w-full text-sm bg-green-50/50 border-green-100 text-green-800 rounded-md px-2 py-1.5 focus:border-green-500 placeholder:text-green-200"
                                placeholder="Auto..."
                              />
                           </div>
                        ))}
                      </div>
                   </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3">
                <button 
                  onClick={() => setShowConfigModal(false)}
                  className="px-6 py-2 rounded-lg font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={() => {
                    setTestConfig(tempConfig);
                    setShowConfigModal(false);
                  }}
                  className="px-6 py-2 rounded-lg font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex items-center gap-2"
                >
                  <Save size={18} /> Lưu Cấu Hình
                </button>
              </div>
            </div>
         </div>
      )}

      {/* Header */}
      <header className="bg-slate-900 text-white p-4 shadow-lg flex flex-col md:flex-row items-center justify-between z-10 gap-4">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Barcode size={32} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Hệ Thống Quét Mã Pro</h1>
            <p className="text-xs text-slate-400 font-medium">Kho Vận & Hậu Cần Nhà Máy v1.1</p>
          </div>
        </div>

        {/* Model Name Input */}
        <div className={`flex items-center bg-slate-800 rounded-md px-3 py-1.5 border w-full md:w-auto transition-colors duration-300 ${
          showMissingModelWarning || (!modelName && scans.length === 0) ? 'border-red-500 animate-pulse bg-red-900/20' : 'border-slate-700'
        }`}>
           <Tag size={16} className={`${showMissingModelWarning ? 'text-red-400' : 'text-blue-400'} mr-2`} />
           <input 
              ref={modelInputRef}
              id="model-input"
              type="text" 
              className="bg-transparent text-white border-none focus:ring-0 text-sm font-bold w-full md:w-48 placeholder-slate-500 uppercase"
              placeholder="BẮT BUỘC NHẬP TÊN MODEL..."
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
           />
        </div>

        {/* Config Button */}
        <button 
          onClick={() => {
            setTempConfig(testConfig);
            setShowConfigModal(true);
          }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md border transition-all shadow-sm ${
            testConfig.enabled 
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-indigo-500/30' 
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <FlaskConical size={18} className={testConfig.enabled ? 'animate-pulse' : ''} />
          <span className="text-sm font-bold uppercase hidden md:inline">Cấu hình Test</span>
          {testConfig.enabled && <div className="w-2 h-2 bg-green-400 rounded-full animate-ping ml-1"></div>}
        </button>

        <div className="flex items-center space-x-4 w-full md:w-auto justify-end">
          <button onClick={exportCSV} className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-md transition-colors border border-slate-700">
            <Download size={18} />
            <span className="font-semibold hidden md:inline">Xuất Excel</span>
          </button>
          <button onClick={clearAll} className="flex items-center space-x-2 bg-red-900/40 hover:bg-red-800 text-red-200 px-4 py-2 rounded-md transition-colors border border-red-800/50">
            <Trash2 size={18} />
            <span className="font-semibold hidden md:inline">Làm Mới</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col md:flex-row p-4 gap-4">
        
        {/* Left Column: Input Panel */}
        <div className="w-full md:w-1/3 flex flex-col gap-4 h-full overflow-y-auto no-scrollbar pb-20">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-4">
            
            {/* Context Labels */}
            <div className="flex justify-between items-end">
              <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Sẵn Sàng Quét</label>
              <div className="text-right">
                {modelName ? <div className="text-blue-600 font-bold text-xs uppercase">Model: {modelName}</div> : <div className="text-red-500 font-bold text-xs animate-pulse">CHƯA NHẬP MODEL</div>}
                {testConfig.enabled && <div className="text-indigo-600 font-bold text-xs uppercase mt-1">{testConfig.stepName}</div>}
              </div>
            </div>

            {/* Main Scan Input */}
            <div className="relative">
              <input 
                ref={inputRef}
                type="text"
                autoFocus
                disabled={showMissingModelWarning || showMissingDataWarning}
                placeholder={modelName ? "Quét mã sản phẩm..." : "Vui lòng nhập tên Model trước"}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={onKeyDown}
                className={`w-full border-2 rounded-xl px-4 py-6 text-3xl font-bold focus:outline-none transition-all mono ${
                  !modelName 
                  ? 'bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed placeholder:text-slate-400' 
                  : 'bg-slate-100 border-slate-300 focus:border-blue-500 placeholder:text-slate-300'
                }`}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"><Maximize2 size={24} /></div>
            </div>

            {/* Error Code Input */}
            <div className={`flex items-center border-2 rounded-lg px-3 py-2 transition-colors ${errorCode ? 'bg-red-50 border-red-400' : 'bg-slate-50 border-slate-200'}`}>
              <AlertOctagon size={20} className={`mr-2 ${errorCode ? 'text-red-500' : 'text-slate-400'}`} />
              <input 
                id="error-input"
                type="text"
                placeholder="Quét mã lỗi (Nếu có)..."
                value={errorCode}
                onChange={(e) => setErrorCode(e.target.value)}
                className={`w-full bg-transparent border-none focus:ring-0 text-sm font-bold ${errorCode ? 'text-red-700' : 'text-slate-700'}`}
              />
              {errorCode && <button onClick={() => setErrorCode('')} className="text-red-400 hover:text-red-600"><X size={16} /></button>}
            </div>

            {/* Dynamic Test Inputs */}
            {testConfig.enabled && (
              <div className="mt-2 pt-4 border-t border-slate-100 animate-in slide-in-from-top-2">
                <div className="flex items-center text-indigo-700 mb-3 space-x-2 bg-indigo-50 px-2 py-1 rounded w-fit">
                   <LayoutGrid size={16} />
                   <span className="text-xs font-bold uppercase">Thông số mở rộng</span>
                </div>
                
                {/* Main Result Input */}
                <div className="mb-4">
                  <label className="text-[10px] font-bold text-indigo-500 uppercase mb-1 block ml-1">{testConfig.mainResult.name}</label>
                  <input 
                    id="main-result-input"
                    type="text"
                    value={testResultInput}
                    onChange={e => setTestResultInput(e.target.value)}
                    className={`w-full border rounded px-3 py-2 font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-400 outline-none ${!testResultInput.trim() && showMissingDataWarning ? 'border-red-400 bg-red-50' : 'border-indigo-200'}`}
                  />
                </div>

                {/* Extended Params Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {testConfig.parameters.map((param, idx) => {
                    if (!param.name) return null; // Skip empty params
                    const isEmpty = !testParamInputs[idx].trim();
                    return (
                      <div key={param.id}>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block ml-1 truncate" title={param.name}>
                          {param.name}
                        </label>
                        <input
                          id={`param-input-${idx}`}
                          type="text"
                          value={testParamInputs[idx]}
                          onChange={(e) => {
                            const newInputs = [...testParamInputs];
                            newInputs[idx] = e.target.value;
                            setTestParamInputs(newInputs);
                          }}
                          className={`w-full text-xs border rounded px-2 py-2 focus:ring-1 outline-none font-mono ${isEmpty && showMissingDataWarning ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-200' : 'bg-slate-50 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500'}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            <p className="text-xs text-slate-400 italic">* Quét mã sản phẩm để Lưu toàn bộ dữ liệu.</p>
          </div>

          {/* Last Scan Status Display */}
          <div className={`flex-1 flex flex-col items-center justify-center p-8 rounded-xl border-4 transition-all duration-300 shadow-inner min-h-[300px] ${
            lastScan?.status === ScanStatus.VALID ? 'bg-green-50 border-green-200' :
            lastScan?.status === ScanStatus.ERROR ? 'bg-red-50 border-red-200' :
            lastScan?.status === ScanStatus.DUPLICATE ? 'bg-orange-50 border-orange-200' : 
            'bg-white border-slate-100'
          }`}>
             {!lastScan ? (
               <div className="text-center opacity-50"><Barcode size={48} className="mx-auto mb-2"/>Chờ quét...</div>
             ) : (
               <div className="w-full">
                 <div className="text-center mb-6">
                    {lastScan.status === ScanStatus.VALID && (
                      <><CheckCircle2 className="mx-auto text-green-500 mb-2" size={60}/><h3 className="text-2xl font-black text-green-700">OK</h3></>
                    )}
                    {lastScan.status === ScanStatus.DUPLICATE && (
                      <><AlertTriangle className="mx-auto text-orange-500 mb-2" size={60}/><h3 className="text-2xl font-black text-orange-700">TRÙNG</h3></>
                    )}
                    {lastScan.status === ScanStatus.ERROR && (
                      <><XCircle className="mx-auto text-red-500 mb-2" size={60}/><h3 className="text-2xl font-black text-red-700">LỖI</h3></>
                    )}
                 </div>
                 <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm space-y-3">
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                       <span className="text-xs font-bold text-slate-400">MODEL</span>
                       <span className="text-sm font-bold text-blue-600">{lastScan.modelName}</span>
                    </div>
                    {testConfig.enabled && lastScan.testResult && (
                      <div className="flex justify-between border-b border-slate-50 pb-2">
                         <span className="text-xs font-bold text-slate-400 uppercase">{testConfig.mainResult.name}</span>
                         <span className={`text-sm font-bold ${lastScan.testResult === testConfig.mainResult.standardValue ? 'text-green-600' : 'text-red-500'}`}>
                           {lastScan.testResult}
                         </span>
                      </div>
                    )}
                    <div>
                       <span className="text-xs font-bold text-slate-400 block mb-1">MÃ SẢN PHẨM</span>
                       <span className="text-xl font-mono font-black text-slate-800 break-all">{lastScan.code}</span>
                    </div>
                    {lastScan.errorCode && (
                      <div className="mt-2 pt-2 border-t border-red-100 text-center">
                         <span className="inline-block bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-black animate-pulse">
                           {lastScan.errorCode}
                         </span>
                      </div>
                    )}
                 </div>
               </div>
             )}
          </div>
        </div>

        {/* Right Column: History */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
             <div className="flex items-center gap-2 font-bold text-slate-700"><History size={18}/> Lịch Sử</div>
             <div className="text-xs font-bold bg-slate-200 px-2 py-1 rounded">{scans.length}</div>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
               <thead className="sticky top-0 bg-white shadow-sm z-10">
                 <tr className="text-xs font-bold text-slate-500 uppercase">
                   <th className="px-4 py-3 border-b">STT</th>
                   <th className="px-4 py-3 border-b text-blue-600">Model</th>
                   {testConfig.enabled && <th className="px-4 py-3 border-b text-indigo-600 text-center">{testConfig.mainResult.name}</th>}
                   <th className="px-4 py-3 border-b">Mã SP</th>
                   {testConfig.enabled && testConfig.parameters.map((param) => (
                      param.name ? <th key={param.id} className="px-4 py-3 border-b text-slate-600 whitespace-nowrap">{param.name}</th> : null
                   ))}
                   <th className="px-4 py-3 border-b text-red-500">Lỗi</th>
                   <th className="px-4 py-3 border-b text-right">TT</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {scans.map(s => (
                   <tr key={s.id} className="hover:bg-slate-50">
                     <td className="px-4 py-3 text-slate-400 font-mono text-xs">#{s.index}</td>
                     <td className="px-4 py-3 text-xs font-bold text-blue-600">{s.modelName}</td>
                     {testConfig.enabled && (
                       <td className={`px-4 py-3 font-bold text-xs text-center ${s.testResult === testConfig.mainResult.standardValue ? 'text-green-600' : 'text-red-500'}`}>
                         {s.testResult || '-'}
                       </td>
                     )}
                     <td className="px-4 py-3 font-bold text-slate-700 font-mono">{s.code}</td>
                     {testConfig.enabled && testConfig.parameters.map((param, idx) => (
                        param.name ? (
                           <td key={param.id} className="px-4 py-3 text-xs text-slate-600 font-medium">
                              {s.testParams?.[idx] || '-'}
                           </td>
                        ) : null
                     ))}
                     <td className="px-4 py-3">
                        {s.errorCode ? (
                           <span className="bg-red-600 text-white px-2 py-1 rounded font-black text-xs animate-pulse shadow-sm whitespace-nowrap">
                              {s.errorCode}
                           </span>
                        ) : (
                           <span className="text-slate-300 font-bold text-xs">-</span>
                        )}
                     </td>
                     <td className="px-4 py-3 text-right">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                          s.status === ScanStatus.VALID ? 'bg-green-100 text-green-700' : 
                          s.status === ScanStatus.ERROR ? 'bg-red-100 text-red-700' : 
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {s.status === ScanStatus.VALID ? 'OK' : 
                           s.status === ScanStatus.ERROR ? 'LỖI' : 'TRÙNG'}
                        </span>
                     </td>
                   </tr>
                 ))}
               </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Warnings */}
      {showDuplicateWarning && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
          <div className="bg-red-600 text-white px-8 py-6 rounded-xl shadow-2xl flex flex-col items-center animate-bounce border-4 border-red-400">
            <AlertTriangle size={48} className="mb-2" />
            <h2 className="text-2xl font-black">ĐÃ TỒN TẠI!</h2>
          </div>
        </div>
      )}
      {showMissingModelWarning && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
          <div className="bg-slate-800 text-white px-8 py-6 rounded-xl shadow-2xl flex flex-col items-center border-4 border-red-500 animate-pulse">
            <FileWarning size={48} className="mb-2 text-red-500" />
            <h2 className="text-2xl font-black text-red-500">CHƯA NHẬP MODEL</h2>
          </div>
        </div>
      )}
      {/* Missing Test Data Warning */}
      {showMissingDataWarning && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
          <div className="bg-red-600 text-white px-12 py-10 rounded-3xl shadow-[0_20px_60px_rgba(220,38,38,0.6)] flex flex-col items-center border-8 border-red-400 animate-pulse transform scale-110">
            <div className="bg-white p-4 rounded-full mb-6 shadow-inner">
               <X size={64} className="text-red-600" strokeWidth={4} />
            </div>
            {/* BIG ERROR TEXT */}
            <h1 className="text-7xl font-black text-white uppercase tracking-widest mb-2 drop-shadow-xl">LỖI</h1>
            <h2 className="text-xl font-bold text-red-100 uppercase tracking-wider mb-2">DỮ LIỆU CHƯA ĐỦ!</h2>
            <p className="font-bold text-red-50 text-lg text-center leading-snug">
               Vui lòng điền hết các ô <br/>
               <span className="text-yellow-300 underline decoration-4 underline-offset-4">THÔNG SỐ TEST</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
