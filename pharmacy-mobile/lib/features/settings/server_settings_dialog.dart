import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../../core/config/app_config.dart';
import '../../core/network/api_client.dart';
import '../../core/network/socket_service.dart';
import '../../core/theme/app_theme.dart';

class ServerSettingsDialog extends StatefulWidget {
  const ServerSettingsDialog({super.key});

  static Future<bool?> show(BuildContext context) {
    return showDialog<bool>(
      context: context,
      builder: (context) => const ServerSettingsDialog(),
    );
  }

  @override
  State<ServerSettingsDialog> createState() => _ServerSettingsDialogState();
}

class _ServerSettingsDialogState extends State<ServerSettingsDialog> {
  late final TextEditingController _urlController;
  bool _isTesting = false;
  String? _testMessage;
  bool _testSuccess = false;

  @override
  void initState() {
    super.initState();
    _urlController = TextEditingController(text: AppConfig.baseUrl);
  }

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  Future<void> _testConnection() async {
    final url = _urlController.text.trim();
    if (url.isEmpty) {
      setState(() {
        _testMessage = 'يرجى إدخال عنوان الخادم أولاً';
        _testSuccess = false;
      });
      return;
    }

    setState(() {
      _isTesting = true;
      _testMessage = null;
    });

    try {
      final testDio = Dio(
        BaseOptions(
          connectTimeout: const Duration(seconds: 5),
          receiveTimeout: const Duration(seconds: 5),
        ),
      );

      final healthUrl = url.endsWith('/') ? '${url}health' : '$url/health';
      final response = await testDio.get(healthUrl);

      if (response.statusCode == 200) {
        setState(() {
          _isTesting = false;
          _testSuccess = true;
          _testMessage = 'تم الاتصال بنجاح بخادم الصيدلية المركزي!';
        });
      } else {
        setState(() {
          _isTesting = false;
          _testSuccess = false;
          _testMessage = 'استجاب الخادم برمز خطأ: ${response.statusCode}';
        });
      }
    } catch (e) {
      setState(() {
        _isTesting = false;
        _testSuccess = false;
        _testMessage = 'فشل الاتصال: تعذر الوصول إلى الخادم على هذا العنوان.';
      });
    }
  }

  Future<void> _saveAndApply() async {
    final url = _urlController.text.trim();
    if (url.isEmpty) return;

    await AppConfig.setBaseUrl(url);
    ApiClient().reinitialize();
    SocketService().initAndConnect();

    if (mounted) {
      Navigator.of(context).pop(true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('تم تحديث عنوان الخادم وإعادة تهيئة الاتصال بنجاح'),
          backgroundColor: AppTheme.success,
        ),
      );
    }
  }

  void _applyPreset(String presetUrl) {
    setState(() {
      _urlController.text = presetUrl;
      _testMessage = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      backgroundColor: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(22.0),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryLight,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.dns_outlined, color: AppTheme.primary, size: 26),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text(
                      'إعدادات خادم الصيدلية',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const Text(
                'حدد عنوان خادم الواجهة البرمجية (API) المركزي لربط التطبيق بنفس قاعدة البيانات المشتركة مع تطبيق سطح المكتب.',
                style: TextStyle(fontSize: 13, color: AppTheme.textSecondary, height: 1.4),
              ),
              const SizedBox(height: 18),
              const Text(
                'عنوان الخادم (API Base URL):',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _urlController,
                textDirection: TextDirection.ltr,
                decoration: const InputDecoration(
                  hintText: 'http://10.0.2.2:4000/api',
                  prefixIcon: Icon(Icons.link),
                ),
              ),
              const SizedBox(height: 14),
              const Text(
                'عناوين جاهزة سريعة:',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  ActionChip(
                    label: const Text('محاكي أندرويد (10.0.2.2)'),
                    onPressed: () => _applyPreset('http://10.0.2.2:4000/api'),
                  ),
                  ActionChip(
                    label: const Text('جهاز محلي (localhost)'),
                    onPressed: () => _applyPreset('http://localhost:4000/api'),
                  ),
                  ActionChip(
                    label: const Text('شبكة الصيدلية (192.168.1.100)'),
                    onPressed: () => _applyPreset('http://192.168.1.100:4000/api'),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              OutlinedButton.icon(
                onPressed: _isTesting ? null : _testConnection,
                icon: _isTesting
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.wifi_tethering, size: 20),
                label: Text(_isTesting ? 'جارٍ اختبار الاتصال...' : 'اختبار الاتصال بالخادم'),
              ),
              if (_testMessage != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: _testSuccess ? AppTheme.primaryLight : const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: _testSuccess ? AppTheme.primary.withValues(alpha: 0.3) : AppTheme.error.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        _testSuccess ? Icons.check_circle : Icons.error_outline,
                        color: _testSuccess ? AppTheme.primary : AppTheme.error,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _testMessage!,
                          style: TextStyle(
                            color: _testSuccess ? AppTheme.primaryDark : AppTheme.error,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 22),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(false),
                      child: const Text('إلغاء'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _saveAndApply,
                      child: const Text('حفظ وتطبيق'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
