
import React from 'react';
import { ScanRecord, ScanStatus } from '../types';
import { Barcode } from 'lucide-react';

interface ScanLogProps {
  history: ScanRecord[];
}

export const ScanLog: React.FC<ScanLogProps> = ({ history }) => {
  return (
    <div className="flex-grow bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col border border-gray-200">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-black text-gray-700 uppercase tracking-widest">Production Log</h3>
        <span className="text-xs font-bold text-gray-400 uppercase">Records: {history.length}</span>
      </div>
      <div className="overflow-auto flex-grow">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase border-b">No.</th>
              <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase border-b">Barcode</th>
              <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase border-b">Model</th>
              <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase border-b">Timestamp</th>
              <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase border-b text-center">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {history.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-24 text-center">
                  <div className="flex flex-col items-center opacity-10">
                    <Barcode className="w-32 h-32" />
                    <p className="mt-4 text-2xl font-black uppercase tracking-tighter">Ready for Scanner</p>
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
  );
};
