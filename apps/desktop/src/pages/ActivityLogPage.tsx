import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useSocket } from '../context/SocketContext';
import { ActivityLogDto } from '@pharmacy/shared';
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Monitor,
} from 'lucide-react';

export const ActivityLogPage: React.FC = () => {
  const { subscribe } = useSocket();
  const [logs, setLogs] = useState<ActivityLogDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });

  const [actionFilter, setActionFilter] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string>('');

  const fetchLogs = async (page = pagination.page) => {
    setIsLoading(true);
    try {
      const res = await api.get('/activity-logs', {
        params: {
          page,
          limit: pagination.limit,
          action: actionFilter || undefined,
          entityType: entityFilter || undefined,
        },
      });
      setLogs(res.data.data);
      setPagination(res.data.pagination);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);

    const unsubActivity = subscribe('activity:new', () => fetchLogs());
    return () => {
      unsubActivity();
    };
  }, [actionFilter, entityFilter]);

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <History className="w-6 h-6 text-brand-600" />
            <span>سجل الرقابة الإدارية وتتبع العمليات (Audit Trail)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            سجل غير قابل للتعديل أو الحذف (Append-Only) يوثق كل عملية، محطة العمل، والموظف المنفذ الفعلي.
          </p>
        </div>

        <button
          onClick={() => fetchLogs()}
          className="p-2.5 text-slate-600 hover:text-brand-600 hover:bg-brand-50 rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 text-xs font-bold"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>تحديث السجل</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="w-48">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50 focus:bg-white"
          >
            <option value="">جميع أنواع العمليات</option>
            <option value="WORKSTATION_LOGIN">تسجيل دخول محطة عمل</option>
            <option value="ORDER_CREATED">إنشاء طلب نواقص جديد</option>
            <option value="ORDER_ITEM_STATUS_CHANGED">تغيير حالة صنف</option>
            <option value="PURCHASE_BATCH_CREATED">إنشاء أمر شراء</option>
            <option value="PURCHASE_BATCH_ORDERED">اعتماد طلب بضاعة من مورد</option>
            <option value="ITEMS_RECEIVED_INTO_PHARMACY">استلام بضاعة بالصيدلية</option>
            <option value="CUSTOMER_NOTIFIED">إبلاغ العميل</option>
            <option value="CUSTOMER_DELIVERED">تسليم الصنف للعميل</option>
            <option value="EMPLOYEE_CREATED">إضافة موظف</option>
            <option value="EMPLOYEE_UPDATED">تعديل موظف</option>
          </select>
        </div>

        <div className="w-48">
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50 focus:bg-white"
          >
            <option value="">جميع الكيانات</option>
            <option value="ORDER">طلبات النواقص</option>
            <option value="ORDER_ITEM">أصناف الطلبات</option>
            <option value="PURCHASE_BATCH">أوامر الشراء</option>
            <option value="INVENTORY_RECEIVING">الاستلام والتوريد</option>
            <option value="EMPLOYEE">الموظفين</option>
            <option value="SESSION">جلسات العمل</option>
          </select>
        </div>

        {(actionFilter || entityFilter) && (
          <button
            onClick={() => {
              setActionFilter('');
              setEntityFilter('');
            }}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold"
          >
            إلغاء التصفية
          </button>
        )}
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase">
              <tr>
                <th className="px-4 py-3.5">العملية والكيان</th>
                <th className="px-4 py-3.5">الموظف / الصيدلي المنفذ الفعلي</th>
                <th className="px-4 py-3.5">محطة العمل المستخدمة</th>
                <th className="px-4 py-3.5">تفاصيل وبيان العملية</th>
                <th className="px-4 py-3.5">التوقيت والتاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    جاري تحميل سجل النشاطات...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    لا توجد عمليات مسجلة مطابقة للمحددات
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Action & Entity */}
                    <td className="px-4 py-3.5">
                      <div className="font-mono font-bold text-brand-700">{log.action}</div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-bold">
                        {log.entityType}
                      </span>
                    </td>

                    {/* Performer */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <UserCheck className="w-3.5 h-3.5 text-brand-600" />
                        <span>{log.performerEmployee?.fullName || 'غير محدد'}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold">
                        PIN Verified
                      </div>
                    </td>

                    {/* Workstation User */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                        <Monitor className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.authenticatedUser?.username}</span>
                      </div>
                    </td>

                    {/* Notes */}
                    <td className="px-4 py-3.5 text-slate-700 max-w-md">
                      <p className="leading-snug">{log.notes || '-'}</p>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3.5 text-slate-500 text-[11px] font-mono">
                      {new Date(log.createdAt).toLocaleString('ar-EG')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 bg-slate-50/60 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            إجمالي السجلات: <strong className="font-bold text-slate-900">{pagination.total}</strong> عملية
          </div>

          <div className="flex items-center gap-2">
            <span>
              صفحة {pagination.page} من {pagination.totalPages || 1}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchLogs(pagination.page - 1)}
                className="p-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchLogs(pagination.page + 1)}
                className="p-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
