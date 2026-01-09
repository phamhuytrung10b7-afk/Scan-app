
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
  const bufferCleanup = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ensureFocus = useCallback(() => {
    if (!isConfigOpen && inputRef.current) {
      inputRef.current.focus();
      setIsFocused(true);
    }
  }, [isConfigOpen]);

  // Global click to refocus
  useEffect(() => {
    const handleWindowClick = () => ensureFocus();
    window.addEventListener('click', handleWindowClick);
    ensureFocus();
    return () => {
      window.removeEventListener('click', handleWindowClick);
      if (bufferCleanup.current) clearTimeout(bufferCleanup.current);
    };
  }, [ensureFocus]);

  // Handle scanner input buffer cleanup
  useEffect(() => {
    if (inputValue.length > 0) {
      if (bufferCleanup.current) clearTimeout(bufferCleanup.current);
      bufferCleanup.current = setTimeout(() => {
        setInputValue('');
        bufferCleanup.current = null;
      }, 2000);
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
          // Small delay to allow focus to actually shift if needed (e.g., to an input in the modal)
          setTimeout(ensureFocus, 100);
        }}
        autoFocus
      />

      <Dashboard 
        settings={settings} 
        validCount={validCount} 
        isFocused={isFocused && !isConfigOpen} 
        onOpenConfig={() => setIsConfigOpen(true)}
      />

      {/* Live Buffer Preview */}
      <div className={`transition-all duration-200 overflow-hidden ${inputValue.length > 0 ? 'h-24 mb-6 opacity-100' : 'h-0 opacity-0'}`}>
        <div className="bg-yellow-50 border-2 border-yellow-200 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4 text-yellow-800 font-black uppercase text-sm tracking-widest">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-ping" />
            Scanner Input Detected
          </div>
          <span className="text-3xl font-mono font-black text-yellow-900 tracking-tighter">{inputValue}</span>
        </div>
      </div>

      {/* Status Feedback Notification */}
      <div className={`transition-all duration-300 transform ${feedback.type ? 'scale-100 opacity-100 translate-y-0 mb-6' : 'scale-95 opacity-0 -translate-y-4 h-0 overflow-hidden'}`}>
        <div className={`p-6 rounded-xl flex items-center gap-4 border-4 shadow-xl ${
          feedback.type === 'success' ? 'bg-green-600 border-green-700 text-white' : 'bg-red-600 border-red-700 text-white'
        }`}>
          {feedback.type === 'success' ? <ShieldCheck className="w-10 h-10" /> : <TriangleAlert className="w-10 h-10" />}
          <span className="text-3xl font-black uppercase tracking-tight">{feedback.message}</span>
        </div>
      </div>

      {/* Master Controls */}
      <div className="flex flex-wrap gap-4 mb-6">
        <button 
          onClick={() => exportToCSV(history)}
          className="bg-gray-900 hover:bg-black text-white font-black py-4 px-8 rounded-xl shadow-lg transition-all flex items-center gap-3 active:scale-95"
        >
          <FileDown className="w-6 h-6" /> Export CSV Report
        </button>
        <button 
          onClick={() => { if(confirm('Are you sure? This will clear all records and reset the counter.')) resetBatch(); }}
          className="bg-white border-2 border-red-100 text-red-600 hover:bg-red-50 font-black py-4 px-8 rounded-xl transition-all active:scale-95 flex items-center gap-3"
        >
          <RotateCcw className="w-6 h-6" /> Reset Current Batch
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
