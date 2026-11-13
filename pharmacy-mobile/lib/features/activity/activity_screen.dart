import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/models/activity_log_model.dart';

class ActivityScreen extends StatefulWidget {
  const ActivityScreen({super.key});

  @override
  State<ActivityScreen> createState() => _ActivityScreenState();
}

class _ActivityScreenState extends State<ActivityScreen> {
  List<ActivityLogModel> _logs = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadActivity();
  }

  Future<void> _loadActivity() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final response = await ApiClient().dio.get('/activity', queryParameters: {'limit': 50});
      if (response.statusCode == 200) {
        final data = response.data is List ? response.data as List : (response.data['data'] as List? ?? []);
        setState(() {
          _logs = data.map((item) => ActivityLogModel.fromJson(item as Map<String, dynamic>)).toList();
          _isLoading = false;
        });
        return;
      }

      // Fallback to /dashboard/recent-activity
      final dashRes = await ApiClient().dio.get('/dashboard/recent-activity');
      if (dashRes.statusCode == 200 && dashRes.data is List) {
        setState(() {
          _logs = (dashRes.data as List).map((item) => ActivityLogModel.fromJson(item as Map<String, dynamic>)).toList();
          _isLoading = false;
        });
        return;
      }

      setState(() {
        _isLoading = false;
        _errorMessage = 'تعذر جلب سجل العمليات';
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = ApiClient.formatError(e);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('yyyy/MM/dd - hh:mm a');

    return Scaffold(
      appBar: AppBar(
        title: const Text('سجل العمليات والأنشطة'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadActivity,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadActivity,
        child: _isLoading
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
                          ElevatedButton(onPressed: _loadActivity, child: const Text('إعادة المحاولة')),
                        ],
                      ),
                    ),
                  )
                : _logs.isEmpty
                    ? const Center(child: Text('لا توجد عمليات مسجلة في النظام'))
                    : ListView.builder(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        itemCount: _logs.length,
                        itemBuilder: (context, index) {
                          final log = _logs[index];
                          final formattedTime = log.createdAt != null ? dateFormat.format(log.createdAt!) : '';

                          return Container(
                            margin: const EdgeInsets.only(bottom: 10),
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: AppTheme.border),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.02),
                                  blurRadius: 4,
                                  offset: const Offset(0, 1),
                                ),
                              ],
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: AppTheme.primaryLight,
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Icon(Icons.history, color: AppTheme.primary, size: 20),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Expanded(
                                            child: Text(
                                              log.actionArabic,
                                              style: const TextStyle(
                                                fontSize: 14,
                                                fontWeight: FontWeight.bold,
                                                color: AppTheme.textPrimary,
                                              ),
                                            ),
                                          ),
                                          Text(
                                            formattedTime,
                                            style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                                          ),
                                        ],
                                      ),
                                      if (log.performerName != null) ...[
                                        const SizedBox(height: 4),
                                        Text(
                                          'الموظف المنفذ: ${log.performerName}',
                                          style: const TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w600,
                                            color: AppTheme.primaryDark,
                                          ),
                                        ),
                                      ],
                                      if (log.notes != null && log.notes!.isNotEmpty) ...[
                                        const SizedBox(height: 4),
                                        Text(
                                          log.notes!,
                                          style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}
