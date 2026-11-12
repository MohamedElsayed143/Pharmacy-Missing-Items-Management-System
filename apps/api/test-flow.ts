import axios from 'axios';
import {
  OrderItemStatus,
  ItemPriority,
  DosageForm,
} from '@pharmacy/shared';

const API = 'http://localhost:4000/api';

async function runVerificationTests() {
  console.log('====================================================');
  console.log('STARTING AUTOMATED END-TO-END BUSINESS FLOW VERIFICATION');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✅ [PASS] ${testName}`);
    } else {
      console.error(`❌ [FAIL] ${testName} ${details ? '- ' + details : ''}`);
      process.exitCode = 1;
    }
  }

  // 1. Health check
  const healthRes = await axios.get(`${API}/health`);
  assert(healthRes.data.status === 'ok', 'Health Check');

  // 2. Authentication: Workstation Login
  const loginRes = await axios.post(`${API}/auth/login`, {
    username: 'admin',
    password: 'admin123',
    workstationName: 'Counter-Terminal-1',
  });
  assert(!!loginRes.data.token, 'Admin Login returns JWT');
  const token = loginRes.data.token;
  const authHeaders = { Authorization: `Bearer ${token}` };

  // 3. Active Performers List
  const performersRes = await axios.get(`${API}/auth/active-performers`, { headers: authHeaders });
  assert(Array.isArray(performersRes.data) && performersRes.data.length >= 3, 'Fetch active performers list');
  // Find employee1 (محمد السيد with PIN 3333) or admin (with PIN 1111)
  const staffEmployee = performersRes.data.find((p: any) => p.fullName.includes('محمد السيد')) || performersRes.data[0];
  const expectedPin = staffEmployee.fullName.includes('محمد السيد') ? '3333' : '1111';
  assert(!!staffEmployee, 'Staff employee found in active performers');

  // 4. Performer PIN Verification (Wrong PIN vs Correct PIN)
  const wrongPinCheck = await axios.post(
    `${API}/auth/verify-pin`,
    { employeeId: staffEmployee.id, pin: '9999' },
    { headers: authHeaders }
  );
  assert(wrongPinCheck.data.valid === false, 'Wrong PIN returns valid=false');

  const correctPinCheck = await axios.post(
    `${API}/auth/verify-pin`,
    { employeeId: staffEmployee.id, pin: expectedPin },
    { headers: authHeaders }
  );
  assert(correctPinCheck.data.valid === true, 'Correct PIN returns valid=true');

  // 5. Create Missing Item Request (Multi-Item Order) with Performer Attribution
  const testPhone = '01599887766';
  const createOrderPayload = {
    customerPhone: testPhone,
    customerName: 'كريم المنشاوي',
    customerCode: 'CUST-E2E',
    notes: 'طلب عاجل من العميل بالفرع',
    performerEmployeeId: staffEmployee.id,
    performerPin: expectedPin,
    items: [
      {
        productName: 'E2E Test Drug Alpha',
        strength: '250mg',
        dosageForm: DosageForm.CAPSULES,
        requestedQuantity: 5,
        priority: ItemPriority.URGENT,
        notes: 'العبوة الأصلية مطلوبة',
      },
      {
        productName: 'E2E Test Drug Beta',
        strength: '10mg',
        dosageForm: DosageForm.TABLETS,
        requestedQuantity: 2,
        priority: ItemPriority.EMERGENCY,
        notes: 'مريض سكر',
      },
    ],
  };

  const createOrderRes = await axios.post(`${API}/orders`, createOrderPayload, { headers: authHeaders });
  assert(!!createOrderRes.data.requestNumber, 'Order created with request number');
  assert(createOrderRes.data.items.length === 2, 'Order contains 2 items');
  const createdOrderId = createOrderRes.data.id;
  const itemAlpha = createOrderRes.data.items.find((i: any) => i.productNameCustom === 'E2E Test Drug Alpha');
  const itemBeta = createOrderRes.data.items.find((i: any) => i.productNameCustom === 'E2E Test Drug Beta');
  assert(!!itemAlpha && itemAlpha.status === OrderItemStatus.NEW, 'Item Alpha status is NEW');

  // 6. Duplicate Detection
  const duplicateRes = await axios.get(`${API}/orders/check-duplicates`, {
    params: { phone: testPhone },
    headers: authHeaders,
  });
  assert(duplicateRes.data.hasDuplicates === true, 'Duplicate detector flags recent request by phone');

  // 7. Grouped Purchasing Aggregation
  const groupedRes = await axios.get(`${API}/purchasing/grouped`, { headers: authHeaders });
  const alphaGroup = groupedRes.data.find((g: any) => g.productName === 'E2E Test Drug Alpha');
  assert(!!alphaGroup, 'Item Alpha found in purchasing grouped aggregation');
  assert(alphaGroup.totalRequestedQuantity >= 5, 'Grouped total quantity is correctly calculated');

  // 8. Create Purchasing Batch
  const batchRes = await axios.post(
    `${API}/purchasing/batches`,
    {
      supplierName: 'شركة المتحدة للأدوية (United Pharma)',
      notes: 'طلبية عاجلة للنواقص',
      itemIds: [itemAlpha.id],
      performerEmployeeId: staffEmployee.id,
      performerPin: expectedPin,
    },
    { headers: authHeaders }
  );
  assert(!!batchRes.data.batchNumber, 'Purchasing batch created with PB number');
  const batchId = batchRes.data.id;

  // Verify item status updated to ADDED_TO_PURCHASE
  const itemAfterBatch = await axios.get(`${API}/orders/${createdOrderId}`, { headers: authHeaders });
  const alphaAfterBatch = itemAfterBatch.data.items.find((i: any) => i.id === itemAlpha.id);
  assert(alphaAfterBatch.status === OrderItemStatus.ADDED_TO_PURCHASE, 'Item status transitioned to ADDED_TO_PURCHASE');

  // 9. Order from Supplier
  const orderSupplierRes = await axios.patch(
    `${API}/purchasing/batches/${batchId}/order`,
    {
      performerEmployeeId: staffEmployee.id,
      performerPin: expectedPin,
    },
    { headers: authHeaders }
  );
  assert(orderSupplierRes.data.success === true, 'Batch marked as ORDERED');

  const itemAfterOrder = await axios.get(`${API}/orders/${createdOrderId}`, { headers: authHeaders });
  const alphaAfterOrder = itemAfterOrder.data.items.find((i: any) => i.id === itemAlpha.id);
  assert(alphaAfterOrder.status === OrderItemStatus.ORDERED, 'Item status automatically updated to ORDERED');

  // 10. Partial Receiving: Receive 2 units out of 5
  const partialRecvRes = await axios.post(
    `${API}/receiving/receive-items`,
    {
      allocations: [{ orderItemId: itemAlpha.id, quantityReceived: 2 }],
      notes: 'وصل 2 عبوة من أصل 5 في فاتورة الصباح',
      performerEmployeeId: staffEmployee.id,
      performerPin: expectedPin,
    },
    { headers: authHeaders }
  );
  assert(partialRecvRes.data.success === true, 'Partial receiving recorded');
  const itemAfterPartial = await axios.get(`${API}/orders/${createdOrderId}`, { headers: authHeaders });
  const alphaAfterPartial = itemAfterPartial.data.items.find((i: any) => i.id === itemAlpha.id);
  assert(alphaAfterPartial.receivedQuantity === 2, 'Received quantity equals 2');
  assert(alphaAfterPartial.status === OrderItemStatus.PARTIALLY_RECEIVED, 'Status is PARTIALLY_RECEIVED');

  // 11. Full Remaining Receiving: Receive remaining 3 units
  const fullRecvRes = await axios.post(
    `${API}/receiving/receive-items`,
    {
      allocations: [{ orderItemId: itemAlpha.id, quantityReceived: 3 }],
      notes: 'استكمال باقي الكمية (3 علب)',
      performerEmployeeId: staffEmployee.id,
      performerPin: expectedPin,
    },
    { headers: authHeaders }
  );
  assert(fullRecvRes.data.success === true, 'Full receiving recorded');
  const itemAfterFull = await axios.get(`${API}/orders/${createdOrderId}`, { headers: authHeaders });
  const alphaAfterFull = itemAfterFull.data.items.find((i: any) => i.id === itemAlpha.id);
  assert(alphaAfterFull.receivedQuantity === 5, 'Total received quantity equals 5');
  assert(alphaAfterFull.status === OrderItemStatus.RECEIVED, 'Status transitioned to RECEIVED (ready for customer)');

  // 12. Customer Notification (CUSTOMER_NOTIFIED)
  const notifyRes = await axios.post(
    `${API}/receiving/notify-customer`,
    {
      orderItemId: itemAlpha.id,
      notes: 'تم الاتصال بالعميل وأكد حضوره مساء اليوم للاستلام',
      performerEmployeeId: staffEmployee.id,
      performerPin: expectedPin,
    },
    { headers: authHeaders }
  );
  assert(notifyRes.data.status === OrderItemStatus.CUSTOMER_NOTIFIED, 'Status transitioned to CUSTOMER_NOTIFIED');

  // 13. Customer Pickup / Delivery (DELIVERED)
  const deliverRes = await axios.post(
    `${API}/receiving/deliver-to-customer`,
    {
      orderItemId: itemAlpha.id,
      notes: 'استلم العميل كامل الكمية بالصيدلية وتم التحصيل',
      performerEmployeeId: staffEmployee.id,
      performerPin: expectedPin,
    },
    { headers: authHeaders }
  );
  assert(deliverRes.data.status === OrderItemStatus.DELIVERED, 'Status transitioned to DELIVERED');

  // 14. Status Transition Validation: Cannot transition from DELIVERED (Terminal State)
  try {
    await axios.patch(
      `${API}/orders/items/${itemAlpha.id}/status`,
      {
        status: OrderItemStatus.NEW,
        performerEmployeeId: staffEmployee.id,
        performerPin: expectedPin,
      },
      { headers: authHeaders }
    );
    assert(false, 'Terminal status transition should have been rejected');
  } catch (err: any) {
    assert(err.response?.status === 400, 'Terminal status transition correctly rejected with 400 Bad Request');
  }

  // 15. Audit Activity Log: Append-only verification
  const auditRes = await axios.get(`${API}/activity-logs`, {
    params: { limit: 10 },
    headers: authHeaders,
  });
  assert(Array.isArray(auditRes.data.data), 'Activity logs query successful');
  const latestLog = auditRes.data.data[0];
  assert(!!latestLog.performerEmployeeId, 'Activity log records verified performerEmployeeId');
  assert(!!latestLog.authenticatedUserId, 'Activity log records authenticated workstation account');

  console.log('\n====================================================');
  console.log(`VERIFICATION SUMMARY: ${passedTests}/${totalTests} TESTS PASSED!`);
  console.log('====================================================\n');
}

runVerificationTests().catch((e) => {
  console.error('Test execution failed:', e);
  process.exit(1);
});
