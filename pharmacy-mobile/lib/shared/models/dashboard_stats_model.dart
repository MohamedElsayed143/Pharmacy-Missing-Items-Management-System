class DashboardStatsModel {
  final int totalRequests;
  final int newRequests;
  final int awaitingPurchasing;
  final int orderedProducts;
  final int partiallyReceived;
  final int readyForPickup;
  final int completedDeliveries;

  const DashboardStatsModel({
    required this.totalRequests,
    required this.newRequests,
    required this.awaitingPurchasing,
    required this.orderedProducts,
    required this.partiallyReceived,
    required this.readyForPickup,
    required this.completedDeliveries,
  });

  factory DashboardStatsModel.empty() {
    return const DashboardStatsModel(
      totalRequests: 0,
      newRequests: 0,
      awaitingPurchasing: 0,
      orderedProducts: 0,
      partiallyReceived: 0,
      readyForPickup: 0,
      completedDeliveries: 0,
    );
  }

  factory DashboardStatsModel.fromJson(Map<String, dynamic> json) {
    return DashboardStatsModel(
      totalRequests: json['totalRequests'] as int? ?? 0,
      newRequests: json['newRequests'] as int? ?? 0,
      awaitingPurchasing: json['awaitingPurchasing'] as int? ?? 0,
      orderedProducts: json['orderedProducts'] as int? ?? 0,
      partiallyReceived: json['partiallyReceived'] as int? ?? 0,
      readyForPickup: json['readyForPickup'] as int? ?? 0,
      completedDeliveries: json['completedDeliveries'] as int? ?? 0,
    );
  }
}
