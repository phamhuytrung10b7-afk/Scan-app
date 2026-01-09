
import React from 'react';
import { AppSettings } from '../types';
import { Settings } from 'lucide-react';

interface DashboardProps {
  settings: AppSettings;
  validCount: number;
  isFocused: boolean;
  onOpenConfig: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ settings, validCount, isFocused, onOpenConfig }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {/* Scanner Status */}
      <div className="bg-white rounded-xl shadow-sm p-6 border-l-8 border-indigo-500 flex flex-col justify-center">
        <div className="flex items-center gap-3">
          <div className={`w-4 h-4 rounded-full ${isFocused ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className="text-sm font-black uppercase tracking-widest text-gray-500">
            {isFocused ? 'System Ready' : 'Input Blocked'}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">Scanner focus active</p>
      </div>

      {/* Target Model */}
      <div className="bg-white rounded-xl shadow-sm p-6 border-l-8 border-blue-500">
        <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">Target Model</p>
        <h2 className="text-3xl font-black text-blue-900 truncate">{settings.activeModel}</h2>
      </div>
      
      {/* Counter */}
      <div className="bg-white rounded-xl shadow-sm p-6 border-l-8 border-green-500">
        <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">Pass Count</p>
        <div className="flex items-baseline gap-2">
          <h2 className="text-5xl font-black text-green-700">{validCount}</h2>
          <span className="text-gray-400 font-medium text-lg uppercase font-black">OK</span>
        </div>
      </div>

      {/* Station Info */}
      <div className="bg-white rounded-xl shadow-sm p-6 border-l-8 border-gray-500">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">Station</p>
            <h2 className="text-xl font-bold text-gray-800">{settings.operatorName}</h2>
            <p className="text-xs text-gray-400 mt-1 font-bold">Shift: {settings.shift}</p>
          </div>
          <button 
            onClick={onOpenConfig}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-100"
          >
            <Settings className="w-6 h-6 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
