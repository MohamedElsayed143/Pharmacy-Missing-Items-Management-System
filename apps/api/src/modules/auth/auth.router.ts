import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../prisma/client';
import { authenticateToken } from '../../middleware/auth';
import { logActivity } from '../activity/activity.service';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'pharmacy-default-secret';

const loginSchema = z.object({
  username: z.string().min(1, 'اسم المستخدم مطلوب'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
  workstationName: z.string().optional(),
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { username, password, workstationName } = parseResult.data;

    const employee = await prisma.employee.findUnique({
      where: { username },
    });

    if (!employee || !employee.isActive) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة أو الحساب معطل' });
    }

    const passwordMatches = await bcrypt.compare(password, employee.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    const token = jwt.sign(
      {
        sub: employee.id,
        username: employee.username,
        role: employee.role,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Audit log login
    await logActivity({
      action: 'WORKSTATION_LOGIN',
      entityType: 'SESSION',
      entityId: employee.id,
      authenticatedUserId: employee.id,
      performerEmployeeId: employee.id,
      notes: `تسجيل دخول محطة العمل: ${workstationName || 'محطة رئيسية'}`,
    });

    return res.json({
      token,
      employee: {
        id: employee.id,
        fullName: employee.fullName,
        username: employee.username,
        role: employee.role,
        isActive: employee.isActive,
        createdAt: employee.createdAt.toISOString(),
        updatedAt: employee.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'خطأ أثناء تسجيل الدخول' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  return res.json({ employee: req.user });
});

// GET /api/auth/active-performers
router.get('/active-performers', authenticateToken, async (req: Request, res: Response) => {
  try {
    const activeStaff = await prisma.employee.findMany({
      where: { isActive: true },
      select: {
        id: true,
        fullName: true,
        role: true,
      },
      orderBy: { fullName: 'asc' },
    });

    return res.json(activeStaff);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'خطأ في جلب قائمة الموظفين النشطين' });
  }
});

// POST /api/auth/verify-pin
router.post('/verify-pin', authenticateToken, async (req: Request, res: Response) => {
  const { employeeId, pin } = req.body;
  if (!employeeId || !pin) {
    return res.status(400).json({ valid: false, error: 'المعرف والرمز السري مطلوبان' });
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { pinHash: true, passwordHash: true, isActive: true },
  });

  if (!employee || !employee.isActive) {
    return res.status(404).json({ valid: false, error: 'الموظف غير نشط أو غير موجود' });
  }

  const cleanPin = String(pin).trim();
  const isValid =
    (await bcrypt.compare(cleanPin, employee.pinHash)) ||
    (await bcrypt.compare(cleanPin, employee.passwordHash));

  return res.json({ valid: isValid });
});

export default router;
