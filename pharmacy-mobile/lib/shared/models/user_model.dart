class UserModel {
  final String id;
  final String fullName;
  final String username;
  final String role;
  final bool isActive;

  const UserModel({
    required this.id,
    required this.fullName,
    required this.username,
    required this.role,
    required this.isActive,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String? ?? '',
      fullName: json['fullName'] as String? ?? '',
      username: json['username'] as String? ?? '',
      role: json['role'] as String? ?? 'EMPLOYEE',
      isActive: json['isActive'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'fullName': fullName,
      'username': username,
      'role': role,
      'isActive': isActive,
    };
  }

  bool get isAdmin => role == 'ADMIN';
  bool get isPurchasingManager => role == 'PURCHASING_MANAGER' || isAdmin;
  bool get isStaff => role == 'EMPLOYEE' || role == 'PHARMACIST';

  String get roleArabic {
    switch (role) {
      case 'ADMIN':
        return 'مدير النظام والصيدلية';
      case 'PURCHASING_MANAGER':
        return 'مسؤول المشتريات';
      case 'PHARMACIST':
        return 'صيدلي';
      case 'EMPLOYEE':
        return 'موظف مبيعات / صيدلي';
      default:
        return role;
    }
  }
}
