import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useSocket } from '../../context/SocketContext';
import {
  WhatsAppMessageDto,
  WHATSAPP_MESSAGE_TYPE_LABELS,
  WHATSAPP_MESSAGE_STATUS_LABELS,
  WHATSAPP_MESSAGE_STATUS_COLORS,
} from '@pharmacy/shared';
import {
  MessageSquare,
  X,
  Clock,
  UserCheck,
  CheckCheck,
  AlertCircle,
  RefreshCw,
  Phone,
  Truck,
  Building2,
} from 'lucide-react';

interface WhatsAppHistoryModalProps {
  isOpen: boolean;
  customerId?: string;
  orderItemId?: string;
  customerName?: string;
  customerPhone?: string;
  onClose: () => void;
}

export const WhatsAppHistoryModal: React.FC<WhatsAppHistoryModalProps> = ({
  isOpen,
  customerId,
  orderItemId,
  customerName,
  customerPhone,
  onClose,
}) => {
  const { subscribe } = useSocket();
  const [messages, setMessages] = useState<WhatsAppMessageDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/whatsapp/messages', {
        params: {
          customerId: customerId || undefined,
          orderItemId: orderItemId || undefined,
          limit: 50,
        },
      });
      setMessages(res.data.data);
    } catch (e) {
      console.error('Failed to load WhatsApp messages', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMessages();

      const unsubCreate = subscribe('whatsapp:messageCreated', () => fetchMessages());
      const unsubStatus = subscribe('whatsapp:statusChanged', () => fetchMessages());

      return () => {
        unsubCreate();
        unsubStatus();
      };
    }
  }, [isOpen, customerId, orderItemId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm">سجل رسائل وتنبيهات WhatsApp</h3>
              <p className="text-[11px] text-slate-400">
                {customerName ? `${customerName} - ` : ''}
                {customerPhone ? `${customerPhone}` : 'جميع الإشعارات المسجلة'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-3">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-600" />
              <span>جاري تحميل سجل الرسائل...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              لا توجد رسائل واتساب مسجلة لهذا العميل / الصنف حتى الآن.
            </div>
          ) : (
            messages.map((msg) => {
              const statusColor = WHATSAPP_MESSAGE_STATUS_COLORS[msg.status] || {
                bg: 'bg-slate-100',
                text: 'text-slate-700',
                border: 'border-slate-300',
              };

              return (
                <div
                  key={msg.id}
                  className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50 space-y-2.5 text-xs transition-all hover:bg-white hover:shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">
                      {WHATSAPP_MESSAGE_TYPE_LABELS[msg.messageType] || msg.messageType}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}
                    >
                      {WHATSAPP_MESSAGE_STATUS_LABELS[msg.status] || msg.status}
                    </span>
                  </div>

                  <p className="text-slate-700 bg-white p-3 rounded-xl border border-slate-200/70 whitespace-pre-wrap leading-relaxed">
                    {msg.messageBody}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 font-medium">
                        <UserCheck className="w-3.5 h-3.5 text-brand-600" />
                        <span>المنفذ: {msg.sentByEmployee?.fullName || 'موظف'}</span>
                      </span>
                      {msg.deliveryPreference && (
                        <span className="flex items-center gap-1 text-slate-600 font-medium">
                          {msg.deliveryPreference === 'HOME_DELIVERY' ? (
                            <>
                              <Truck className="w-3 h-3 text-emerald-600" />
                              <span>توصيل منزلي</span>
                            </>
                          ) : (
                            <>
                              <Building2 className="w-3 h-3 text-blue-600" />
                              <span>استلام صيدلية</span>
                            </>
                          )}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 font-mono text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(msg.createdAt).toLocaleString('ar-EG')}</span>
                    </div>
                  </div>

                  {msg.failureReason && (
                    <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px] flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                      <span>سبب التعثر: {msg.failureReason}</span>
                    </div>
                  )}

                  {msg.isSimulated && (
                    <div className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 inline-block font-semibold">
                      وضع المحاكاة: تم التوثيق الداخلي فقط
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
