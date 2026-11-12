import { Router, Request, Response } from 'express';
import { prisma } from '../../prisma/client';
import { authenticateToken, requireRole } from '../../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

// GET /api/activity-logs
router.get('/', requireRole(Role.ADMIN, Role.PURCHASING_MANAGER, Role.EMPLOYEE), async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 30));
    const skip = (page - 1) * limit;

    const action = req.query.action as string;
    const entityType = req.query.entityType as string;
    const performerId = req.query.performerId as string;

    const where: any = {};
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (performerId) where.performerEmployeeId = performerId;

    const [total, logs] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          authenticatedUser: { select: { fullName: true, username: true } },
          performerEmployee: { select: { fullName: true, role: true } },
        },
      }),
    ]);

    return res.json({
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'خطأ في جلب سجل النشاطات' });
  }
});

export default router;
