interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  icon?: string;
  iconColor?: string;
  iconBg?: string;
  confirmBtnClass?: string;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText = 'No',
  icon = 'delete',
  iconColor = 'text-red-500',
  iconBg = 'bg-red-50',
  confirmBtnClass = 'bg-red-500 hover:bg-red-600 text-white',
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[24px] p-6 w-full max-w-xs shadow-xl border border-slate-100 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`w-12 h-12 ${iconBg} rounded-2xl flex items-center justify-center mx-auto mb-3`}>
          <span className={`material-symbols-rounded text-2xl ${iconColor}`}>{icon}</span>
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-1">{title}</h2>
        <p className="text-sm text-slate-500 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 font-medium py-2.5 rounded-xl transition-all cursor-pointer ${confirmBtnClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
