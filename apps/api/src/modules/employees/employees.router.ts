import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../prisma/client';
import { authenticateToken, requireRole } from '../../middleware/auth';
import { verifyPerformerAttribution } from '../../middleware/performer';
import { logActivity } from '../activity/activity.service';
import { Role } from '@prisma/client';

const router = Router();
router.use(authenticateToken);

const createEmployeeSchema = z.object({
  fullName: z.string().min(2, 'الاسم الكامل مطلوب'),
  username: z.string().min(3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  pin: z.string().min(4, 'الرمز السري (PIN) يجب أن يكون 4 أرقام على الأقل'),
  role: z.nativeEnum(Role),
  performerEmployeeId: z.string().min(1),
  performerPin: z.string().min(1),
});

// GET /api/employees (Admin only)
router.get('/', requireRole(Role.ADMIN), async (req: Request, res: Response) => {
  try {
    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        fullName: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            createdOrders: true,
            performerActivityLogs: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(employees);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/employees (Create employee)
router.post('/', requireRole(Role.ADMIN), verifyPerformerAttribution, async (req: Request, res: Response) => {
  try {
    const parseResult = createEmployeeSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { fullName, username, password, pin, role } = parseResult.data;
    const authUserId = req.user!.id;
    const performerId = req.performer!.id;

    // Check if username taken
    const existing = await prisma.employee.findUnique({ where: { username } });
    if (existing) {
      return res.status(409).json({ error: 'اسم المستخدم مسجل مسبقاً لموظف آخر' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const pinHash = await bcrypt.hash(pin, 10);

    const newEmployee = await prisma.employee.create({
      data: {
        fullName,
        username,
        passwordHash,
        pinHash,
        role,
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await logActivity({
      action: 'EMPLOYEE_CREATED',
      entityType: 'EMPLOYEE',
      entityId: newEmployee.id,
      authenticatedUserId: authUserId,
      performerEmployeeId: performerId,
      notes: `إضافة موظف جديد: ${fullName} (${username}) بصلاحية ${role}`,
    });

    return res.status(201).json(newEmployee);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// PATCH /api/employees/:id (Update employee, reset password/PIN, toggle active)
router.patch('/:id', requireRole(Role.ADMIN), verifyPerformerAttribution, async (req: Request, res: Response) => {
  try {
    const empId = req.params.id;
    const { fullName, role, isActive, password, pin } = req.body;
    const authUserId = req.user!.id;
    const performerId = req.performer!.id;

    const currentEmp = await prisma.employee.findUnique({ where: { id: empId } });
    if (!currentEmp) {
      return res.status(404).json({ error: 'الموظف غير موجود' });
    }

    const updateData: any = {};
    if (fullName) updateData.fullName = fullName;
    if (role && Object.values(Role).includes(role)) updateData.role = role;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (password) updateData.passwordHash = await bcrypt.hash(password, 10);
    if (pin) updateData.pinHash = await bcrypt.hash(pin, 10);

    const updated = await prisma.employee.update({
      where: { id: empId },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        username: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    await logActivity({
      action: 'EMPLOYEE_UPDATED',
      entityType: 'EMPLOYEE',
      entityId: empId,
      authenticatedUserId: authUserId,
      performerEmployeeId: performerId,
      notes: `تعديل بيانات الموظف: ${updated.fullName} (الحالة النشطة: ${updated.isActive})`,
    });

    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
