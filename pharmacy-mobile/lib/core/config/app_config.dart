import 'package:shared_preferences/shared_preferences.dart';

class AppConfig {
  static const String _keyBaseUrl = 'pharmacy_api_base_url';
  
  // Default for Android Emulator to access host machine: 10.0.2.2:4000
  static const String defaultEmulatorBaseUrl = 'http://10.0.2.2:4000/api';
  static const String defaultEmulatorSocketUrl = 'http://10.0.2.2:4000';
  
  // Default for local desktop/web: localhost:4000
  static const String defaultLocalhostBaseUrl = 'http://localhost:4000/api';
  static const String defaultLocalhostSocketUrl = 'http://localhost:4000';

  static String _currentBaseUrl = defaultEmulatorBaseUrl;

  static String get baseUrl => _currentBaseUrl;

  static String get socketUrl {
    // Derive Socket.IO root URL from API base URL (remove /api suffix)
    if (_currentBaseUrl.endsWith('/api')) {
      return _currentBaseUrl.substring(0, _currentBaseUrl.length - 4);
    }
    if (_currentBaseUrl.endsWith('/api/')) {
      return _currentBaseUrl.substring(0, _currentBaseUrl.length - 5);
    }
    return _currentBaseUrl;
  }

  static Future<void> loadConfig() async {
    final prefs = await SharedPreferences.getInstance();
    final savedUrl = prefs.getString(_keyBaseUrl);
    if (savedUrl != null && savedUrl.trim().isNotEmpty) {
      _currentBaseUrl = savedUrl.trim();
    }
  }

  static Future<void> setBaseUrl(String newUrl) async {
    final prefs = await SharedPreferences.getInstance();
    final trimmed = newUrl.trim();
    // Normalize trailing slash
    final normalized = trimmed.endsWith('/') ? trimmed.substring(0, trimmed.length - 1) : trimmed;
    _currentBaseUrl = normalized;
    await prefs.setString(_keyBaseUrl, _currentBaseUrl);
  }

  static Future<void> resetToDefault() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyBaseUrl);
    _currentBaseUrl = defaultEmulatorBaseUrl;
  }
}
