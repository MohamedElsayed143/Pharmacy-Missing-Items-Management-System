import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart' hide TextDirection;
import '../../core/constants/status_constants.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/models/order_item_model.dart';
import '../../shared/widgets/status_badge.dart';
import 'request_detail_screen.dart';
import 'requests_controller.dart';

class RequestsListScreen extends ConsumerStatefulWidget {
  final String? initialStatus;

  const RequestsListScreen({super.key, this.initialStatus});

  @override
  ConsumerState<RequestsListScreen> createState() => _RequestsListScreenState();
}

class _RequestsListScreenState extends ConsumerState<RequestsListScreen> {
  late final TextEditingController _searchController;

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(requestsControllerProvider(widget.initialStatus));
    final controller = ref.read(requestsControllerProvider(widget.initialStatus).notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('قائمة نواقص الأدوية'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => controller.fetchItems(refresh: true),
          ),
        ],
      ),
      body: Column(
        children: [
          // Search Bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'ابحث باسم الدواء، رقم العميل، أو رقم الطلب...',
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

          // Horizontal Status Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: Row(
              children: [
                _buildFilterChip(
                  label: 'الكل',
                  isSelected: state.selectedStatus == null,
                  onSelected: () => controller.setStatusFilter(null),
                ),
                const SizedBox(width: 8),
                _buildFilterChip(
                  label: 'جديد',
                  isSelected: state.selectedStatus == StatusConstants.statusNew,
                  onSelected: () => controller.setStatusFilter(StatusConstants.statusNew),
                ),
                const SizedBox(width: 8),
                _buildFilterChip(
                  label: 'تمت المراجعة',
                  isSelected: state.selectedStatus == StatusConstants.statusReviewed,
                  onSelected: () => controller.setStatusFilter(StatusConstants.statusReviewed),
                ),
                const SizedBox(width: 8),
                _buildFilterChip(
                  label: 'تم الطلب من المورد',
                  isSelected: state.selectedStatus == StatusConstants.statusOrdered,
                  onSelected: () => controller.setStatusFilter(StatusConstants.statusOrdered),
                ),
                const SizedBox(width: 8),
                _buildFilterChip(
                  label: 'مستلم جزئياً',
                  isSelected: state.selectedStatus == StatusConstants.statusPartiallyReceived,
                  onSelected: () => controller.setStatusFilter(StatusConstants.statusPartiallyReceived),
                ),
                const SizedBox(width: 8),
                _buildFilterChip(
                  label: 'تم الاستلام',
                  isSelected: state.selectedStatus == StatusConstants.statusReceived,
                  onSelected: () => controller.setStatusFilter(StatusConstants.statusReceived),
                ),
                const SizedBox(width: 8),
                _buildFilterChip(
                  label: 'تم التسليم',
                  isSelected: state.selectedStatus == StatusConstants.statusDelivered,
                  onSelected: () => controller.setStatusFilter(StatusConstants.statusDelivered),
                ),
              ],
            ),
          ),

          // Total Count Banner
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'عدد النتائج: ${state.totalCount} صنف',
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

          // Items List View
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => controller.fetchItems(refresh: true),
              child: state.isLoading && state.items.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : state.errorMessage != null && state.items.isEmpty
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
                                  onPressed: () => controller.fetchItems(refresh: true),
                                  icon: const Icon(Icons.refresh),
                                  label: const Text('إعادة المحاولة'),
                                ),
                              ],
                            ),
                          ),
                        )
                      : state.items.isEmpty
                          ? Center(
                              child: SingleChildScrollView(
                                physics: const AlwaysScrollableScrollPhysics(),
                                child: Padding(
                                  padding: const EdgeInsets.all(32.0),
                                  child: Column(
                                    children: [
                                      Icon(Icons.inventory_2_outlined, size: 64, color: AppTheme.textMuted.withValues(alpha: 0.5)),
                                      const SizedBox(height: 16),
                                      const Text(
                                        'لا توجد طلبات نواقص مطابقة',
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                          color: AppTheme.textSecondary,
                                        ),
                                      ),
                                      const SizedBox(height: 6),
                                      const Text(
                                        'جرب تغيير كلمة البحث أو فلاتر الحالة',
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
                              itemCount: state.items.length,
                              itemBuilder: (context, index) {
                                final item = state.items[index];
                                return _buildItemCard(context, item);
                              },
                            ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip({
    required String label,
    required bool isSelected,
    required VoidCallback onSelected,
  }) {
    return FilterChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => onSelected(),
      selectedColor: AppTheme.primaryLight,
      checkmarkColor: AppTheme.primary,
      labelStyle: TextStyle(
        color: isSelected ? AppTheme.primaryDark : AppTheme.textSecondary,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        fontSize: 12,
      ),
    );
  }

  Widget _buildItemCard(BuildContext context, OrderItemModel item) {
    final dateFormat = DateFormat('yyyy/MM/dd - hh:mm a');
    final formattedTime = item.createdAt != null ? dateFormat.format(item.createdAt!) : '';

    return Card(
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => RequestDetailScreen(orderItemId: item.id),
            ),
          ).then((_) {
            ref.read(requestsControllerProvider(widget.initialStatus).notifier).fetchItems(silent: true);
          });
        },
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(14.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Row: Request Number + Priority Badge + Status Badge
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
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
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                      ),
                      if (item.priority == 'URGENT' || item.priority == 'EMERGENCY') ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFEF2F2),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            'عاجل',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.error,
                            ),
                          ),
                        ),
                      ],
                    ],
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

              // Strength & Dosage Form
              if ((item.strength != null && item.strength!.isNotEmpty) ||
                  (item.dosageForm != null && item.dosageForm!.isNotEmpty)) ...[
                const SizedBox(height: 3),
                Text(
                  [item.strength, item.dosageForm].where((e) => e != null && e.isNotEmpty).join(' • '),
                  style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
                ),
              ],
              const SizedBox(height: 10),

              // Quantities Info & Customer Info
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppTheme.background,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    // Quantities
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'الكمية:',
                            style: TextStyle(fontSize: 11, color: AppTheme.textMuted),
                          ),
                          const SizedBox(height: 2),
                          RichText(
                            text: TextSpan(
                              style: const TextStyle(fontFamily: 'Cairo', color: AppTheme.textPrimary, fontSize: 13),
                              children: [
                                const TextSpan(text: 'المطلوبة: '),
                                TextSpan(
                                  text: '${item.requestedQuantity}',
                                  style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.info),
                                ),
                                const TextSpan(text: '  |  المستلمة: '),
                                TextSpan(
                                  text: '${item.receivedQuantity}',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: item.isFullyReceived ? AppTheme.success : AppTheme.warning,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Customer
                    if (item.order?.customer != null) ...[
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            item.order!.customer!.displayName,
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            item.order!.customer!.phone,
                            textDirection: TextDirection.ltr,
                            style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),

              // Notes
              if (item.notes != null && item.notes!.trim().isNotEmpty) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.notes, size: 14, color: AppTheme.textMuted),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        item.notes!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                      ),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 8),

              // Footer: Date & Arrow
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    formattedTime,
                    style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                  ),
                  const Row(
                    children: [
                      Text(
                        'التفاصيل والإجراءات',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primary),
                      ),
                      SizedBox(width: 2),
                      Icon(Icons.arrow_forward_ios, size: 11, color: AppTheme.primary),
                    ],
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
