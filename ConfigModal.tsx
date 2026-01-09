
import React from 'react';
import { AppSettings } from '../types';

interface ConfigModalProps {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  onClose: () => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ settings, setSettings, onClose }) => {
  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-10">
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
            <p className="text-xs text-blue-500 mt-2 font-bold italic">Validation: Scan must contain this string.</p>
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
                className="w-full border-4 border-gray-100 rounded-2xl p-4 font-bold focus:border-blue-500 focus:outline-none bg-white appearance-none"
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

        <button 
          onClick={onClose}
          className="mt-10 w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl shadow-xl transition-all active:scale-95 text-lg uppercase tracking-wider"
        >
          Confirm & Lock
        </button>
      </div>
    </div>
  );
};
