# دليل إعداد وتشغيل منصة Meta WhatsApp Cloud API
## نظام إدارة نواقص الصيدلية (Pharmacy Missing Items Management System)

يوفر هذا الدليل الخطوات الرسمية والشاملة لربط وتشغيل حساب WhatsApp Business الرسمي للصيدلية مع النظام المركزي عبر **Meta WhatsApp Business Platform Cloud API**.

---

### الفهرس
1. [المتطلبات الأساسية](#1-المتطلبات-الأساسية)
2. [إنشاء وتفعيل تطبيق Meta WhatsApp](#2-إنشاء-وتفعيل-تطبيق-meta-whatsapp)
3. [استخراج مفاتيح الاعتماد (Credentials)](#3-استخراج-مفاتيح-الاعتماد-credentials)
4. [إعداد وتوثيق الـ Webhooks](#4-إعداد-وتوثيق-الـ-webhooks)
5. [اعتماد قوالب الرسائل الرسمية في Meta (Utility Templates)](#5-اعتماد-قوالب-الرسائل-الرسمية-في-meta-utility-templates)
6. [سياسة نافذة الـ 24 ساعة لخدمة العملاء (24-Hour Service Window)](#6-سياسة-نافذة-الـ-24-ساعة-لخدمة-العملاء)
7. [معمارية التكامل مع تطبيق Android / Flutter المستقبلي](#7-معمارية-التكامل-مع-تطبيق-android--flutter-المستقبلي)
8. [متغيرات البيئة المعتمدة (.env)](#8-متغيرات-البيئة-المعتمدة-env)

---

### 1. المتطلبات الأساسية
- حساب **Meta Business Manager** موثق للشركة / الصيدلية.
- رقم هاتف مخصص للصيدلية غير مرتبط بحساب WhatsApp شخصي عادي (أو رقم أرضي/محمول مخصص للأعمال).
- بطاقة ائتمانية مسجلة في حساب أعمال Meta لفوترة محادثات الأعمال (Meta تقدم أول 1,000 محادثة شهرياً مجاناً).

---

### 2. إنشاء وتفعيل تطبيق Meta WhatsApp
1. سجل الدخول إلى [Meta for Developers](https://developers.facebook.com/).
2. اضغط على **My Apps** ثم **Create App**.
3. اختر نوع التطبيق: **Business**.
4. أدخل اسم التطبيق: `Pharmacy Missing Items System`.
5. اربط التطبيق بحساب **Meta Business Account** الخاص بالصيدلية.
6. من لوحة التطبيق، أضف منتج **WhatsApp** بالضغط على **Set Up**.

---

### 3. استخراج مفاتيح الاعتماد (Credentials)

1. من القائمة الجانبية للتطبيق، اذهب إلى: **WhatsApp > API Setup**.
2. ستجد البيانات التالية:
   - **Phone Number ID**: رقم المعرف الخاص برقم هاتف الصيدلية (ضعه في `WHATSAPP_PHONE_NUMBER_ID`).
   - **WhatsApp Business Account ID**: معرف الحساب التجاري (ضعه في `WHATSAPP_BUSINESS_ACCOUNT_ID`).
3. **إنشاء رمز وصول دائم (Permanent Access Token)**:
   - افتح **Business Settings** في Meta Business Suite.
   - اذهب إلى **Users > System Users** واضغط **Add**.
   - اختر الدور: `Admin`.
   - اضغط **Generate New Token** واختر تطبيق الصيدلية.
   - حدد الصلاحيات التالية:
     - `whatsapp_business_messaging`
     - `whatsapp_business_management`
   - انسخ الرمز الدائم وضعه في متغير البيئة `WHATSAPP_ACCESS_TOKEN`.
4. **App Secret**:
   - من لوحة التطبيق: **App Settings > Basic**.
   - انسخ **App Secret** وضعه في `WHATSAPP_APP_SECRET` للتحقق من أمان الـ Webhook.

---

### 4. إعداد وتوثيق الـ Webhooks

يستخدم النظام تقنية Webhooks لاستقبال:
- تقارير تسليم الرسائل الحية (`sent` -> `delivered` -> `read` -> `failed`).
- ردود ورسائل العملاء لفتح نافذة الـ 24 ساعة للمحادثة المباشرة تلقائياً.

#### خطوات الإعداد:
1. في لوحة Meta: اذهب إلى **WhatsApp > Configuration**.
2. في قسم **Webhook**، اضغط **Edit**:
   - **Callback URL**: رابط خادم الصيدلية العام عبر HTTPS:
     `https://your-pharmacy-domain.com/api/whatsapp/webhook`
     (للتطوير المحلي يمكن استخدام نفق آمن مثل Cloudflare Tunnel أو ngrok).
   - **Verify Token**: الرمز السري المحدد في `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (افتراضياً: `pharmacy_whatsapp_verify_token_default`).
3. اضغط **Verify and Save**. يقوم الخادم بالرد التلقائي بكود التحدي (`hub.challenge`) مع حالة HTTP 200.
4. في قسم **Webhook Fields**، اضغط **Manage** وفعل الاشتراك في:
   - `messages` (استقبال رسائل وتحديثات حالة تسليم واتساب).

---

### 5. اعتماد قوالب الرسائل الرسمية في Meta (Utility Templates)

وفقاً لسياسات Meta، لا يمكن إرسال رسائل استباقية للعملاء خارج نافذة الـ 24 ساعة إلا عبر **قوالب معتمدة مسبقاً (Pre-Approved Templates)** من نوع **UTILITY**.

قم بالدخول إلى **WhatsApp Manager > Message Templates** وأنشئ القوالب الأربعة التالية باللغة العربية:

#### القالب 1: إشعار بطلب الصنف من المورد
- **Template Name**: `pharmacy_product_ordered`
- **Category**: `UTILITY`
- **Language**: `Arabic (ar)`
- **Body Text**:
  ```text
  أهلاً بحضرتك 🌹

  بنبلغ حضرتك إن طلبك الخاص بـ {{1}} تم طلبه بالفعل من المورد، ونعمل على توفيره في أقرب وقت.

  هنبلغ حضرتك بمجرد وصوله للصيدلية.

  شكرًا لثقتك بنا ❤️
  ```
- **Variables**:
  - `{{1}}`: اسم الصنف الدوائي (مثال: `Panadol Extra`).

---

#### القالب 2: إشعار بوصول الصنف مع سؤال التوصيل المنزلي
- **Template Name**: `pharmacy_product_arrived_delivery`
- **Category**: `UTILITY`
- **Language**: `Arabic (ar)`
- **Body Text**:
  ```text
  أهلاً بحضرتك يا {{1}} 🌹

  بنبلغ حضرتك إن طلبك الخاص بـ {{2}} وصل الحمد لله لصيدليتنا.

  تحب نبعت لحضرتك الطلب على البيت؟ 🛵

  شكرًا لثقتك في صيدليتنا ❤️
  ```
- **Variables**:
  - `{{1}}`: اسم العميل (مثال: `أستاذ أحمد`).
  - `{{2}}`: اسم الصنف الدوائي (مثال: `Concor 5mg`).

---

#### القالب 3: إشعار بوصول الصنف للاستلام من الصيدلية
- **Template Name**: `pharmacy_product_arrived_pickup`
- **Category**: `UTILITY`
- **Language**: `Arabic (ar)`
- **Body Text**:
  ```text
  أهلاً بحضرتك يا {{1}} 🌹

  بنبلغ حضرتك إن طلبك الخاص بـ {{2}} متوفر الآن بالصيدلية وجاهز للاستلام في أي وقت تشرفنا فيه.

  شكرًا لثقتك في صيدليتنا ❤️
  ```
- **Variables**:
  - `{{1}}`: اسم العميل.
  - `{{2}}`: اسم الصنف الدوائي.

---

#### القالب 4: طلب تأكيد عنوان التوصيل المنزلي
- **Template Name**: `pharmacy_address_confirmation`
- **Category**: `UTILITY`
- **Language**: `Arabic (ar)`
- **Body Text**:
  ```text
  أهلاً بحضرتك يا {{1}} 🌹

  بخصوص طلبك الخاص بـ {{2}}، برجاء تأكيد عنوان التوصيل بالتفصيل لنتمكن من إرساله لحضرتك في أقرب وقت 🛵
  ```
- **Variables**:
  - `{{1}}`: اسم العميل.
  - `{{2}}`: اسم الصنف الدوائي.

---

### 6. سياسة نافذة الـ 24 ساعة لخدمة العملاء

1. **النافذة مفتوحة (Inside Window)**:
   - عندما يقوم العميل بإرسال أي رسالة إلى رقم واتساب الصيدلية، تُفتح نافذة المحادثة لمدة 24 ساعة من تاريخ آخر رسالة.
   - خلال هذه النافذة، يتيح النظام للصيدلي كتابة أو تعديل أي نص حر (Free-form text) بحرية تامة وتخصيص السؤال كما يشاء.
2. **النافذة مغلقة (Outside Window)**:
   - في حال مرور أكثر من 24 ساعة دون رسالة من العميل، تفرض Meta استخدام أحد القوالب الأربعة المعتمدة أعلاه.
   - يعرض محرر النظام تنبيهاً ذكياً للموظف يوضح أن الإرسال سيتم بصيغة القالب المعتمد مع استبدال المتغيرات (اسم الصنف، اسم العميل) تلقائياً، لحماية حساب الصيدلية من الحظر.

---

### 7. معمارية التكامل مع تطبيق Android / Flutter المستقبلي

تم بناء خدمة الواتساب بالكامل في الـ Backend المركزي ليعمل تطبيق Desktop الحالي وتطبيق Flutter/Android المستقبلي على نفس نقاط الاتصال الموحدة دون تكرار الأكواد:

```text
[ Desktop Workstation (Electron) ]    [ Mobile Workstation (Flutter/Android) ]
                   \                              /
                    \                            /
             [ Express REST API / WebSocket Server ]
                            |
           [ WhatsApp Notification Service ]
           - Customer Consent Verification
           - 24h Customer Window Validation
           - Performer PIN Audit Attribution
           - Duplicate Prevention
                            |
           [ Meta WhatsApp Cloud API (v21.0) ]
                            |
             [ Customer Mobile Device ]
```

#### نقاط الاتصال البرمجية الجاهزة للاستخدام في تطبيق الموبايل:
- `POST /api/whatsapp/messages/preview`: إنشاء معاينة الرسالة والتحقق من حالة النافذة والموافقة.
- `POST /api/whatsapp/messages/send`: إرسال الرسالة بعد تأكيد PIN الموظف.
- `GET /api/whatsapp/messages?customerId=...`: استعراض سجل الرسائل والتسليم.
- `PATCH /api/whatsapp/customer/:id/consent`: توثيق موافقة العميل.
- `PATCH /api/whatsapp/customer/:id/address`: حفظ عنوان التوصيل.
- أحداث WebSocket المباشرة:
  - `whatsapp:messageCreated`: إشعار فوري عند خروج رسالة جديدة.
  - `whatsapp:statusChanged`: تحديث فوري لحالة الرسالة (`DELIVERED` / `READ`).

---

### 8. متغيرات البيئة المعتمدة (.env)

```env
# Meta WhatsApp Business Cloud API Settings
WHATSAPP_ENABLED=true
WHATSAPP_PHONE_NUMBER_ID=100654321098765
WHATSAPP_BUSINESS_ACCOUNT_ID=200987654321098
WHATSAPP_ACCESS_TOKEN=EAAG...your_permanent_system_user_token...
WHATSAPP_API_VERSION=v21.0
WHATSAPP_WEBHOOK_VERIFY_TOKEN=pharmacy_whatsapp_verify_token_default
WHATSAPP_APP_SECRET=your_meta_app_secret_here
```

> **ملاحظة هامة عن وضع التطوير (Simulation Mode)**:
> طالما أن قيمة `WHATSAPP_ENABLED=false` أو أن بيانات الاعتماد غير مدخلة، فإن النظام يعمل تلقائياً وبأمان تام في **وضع المحاكاة والتطوير (Simulated Mode)**؛ حيث يقوم بحفظ الرسائل كمسودات موثقة داخلياً (`DRAFT`) ولا يدعي أبداً إرسالها أو تسليمها، مما يتيح لك تجربة كاملة لواجهات النظام دون إرسال رسائل حقيقية لأرقام العملاء بالخطأ.
