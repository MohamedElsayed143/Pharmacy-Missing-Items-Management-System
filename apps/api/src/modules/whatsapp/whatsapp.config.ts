export interface WhatsAppConfig {
  enabled: boolean;
  phoneNumberId?: string;
  businessAccountId?: string;
  accessToken?: string;
  apiVersion: string;
  webhookVerifyToken?: string;
  appSecret?: string;
}

export function getWhatsAppConfig(): WhatsAppConfig {
  return {
    enabled: process.env.WHATSAPP_ENABLED === 'true',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || undefined,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || undefined,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || undefined,
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'pharmacy_whatsapp_verify_token_default',
    appSecret: process.env.WHATSAPP_APP_SECRET || undefined,
  };
}

export function isWhatsAppConfigured(): boolean {
  const config = getWhatsAppConfig();
  return Boolean(
    config.enabled &&
    config.phoneNumberId &&
    config.accessToken &&
    config.phoneNumberId.trim().length > 0 &&
    config.accessToken.trim().length > 0
  );
}
