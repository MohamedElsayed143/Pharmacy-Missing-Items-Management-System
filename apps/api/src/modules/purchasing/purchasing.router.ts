import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { prisma } from '../../prisma/client';
import { authenticateToken, requireRole } from '../../middleware/auth';
import { verifyPerformerAttribution } from '../../middleware/performer';
import { logActivity } from '../activity/activity.service';
import { broadcastEvent } from '../../realtime/socket';
import { ItemStatus, BatchStatus, Role } from '@prisma/client';
import { ItemPriority, OrderItemStatus } from '@pharmacy/shared';

const router = Router();
router.use(authenticateToken);

// Helper: Generate next Batch Number (PB-YYYYMM-001)
async function generateNextBatchNumber(): Promise<string> {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `PB-${yearMonth}-`;

  const count = await prisma.purchaseBatch.count({
    where: { batchNumber: { startsWith: prefix } },
  });

  const nextNum = count + 1;
  return `${prefix}${String(nextNum).padStart(3, '0')}`;
}

// GET /api/purchasing/grouped (Group items for purchasing manager)
router.get('/grouped', async (req: Request, res: Response) => {
  try {
    // Items that need purchasing: NEW, REVIEWED, or ADDED_TO_PURCHASE
    const items = await prisma.orderItem.findMany({
      where: {
        status: {
          in: [ItemStatus.NEW, ItemStatus.REVIEWED, ItemStatus.ADDED_TO_PURCHASE],
        },
      },
      include: {
        product: true,
        order: {
          include: {
            customer: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    // Group by verified product key: name + strength + dosageForm
    const groupedMap = new Map<string, any>();

    for (const item of items) {
      const key = `${item.productNameCustom.toLowerCase()}__${(item.strength || '').toLowerCase()}__${item.dosageForm.toLowerCase()}`;

      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          productKey: key,
          productId: item.productId,
          productName: item.productNameCustom,
          strength: item.strength,
          dosageForm: item.dosageForm,
          totalRequestedQuantity: 0,
          customerCount: 0,
          priorities: {
            emergency: 0,
            urgent: 0,
            normal: 0,
          },
          orderItems: [],
        });
      }

      const group = groupedMap.get(key);
      group.totalRequestedQuantity += item.requestedQuantity - item.receivedQuantity;
      group.customerCount += 1;

      if (item.priority === 'EMERGENCY') group.priorities.emergency += 1;
      else if (item.priority === 'URGENT') group.priorities.urgent += 1;
      else group.priorities.normal += 1;

      group.orderItems.push({
        id: item.id,
        orderId: item.orderId,
        requestNumber: item.order.requestNumber,
        customerPhone: item.order.customer.phone,
        customerName: item.order.customer.name,
        quantity: item.requestedQuantity,
        receivedQuantity: item.receivedQuantity,
        priority: item.priority,
        status: item.status,
        notes: item.notes,
        createdAt: item.createdAt.toISOString(),
      });
    }

    const groupedList = Array.from(groupedMap.values()).sort((a, b) => {
      // Sort primarily by emergency count, then total quantity
      if (b.priorities.emergency !== a.priorities.emergency) {
        return b.priorities.emergency - a.priorities.emergency;
      }
      return b.totalRequestedQuantity - a.totalRequestedQuantity;
    });

    return res.json(groupedList);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'خطأ في تجميع أصناف الشراء' });
  }
});

// POST /api/purchasing/batches (Create purchase batch)
router.post(
  '/batches',
  requireRole(Role.ADMIN, Role.PURCHASING_MANAGER),
  verifyPerformerAttribution,
  async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        supplierName: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
        itemIds: z.array(z.string()).min(1, 'يجب تحديد صنف واحد على الأقل لإنشاء أمر الشراء'),
        performerEmployeeId: z.string().min(1),
        performerPin: z.string().min(1),
      });

      const parseResult = schema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0].message });
      }

      const { supplierName, notes, itemIds } = parseResult.data;
      const authUserId = req.user!.id;
      const performerId = req.performer!.id;

      const batch = await prisma.$transaction(async (tx) => {
        const batchNumber = await generateNextBatchNumber();

        // 1. Fetch order items to verify
        const items = await tx.orderItem.findMany({
          where: { id: { in: itemIds } },
        });

        if (items.length === 0) {
          throw new Error('لم يتم العثور على أي من الأصناف المحددة');
        }

        // 2. Create batch
        const newBatch = await tx.purchaseBatch.create({
          data: {
            batchNumber,
            supplierName: supplierName || null,
            notes: notes || null,
            status: BatchStatus.DRAFT,
            createdById: authUserId,
            items: {
              create: items.map((it) => ({
                orderItemId: it.id,
                orderedQuantity: it.requestedQuantity - it.receivedQuantity,
                receivedQuantity: 0,
              })),
            },
          },
          include: {
            createdBy: { select: { id: true, fullName: true } },
            items: {
              include: {
                orderItem: {
                  include: { product: true },
                },
              },
            },
          },
        });

        // 3. Mark items as ADDED_TO_PURCHASE
        await tx.orderItem.updateMany({
          where: { id: { in: itemIds } },
          data: { status: ItemStatus.ADDED_TO_PURCHASE },
        });

        return newBatch;
      });

      // Write activity log
      await logActivity({
        action: 'PURCHASE_BATCH_CREATED',
        entityType: 'PURCHASE_BATCH',
        entityId: batch.id,
        authenticatedUserId: authUserId,
        performerEmployeeId: performerId,
        notes: `إنشاء أمر شراء جديد ${batch.batchNumber} يحتوي على ${batch.items.length} صنف`,
      });

      broadcastEvent('purchaseBatch:created', batch);

      return res.status(201).json(batch);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'خطأ في إنشاء أمر الشراء' });
    }
  }
);

// GET /api/purchasing/batches (List all batches)
router.get('/batches', async (req: Request, res: Response) => {
  try {
    const batches = await prisma.purchaseBatch.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        items: {
          include: {
            orderItem: {
              include: {
                product: true,
                order: { include: { customer: true } },
              },
            },
          },
        },
      },
    });

    const transformed = batches.map((b) => ({
      ...b,
      itemsCount: b.items.length,
    }));

    return res.json(transformed);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/purchasing/batches/:id
router.get('/batches/:id', async (req: Request, res: Response) => {
  try {
    const batch = await prisma.purchaseBatch.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        items: {
          include: {
            orderItem: {
              include: {
                product: true,
                order: { include: { customer: true } },
              },
            },
          },
        },
      },
    });

    if (!batch) {
      return res.status(404).json({ error: 'أمر الشراء غير موجود' });
    }

    return res.json(batch);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// PATCH /api/purchasing/batches/:id/order (Mark batch as ordered from supplier)
router.patch(
  '/batches/:id/order',
  requireRole(Role.ADMIN, Role.PURCHASING_MANAGER),
  verifyPerformerAttribution,
  async (req: Request, res: Response) => {
    try {
      const batchId = req.params.id;
      const authUserId = req.user!.id;
      const performerId = req.performer!.id;

      const batch = await prisma.purchaseBatch.findUnique({
        where: { id: batchId },
        include: { items: true },
      });

      if (!batch) {
        return res.status(404).json({ error: 'أمر الشراء غير موجود' });
      }

      const itemIds = batch.items.map((i) => i.orderItemId);

      await prisma.$transaction(async (tx) => {
        // 1. Update batch status
        await tx.purchaseBatch.update({
          where: { id: batchId },
          data: {
            status: BatchStatus.ORDERED,
            orderedAt: new Date(),
          },
        });

        // 2. Transition linked items to ORDERED
        await tx.orderItem.updateMany({
          where: { id: { in: itemIds } },
          data: { status: ItemStatus.ORDERED },
        });

        // 3. Record history for each item
        for (const itemId of itemIds) {
          await tx.orderItemStatusHistory.create({
            data: {
              orderItemId: itemId,
              fromStatus: ItemStatus.ADDED_TO_PURCHASE,
              toStatus: ItemStatus.ORDERED,
              authenticatedUserId: authUserId,
              performerEmployeeId: performerId,
              notes: `تم طلب الصنف ضمن أمر الشراء ${batch.batchNumber}`,
            },
          });
        }
      });

      await logActivity({
        action: 'PURCHASE_BATCH_ORDERED',
        entityType: 'PURCHASE_BATCH',
        entityId: batchId,
        authenticatedUserId: authUserId,
        performerEmployeeId: performerId,
        notes: `تم اعتماد طلب أمر الشراء ${batch.batchNumber} وتحديث حالة الأصناف إلى تم الطلب`,
      });

      broadcastEvent('purchaseBatch:updated', { id: batchId, status: BatchStatus.ORDERED });

      return res.json({ success: true, message: 'تم تحديث حالة أمر الشراء والأصناف التابعة بنجاح' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);

// GET /api/purchasing/batches/:id/export (Export to Excel)
router.get('/:id/export', async (req: Request, res: Response) => {
  try {
    const batch = await prisma.purchaseBatch.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: { select: { fullName: true } },
        items: {
          include: {
            orderItem: {
              include: {
                product: true,
                order: { include: { customer: true } },
              },
            },
          },
        },
      },
    });

    if (!batch) {
      return res.status(404).json({ error: 'أمر الشراء غير موجود' });
    }

    // Build worksheet data
    const rows = batch.items.map((it, idx) => ({
      'م': idx + 1,
      'اسم الصنف الدوائي': it.orderItem.productNameCustom,
      'التركيز': it.orderItem.strength || '-',
      'الشكل الصيدلاني': it.orderItem.dosageForm,
      'الكمية المطلوبة': it.orderedQuantity,
      'درجة الأهمية': it.orderItem.priority,
      'رقم طلب العميل': it.orderItem.order.requestNumber,
      'ملاحظات': it.orderItem.notes || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'قائمة طلبية الشراء');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename="Purchase_Batch_${batch.batchNumber}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    return res.send(buffer);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'خطأ في تصدير ملف الإكسل' });
  }
});

export default router;
