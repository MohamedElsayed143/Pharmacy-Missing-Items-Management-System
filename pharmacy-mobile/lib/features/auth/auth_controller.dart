import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/network/socket_service.dart';
import '../../core/storage/secure_storage_service.dart';
import '../../shared/models/user_model.dart';

class AuthState {
  final bool isLoading;
  final bool isAuthenticated;
  final UserModel? currentUser;
  final String? token;
  final String? errorMessage;

  const AuthState({
    this.isLoading = false,
    this.isAuthenticated = false,
    this.currentUser,
    this.token,
    this.errorMessage,
  });

  AuthState copyWith({
    bool? isLoading,
    bool? isAuthenticated,
    UserModel? currentUser,
    String? token,
    String? errorMessage,
    bool clearError = false,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      currentUser: currentUser ?? this.currentUser,
      token: token ?? this.token,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class AuthController extends StateNotifier<AuthState> {
  AuthController() : super(const AuthState()) {
    _init();
  }

  Future<void> _init() async {
    ApiClient().onSessionExpired = () {
      logout();
    };
    await checkAuthStatus();
  }

  Future<void> checkAuthStatus() async {
    state = state.copyWith(isLoading: true, clearError: true);
    final token = await SecureStorageService.getToken();
    final userMap = await SecureStorageService.getUser();

    if (token == null || userMap == null) {
      state = state.copyWith(isLoading: false, isAuthenticated: false);
      return;
    }

    try {
      final user = UserModel.fromJson(userMap);
      state = state.copyWith(
        isLoading: false,
        isAuthenticated: true,
        currentUser: user,
        token: token,
      );

      // Connect real-time socket
      SocketService().initAndConnect();

      // Verify token in background
      final response = await ApiClient().dio.get('/auth/me');
      if (response.statusCode == 200 && response.data['employee'] != null) {
        final verifiedUser = UserModel.fromJson(response.data['employee'] as Map<String, dynamic>);
        await SecureStorageService.saveUser(verifiedUser.toJson());
        state = state.copyWith(currentUser: verifiedUser);
      }
    } catch (_) {
      // If offline or network error, keep authenticated with stored credentials
      state = state.copyWith(isLoading: false);
    }
  }

  Future<bool> login({
    required String username,
    required String password,
    String? workstationName,
  }) async {
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final response = await ApiClient().dio.post(
        '/auth/login',
        data: {
          'username': username.trim(),
          'password': password.trim(),
          'workstationName': workstationName ?? 'تطبيق أندرويد للهواتف',
        },
      );

      if (response.statusCode == 200 && response.data != null) {
        final token = response.data['token'] as String;
        final employeeMap = response.data['employee'] as Map<String, dynamic>;
        final user = UserModel.fromJson(employeeMap);

        await SecureStorageService.saveToken(token);
        await SecureStorageService.saveUser(user.toJson());

        state = state.copyWith(
          isLoading: false,
          isAuthenticated: true,
          currentUser: user,
          token: token,
          clearError: true,
        );

        // Connect real-time socket
        SocketService().initAndConnect();
        return true;
      }

      state = state.copyWith(
        isLoading: false,
        errorMessage: 'فشل تسجيل الدخول. يرجى التحقق من البيانات المدخلة.',
      );
      return false;
    } catch (e) {
      final message = ApiClient.formatError(e);
      state = state.copyWith(
        isLoading: false,
        errorMessage: message,
      );
      return false;
    }
  }

  Future<void> logout() async {
    await SecureStorageService.removeToken();
    SocketService().disconnect();
    state = const AuthState(isAuthenticated: false);
  }
}

final authControllerProvider = StateNotifierProvider<AuthController, AuthState>((ref) {
  return AuthController();
});
