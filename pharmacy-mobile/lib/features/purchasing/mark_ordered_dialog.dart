import 'package:flutter/material.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/models/order_item_model.dart';
import '../../shared/widgets/pin_confirmation_dialog.dart';

class MarkOrderedDialog extends StatefulWidget {
  final OrderItemModel item;

  const MarkOrderedDialog({super.key, required this.item});

  static Future<bool?> show(BuildContext context, OrderItemModel item) {
    return showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (context) => MarkOrderedDialog(item: item),
    );
  }

  @override
  State<MarkOrderedDialog> createState() => _MarkOrderedDialogState();
}

class _MarkOrderedDialogState extends State<MarkOrderedDialog> {
  final _notesController = TextEditingController();
  bool _isSubmitting = false;
  String? _errorMessage;

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    // 1. Prompt for performer PIN
    final pinResult = await PinConfirmationDialog.show(
      context: context,
      title: 'تأكيد طلب الصنف من المورد',
      description: 'سيتم تحويل حالة الصنف إلى (تم الطلب من المورد). أدخل الرمز السري للموظف لتسجيل العملية.',
      confirmButtonText: 'تأكيد أمر الشراء',
    );

    if (pinResult == null) return;

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      final notes = _notesController.text.trim();
      final response = await ApiClient().dio.patch(
        '/orders/items/${widget.item.id}/status',
        data: {
          'status': 'ORDERED',
          'notes': notes.isNotEmpty ? notes : 'تم الطلب من المورد عبر تطبيق الموبايل',
          'performerEmployeeId': pinResult.performerEmployeeId,
          'performerPin': pinResult.performerPin,
        },
      );

      if (response.statusCode == 200) {
        if (mounted) {
          Navigator.of(context).pop(true);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('تم تحويل حالة (${widget.item.productName}) إلى تم الطلب من المورد بنجاح'),
              backgroundColor: AppTheme.success,
            ),
          );
        }
        return;
      }

      setState(() {
        _isSubmitting = false;
        _errorMessage = 'فشل تحديث حالة الصنف';
      });
    } catch (e) {
      setState(() {
        _isSubmitting = false;
        _errorMessage = ApiClient.formatError(e);
      });
    }
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
              // Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF3C7),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.local_shipping, color: Color(0xFFB45309), size: 26),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text(
                      'تأكيد طلب الصنف من المورد',
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Item Details Card
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppTheme.background,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.item.productName,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'الكمية المطلوبة: ${widget.item.requestedQuantity} وحدة',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.primaryDark,
                          ),
                        ),
                        if (widget.item.order?.requestNumber != null)
                          Text(
                            widget.item.order!.requestNumber,
                            style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
                          ),
                      ],
                    ),
                    if (widget.item.order?.customer != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        'العميل: ${widget.item.order!.customer!.displayName} (${widget.item.order!.customer!.phone})',
                        style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Supplier / Purchase Notes
              const Text(
                'بيانات المورد / ملاحظات الشراء (اختياري):',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _notesController,
                maxLines: 2,
                decoration: const InputDecoration(
                  hintText: 'مثال: تم الطلب من شركة ابن سينا فارما / متوقع الوصول غداً صباحاً',
                ),
              ),

              // Error display
              if (_errorMessage != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppTheme.error.withValues(alpha: 0.3)),
                  ),
                  child: Text(
                    _errorMessage!,
                    style: const TextStyle(color: AppTheme.error, fontSize: 12),
                    textAlign: TextAlign.center,
                  ),
                ),
              ],
              const SizedBox(height: 22),

              // Actions
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _isSubmitting ? null : () => Navigator.of(context).pop(false),
                      child: const Text('إلغاء'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _isSubmitting ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFD97706),
                      ),
                      child: _isSubmitting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : const Text('تأكيد الطلب'),
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
