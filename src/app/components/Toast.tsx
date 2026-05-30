'use client';

import { CheckCircle, X } from 'lucide-react';
import { useEffect } from 'react';
import Animated from './Animated';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
}

export default function Toast({ message, isVisible, onClose }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <Animated className="fixed bottom-6 right-6 z-50">
      <div className="bg-white border-2 border-emerald-500 rounded-xl shadow-2xl shadow-emerald-500/20 p-4 flex items-center gap-3 min-w-[320px] animate-in slide-in-from-bottom-4 fade-in duration-300">
        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
          <CheckCircle className="w-6 h-6 text-emerald-600" />
        </div>
        <div className="flex-1">
          <p className="text-slate-900 font-semibold">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 hover:bg-slate-100 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    </Animated>
  );
}
