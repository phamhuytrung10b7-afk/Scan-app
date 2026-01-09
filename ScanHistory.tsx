import React from 'react';
import { ScanRecord } from '../types';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface ScanHistoryProps {
  history: ScanRecord[];
}

const ScanHistory: React.FC<ScanHistoryProps> = ({ history }) => {
  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
      <div className="bg-slate-100 p-3 border-b border-slate-300 font-bold text-slate-700 flex justify-between items-center">
        <span>Scan History</span>
        <span className="text-sm font-normal text-slate-500">Total Records: {history.length}</span>
      </div>
      
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="p-3 border-b border-slate-200 font-semibold text-slate-600 w-20">#</th>
              <th className="p-3 border-b border-slate-200 font-semibold text-slate-600">Scanned Code</th>
              <th className="p-3 border-b border-slate-200 font-semibold text-slate-600">Time</th>
              <th className="p-3 border-b border-slate-200 font-semibold text-slate-600 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="text-slate-800">
            {history.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-400 italic">
                  No scans recorded yet.
                </td>
              </tr>
            ) : (
              history.slice().reverse().map((record) => (
                <tr key={record.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-mono text-slate-500">{record.id}</td>
                  <td className="p-3 font-mono font-medium">{record.code}</td>
                  <td className="p-3 text-sm text-slate-600">{record.formattedTimestamp}</td>
                  <td className="p-3 text-right">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                      ${record.status === 'VALID' ? 'bg-green-100 text-green-800' : ''}
                      ${record.status === 'DUPLICATE' ? 'bg-orange-100 text-orange-800' : ''}
                      ${record.status === 'WRONG_MODEL' ? 'bg-red-100 text-red-800' : ''}
                    `}>
                      {record.status === 'VALID' && <CheckCircle size={14} />}
                      {record.status === 'DUPLICATE' && <AlertTriangle size={14} />}
                      {record.status === 'WRONG_MODEL' && <XCircle size={14} />}
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
  );
};

export default ScanHistory;