import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PerformerPinModal } from '../components/common/PerformerPinModal';
import { UserRole, ROLE_LABELS } from '@pharmacy/shared';
import {
  Users,
  UserPlus,
  ShieldAlert,
  KeyRound,
  CheckCircle,
  XCircle,
  Edit2,
  RefreshCw,
  X,
  AlertCircle,
} from 'lucide-react';

export const EmployeesPage: React.FC = () => {
  const { refreshPerformers } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Add Employee Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newFullName, setNewFullName] = useState<string>('');
  const [newUsername, setNewUsername] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [newPin, setNewPin] = useState<string>('');
  const [newRole, setNewRole] = useState<UserRole>(UserRole.EMPLOYEE);

  // Edit / Reset Modal
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  const [editFullName, setEditFullName] = useState<string>('');
  const [editRole, setEditRole] = useState<UserRole>(UserRole.EMPLOYEE);
  const [editActive, setEditActive] = useState<boolean>(true);
  const [resetPassword, setResetPassword] = useState<string>('');
  const [resetPin, setResetPin] = useState<string>('');

  // Performer Confirmation Modal
  const [isPerformerModalOpen, setIsPerformerModalOpen] = useState<boolean>(false);
  const [actionType, setActionType] = useState<'create' | 'update'>('create');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/employees');
      setEmployees(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleOpenEdit = (emp: any) => {
    setSelectedEmp(emp);
    setEditFullName(emp.fullName);
    setEditRole(emp.role);
    setEditActive(emp.isActive);
    setResetPassword('');
    setResetPin('');
  };

  const handleStartPerformerCheck = (type: 'create' | 'update') => {
    setActionType(type);
    setIsPerformerModalOpen(true);
  };

  const handleConfirmAction = async (performerEmployeeId: string, performerPin: string) => {
    setIsSubmitting(true);
    try {
      if (actionType === 'create') {
        await api.post('/employees', {
          fullName: newFullName.trim(),
          username: newUsername.trim(),
          password: newPassword,
          pin: newPin,
          role: newRole,
          performerEmployeeId,
          performerPin,
        });

        setIsAddModalOpen(false);
        setIsPerformerModalOpen(false);
        setFeedback({ type: 'success', text: 'تم إنشاء حساب الموظف الجديد بنجاح' });
        fetchEmployees();
        refreshPerformers();
      } else if (actionType === 'update' && selectedEmp) {
        await api.patch(`/employees/${selectedEmp.id}`, {
          fullName: editFullName.trim() || undefined,
          role: editRole,
          isActive: editActive,
          password: resetPassword || undefined,
          pin: resetPin || undefined,
          performerEmployeeId,
          performerPin,
        });

        setSelectedEmp(null);
        setIsPerformerModalOpen(false);
        setFeedback({ type: 'success', text: 'تم تحديث بيانات الموظف بنجاح' });
        fetchEmployees();
        refreshPerformers();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'حدث خطأ أثناء حفظ التعديل';
      throw new Error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-600" />
            <span>إدارة طاقم العمل والصلاحيات والرموز السرية</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            إضافة الموظفين والصيادلة، تعيين الأدوار والصلاحيات، وإعادة تعيين الرموز السرية (PIN).
          </p>
        </div>

        <button
          onClick={() => {
            setNewFullName('');
            setNewUsername('');
            setNewPassword('');
            setNewPin('');
            setNewRole(UserRole.EMPLOYEE);
            setIsAddModalOpen(true);
          }}
          className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-600/20 flex items-center gap-1.5 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>إضافة موظف / صيدلي جديد</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border border-rose-300 text-rose-800'
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Employees Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase">
              <tr>
                <th className="px-4 py-3.5">الاسم الكامل</th>
                <th className="px-4 py-3.5">اسم المستخدم</th>
                <th className="px-4 py-3.5">الدور الوظيفي والصلاحية</th>
                <th className="px-4 py-3.5">الحالة</th>
                <th className="px-4 py-3.5">إجمالي الطلبات المنشأة</th>
                <th className="px-4 py-3.5">إجمالي العمليات المنفذة</th>
                <th className="px-4 py-3.5">تاريخ الانضمام</th>
                <th className="px-4 py-3.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    جاري تحميل قائمة الموظفين...
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-900">{emp.fullName}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-600">{emp.username}</td>
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {ROLE_LABELS[emp.role as UserRole] || emp.role}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {emp.isActive ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>نشط</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-bold">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>معطل</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-bold">{emp._count?.createdOrders ?? 0}</td>
                    <td className="px-4 py-3.5 font-bold text-brand-700">
                      {emp._count?.performerActivityLogs ?? 0}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                      {new Date(emp.createdAt).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => handleOpenEdit(emp)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 mx-auto"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>تعديل / PIN</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-brand-600 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">إضافة موظف / صيدلي جديد</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded-lg hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل:</label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="د. فلان الفلاني"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم المستخدم:</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. ahmed_pharma"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور:</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الرمز السري (PIN):
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="4 أرقام"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono text-center tracking-widest"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الدور والصلاحيات:</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50 focus:bg-white"
                >
                  <option value={UserRole.EMPLOYEE}>{ROLE_LABELS.EMPLOYEE}</option>
                  <option value={UserRole.PURCHASING_MANAGER}>{ROLE_LABELS.PURCHASING_MANAGER}</option>
                  <option value={UserRole.ADMIN}>{ROLE_LABELS.ADMIN}</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => handleStartPerformerCheck('create')}
                  disabled={!newFullName || !newUsername || !newPassword || !newPin}
                  className="px-5 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg shadow-sm"
                >
                  متابعة وتأكيد بالرمز السري
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Reset Employee Modal */}
      {selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">تعديل بيانات: {selectedEmp.fullName}</h3>
              <button onClick={() => setSelectedEmp(null)} className="p-1 rounded-lg hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل:</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الدور الوظيفي:</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50 focus:bg-white"
                >
                  <option value={UserRole.EMPLOYEE}>{ROLE_LABELS.EMPLOYEE}</option>
                  <option value={UserRole.PURCHASING_MANAGER}>{ROLE_LABELS.PURCHASING_MANAGER}</option>
                  <option value={UserRole.ADMIN}>{ROLE_LABELS.ADMIN}</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activeToggle"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
                />
                <label htmlFor="activeToggle" className="text-xs font-bold text-slate-700 cursor-pointer">
                  الحساب نشط ويحق له تسجيل الدخول وتنفيذ العمليات
                </label>
              </div>

              <div className="border-t border-slate-200 pt-3 space-y-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase">
                  إعادة تعيين كلمة المرور أو الرمز السري (اتركه فارغاً لعدم التغيير):
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      كلمة مرور جديدة:
                    </label>
                    <input
                      type="password"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      placeholder="اختياري"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      رمز PIN جديد:
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      value={resetPin}
                      onChange={(e) => setResetPin(e.target.value)}
                      placeholder="اختياري"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono text-center tracking-widest"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedEmp(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => handleStartPerformerCheck('update')}
                  className="px-5 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm"
                >
                  حفظ وتأكيد بالرمز السري
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performer PIN Modal */}
      <PerformerPinModal
        isOpen={isPerformerModalOpen}
        title="تأكيد صلاحية مدير النظام"
        description="تتطلب إدارة كادر الصيدلية وتعديل الصلاحيات تأكيد الرمز السري للمدير المنفذ."
        actionButtonText="تأكيد العملية الآن"
        onConfirm={handleConfirmAction}
        onCancel={() => setIsPerformerModalOpen(false)}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};
