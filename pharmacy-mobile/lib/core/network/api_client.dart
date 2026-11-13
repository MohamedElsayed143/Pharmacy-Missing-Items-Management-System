import 'package:dio/dio.dart';
import '../config/app_config.dart';
import '../storage/secure_storage_service.dart';

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  late Dio dio;
  void Function()? onSessionExpired;

  ApiClient._internal() {
    _initDio();
  }

  void reinitialize() {
    _initDio();
  }

  void _initDio() {
    dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        sendTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await SecureStorageService.getToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException e, handler) async {
          if (e.response?.statusCode == 401) {
            // Unauthorized / Token expired
            await SecureStorageService.removeToken();
            if (onSessionExpired != null) {
              onSessionExpired!();
            }
          }
          return handler.next(e);
        },
      ),
    );
  }

  static String formatError(dynamic error) {
    if (error is DioException) {
      if (error.response != null && error.response?.data != null) {
        final data = error.response!.data;
        if (data is Map && data.containsKey('error')) {
          return data['error'].toString();
        }
        if (data is Map && data.containsKey('message')) {
          return data['message'].toString();
        }
      }

      switch (error.type) {
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.sendTimeout:
        case DioExceptionType.receiveTimeout:
          return 'انتهت مهلة الاتصال بالخادم. يرجى التحقق من الشبكة أو عنوان الخادم.';
        case DioExceptionType.connectionError:
          return 'تعذر الاتصال بخادم الصيدلية (${AppConfig.baseUrl}). يرجى التأكد من تشغيل الخادم وتطابق عنوان IP.';
        case DioExceptionType.badResponse:
          final code = error.response?.statusCode;
          if (code == 403) {
            return 'ليس لديك صلاحية لتنفيذ هذا الإجراء، أو الرمز السري غير صحيح.';
          }
          if (code == 404) {
            return 'العنصر المطلوب غير موجود على الخادم.';
          }
          if (code == 500) {
            return 'حدث خطأ داخلي في خادم الصيدلية. يرجى المحاولة لاحقاً.';
          }
          return 'خطأ من الخادم (رمز $code)';
        case DioExceptionType.cancel:
          return 'تم إلغاء الطلب.';
        default:
          return 'حدث خطأ في الاتصال بالشبكة.';
      }
    }
    return error?.toString() ?? 'حدث خطأ غير متوقع.';
  }
}
