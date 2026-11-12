import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useSocket } from '../context/SocketContext';
import { StatusBadge, PriorityBadge } from '../components/common/Badge';
import { PerformerPinModal } from '../components/common/PerformerPinModal';
import {
  OrderItemDto,
  OrderItemStatus,
  ItemPriority,
  ORDER_ITEM_STATUS_LABELS,
  PRIORITY_LABELS,
  getAllowedTransitions,
} from '@pharmacy/shared';
import {
  Search,
  Filter,
  RefreshCw,
  Clock,
  Eye,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  X,
  FileCheck2,
  Calendar,
  AlertCircle,
} from 'lucide-react';

export const RequestsListPage: React.FC = () => {
  const { subscribe } = useSocket();
  const [items, setItems] = useState<OrderItemDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Selected Item Modals
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<OrderItemDto | null>(null);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Status Change Modal
  const [selectedItemForStatus, setSelectedItemForStatus] = useState<OrderItemDto | null>(null);
  const [targetStatus, setTargetStatus] = useState<OrderItemStatus | ''>('');
  const [statusNotes, setStatusNotes] = useState<string>('');
  const [isPerformerModalOpen, setIsPerformerModalOpen] = useState<boolean>(false);
  const [isSubmittingStatus, setIsSubmittingStatus] = useState<boolean>(false);
  const [statusActionError, setStatusActionError] = useState<string | null>(null);

  const fetchItems = async (page = pagination.page) => {
    setIsLoading(true);
    try {
      const res = await api.get('/orders/items', {
        params: {
          page,
          limit: pagination.limit,
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });
      setItems(res.data.data);
      setPagination(res.data.pagination);
    } catch (e) {
      console.error('Failed to load items', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems(1);

    const unsubOrder = subscribe('order:created', () => fetchItems());
    const unsubStatus = subscribe('orderItem:statusChanged', () => fetchItems());
    const unsubReceived = subscribe('item:received', () => fetchItems());

    return () => {
      unsubOrder();
      unsubStatus();
      unsubReceived();
    };
  }, [statusFilter, priorityFilter, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchItems(1);
  };

  const handleOpenHistory = async (item: OrderItemDto) => {
    setSelectedItemForHistory(item);
    setIsLoadingHistory(true);
    try {
      const res = await api.get(`/orders/items/${item.id}/history`);
      setHistoryLogs(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleOpenStatusModal = (item: OrderItemDto) => {
    setSelectedItemForStatus(item);
    const allowed = getAllowedTransitions(item.status);
    setTargetStatus(allowed.length > 0 ? allowed[0] : '');
    setStatusNotes('');
    setStatusActionError(null);
  };

  const handleConfirmStatusChange = async (performerEmployeeId: string, performerPin: string) => {
    if (!selectedItemForStatus || !targetStatus) return;
    setIsSubmittingStatus(true);
    setStatusActionError(null);

    try {
      await api.patch(`/orders/items/${selectedItemForStatus.id}/status`, {
        status: targetStatus,
        notes: statusNotes.trim() || undefined,
        performerEmployeeId,
        performerPin,
      });

      setIsPerformerModalOpen(false);
      setSelectedItemForStatus(null);
      fetchItems();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'فشل تحديث حالة الصنف';
      setStatusActionError(msg);
      throw new Error(msg);
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header and Quick Stats */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800">
            قائمة أصناف النواقص وطلبات العملاء
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            متابعة مفصلة لحالة كل صنف دوائي على حدة، وسجل الانتقالات والتوثيق الرقابي.
          </p>
        </div>

        <button
          onClick={() => fetchItems()}
          className="p-2.5 text-slate-600 hover:text-brand-600 hover:bg-brand-50 rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 text-xs font-bold"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>تحديث القائمة</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-4 relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالصنف، رقم الهاتف، أو كود الطلب..."
              className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50 focus:bg-white"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          </div>

          {/* Status Filter */}
          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50 focus:bg-white"
            >
              <option value="">جميع الحالات التشغيلية</option>
              {Object.values(OrderItemStatus).map((st) => (
                <option key={st} value={st}>
                  {ORDER_ITEM_STATUS_LABELS[st]}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="md:col-span-2">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50 focus:bg-white"
            >
              <option value="">جميع الأولويات</option>
              <option value={ItemPriority.NORMAL}>{PRIORITY_LABELS.NORMAL}</option>
              <option value={ItemPriority.URGENT}>{PRIORITY_LABELS.URGENT}</option>
              <option value={ItemPriority.EMERGENCY}>{PRIORITY_LABELS.EMERGENCY}</option>
            </select>
          </div>

          {/* Search Button */}
          <div className="md:col-span-3 flex gap-2">
            <button
              type="submit"
              className="w-full py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
            >
              تطبيق البحث
            </button>
            {(search || statusFilter || priorityFilter || startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                  setPriorityFilter('');
                  setStartDate('');
                  setEndDate('');
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold"
                title="إعادة التعيين"
              >
                مسح
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Main Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-extrabold uppercase">
              <tr>
                <th className="px-4 py-3.5">رقم الطلب</th>
                <th className="px-4 py-3.5">الصنف الدوائي والتركيز</th>
                <th className="px-4 py-3.5">الشكل</th>
                <th className="px-4 py-3.5">الكمية</th>
                <th className="px-4 py-3.5">العميل / الهاتف</th>
                <th className="px-4 py-3.5">الأولوية</th>
                <th className="px-4 py-3.5">الحالة الحالية</th>
                <th className="px-4 py-3.5">تاريخ التسجيل</th>
                <th className="px-4 py-3.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <span className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></span>
                      <span>جاري تحميل بيانات الأصناف...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    لا توجد طلبات مطابقة لمعايير البحث الحالية
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Request Number */}
                    <td className="px-4 py-3.5 font-mono font-bold text-brand-700">
                      {item.order?.requestNumber}
                    </td>

                    {/* Drug Name & Strength & Notes */}
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900">{item.productNameCustom}</div>
                      {item.strength && (
                        <div className="text-[11px] font-semibold text-slate-500">
                          {item.strength}
                        </div>
                      )}
                      {item.notes && (
                        <div className="mt-1 text-[11px] text-amber-900 bg-amber-50/90 border border-amber-200/80 rounded px-1.5 py-0.5 inline-block font-medium">
                          📝 {item.notes}
                        </div>
                      )}
                    </td>

                    {/* Dosage Form */}
                    <td className="px-4 py-3.5 text-slate-600 text-[11px]">
                      {item.dosageForm}
                    </td>

                    {/* Quantity (Received / Requested) */}
                    <td className="px-4 py-3.5 font-bold">
                      <span className="text-brand-700">{item.receivedQuantity}</span>
                      <span className="text-slate-400 mx-1">/</span>
                      <span className="text-slate-700">{item.requestedQuantity}</span>
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-3.5">
                      <div className="font-mono text-slate-800 font-bold">
                        {item.order?.customer?.phone}
                      </div>
                      {item.order?.customer?.name && (
                        <div className="text-[11px] text-slate-500">
                          {item.order?.customer?.name}
                        </div>
                      )}
                    </td>

                    {/* Priority */}
                    <td className="px-4 py-3.5">
                      <PriorityBadge priority={item.priority} />
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <StatusBadge status={item.status} />
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                      {new Date(item.createdAt).toLocaleDateString('ar-EG', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Change Status Button */}
                        {getAllowedTransitions(item.status).length > 0 && (
                          <button
                            onClick={() => handleOpenStatusModal(item)}
                            className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-lg text-xs font-bold transition-colors"
                            title="تعديل الحالة التشغيلية"
                          >
                            تحديث الحالة
                          </button>
                        )}

                        {/* View History Timeline */}
                        <button
                          onClick={() => handleOpenHistory(item)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          title="عرض سجل تاريخ الصنف"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                      </div>
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
            إجمالي النتائج: <strong className="font-bold text-slate-900">{pagination.total}</strong> صنف
          </div>

          <div className="flex items-center gap-2">
            <span>
              صفحة {pagination.page} من {pagination.totalPages || 1}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchItems(pagination.page - 1)}
                className="p-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchItems(pagination.page + 1)}
                className="p-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Item Status History Modal */}
      {selectedItemForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-brand-400" />
                <h3 className="font-bold text-sm">
                  سجل حركة الصنف: {selectedItemForHistory.productNameCustom}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItemForHistory(null)}
                className="p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[440px] overflow-y-auto space-y-4">
              {/* Item Info Summary Card with Notes */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-500">رقم الطلب: </span>
                    <span className="font-bold font-mono text-brand-700">{selectedItemForHistory.order?.requestNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">الكمية المطلوبة: </span>
                    <span className="font-black text-slate-800">{selectedItemForHistory.requestedQuantity} علبة</span>
                  </div>
                </div>

                <div className="flex items-start gap-1.5 pt-1 border-t border-slate-200/60">
                  <span className="font-bold text-slate-600 flex-shrink-0">ملاحظات الصنف:</span>
                  {selectedItemForHistory.notes ? (
                    <span className="font-medium text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex-1">
                      {selectedItemForHistory.notes}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">لا توجد ملاحظات مسجلة</span>
                  )}
                </div>
              </div>

              {isLoadingHistory ? (
                <div className="py-8 text-center text-xs text-slate-400">جاري تحميل السجل...</div>
              ) : historyLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  لا توجد حركات سابقة مسجلة لهذا الصنف (حالة الإنشاء الأولية فقط).
                </div>
              ) : (
                <div className="space-y-3 relative border-r-2 border-slate-200 pr-4">
                  {historyLogs.map((log, i) => (
                    <div key={log.id} className="relative space-y-1">
                      <span className="absolute -right-[23px] top-1 w-3 h-3 rounded-full bg-brand-600 border-2 border-white"></span>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={log.toStatus} />
                          <span className="text-[11px] text-slate-400">
                            (من: {ORDER_ITEM_STATUS_LABELS[log.fromStatus as OrderItemStatus]})
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.createdAt).toLocaleString('ar-EG')}
                        </span>
                      </div>
                      {log.notes && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {log.notes}
                        </p>
                      )}
                      <div className="text-[10px] text-slate-500 font-semibold">
                        المنفذ الفعلي: {log.performerEmployee?.fullName || 'غير معروف'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedItemForHistory(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Status Modal */}
      {selectedItemForStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-brand-600 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                تحديث حالة الصنف: {selectedItemForStatus.productNameCustom}
              </h3>
              <button
                onClick={() => setSelectedItemForStatus(null)}
                className="p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {statusActionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-bold">
                  {statusActionError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الحالة الحالية:</label>
                <StatusBadge status={selectedItemForStatus.status} />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الحالة التشغيلية الجديدة المسموحة:
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as OrderItemStatus)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50 focus:bg-white"
                >
                  {getAllowedTransitions(selectedItemForStatus.status).map((st) => (
                    <option key={st} value={st}>
                      {ORDER_ITEM_STATUS_LABELS[st]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات الانتقال (اختياري):
                </label>
                <input
                  type="text"
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="سبب التغيير، جهة المورد، ..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedItemForStatus(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => setIsPerformerModalOpen(true)}
                  disabled={!targetStatus}
                  className="px-5 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg shadow-sm"
                >
                  متابعة وتأكيد بالرمز السري
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performer PIN Modal */}
      <PerformerPinModal
        isOpen={isPerformerModalOpen}
        title="تأكيد هوية الموظف المنفذ لتعديل الحالة"
        description="تتطلب الصيدلية التحقق من هوية الصيدلي الذي يقوم بتعديل حالة صنف النواقص."
        actionButtonText="تأكيد التغيير الآن"
        onConfirm={handleConfirmStatusChange}
        onCancel={() => setIsPerformerModalOpen(false)}
        isSubmitting={isSubmittingStatus}
      />
    </div>
  );
};
