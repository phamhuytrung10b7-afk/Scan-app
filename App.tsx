
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ScanRecord, ScanStatus, AppSettings } from './types';
import { getCurrentTimestamp, exportToCSV } from './utils/helpers';
import { soundService } from './services/soundService';

const App: React.FC = () => {
  // State
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [scannedSet, setScannedSet] = useState<Set<string>>(new Set());
  const [inputValue, setInputValue] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });
  const [settings, setSettings] = useState<AppSettings>({
    activeModel: 'MOD-2024-X',
    operatorName: 'OPERATOR-01',
    shift: 'DAY'
  });
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(true);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const feedbackTimeout = useRef<number | null>(null);
  const bufferCleanupTimeout = useRef<number | null>(null);

  // Focus management: Ensure input is always ready for scanner
  const ensureFocus = useCallback(() => {
    if (!isConfigOpen) {
      inputRef.current?.focus();
      setIsFocused(true);
    }
  }, [isConfigOpen]);

  useEffect(() => {
    const handleGlobalClick = () => ensureFocus();
    window.addEventListener('click', handleGlobalClick);
    ensureFocus();
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [ensureFocus]);

  // Buffer cleanup: Clear half-scanned data if idle for 2 seconds
  useEffect(() => {
    if (inputValue.length > 0) {
      if (bufferCleanupTimeout.current) window.clearTimeout(bufferCleanupTimeout.current);
      bufferCleanupTimeout.current = window.setTimeout(() => {
        setInputValue('');
      }, 2000);
    }
  }, [inputValue]);

  const showFeedback = (message: string, type: 'success' | 'error') => {
    if (feedbackTimeout.current !== null) {
      window.clearTimeout(feedbackTimeout.current);
    }
    setFeedback({ message, type });
    feedbackTimeout.current = window.setTimeout(() => {
      setFeedback({ message: '', type: null });
      feedbackTimeout.current = null;
    }, 3000);
  };

  const processScan = useCallback((code: string) => {
    const trimmedCode = code.trim();
    if (!trimmedCode) return;

    const timestamp = getCurrentTimestamp();
    const id = crypto.randomUUID();
    let status = ScanStatus.VALID;
    let errorMessage = '';

    // 1. Model Validation
    const isValidModel = trimmedCode.toUpperCase().includes(settings.activeModel.toUpperCase());

    if (!isValidModel) {
      status = ScanStatus.WRONG_MODEL;
      errorMessage = 'Wrong model – scan rejected';
    } else if (scannedSet.has(trimmedCode)) {
      // 2. Duplicate Check
      status = ScanStatus.DUPLICATE;
      errorMessage = 'Duplicate code – already scanned';
    }

    if (status === ScanStatus.VALID) {
      setScannedSet(prev => new Set(prev).add(trimmedCode));
      soundService.playSuccess();
      showFeedback(`Valid Scan: ${trimmedCode}`, 'success');
    } else {
      soundService.playError();
      showFeedback(errorMessage, 'error');
    }

    const newRecord: ScanRecord = {
      id,
      code: trimmedCode,
      model: settings.activeModel,
      timestamp,
      status,
      errorMessage
    };

    setHistory(prev => [newRecord, ...prev]);
    setInputValue('');
  }, [settings, scannedSet]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      processScan(inputValue);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all scan data?')) {
      setHistory([]);
      setScannedSet(new Set());
      showFeedback('System reset successful', 'success');
    }
  };

  const validCount = history.filter(r => r.status === ScanStatus.VALID).length;

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 max-w-7xl mx-auto select-none">
      {/* Hidden input for scanner keyboard emulation */}
      <input
        ref={inputRef}
        type="text"
        className="scanner-input-hidden"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          setIsFocused(false);
          // Auto-refocus logic for industrial continuity
          setTimeout(ensureFocus, 50);
        }}
        autoFocus
      />

      {/* Header Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Scanner Status Indicator */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-8 border-indigo-500 flex flex-col justify-center">
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full ${isFocused && !isConfigOpen ? 'bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></div>
            <span className="text-sm font-bold uppercase tracking-widest text-gray-500">
              {isFocused && !isConfigOpen ? 'System Ready' : 'Input Blocked'}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Scanner focus active</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-8 border-blue-500">
          <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">Target Model</p>
          <h2 className="text-3xl font-black text-blue-900 truncate">{settings.activeModel}</h2>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-8 border-green-500">
          <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">Valid Count</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-5xl font-black text-green-700">{validCount}</h2>
            <span className="text-gray-400 font-medium text-lg uppercase">OK</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-8 border-gray-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">Station</p>
              <h2 className="text-xl font-bold text-gray-800">{settings.operatorName}</h2>
              <p className="text-xs text-gray-400 mt-1">Shift: {settings.shift}</p>
            </div>
            <button 
              onClick={() => setIsConfigOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-100"
              title="Settings"
            >
              <SettingsIcon />
            </button>
          </div>
        </div>
      </div>

      {/* Live Buffer Preview - Shows what the scanner is sending in real-time */}
      {inputValue.length > 0 && (
        <div className="mb-6 bg-yellow-50 border-2 border-yellow-200 p-4 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-ping"></div>
            <span className="text-yellow-800 font-bold uppercase text-sm tracking-widest">Receiving Input...</span>
          </div>
          <span className="text-3xl font-mono font-black text-yellow-900 tracking-tighter">{inputValue}</span>
        </div>
      )}

      {/* Feedback Banner */}
      <div className={`mb-6 transition-all duration-300 transform ${feedback.type ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none absolute'}`}>
        <div className={`p-6 rounded-xl flex items-center justify-between border-4 shadow-xl ${
          feedback.type === 'success' ? 'bg-green-500 border-green-600 text-white' : 'bg-red-600 border-red-700 text-white'
        }`}>
          <div className="flex items-center gap-4">
            {feedback.type === 'success' ? <CheckIcon /> : <AlertIcon />}
            <span className="text-3xl font-black uppercase tracking-tight">{feedback.message}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 mb-6">
        <button 
          onClick={() => exportToCSV(history)}
          className="bg-gray-800 hover:bg-black text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all flex items-center gap-3 active:scale-95"
        >
          <DownloadIcon /> Export CSV Report
        </button>
        <button 
          onClick={handleReset}
          className="bg-white border-2 border-red-100 text-red-600 hover:bg-red-50 font-bold py-4 px-8 rounded-xl transition-all active:scale-95"
        >
          Reset Batch
        </button>
      </div>

      {/* History Table */}
      <div className="flex-grow bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col border border-gray-200">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-black text-gray-700 uppercase tracking-widest">Live Scan Log</h3>
          <div className="flex items-center gap-4">
             <span className="text-xs font-bold text-gray-400">Total Records: {history.length}</span>
          </div>
        </div>
        <div className="overflow-auto flex-grow">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase border-b">No.</th>
                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase border-b">Scanned Barcode</th>
                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase border-b">Model Target</th>
                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase border-b">Timestamp</th>
                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase border-b text-center">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center opacity-20">
                      <BarcodePlaceholderIcon />
                      <p className="mt-4 text-2xl font-black uppercase tracking-tighter">Waiting for scan input</p>
                    </div>
                  </td>
                </tr>
              ) : (
                history.map((record, index) => (
                  <tr key={record.id} className={`${record.status === ScanStatus.VALID ? 'hover:bg-green-50' : 'bg-red-50 hover:bg-red-100'} transition-colors`}>
                    <td className="px-6 py-4 text-sm font-bold text-gray-400">{history.length - index}</td>
                    <td className="px-6 py-4">
                      <div className="text-xl font-mono font-black text-gray-800">{record.code}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-600">{record.model}</td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-500">{record.timestamp}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-4 py-2 rounded-lg text-sm font-black uppercase tracking-tight shadow-sm ${
                        record.status === ScanStatus.VALID ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                      }`}>
                        {record.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Configuration Modal */}
      {isConfigOpen && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-10 transform animate-in zoom-in-95 duration-200">
            <h2 className="text-3xl font-black mb-2 text-gray-900">System Setup</h2>
            <p className="text-gray-500 mb-8 font-medium">Configure production targets and station identity.</p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Active Production Model</label>
                <input 
                  type="text" 
                  className="w-full border-4 border-gray-100 rounded-2xl p-4 font-black text-2xl text-blue-900 focus:border-blue-500 focus:outline-none transition-all"
                  value={settings.activeModel}
                  onChange={(e) => setSettings({...settings, activeModel: e.target.value.toUpperCase()})}
                  placeholder="e.g. MOD-2024-X"
                />
                <p className="text-xs text-blue-500 mt-2 font-bold italic">Scans must match this model string to be accepted.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Operator</label>
                  <input 
                    type="text" 
                    className="w-full border-4 border-gray-100 rounded-2xl p-4 font-bold focus:border-blue-500 focus:outline-none transition-all"
                    value={settings.operatorName}
                    onChange={(e) => setSettings({...settings, operatorName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Shift</label>
                  <select 
                    className="w-full border-4 border-gray-100 rounded-2xl p-4 font-bold focus:border-blue-500 focus:outline-none bg-white appearance-none transition-all"
                    value={settings.shift}
                    onChange={(e) => setSettings({...settings, shift: e.target.value})}
                  >
                    <option value="DAY">DAY SHIFT</option>
                    <option value="NIGHT">NIGHT SHIFT</option>
                    <option value="SWING">SWING SHIFT</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-10 flex gap-4">
              <button 
                onClick={() => setIsConfigOpen(false)}
                className="flex-grow bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl shadow-xl transition-all active:scale-95 text-lg"
              >
                APPLY & LOCK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- SVG Icons ---

const CheckIcon = () => (
  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const BarcodePlaceholderIcon = () => (
  <svg className="w-32 h-32 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
    <path d="M2 4h2v16H2V4zm4 0h1v16H6V4zm2 0h2v16H8V4zm3 0h3v16h-3V4zm5 0h1v16h-1V4zm2 0h3v16h-3V4z" />
  </svg>
);

export default App;
