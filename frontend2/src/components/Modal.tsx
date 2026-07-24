import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  hideHeader?: boolean;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  bodyClassName?: string;
}

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  hideHeader = false, 
  children, 
  size = 'md',
  className = '',
  bodyClassName = 'p-4 sm:p-6 overflow-y-auto bg-white flex-1'
}: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in">
      <div 
        className="fixed inset-0" 
        onClick={onClose}
      />
      
      <div className={`relative w-full ${sizeClasses[size]} bg-white border border-neutral-warm-100 rounded-xl shadow-lg flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden transition-transform animate-scale-up ${className}`}>
        {/* Modal Header */}
        {!hideHeader && title && (
          <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-neutral-warm-50 flex items-center justify-between bg-white">
            <h3 className="text-sm sm:text-base font-semibold text-neutral-warm-900 sentence-case leading-none">
              {title}
            </h3>
            <button 
              type="button"
              onClick={onClose}
              className="text-neutral-warm-600 hover:text-neutral-warm-900 transition-colors p-1 rounded-full hover:bg-neutral-warm-50 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className={bodyClassName}>
          {children}
        </div>
      </div>
    </div>
  );
}
