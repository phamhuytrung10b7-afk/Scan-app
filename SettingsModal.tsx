import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { Settings, X, Save } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onResetCounts: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  currentSettings, 
  onSave, 
  onResetCounts 
}) => {
  const [formData, setFormData] = useState<AppSettings>(currentSettings);

  // Sync state when opening
  useEffect(() => {
    if (isOpen) {
      setFormData(currentSettings);
    }
  }, [isOpen, currentSettings]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="bg-slate-800 p-4 flex justify-between items-center text-white">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings size={24} /> Configuration
          </h2>
          <button onClick={onClose} className="hover:bg-slate-700 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Active Model */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Active Production Model
            </label>
            <div className="text-xs text-slate-500 mb-2">
              Codes must start with or contain this string to be valid.
            </div>
            <input 
              type="text" 
              value={formData.activeModel}
              onChange={(e) => setFormData(prev => ({ ...prev, activeModel: e.target.value.toUpperCase() }))}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-lg uppercase"
              placeholder="e.g. MODEL-A"
            />
          </div>

          {/* Operator */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Operator ID / Name
            </label>
            <input 
              type="text" 
              value={formData.operatorName}
              onChange={(e) => setFormData(prev => ({ ...prev, operatorName: e.target.value }))}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <hr className="border-slate-200" />

          {/* Reset Zone */}
          <div className="bg-red-50 p-4 rounded-lg border border-red-100">
            <h3 className="text-red-800 font-bold text-sm mb-2">Danger Zone</h3>
            <p className="text-red-600 text-xs mb-3">
              Resetting will clear all scan history and counters. This cannot be undone.
            </p>
            <button 
              onClick={() => {
                if (window.confirm('Are you sure you want to delete all scan records?')) {
                  onResetCounts();
                  onClose();
                }
              }}
              className="px-4 py-2 bg-white border border-red-300 text-red-700 font-semibold rounded hover:bg-red-100 text-sm transition-colors"
            >
              Reset All Data
            </button>
          </div>

        </div>

        <div className="bg-slate-100 p-4 flex justify-end gap-3 border-t border-slate-200">
          <button 
            onClick={onClose}
            className="px-5 py-2 text-slate-600 font-semibold hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              onSave(formData);
              onClose();
            }}
            className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md flex items-center gap-2 transition-colors"
          >
            <Save size={18} /> Save Changes
          </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsModal;