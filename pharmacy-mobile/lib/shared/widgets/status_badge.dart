import 'package:flutter/material.dart';
import '../../core/constants/status_constants.dart';

class StatusBadge extends StatelessWidget {
  final String status;
  final bool showIcon;
  final double fontSize;
  final EdgeInsetsGeometry padding;

  const StatusBadge({
    super.key,
    required this.status,
    this.showIcon = true,
    this.fontSize = 12,
    this.padding = const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
  });

  @override
  Widget build(BuildContext context) {
    final info = StatusConstants.getInfo(status);

    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: info.backgroundColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: info.foregroundColor.withValues(alpha: 0.25),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (showIcon) ...[
            Icon(
              info.icon,
              size: fontSize + 3,
              color: info.foregroundColor,
            ),
            const SizedBox(width: 4),
          ],
          Text(
            info.arabicLabel,
            style: TextStyle(
              color: info.foregroundColor,
              fontSize: fontSize,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}
