import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  maxWidthClass?: string; // e.g. "max-w-md", "max-w-lg", "max-w-sm"
  zIndex?: string; // e.g. "z-50", "z-[60]"
  children: ReactNode;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  maxWidthClass = 'max-w-md',
  zIndex = 'z-50',
  children,
}: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className={`fixed inset-0 ${zIndex} flex items-center justify-center p-4 overflow-y-auto`}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/45 backdrop-blur-[3px] pointer-events-none"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', duration: 0.35 }}
            className={`bg-white rounded-3xl shadow-xl w-full p-8 relative z-10 max-h-[90vh] overflow-y-auto ${maxWidthClass}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              {title && <h2 className="text-xl font-bold text-slate-900">{title}</h2>}
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
