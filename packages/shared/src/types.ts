import {
  UserRole,
  ItemPriority,
  OrderItemStatus,
  OrderOverallStatus,
  PurchaseBatchStatus,
  WhatsAppMessageType,
  WhatsAppMessageStatus,
} from './enums';

export interface PerformerAttributionDto {
  performerEmployeeId: string;
  performerPin: string;
}

export interface EmployeeDto {
  id: string;
  fullName: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActivePerformerDto {
  id: string;
  fullName: string;
  role: UserRole;
}

export interface LoginRequestDto {
  username: string;
  password: string;
  workstationName?: string;
}

export interface LoginResponseDto {
  token: string;
  employee: EmployeeDto;
}

export interface CustomerDto {
  id: string;
  phone: string;
  customerCode?: string | null;
  name?: string | null;
  address?: string | null;
  addressDetails?: string | null;
  area?: string | null;
  deliveryNotes?: string | null;
  whatsappConsent?: boolean;
  whatsappConsentTimestamp?: string | null;
  whatsappConsentSource?: string | null;
  lastCustomerMessageAt?: string | null;
  createdAt: string;
}

export interface ProductDto {
  id: string;
  name: string;
  strength?: string | null;
  dosageForm: string;
  barcode?: string | null;
  createdAt: string;
}

export interface OrderItemHistoryDto {
  id: string;
  orderItemId: string;
  fromStatus: OrderItemStatus;
  toStatus: OrderItemStatus;
  authenticatedUserId: string;
  authenticatedUser?: { fullName: string; username: string };
  performerEmployeeId: string;
  performerEmployee?: { fullName: string; role: UserRole };
  notes?: string | null;
  createdAt: string;
}

export interface OrderItemDto {
  id: string;
  orderId: string;
  productId: string;
  productNameCustom: string;
  strength?: string | null;
  dosageForm: string;
  requestedQuantity: number;
  receivedQuantity: number;
  priority: ItemPriority;
  status: OrderItemStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  order?: {
    requestNumber: string;
    customer: CustomerDto;
    createdBy: { fullName: string; username: string };
    createdAt: string;
  };
  product?: ProductDto;
  history?: OrderItemHistoryDto[];
}

export interface OrderDto {
  id: string;
  requestNumber: string;
  customerId: string;
  customer: CustomerDto;
  createdById: string;
  createdBy: { id: string; fullName: string; username: string };
  overallStatus: OrderOverallStatus;
  notes?: string | null;
  items: OrderItemDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderItemInput {
  productName: string;
  strength?: string;
  dosageForm?: string;
  requestedQuantity: number;
  priority?: ItemPriority;
  notes?: string;
}

export interface CreateOrderDto extends PerformerAttributionDto {
  customerPhone: string;
  customerCode?: string;
  customerName?: string;
  notes?: string;
  items: CreateOrderItemInput[];
}

export interface UpdateOrderItemStatusDto extends PerformerAttributionDto {
  status: OrderItemStatus;
  notes?: string;
}

export interface GroupedProductRequestDto {
  productId?: string;
  productKey: string;
  productName: string;
  strength?: string | null;
  dosageForm: string;
  totalRequestedQuantity: number;
  customerCount: number;
  priorities: {
    emergency: number;
    urgent: number;
    normal: number;
  };
  orderItems: {
    id: string;
    requestNumber: string;
    customerPhone: string;
    customerName?: string | null;
    quantity: number;
    priority: ItemPriority;
    status: OrderItemStatus;
    notes?: string | null;
    createdAt: string;
  }[];
}

export interface CreatePurchaseBatchDto extends PerformerAttributionDto {
  supplierName?: string;
  notes?: string;
  itemIds: string[];
}

export interface PurchaseBatchDto {
  id: string;
  batchNumber: string;
  createdById: string;
  createdBy: { id: string; fullName: string };
  status: PurchaseBatchStatus;
  supplierName?: string | null;
  notes?: string | null;
  orderedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  itemsCount: number;
  items?: {
    id: string;
    orderItemId: string;
    orderedQuantity: number;
    receivedQuantity: number;
    orderItem: OrderItemDto;
  }[];
}

export interface ReceiveItemAllocationDto {
  orderItemId: string;
  quantityReceived: number;
}

export interface ReceiveItemsDto extends PerformerAttributionDto {
  allocations: ReceiveItemAllocationDto[];
  notes?: string;
}

export interface DeliverItemDto extends PerformerAttributionDto {
  orderItemId: string;
  notes?: string;
}

export interface NotifyCustomerDto extends PerformerAttributionDto {
  orderItemId: string;
  notes?: string;
}

export interface CreateEmployeeDto extends PerformerAttributionDto {
  fullName: string;
  username: string;
  password: string;
  pin: string;
  role: UserRole;
}

export interface UpdateEmployeeDto extends PerformerAttributionDto {
  fullName?: string;
  password?: string;
  pin?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface ActivityLogDto {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  previousState?: any;
  newState?: any;
  authenticatedUserId: string;
  authenticatedUser?: { fullName: string; username: string };
  performerEmployeeId: string;
  performerEmployee?: { fullName: string; role: UserRole };
  notes?: string | null;
  createdAt: string;
}

export interface DashboardStatsDto {
  totalRequests: number;
  newRequests: number;
  awaitingPurchasing: number;
  orderedProducts: number;
  partiallyReceived: number;
  readyForPickup: number;
  completedDeliveries: number;
  recentOrdersCount: number;
}

export interface WhatsAppMessageDto {
  id: string;
  customerId: string;
  customer?: CustomerDto;
  orderId?: string | null;
  orderItemId?: string | null;
  messageType: WhatsAppMessageType;
  messageBody: string;
  templateName?: string | null;
  templateLanguage?: string | null;
  templateComponents?: any;
  providerMessageId?: string | null;
  recipientPhone: string;
  status: WhatsAppMessageStatus;
  failureReason?: string | null;
  sentByEmployeeId: string;
  sentByEmployee?: { fullName: string; role: UserRole };
  authenticatedUserId: string;
  deliveryPreference?: string | null;
  isSimulated: boolean;
  createdAt: string;
  sentAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  failedAt?: string | null;
}

export interface WhatsAppPreviewDto {
  isInside24HourWindow: boolean;
  customerHasConsent: boolean;
  recipientPhone: string;
  formattedPhone: string;
  customer: CustomerDto;
  orderItem?: {
    id: string;
    productNameCustom: string;
    requestedQuantity: number;
    status: OrderItemStatus;
    notes?: string | null;
  } | null;
  defaultMessageBody: string;
  supportedTemplates: {
    name: string;
    description: string;
    bodyText: string;
    variables: string[];
  }[];
  isSimulatedMode: boolean;
}

export interface SendWhatsAppMessageDto extends PerformerAttributionDto {
  customerId: string;
  orderItemId?: string;
  orderId?: string;
  messageType: WhatsAppMessageType;
  messageBody: string;
  templateName?: string;
  deliveryPreference?: 'HOME_DELIVERY' | 'STORE_PICKUP';
}

export interface UpdateCustomerConsentDto extends PerformerAttributionDto {
  customerId: string;
  consent: boolean;
  source?: string;
}

export interface UpdateCustomerAddressDto extends PerformerAttributionDto {
  customerId: string;
  address: string;
  addressDetails?: string;
  area?: string;
  deliveryNotes?: string;
}
