import React from 'react';
import { AlertTriangle, CheckCircle2, Info, X, ShieldAlert } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'primary' | 'success';

export interface ConfirmDetail {
  label: string;
  value: React.ReactNode;
}

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  message: React.ReactNode;
  variant?: ConfirmVariant;
  confirmText?: string;
  cancelText?: string;
  details?: ConfirmDetail[];
  requireCheckbox?: boolean;
  checkboxLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  subtitle,
  message,
  variant = 'primary',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  details,
  requireCheckbox = false,
  checkboxLabel = 'He verificado la información y confirmo que los datos son válidos ante SUNAT.',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  const [isChecked, setIsChecked] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setIsChecked(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleConfirmClick = () => {
    if (isSubmitting || loading) return;
    setIsSubmitting(true);
    try {
      onConfirm();
    } catch (e) {
      setIsSubmitting(false);
      throw e;
    }
  };

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-red-600" />,
          iconBg: 'bg-red-100 ring-4 ring-red-50',
          badgeBg: 'bg-red-50 text-red-700 border-red-200',
          confirmBtn: 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20',
          headerBorder: 'border-red-100',
        };
      case 'warning':
        return {
          icon: <ShieldAlert className="w-6 h-6 text-amber-600" />,
          iconBg: 'bg-amber-100 ring-4 ring-amber-50',
          badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
          confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/20',
          headerBorder: 'border-amber-100',
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="w-6 h-6 text-emerald-600" />,
          iconBg: 'bg-emerald-100 ring-4 ring-emerald-50',
          badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20',
          headerBorder: 'border-emerald-100',
        };
      default:
        return {
          icon: <Info className="w-6 h-6 text-indigo-600" />,
          iconBg: 'bg-indigo-100 ring-4 ring-indigo-50',
          badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          confirmBtn: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20',
          headerBorder: 'border-indigo-100',
        };
    }
  };

  const styles = getVariantStyles();
  const canConfirm = !requireCheckbox || isChecked;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden transform transition-all scale-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className={`p-5 flex items-start gap-4 border-b ${styles.headerBorder} bg-slate-50/50`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${styles.iconBg}`}>
            {styles.icon}
          </div>
          <div className="flex-1 min-w-0">
            {subtitle && (
              <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border mb-1 ${styles.badgeBg}`}>
                {subtitle}
              </span>
            )}
            <h3 className="text-lg font-bold text-slate-900 leading-snug">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Main message */}
          <div className="text-sm text-slate-600 leading-relaxed font-normal">
            {message}
          </div>

          {/* Details Table/Grid if present */}
          {details && details.length > 0 && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Resumen de la Operación
              </div>
              <div className="grid grid-cols-1 gap-1.5 text-xs">
                {details.map((d, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-200/50 last:border-0">
                    <span className="text-slate-500 font-medium">{d.label}:</span>
                    <span className="text-slate-900 font-semibold text-right max-w-[260px] truncate">
                      {d.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verification Checkbox */}
          {requireCheckbox && (
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-xs text-amber-900 font-medium leading-relaxed">
                {checkboxLabel}
              </span>
            </label>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirmClick}
            disabled={!canConfirm || loading || isSubmitting}
            className={`px-5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${styles.confirmBtn}`}
          >
            {loading || isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Procesando...</span>
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
