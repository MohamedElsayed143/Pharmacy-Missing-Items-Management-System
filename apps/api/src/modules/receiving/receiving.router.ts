import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma/client';
import { authenticateToken } from '../../middleware/auth';
import { verifyPerformerAttribution } from '../../middleware/performer';
import { logActivity } from '../activity/activity.service';
import { broadcastEvent } from '../../realtime/socket';
import { ItemStatus, OverallStatus } from '@prisma/client';

const router = Router();
router.use(authenticateToken);

const receiveItemsSchema = z.object({
  allocations: z.array(
    z.object({
      orderItemId: z.string().min(1),
      quantityReceived: z.number().int().positive('الكمية المستلمة يجب أن تكون موجبة'),
    })
  ).min(1, 'يجب تحديد صنف واحد على الأقل للاستلام'),
  notes: z.string().optional().nullable(),
  performerEmployeeId: z.string().min(1),
  performerPin: z.string().min(1),
});

// POST /api/receiving/receive-items
router.post('/receive-items', verifyPerformerAttribution, async (req: Request, res: Response) => {
  try {
    const parseResult = receiveItemsSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { allocations, notes } = parseResult.data;
    const authUserId = req.user!.id;
    const performerId = req.performer!.id;

    const results = await prisma.$transaction(async (tx) => {
      const updatedItems = [];

      for (const alloc of allocations) {
        const item = await tx.orderItem.findUnique({
          where: { id: alloc.orderItemId },
          include: { order: { include: { customer: true } } },
        });

        if (!item) {
          throw new Error(`الصنف ${alloc.orderItemId} غير موجود`);
        }

        const newReceivedQty = item.receivedQuantity + alloc.quantityReceived;
        const isFullyReceived = newReceivedQty >= item.requestedQuantity;
        const newStatus = isFullyReceived ? ItemStatus.RECEIVED : ItemStatus.PARTIALLY_RECEIVED;
        const prevStatus = item.status;

        const updated = await tx.orderItem.update({
          where: { id: item.id },
          data: {
            receivedQuantity: newReceivedQty,
            status: newStatus,
            updatedAt: new Date(),
          },
          include: {
            product: true,
            order: { include: { customer: true } },
          },
        });

        // Record status history if status changed
        if (prevStatus !== newStatus) {
          await tx.orderItemStatusHistory.create({
            data: {
              orderItemId: item.id,
              fromStatus: prevStatus,
              toStatus: newStatus,
              authenticatedUserId: authUserId,
              performerEmployeeId: performerId,
              notes: `تم استلام ${alloc.quantityReceived} وحدة (إجمالي المستلم: ${newReceivedQty} من ${item.requestedQuantity}). ${notes || ''}`,
            },
          });
        }

        updatedItems.push(updated);
      }

      return updatedItems;
    });

    // Write audit log
    await logActivity({
      action: 'ITEMS_RECEIVED_INTO_PHARMACY',
      entityType: 'INVENTORY_RECEIVING',
      entityId: results[0]?.id || 'BATCH',
      authenticatedUserId: authUserId,
      performerEmployeeId: performerId,
      notes: `تم تسجيل استلام بضاعة لعدد (${results.length}) أصناف نواقص بالصيدلية`,
      newState: { updatedCount: results.length },
    });

    broadcastEvent('item:received', { count: results.length });
    broadcastEvent('stats:updated');

    return res.json({ success: true, receivedCount: results.length, items: results });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'خطأ أثناء تسجيل استلام الأصناف' });
  }
});

// POST /api/receiving/notify-customer
router.post('/notify-customer', verifyPerformerAttribution, async (req: Request, res: Response) => {
  try {
    const { orderItemId, notes } = req.body;
    if (!orderItemId) {
      return res.status(400).json({ error: 'معرف الصنف مطلوب' });
    }

    const item = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { order: { include: { customer: true } } },
    });

    if (!item) {
      return res.status(404).json({ error: 'الصنف غير موجود' });
    }

    const authUserId = req.user!.id;
    const performerId = req.performer!.id;
    const prevStatus = item.status;

    const updated = await prisma.$transaction(async (tx) => {
      const it = await tx.orderItem.update({
        where: { id: orderItemId },
        data: {
          status: ItemStatus.CUSTOMER_NOTIFIED,
          updatedAt: new Date(),
        },
        include: {
          product: true,
          order: { include: { customer: true } },
        },
      });

      await tx.orderItemStatusHistory.create({
        data: {
          orderItemId,
          fromStatus: prevStatus,
          toStatus: ItemStatus.CUSTOMER_NOTIFIED,
          authenticatedUserId: authUserId,
          performerEmployeeId: performerId,
          notes: notes || 'تم التواصل هاتفياً مع العميل وإبلاغه بتوفر الصنف',
        },
      });

      return it;
    });

    await logActivity({
      action: 'CUSTOMER_NOTIFIED',
      entityType: 'ORDER_ITEM',
      entityId: orderItemId,
      authenticatedUserId: authUserId,
      performerEmployeeId: performerId,
      notes: `إبلاغ العميل (${item.order.customer.phone}) بوصول الصنف (${item.productNameCustom})`,
    });

    broadcastEvent('orderItem:statusChanged', updated);

    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/receiving/deliver-to-customer
router.post('/deliver-to-customer', verifyPerformerAttribution, async (req: Request, res: Response) => {
  try {
    const { orderItemId, notes } = req.body;
    if (!orderItemId) {
      return res.status(400).json({ error: 'معرف الصنف مطلوب' });
    }

    const item = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { order: { include: { customer: true } } },
    });

    if (!item) {
      return res.status(404).json({ error: 'الصنف غير موجود' });
    }

    const authUserId = req.user!.id;
    const performerId = req.performer!.id;
    const prevStatus = item.status;

    const updated = await prisma.$transaction(async (tx) => {
      const it = await tx.orderItem.update({
        where: { id: orderItemId },
        data: {
          status: ItemStatus.DELIVERED,
          updatedAt: new Date(),
        },
        include: {
          product: true,
          order: { include: { customer: true } },
        },
      });

      await tx.orderItemStatusHistory.create({
        data: {
          orderItemId,
          fromStatus: prevStatus,
          toStatus: ItemStatus.DELIVERED,
          authenticatedUserId: authUserId,
          performerEmployeeId: performerId,
          notes: notes || 'تم تسليم الصنف للعميل بالصيدلية بنجاح',
        },
      });

      // Update parent order overall status if all items are delivered
      const remainingItems = await tx.orderItem.findMany({
        where: {
          orderId: item.orderId,
          status: { notIn: [ItemStatus.DELIVERED, ItemStatus.CANCELLED] },
        },
      });

      if (remainingItems.length === 0) {
        await tx.order.update({
          where: { id: item.orderId },
          data: { overallStatus: OverallStatus.COMPLETED },
        });
      }

      return it;
    });

    await logActivity({
      action: 'CUSTOMER_DELIVERED',
      entityType: 'ORDER_ITEM',
      entityId: orderItemId,
      authenticatedUserId: authUserId,
      performerEmployeeId: performerId,
      notes: `تسليم الصنف (${item.productNameCustom}) للعميل (${item.order.customer.phone}) وإغلاق الطلب`,
    });

    broadcastEvent('orderItem:statusChanged', updated);
    broadcastEvent('stats:updated');

    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
