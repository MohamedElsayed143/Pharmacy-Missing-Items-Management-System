import React from 'react';
import {
  OrderItemStatus,
  ItemPriority,
  PurchaseBatchStatus,
  ORDER_ITEM_STATUS_LABELS,
  ORDER_ITEM_STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  PURCHASE_BATCH_STATUS_LABELS,
} from '@pharmacy/shared';

interface StatusBadgeProps {
  status: OrderItemStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const label = ORDER_ITEM_STATUS_LABELS[status] || status;
  const color = ORDER_ITEM_STATUS_COLORS[status] || {
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${color.bg}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${color.dot}`}></span>
      {label}
    </span>
  );
};

interface PriorityBadgeProps {
  priority: ItemPriority;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  const label = PRIORITY_LABELS[priority] || priority;
  const style = PRIORITY_COLORS[priority] || {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${style.bg} ${style.text} ${style.border}`}
    >
      {label}
    </span>
  );
};

interface BatchBadgeProps {
  status: PurchaseBatchStatus;
}

export const BatchBadge: React.FC<BatchBadgeProps> = ({ status }) => {
  const label = PURCHASE_BATCH_STATUS_LABELS[status] || status;

  let style = 'bg-slate-100 text-slate-700 border-slate-300';
  if (status === PurchaseBatchStatus.ORDERED) style = 'bg-amber-50 text-amber-700 border-amber-300';
  if (status === PurchaseBatchStatus.COMPLETED) style = 'bg-emerald-50 text-emerald-700 border-emerald-300';
  if (status === PurchaseBatchStatus.PARTIALLY_RECEIVED) style = 'bg-orange-50 text-orange-700 border-orange-300';
  if (status === PurchaseBatchStatus.CANCELLED) style = 'bg-rose-50 text-rose-700 border-rose-300';

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${style}`}>
      {label}
    </span>
  );
};
