import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { LogOut, Activity, Clock, Monitor, Shield } from 'lucide-react';
import { ROLE_LABELS } from '@pharmacy/shared';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm z-30 select-none">
      {/* Title & Branch info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <span className="text-xl font-extrabold tracking-tight">Rx</span>
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-800 leading-none">
              نظام إدارة نواقص الأدوية
            </h1>
            <p className="text-[11px] font-medium text-slate-500 mt-1 flex items-center gap-1.5">
              <span>الصيدلية المركزية</span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1 text-slate-400">
                <Monitor className="w-3 h-3" />
                محطة العمل الداخلية
              </span>
            </p>
          </div>
        </div>

        {/* Real-time Socket Indicator */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
            isConnected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
          }`}
          title={isConnected ? 'متصل بالخادم المركزي للبيانات' : 'انقطع الاتصال بالخادم المركزي'}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
          ></span>
          <span>{isConnected ? 'المزامنة الحية: متصل' : 'المزامنة: جاري إعادة الاتصال...'}</span>
        </div>
      </div>

      {/* User profile & Clock & Logout */}
      <div className="flex items-center gap-4">
        {/* Clock */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-medium text-slate-600">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{time}</span>
        </div>

        {/* Workstation User Profile */}
        {user && (
          <div className="flex items-center gap-3 pr-2 pl-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-xs">
              <Shield className="w-4 h-4 text-brand-600" />
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-slate-800 leading-tight">
                {user.fullName}
              </div>
              <div className="text-[10px] font-semibold text-brand-600">
                {ROLE_LABELS[user.role] || user.role}
              </div>
            </div>
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={logout}
          title="تسجيل الخروج من محطة العمل"
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>خروج</span>
        </button>
      </div>
    </header>
  );
};
