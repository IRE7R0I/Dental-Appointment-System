import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Overlay Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(t => {
          const styles = {
            success: 'bg-[#EAF3DE] border-[#3B6D11] text-[#3B6D11]',
            error: 'bg-[#FCEBEB] border-[#A32D2D] text-[#A32D2D]',
            warning: 'bg-[#FAEEDA] border-[#854F0B] text-[#854F0B]',
            info: 'bg-[#F1EFE8] border-[#5F5E5A] text-[#5F5E5A]'
          }[t.type];

          const Icon = {
            success: CheckCircle2,
            error: AlertCircle,
            warning: AlertCircle,
            info: Info
          }[t.type];

          return (
            <div
              key={t.id}
              className={`p-4 rounded-xl border flex items-start gap-3 shadow-md bg-white pointer-events-auto transition-all duration-300 transform translate-y-0 animate-slide-in-right ${styles}`}
            >
              <Icon size={18} className="shrink-0 mt-0.5" />
              <div className="flex-1 text-xs font-medium sentence-case">{t.message}</div>
              <button 
                onClick={() => removeToast(t.id)}
                className="shrink-0 text-neutral-warm-600 hover:text-neutral-warm-900 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}
