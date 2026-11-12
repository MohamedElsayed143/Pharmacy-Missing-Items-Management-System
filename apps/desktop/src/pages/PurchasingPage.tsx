import React, { useState, useEffect } from 'react';
import { api, API_BASE_URL } from '../api/client';
import { useSocket } from '../context/SocketContext';
import { PerformerPinModal } from '../components/common/PerformerPinModal';
import { BatchBadge } from '../components/common/Badge';
import {
  GroupedProductRequestDto,
  PurchaseBatchDto,
  PurchaseBatchStatus,
  ItemPriority,
  PRIORITY_LABELS,
} from '@pharmacy/shared';
import {
  ShoppingCart,
  Package,
  Layers,
  FileSpreadsheet,
  Download,
  CheckCircle,
  Truck,
  Plus,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
  AlertCircle,
} from 'lucide-react';

export const PurchasingPage: React.FC = () => {
  const { subscribe } = useSocket();
  const [activeTab, setActiveTab] = useState<'grouped' | 'batches'>('grouped');

  // Grouped Requests
  const [groupedProducts, setGroupedProducts] = useState<GroupedProductRequestDto[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isLoadingGrouped, setIsLoadingGrouped] = useState<boolean>(true);

  // Batches
  const [batches, setBatches] = useState<PurchaseBatchDto[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState<boolean>(true);

  // Create Batch Modal
  const [isCreateBatchModalOpen, setIsCreateBatchModalOpen] = useState<boolean>(false);
  const [supplierName, setSupplierName] = useState<string>('');
  const [batchNotes, setBatchNotes] = useState<string>('');

  // Performer Confirmation Modal
  const [isPerformerModalOpen, setIsPerformerModalOpen] = useState<boolean>(false);
  const [actionType, setActionType] = useState<'create-batch' | 'order-batch'>('create-batch');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchGrouped = async () => {
    setIsLoadingGrouped(true);
    try {
      const res = await api.get<GroupedProductRequestDto[]>('/purchasing/grouped');
      setGroupedProducts(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingGrouped(false);
    }
  };

  const fetchBatches = async () => {
    setIsLoadingBatches(true);
    try {
      const res = await api.get<PurchaseBatchDto[]>('/purchasing/batches');
      setBatches(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingBatches(false);
    }
  };

  useEffect(() => {
    fetchGrouped();
    fetchBatches();

    const unsubBatch = subscribe('purchaseBatch:created', () => {
      fetchGrouped();
      fetchBatches();
    });

    const unsubOrder = subscribe('order:created', () => fetchGrouped());
    const unsubStatus = subscribe('orderItem:statusChanged', () => fetchGrouped());

    return () => {
      unsubBatch();
      unsubOrder();
      unsubStatus();
    };
  }, []);

  const toggleExpand = (key: string) => {
    const next = new Set(expandedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpandedKeys(next);
  };

  const toggleSelectItem = (id: string) => {
    const next = new Set(selectedItemIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedItemIds(next);
  };

  const toggleSelectGroup = (group: GroupedProductRequestDto) => {
    const groupItemIds = group.orderItems.map((i) => i.id);
    const allSelected = groupItemIds.every((id) => selectedItemIds.has(id));

    const next = new Set(selectedItemIds);
    if (allSelected) {
      groupItemIds.forEach((id) => next.delete(id));
    } else {
      groupItemIds.forEach((id) => next.add(id));
    }
    setSelectedItemIds(next);
  };

  const handleOpenCreateBatch = () => {
    if (selectedItemIds.size === 0) {
      setFeedbackMessage({ type: 'error', text: 'يرجى تحديد صنف أو أكثر لإضافتها لأمر الشراء' });
      return;
    }
    setSupplierName('');
    setBatchNotes('');
    setIsCreateBatchModalOpen(true);
  };

  const handleStartPerformerCheck = (type: 'create-batch' | 'order-batch', batchId?: string) => {
    setActionType(type);
    setSelectedBatchId(batchId || null);
    setIsPerformerModalOpen(true);
  };

  const handleConfirmAction = async (performerEmployeeId: string, performerPin: string) => {
    setIsSubmitting(true);
    try {
      if (actionType === 'create-batch') {
        await api.post('/purchasing/batches', {
          supplierName: supplierName.trim() || undefined,
          notes: batchNotes.trim() || undefined,
          itemIds: Array.from(selectedItemIds),
          performerEmployeeId,
          performerPin,
        });

        setIsCreateBatchModalOpen(false);
        setIsPerformerModalOpen(false);
        setSelectedItemIds(new Set());
        setFeedbackMessage({ type: 'success', text: 'تم إنشاء أمر الشراء بنجاح وتحديث حالة الأصناف' });
        fetchGrouped();
        fetchBatches();
      } else if (actionType === 'order-batch' && selectedBatchId) {
        await api.patch(`/purchasing/batches/${selectedBatchId}/order`, {
          performerEmployeeId,
          performerPin,
        });

        setIsPerformerModalOpen(false);
        setFeedbackMessage({ type: 'success', text: 'تم اعتماد طلب البضاعة من المورد بنجاح' });
        fetchBatches();
        fetchGrouped();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'حدث خطأ أثناء تنفيذ الإجراء';
      throw new Error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportExcel = (batchId: string, batchNumber: string) => {
    const token = localStorage.getItem('pharmacy_auth_token');
    const url = `${API_BASE_URL}/purchasing/${batchId}/export`;

    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `Purchase_Batch_${batchNumber}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((err) => console.error('Export failed', err));
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-brand-600" />
            <span>إدارة الشراء وتجميع طلبيات النواقص</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            تجميع تلقائي لطلبات العملاء المتطابقة لنفس الصنف الدوائي لإنشاء أوامر شراء موحدة والتصدير للإكسل.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActiveTab('grouped')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'grouped'
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            الأصناف المجمعة للشراء ({groupedProducts.length})
          </button>
          <button
            onClick={() => setActiveTab('batches')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'batches'
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            أوامر الشراء المسجلة ({batches.length})
          </button>
        </div>
      </div>

      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border border-rose-300 text-rose-800'
          }`}
        >
          <span>{feedbackMessage.text}</span>
          <button onClick={() => setFeedbackMessage(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab 1: Grouped Requests */}
      {activeTab === 'grouped' && (
        <div className="space-y-4">
          {/* Action bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-600" />
              <span>
                المحدد للشراء: <strong className="text-brand-600">{selectedItemIds.size}</strong> صنف
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchGrouped()}
                className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-lg text-xs"
                title="تحديث"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingGrouped ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleOpenCreateBatch}
                disabled={selectedItemIds.size === 0}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>إنشاء أمر شراء بالأصناف المحددة</span>
              </button>
            </div>
          </div>

          {/* Grouped Products List */}
          <div className="space-y-3">
            {isLoadingGrouped ? (
              <div className="bg-white p-12 text-center text-xs text-slate-400 rounded-2xl border border-slate-200">
                جاري تجميع وحساب كميات الأصناف...
              </div>
            ) : groupedProducts.length === 0 ? (
              <div className="bg-white p-12 text-center text-xs text-slate-400 rounded-2xl border border-slate-200">
                لا توجد طلبات نواقص معلقة للشراء حالياً.
              </div>
            ) : (
              groupedProducts.map((group) => {
                const isExpanded = expandedKeys.has(group.productKey);
                const allGroupSelected = group.orderItems.every((i) => selectedItemIds.has(i.id));

                return (
                  <div
                    key={group.productKey}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                  >
                    {/* Group Header Row */}
                    <div className="p-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                      <div className="flex items-center gap-4">
                        <input
                          type="checkbox"
                          checked={allGroupSelected}
                          onChange={() => toggleSelectGroup(group)}
                          className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900">
                              {group.productName}
                            </span>
                            {group.strength && (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-bold rounded">
                                {group.strength}
                              </span>
                            )}
                            <span className="text-xs text-slate-500 font-medium">
                              ({group.dosageForm})
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            <span>
                              العملاء المنتظرين:{' '}
                              <strong className="text-slate-800 font-bold">
                                {group.customerCount}
                              </strong>
                            </span>
                            <span>•</span>
                            <span>
                              إجمالي الكمية المطلوبة:{' '}
                              <strong className="text-brand-600 font-extrabold text-sm">
                                {group.totalRequestedQuantity}
                              </strong>{' '}
                              علبة/وحدة
                            </span>
                            {group.priorities.emergency > 0 && (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-black text-[10px] rounded">
                                {group.priorities.emergency} طارئ جداً
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleExpand(group.productKey)}
                        className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <span>تفاصيل طلبات العملاء ({group.orderItems.length})</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Customer Breakdown Drawer */}
                    {isExpanded && (
                      <div className="bg-slate-50/90 p-4 border-t border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <span>قائمة طلبات العملاء المنتظرين لهذا الصنف ({group.orderItems.length}):</span>
                          </span>
                          <span className="text-[11px] text-slate-500">
                            انقر على بطاقة أي عميل لتحديده أو استبعاده من أمر الشراء
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {group.orderItems.map((item) => {
                            const isChecked = selectedItemIds.has(item.id);
                            return (
                              <div
                                key={item.id}
                                onClick={() => toggleSelectItem(item.id)}
                                className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all space-y-2 ${
                                  isChecked
                                    ? 'bg-brand-50/90 border-brand-400 shadow-sm text-brand-950'
                                    : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 shadow-xs'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2.5">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {}}
                                      className="w-4 h-4 rounded text-brand-600 cursor-pointer"
                                    />
                                    <div>
                                      <div className="font-bold flex items-center gap-1.5">
                                        <span className="font-mono text-brand-700 font-extrabold">{item.requestNumber}</span>
                                        <span className="text-slate-300">|</span>
                                        <span className="font-mono text-slate-700">{item.customerPhone}</span>
                                      </div>
                                      {item.customerName && (
                                        <div className="text-[11px] text-slate-600 font-medium">
                                          {item.customerName}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="text-left font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                                    {item.quantity} علبة
                                  </div>
                                </div>

                                {/* Customer Specific Item Notes */}
                                <div className="pt-2 border-t border-slate-100 flex items-start gap-1.5 text-[11px]">
                                  <span className="font-bold text-slate-500 flex-shrink-0">ملاحظات العميل:</span>
                                  {item.notes ? (
                                    <span className="font-semibold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex-1">
                                      {item.notes}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">لا توجد ملاحظات إضافية</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Existing Purchasing Batches */}
      {activeTab === 'batches' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase">
                <tr>
                  <th className="px-4 py-3.5">رقم أمر الشراء</th>
                  <th className="px-4 py-3.5">اسم المورد / الشركة</th>
                  <th className="px-4 py-3.5">عدد الأصناف</th>
                  <th className="px-4 py-3.5">الحالة</th>
                  <th className="px-4 py-3.5">أنشئ بواسطة</th>
                  <th className="px-4 py-3.5">تاريخ الإنشاء</th>
                  <th className="px-4 py-3.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {isLoadingBatches ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      جاري تحميل أوامر الشراء...
                    </td>
                  </tr>
                ) : batches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      لا توجد أوامر شراء مسجلة بعد.
                    </td>
                  </tr>
                ) : (
                  batches.map((batch) => (
                    <tr key={batch.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-brand-700">
                        {batch.batchNumber}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        {batch.supplierName || 'غير محدد'}
                      </td>
                      <td className="px-4 py-3.5 font-bold">
                        {batch.itemsCount} صنف
                      </td>
                      <td className="px-4 py-3.5">
                        <BatchBadge status={batch.status} />
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {batch.createdBy?.fullName}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                        {new Date(batch.createdAt).toLocaleDateString('ar-EG', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Export to Excel */}
                          <button
                            onClick={() => handleExportExcel(batch.id, batch.batchNumber)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                            title="تصدير إلى ملف إكسل"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>تصدير Excel</span>
                          </button>

                          {/* Order Action */}
                          {batch.status === PurchaseBatchStatus.DRAFT && (
                            <button
                              onClick={() => handleStartPerformerCheck('order-batch', batch.id)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                              title="اعتماد طلب البضاعة من المورد"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>تم الطلب من المورد</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Batch Modal */}
      {isCreateBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-brand-600 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">إنشاء أمر شراء طلبيات نواقص جديد</h3>
              <button
                onClick={() => setIsCreateBatchModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl text-xs text-brand-800 font-bold">
                سيتم تضمين ({selectedItemIds.size}) صنفاً تم تحديدها في أمر الشراء هذا.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم شركة التوزيع / المورد (اختياري):
                </label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="مثال: فارما أوفرسيز، المتحدة، ابن سينا، ..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات أوامر الشراء (اختياري):
                </label>
                <textarea
                  rows={2}
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                  placeholder="تعليمات الاستلام أو شروط التوريد..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateBatchModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => handleStartPerformerCheck('create-batch')}
                  className="px-5 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm"
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
        title={
          actionType === 'create-batch'
            ? 'تأكيد إنشاء أمر الشراء'
            : 'تأكيد اعتماد طلب البضاعة من المورد'
        }
        description="تتطلب لوائح الصيدلية إثبات هوية مسؤول المشتريات أو الصيدلي القائم بإصدار أوامر الشراء."
        actionButtonText="تأكيد واعتماد الإجراء"
        onConfirm={handleConfirmAction}
        onCancel={() => setIsPerformerModalOpen(false)}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};
