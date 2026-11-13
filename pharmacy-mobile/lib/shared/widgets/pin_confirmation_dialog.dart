import 'package:flutter/material.dart';
import '../../core/network/api_client.dart';
import '../../core/storage/secure_storage_service.dart';
import '../../core/theme/app_theme.dart';
import '../models/user_model.dart';

class PinConfirmationResult {
  final String performerEmployeeId;
  final String performerPin;

  PinConfirmationResult({
    required this.performerEmployeeId,
    required this.performerPin,
  });
}

class PinConfirmationDialog extends StatefulWidget {
  final String title;
  final String description;
  final String confirmButtonText;

  const PinConfirmationDialog({
    super.key,
    this.title = 'تأكيد العملية بالرمز السري (PIN)',
    this.description = 'يرجى إدخال الرمز السري لتأكيد هوية الموظف المنفذ وتسجيلها في سجل العمليات.',
    this.confirmButtonText = 'تأكيد العملية',
  });

  static Future<PinConfirmationResult?> show({
    required BuildContext context,
    String? title,
    String? description,
    String? confirmButtonText,
  }) {
    return showDialog<PinConfirmationResult>(
      context: context,
      barrierDismissible: false,
      builder: (context) => PinConfirmationDialog(
        title: title ?? 'تأكيد العملية بالرمز السري (PIN)',
        description: description ?? 'يرجى إدخال الرمز السري لتأكيد هوية الموظف المنفذ وتسجيلها في سجل العمليات.',
        confirmButtonText: confirmButtonText ?? 'تأكيد العملية',
      ),
    );
  }

  @override
  State<PinConfirmationDialog> createState() => _PinConfirmationDialogState();
}

class _PinConfirmationDialogState extends State<PinConfirmationDialog> {
  final _pinController = TextEditingController();
  List<Map<String, dynamic>> _performers = [];
  String? _selectedPerformerId;
  bool _isLoading = true;
  String? _errorMessage;
  bool _obscurePin = true;

  @override
  void initState() {
    super.initState();
    _loadPerformers();
  }

  @override
  void dispose() {
    _pinController.dispose();
    super.dispose();
  }

  Future<void> _loadPerformers() async {
    try {
      final userMap = await SecureStorageService.getUser();
      final currentUserId = userMap?['id'] as String?;

      final response = await ApiClient().dio.get('/auth/active-performers');
      if (response.statusCode == 200 && response.data is List) {
        final list = List<Map<String, dynamic>>.from(response.data as List);
        setState(() {
          _performers = list;
          if (currentUserId != null && list.any((p) => p['id'] == currentUserId)) {
            _selectedPerformerId = currentUserId;
          } else if (list.isNotEmpty) {
            _selectedPerformerId = list.first['id'] as String;
          }
          _isLoading = false;
        });
        return;
      }
    } catch (_) {
      // Fallback to local stored user
      final userMap = await SecureStorageService.getUser();
      if (userMap != null) {
        final currentUser = UserModel.fromJson(userMap);
        setState(() {
          _performers = [
            {'id': currentUser.id, 'fullName': currentUser.fullName, 'role': currentUser.role}
          ];
          _selectedPerformerId = currentUser.id;
          _isLoading = false;
        });
        return;
      }
    }

    setState(() {
      _isLoading = false;
    });
  }

  void _onConfirm() {
    final pin = _pinController.text.trim();
    if (_selectedPerformerId == null || _selectedPerformerId!.isEmpty) {
      setState(() {
        _errorMessage = 'يرجى اختيار الموظف المنفذ';
      });
      return;
    }

    if (pin.isEmpty) {
      setState(() {
        _errorMessage = 'يرجى إدخال الرمز السري (PIN)';
      });
      return;
    }

    Navigator.of(context).pop(
      PinConfirmationResult(
        performerEmployeeId: _selectedPerformerId!,
        performerPin: pin,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      backgroundColor: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(24.0),
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
                  child: const Icon(Icons.lock_clock_outlined, color: AppTheme.primary, size: 26),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    widget.title,
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              widget.description,
              style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary, height: 1.4),
            ),
            const SizedBox(height: 18),
            if (_isLoading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(16.0),
                  child: CircularProgressIndicator(),
                ),
              )
            else ...[
              // Performer selection
              const Text(
                'الموظف المنفذ للعملية:',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
              ),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.border),
                  color: AppTheme.background,
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedPerformerId,
                    isExpanded: true,
                    items: _performers.map((p) {
                      return DropdownMenuItem<String>(
                        value: p['id'] as String,
                        child: Text(
                          p['fullName'] as String? ?? 'موظف',
                          style: const TextStyle(fontSize: 14, color: AppTheme.textPrimary),
                        ),
                      );
                    }).toList(),
                    onChanged: (val) {
                      setState(() {
                        _selectedPerformerId = val;
                      });
                    },
                  ),
                ),
              ),
              const SizedBox(height: 16),
              // PIN input
              const Text(
                'الرمز السري (PIN):',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _pinController,
                obscureText: _obscurePin,
                keyboardType: TextInputType.number,
                autofocus: true,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 22, letterSpacing: 8, fontWeight: FontWeight.bold),
                decoration: InputDecoration(
                  hintText: '••••',
                  hintStyle: const TextStyle(letterSpacing: 4, color: AppTheme.textMuted),
                  suffixIcon: IconButton(
                    icon: Icon(_obscurePin ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                    onPressed: () {
                      setState(() {
                        _obscurePin = !_obscurePin;
                      });
                    },
                  ),
                ),
                onSubmitted: (_) => _onConfirm(),
              ),
              if (_errorMessage != null) ...[
                const SizedBox(height: 10),
                Text(
                  _errorMessage!,
                  style: const TextStyle(color: AppTheme.error, fontSize: 13),
                  textAlign: TextAlign.center,
                ),
              ],
            ],
            const SizedBox(height: 22),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(context).pop(null),
                    child: const Text('إلغاء'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _onConfirm,
                    child: Text(widget.confirmButtonText),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
