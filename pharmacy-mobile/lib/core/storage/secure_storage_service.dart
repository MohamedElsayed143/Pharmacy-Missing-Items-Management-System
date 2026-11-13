import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorageService {
  static const _storage = FlutterSecureStorage();
  static const _keyToken = 'auth_jwt_token';
  static const _keyUser = 'auth_current_user';
  static const _keySavedPin = 'auth_saved_pin';

  static Future<void> saveToken(String token) async {
    await _storage.write(key: _keyToken, value: token);
  }

  static Future<String?> getToken() async {
    return await _storage.read(key: _keyToken);
  }

  static Future<void> removeToken() async {
    await _storage.delete(key: _keyToken);
  }

  static Future<void> saveUser(Map<String, dynamic> userMap) async {
    await _storage.write(key: _keyUser, value: jsonEncode(userMap));
  }

  static Future<Map<String, dynamic>?> getUser() async {
    final str = await _storage.read(key: _keyUser);
    if (str != null && str.isNotEmpty) {
      try {
        return jsonDecode(str) as Map<String, dynamic>;
      } catch (_) {
        return null;
      }
    }
    return null;
  }

  static Future<void> savePin(String pin) async {
    await _storage.write(key: _keySavedPin, value: pin);
  }

  static Future<String?> getSavedPin() async {
    return await _storage.read(key: _keySavedPin);
  }

  static Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
