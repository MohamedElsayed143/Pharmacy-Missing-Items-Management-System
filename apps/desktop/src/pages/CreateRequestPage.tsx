import React, { useState } from 'react';
import { api } from '../api/client';
import { PerformerPinModal } from '../components/common/PerformerPinModal';
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
  FileText,
} from 'lucide-react';

interface ItemFormState {
  productName: string;
  requestedQuantity: number;
  notes: string;
}

export const CreateRequestPage: React.FC<{ onCreated?: () => void }> = ({ onCreated }) => {
  // Customer info (Preserved exactly as required)
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerCode, setCustomerCode] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');

  // Products (Simplified to ONLY 3 fields: productName, requestedQuantity, notes)
  const [items, setItems] = useState<ItemFormState[]>([
    {
      productName: '',
      requestedQuantity: 1,
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
        requestedQuantity: 1,
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
        setErrorMessage(`يرجى إدخال اسم الصنف الدوائي للصنف رقم (${i + 1})`);
        return;
      }
      const qty = Number(items[i].requestedQuantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        setErrorMessage(`الكمية المطلوبة للصنف رقم (${i + 1}) يجب أن تكون عدداً صحيحاً موجباً (1 على الأقل)`);
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
          requestedQuantity: Math.max(1, Math.floor(Number(it.requestedQuantity)) || 1),
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
          requestedQuantity: 1,
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
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Pill className="w-6 h-6 text-brand-600" />
            <span>تسجيل طلب نواقص جديد للصيدلية</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            تسجيل سريع ومبسط لأصناف الأدوية غير المتوفرة وربطها برقم هاتف العميل للتوريد والتنبيه الفوري.
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
        {/* Customer Information Card (Unchanged) */}
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

        {/* Missing Products Card (ONLY 3 FIELDS: Product Name, Quantity, Notes) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-600" />
              <span>الأصناف المطلوبة ({items.length})</span>
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="px-3.5 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة صنف آخر لنفس الطلب</span>
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 relative space-y-3.5 transition-all"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px] font-black">
                      {idx + 1}
                    </span>
                    <span>بيانات الصنف المطلوب:</span>
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-rose-600 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-100/60 transition-colors flex items-center gap-1 text-[11px] font-medium"
                      title="حذف هذا الصنف"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>حذف الصنف</span>
                    </button>
                  )}
                </div>

                {/* Field 1: Product Name & Field 2: Quantity */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Pill className="w-3.5 h-3.5 text-brand-600" />
                      اسم الصنف التجاري / العلمي (إلزامي):
                    </label>
                    <input
                      type="text"
                      value={item.productName}
                      onChange={(e) => handleItemChange(idx, 'productName', e.target.value)}
                      placeholder="مثال: Panadol Extra, Concor 5mg, Augmentin 1g"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      الكمية المطلوبة (إلزامي):
                    </label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={item.requestedQuantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        handleItemChange(idx, 'requestedQuantity', isNaN(val) || val < 1 ? 1 : val);
                      }}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-black text-center text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
                    />
                  </div>
                </div>

                {/* Field 3: Notes (Multiline Text Input) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-brand-600" />
                    ملاحظات خاصة بالصنف (اختياري):
                  </label>
                  <textarea
                    rows={2}
                    value={item.notes}
                    onChange={(e) => handleItemChange(idx, 'notes', e.target.value)}
                    placeholder="مثال: العميل يقبل بديلاً بنفس المادة الفعالة، عبوة أصلية فقط، مطلوب بشكل عاجل، إلخ..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none shadow-sm"
                  ></textarea>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* General Order Notes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
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
        <div className="flex justify-end gap-3 pt-2">
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
