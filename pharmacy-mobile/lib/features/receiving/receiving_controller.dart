import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/network/socket_service.dart';
import '../../shared/models/order_item_model.dart';

class ReceivingState {
  final bool isLoading;
  final List<OrderItemModel> pendingItems;
  final String searchQuery;
  final String? errorMessage;

  const ReceivingState({
    this.isLoading = false,
    this.pendingItems = const [],
    this.searchQuery = '',
    this.errorMessage,
  });

  ReceivingState copyWith({
    bool? isLoading,
    List<OrderItemModel>? pendingItems,
    String? searchQuery,
    String? errorMessage,
  }) {
    return ReceivingState(
      isLoading: isLoading ?? this.isLoading,
      pendingItems: pendingItems ?? this.pendingItems,
      searchQuery: searchQuery ?? this.searchQuery,
      errorMessage: errorMessage,
    );
  }
}

class ReceivingController extends StateNotifier<ReceivingState> {
  StreamSubscription? _statusChangedSub;
  StreamSubscription? _itemReceivedSub;

  ReceivingController() : super(const ReceivingState()) {
    _init();
  }

  void _init() {
    loadPendingItems();
    _subscribeToSocket();
  }

  void _subscribeToSocket() {
    final socket = SocketService();
    _statusChangedSub = socket.onStatusChanged.listen((_) => loadPendingItems(silent: true));
    _itemReceivedSub = socket.onItemReceived.listen((_) => loadPendingItems(silent: true));
  }

  Future<void> loadPendingItems({bool silent = false}) async {
    if (!silent) {
      state = state.copyWith(isLoading: true, errorMessage: null);
    }

    try {
      final dio = ApiClient().dio;

      // Fetch items in ORDERED and PARTIALLY_RECEIVED states
      final responses = await Future.wait([
        dio.get('/orders/items', queryParameters: {'status': 'ORDERED', 'limit': 100}),
        dio.get('/orders/items', queryParameters: {'status': 'PARTIALLY_RECEIVED', 'limit': 100}),
      ]);

      final List<OrderItemModel> items = [];

      for (final res in responses) {
        if (res.statusCode == 200 && res.data != null) {
          final data = res.data['data'] as List? ?? [];
          for (final item in data) {
            final model = OrderItemModel.fromJson(item as Map<String, dynamic>);
            if (model.remainingQuantity > 0) {
              items.add(model);
            }
          }
        }
      }

      state = state.copyWith(
        isLoading: false,
        pendingItems: items,
        errorMessage: null,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: ApiClient.formatError(e),
      );
    }
  }

  void setSearch(String query) {
    state = state.copyWith(searchQuery: query);
  }

  List<OrderItemModel> get filteredItems {
    final query = state.searchQuery.trim().toLowerCase();
    if (query.isEmpty) return state.pendingItems;

    return state.pendingItems.where((item) {
      final pName = item.productName.toLowerCase();
      final reqNum = (item.order?.requestNumber ?? '').toLowerCase();
      final cPhone = (item.order?.customer?.phone ?? '').toLowerCase();
      final cName = (item.order?.customer?.displayName ?? '').toLowerCase();
      return pName.contains(query) ||
          reqNum.contains(query) ||
          cPhone.contains(query) ||
          cName.contains(query);
    }).toList();
  }

  @override
  void dispose() {
    _statusChangedSub?.cancel();
    _itemReceivedSub?.cancel();
    super.dispose();
  }
}

final receivingControllerProvider =
    StateNotifierProvider.autoDispose<ReceivingController, ReceivingState>((ref) {
  return ReceivingController();
});
