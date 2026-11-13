class ActivityLogModel {
  final String id;
  final String action;
  final String entityType;
  final String? entityId;
  final String? notes;
  final String? performerName;
  final DateTime? createdAt;

  const ActivityLogModel({
    required this.id,
    required this.action,
    required this.entityType,
    this.entityId,
    this.notes,
    this.performerName,
    this.createdAt,
  });

  String get actionArabic {
    switch (action) {
      case 'ORDER_CREATED':
        return 'تسجيل طلب نواقص جديد';
      case 'ORDER_ITEM_STATUS_CHANGED':
        return 'تحديث حالة الصنف';
      case 'ITEMS_RECEIVED_INTO_PHARMACY':
        return 'استلام شحنة بالصيدلية';
      case 'DELIVERED_TO_CUSTOMER':
        return 'تسليم الصنف للعميل';
      case 'WORKSTATION_LOGIN':
        return 'تسجيل دخول إلى النظام';
      case 'PURCHASE_ORDER_CREATED':
        return 'إصدار أمر شراء للمورد';
      case 'WHATSAPP_MESSAGE_SENT':
        return 'إرسال إشعار واتساب للعميل';
      default:
        return action.replaceAll('_', ' ');
    }
  }

  factory ActivityLogModel.fromJson(Map<String, dynamic> json) {
    String? performer;
    if (json['performerEmployee'] is Map) {
      performer = json['performerEmployee']['fullName'] as String?;
    } else if (json['authenticatedUser'] is Map) {
      performer = json['authenticatedUser']['fullName'] as String?;
    }

    return ActivityLogModel(
      id: json['id'] as String? ?? '',
      action: json['action'] as String? ?? '',
      entityType: json['entityType'] as String? ?? '',
      entityId: json['entityId'] as String?,
      notes: json['notes'] as String?,
      performerName: performer,
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'] as String) : null,
    );
  }
}
