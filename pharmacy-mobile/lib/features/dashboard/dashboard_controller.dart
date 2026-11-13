import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/network/socket_service.dart';
import '../../shared/models/activity_log_model.dart';
import '../../shared/models/dashboard_stats_model.dart';

class DashboardState {
  final bool isLoading;
  final DashboardStatsModel stats;
  final List<ActivityLogModel> recentActivity;
  final SocketConnectionState connectionState;
  final String? errorMessage;

  const DashboardState({
    this.isLoading = false,
    required this.stats,
    this.recentActivity = const [],
    this.connectionState = SocketConnectionState.disconnected,
    this.errorMessage,
  });

  DashboardState copyWith({
    bool? isLoading,
    DashboardStatsModel? stats,
    List<ActivityLogModel>? recentActivity,
    SocketConnectionState? connectionState,
    String? errorMessage,
  }) {
    return DashboardState(
      isLoading: isLoading ?? this.isLoading,
      stats: stats ?? this.stats,
      recentActivity: recentActivity ?? this.recentActivity,
      connectionState: connectionState ?? this.connectionState,
      errorMessage: errorMessage,
    );
  }
}

class DashboardController extends StateNotifier<DashboardState> {
  StreamSubscription? _socketConnSub;
  StreamSubscription? _statsSub;
  StreamSubscription? _orderCreatedSub;
  StreamSubscription? _statusChangedSub;
  StreamSubscription? _itemReceivedSub;

  DashboardController()
      : super(DashboardState(
          stats: DashboardStatsModel.empty(),
          connectionState: SocketService().state,
        )) {
    _init();
  }

  void _init() {
    loadDashboardData();
    _subscribeToSocketEvents();
  }

  void _subscribeToSocketEvents() {
    final socket = SocketService();

    _socketConnSub = socket.onConnectionStateChanged.listen((connState) {
      state = state.copyWith(connectionState: connState);
    });

    _statsSub = socket.onStatsUpdated.listen((_) {
      loadDashboardData(silent: true);
    });

    _orderCreatedSub = socket.onOrderCreated.listen((_) {
      loadDashboardData(silent: true);
    });

    _statusChangedSub = socket.onStatusChanged.listen((_) {
      loadDashboardData(silent: true);
    });

    _itemReceivedSub = socket.onItemReceived.listen((_) {
      loadDashboardData(silent: true);
    });
  }

  Future<void> loadDashboardData({bool silent = false}) async {
    if (!silent) {
      state = state.copyWith(isLoading: true, errorMessage: null);
    }

    try {
      final dio = ApiClient().dio;

      final results = await Future.wait([
        dio.get('/dashboard/stats'),
        dio.get('/dashboard/recent-activity'),
      ]);

      DashboardStatsModel stats = state.stats;
      if (results[0].statusCode == 200 && results[0].data != null) {
        stats = DashboardStatsModel.fromJson(results[0].data as Map<String, dynamic>);
      }

      List<ActivityLogModel> activities = [];
      if (results[1].statusCode == 200 && results[1].data is List) {
        activities = (results[1].data as List)
            .map((item) => ActivityLogModel.fromJson(item as Map<String, dynamic>))
            .toList();
      }

      state = state.copyWith(
        isLoading: false,
        stats: stats,
        recentActivity: activities,
        connectionState: SocketService().state,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: ApiClient.formatError(e),
      );
    }
  }

  @override
  void dispose() {
    _socketConnSub?.cancel();
    _statsSub?.cancel();
    _orderCreatedSub?.cancel();
    _statusChangedSub?.cancel();
    _itemReceivedSub?.cancel();
    super.dispose();
  }
}

final dashboardControllerProvider =
    StateNotifierProvider.autoDispose<DashboardController, DashboardState>((ref) {
  return DashboardController();
});
