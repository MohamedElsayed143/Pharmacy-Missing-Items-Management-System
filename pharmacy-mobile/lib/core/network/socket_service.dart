import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../config/app_config.dart';

enum SocketConnectionState { disconnected, connecting, connected, error }

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;

  io.Socket? _socket;
  final _connectionStateController = StreamController<SocketConnectionState>.broadcast();
  final _orderCreatedController = StreamController<dynamic>.broadcast();
  final _statusChangedController = StreamController<dynamic>.broadcast();
  final _itemReceivedController = StreamController<dynamic>.broadcast();
  final _statsUpdatedController = StreamController<dynamic>.broadcast();

  SocketConnectionState _currentState = SocketConnectionState.disconnected;

  SocketConnectionState get state => _currentState;
  Stream<SocketConnectionState> get onConnectionStateChanged => _connectionStateController.stream;
  Stream<dynamic> get onOrderCreated => _orderCreatedController.stream;
  Stream<dynamic> get onStatusChanged => _statusChangedController.stream;
  Stream<dynamic> get onItemReceived => _itemReceivedController.stream;
  Stream<dynamic> get onStatsUpdated => _statsUpdatedController.stream;

  SocketService._internal();

  void initAndConnect() {
    disconnect();

    final url = AppConfig.socketUrl;
    debugPrint('[Socket.IO] Connecting to $url ...');
    _updateState(SocketConnectionState.connecting);

    try {
      _socket = io.io(
        url,
        io.OptionBuilder()
            .setTransports(['websocket', 'polling'])
            .enableAutoConnect()
            .enableReconnection()
            .setReconnectionDelay(2000)
            .setReconnectionAttempts(10)
            .build(),
      );

      _socket!.onConnect((_) {
        debugPrint('[Socket.IO] Connected successfully!');
        _updateState(SocketConnectionState.connected);
      });

      _socket!.onDisconnect((_) {
        debugPrint('[Socket.IO] Disconnected.');
        _updateState(SocketConnectionState.disconnected);
      });

      _socket!.onConnectError((err) {
        debugPrint('[Socket.IO] Connection error: $err');
        _updateState(SocketConnectionState.error);
      });

      // Listen to backend broadcast events
      _socket!.on('order:created', (data) {
        debugPrint('[Socket.IO] Event: order:created');
        _orderCreatedController.add(data);
      });

      _socket!.on('orderItem:statusChanged', (data) {
        debugPrint('[Socket.IO] Event: orderItem:statusChanged');
        _statusChangedController.add(data);
      });

      _socket!.on('item:received', (data) {
        debugPrint('[Socket.IO] Event: item:received');
        _itemReceivedController.add(data);
      });

      _socket!.on('stats:updated', (data) {
        debugPrint('[Socket.IO] Event: stats:updated');
        _statsUpdatedController.add(data);
      });
    } catch (e) {
      debugPrint('[Socket.IO] Error initializing socket: $e');
      _updateState(SocketConnectionState.error);
    }
  }

  void _updateState(SocketConnectionState newState) {
    _currentState = newState;
    _connectionStateController.add(newState);
  }

  void disconnect() {
    if (_socket != null) {
      _socket!.disconnect();
      _socket!.dispose();
      _socket = null;
    }
    _updateState(SocketConnectionState.disconnected);
  }
}
