import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/models/order_item_model.dart';
import '../../shared/widgets/pin_confirmation_dialog.dart';
import '../../shared/widgets/status_badge.dart';
import 'receiving_controller.dart';

class ReceivingScreen extends ConsumerStatefulWidget {
  const ReceivingScreen({super.key});

  @override
  ConsumerState<ReceivingScreen> createState() => _ReceivingScreenState();
}

class _ReceivingScreenState extends ConsumerState<ReceivingScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _openReceiveDialog(OrderItemModel item) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _ReceiveItemBottomSheet(
        item: item,
        onSuccess: () {
          ref.read(receivingControllerProvider.notifier).loadPendingItems();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(receivingControllerProvider);
    final controller = ref.read(receivingControllerProvider.notifier);
    final items = controller.filteredItems;

    return Scaffold(
      appBar: AppBar(
        title: const Text('استلام النواقص بالصيدلية'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => controller.loadPendingItems(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Search & Info Bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'ابحث باسم الدواء، المورد، أو العميل...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          controller.setSearch('');
                        },
                      )
                    : null,
              ),
              onChanged: (val) => controller.setSearch(val),
            ),
          ),

          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'الأصناف المطلوب استلامها: ${items.length} صنف',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
                ),
                if (state.isLoading)
                  const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 4),

          // Items List
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => controller.loadPendingItems(),
              child: state.isLoading && items.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : state.errorMessage != null && items.isEmpty
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(24.0),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.cloud_off, size: 48, color: AppTheme.error),
                                const SizedBox(height: 12),
                                Text(
                                  state.errorMessage!,
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(color: AppTheme.error),
                                ),
                                const SizedBox(height: 16),
                                ElevatedButton.icon(
                                  onPressed: () => controller.loadPendingItems(),
                                  icon: const Icon(Icons.refresh),
                                  label: const Text('إعادة المحاولة'),
                                ),
                              ],
                            ),
                          ),
                        )
                      : items.isEmpty
                          ? Center(
                              child: SingleChildScrollView(
                                physics: const AlwaysScrollableScrollPhysics(),
                                child: Padding(
                                  padding: const EdgeInsets.all(32.0),
                                  child: Column(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(20),
                                        decoration: BoxDecoration(
                                          color: AppTheme.primaryLight,
                                          shape: BoxShape.circle,
                                        ),
                                        child: const Icon(
                                          Icons.check_circle_outline,
                                          size: 56,
                                          color: AppTheme.primary,
                                        ),
                                      ),
                                      const SizedBox(height: 16),
                                      const Text(
                                        'لا توجد شحنات معلقة بالانتظار',
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                          color: AppTheme.textPrimary,
                                        ),
                                      ),
                                      const SizedBox(height: 6),
                                      const Text(
                                        'تم استلام جميع النواقص المطلوبة من الموردين بالكامل.',
                                        textAlign: TextAlign.center,
                                        style: TextStyle(fontSize: 13, color: AppTheme.textMuted),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            )
                          : ListView.builder(
                              physics: const AlwaysScrollableScrollPhysics(),
                              padding: const EdgeInsets.only(bottom: 24),
                              itemCount: items.length,
                              itemBuilder: (context, index) {
                                final item = items[index];
                                return _buildReceivingCard(item);
                              },
                            ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReceivingCard(OrderItemModel item) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Row: Request number + Status
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppTheme.background,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: Text(
                    item.order?.requestNumber ?? 'طلب نواقص',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.textSecondary),
                  ),
                ),
                StatusBadge(status: item.status),
              ],
            ),
            const SizedBox(height: 10),

            // Product Name
            Text(
              item.productName,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 12),

            // Quantity Breakdown Grid
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.background,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.border),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      children: [
                        const Text('المطلوبة', style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                        const SizedBox(height: 2),
                        Text(
                          '${item.requestedQuantity}',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.info),
                        ),
                      ],
                    ),
                  ),
                  Container(width: 1, height: 32, color: AppTheme.border),
                  Expanded(
                    child: Column(
                      children: [
                        const Text('المستلمة', style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                        const SizedBox(height: 2),
                        Text(
                          '${item.receivedQuantity}',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.warning),
                        ),
                      ],
                    ),
                  ),
                  Container(width: 1, height: 32, color: AppTheme.border),
                  Expanded(
                    child: Column(
                      children: [
                        const Text('المتبقية', style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                        const SizedBox(height: 2),
                        Text(
                          '${item.remainingQuantity}',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.error),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            if (item.order?.customer != null) ...[
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'العميل: ${item.order!.customer!.displayName}',
                    style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                  ),
                  Text(
                    item.order!.customer!.phone,
                    textDirection: TextDirection.ltr,
                    style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 14),

            // Action Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _openReceiveDialog(item),
                icon: const Icon(Icons.archive_outlined, size: 20),
                label: const Text('تسجيل استلام كمية'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),
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
      setState(() {
        _quantityToReceive++;
      });
    }
  }

  void _decrement() {
    if (_quantityToReceive > 1) {
      setState(() {
        _quantityToReceive--;
      });
    }
  }

  Future<void> _submitReceive() async {
    if (_quantityToReceive <= 0 || _quantityToReceive > widget.item.remainingQuantity) {
      setState(() {
        _errorMessage = 'الكمية المستلمة غير صالحة (يجب أن تكون بين 1 و ${widget.item.remainingQuantity})';
      });
      return;
    }

    final isFull = _quantityToReceive == widget.item.remainingQuantity;

    // 1. PIN Attribution Prompt
    final pinResult = await PinConfirmationDialog.show(
      context: context,
      title: isFull ? 'تأكيد استلام كامل الكمية' : 'تأكيد استلام كمية جزئية',
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
              content: Text(
                'تم تسجيل استلام $_quantityToReceive وحدة من (${widget.item.productName}) بنجاح!',
              ),
              backgroundColor: AppTheme.success,
            ),
          );
        }
        return;
      }

      setState(() {
        _isSubmitting = false;
        _errorMessage = 'فشل تسجيل الاستلام في الخادم';
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
            // Drag handle
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppTheme.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Title
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryLight,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.inventory_2_outlined, color: AppTheme.primary, size: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'تسجيل استلام بالصيدلية',
                        style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                      ),
                      Text(
                        widget.item.productName,
                        style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Stepper Quantity Selector
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
                      const Text(
                        'الكمية المستلمة الآن:',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                      ),
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
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      IconButton.filled(
                        onPressed: _quantityToReceive > 1 ? _decrement : null,
                        icon: const Icon(Icons.remove),
                        style: IconButton.styleFrom(
                          backgroundColor: AppTheme.border,
                          foregroundColor: AppTheme.textPrimary,
                        ),
                      ),
                      const SizedBox(width: 24),
                      Text(
                        '$_quantityToReceive',
                        style: const TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.primaryDark,
                        ),
                      ),
                      const SizedBox(width: 24),
                      IconButton.filled(
                        onPressed: _quantityToReceive < widget.item.remainingQuantity ? _increment : null,
                        icon: const Icon(Icons.add),
                        style: IconButton.styleFrom(
                          backgroundColor: AppTheme.primary,
                          foregroundColor: Colors.white,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'أقصى كمية متبقية للاستلام: ${widget.item.remainingQuantity} وحدة',
                    style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Notes input
            const Text(
              'ملاحظات الاستلام / رقم الفاتورة (اختياري):',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _notesController,
              decoration: const InputDecoration(
                hintText: 'مثال: استلام فاتورة رقم 1042 / مطابقة للمواصفات',
              ),
            ),

            if (_errorMessage != null) ...[
              const SizedBox(height: 12),
              Text(
                _errorMessage!,
                style: const TextStyle(color: AppTheme.error, fontSize: 13),
                textAlign: TextAlign.center,
              ),
            ],
            const SizedBox(height: 22),

            // Submit Button
            ElevatedButton(
              onPressed: _isSubmitting ? null : _submitReceive,
              child: _isSubmitting
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : Text('تأكيد الاستلام ($_quantityToReceive وحدة)'),
            ),
          ],
        ),
      ),
    );
  }
}
