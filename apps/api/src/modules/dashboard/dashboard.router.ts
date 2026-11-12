import { Router, Request, Response } from 'express';
import { prisma } from '../../prisma/client';
import { authenticateToken } from '../../middleware/auth';
import { ItemStatus } from '@prisma/client';

const router = Router();
router.use(authenticateToken);

// GET /api/dashboard/stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [
      totalOrders,
      newItems,
      awaitingPurchasing,
      orderedItems,
      partiallyReceived,
      readyForPickup,
      delivered,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.orderItem.count({ where: { status: ItemStatus.NEW } }),
      prisma.orderItem.count({
        where: {
          status: { in: [ItemStatus.REVIEWED, ItemStatus.ADDED_TO_PURCHASE] },
        },
      }),
      prisma.orderItem.count({ where: { status: ItemStatus.ORDERED } }),
      prisma.orderItem.count({ where: { status: ItemStatus.PARTIALLY_RECEIVED } }),
      prisma.orderItem.count({
        where: {
          status: { in: [ItemStatus.RECEIVED, ItemStatus.CUSTOMER_NOTIFIED] },
        },
      }),
      prisma.orderItem.count({ where: { status: ItemStatus.DELIVERED } }),
    ]);

    return res.json({
      totalRequests: totalOrders,
      newRequests: newItems,
      awaitingPurchasing,
      orderedProducts: orderedItems,
      partiallyReceived,
      readyForPickup,
      completedDeliveries: delivered,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'خطأ في جلب إحصائيات لوحة التحكم' });
  }
});

// GET /api/dashboard/top-requested
router.get('/top-requested', async (req: Request, res: Response) => {
  try {
    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId', 'productNameCustom'],
      _count: {
        id: true,
      },
      _sum: {
        requestedQuantity: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 7,
    });

    const transformed = topProducts.map((p) => ({
      productId: p.productId,
      name: p.productNameCustom,
      requestsCount: p._count.id,
      totalQuantity: p._sum.requestedQuantity || 0,
    }));

    return res.json(transformed);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/recent-activity
router.get('/recent-activity', async (req: Request, res: Response) => {
  try {
    const recentLogs = await prisma.activityLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        authenticatedUser: { select: { fullName: true, username: true } },
        performerEmployee: { select: { fullName: true, role: true } },
      },
    });

    return res.json(recentLogs);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
