import 'package:flutter/material.dart';

class OrderStatusInfo {
  final String key;
  final String arabicLabel;
  final Color foregroundColor;
  final Color backgroundColor;
  final IconData icon;

  const OrderStatusInfo({
    required this.key,
    required this.arabicLabel,
    required this.foregroundColor,
    required this.backgroundColor,
    required this.icon,
  });
}

class StatusConstants {
  static const String statusNew = 'NEW';
  static const String statusReviewed = 'REVIEWED';
  static const String statusAddedToPurchase = 'ADDED_TO_PURCHASE';
  static const String statusOrdered = 'ORDERED';
  static const String statusPartiallyReceived = 'PARTIALLY_RECEIVED';
  static const String statusReceived = 'RECEIVED';
  static const String statusCustomerNotified = 'CUSTOMER_NOTIFIED';
  static const String statusAwaitingCustomer = 'AWAITING_CUSTOMER';
  static const String statusDelivered = 'DELIVERED';
  static const String statusCancelled = 'CANCELLED';

  static const Map<String, OrderStatusInfo> statusMap = {
    statusNew: OrderStatusInfo(
      key: statusNew,
      arabicLabel: 'طلب جديد',
      foregroundColor: Color(0xFF1D4ED8),
      backgroundColor: Color(0xFFEFF6FF),
      icon: Icons.fiber_new,
    ),
    statusReviewed: OrderStatusInfo(
      key: statusReviewed,
      arabicLabel: 'تمت المراجعة',
      foregroundColor: Color(0xFF4338CA),
      backgroundColor: Color(0xFFEEF2FF),
      icon: Icons.checklist_rtl,
    ),
    statusAddedToPurchase: OrderStatusInfo(
      key: statusAddedToPurchase,
      arabicLabel: 'أضيف للشراء',
      foregroundColor: Color(0xFF6D28D9),
      backgroundColor: Color(0xFFF5F3FF),
      icon: Icons.playlist_add,
    ),
    statusOrdered: OrderStatusInfo(
      key: statusOrdered,
      arabicLabel: 'تم الطلب من المورد',
      foregroundColor: Color(0xFFB45309),
      backgroundColor: Color(0xFFFEF3C7),
      icon: Icons.local_shipping,
    ),
    statusPartiallyReceived: OrderStatusInfo(
      key: statusPartiallyReceived,
      arabicLabel: 'مستلم جزئياً',
      foregroundColor: Color(0xFF0E7490),
      backgroundColor: Color(0xFFECFEFF),
      icon: Icons.timelapse,
    ),
    statusReceived: OrderStatusInfo(
      key: statusReceived,
      arabicLabel: 'تم الاستلام بالصيدلية',
      foregroundColor: Color(0xFF047857),
      backgroundColor: Color(0xFFECFDF5),
      icon: Icons.check_circle_outline,
    ),
    statusCustomerNotified: OrderStatusInfo(
      key: statusCustomerNotified,
      arabicLabel: 'تم إشعار العميل',
      foregroundColor: Color(0xFF0369A1),
      backgroundColor: Color(0xFFE0F2FE),
      icon: Icons.mark_email_read,
    ),
    statusAwaitingCustomer: OrderStatusInfo(
      key: statusAwaitingCustomer,
      arabicLabel: 'في انتظار العميل',
      foregroundColor: Color(0xFF0F766E),
      backgroundColor: Color(0xFFF0FDFA),
      icon: Icons.storefront,
    ),
    statusDelivered: OrderStatusInfo(
      key: statusDelivered,
      arabicLabel: 'تم التسليم للعميل',
      foregroundColor: Color(0xFF15803D),
      backgroundColor: Color(0xFFF0FDF4),
      icon: Icons.done_all,
    ),
    statusCancelled: OrderStatusInfo(
      key: statusCancelled,
      arabicLabel: 'ملغي',
      foregroundColor: Color(0xFFB91C1C),
      backgroundColor: Color(0xFFFEF2F2),
      icon: Icons.cancel_outlined,
    ),
  };

  static OrderStatusInfo getInfo(String? status) {
    if (status == null || !statusMap.containsKey(status)) {
      return const OrderStatusInfo(
        key: 'UNKNOWN',
        arabicLabel: 'غير محدد',
        foregroundColor: Color(0xFF6B7280),
        backgroundColor: Color(0xFFF3F4F6),
        icon: Icons.help_outline,
      );
    }
    return statusMap[status]!;
  }

  static String getLabel(String? status) => getInfo(status).arabicLabel;
  static Color getForegroundColor(String? status) => getInfo(status).foregroundColor;
  static Color getBackgroundColor(String? status) => getInfo(status).backgroundColor;
  static IconData getIcon(String? status) => getInfo(status).icon;
}
