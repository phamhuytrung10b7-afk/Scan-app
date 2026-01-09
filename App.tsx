
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppSettings } from './types';
import { exportToCSV } from './utils/helpers';
import { useScanner } from './hooks/useScanner';
import { Dashboard } from './components/Dashboard';
import { ScanLog } from './components/ScanLog';
import { ConfigModal } from './components/ConfigModal';
import { FileDown, RotateCcw, ShieldCheck, TriangleAlert } from 'lucide-react';

const App: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>({
    activeModel: 'MOD-2024-X',
    operatorName: 'OPERATOR-01',
    shift: 'DAY'
  });
  
  const [inputValue, setInputValue] = useState('');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(true);

  const { history, feedback, processScan, resetBatch, validCount } = useScanner(settings);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const bufferCleanup = useRef<number | null>(null);

  const ensureFocus = useCallback(() => {
    if (!isConfigOpen) {
      inputRef.current?.focus();
      setIsFocused(true);
    }
  }, [isConfigOpen]);

  useEffect(() => {
    window.addEventListener('click', ensureFocus);
    ensureFocus();
    return () => window.removeEventListener('click', ensureFocus);
  }, [ensureFocus]);

  useEffect(() => {
    if (inputValue.length > 0) {
      if (bufferCleanup.current) window.clearTimeout(bufferCleanup.current);
      bufferCleanup.current = window.setTimeout(() => setInputValue(''), 2000);
    }
  }, [inputValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      processScan(inputValue);
      setInputValue('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 max-w-7xl mx-auto select-none font-sans">
      <input
        ref={inputRef}
        type="text"
        className="opacity-0 absolute pointer-events-none"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          setIsFocused(false);
          setTimeout(ensureFocus, 50);
        }}
        autoFocus
      />

      <Dashboard 
        settings={settings} 
        validCount={validCount} 
        isFocused={isFocused && !isConfigOpen} 
        onOpenConfig={() => setIsConfigOpen(true)}
      />

      {/* Live Buffer */}
      {inputValue.length > 0 && (
        <div className="mb-6 bg-yellow-50 border-2 border-yellow-200 p-4 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-4 text-yellow-800 font-black uppercase text-sm tracking-widest">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-ping" />
            Receiving Data...
          </div>
          <span className="text-3xl font-mono font-black text-yellow-900">{inputValue}</span>
        </div>
      )}

      {/* Feedback Notification */}
      {feedback.type && (
        <div className={`mb-6 p-6 rounded-xl flex items-center gap-4 border-4 shadow-xl transition-all animate-in zoom-in duration-200 ${
          feedback.type === 'success' ? 'bg-green-600 border-green-700 text-white' : 'bg-red-600 border-red-700 text-white'
        }`}>
          {feedback.type === 'success' ? <ShieldCheck className="w-10 h-10" /> : <TriangleAlert className="w-10 h-10" />}
          <span className="text-3xl font-black uppercase tracking-tight">{feedback.message}</span>
        </div>
      )}

      {/* Action Controls */}
      <div className="flex flex-wrap gap-4 mb-6">
        <button 
          onClick={() => exportToCSV(history)}
          className="bg-gray-900 hover:bg-black text-white font-black py-4 px-8 rounded-xl shadow-lg transition-all flex items-center gap-3 active:scale-95"
        >
          <FileDown className="w-6 h-6" /> Export Report
        </button>
        <button 
          onClick={() => { if(confirm('Reset current batch?')) resetBatch(); }}
          className="bg-white border-2 border-red-100 text-red-600 hover:bg-red-50 font-black py-4 px-8 rounded-xl transition-all active:scale-95 flex items-center gap-3"
        >
          <RotateCcw className="w-6 h-6" /> Reset Batch
        </button>
      </div>

      <ScanLog history={history} />

      {isConfigOpen && (
        <ConfigModal 
          settings={settings} 
          setSettings={setSettings} 
          onClose={() => setIsConfigOpen(false)} 
        />
      )}
    </div>
  );
};

export default App;
