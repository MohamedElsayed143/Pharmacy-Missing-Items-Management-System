import { PrismaClient, Role, Priority, ItemStatus, OverallStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial pharmacy database...');

  // 1. Seed Employees
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const adminPinHash = await bcrypt.hash('1111', 10);

  const purchasingPasswordHash = await bcrypt.hash('manager123', 10);
  const purchasingPinHash = await bcrypt.hash('2222', 10);

  const staffPasswordHash = await bcrypt.hash('staff123', 10);
  const staff1PinHash = await bcrypt.hash('3333', 10);
  const staff2PinHash = await bcrypt.hash('4444', 10);

  const admin = await prisma.employee.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      fullName: 'د. أحمد القدري (مدير الصيدلية)',
      username: 'admin',
      passwordHash: adminPasswordHash,
      pinHash: adminPinHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const purchasing = await prisma.employee.upsert({
    where: { username: 'purchasing' },
    update: {},
    create: {
      fullName: 'د. سارة محمود (مسؤول المشتريات)',
      username: 'purchasing',
      passwordHash: purchasingPasswordHash,
      pinHash: purchasingPinHash,
      role: Role.PURCHASING_MANAGER,
      isActive: true,
    },
  });

  const staff1 = await prisma.employee.upsert({
    where: { username: 'employee1' },
    update: {},
    create: {
      fullName: 'د. محمد السيد (صيدلي أول)',
      username: 'employee1',
      passwordHash: staffPasswordHash,
      pinHash: staff1PinHash,
      role: Role.EMPLOYEE,
      isActive: true,
    },
  });

  const staff2 = await prisma.employee.upsert({
    where: { username: 'employee2' },
    update: {},
    create: {
      fullName: 'أ. مريم علي (مساعد صيدلي)',
      username: 'employee2',
      passwordHash: staffPasswordHash,
      pinHash: staff2PinHash,
      role: Role.EMPLOYEE,
      isActive: true,
    },
  });

  console.log('Employees seeded.');

  // 2. Seed Common Pharmaceutical Products
  const productsData = [
    { name: 'Panadol Extra', strength: '500mg / 65mg', dosageForm: 'أقراص (Tablets)' },
    { name: 'Augmentin', strength: '1g', dosageForm: 'أقراص (Tablets)' },
    { name: 'Concor', strength: '5mg', dosageForm: 'أقراص (Tablets)' },
    { name: 'Cataflam', strength: '50mg', dosageForm: 'أقراص (Tablets)' },
    { name: 'Brufen', strength: '400mg', dosageForm: 'أقراص (Tablets)' },
    { name: 'Otrivin Adult', strength: '0.1%', dosageForm: 'قطرة (Drops)' },
    { name: 'Ventolin', strength: '100mcg', dosageForm: 'بخاخ / استنشاق (Inhaler)' },
    { name: 'Cipralex', strength: '10mg', dosageForm: 'أقراص (Tablets)' },
    { name: 'Nexium', strength: '40mg', dosageForm: 'أقراص (Tablets)' },
    { name: 'Amoclan', strength: '625mg', dosageForm: 'أقراص (Tablets)' },
    { name: 'Flixotide Evohaler', strength: '125mcg', dosageForm: 'بخاخ / استنشاق (Inhaler)' },
    { name: 'Lipitor', strength: '20mg', dosageForm: 'أقراص (Tablets)' },
  ];

  const seededProducts: Record<string, any> = {};
  for (const p of productsData) {
    const prod = await prisma.product.upsert({
      where: {
        name_strength_dosageForm: {
          name: p.name,
          strength: p.strength,
          dosageForm: p.dosageForm,
        },
      },
      update: {},
      create: p,
    });
    seededProducts[p.name] = prod;
  }
  console.log('Products seeded.');

  // 3. Seed Sample Customers & Missing Items Requests if database is empty
  const ordersCount = await prisma.order.count();
  if (ordersCount === 0) {
    const cust1 = await prisma.customer.create({
      data: {
        phone: '01012345678',
        name: 'محمود عبد الرحمن',
        customerCode: 'CUST-101',
      },
    });

    const cust2 = await prisma.customer.create({
      data: {
        phone: '01198765432',
        name: 'فاطمة الزهراء',
        customerCode: 'CUST-102',
      },
    });

    const cust3 = await prisma.customer.create({
      data: {
        phone: '01233445566',
        name: 'إبراهيم حسني',
        customerCode: 'CUST-103',
      },
    });

    // Order 1: REQ-000001
    const order1 = await prisma.order.create({
      data: {
        requestNumber: 'REQ-000001',
        customerId: cust1.id,
        createdById: staff1.id,
        overallStatus: OverallStatus.IN_PROGRESS,
        notes: 'العميل يحتاج الصنف ضروري للجرعة الشهرية',
        items: {
          create: [
            {
              productId: seededProducts['Panadol Extra'].id,
              productNameCustom: 'Panadol Extra',
              strength: '500mg / 65mg',
              dosageForm: 'أقراص (Tablets)',
              requestedQuantity: 2,
              priority: Priority.URGENT,
              status: ItemStatus.NEW,
              notes: 'عبوتين',
            },
            {
              productId: seededProducts['Ventolin'].id,
              productNameCustom: 'Ventolin',
              strength: '100mcg',
              dosageForm: 'بخاخ / استنشاق (Inhaler)',
              requestedQuantity: 1,
              priority: Priority.EMERGENCY,
              status: ItemStatus.REVIEWED,
              notes: 'مريض ربو حاد',
            },
          ],
        },
      },
      include: { items: true },
    });

    // Order 2: REQ-000002
    const order2 = await prisma.order.create({
      data: {
        requestNumber: 'REQ-000002',
        customerId: cust2.id,
        createdById: staff2.id,
        overallStatus: OverallStatus.OPEN,
        notes: 'طلب هاتفياً',
        items: {
          create: [
            {
              productId: seededProducts['Panadol Extra'].id,
              productNameCustom: 'Panadol Extra',
              strength: '500mg / 65mg',
              dosageForm: 'أقراص (Tablets)',
              requestedQuantity: 3,
              priority: Priority.NORMAL,
              status: ItemStatus.NEW,
              notes: 'طلب عادي',
            },
            {
              productId: seededProducts['Augmentin'].id,
              productNameCustom: 'Augmentin',
              strength: '1g',
              dosageForm: 'أقراص (Tablets)',
              requestedQuantity: 1,
              priority: Priority.URGENT,
              status: ItemStatus.ORDERED,
              notes: 'تم إضافته لطلبية شركة فارما',
            },
          ],
        },
      },
      include: { items: true },
    });

    // Order 3: REQ-000003
    const order3 = await prisma.order.create({
      data: {
        requestNumber: 'REQ-000003',
        customerId: cust3.id,
        createdById: staff1.id,
        overallStatus: OverallStatus.IN_PROGRESS,
        items: {
          create: [
            {
              productId: seededProducts['Concor'].id,
              productNameCustom: 'Concor',
              strength: '5mg',
              dosageForm: 'أقراص (Tablets)',
              requestedQuantity: 2,
              receivedQuantity: 2,
              priority: Priority.NORMAL,
              status: ItemStatus.RECEIVED,
              notes: 'وصل الصنف وجاهز لتسليم العميل',
            },
          ],
        },
      },
      include: { items: true },
    });

    // Log Activity for seeded orders
    await prisma.activityLog.create({
      data: {
        action: 'ORDER_CREATED',
        entityType: 'ORDER',
        entityId: order1.id,
        authenticatedUserId: staff1.id,
        performerEmployeeId: staff1.id,
        notes: 'تسجيل طلب نواقص جديد REQ-000001',
      },
    });

    await prisma.activityLog.create({
      data: {
        action: 'ORDER_CREATED',
        entityType: 'ORDER',
        entityId: order2.id,
        authenticatedUserId: staff2.id,
        performerEmployeeId: staff2.id,
        notes: 'تسجيل طلب نواقص جديد REQ-000002',
      },
    });

    console.log('Sample orders and activity logs seeded.');
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
