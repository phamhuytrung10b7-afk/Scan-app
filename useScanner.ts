
import { useState, useCallback, useRef } from 'react';
import { ScanRecord, ScanStatus, AppSettings } from '../types';
import { getCurrentTimestamp } from '../utils/helpers';
import { soundService } from '../services/soundService';

export const useScanner = (settings: AppSettings) => {
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [scannedSet, setScannedSet] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });
  const feedbackTimeout = useRef<number | null>(null);

  const showFeedback = (message: string, type: 'success' | 'error') => {
    if (feedbackTimeout.current) window.clearTimeout(feedbackTimeout.current);
    setFeedback({ message, type });
    feedbackTimeout.current = window.setTimeout(() => {
      setFeedback({ message: '', type: null });
    }, 3000);
  };

  const processScan = useCallback((code: string) => {
    const trimmedCode = code.trim();
    if (!trimmedCode) return;

    const timestamp = getCurrentTimestamp();
    const id = crypto.randomUUID();
    let status = ScanStatus.VALID;
    let errorMessage = '';

    // Model Validation
    const isValidModel = trimmedCode.toUpperCase().includes(settings.activeModel.toUpperCase());

    if (!isValidModel) {
      status = ScanStatus.WRONG_MODEL;
      errorMessage = 'Wrong model – scan rejected';
    } else if (scannedSet.has(trimmedCode)) {
      // Duplicate Check
      status = ScanStatus.DUPLICATE;
      errorMessage = 'Duplicate code – already scanned';
    }

    if (status === ScanStatus.VALID) {
      setScannedSet(prev => new Set(prev).add(trimmedCode));
      soundService.playSuccess();
      showFeedback(`OK: ${trimmedCode}`, 'success');
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
  }, [settings, scannedSet]);

  const resetBatch = () => {
    setHistory([]);
    setScannedSet(new Set());
    showFeedback('Batch reset successful', 'success');
  };

  return {
    history,
    feedback,
    processScan,
    resetBatch,
    validCount: history.filter(r => r.status === ScanStatus.VALID).length
  };
};
