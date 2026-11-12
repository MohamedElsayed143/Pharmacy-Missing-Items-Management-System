import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useSocket } from '../context/SocketContext';
import { DashboardStatsDto, ActivityLogDto } from '@pharmacy/shared';
import {
  FileText,
  Clock,
  ShoppingCart,
  Truck,
  PackageCheck,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { TabType } from '../components/common/Sidebar';

interface DashboardPageProps {
  onNavigate: (tab: TabType) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { subscribe } = useSocket();
  const [stats, setStats] = useState<DashboardStatsDto | null>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityLogDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, topRes, actRes] = await Promise.all([
        api.get<DashboardStatsDto>('/dashboard/stats'),
        api.get<any[]>('/dashboard/top-requested'),
        api.get<ActivityLogDto[]>('/dashboard/recent-activity'),
      ]);
      setStats(statsRes.data);
      setTopProducts(topRes.data);
      setRecentActivities(actRes.data);
    } catch (e) {
      console.error('Failed to load dashboard data', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Subscribe to real-time events from other workstations
    const unsubStats = subscribe('stats:updated', () => fetchDashboardData());
    const unsubOrder = subscribe('order:created', () => fetchDashboardData());
    const unsubStatus = subscribe('orderItem:statusChanged', () => fetchDashboardData());

    return () => {
      unsubStats();
      unsubOrder();
      unsubStatus();
    };
  }, []);

  const statCards = [
    {
      title: 'إجمالي الطلبات المسجلة',
      value: stats?.totalRequests ?? 0,
      icon: FileText,
      color: 'from-blue-600 to-blue-700',
      bgColor: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      title: 'طلبات جديدة (تحت الإجراء)',
      value: stats?.newRequests ?? 0,
      icon: Clock,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      title: 'بانتظار إدراجها للشراء',
      value: stats?.awaitingPurchasing ?? 0,
      icon: ShoppingCart,
      color: 'from-purple-600 to-purple-700',
      bgColor: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    {
      title: 'تم الطلب من المورد',
      value: stats?.orderedProducts ?? 0,
      icon: Truck,
      color: 'from-indigo-600 to-indigo-700',
      bgColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    {
      title: 'وصل جزئياً',
      value: stats?.partiallyReceived ?? 0,
      icon: AlertTriangle,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50 text-orange-700 border-orange-200',
    },
    {
      title: 'جاهزة لتسليم العميل بالصيدلية',
      value: stats?.readyForPickup ?? 0,
      icon: PackageCheck,
      color: 'from-teal-600 to-teal-700',
      bgColor: 'bg-teal-50 text-teal-700 border-teal-200',
    },
    {
      title: 'تم التسليم وإغلاق الطلب',
      value: stats?.completedDeliveries ?? 0,
      icon: CheckCircle2,
      color: 'from-emerald-600 to-emerald-700',
      bgColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-800">
            مؤشرات تشغيل الصيدلية المركزية
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            متابعة فورية ومباشرة لكافة طلبات النواقص وعمليات التوريد والتسليم عبر محطات العمل.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchDashboardData()}
            className="p-2 text-slate-600 hover:text-brand-600 hover:bg-brand-50 rounded-xl border border-slate-200 transition-colors"
            title="تحديث البيانات فورياً"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => onNavigate('create-request')}
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-xs shadow-md shadow-brand-600/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل طلب نواقص جديد</span>
          </button>
        </div>
      </div>

      {/* Statistical Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow transition-shadow flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 leading-tight">
                  {card.title}
                </span>
                <div className={`p-2.5 rounded-xl border ${card.bgColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-3xl font-black text-slate-900 tracking-tight">
                  {isLoading ? '...' : card.value}
                </span>
                <span className="text-[11px] font-semibold text-slate-400">صنف / طلب</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Grid: Top Missing Products & Recent Activities Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Requested Missing Items */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-600" />
              <h3 className="font-extrabold text-sm text-slate-800">
                أكثر الأصناف الدوائية طلباً (الأعلى نقصاً)
              </h3>
            </div>
            <button
              onClick={() => onNavigate('purchasing')}
              className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <span>عرض التجميع</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {topProducts.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              لا توجد بيانات كافية حالياً
            </div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition-colors border border-slate-200/60"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-black flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div>
                      <div className="font-bold text-sm text-slate-800">{p.name}</div>
                      <div className="text-[11px] text-slate-400">
                        إجمالي الكمية المطلوبة: {p.totalQuantity} وحدة
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 bg-brand-50 border border-brand-200 text-brand-700 text-xs font-black rounded-lg">
                      {p.requestsCount} طلب عميل
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Recent Activity Stream */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand-600" />
              <h3 className="font-extrabold text-sm text-slate-800">
                سجل آخر العمليات عبر محطات العمل
              </h3>
            </div>
            <button
              onClick={() => onNavigate('activity')}
              className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <span>سجل الرقابة الكامل</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentActivities.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              لا توجد عمليات مسجلة حديثاً
            </div>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {recentActivities.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{log.action}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.createdAt).toLocaleTimeString('ar-EG', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-snug">{log.notes || '-'}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/40">
                    <span>
                      المنفذ الفعلي:{' '}
                      <strong className="text-brand-600 font-bold">
                        {log.performerEmployee?.fullName || 'غير محدد'}
                      </strong>
                    </span>
                    <span>المحطة: {log.authenticatedUser?.username || '-'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
