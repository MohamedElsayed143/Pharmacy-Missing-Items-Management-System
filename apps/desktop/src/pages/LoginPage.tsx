import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, User, ShieldCheck, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('admin123');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const res = await login(username.trim(), password);
    if (!res.success) {
      setError(res.error || 'فشل تسجيل الدخول');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-brand-950 p-6 select-none">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-l from-brand-600 via-brand-700 to-slate-900 p-8 text-center text-white relative">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
            <span className="text-3xl font-black tracking-tight text-white">Rx</span>
          </div>
          <h2 className="text-2xl font-black">نظام إدارة نواقص الصيدلية</h2>
          <p className="text-xs text-brand-200 mt-1 font-medium">
            Pharmacy Missing Items Management System
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-[11px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>نظام محطات العمل الموحد (Windows 7/10/11)</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700 font-semibold animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-brand-600" />
              اسم المستخدم:
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="اسم المستخدم"
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-brand-600" />
              كلمة المرور:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-brand-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>جاري تسجيل الدخول...</span>
              </>
            ) : (
              <span>دخول إلى محطة العمل</span>
            )}
          </button>

          {/* Quick Demo Credentials */}
          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500 space-y-1.5">
            <div className="font-bold text-slate-600">حسابات تجريبية افتراضية مسجلة:</div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div
                onClick={() => { setUsername('admin'); setPassword('admin123'); }}
                className="cursor-pointer p-2 bg-slate-50 hover:bg-brand-50 border border-slate-200 rounded-lg"
              >
                <span className="font-bold text-slate-700">المدير:</span> admin / admin123
                <div className="text-slate-400">PIN: 1111</div>
              </div>
              <div
                onClick={() => { setUsername('purchasing'); setPassword('manager123'); }}
                className="cursor-pointer p-2 bg-slate-50 hover:bg-brand-50 border border-slate-200 rounded-lg"
              >
                <span className="font-bold text-slate-700">المشتريات:</span> purchasing / manager123
                <div className="text-slate-400">PIN: 2222</div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
