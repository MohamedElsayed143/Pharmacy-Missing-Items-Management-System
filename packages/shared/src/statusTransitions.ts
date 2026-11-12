import { OrderItemStatus } from './enums';

export const ALLOWED_STATUS_TRANSITIONS: Record<OrderItemStatus, OrderItemStatus[]> = {
  [OrderItemStatus.NEW]: [
    OrderItemStatus.REVIEWED,
    OrderItemStatus.ADDED_TO_PURCHASE,
    OrderItemStatus.CANCELLED,
  ],
  [OrderItemStatus.REVIEWED]: [
    OrderItemStatus.ADDED_TO_PURCHASE,
    OrderItemStatus.ORDERED,
    OrderItemStatus.CANCELLED,
  ],
  [OrderItemStatus.ADDED_TO_PURCHASE]: [
    OrderItemStatus.ORDERED,
    OrderItemStatus.CANCELLED,
  ],
  [OrderItemStatus.ORDERED]: [
    OrderItemStatus.PARTIALLY_RECEIVED,
    OrderItemStatus.RECEIVED,
    OrderItemStatus.CANCELLED,
  ],
  [OrderItemStatus.PARTIALLY_RECEIVED]: [
    OrderItemStatus.RECEIVED,
    OrderItemStatus.CUSTOMER_NOTIFIED,
    OrderItemStatus.CANCELLED,
  ],
  [OrderItemStatus.RECEIVED]: [
    OrderItemStatus.CUSTOMER_NOTIFIED,
    OrderItemStatus.DELIVERED,
    OrderItemStatus.CANCELLED,
  ],
  [OrderItemStatus.CUSTOMER_NOTIFIED]: [
    OrderItemStatus.DELIVERED,
    OrderItemStatus.CANCELLED,
  ],
  [OrderItemStatus.DELIVERED]: [], // Terminal status
  [OrderItemStatus.CANCELLED]: [], // Terminal status
};

export function isValidStatusTransition(from: OrderItemStatus, to: OrderItemStatus): boolean {
  if (from === to) return true;
  const allowed = ALLOWED_STATUS_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function getAllowedTransitions(current: OrderItemStatus): OrderItemStatus[] {
  return ALLOWED_STATUS_TRANSITIONS[current] || [];
}
