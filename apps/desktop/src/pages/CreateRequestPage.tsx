import React, { useState } from 'react';
import { api } from '../api/client';
import { PerformerPinModal } from '../components/common/PerformerPinModal';
import {
  ItemPriority,
  DosageForm,
  PRIORITY_LABELS,
} from '@pharmacy/shared';
import {
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Phone,
  User,
  Hash,
  Pill,
  Sparkles,
  Info,
} from 'lucide-react';

interface ItemFormState {
  productName: string;
  strength: string;
  dosageForm: string;
  requestedQuantity: number;
  priority: ItemPriority;
  notes: string;
}

export const CreateRequestPage: React.FC<{ onCreated?: () => void }> = ({ onCreated }) => {
  // Customer info
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerCode, setCustomerCode] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');

  // Items
  const [items, setItems] = useState<ItemFormState[]>([
    {
      productName: '',
      strength: '',
      dosageForm: DosageForm.TABLETS,
      requestedQuantity: 1,
      priority: ItemPriority.NORMAL,
      notes: '',
    },
  ]);

  // Duplicate checks
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Performer Modal & State
  const [isPerformerModalOpen, setIsPerformerModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const checkDuplicates = async (phone: string, productName: string) => {
    if (!phone && !productName) return;
    try {
      const res = await api.get('/orders/check-duplicates', {
        params: { phone: phone || undefined, productName: productName || undefined },
      });
      if (res.data.hasDuplicates && res.data.items.length > 0) {
        const first = res.data.items[0];
        setDuplicateWarning(
          `تنبيه: يوجد طلب سابق مسجل لنفس العميل أو الصنف (${first.productNameCustom}) برقم ${first.order.requestNumber} بحالة (${first.status}).`
        );
      } else {
        setDuplicateWarning(null);
      }
    } catch (e) {
      // ignore
    }
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        productName: '',
        strength: '',
        dosageForm: DosageForm.TABLETS,
        requestedQuantity: 1,
        priority: ItemPriority.NORMAL,
        notes: '',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof ItemFormState, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);

    if (field === 'productName' && value.length > 2) {
      checkDuplicates(customerPhone, value);
    }
  };

  const handleInitiateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!customerPhone.trim() || customerPhone.trim().length < 6) {
      setErrorMessage('يرجى إدخال رقم هاتف صحيح للعميل (6 أرقام على الأقل)');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      if (!items[i].productName.trim()) {
        setErrorMessage(`يرجى إدخال اسم الدواء للصنف رقم (${i + 1})`);
        return;
      }
      if (items[i].requestedQuantity < 1) {
        setErrorMessage(`الكمية المطلوبة للصنف رقم (${i + 1}) يجب أن تكون 1 على الأقل`);
        return;
      }
    }

    // Open attribution confirmation dialog
    setIsPerformerModalOpen(true);
  };

  const handleConfirmOrder = async (performerEmployeeId: string, performerPin: string) => {
    setIsSubmitting(true);
    try {
      const payload = {
        customerPhone: customerPhone.trim(),
        customerName: customerName.trim() || undefined,
        customerCode: customerCode.trim() || undefined,
        notes: orderNotes.trim() || undefined,
        performerEmployeeId,
        performerPin,
        items: items.map((it) => ({
          productName: it.productName.trim(),
          strength: it.strength.trim() || undefined,
          dosageForm: it.dosageForm,
          requestedQuantity: Number(it.requestedQuantity),
          priority: it.priority,
          notes: it.notes.trim() || undefined,
        })),
      };

      const res = await api.post('/orders', payload);

      setSuccessMessage(`تم تسجيل وحفظ طلب النواقص بنجاح برقم (${res.data.requestNumber})`);
      setIsPerformerModalOpen(false);

      // Reset form
      setCustomerPhone('');
      setCustomerName('');
      setCustomerCode('');
      setOrderNotes('');
      setItems([
        {
          productName: '',
          strength: '',
          dosageForm: DosageForm.TABLETS,
          requestedQuantity: 1,
          priority: ItemPriority.NORMAL,
          notes: '',
        },
      ]);
      setDuplicateWarning(null);

      if (onCreated) onCreated();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'حدث خطأ أثناء حفظ الطلب';
      throw new Error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Pill className="w-6 h-6 text-brand-600" />
            <span>تسجيل طلب نواقص جديد للصيدلية</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            تسجيل سريع لأصناف الأدوية غير المتوفرة وربطها برقم هاتف العميل للتوريد والتنبيه الفوري.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl font-bold text-xs flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-300 text-rose-800 rounded-2xl font-bold text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {duplicateWarning && (
        <div className="p-4 bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl font-semibold text-xs flex items-center gap-3">
          <Info className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <span>{duplicateWarning}</span>
        </div>
      )}

      <form onSubmit={handleInitiateSubmit} className="space-y-6">
        {/* Customer Information Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="font-extrabold text-sm text-slate-800 pb-3 border-b border-slate-100 flex items-center gap-2">
            <User className="w-4 h-4 text-brand-600" />
            <span>بيانات العميل صاحب الطلب</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-brand-600" />
                رقم هاتف العميل (إلزامي):
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => {
                  setCustomerPhone(e.target.value);
                  checkDuplicates(e.target.value, items[0]?.productName);
                }}
                placeholder="مثال: 01012345678"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                اسم العميل (اختياري):
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="اسم العميل إن توفر"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-brand-600" />
                كود العميل / رقم الملف (اختياري):
              </label>
              <input
                type="text"
                value={customerCode}
                onChange={(e) => setCustomerCode(e.target.value)}
                placeholder="مثال: CUST-042"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Missing Items List Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-600" />
              <span>الأصناف المطلوبة غير المتوفرة ({items.length})</span>
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة صنف آخر لنفس الطلب</span>
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 relative space-y-3"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px] font-black">
                      {idx + 1}
                    </span>
                    بيانات الصنف الدوائي:
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-rose-600 hover:text-rose-700 p-1 rounded hover:bg-rose-50"
                      title="حذف هذا الصنف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      اسم الصنف التجاري / العلمي:
                    </label>
                    <input
                      type="text"
                      value={item.productName}
                      onChange={(e) => handleItemChange(idx, 'productName', e.target.value)}
                      placeholder="مثال: Panadol Extra, Concor, Augmentin"
                      required
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      التركيز / القوة (إن وجد):
                    </label>
                    <input
                      type="text"
                      value={item.strength}
                      onChange={(e) => handleItemChange(idx, 'strength', e.target.value)}
                      placeholder="مثال: 500mg, 1g, 0.1%"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      الشكل الصيدلاني:
                    </label>
                    <select
                      value={item.dosageForm}
                      onChange={(e) => handleItemChange(idx, 'dosageForm', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      {Object.values(DosageForm).map((form) => (
                        <option key={form} value={form}>
                          {form}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      الكمية المطلوبة (علب/وحدات):
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={item.requestedQuantity}
                      onChange={(e) =>
                        handleItemChange(idx, 'requestedQuantity', Math.max(1, parseInt(e.target.value) || 1))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      درجة الأهمية والأولوية:
                    </label>
                    <select
                      value={item.priority}
                      onChange={(e) => handleItemChange(idx, 'priority', e.target.value as ItemPriority)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value={ItemPriority.NORMAL}>{PRIORITY_LABELS.NORMAL}</option>
                      <option value={ItemPriority.URGENT}>{PRIORITY_LABELS.URGENT}</option>
                      <option value={ItemPriority.EMERGENCY}>{PRIORITY_LABELS.EMERGENCY}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      ملاحظات خاصة بالصنف:
                    </label>
                    <input
                      type="text"
                      value={item.notes}
                      onChange={(e) => handleItemChange(idx, 'notes', e.target.value)}
                      placeholder="بديل مقبول، تشغيلة معينة، ..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* General Order Notes */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            ملاحظات عامة على الطلب (اختياري):
          </label>
          <textarea
            rows={2}
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            placeholder="أي تعليمات إضافية بخصوص مواعيد الاتصال بالعميل أو التوصيل..."
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
          ></textarea>
        </div>

        {/* Form Submission Button */}
        <div className="flex justify-end gap-3">
          <button
            type="submit"
            className="px-8 py-3.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-black text-sm rounded-xl shadow-lg shadow-brand-600/30 transition-all flex items-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>حفظ الطلب وتأكيد الموظف المنفذ</span>
          </button>
        </div>
      </form>

      {/* Performer PIN Modal */}
      <PerformerPinModal
        isOpen={isPerformerModalOpen}
        title="تأكيد حفظ طلب النواقص بالصيدلية"
        description="يرجى اختيار اسمك من قائمة الموظفين النشطين وإدخال الرمز السري (PIN) لتسجيل وتوثيق العملية في سجل الرقابة والمحاسبة."
        actionButtonText="تأكيد وحفظ الطلب نهائياً"
        onConfirm={handleConfirmOrder}
        onCancel={() => setIsPerformerModalOpen(false)}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};
