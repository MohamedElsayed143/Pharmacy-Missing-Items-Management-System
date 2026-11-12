import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { PerformerPinModal } from './PerformerPinModal';
import {
  WhatsAppMessageType,
  WhatsAppPreviewDto,
  WHATSAPP_MESSAGE_TYPE_LABELS,
  ORDER_ITEM_STATUS_LABELS,
  OrderItemStatus,
} from '@pharmacy/shared';
import {
  MessageSquare,
  Send,
  X,
  User,
  Phone,
  Pill,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Eye,
  EyeOff,
  Truck,
  Building2,
  ShieldCheck,
  RefreshCw,
  Edit3,
} from 'lucide-react';

interface WhatsAppComposerModalProps {
  isOpen: boolean;
  customerId: string;
  orderItemId?: string;
  orderId?: string;
  initialMessageType?: WhatsAppMessageType;
  onClose: () => void;
  onSuccess?: () => void;
}

export const WhatsAppComposerModal: React.FC<WhatsAppComposerModalProps> = ({
  isOpen,
  customerId,
  orderItemId,
  orderId,
  initialMessageType = WhatsAppMessageType.PRODUCT_ARRIVED,
  onClose,
  onSuccess,
}) => {
  const [previewData, setPreviewData] = useState<WhatsAppPreviewDto | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(true);
  const [messageType, setMessageType] = useState<WhatsAppMessageType>(initialMessageType);
  const [deliveryPreference, setDeliveryPreference] = useState<'HOME_DELIVERY' | 'STORE_PICKUP'>('HOME_DELIVERY');
  const [messageBody, setMessageBody] = useState<string>('');
  const [initialPopulatedBody, setInitialPopulatedBody] = useState<string>('');
  const [showPreviewBubble, setShowPreviewBubble] = useState<boolean>(false);

  // Address editing state
  const [isEditingAddress, setIsEditingAddress] = useState<boolean>(false);
  const [addressInput, setAddressInput] = useState<string>('');
  const [addressDetailsInput, setAddressDetailsInput] = useState<string>('');
  const [areaInput, setAreaInput] = useState<string>('');
  const [deliveryNotesInput, setDeliveryNotesInput] = useState<string>('');

  // Performer & Consent PIN Modals
  const [isPerformerModalOpen, setIsPerformerModalOpen] = useState<boolean>(false);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState<boolean>(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Alerts & Messages
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchPreview = async (msgType = messageType, delivPref = deliveryPreference) => {
    if (!customerId) return;
    setIsLoadingPreview(true);
    setFeedback(null);
    try {
      const res = await api.post<WhatsAppPreviewDto>('/whatsapp/messages/preview', {
        customerId,
        orderItemId,
        messageType: msgType,
        deliveryPreference: delivPref,
      });
      setPreviewData(res.data);
      setMessageBody(res.data.defaultMessageBody);
      setInitialPopulatedBody(res.data.defaultMessageBody);

      if (res.data.customer.address) {
        setAddressInput(res.data.customer.address);
        setAddressDetailsInput(res.data.customer.addressDetails || '');
        setAreaInput(res.data.customer.area || '');
        setDeliveryNotesInput(res.data.customer.deliveryNotes || '');
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || err.message || 'فشل تحميل بيانات ومعاينة الرسالة',
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  useEffect(() => {
    if (isOpen && customerId) {
      setMessageType(initialMessageType);
      fetchPreview(initialMessageType, deliveryPreference);
      setIsEditingAddress(false);
      setShowPreviewBubble(false);
    }
  }, [isOpen, customerId, orderItemId]);

  if (!isOpen) return null;

  const handleMessageTypeChange = (newType: WhatsAppMessageType) => {
    setMessageType(newType);
    fetchPreview(newType, deliveryPreference);
  };

  const handleDeliveryPreferenceChange = (newPref: 'HOME_DELIVERY' | 'STORE_PICKUP') => {
    setDeliveryPreference(newPref);
    if (messageType === WhatsAppMessageType.PRODUCT_ARRIVED) {
      fetchPreview(messageType, newPref);
    }
  };

  const handleCloseAttempt = () => {
    if (messageBody !== initialPopulatedBody && messageBody.trim().length > 0) {
      const confirmDiscard = window.confirm(
        'لديك تعديلات غير مرسلة على نص الرسالة. هل أنت متأكد من الإلغاء وإغلاق النافذة؟'
      );
      if (!confirmDiscard) return;
    }
    onClose();
  };

  // Submit actual WhatsApp message with PIN attribution
  const handleConfirmSend = async (performerEmployeeId: string, performerPin: string) => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const payload = {
        customerId,
        orderItemId,
        orderId,
        messageType,
        messageBody: messageBody.trim(),
        deliveryPreference,
        performerEmployeeId,
        performerPin,
      };

      const res = await api.post('/whatsapp/messages/send', payload);

      setFeedback({
        type: 'success',
        message: res.data.message || 'تم إرسال رسالة الواتساب وتوثيقها بنجاح',
      });
      setIsPerformerModalOpen(false);

      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'فشل إرسال رسالة الواتساب';
      throw new Error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Record customer consent with PIN attribution
  const handleConfirmConsent = async (performerEmployeeId: string, performerPin: string) => {
    try {
      await api.patch(`/whatsapp/customer/${customerId}/consent`, {
        consent: true,
        source: 'IN_STORE_VERBAL',
        performerEmployeeId,
        performerPin,
      });
      setIsConsentModalOpen(false);
      setFeedback({
        type: 'success',
        message: 'تم تسجيل وتوثيق موافقة العميل على استقبال رسائل الواتساب بنجاح.',
      });
      fetchPreview();
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'فشل توثيق موافقة العميل');
    }
  };

  // Save customer address with PIN attribution
  const handleConfirmAddress = async (performerEmployeeId: string, performerPin: string) => {
    try {
      await api.patch(`/whatsapp/customer/${customerId}/address`, {
        address: addressInput.trim(),
        addressDetails: addressDetailsInput.trim() || undefined,
        area: areaInput.trim() || undefined,
        deliveryNotes: deliveryNotesInput.trim() || undefined,
        performerEmployeeId,
        performerPin,
      });
      setIsAddressModalOpen(false);
      setIsEditingAddress(false);
      setFeedback({
        type: 'success',
        message: 'تم حفظ وتحديث عنوان العميل بنجاح.',
      });
      fetchPreview();
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'فشل حفظ عنوان العميل');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-gradient-to-l from-emerald-600 to-teal-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-base flex items-center gap-2">
                <span>إرسال إشعار للعميل عبر WhatsApp الرسمي</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/40 text-emerald-100 font-mono">
                  Meta Cloud API
                </span>
              </h3>
              <p className="text-[11px] text-emerald-100 mt-0.5">
                مراجعة وتعديل نص الرسالة قبل الإرسال من رقم الصيدلية المعتمد
              </p>
            </div>
          </div>
          <button
            onClick={handleCloseAttempt}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback alert */}
        {feedback && (
          <div
            className={`p-3.5 mx-6 mt-4 rounded-xl text-xs font-bold flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                : 'bg-rose-50 border border-rose-300 text-rose-800'
            }`}
          >
            <span>{feedback.message}</span>
            <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-70">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {isLoadingPreview ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
              <span>جاري تحميل بيانات العميل وإعداد المعاينة...</span>
            </div>
          ) : previewData ? (
            <>
              {/* Customer Info Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 pb-2 border-b border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-600" />
                    <span>العميل: {previewData.customer.name || 'عميل غير مسجل الاسم'}</span>
                    {previewData.customer.customerCode && (
                      <span className="text-[11px] text-slate-500 font-mono">
                        ({previewData.customer.customerCode})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60 font-bold">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{previewData.formattedPhone || previewData.recipientPhone}</span>
                  </div>
                </div>

                {previewData.orderItem && (
                  <div className="flex items-center justify-between text-xs text-slate-700">
                    <div className="flex items-center gap-1.5">
                      <Pill className="w-4 h-4 text-emerald-600" />
                      <span>الصنف المطلوب: </span>
                      <strong className="text-slate-900 font-bold">
                        {previewData.orderItem.productNameCustom}
                      </strong>
                      <span className="text-slate-500 font-bold">
                        ({previewData.orderItem.requestedQuantity} علبة)
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500">
                      الحالة: {ORDER_ITEM_STATUS_LABELS[previewData.orderItem.status as OrderItemStatus]}
                    </span>
                  </div>
                )}

                {/* Saved Address Info */}
                <div className="pt-2 border-t border-slate-200/60 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold">عنوان التوصيل:</span>
                      {previewData.customer.address ? (
                        <span className="text-slate-900 font-medium">
                          {previewData.customer.address}
                          {previewData.customer.area ? ` - ${previewData.customer.area}` : ''}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">لا يوجد عنوان مسجل مسبقاً</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingAddress(!isEditingAddress)}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>{isEditingAddress ? 'إلغاء التعديل' : 'تحديث العنوان'}</span>
                    </button>
                  </div>

                  {isEditingAddress && (
                    <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-0.5">العنوان بالتفصيل:</label>
                          <input
                            type="text"
                            value={addressInput}
                            onChange={(e) => setAddressInput(e.target.value)}
                            placeholder="الشارع، رقم العمارة، الشقة..."
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-0.5">المنطقة / الحي:</label>
                          <input
                            type="text"
                            value={areaInput}
                            onChange={(e) => setAreaInput(e.target.value)}
                            placeholder="مثال: مدينة نصر، المعادي..."
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setIsAddressModalOpen(true)}
                          disabled={!addressInput.trim()}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-colors"
                        >
                          تأكيد وحفظ العنوان بالملف
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Badges: Consent & 24h Window */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Consent Status */}
                <div
                  className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                    previewData.customerHasConsent
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50/80 border-amber-200 text-amber-900'
                  }`}
                >
                  {previewData.customerHasConsent ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="font-bold">
                      {previewData.customerHasConsent
                        ? 'موافقة العميل على واتساب موثقة'
                        : 'لم تسجل موافقة العميل بعد'}
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      {previewData.customerHasConsent ? (
                        'العميل مسجل كموافق على استلام الإشعارات.'
                      ) : (
                        <div className="space-y-1">
                          <span>يلزم أخذ موافقة العميل قبل الإرسال.</span>
                          <button
                            type="button"
                            onClick={() => setIsConsentModalOpen(true)}
                            className="block px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-[11px] mt-1 shadow-sm transition-colors"
                          >
                            توثيق موافقة العميل الآن (شفهية بالصيدلية)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 24-Hour Messaging Window */}
                <div
                  className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                    previewData.isInside24HourWindow
                      ? 'bg-teal-50/80 border-teal-200 text-teal-900'
                      : 'bg-blue-50/80 border-blue-200 text-blue-900'
                  }`}
                >
                  <Clock className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-bold">
                      {previewData.isInside24HourWindow
                        ? 'نافذة التواصل المباشر (24 ساعة) مفتوحة'
                        : 'نافذة التواصل المباشر مغلقة (إرسال عبر القالب)'}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {previewData.isInside24HourWindow
                        ? 'العميل راسل الصيدلية حديثاً، مسموح بالنص الحر وتعديل الرسالة بحرية.'
                        : 'لم يراسلنا العميل خلال 24 ساعة؛ تلزم سياسة Meta استخدام قالب معتمد.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Event Type & Delivery Preference Pickers */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">نوع الإشعار المراد إرساله:</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleMessageTypeChange(WhatsAppMessageType.PRODUCT_ARRIVED)}
                    className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all ${
                      messageType === WhatsAppMessageType.PRODUCT_ARRIVED
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>إشعار وصول الصنف (الحمد لله وصل)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMessageTypeChange(WhatsAppMessageType.PRODUCT_ORDERED)}
                    className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all ${
                      messageType === WhatsAppMessageType.PRODUCT_ORDERED
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>إشعار تم طلب الصنف من المورد</span>
                  </button>
                </div>
              </div>

              {/* Delivery Preference Switch (When arrival message is selected) */}
              {messageType === WhatsAppMessageType.PRODUCT_ARRIVED && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="font-bold text-slate-700">تفضيل العميل المذكور بالرسالة:</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleDeliveryPreferenceChange('HOME_DELIVERY')}
                      className={`flex-1 py-1.5 px-3 rounded-lg border font-bold flex items-center justify-center gap-1.5 transition-all ${
                        deliveryPreference === 'HOME_DELIVERY'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>عرض التوصيل المنزلي (تحب نبعتلك على البيت؟ 🛵)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeliveryPreferenceChange('STORE_PICKUP')}
                      className={`flex-1 py-1.5 px-3 rounded-lg border font-bold flex items-center justify-center gap-1.5 transition-all ${
                        deliveryPreference === 'STORE_PICKUP'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>استلام من الصيدلية 🏬</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Editable Message Editor */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <span>محرر نص الرسالة (قابل للتعديل والمراجعة):</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowPreviewBubble(!showPreviewBubble)}
                      className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 text-[11px]"
                    >
                      {showPreviewBubble ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showPreviewBubble ? 'إخفاء المعاينة الواقعية' : 'معاينة شكل المحادثة'}</span>
                    </button>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {messageBody.length} حرف
                    </span>
                  </div>
                </div>

                <textarea
                  rows={5}
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  dir="rtl"
                  placeholder="اكتب أو عدل نص الرسالة التي ستصل للعميل..."
                  className="w-full p-3.5 rounded-2xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm leading-relaxed"
                ></textarea>
              </div>

              {/* Realistic WhatsApp Chat Bubble Preview */}
              {showPreviewBubble && (
                <div className="p-4 bg-[#e5ddd5] rounded-2xl border border-[#d1c7be] space-y-2 animate-fadeIn">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
                    معاينة شكل الرسالة كما ستظهر على هاتف العميل:
                  </div>
                  <div className="flex justify-end">
                    <div className="max-w-[85%] bg-[#dcf8c6] p-3 rounded-2xl rounded-tl-none shadow-sm text-xs font-normal text-slate-900 leading-relaxed space-y-1 whitespace-pre-wrap">
                      <p>{messageBody}</p>
                      <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 font-mono pt-1">
                        <span>الآن</span>
                        <span className="text-[#34b7f1] font-bold">✓✓</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Destination phone & simulation note */}
              <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 gap-2">
                <span className="flex items-center gap-1">
                  <span>الرقم المستهدف للإرسال:</span>
                  <strong className="font-mono text-slate-800 font-bold">
                    {previewData.formattedPhone || previewData.recipientPhone}
                  </strong>
                </span>
                {previewData.isSimulatedMode && (
                  <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                    ⚠️ وضع المحاكاة: Meta API غير مفعل، سيتم توثيق العملية داخلياً
                  </span>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Actions */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleCloseAttempt}
            disabled={isSubmitting}
            className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={() => setIsPerformerModalOpen(true)}
            disabled={isSubmitting || !previewData?.customerHasConsent || !messageBody.trim()}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>تأكيد واعتماد إرسال الواتساب</span>
          </button>
        </div>
      </div>

      {/* Performer PIN Modal for Message Sending */}
      <PerformerPinModal
        isOpen={isPerformerModalOpen}
        title="تأكيد اعتماد إرسال رسالة الواتساب للعميل"
        description="وفقاً لسياسة الصيدلية، يتطلب إرسال أي تواصل رسمي للعملاء عبر WhatsApp التحقق من هوية الصيدلي المنفذ وتأكيد الرمز السري الشخصي (PIN)."
        actionButtonText="تأكيد وإرسال الرسالة الآن"
        onConfirm={handleConfirmSend}
        onCancel={() => setIsPerformerModalOpen(false)}
        isSubmitting={isSubmitting}
      />

      {/* Performer PIN Modal for Recording Consent */}
      <PerformerPinModal
        isOpen={isConsentModalOpen}
        title="توثيق موافقة العميل على استقبال رسائل الواتساب"
        description="يرجى إدخال الرمز السري لتأكيد أن العميل قد أبدى موافقته الصريحة على استلام إشعارات الأدوية عبر تطبيق الواتساب."
        actionButtonText="توثيق الموافقة"
        onConfirm={handleConfirmConsent}
        onCancel={() => setIsConsentModalOpen(false)}
        isSubmitting={isSubmitting}
      />

      {/* Performer PIN Modal for Saving Address */}
      <PerformerPinModal
        isOpen={isAddressModalOpen}
        title="تأكيد حفظ عنوان التوصيل للعميل"
        description="يرجى إدخال الرمز السري لتحديث وتثبيت عنوان العميل في قاعدة بيانات الصيدلية."
        actionButtonText="حفظ العنوان"
        onConfirm={handleConfirmAddress}
        onCancel={() => setIsAddressModalOpen(false)}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};
