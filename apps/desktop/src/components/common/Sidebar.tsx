import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  PlusCircle,
  FileSpreadsheet,
  ShoppingCart,
  PackageCheck,
  Users,
  History,
  FileText,
} from 'lucide-react';
import { UserRole } from '@pharmacy/shared';

export type TabType =
  | 'dashboard'
  | 'create-request'
  | 'requests'
  | 'purchasing'
  | 'receiving'
  | 'employees'
  | 'activity';

interface SidebarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  const isPurchasingOrAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.PURCHASING_MANAGER;

  const navItems: { id: TabType; label: string; icon: any; show: boolean; badge?: string }[] = [
    {
      id: 'dashboard',
      label: 'لوحة التحكم والمؤشرات',
      icon: LayoutDashboard,
      show: true,
    },
    {
      id: 'create-request',
      label: 'تسجيل طلب نواقص جديد',
      icon: PlusCircle,
      show: true,
      badge: 'سريع',
    },
    {
      id: 'requests',
      label: 'قائمة الطلبات والأصناف',
      icon: FileSpreadsheet,
      show: true,
    },
    {
      id: 'purchasing',
      label: 'إدارة الشراء والتجميع',
      icon: ShoppingCart,
      show: isPurchasingOrAdmin,
    },
    {
      id: 'receiving',
      label: 'الاستلام والتسليم للعملاء',
      icon: PackageCheck,
      show: true,
    },
    {
      id: 'employees',
      label: 'إدارة طاقم العمل',
      icon: Users,
      show: isAdmin,
    },
    {
      id: 'activity',
      label: 'سجل العمليات والرقابة',
      icon: History,
      show: true,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between select-none">
      <div className="py-4 px-3 space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          القائمة الرئيسية
        </div>

        {navItems
          .filter((item) => item.show)
          .map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30 font-extrabold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-brand-900/80 text-brand-300 border border-brand-700/50'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
      </div>

      {/* System Architecture and Windows 7 Notice */}
      <div className="p-4 m-3 bg-slate-800/60 rounded-xl border border-slate-700/50 text-[11px] text-slate-400 space-y-1.5">
        <div className="flex items-center justify-between text-slate-300 font-bold">
          <span>بيئة التشغيل</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
            Win 7 Compatible
          </span>
        </div>
        <p className="text-[10px] text-slate-400 leading-normal">
          إصدار Electron 22 المخصص للصيدليات، متوافق مع نظام Windows 7 والمحطات الحديثة.
        </p>
      </div>
    </aside>
  );
};
