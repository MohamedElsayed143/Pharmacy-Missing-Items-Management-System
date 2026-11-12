import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma/client';
import { authenticateToken } from '../../middleware/auth';
import { verifyPerformerAttribution } from '../../middleware/performer';
import { logActivity } from '../activity/activity.service';
import { broadcastEvent } from '../../realtime/socket';
import {
  isValidStatusTransition,
  getAllowedTransitions,
  OrderItemStatus,
  ItemPriority,
  OrderOverallStatus,
} from '@pharmacy/shared';
import { ItemStatus, Priority, OverallStatus } from '@prisma/client';

const router = Router();
router.use(authenticateToken);

const createOrderItemSchema = z.object({
  productName: z.string().min(1, 'اسم الدواء مطلوب'),
  strength: z.string().optional().nullable(),
  dosageForm: z.string().min(1, 'الشكل الصيدلاني مطلوب'),
  requestedQuantity: z.number().int().positive('الكمية يجب أن تكون عدداً موجباً'),
  priority: z.nativeEnum(ItemPriority).optional().default(ItemPriority.NORMAL),
  notes: z.string().optional().nullable(),
});

const createOrderSchema = z.object({
  customerPhone: z.string().min(6, 'رقم هاتف العميل مطلوب (6 أرقام على الأقل)'),
  customerCode: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(createOrderItemSchema).min(1, 'يجب إضافة صنف واحد على الأقل للطلب'),
  performerEmployeeId: z.string().min(1, 'يجب اختيار الموظف المنفذ'),
  performerPin: z.string().min(1, 'الرمز السري مطلوب'),
});

// Helper: Generate next request number (REQ-000001 format)
async function generateNextRequestNumber(): Promise<string> {
  const count = await prisma.order.count();
  const nextNum = count + 1;
  const padded = String(nextNum).padStart(6, '0');
  const candidate = `REQ-${padded}`;

  // Check if candidate exists (in case of manual deletion/gap)
  const existing = await prisma.order.findUnique({ where: { requestNumber: candidate } });
  if (!existing) return candidate;

  // Otherwise, use a unique timestamp-derived code
  return `REQ-${Date.now().toString().slice(-6)}`;
}

// GET /api/orders/check-duplicates
router.get('/check-duplicates', async (req: Request, res: Response) => {
  try {
    const phone = req.query.phone as string;
    const productName = req.query.productName as string;

    const whereClause: any = {
      status: {
        notIn: [ItemStatus.DELIVERED, ItemStatus.CANCELLED],
      },
    };

    if (phone) {
      whereClause.order = {
        customer: { phone: { contains: phone } },
      };
    }

    if (productName) {
      whereClause.productNameCustom = {
        contains: productName,
        mode: 'insensitive',
      };
    }

    const duplicates = await prisma.orderItem.findMany({
      where: whereClause,
      take: 5,
      include: {
        order: {
          include: {
            customer: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ hasDuplicates: duplicates.length > 0, items: duplicates });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/orders (Create missing item request)
router.post('/', verifyPerformerAttribution, async (req: Request, res: Response) => {
  try {
    const parseResult = createOrderSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { customerPhone, customerCode, customerName, notes, items } = parseResult.data;
    const authUserId = req.user!.id;
    const performerId = req.performer!.id;

    // Run transaction
    const order = await prisma.$transaction(async (tx) => {
      // 1. Find or create customer
      let customer = await tx.customer.findFirst({
        where: { phone: customerPhone },
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            phone: customerPhone,
            customerCode: customerCode || null,
            name: customerName || null,
          },
        });
      } else if (customerName && !customer.name) {
        customer = await tx.customer.update({
          where: { id: customer.id },
          data: { name: customerName, customerCode: customerCode || customer.customerCode },
        });
      }

      // 2. Generate request number
      const requestNumber = await generateNextRequestNumber();

      // 3. Process products & order items
      const itemsData = [];
      for (const item of items) {
        const trimmedName = item.productName.trim();
        const trimmedStrength = item.strength?.trim() || null;
        const dosageForm = item.dosageForm.trim();

        // Find or create product
        let product = await tx.product.findFirst({
          where: {
            name: { equals: trimmedName, mode: 'insensitive' },
            strength: trimmedStrength,
            dosageForm: dosageForm,
          },
        });

        if (!product) {
          product = await tx.product.create({
            data: {
              name: trimmedName,
              strength: trimmedStrength,
              dosageForm: dosageForm,
            },
          });
        }

        itemsData.push({
          productId: product.id,
          productNameCustom: trimmedName,
          strength: trimmedStrength,
          dosageForm: dosageForm,
          requestedQuantity: item.requestedQuantity,
          receivedQuantity: 0,
          priority: item.priority as unknown as Priority,
          status: ItemStatus.NEW,
          notes: item.notes || null,
        });
      }

      // 4. Create Order
      const newOrder = await tx.order.create({
        data: {
          requestNumber,
          customerId: customer.id,
          createdById: authUserId,
          overallStatus: OverallStatus.OPEN,
          notes: notes || null,
          items: {
            create: itemsData,
          },
        },
        include: {
          customer: true,
          createdBy: { select: { id: true, fullName: true, username: true } },
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      return newOrder;
    });

    // Write activity log for creation
    await logActivity({
      action: 'ORDER_CREATED',
      entityType: 'ORDER',
      entityId: order.id,
      authenticatedUserId: authUserId,
      performerEmployeeId: performerId,
      notes: `تسجيل طلب نواقص جديد برقم ${order.requestNumber} بعدد أصناف (${order.items.length})`,
      newState: { requestNumber: order.requestNumber, itemsCount: order.items.length },
    });

    // Broadcast real-time event
    broadcastEvent('order:created', order);

    return res.status(201).json(order);
  } catch (error: any) {
    console.error('Error creating order:', error);
    return res.status(500).json({ error: error.message || 'حدث خطأ أثناء حفظ طلب النواقص' });
  }
});

// GET /api/orders (List orders with pagination & filters)
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const search = req.query.search as string;
    const status = req.query.status as string;
    const priority = req.query.priority as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const employeeId = req.query.employeeId as string;

    const where: any = {};

    if (status) {
      where.overallStatus = status;
    }

    if (employeeId) {
      where.createdById = employeeId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    if (search) {
      where.OR = [
        { requestNumber: { contains: search, mode: 'insensitive' } },
        { customer: { phone: { contains: search } } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { customerCode: { contains: search, mode: 'insensitive' } } },
        { items: { some: { productNameCustom: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    if (priority) {
      where.items = {
        some: { priority: priority as Priority },
      };
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          createdBy: { select: { id: true, fullName: true, username: true } },
          items: {
            include: {
              product: true,
            },
          },
        },
      }),
    ]);

    return res.json({
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'خطأ في جلب قائمة الطلبات' });
  }
});

// GET /api/orders/items (Flat list of all items for granular status tracking)
router.get('/items', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 30));
    const skip = (page - 1) * limit;

    const search = req.query.search as string;
    const status = req.query.status as string;
    const priority = req.query.priority as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const where: any = {};

    if (status) {
      where.status = status as ItemStatus;
    }

    if (priority) {
      where.priority = priority as Priority;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    if (search) {
      where.OR = [
        { productNameCustom: { contains: search, mode: 'insensitive' } },
        { order: { requestNumber: { contains: search, mode: 'insensitive' } } },
        { order: { customer: { phone: { contains: search } } } },
        { order: { customer: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.orderItem.count({ where }),
      prisma.orderItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        include: {
          product: true,
          order: {
            include: {
              customer: true,
              createdBy: { select: { fullName: true, username: true } },
            },
          },
        },
      }),
    ]);

    return res.json({
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'خطأ في جلب أصناف النواقص' });
  }
});

// GET /api/orders/:id (Single order details)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        createdBy: { select: { id: true, fullName: true, username: true } },
        items: {
          include: {
            product: true,
            history: {
              orderBy: { createdAt: 'desc' },
              include: {
                authenticatedUser: { select: { fullName: true, username: true } },
                performerEmployee: { select: { fullName: true, role: true } },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'الطلب غير موجود' });
    }

    return res.json(order);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// PATCH /api/orders/items/:id/status (Transition item status with strict validation & performer attribution)
router.patch('/items/:id/status', verifyPerformerAttribution, async (req: Request, res: Response) => {
  try {
    const { status, notes } = req.body;
    const itemId = req.params.id;

    if (!status || !Object.values(OrderItemStatus).includes(status)) {
      return res.status(400).json({ error: 'حالة الصنف غير صالحة' });
    }

    const currentItem = await prisma.orderItem.findUnique({
      where: { id: itemId },
      include: { order: true },
    });

    if (!currentItem) {
      return res.status(404).json({ error: 'صنف الطلب غير موجود' });
    }

    // Validate workflow transition
    const currentStatus = currentItem.status as unknown as OrderItemStatus;
    const targetStatus = status as OrderItemStatus;

    if (!isValidStatusTransition(currentStatus, targetStatus)) {
      const allowed = getAllowedTransitions(currentStatus);
      return res.status(400).json({
        error: `لا يمكن تحويل الحالة من (${currentStatus}) إلى (${targetStatus}). الحالات المسموحة: ${allowed.join(', ') || 'لا يوجد (حالة نهائية)'}`,
      });
    }

    const authUserId = req.user!.id;
    const performerId = req.performer!.id;

    const updatedItem = await prisma.$transaction(async (tx) => {
      // 1. Update order item status
      const item = await tx.orderItem.update({
        where: { id: itemId },
        data: {
          status: targetStatus as unknown as ItemStatus,
          updatedAt: new Date(),
        },
        include: {
          product: true,
          order: { include: { customer: true, createdBy: true } },
        },
      });

      // 2. Record status history
      await tx.orderItemStatusHistory.create({
        data: {
          orderItemId: itemId,
          fromStatus: currentStatus as unknown as ItemStatus,
          toStatus: targetStatus as unknown as ItemStatus,
          authenticatedUserId: authUserId,
          performerEmployeeId: performerId,
          notes: notes || null,
        },
      });

      // 3. Update overall order status if all items are completed or cancelled
      const allItems = await tx.orderItem.findMany({
        where: { orderId: currentItem.orderId },
      });

      const allDelivered = allItems.every((it) => it.status === ItemStatus.DELIVERED);
      const allDoneOrCancelled = allItems.every(
        (it) => it.status === ItemStatus.DELIVERED || it.status === ItemStatus.CANCELLED
      );

      let newOverallStatus: OverallStatus = OverallStatus.IN_PROGRESS;
      if (allDelivered) {
        newOverallStatus = OverallStatus.COMPLETED;
      } else if (allDoneOrCancelled) {
        newOverallStatus = OverallStatus.CANCELLED;
      }

      await tx.order.update({
        where: { id: currentItem.orderId },
        data: { overallStatus: newOverallStatus },
      });

      return item;
    });

    // Write audit log
    await logActivity({
      action: 'ORDER_ITEM_STATUS_CHANGED',
      entityType: 'ORDER_ITEM',
      entityId: itemId,
      previousState: { status: currentStatus },
      newState: { status: targetStatus },
      authenticatedUserId: authUserId,
      performerEmployeeId: performerId,
      notes: `تغيير حالة الصنف (${updatedItem.productNameCustom}) من ${currentStatus} إلى ${targetStatus}. ${notes || ''}`,
    });

    broadcastEvent('orderItem:statusChanged', updatedItem);

    return res.json(updatedItem);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'خطأ أثناء تحديث حالة الصنف' });
  }
});

// GET /api/orders/items/:id/history (Complete status history)
router.get('/items/:id/history', async (req: Request, res: Response) => {
  try {
    const history = await prisma.orderItemStatusHistory.findMany({
      where: { orderItemId: req.params.id },
      orderBy: { createdAt: 'desc' },
      include: {
        authenticatedUser: { select: { fullName: true, username: true } },
        performerEmployee: { select: { fullName: true, role: true } },
      },
    });

    return res.json(history);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
