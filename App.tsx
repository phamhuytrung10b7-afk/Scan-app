import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ScanRecord, AppSettings, DEFAULT_SETTINGS, ScanStatus } from './types';
import { formatDateTime, exportToCSV } from 'helpers';
import { playSuccessSound, playErrorSound } from './utils/audio';
import ScanHistory from './components/ScanHistory';
import SettingsModal from './components/SettingsModal';
import { 
  ScanBarcode, 
  Download, 
  Settings as SettingsIcon, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

const App: React.FC = () => {
  // State
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [lastScanStatus, setLastScanStatus] = useState<'idle' | ScanStatus>('idle');
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string>('Ready to scan');

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const scanContainerRef = useRef<HTMLDivElement>(null);

  // Derived state
  const validCount = scans.filter(s => s.status === 'VALID').length;
  const lastScan = scans.length > 0 ? scans[scans.length - 1] : null;

  // Focus management: Always keep focus on input unless modal is open
  useEffect(() => {
    const focusInput = () => {
      if (!isSettingsOpen && inputRef.current) {
        inputRef.current.focus();
      }
    };

    // Initial focus
    focusInput();

    // Re-focus on click anywhere (unless interacting with buttons)
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't steal focus if clicking on buttons or modal
      if (
        !isSettingsOpen && 
        !target.closest('button') && 
        !target.closest('.no-autofocus')
      ) {
        focusInput();
      }
    };

    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [isSettingsOpen]);

  // Main Scan Logic
  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    const rawCode = inputValue.trim();

    if (!rawCode) return;

    const now = new Date();
    const newRecord: ScanRecord = {
      id: scans.length + 1,
      code: rawCode,
      expectedModel: settings.activeModel,
      timestamp: now.toISOString(),
      formattedTimestamp: formatDateTime(now),
      status: 'VALID', // Default, will change
    };

    // Validation 1: Model Match (Contains or Starts With)
    // We normalize to UpperCase for comparison to be robust
    const normalizedCode = rawCode.toUpperCase();
    const normalizedModel = settings.activeModel.toUpperCase();
    
    // Logic: The code must include the model identifier
    const isModelMatch = normalizedCode.includes(normalizedModel);

    // Validation 2: Duplicate Check
    const isDuplicate = scans.some(s => s.code === rawCode && s.status === 'VALID');

    let status: ScanStatus = 'VALID';
    let message = 'Scan Successful';

    if (!isModelMatch) {
      status = 'WRONG_MODEL';
      message = 'Wrong Model - Scan Rejected';
      playErrorSound();
    } else if (isDuplicate) {
      status = 'DUPLICATE';
      message = 'Duplicate Code - Already Scanned';
      playErrorSound();
    } else {
      status = 'VALID';
      message = 'OK';
      playSuccessSound();
    }

    newRecord.status = status;

    // Update State
    setScans(prev => [...prev, newRecord]);
    setLastScanStatus(status);
    setLastScannedCode(rawCode);
    setFeedbackMessage(message);
    setInputValue(''); // Auto clear

    // Re-focus immediately
    if (inputRef.current) inputRef.current.focus();
  };

  // Helper styles based on status
  const getStatusColor = () => {
    switch (lastScanStatus) {
      case 'VALID': return 'bg-green-600 border-green-700';
      case 'DUPLICATE': return 'bg-orange-500 border-orange-600';
      case 'WRONG_MODEL': return 'bg-red-600 border-red-700';
      default: return 'bg-slate-700 border-slate-800';
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-100 font-sans">
      
      {/* 1. Top Header */}
      <header className="bg-slate-900 text-white p-4 shadow-lg flex justify-between items-center z-20">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 p-2 rounded-lg">
            <ScanBarcode size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">FactoryScan Pro</h1>
            <div className="text-xs text-slate-400 flex gap-4">
              <span>OP: <span className="text-white">{settings.operatorName}</span></span>
              <span>Model: <span className="text-yellow-400 font-mono font-bold">{settings.activeModel}</span></span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 no-autofocus">
           <button 
            onClick={() => exportToCSV(scans, settings.activeModel)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors border border-slate-600 text-sm font-medium"
            title="Export CSV"
          >
            <Download size={16} /> Export
          </button>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-md transition-colors text-sm font-bold shadow-md"
          >
            <SettingsIcon size={16} /> Settings
          </button>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
        
        {/* Left Column: Input & Status (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4 overflow-hidden">
          
          {/* A. Status Board (Big Visual Feedback) */}
          <div 
            className={`
              flex-1 rounded-2xl shadow-xl border-b-8 flex flex-col items-center justify-center text-center p-6 transition-colors duration-200
              ${getStatusColor()}
            `}
          >
            <div className="text-white opacity-90 mb-2 font-semibold uppercase tracking-widest text-sm">
              Current Status
            </div>
            
            {lastScanStatus === 'idle' && (
              <div className="text-slate-300 flex flex-col items-center animate-pulse">
                <ScanBarcode size={64} className="mb-4 opacity-50" />
                <div className="text-3xl font-bold">Ready to Scan</div>
              </div>
            )}

            {lastScanStatus === 'VALID' && (
              <div className="text-white animate-in zoom-in duration-300">
                <CheckCircle2 size={96} className="mx-auto mb-4 text-green-200" />
                <div className="text-5xl font-black mb-2">OK</div>
                <div className="text-xl font-medium text-green-100">{lastScannedCode}</div>
              </div>
            )}

            {lastScanStatus === 'DUPLICATE' && (
              <div className="text-white animate-in shake duration-300">
                <AlertTriangle size={96} className="mx-auto mb-4 text-orange-200" />
                <div className="text-4xl font-black mb-2">DUPLICATE</div>
                <div className="text-lg font-medium text-orange-100">Code already scanned</div>
              </div>
            )}

            {lastScanStatus === 'WRONG_MODEL' && (
              <div className="text-white animate-in shake duration-300">
                <XCircle size={96} className="mx-auto mb-4 text-red-200" />
                <div className="text-4xl font-black mb-2">WRONG MODEL</div>
                <div className="text-lg font-medium text-red-100">Expected: {settings.activeModel}</div>
              </div>
            )}
          </div>

          {/* B. Input Field (Sticky/Always visible) */}
          <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
            <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wide">
              Scan Input
            </label>
            <form onSubmit={handleScan} className="relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={() => {
                  // Optional: Visual cue that focus is lost
                }}
                className="w-full h-16 pl-4 pr-4 text-3xl font-mono font-bold text-slate-900 border-4 border-slate-300 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all placeholder-slate-300"
                placeholder="Scan here..."
                autoComplete="off"
                autoFocus
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                <span className="text-xs font-semibold bg-slate-100 px-2 py-1 rounded border border-slate-200">ENTER</span>
              </div>
            </form>
            <div className="mt-2 text-center text-xs text-slate-400">
              Input field auto-clears after scan.
            </div>
          </div>

          {/* C. Quick Stats */}
          <div className="bg-slate-800 text-white p-6 rounded-xl shadow-md flex justify-between items-center">
            <div>
              <div className="text-slate-400 text-sm font-bold uppercase">Total Valid</div>
              <div className="text-4xl font-mono font-bold text-green-400">{validCount}</div>
            </div>
            <div className="text-right">
              <div className="text-slate-400 text-sm font-bold uppercase">Last Scan Time</div>
              <div className="text-xl font-mono text-white">
                 {lastScan ? lastScan.formattedTimestamp.split(' ')[1] : '--:--:--'}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: History Table (7 cols) */}
        <div className="lg:col-span-7 h-full overflow-hidden">
          <ScanHistory history={scans} />
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentSettings={settings}
        onSave={setSettings}
        onResetCounts={() => {
          setScans([]);
          setLastScanStatus('idle');
          setLastScannedCode('');
        }}
      />
      
      {/* Global Styles for Animations */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-in.shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default App;
