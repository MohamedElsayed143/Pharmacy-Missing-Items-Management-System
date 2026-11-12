import axios from 'axios';
import crypto from 'crypto';
import { prisma } from '../../prisma/client';
import { getWhatsAppConfig, isWhatsAppConfigured } from './whatsapp.config';
import { OFFICIAL_TEMPLATES } from './whatsapp.templates';
import {
  WhatsAppMessageType,
  WhatsAppMessageStatus,
  ItemStatus,
} from '@prisma/client';
import { WhatsAppPreviewDto } from '@pharmacy/shared';
import { logActivity } from '../activity/activity.service';
import { broadcastEvent } from '../../realtime/socket';

/**
 * Normalizes phone numbers to standard Meta WhatsApp international format (E.164 without leading +)
 * Particularly handles standard Egyptian mobile formats:
 * - 01012345678 -> 201012345678
 * - +201012345678 -> 201012345678
 * - 201012345678 -> 201012345678
 */
export function normalizeWhatsAppPhoneNumber(phone: string): string {
  if (!phone) return '';
  const digitsOnly = phone.replace(/\D/g, '');

  if (digitsOnly.startsWith('20') && digitsOnly.length >= 12) {
    return digitsOnly;
  }
  if (digitsOnly.startsWith('01') && digitsOnly.length === 11) {
    return `2${digitsOnly}`;
  }
  if (digitsOnly.length === 10 && digitsOnly.startsWith('1')) {
    return `20${digitsOnly}`;
  }

  return digitsOnly;
}

/**
 * Checks if a customer is within the Meta 24-hour customer service messaging window.
 * The window opens whenever a customer sends a message to the pharmacy's WhatsApp number.
 */
export async function isCustomerInside24HourWindow(customerId: string): Promise<boolean> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { lastCustomerMessageAt: true },
  });

  if (!customer || !customer.lastCustomerMessageAt) {
    return false;
  }

  const windowMs = 24 * 60 * 60 * 1000;
  const elapsed = Date.now() - customer.lastCustomerMessageAt.getTime();
  return elapsed <= windowMs;
}

/**
 * Verifies if the customer has explicitly consented to receiving WhatsApp order notifications.
 */
export async function hasCustomerWhatsAppConsent(customerId: string): Promise<boolean> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { whatsappConsent: true },
  });
  return Boolean(customer?.whatsappConsent);
}

/**
 * Records or updates customer consent for WhatsApp communications
 */
export async function updateCustomerConsent(
  customerId: string,
  consent: boolean,
  source: string = 'IN_STORE_VERBAL',
  performerEmployeeId: string,
  authenticatedUserId: string
) {
  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: {
      whatsappConsent: consent,
      whatsappConsentTimestamp: consent ? new Date() : null,
      whatsappConsentSource: consent ? source : null,
      whatsappConsentRecordedById: performerEmployeeId,
    },
  });

  await logActivity({
    action: consent ? 'WHATSAPP_CONSENT_GRANTED' : 'WHATSAPP_CONSENT_REVOKED',
    entityType: 'CUSTOMER',
    entityId: customerId,
    authenticatedUserId,
    performerEmployeeId,
    notes: consent
      ? `تم تسجيل موافقة العميل على استقبال إشعارات الواتساب (المصدر: ${source})`
      : 'تم إلغاء موافقة العميل على إشعارات الواتساب',
  });

  return updated;
}

/**
 * Updates customer delivery address information
 */
export async function updateCustomerAddress(
  customerId: string,
  addressData: {
    address: string;
    addressDetails?: string;
    area?: string;
    deliveryNotes?: string;
  },
  performerEmployeeId: string,
  authenticatedUserId: string
) {
  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: {
      address: addressData.address.trim(),
      addressDetails: addressData.addressDetails?.trim() || null,
      area: addressData.area?.trim() || null,
      deliveryNotes: addressData.deliveryNotes?.trim() || null,
    },
  });

  await logActivity({
    action: 'CUSTOMER_ADDRESS_UPDATED',
    entityType: 'CUSTOMER',
    entityId: customerId,
    authenticatedUserId,
    performerEmployeeId,
    notes: `تحديث عنوان التوصيل للعميل: ${addressData.address}`,
  });

  return updated;
}

/**
 * Generates preview of message according to notification event & customer data
 */
export async function getMessagePreview(
  customerId: string,
  orderItemId?: string,
  messageType: WhatsAppMessageType = WhatsAppMessageType.PRODUCT_ARRIVED,
  deliveryPreference: 'HOME_DELIVERY' | 'STORE_PICKUP' = 'HOME_DELIVERY'
): Promise<any> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    throw new Error('العميل غير موجود');
  }

  let orderItem: any = null;
  if (orderItemId) {
    orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        product: true,
        order: true,
      },
    });
  }

  const isInsideWindow = await isCustomerInside24HourWindow(customerId);
  const formattedPhone = normalizeWhatsAppPhoneNumber(customer.phone);
  const customerName = customer.name?.trim() || 'عميلنا العزيز';
  const productName = orderItem?.productNameCustom || 'الصنف المطلوب';

  let defaultText = '';
  let defaultTemplate = 'pharmacy_product_arrived_delivery';

  if (messageType === WhatsAppMessageType.PRODUCT_ORDERED) {
    defaultTemplate = 'pharmacy_product_ordered';
    defaultText = OFFICIAL_TEMPLATES.pharmacy_product_ordered.generateText({
      product_name: productName,
    });
  } else if (messageType === WhatsAppMessageType.PRODUCT_ARRIVED) {
    if (deliveryPreference === 'HOME_DELIVERY') {
      defaultTemplate = 'pharmacy_product_arrived_delivery';
      defaultText = OFFICIAL_TEMPLATES.pharmacy_product_arrived_delivery.generateText({
        customer_name: customerName,
        product_name: productName,
      });
    } else {
      defaultTemplate = 'pharmacy_product_arrived_pickup';
      defaultText = OFFICIAL_TEMPLATES.pharmacy_product_arrived_pickup.generateText({
        customer_name: customerName,
        product_name: productName,
      });
    }
  } else if (messageType === WhatsAppMessageType.ADDRESS_CONFIRMATION) {
    defaultTemplate = 'pharmacy_address_confirmation';
    defaultText = OFFICIAL_TEMPLATES.pharmacy_address_confirmation.generateText({
      customer_name: customerName,
      product_name: productName,
    });
  }

  const templatesList = Object.values(OFFICIAL_TEMPLATES).map((t) => ({
    name: t.name,
    description: t.description,
    bodyText: t.bodyText,
    variables: t.variables,
  }));

  return {
    isInside24HourWindow: isInsideWindow,
    customerHasConsent: customer.whatsappConsent,
    recipientPhone: customer.phone,
    formattedPhone,
    customer: {
      id: customer.id,
      phone: customer.phone,
      name: customer.name,
      customerCode: customer.customerCode,
      address: customer.address,
      addressDetails: customer.addressDetails,
      area: customer.area,
      deliveryNotes: customer.deliveryNotes,
      whatsappConsent: customer.whatsappConsent,
      whatsappConsentTimestamp: customer.whatsappConsentTimestamp?.toISOString() || null,
      lastCustomerMessageAt: customer.lastCustomerMessageAt?.toISOString() || null,
    },
    orderItem: orderItem
      ? {
          id: orderItem.id,
          productNameCustom: orderItem.productNameCustom,
          requestedQuantity: orderItem.requestedQuantity,
          status: orderItem.status,
          notes: orderItem.notes,
        }
      : null,
    defaultTemplate,
    defaultMessageBody: defaultText,
    supportedTemplates: templatesList,
    isSimulatedMode: !isWhatsAppConfigured(),
  };
}

/**
 * Sends a WhatsApp notification via Meta Cloud API with full policy compliance and audit trail
 */
export async function sendWhatsAppNotification(params: {
  customerId: string;
  orderItemId?: string;
  orderId?: string;
  messageType: WhatsAppMessageType;
  messageBody: string;
  templateName?: string;
  deliveryPreference?: 'HOME_DELIVERY' | 'STORE_PICKUP';
  performerEmployeeId: string;
  authenticatedUserId: string;
}): Promise<any> {
  const {
    customerId,
    orderItemId,
    orderId,
    messageType,
    messageBody,
    templateName,
    deliveryPreference,
    performerEmployeeId,
    authenticatedUserId,
  } = params;

  // 1. Validate customer & consent
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    throw new Error('العميل غير موجود');
  }

  if (!customer.whatsappConsent) {
    throw new Error(
      'لم يتم تسجيل موافقة العميل على استقبال إشعارات الواتساب. يرجى الحصول على موافقة العميل وتوثيقها أولاً من خلال الواجهة.'
    );
  }

  const normalizedPhone = normalizeWhatsAppPhoneNumber(customer.phone);
  if (!normalizedPhone || normalizedPhone.length < 9) {
    throw new Error('رقم هاتف العميل غير صالح لإرسال رسائل واتساب');
  }

  // 2. Validate OrderItem if present
  let resolvedOrderId = orderId;
  let orderItem: any = null;
  if (orderItemId) {
    orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { product: true, order: true },
    });
    if (!orderItem) {
      throw new Error('الصنف الدوائي المحدد غير موجود');
    }
    resolvedOrderId = orderItem.orderId;
  }

  // 3. Check 24-hour customer service window
  const isInsideWindow = await isCustomerInside24HourWindow(customerId);
  const selectedTemplate = templateName || (
    messageType === WhatsAppMessageType.PRODUCT_ORDERED
      ? 'pharmacy_product_ordered'
      : deliveryPreference === 'STORE_PICKUP'
      ? 'pharmacy_product_arrived_pickup'
      : 'pharmacy_product_arrived_delivery'
  );

  // If outside 24h window, Meta strictly requires an approved template
  const isTemplateRequired = !isInsideWindow;

  // 4. Create database pending record BEFORE sending (idempotency & retry safe)
  const isConfigured = isWhatsAppConfigured();
  const config = getWhatsAppConfig();

  const messageRecord = await prisma.whatsAppMessage.create({
    data: {
      customerId,
      orderId: resolvedOrderId || null,
      orderItemId: orderItemId || null,
      messageType,
      messageBody: messageBody.trim(),
      templateName: selectedTemplate,
      templateLanguage: 'ar',
      recipientPhone: normalizedPhone,
      status: WhatsAppMessageStatus.PENDING,
      sentByEmployeeId: performerEmployeeId,
      authenticatedUserId,
      deliveryPreference: deliveryPreference || null,
      isSimulated: !isConfigured,
    },
  });

  // 5. Handling Development / Simulation mode (when Meta credentials are not configured)
  if (!isConfigured) {
    const updatedSimulated = await prisma.whatsAppMessage.update({
      where: { id: messageRecord.id },
      data: {
        status: WhatsAppMessageStatus.DRAFT,
        isSimulated: true,
        failureReason:
          'وضع التطوير والمحاكاة: لم يتم الإرسال الفعلي لـ Meta لعدم ضبط مفاتيح الاعتماد (WHATSAPP_ENABLED / WHATSAPP_ACCESS_TOKEN).',
      },
    });

    // Write audit log
    await logActivity({
      action: 'WHATSAPP_MESSAGE_SIMULATED',
      entityType: 'WHATSAPP_MESSAGE',
      entityId: messageRecord.id,
      authenticatedUserId,
      performerEmployeeId,
      notes: `تسجيل رسالة واتساب تجريبية للعميل (${customer.phone}): "${messageBody.slice(0, 80)}..."`,
      newState: { simulated: true, status: 'DRAFT' },
    });

    broadcastEvent('whatsapp:messageCreated', updatedSimulated);

    // If arrival notification and item is RECEIVED, optionally mark customer as notified
    if (orderItemId && (messageType === WhatsAppMessageType.PRODUCT_ARRIVED)) {
      await updateItemNotifiedStatus(orderItemId, performerEmployeeId, authenticatedUserId, 'تم تجهيز إشعار واتساب للعميل (محاكاة)');
    }

    return {
      success: true,
      simulated: true,
      message: 'تم حفظ وتوثيق الرسالة بنجاح في وضع التطوير / المحاكاة (Meta Cloud API غير مفعل حالياً).',
      whatsappMessage: updatedSimulated,
    };
  }

  // 6. Real Send via Meta WhatsApp Cloud API
  try {
    const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;

    let payload: any;

    if (isInsideWindow) {
      // Free-form text message allowed inside 24h window
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizedPhone,
        type: 'text',
        text: {
          preview_url: false,
          body: messageBody.trim(),
        },
      };
    } else {
      // Outside 24h window: Template-based message
      const templateDef = OFFICIAL_TEMPLATES[selectedTemplate];
      if (!templateDef) {
        throw new Error(
          `قالب الرسالة (${selectedTemplate}) غير معتمد. تتطلب سياسات Meta استخدام قالب معتمد حصراً خارج نافذة 24 ساعة.`
        );
      }

      const customerName = customer.name?.trim() || 'عميلنا العزيز';
      const productName = orderItem?.productNameCustom || 'الصنف المطلوب';

      let parameters: any[] = [];
      if (selectedTemplate === 'pharmacy_product_ordered') {
        parameters = [{ type: 'text', text: productName }];
      } else {
        parameters = [
          { type: 'text', text: customerName },
          { type: 'text', text: productName },
        ];
      }

      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizedPhone,
        type: 'template',
        template: {
          name: selectedTemplate,
          language: { code: 'ar' },
          components: [
            {
              type: 'body',
              parameters,
            },
          ],
        },
      };
    }

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    const wamid = response.data?.messages?.[0]?.id || null;

    const updatedSent = await prisma.whatsAppMessage.update({
      where: { id: messageRecord.id },
      data: {
        status: WhatsAppMessageStatus.SENT,
        providerMessageId: wamid,
        sentAt: new Date(),
      },
    });

    await logActivity({
      action: 'WHATSAPP_MESSAGE_SENT',
      entityType: 'WHATSAPP_MESSAGE',
      entityId: messageRecord.id,
      authenticatedUserId,
      performerEmployeeId,
      notes: `إرسال رسالة واتساب رسمية للعميل (${customer.phone}) - معرف Meta: ${wamid}`,
      newState: { status: 'SENT', providerMessageId: wamid },
    });

    broadcastEvent('whatsapp:messageCreated', updatedSent);

    // If arrival notification and item is in RECEIVED state, update status to CUSTOMER_NOTIFIED
    if (orderItemId && messageType === WhatsAppMessageType.PRODUCT_ARRIVED) {
      await updateItemNotifiedStatus(orderItemId, performerEmployeeId, authenticatedUserId, 'تم إرسال إشعار وصول الصنف عبر واتساب');
    }

    return {
      success: true,
      simulated: false,
      message: 'تم إرسال رسالة الواتساب واعتمادها بنجاح لدى خوادم Meta.',
      providerMessageId: wamid,
      whatsappMessage: updatedSent,
    };
  } catch (error: any) {
    const errorDetails = error.response?.data?.error?.message || error.message || 'فشل الاتصال بـ Meta Cloud API';

    const updatedFailed = await prisma.whatsAppMessage.update({
      where: { id: messageRecord.id },
      data: {
        status: WhatsAppMessageStatus.FAILED,
        failureReason: errorDetails,
        failedAt: new Date(),
      },
    });

    await logActivity({
      action: 'WHATSAPP_MESSAGE_FAILED',
      entityType: 'WHATSAPP_MESSAGE',
      entityId: messageRecord.id,
      authenticatedUserId,
      performerEmployeeId,
      notes: `فشل إرسال رسالة الواتساب للعميل (${customer.phone}): ${errorDetails}`,
      newState: { status: 'FAILED', error: errorDetails },
    });

    broadcastEvent('whatsapp:statusChanged', updatedFailed);

    throw new Error(`خطأ من مزود الخدمة (Meta Cloud API): ${errorDetails}`);
  }
}

/**
 * Helper to update order item status to CUSTOMER_NOTIFIED if applicable
 */
async function updateItemNotifiedStatus(
  orderItemId: string,
  performerEmployeeId: string,
  authenticatedUserId: string,
  notes: string
) {
  try {
    const item = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
    });

    if (item && (item.status === ItemStatus.RECEIVED || item.status === ItemStatus.PARTIALLY_RECEIVED)) {
      const prevStatus = item.status;
      const updated = await prisma.$transaction(async (tx) => {
        const it = await tx.orderItem.update({
          where: { id: orderItemId },
          data: { status: ItemStatus.CUSTOMER_NOTIFIED, updatedAt: new Date() },
        });

        await tx.orderItemStatusHistory.create({
          data: {
            orderItemId,
            fromStatus: prevStatus,
            toStatus: ItemStatus.CUSTOMER_NOTIFIED,
            authenticatedUserId,
            performerEmployeeId,
            notes,
          },
        });
        return it;
      });

      broadcastEvent('orderItem:statusChanged', updated);
    }
  } catch (err) {
    console.error('Error updating notified status:', err);
  }
}

/**
 * Handles incoming webhooks from Meta Cloud API
 * Validates HMAC SHA-256 signature if appSecret is configured
 * Processes status updates (sent, delivered, read, failed)
 * Processes inbound customer messages (updates lastCustomerMessageAt)
 */
export async function processWhatsAppWebhook(
  rawBody: Buffer | string,
  signatureHeader?: string,
  parsedBody?: any
): Promise<{ processed: number; statusesUpdated: number; messagesReceived: number }> {
  const config = getWhatsAppConfig();

  // 1. Verify webhook signature if WHATSAPP_APP_SECRET is set
  if (config.appSecret && signatureHeader) {
    const signature = signatureHeader.replace('sha256=', '');
    const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const expectedSignature = crypto
      .createHmac('sha256', config.appSecret)
      .update(bodyStr)
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new Error('توقيع Webhook غير صالح (HMAC signature mismatch)');
    }
  }

  const data = parsedBody || (typeof rawBody === 'string' ? JSON.parse(rawBody) : JSON.parse(rawBody.toString('utf8')));
  let statusesUpdated = 0;
  let messagesReceived = 0;

  if (data.object !== 'whatsapp_business_account' || !Array.isArray(data.entry)) {
    return { processed: 0, statusesUpdated: 0, messagesReceived: 0 };
  }

  for (const entry of data.entry) {
    if (!Array.isArray(entry.changes)) continue;

    for (const change of entry.changes) {
      const value = change.value;
      if (!value) continue;

      // A. Process Status Updates
      if (Array.isArray(value.statuses)) {
        for (const st of value.statuses) {
          const wamid = st.id;
          const statusStr = st.status; // 'sent' | 'delivered' | 'read' | 'failed'
          const timestamp = st.timestamp ? new Date(parseInt(st.timestamp) * 1000) : new Date();

          let targetStatus: WhatsAppMessageStatus | null = null;
          const updateData: any = {};

          if (statusStr === 'sent') {
            targetStatus = WhatsAppMessageStatus.SENT;
            updateData.sentAt = timestamp;
          } else if (statusStr === 'delivered') {
            targetStatus = WhatsAppMessageStatus.DELIVERED;
            updateData.deliveredAt = timestamp;
          } else if (statusStr === 'read') {
            targetStatus = WhatsAppMessageStatus.READ;
            updateData.readAt = timestamp;
          } else if (statusStr === 'failed') {
            targetStatus = WhatsAppMessageStatus.FAILED;
            updateData.failedAt = timestamp;
            updateData.failureReason = st.errors?.[0]?.message || 'فشل تسليم الرسالة لدى Meta';
          }

          if (targetStatus && wamid) {
            updateData.status = targetStatus;

            const existing = await prisma.whatsAppMessage.findFirst({
              where: { providerMessageId: wamid },
            });

            if (existing) {
              const updated = await prisma.whatsAppMessage.update({
                where: { id: existing.id },
                data: updateData,
              });

              statusesUpdated++;
              broadcastEvent('whatsapp:statusChanged', updated);
            }
          }
        }
      }

      // B. Process Inbound Messages (Customer messaging the pharmacy)
      if (Array.isArray(value.messages)) {
        for (const msg of value.messages) {
          const fromPhone = msg.from; // Sender phone number
          const timestamp = msg.timestamp ? new Date(parseInt(msg.timestamp) * 1000) : new Date();

          if (fromPhone) {
            // Match customer by normalized phone (strip 2 if Egyptian, or search contains)
            const normalized = normalizeWhatsAppPhoneNumber(fromPhone);
            const digits = normalized.startsWith('2') ? normalized.slice(1) : normalized;

            const customer = await prisma.customer.findFirst({
              where: {
                OR: [
                  { phone: { contains: digits } },
                  { phone: { contains: normalized } },
                ],
              },
            });

            if (customer) {
              // Open 24h window by updating lastCustomerMessageAt
              await prisma.customer.update({
                where: { id: customer.id },
                data: { lastCustomerMessageAt: timestamp },
              });

              messagesReceived++;
              broadcastEvent('whatsapp:customerMessaged', {
                customerId: customer.id,
                phone: customer.phone,
                timestamp: timestamp.toISOString(),
              });
            }
          }
        }
      }
    }
  }

  return {
    processed: 1,
    statusesUpdated,
    messagesReceived,
  };
}
