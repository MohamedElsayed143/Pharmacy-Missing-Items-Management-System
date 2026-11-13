class CustomerInfo {
  final String id;
  final String? name;
  final String phone;
  final String? customerCode;

  const CustomerInfo({
    required this.id,
    this.name,
    required this.phone,
    this.customerCode,
  });

  factory CustomerInfo.fromJson(Map<String, dynamic> json) {
    return CustomerInfo(
      id: json['id'] as String? ?? '',
      name: json['name'] as String?,
      phone: json['phone'] as String? ?? '',
      customerCode: json['customerCode'] as String?,
    );
  }

  String get displayName => (name != null && name!.trim().isNotEmpty) ? name!.trim() : 'عميل غير مسجل الاسم';
}

class OrderSummary {
  final String id;
  final String requestNumber;
  final String? notes;
  final DateTime? createdAt;
  final String? createdByName;
  final CustomerInfo? customer;

  const OrderSummary({
    required this.id,
    required this.requestNumber,
    this.notes,
    this.createdAt,
    this.createdByName,
    this.customer,
  });

  factory OrderSummary.fromJson(Map<String, dynamic> json) {
    return OrderSummary(
      id: json['id'] as String? ?? '',
      requestNumber: json['requestNumber'] as String? ?? '',
      notes: json['notes'] as String?,
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'] as String) : null,
      createdByName: json['createdBy'] is Map ? json['createdBy']['fullName'] as String? : null,
      customer: json['customer'] is Map ? CustomerInfo.fromJson(json['customer'] as Map<String, dynamic>) : null,
    );
  }
}

class StatusHistoryItem {
  final String id;
  final String fromStatus;
  final String toStatus;
  final String? notes;
  final String? performerName;
  final DateTime? createdAt;

  const StatusHistoryItem({
    required this.id,
    required this.fromStatus,
    required this.toStatus,
    this.notes,
    this.performerName,
    this.createdAt,
  });

  factory StatusHistoryItem.fromJson(Map<String, dynamic> json) {
    return StatusHistoryItem(
      id: json['id'] as String? ?? '',
      fromStatus: json['fromStatus'] as String? ?? '',
      toStatus: json['toStatus'] as String? ?? '',
      notes: json['notes'] as String?,
      performerName: json['performerEmployee'] is Map
          ? json['performerEmployee']['fullName'] as String?
          : (json['authenticatedUser'] is Map ? json['authenticatedUser']['fullName'] as String? : null),
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'] as String) : null,
    );
  }
}

class OrderItemModel {
  final String id;
  final String orderId;
  final String productName;
  final String? strength;
  final String? dosageForm;
  final int requestedQuantity;
  final int receivedQuantity;
  final String priority;
  final String status;
  final String? notes;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final OrderSummary? order;
  final List<StatusHistoryItem> history;

  const OrderItemModel({
    required this.id,
    required this.orderId,
    required this.productName,
    this.strength,
    this.dosageForm,
    required this.requestedQuantity,
    required this.receivedQuantity,
    required this.priority,
    required this.status,
    this.notes,
    this.createdAt,
    this.updatedAt,
    this.order,
    this.history = const [],
  });

  int get remainingQuantity {
    final rem = requestedQuantity - receivedQuantity;
    return rem > 0 ? rem : 0;
  }

  bool get isFullyReceived => receivedQuantity >= requestedQuantity && requestedQuantity > 0;
  bool get canBeOrdered => status == 'NEW' || status == 'REVIEWED' || status == 'ADDED_TO_PURCHASE';
  bool get canBeReceived => (status == 'ORDERED' || status == 'PARTIALLY_RECEIVED') && remainingQuantity > 0;

  factory OrderItemModel.fromJson(Map<String, dynamic> json) {
    final productNameCustom = json['productNameCustom'] as String?;
    final productNameFromProduct = json['product'] is Map ? json['product']['name'] as String? : null;

    final historyList = <StatusHistoryItem>[];
    if (json['history'] is List) {
      for (final h in json['history']) {
        if (h is Map<String, dynamic>) {
          historyList.add(StatusHistoryItem.fromJson(h));
        }
      }
    }

    return OrderItemModel(
      id: json['id'] as String? ?? '',
      orderId: json['orderId'] as String? ?? '',
      productName: productNameCustom ?? productNameFromProduct ?? 'صنف غير محدد',
      strength: json['strength'] as String?,
      dosageForm: json['dosageForm'] as String?,
      requestedQuantity: json['requestedQuantity'] as int? ?? 1,
      receivedQuantity: json['receivedQuantity'] as int? ?? 0,
      priority: json['priority'] as String? ?? 'NORMAL',
      status: json['status'] as String? ?? 'NEW',
      notes: json['notes'] as String?,
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'] as String) : null,
      updatedAt: json['updatedAt'] != null ? DateTime.tryParse(json['updatedAt'] as String) : null,
      order: json['order'] is Map ? OrderSummary.fromJson(json['order'] as Map<String, dynamic>) : null,
      history: historyList,
    );
  }
}
