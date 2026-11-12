export interface WhatsAppTemplateDefinition {
  name: string;
  category: 'UTILITY';
  language: string;
  description: string;
  bodyText: string;
  variables: string[];
  generateText: (params: Record<string, string>) => string;
}

export const OFFICIAL_TEMPLATES: Record<string, WhatsAppTemplateDefinition> = {
  pharmacy_product_ordered: {
    name: 'pharmacy_product_ordered',
    category: 'UTILITY',
    language: 'ar',
    description: 'إشعار للعميل بأن الصنف غير المتوفر قد تم طلبه بالفعل من المورد ويجري توفيره',
    bodyText:
      'أهلاً بحضرتك 🌹\n\nبنبلغ حضرتك إن طلبك الخاص بـ {{1}} تم طلبه بالفعل من المورد، ونعمل على توفيره في أقرب وقت.\n\nهنبلغ حضرتك بمجرد وصوله للصيدلية.\n\nشكرًا لثقتك بنا ❤️',
    variables: ['product_name'],
    generateText: (params) =>
      `أهلاً بحضرتك 🌹\n\nبنبلغ حضرتك إن طلبك الخاص بـ ${params.product_name || 'الدواء المطلوب'} تم طلبه بالفعل من المورد، ونعمل على توفيره في أقرب وقت.\n\nهنبلغ حضرتك بمجرد وصوله للصيدلية.\n\nشكرًا لثقتك بنا ❤️`,
  },
  pharmacy_product_arrived_delivery: {
    name: 'pharmacy_product_arrived_delivery',
    category: 'UTILITY',
    language: 'ar',
    description: 'إشعار بوصول الصنف للصيدلية وسؤال العميل عن رغبته في التوصيل المنزلي أو الاستلام',
    bodyText:
      'أهلاً بحضرتك يا {{1}} 🌹\n\nبنبلغ حضرتك إن طلبك الخاص بـ {{2}} وصل الحمد لله لصيدليتنا.\n\nتحب نبعت لحضرتك الطلب على البيت؟ 🛵\n\nشكرًا لثقتك في صيدليتنا ❤️',
    variables: ['customer_name', 'product_name'],
    generateText: (params) =>
      `أهلاً بحضرتك يا ${params.customer_name || 'عميلنا العزيز'} 🌹\n\nبنبلغ حضرتك إن طلبك الخاص بـ ${params.product_name || 'الصنف المطلوب'} وصل الحمد لله لصيدليتنا.\n\nتحب نبعت لحضرتك الطلب على البيت؟ 🛵\n\nشكرًا لثقتك في صيدليتنا ❤️`,
  },
  pharmacy_product_arrived_pickup: {
    name: 'pharmacy_product_arrived_pickup',
    category: 'UTILITY',
    language: 'ar',
    description: 'إشعار بوصول الصنف للصيدلية وجاهزيته للاستلام من مقر الصيدلية',
    bodyText:
      'أهلاً بحضرتك يا {{1}} 🌹\n\nبنبلغ حضرتك إن طلبك الخاص بـ {{2}} متوفر الآن بالصيدلية وجاهز للاستلام في أي وقت تشرفنا فيه.\n\nشكرًا لثقتك في صيدليتنا ❤️',
    variables: ['customer_name', 'product_name'],
    generateText: (params) =>
      `أهلاً بحضرتك يا ${params.customer_name || 'عميلنا العزيز'} 🌹\n\nبنبلغ حضرتك إن طلبك الخاص بـ ${params.product_name || 'الصنف المطلوب'} متوفر الآن بالصيدلية وجاهز للاستلام في أي وقت تشرفنا فيه.\n\nشكرًا لثقتك في صيدليتنا ❤️`,
  },
  pharmacy_address_confirmation: {
    name: 'pharmacy_address_confirmation',
    category: 'UTILITY',
    language: 'ar',
    description: 'طلب تأكيد عنوان التوصيل المنزلي من العميل',
    bodyText:
      'أهلاً بحضرتك يا {{1}} 🌹\n\nبخصوص طلبك الخاص بـ {{2}}، برجاء تأكيد عنوان التوصيل بالتفصيل لنتمكن من إرساله لحضرتك في أقرب وقت 🛵',
    variables: ['customer_name', 'product_name'],
    generateText: (params) =>
      `أهلاً بحضرتك يا ${params.customer_name || 'عميلنا العزيز'} 🌹\n\nبخصوص طلبك الخاص بـ ${params.product_name || 'الصنف المطلوب'}، برجاء تأكيد عنوان التوصيل بالتفصيل لنتمكن من إرساله لحضرتك في أقرب وقت 🛵`,
  },
};
