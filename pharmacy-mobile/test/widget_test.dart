import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pharmacy_mobile/main.dart';
import 'package:pharmacy_mobile/shared/models/user_model.dart';
import 'package:pharmacy_mobile/shared/models/order_item_model.dart';
import 'package:pharmacy_mobile/shared/models/dashboard_stats_model.dart';
import 'package:pharmacy_mobile/core/constants/status_constants.dart';

void main() {
  group('Models & Serialization Unit Tests', () {
    test('UserModel fromJson / toJson', () {
      final json = {
        'id': 'usr-1',
        'fullName': 'د. سارة محمود',
        'username': 'purchasing',
        'role': 'PURCHASING_MANAGER',
        'isActive': true,
      };

      final user = UserModel.fromJson(json);
      expect(user.id, 'usr-1');
      expect(user.fullName, 'د. سارة محمود');
      expect(user.isPurchasingManager, isTrue);
      expect(user.roleArabic, 'مسؤول المشتريات');
      expect(user.toJson()['username'], 'purchasing');
    });

    test('OrderItemModel remaining quantity and workflow flags', () {
      final json = {
        'id': 'item-101',
        'orderId': 'order-1',
        'productNameCustom': 'Panadol Extra',
        'requestedQuantity': 5,
        'receivedQuantity': 2,
        'status': 'PARTIALLY_RECEIVED',
        'priority': 'NORMAL',
      };

      final item = OrderItemModel.fromJson(json);
      expect(item.productName, 'Panadol Extra');
      expect(item.requestedQuantity, 5);
      expect(item.receivedQuantity, 2);
      expect(item.remainingQuantity, 3);
      expect(item.isFullyReceived, isFalse);
      expect(item.canBeReceived, isTrue);
    });

    test('DashboardStatsModel parsing', () {
      final json = {
        'totalRequests': 10,
        'newRequests': 4,
        'awaitingPurchasing': 2,
        'orderedProducts': 3,
        'partiallyReceived': 1,
        'readyForPickup': 2,
        'completedDeliveries': 5,
      };

      final stats = DashboardStatsModel.fromJson(json);
      expect(stats.totalRequests, 10);
      expect(stats.newRequests, 4);
      expect(stats.awaitingPurchasing, 2);
      expect(stats.orderedProducts, 3);
    });

    test('StatusConstants labels and mappings', () {
      expect(StatusConstants.getLabel('NEW'), 'طلب جديد');
      expect(StatusConstants.getLabel('ORDERED'), 'تم الطلب من المورد');
      expect(StatusConstants.getLabel('RECEIVED'), 'تم الاستلام بالصيدلية');
      expect(StatusConstants.getLabel('PARTIALLY_RECEIVED'), 'مستلم جزئياً');
    });
  });

  group('Widget Smoke Test', () {
    testWidgets('PharmacyMissingItemsApp initializes without crash', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: PharmacyMissingItemsApp(),
        ),
      );

      // Verify that initial auth gate renders
      expect(find.byType(PharmacyMissingItemsApp), findsOneWidget);
    });
  });
}
