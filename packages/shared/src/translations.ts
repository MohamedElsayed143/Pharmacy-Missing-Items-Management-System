import {
  UserRole,
  ItemPriority,
  OrderItemStatus,
  OrderOverallStatus,
  PurchaseBatchStatus,
  WhatsAppMessageType,
  WhatsAppMessageStatus,
} from './enums';

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'مدير النظام (Admin)',
  [UserRole.EMPLOYEE]: 'صيدلي / موظف (Staff)',
  [UserRole.PURCHASING_MANAGER]: 'مسؤول المشتريات (Purchasing)',
};

export const PRIORITY_LABELS: Record<ItemPriority, string> = {
  [ItemPriority.NORMAL]: 'عادي',
  [ItemPriority.URGENT]: 'عاجل',
  [ItemPriority.EMERGENCY]: 'طارئ جداً',
};

export const PRIORITY_COLORS: Record<ItemPriority, { bg: string; text: string; border: string }> = {
  [ItemPriority.NORMAL]: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
  },
  [ItemPriority.URGENT]: {
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-300',
  },
  [ItemPriority.EMERGENCY]: {
    bg: 'bg-rose-100',
    text: 'text-rose-800',
    border: 'border-rose-300',
  },
};

export const ORDER_ITEM_STATUS_LABELS: Record<OrderItemStatus, string> = {
  [OrderItemStatus.NEW]: 'جديد',
  [OrderItemStatus.REVIEWED]: 'تمت المراجعة',
  [OrderItemStatus.ADDED_TO_PURCHASE]: 'مدرج للشراء',
  [OrderItemStatus.ORDERED]: 'تم الطلب من المورد',
  [OrderItemStatus.PARTIALLY_RECEIVED]: 'وصل جزئياً',
  [OrderItemStatus.RECEIVED]: 'وصل بالصيدلية (جاهز للتسليم)',
  [OrderItemStatus.CUSTOMER_NOTIFIED]: 'تم إبلاغ العميل',
  [OrderItemStatus.DELIVERED]: 'تم التسليم للعميل',
  [OrderItemStatus.CANCELLED]: 'ملغي',
};

export const ORDER_ITEM_STATUS_COLORS: Record<
  OrderItemStatus,
  { bg: string; text: string; dot: string }
> = {
  [OrderItemStatus.NEW]: {
    bg: 'bg-blue-50 text-blue-700 border-blue-200',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
  [OrderItemStatus.REVIEWED]: {
    bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    text: 'text-indigo-700',
    dot: 'bg-indigo-500',
  },
  [OrderItemStatus.ADDED_TO_PURCHASE]: {
    bg: 'bg-purple-50 text-purple-700 border-purple-200',
    text: 'text-purple-700',
    dot: 'bg-purple-500',
  },
  [OrderItemStatus.ORDERED]: {
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  [OrderItemStatus.PARTIALLY_RECEIVED]: {
    bg: 'bg-orange-50 text-orange-700 border-orange-200',
    text: 'text-orange-700',
    dot: 'bg-orange-500',
  },
  [OrderItemStatus.RECEIVED]: {
    bg: 'bg-teal-50 text-teal-700 border-teal-200',
    text: 'text-teal-700',
    dot: 'bg-teal-500',
  },
  [OrderItemStatus.CUSTOMER_NOTIFIED]: {
    bg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    text: 'text-cyan-700',
    dot: 'bg-cyan-500',
  },
  [OrderItemStatus.DELIVERED]: {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  [OrderItemStatus.CANCELLED]: {
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    text: 'text-rose-700',
    dot: 'bg-rose-500',
  },
};

export const PURCHASE_BATCH_STATUS_LABELS: Record<PurchaseBatchStatus, string> = {
  [PurchaseBatchStatus.DRAFT]: 'مسودة',
  [PurchaseBatchStatus.ORDERED]: 'تم الإرسال للمورد',
  [PurchaseBatchStatus.PARTIALLY_RECEIVED]: 'وارد جزئي',
  [PurchaseBatchStatus.COMPLETED]: 'مكتمل الاستلام',
  [PurchaseBatchStatus.CANCELLED]: 'ملغي',
};

export const ORDER_OVERALL_STATUS_LABELS: Record<OrderOverallStatus, string> = {
  [OrderOverallStatus.OPEN]: 'مفتوح',
  [OrderOverallStatus.IN_PROGRESS]: 'قيد المعالجة والتوريد',
  [OrderOverallStatus.COMPLETED]: 'مكتمل',
  [OrderOverallStatus.CANCELLED]: 'ملغي',
};

export const WHATSAPP_MESSAGE_TYPE_LABELS: Record<WhatsAppMessageType, string> = {
  [WhatsAppMessageType.PRODUCT_ORDERED]: 'إشعار بطلب الصنف من المورد',
  [WhatsAppMessageType.PRODUCT_ARRIVED]: 'إشعار بوصول الصنف للصيدلية',
  [WhatsAppMessageType.ADDRESS_CONFIRMATION]: 'تأكيد عنوان التوصيل',
  [WhatsAppMessageType.CUSTOM]: 'رسالة مخصصة',
};

export const WHATSAPP_MESSAGE_STATUS_LABELS: Record<WhatsAppMessageStatus, string> = {
  [WhatsAppMessageStatus.DRAFT]: 'مسودة (محاكاة)',
  [WhatsAppMessageStatus.PENDING]: 'قيد الإرسال',
  [WhatsAppMessageStatus.SENT]: 'تم القبول لدى Meta',
  [WhatsAppMessageStatus.DELIVERED]: 'تم التسليم لهاتف العميل',
  [WhatsAppMessageStatus.READ]: 'تمت القراءة من العميل',
  [WhatsAppMessageStatus.FAILED]: 'فشل الإرسال',
  [WhatsAppMessageStatus.CANCELLED]: 'ملغي',
};

export const WHATSAPP_MESSAGE_STATUS_COLORS: Record<
  WhatsAppMessageStatus,
  { bg: string; text: string; border: string }
> = {
  [WhatsAppMessageStatus.DRAFT]: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
  },
  [WhatsAppMessageStatus.PENDING]: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-300',
  },
  [WhatsAppMessageStatus.SENT]: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-300',
  },
  [WhatsAppMessageStatus.DELIVERED]: {
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-300',
  },
  [WhatsAppMessageStatus.READ]: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-300',
  },
  [WhatsAppMessageStatus.FAILED]: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-300',
  },
  [WhatsAppMessageStatus.CANCELLED]: {
    bg: 'bg-slate-100',
    text: 'text-slate-500',
    border: 'border-slate-200',
  },
};
