import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/network/socket_service.dart';
import '../../shared/models/order_item_model.dart';

class RequestsState {
  final bool isLoading;
  final List<OrderItemModel> items;
  final String searchQuery;
  final String? selectedStatus;
  final int page;
  final int totalPages;
  final int totalCount;
  final String? errorMessage;

  const RequestsState({
    this.isLoading = false,
    this.items = const [],
    this.searchQuery = '',
    this.selectedStatus,
    this.page = 1,
    this.totalPages = 1,
    this.totalCount = 0,
    this.errorMessage,
  });

  RequestsState copyWith({
    bool? isLoading,
    List<OrderItemModel>? items,
    String? searchQuery,
    String? selectedStatus,
    bool clearStatus = false,
    int? page,
    int? totalPages,
    int? totalCount,
    String? errorMessage,
  }) {
    return RequestsState(
      isLoading: isLoading ?? this.isLoading,
      items: items ?? this.items,
      searchQuery: searchQuery ?? this.searchQuery,
      selectedStatus: clearStatus ? null : (selectedStatus ?? this.selectedStatus),
      page: page ?? this.page,
      totalPages: totalPages ?? this.totalPages,
      totalCount: totalCount ?? this.totalCount,
      errorMessage: errorMessage,
    );
  }
}

class RequestsController extends StateNotifier<RequestsState> {
  StreamSubscription? _orderCreatedSub;
  StreamSubscription? _statusChangedSub;
  StreamSubscription? _itemReceivedSub;

  RequestsController({String? initialStatus})
      : super(RequestsState(selectedStatus: initialStatus)) {
    _init();
  }

  void _init() {
    fetchItems();
    _subscribeToSocket();
  }

  void _subscribeToSocket() {
    final socket = SocketService();
    _orderCreatedSub = socket.onOrderCreated.listen((_) => fetchItems(silent: true));
    _statusChangedSub = socket.onStatusChanged.listen((_) => fetchItems(silent: true));
    _itemReceivedSub = socket.onItemReceived.listen((_) => fetchItems(silent: true));
  }

  Future<void> fetchItems({bool refresh = false, bool silent = false}) async {
    if (!silent) {
      state = state.copyWith(isLoading: true, errorMessage: null);
    }

    try {
      final queryParams = <String, dynamic>{
        'page': refresh ? 1 : state.page,
        'limit': 50,
      };

      if (state.searchQuery.trim().isNotEmpty) {
        queryParams['search'] = state.searchQuery.trim();
      }

      if (state.selectedStatus != null && state.selectedStatus!.isNotEmpty) {
        queryParams['status'] = state.selectedStatus!;
      }

      final response = await ApiClient().dio.get('/orders/items', queryParameters: queryParams);

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data['data'] as List? ?? [];
        final pagination = response.data['pagination'] as Map<String, dynamic>? ?? {};

        final items = data
            .map((item) => OrderItemModel.fromJson(item as Map<String, dynamic>))
            .toList();

        state = state.copyWith(
          isLoading: false,
          items: items,
          page: pagination['page'] as int? ?? 1,
          totalPages: pagination['totalPages'] as int? ?? 1,
          totalCount: pagination['total'] as int? ?? items.length,
          errorMessage: null,
        );
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: ApiClient.formatError(e),
      );
    }
  }

  void setSearch(String query) {
    if (state.searchQuery == query) return;
    state = state.copyWith(searchQuery: query, page: 1);
    fetchItems();
  }

  void setStatusFilter(String? status) {
    if (state.selectedStatus == status) return;
    state = state.copyWith(
      selectedStatus: status,
      clearStatus: status == null,
      page: 1,
    );
    fetchItems();
  }

  @override
  void dispose() {
    _orderCreatedSub?.cancel();
    _statusChangedSub?.cancel();
    _itemReceivedSub?.cancel();
    super.dispose();
  }
}

final requestsControllerProvider = StateNotifierProvider.autoDispose
    .family<RequestsController, RequestsState, String?>((ref, initialStatus) {
  return RequestsController(initialStatus: initialStatus);
});
