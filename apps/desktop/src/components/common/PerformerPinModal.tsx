import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, KeyRound, UserCheck, X } from 'lucide-react';
import { ROLE_LABELS } from '@pharmacy/shared';

interface PerformerPinModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  actionButtonText?: string;
  onConfirm: (performerEmployeeId: string, performerPin: string) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const PerformerPinModal: React.FC<PerformerPinModalProps> = ({
  isOpen,
  title = 'تأكيد العملية وهوية الموظف المنفذ',
  description = 'وفقاً لسياسات الصيدلية، يتطلب تنفيذ هذا الإجراء التحقق من هوية الصيدلي أو الموظف القائم بالعملية وإدخال الرمز السري الشخصي (PIN).',
  actionButtonText = 'تأكيد العملية',
  onConfirm,
  onCancel,
  isSubmitting = false,
}) => {
  const { activePerformers, user } = useAuth();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      // Default to logged-in user if active, else first performer
      if (user && activePerformers.some((p) => p.id === user.id)) {
        setSelectedEmployeeId(user.id);
      } else if (activePerformers.length > 0) {
        setSelectedEmployeeId(activePerformers[0].id);
      }
      setPin('');
      setError('');
    }
  }, [isOpen, activePerformers, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedEmployeeId) {
      setError('يرجى اختيار الموظف المنفذ من القائمة');
      return;
    }

    if (!pin || pin.trim().length === 0) {
      setError('يرجى إدخال الرمز السري (PIN)');
      return;
    }

    try {
      await onConfirm(selectedEmployeeId, pin.trim());
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.error ||
        err?.message ||
        'الرمز السري (PIN) للموظف غير صحيح. يرجى إعادة المحاولة.';
      setError(errorMsg);
      setPin(''); // Reset only PIN field for quick retry
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all">
        {/* Modal Header */}
        <div className="bg-gradient-to-l from-brand-600 to-brand-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-brand-200" />
            <h3 className="font-bold text-lg">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">{description}</p>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
              {error}
            </div>
          )}

          {/* Employee Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-brand-600" />
              الموظف / الصيدلي المنفذ الفعلي:
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              disabled={isSubmitting}
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all font-medium text-slate-800"
            >
              {activePerformers.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName} ({ROLE_LABELS[emp.role] || emp.role})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              يجب اختيار اسمك الحقيقي المسجل في كادر الصيدلية.
            </p>
          </div>

          {/* PIN Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-brand-600" />
              الرمز السري الشخصي (PIN):
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              disabled={isSubmitting}
              placeholder="••••"
              maxLength={8}
              autoFocus
              className="w-full text-center text-xl tracking-widest font-mono rounded-lg border border-slate-300 px-3 py-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all text-slate-900"
            />
            <p className="text-[11px] text-slate-400 mt-1 text-center">
              (الافتراضي للموظفين للتجربة: 1111 للمدير، 2222 للمشتريات، 3333 أو 4444 للصيادلة)
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  جاري التحقق...
                </>
              ) : (
                actionButtonText
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
