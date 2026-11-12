import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useSocket } from '../context/SocketContext';
import { PerformerPinModal } from '../components/common/PerformerPinModal';
import { StatusBadge, PriorityBadge } from '../components/common/Badge';
import {
  OrderItemDto,
  OrderItemStatus,
  ORDER_ITEM_STATUS_LABELS,
} from '@pharmacy/shared';
import {
  PackageCheck,
  CheckCircle2,
  PhoneCall,
  UserCheck,
  RefreshCw,
  Search,
  AlertTriangle,
  ArrowRight,
  X,
  Truck,
} from 'lucide-react';

export const ReceivingPage: React.FC = () => {
  const { subscribe } = useSocket();
  const [activeSubTab, setActiveSubTab] = useState<'receive-inflow' | 'customer-delivery'>('receive-inflow');

  // Items awaiting arrival (ORDERED, PARTIALLY_RECEIVED, ADDED_TO_PURCHASE)
  const [pendingItems, setPendingItems] = useState<OrderItemDto[]>([]);
  // Items arrived awaiting customer pickup (RECEIVED, PARTIALLY_RECEIVED, CUSTOMER_NOTIFIED)
  const [pickupItems, setPickupItems] = useState<OrderItemDto[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  // Receiving Modal
  const [selectedItemForReceive, setSelectedItemForReceive] = useState<OrderItemDto | null>(null);
  const [receivedQtyInput, setReceivedQtyInput] = useState<number>(1);
  const [receiveNotes, setReceiveNotes] = useState<string>('');

  // Performer Modal State
  const [isPerformerModalOpen, setIsPerformerModalOpen] = useState<boolean>(false);
  const [performerAction, setPerformerAction] = useState<'receive' | 'notify' | 'deliver'>('receive');
  const [targetItemId, setTargetItemId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const [pendingRes, pickupRes] = await Promise.all([
        api.get('/orders/items', {
          params: {
            limit: 50,
            search: search || undefined,
            status: undefined, // we filter below
          },
        }),
        api.get('/orders/items', {
          params: {
            limit: 50,
            search: search || undefined,
          },
        }),
      ]);

      const allItems: OrderItemDto[] = pendingRes.data.data;

      // Pending receiving: ORDERED or PARTIALLY_RECEIVED or REVIEWED or ADDED_TO_PURCHASE
      setPendingItems(
        allItems.filter(
          (it) =>
            it.status === OrderItemStatus.ORDERED ||
            it.status === OrderItemStatus.PARTIALLY_RECEIVED ||
            it.status === OrderItemStatus.ADDED_TO_PURCHASE ||
            it.status === OrderItemStatus.NEW
        )
      );

      // Pickup ready: RECEIVED or CUSTOMER_NOTIFIED or PARTIALLY_RECEIVED
      setPickupItems(
        allItems.filter(
          (it) =>
            it.status === OrderItemStatus.RECEIVED ||
            it.status === OrderItemStatus.CUSTOMER_NOTIFIED ||
            (it.status === OrderItemStatus.PARTIALLY_RECEIVED && it.receivedQuantity > 0)
        )
      );
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();

    const unsubOrder = subscribe('order:created', () => fetchItems());
    const unsubStatus = subscribe('orderItem:statusChanged', () => fetchItems());
    const unsubRecv = subscribe('item:received', () => fetchItems());

    return () => {
      unsubOrder();
      unsubStatus();
      unsubRecv();
    };
  }, [search]);

  const handleOpenReceiveModal = (item: OrderItemDto) => {
    setSelectedItemForReceive(item);
    const remaining = Math.max(1, item.requestedQuantity - item.receivedQuantity);
    setReceivedQtyInput(remaining);
    setReceiveNotes('');
  };

  const handleStartPerformerCheck = (action: 'receive' | 'notify' | 'deliver', itemId: string) => {
    setPerformerAction(action);
    setTargetItemId(itemId);
    setIsPerformerModalOpen(true);
  };

  const handleConfirmAction = async (performerEmployeeId: string, performerPin: string) => {
    setIsSubmitting(true);
    try {
      if (performerAction === 'receive' && selectedItemForReceive) {
        await api.post('/receiving/receive-items', {
          allocations: [
            {
              orderItemId: selectedItemForReceive.id,
              quantityReceived: Number(receivedQtyInput),
            },
          ],
          notes: receiveNotes.trim() || undefined,
          performerEmployeeId,
          performerPin,
        });

        setSelectedItemForReceive(null);
        setIsPerformerModalOpen(false);
        setFeedback({ type: 'success', text: 'تم تسجيل استلام الصنف بنجاح وتحديث الكمية المستلمة' });
        fetchItems();
      } else if (performerAction === 'notify' && targetItemId) {
        await api.post('/receiving/notify-customer', {
          orderItemId: targetItemId,
          notes: 'تم التواصل مع العميل وإبلاغه بتوفر الصنف للاستلام',
          performerEmployeeId,
          performerPin,
        });

        setIsPerformerModalOpen(false);
        setFeedback({ type: 'success', text: 'تم تسجيل إبلاغ العميل بنجاح' });
        fetchItems();
      } else if (performerAction === 'deliver' && targetItemId) {
        await api.post('/receiving/deliver-to-customer', {
          orderItemId: targetItemId,
          notes: 'تم تسليم الصنف للعميل بالصيدلية وإغلاق الطلب',
          performerEmployeeId,
          performerPin,
        });

        setIsPerformerModalOpen(false);
        setFeedback({ type: 'success', text: 'تم تأكيد تسليم الصنف للعميل وإغلاق الطلب بنجاح' });
        fetchItems();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'حدث خطأ أثناء تنفيذ الإجراء';
      throw new Error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <PackageCheck className="w-6 h-6 text-brand-600" />
            <span>استلام الواردات وتسليم طلبيات العملاء</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            تسجيل وصول الأدوية للصيدلية، إبلاغ العملاء هاتفياً، وتسليم المنتجات وإغلاق الطلبات.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActiveSubTab('receive-inflow')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeSubTab === 'receive-inflow'
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            تسجيل البضاعة المستلمة ({pendingItems.length})
          </button>
          <button
            onClick={() => setActiveSubTab('customer-delivery')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeSubTab === 'customer-delivery'
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            إبلاغ وتسليم العملاء ({pickupItems.length})
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border border-rose-300 text-rose-800'
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Subtab 1: Receive incoming goods */}
      {activeSubTab === 'receive-inflow' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              الأصناف المعلقة بانتظار الشحن والتوريد للصيدلية:
            </span>
            <button
              onClick={() => fetchItems()}
              className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-lg text-xs"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase">
                <tr>
                  <th className="px-4 py-3.5">رقم الطلب</th>
                  <th className="px-4 py-3.5">اسم الصنف والتركيز</th>
                  <th className="px-4 py-3.5">الكمية المطلوبة</th>
                  <th className="px-4 py-3.5">المستلم حتى الآن</th>
                  <th className="px-4 py-3.5">المتبقي للاكتمال</th>
                  <th className="px-4 py-3.5">العميل المنتظر</th>
                  <th className="px-4 py-3.5">الأولوية</th>
                  <th className="px-4 py-3.5">الحالة</th>
                  <th className="px-4 py-3.5 text-center">إجراء الاستلام</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      جاري التحميل...
                    </td>
                  </tr>
                ) : pendingItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      لا توجد أصناف معلقة بانتظار الاستلام حالياً.
                    </td>
                  </tr>
                ) : (
                  pendingItems.map((item) => {
                    const remaining = item.requestedQuantity - item.receivedQuantity;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5 font-mono font-bold text-brand-700">
                          {item.order?.requestNumber}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-900">
                          {item.productNameCustom}{' '}
                          {item.strength && (
                            <span className="text-slate-500 font-normal">({item.strength})</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-bold">{item.requestedQuantity}</td>
                        <td className="px-4 py-3.5 font-bold text-emerald-700">
                          {item.receivedQuantity}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-amber-700">{remaining}</td>
                        <td className="px-4 py-3.5 font-mono text-slate-600">
                          {item.order?.customer?.phone}
                        </td>
                        <td className="px-4 py-3.5">
                          <PriorityBadge priority={item.priority} />
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            onClick={() => handleOpenReceiveModal(item)}
                            className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 mx-auto"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>تسجيل استلام وارد</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab 2: Customer notification and pickup */}
      {activeSubTab === 'customer-delivery' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              الأصناف المتوفرة بالصيدلية وجاهزة للإبلاغ والتسليم للعملاء:
            </span>
            <button
              onClick={() => fetchItems()}
              className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-lg text-xs"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase">
                <tr>
                  <th className="px-4 py-3.5">رقم الطلب</th>
                  <th className="px-4 py-3.5">اسم الصنف والتركيز</th>
                  <th className="px-4 py-3.5">الكمية الجاهزة</th>
                  <th className="px-4 py-3.5">هاتف العميل</th>
                  <th className="px-4 py-3.5">اسم العميل</th>
                  <th className="px-4 py-3.5">الحالة الحالية</th>
                  <th className="px-4 py-3.5 text-center">إجراءات العميل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      جاري التحميل...
                    </td>
                  </tr>
                ) : pickupItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      لا توجد أصناف جاهزة للتسليم حالياً.
                    </td>
                  </tr>
                ) : (
                  pickupItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-brand-700">
                        {item.order?.requestNumber}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        {item.productNameCustom}{' '}
                        {item.strength && (
                          <span className="text-slate-500 font-normal">({item.strength})</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-extrabold text-emerald-700">
                        {item.receivedQuantity} علبة
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-800">
                        {item.order?.customer?.phone}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {item.order?.customer?.name || 'غير مسجل'}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Notify Button */}
                          {item.status === OrderItemStatus.RECEIVED && (
                            <button
                              onClick={() => handleStartPerformerCheck('notify', item.id)}
                              className="px-2.5 py-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                              title="تسجيل إبلاغ العميل هاتفياً"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                              <span>إبلاغ العميل</span>
                            </button>
                          )}

                          {/* Deliver Button */}
                          <button
                            onClick={() => handleStartPerformerCheck('deliver', item.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                            title="تسليم الصنف للعميل بالصيدلية وإغلاق الطلب"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>تسليم للعميل</span>
                          </button>
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

      {/* Receive Input Modal */}
      {selectedItemForReceive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-brand-600 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">تسجيل استلام وارد بالصيدلية</h3>
              <button
                onClick={() => setSelectedItemForReceive(null)}
                className="p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                <div>
                  الصنف:{' '}
                  <strong className="text-slate-900 font-bold">
                    {selectedItemForReceive.productNameCustom}
                  </strong>
                </div>
                <div>
                  إجمالي الكمية المطلوبة:{' '}
                  <strong>{selectedItemForReceive.requestedQuantity}</strong> وحدة
                </div>
                <div>
                  المستلم سابقاً:{' '}
                  <strong className="text-emerald-700">
                    {selectedItemForReceive.receivedQuantity}
                  </strong>{' '}
                  وحدة
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الكمية المستلمة في هذه الشحنة:
                </label>
                <input
                  type="number"
                  min={1}
                  value={receivedQtyInput}
                  onChange={(e) => setReceivedQtyInput(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  إذا كانت الكمية أقل من المطلوب، سيتحول الصنف تلقائياً إلى حالة (وصول جزئي).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات الاستلام (اختياري):
                </label>
                <input
                  type="text"
                  value={receiveNotes}
                  onChange={(e) => setReceiveNotes(e.target.value)}
                  placeholder="رقم الفاتورة، تاريخ الصلاحية، ..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedItemForReceive(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => handleStartPerformerCheck('receive', selectedItemForReceive.id)}
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
          performerAction === 'receive'
            ? 'تأكيد استلام بضاعة بالصيدلية'
            : performerAction === 'notify'
            ? 'تأكيد إبلاغ العميل'
            : 'تأكيد تسليم الصنف للعميل'
        }
        description="تتطلب الصيدلية إثبات هوية الصيدلي الذي قام بتنفيذ الإجراء وإدخال الرمز السري الشخصي (PIN)."
        actionButtonText="تأكيد العملية الآن"
        onConfirm={handleConfirmAction}
        onCancel={() => setIsPerformerModalOpen(false)}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};
