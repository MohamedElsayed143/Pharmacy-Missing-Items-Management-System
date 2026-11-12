import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma/client';
import { authenticateToken } from '../../middleware/auth';
import { verifyPerformerAttribution } from '../../middleware/performer';
import { getWhatsAppConfig } from './whatsapp.config';
import {
  getMessagePreview,
  sendWhatsAppNotification,
  updateCustomerConsent,
  updateCustomerAddress,
  processWhatsAppWebhook,
  isCustomerInside24HourWindow,
} from './whatsapp.service';
import { WhatsAppMessageType, WhatsAppMessageStatus } from '@prisma/client';

const router = Router();

// ==========================================
// Meta Webhook Endpoints (Public)
// ==========================================

// GET /api/whatsapp/webhook (Meta verification handshake)
router.get('/webhook', (req: Request, res: Response) => {
  const config = getWhatsAppConfig();
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.webhookVerifyToken) {
    console.log('✓ Meta WhatsApp Webhook verified successfully');
    return res.status(200).send(challenge);
  } else {
    console.warn('✗ Meta WhatsApp Webhook verification failed. Invalid verify token.');
    return res.status(403).send('Forbidden: Invalid verify token');
  }
});

// POST /api/whatsapp/webhook (Incoming status updates and messages)
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    const result = await processWhatsAppWebhook(req.body, signature, req.body);
    return res.status(200).json({ status: 'ok', ...result });
  } catch (error: any) {
    console.error('Webhook processing error:', error.message);
    return res.status(400).json({ error: error.message });
  }
});

// ==========================================
// Authenticated Endpoints
// ==========================================
router.use(authenticateToken);

// POST /api/whatsapp/messages/preview
router.post('/messages/preview', async (req: Request, res: Response) => {
  try {
    const { customerId, orderItemId, messageType, deliveryPreference } = req.body;
    if (!customerId) {
      return res.status(400).json({ error: 'معرف العميل مطلوب' });
    }

    const preview = await getMessagePreview(
      customerId,
      orderItemId,
      messageType || WhatsAppMessageType.PRODUCT_ARRIVED,
      deliveryPreference || 'HOME_DELIVERY'
    );

    return res.json(preview);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'خطأ في إنشاء معاينة الرسالة' });
  }
});

// POST /api/whatsapp/messages/send
const sendMessageSchema = z.object({
  customerId: z.string().min(1, 'معرف العميل مطلوب'),
  orderItemId: z.string().optional(),
  orderId: z.string().optional(),
  messageType: z.nativeEnum(WhatsAppMessageType).default(WhatsAppMessageType.CUSTOM),
  messageBody: z.string().min(1, 'نص الرسالة مطلوب'),
  templateName: z.string().optional(),
  deliveryPreference: z.enum(['HOME_DELIVERY', 'STORE_PICKUP']).optional(),
  performerEmployeeId: z.string().min(1, 'الموظف المنفذ مطلوب'),
  performerPin: z.string().min(1, 'الرمز السري مطلوب'),
});

router.post('/messages/send', verifyPerformerAttribution, async (req: Request, res: Response) => {
  try {
    const parseResult = sendMessageSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const authUserId = req.user!.id;
    const performerId = req.performer!.id;

    const result = await sendWhatsAppNotification({
      ...parseResult.data,
      performerEmployeeId: performerId,
      authenticatedUserId: authUserId,
    });

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'فشل إرسال رسالة الواتساب' });
  }
});

// GET /api/whatsapp/messages (List message history)
router.get('/messages', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const customerId = req.query.customerId as string;
    const orderItemId = req.query.orderItemId as string;
    const status = req.query.status as string;

    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (orderItemId) where.orderItemId = orderItemId;
    if (status) where.status = status as WhatsAppMessageStatus;

    const [total, messages] = await Promise.all([
      prisma.whatsAppMessage.count({ where }),
      prisma.whatsAppMessage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          sentByEmployee: { select: { id: true, fullName: true, role: true } },
        },
      }),
    ]);

    return res.json({
      data: messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'خطأ في جلب سجل رسائل الواتساب' });
  }
});

// GET /api/whatsapp/messages/:id
router.get('/messages/:id', async (req: Request, res: Response) => {
  try {
    const message = await prisma.whatsAppMessage.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        sentByEmployee: { select: { id: true, fullName: true, role: true } },
        authenticatedUser: { select: { id: true, fullName: true, username: true } },
      },
    });

    if (!message) {
      return res.status(404).json({ error: 'رسالة الواتساب غير موجودة' });
    }

    return res.json(message);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/whatsapp/customer-window/:customerId
router.get('/customer-window/:customerId', async (req: Request, res: Response) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.customerId },
      select: {
        id: true,
        phone: true,
        name: true,
        address: true,
        addressDetails: true,
        area: true,
        deliveryNotes: true,
        whatsappConsent: true,
        whatsappConsentTimestamp: true,
        whatsappConsentSource: true,
        lastCustomerMessageAt: true,
      },
    });

    if (!customer) {
      return res.status(404).json({ error: 'العميل غير موجود' });
    }

    const isInsideWindow = await isCustomerInside24HourWindow(customer.id);

    return res.json({
      customer,
      isInside24HourWindow: isInsideWindow,
      hasConsent: customer.whatsappConsent,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// PATCH /api/whatsapp/customer/:customerId/consent
const updateConsentSchema = z.object({
  consent: z.boolean(),
  source: z.string().optional().default('IN_STORE_VERBAL'),
  performerEmployeeId: z.string().min(1, 'الموظف المنفذ مطلوب'),
  performerPin: z.string().min(1, 'الرمز السري مطلوب'),
});

router.patch(
  '/customer/:customerId/consent',
  verifyPerformerAttribution,
  async (req: Request, res: Response) => {
    try {
      const parseResult = updateConsentSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0].message });
      }

      const { consent, source } = parseResult.data;
      const authUserId = req.user!.id;
      const performerId = req.performer!.id;

      const updated = await updateCustomerConsent(
        req.params.customerId,
        consent,
        source,
        performerId,
        authUserId
      );

      return res.json({
        success: true,
        message: consent
          ? 'تم توثيق موافقة العميل على استقبال رسائل الواتساب بنجاح'
          : 'تم إلغاء موافقة العميل بنجاح',
        customer: updated,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'فشل تحديث حالة الموافقة' });
    }
  }
);

// PATCH /api/whatsapp/customer/:customerId/address
const updateAddressSchema = z.object({
  address: z.string().min(1, 'العنوان مطلوب'),
  addressDetails: z.string().optional(),
  area: z.string().optional(),
  deliveryNotes: z.string().optional(),
  performerEmployeeId: z.string().min(1, 'الموظف المنفذ مطلوب'),
  performerPin: z.string().min(1, 'الرمز السري مطلوب'),
});

router.patch(
  '/customer/:customerId/address',
  verifyPerformerAttribution,
  async (req: Request, res: Response) => {
    try {
      const parseResult = updateAddressSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0].message });
      }

      const authUserId = req.user!.id;
      const performerId = req.performer!.id;

      const updated = await updateCustomerAddress(
        req.params.customerId,
        parseResult.data,
        performerId,
        authUserId
      );

      return res.json({
        success: true,
        message: 'تم حفظ وتحديث عنوان العميل بنجاح',
        customer: updated,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'فشل تحديث عنوان العميل' });
    }
  }
);

export default router;
