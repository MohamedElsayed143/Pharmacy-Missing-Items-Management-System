export enum UserRole {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE',
  PURCHASING_MANAGER = 'PURCHASING_MANAGER',
}

export enum ItemPriority {
  NORMAL = 'NORMAL',
  URGENT = 'URGENT',
  EMERGENCY = 'EMERGENCY',
}

export enum OrderItemStatus {
  NEW = 'NEW',
  REVIEWED = 'REVIEWED',
  ADDED_TO_PURCHASE = 'ADDED_TO_PURCHASE',
  ORDERED = 'ORDERED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  RECEIVED = 'RECEIVED',
  CUSTOMER_NOTIFIED = 'CUSTOMER_NOTIFIED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum OrderOverallStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PurchaseBatchStatus {
  DRAFT = 'DRAFT',
  ORDERED = 'ORDERED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum WhatsAppMessageType {
  PRODUCT_ORDERED = 'PRODUCT_ORDERED',
  PRODUCT_ARRIVED = 'PRODUCT_ARRIVED',
  ADDRESS_CONFIRMATION = 'ADDRESS_CONFIRMATION',
  CUSTOM = 'CUSTOM',
}

export enum WhatsAppMessageStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum DosageForm {
  TABLETS = 'أقراص (Tablets)',
  CAPSULES = 'كبسولات (Capsules)',
  SYRUP = 'شراب / معلق (Syrup)',
  INJECTION = 'حقن / أمبولات (Injection)',
  CREAM_OINTMENT = 'كريم / مرهم (Cream/Ointment)',
  DROPS = 'قطرة (Drops)',
  INHALER = 'بخاخ / استنشاق (Inhaler)',
  SACHETS = 'أكياس فوار (Sachets)',
  SUPPOSITORY = 'لبوس (Suppository)',
  OTHER = 'أخرى (Other)',
}
