import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart' hide TextDirection;
import '../../core/constants/status_constants.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/models/order_item_model.dart';
import '../../shared/widgets/pin_confirmation_dialog.dart';
import '../../shared/widgets/status_badge.dart';
import '../purchasing/mark_ordered_dialog.dart';

class RequestDetailScreen extends StatefulWidget {
  final String orderItemId;

  const RequestDetailScreen({super.key, required this.orderItemId});

  @override
  State<RequestDetailScreen> createState() => _RequestDetailScreenState();
}

class _RequestDetailScreenState extends State<RequestDetailScreen> {
  OrderItemModel? _item;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadItemDetails();
  }

  Future<void> _loadItemDetails() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final response = await ApiClient().dio.get('/orders/items/${widget.orderItemId}');
      if (response.statusCode == 200 && response.data != null) {
        setState(() {
          _item = OrderItemModel.fromJson(response.data as Map<String, dynamic>);
          _isLoading = false;
        });
        return;
      }

      setState(() {
        _isLoading = false;
        _errorMessage = 'تعذر العثور على بيانات الصنف';
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = ApiClient.formatError(e);
      });
    }
  }

  void _copyToClipboard(String text, String label) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('تم نسخ $label إلى الحافظة: $text')),
    );
  }

  Future<void> _markAsOrdered() async {
    if (_item == null) return;
    final success = await MarkOrderedDialog.show(context, _item!);
    if (success == true) {
      _loadItemDetails();
    }
  }

  void _receiveQuantity() {
    if (_item == null) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _ReceiveItemBottomSheet(
        item: _item!,
        onSuccess: () => _loadItemDetails(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('yyyy/MM/dd - hh:mm a');

    return Scaffold(
      appBar: AppBar(
        title: Text(_item != null ? (_item!.order?.requestNumber ?? 'تفاصيل الطلب') : 'تفاصيل الطلب'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadItemDetails,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, size: 48, color: AppTheme.error),
                        const SizedBox(height: 12),
                        Text(_errorMessage!, textAlign: TextAlign.center, style: const TextStyle(color: AppTheme.error)),
                        const SizedBox(height: 16),
                        ElevatedButton(onPressed: _loadItemDetails, child: const Text('إعادة المحاولة')),
                      ],
                    ),
                  ),
                )
              : _item == null
                  ? const Center(child: Text('لا توجد بيانات لهذا الصنف'))
                  : SingleChildScrollView(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // 1. Product Summary Card
                          _buildProductCard(_item!),
                          const SizedBox(height: 16),

                          // 2. Quantities & Progress Card
                          _buildQuantitiesCard(_item!),
                          const SizedBox(height: 16),

                          // 3. Customer Info Card
                          if (_item!.order?.customer != null) ...[
                            _buildCustomerCard(_item!.order!.customer!),
                            const SizedBox(height: 16),
                          ],

                          // 4. Request Details & Notes Card
                          _buildRequestMetaCard(_item!, dateFormat),
                          const SizedBox(height: 16),

                          // 5. Status Timeline / Audit History
                          _buildHistorySection(_item!, dateFormat),
                          const SizedBox(height: 80), // spacing for bottom bar
                        ],
                      ),
                    ),
      // Bottom Action Bar
      bottomNavigationBar: _item != null ? _buildBottomActionBar(_item!) : null,
    );
  }

  Widget _buildProductCard(OrderItemModel item) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 6, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.primaryLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  item.order?.requestNumber ?? 'طلب نواقص',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primaryDark,
                  ),
                ),
              ),
              StatusBadge(status: item.status),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            item.productName,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: AppTheme.textPrimary,
            ),
          ),
          if ((item.strength != null && item.strength!.isNotEmpty) ||
              (item.dosageForm != null && item.dosageForm!.isNotEmpty)) ...[
            const SizedBox(height: 6),
            Text(
              [item.strength, item.dosageForm].where((e) => e != null && e.isNotEmpty).join(' • '),
              style: const TextStyle(fontSize: 14, color: AppTheme.textSecondary),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildQuantitiesCard(OrderItemModel item) {
    final progress = item.requestedQuantity > 0 ? (item.receivedQuantity / item.requestedQuantity).clamp(0.0, 1.0) : 0.0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'حالة استلام الكميات',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
          ),
          const SizedBox(height: 12),
          // Progress bar
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 10,
              backgroundColor: AppTheme.border,
              valueColor: AlwaysStoppedAnimation<Color>(
                item.isFullyReceived ? AppTheme.success : AppTheme.warning,
              ),
            ),
          ),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildQtyColumn('المطلوبة', '${item.requestedQuantity}', AppTheme.info),
              _buildQtyColumn('المستلمة', '${item.receivedQuantity}', AppTheme.warning),
              _buildQtyColumn('المتبقية', '${item.remainingQuantity}', AppTheme.error),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildQtyColumn(String label, String value, Color color) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
        const SizedBox(height: 4),
        Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
      ],
    );
  }

  Widget _buildCustomerCard(CustomerInfo customer) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'بيانات العميل',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(Icons.person_outline, size: 20, color: AppTheme.primary),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  customer.displayName,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
                ),
              ),
              if (customer.customerCode != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppTheme.background,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: Text(
                    customer.customerCode!,
                    style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              const Icon(Icons.phone_outlined, size: 20, color: AppTheme.primary),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  customer.phone,
                  textDirection: TextDirection.ltr,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.copy, size: 18, color: AppTheme.primary),
                tooltip: 'نسخ رقم الهاتف',
                onPressed: () => _copyToClipboard(customer.phone, 'رقم العميل'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRequestMetaCard(OrderItemModel item, DateFormat dateFormat) {
    final createdTime = item.createdAt != null ? dateFormat.format(item.createdAt!) : '-';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'بيانات التسجيل والملاحظات',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('تاريخ التسجيل:', style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
              Text(createdTime, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
            ],
          ),
          if (item.order?.createdByName != null) ...[
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('الموظف المسجل للطلب:', style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                Text(item.order!.createdByName!, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
              ],
            ),
          ],
          if (item.notes != null && item.notes!.trim().isNotEmpty) ...[
            const Divider(height: 20),
            const Text('ملاحظات الصنف:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
            const SizedBox(height: 4),
            Text(item.notes!, style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
          ],
        ],
      ),
    );
  }

  Widget _buildHistorySection(OrderItemModel item, DateFormat dateFormat) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'سجل تتبع الحالة (Timeline)',
          style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
        ),
        const SizedBox(height: 10),
        if (item.history.isEmpty)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.border),
            ),
            child: const Center(
              child: Text('لا توجد سجلات تتبع سابقة لهذا الصنف', style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
            ),
          )
        else
          ...item.history.map((h) => _buildTimelineItem(h, dateFormat)),
      ],
    );
  }

  Widget _buildTimelineItem(StatusHistoryItem h, DateFormat dateFormat) {
    final timeStr = h.createdAt != null ? dateFormat.format(h.createdAt!) : '';

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  StatusBadge(status: h.toStatus, fontSize: 11),
                  if (h.fromStatus.isNotEmpty) ...[
                    const SizedBox(width: 4),
                    const Icon(Icons.arrow_back, size: 12, color: AppTheme.textMuted),
                    const SizedBox(width: 4),
                    Text(
                      StatusConstants.getLabel(h.fromStatus),
                      style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                    ),
                  ],
                ],
              ),
              Text(timeStr, style: const TextStyle(fontSize: 10, color: AppTheme.textMuted)),
            ],
          ),
          if (h.performerName != null) ...[
            const SizedBox(height: 6),
            Text(
              'المنفذ: ${h.performerName}',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
            ),
          ],
          if (h.notes != null && h.notes!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              h.notes!,
              style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildBottomActionBar(OrderItemModel item) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 10, offset: const Offset(0, -2)),
        ],
      ),
      child: SafeArea(
        child: Row(
          children: [
            if (item.canBeOrdered) ...[
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _markAsOrdered,
                  icon: const Icon(Icons.local_shipping, size: 20),
                  label: const Text('طلب من المورد'),
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFD97706)),
                ),
              ),
            ],
            if (item.canBeReceived) ...[
              if (item.canBeOrdered) const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _receiveQuantity,
                  icon: const Icon(Icons.archive_outlined, size: 20),
                  label: const Text('استلام في الصيدلية'),
                  style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
                ),
              ),
            ],
            if (!item.canBeOrdered && !item.canBeReceived) ...[
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    color: AppTheme.background,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: Text(
                      'حالة الصنف الحالية: ${StatusConstants.getLabel(item.status)}',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.textSecondary),
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ReceiveItemBottomSheet extends StatefulWidget {
  final OrderItemModel item;
  final VoidCallback onSuccess;

  const _ReceiveItemBottomSheet({required this.item, required this.onSuccess});

  @override
  State<_ReceiveItemBottomSheet> createState() => _ReceiveItemBottomSheetState();
}

class _ReceiveItemBottomSheetState extends State<_ReceiveItemBottomSheet> {
  late int _quantityToReceive;
  final _notesController = TextEditingController();
  bool _isSubmitting = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _quantityToReceive = widget.item.remainingQuantity;
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  void _increment() {
    if (_quantityToReceive < widget.item.remainingQuantity) {
      setState(() => _quantityToReceive++);
    }
  }

  void _decrement() {
    if (_quantityToReceive > 1) {
      setState(() => _quantityToReceive--);
    }
  }

  Future<void> _submitReceive() async {
    final pinResult = await PinConfirmationDialog.show(
      context: context,
      title: 'تأكيد استلام الكمية في الصيدلية',
      description: 'سيتم استلام $_quantityToReceive وحدة من (${widget.item.productName}). أدخل الرمز السري لتسجيل العملية.',
      confirmButtonText: 'تأكيد الاستلام',
    );

    if (pinResult == null) return;

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      final response = await ApiClient().dio.post(
        '/receiving/receive-items',
        data: {
          'allocations': [
            {
              'orderItemId': widget.item.id,
              'quantityReceived': _quantityToReceive,
            }
          ],
          'notes': _notesController.text.trim().isNotEmpty
              ? _notesController.text.trim()
              : 'استلام عبر تطبيق الموبايل',
          'performerEmployeeId': pinResult.performerEmployeeId,
          'performerPin': pinResult.performerPin,
        },
      );

      if (response.statusCode == 200) {
        if (mounted) {
          Navigator.of(context).pop();
          widget.onSuccess();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('تم استلام $_quantityToReceive وحدة من (${widget.item.productName}) بنجاح'),
              backgroundColor: AppTheme.success,
            ),
          );
        }
        return;
      }

      setState(() {
        _isSubmitting = false;
        _errorMessage = 'فشل تسجيل الاستلام';
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
    final isFull = _quantityToReceive == widget.item.remainingQuantity;

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(color: AppTheme.border, borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'تسجيل استلام كمية في الصيدلية',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.background,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.border),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('الكمية المستلمة:', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: isFull ? const Color(0xFFECFDF5) : const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          isFull ? 'استلام كامل' : 'استلام جزئي',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: isFull ? AppTheme.success : AppTheme.warning,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      IconButton.filled(
                        onPressed: _quantityToReceive > 1 ? _decrement : null,
                        icon: const Icon(Icons.remove),
                        style: IconButton.styleFrom(backgroundColor: AppTheme.border, foregroundColor: AppTheme.textPrimary),
                      ),
                      const SizedBox(width: 24),
                      Text(
                        '$_quantityToReceive',
                        style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: AppTheme.primaryDark),
                      ),
                      const SizedBox(width: 24),
                      IconButton.filled(
                        onPressed: _quantityToReceive < widget.item.remainingQuantity ? _increment : null,
                        icon: const Icon(Icons.add),
                        style: IconButton.styleFrom(backgroundColor: AppTheme.primary, foregroundColor: Colors.white),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _notesController,
              decoration: const InputDecoration(hintText: 'ملاحظات الاستلام / رقم الفاتورة (اختياري)'),
            ),
            if (_errorMessage != null) ...[
              const SizedBox(height: 12),
              Text(_errorMessage!, style: const TextStyle(color: AppTheme.error, fontSize: 13), textAlign: TextAlign.center),
            ],
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _isSubmitting ? null : _submitReceive,
              child: _isSubmitting
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : Text('تأكيد الاستلام ($_quantityToReceive وحدة)'),
            ),
          ],
        ),
      ),
    );
  }
}
