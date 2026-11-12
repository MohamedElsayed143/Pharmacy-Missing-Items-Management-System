# API Specification & Endpoints

## 1. Authentication & Session

- `POST /api/auth/login`: Authenticate workstation (`username`, `password`). Returns JWT access token and workstation employee profile.
- `GET /api/auth/me`: Get current session profile.
- `GET /api/auth/active-performers`: Get list of active employees (`id`, `fullName`, `role`) for the performer attribution dropdown.
- `POST /api/auth/verify-pin`: Verify a selected performer's personal PIN (`employeeId`, `pin`).

## 2. Orders & Missing Items Requests

- `POST /api/orders`: Create new missing item request order with one or more items. Requires performer attribution (`performerEmployeeId`, `performerPin`).
- `GET /api/orders`: Paginated list of orders with filter query params (`status`, `search`, `priority`, `startDate`, `endDate`, `employeeId`).
- `GET /api/orders/:id`: Detailed view of an order with all items and history.
- `GET /api/orders/items`: Flat list of order items for granular item-level tracking and filtering.
- `PATCH /api/orders/items/:id/status`: Update status of a specific order item. Validates status workflow transition, verifies performer PIN, and logs audit trail.
- `GET /api/orders/items/:id/history`: Get status transition history for a specific order item.

## 3. Purchasing Management

- `GET /api/purchasing/grouped`: Group requests for identical verified products (Product Name + Strength + Dosage Form) currently awaiting purchase (`NEW`, `REVIEWED`, `ADDED_TO_PURCHASE`).
- `POST /api/purchasing/batches`: Create a new purchasing batch from grouped items. Verifies performer PIN.
- `GET /api/purchasing/batches`: List purchasing batches.
- `GET /api/purchasing/batches/:id`: Retrieve single batch details.
- `PATCH /api/purchasing/batches/:id/order`: Mark batch as `ORDERED`, automatically advancing linked order items to `ORDERED`.
- `GET /api/purchasing/batches/:id/export`: Export purchasing batch to formatted Excel spreadsheet (`.xlsx`).

## 4. Receiving & Inventory Inflow

- `POST /api/receiving/receive-items`: Record incoming product shipments. Allocates received quantities to waiting customer order items.
- `POST /api/receiving/notify-customer`: Mark item as `CUSTOMER_NOTIFIED`.
- `POST /api/receiving/deliver-to-customer`: Mark item as `DELIVERED` when customer picks up item.

## 5. Dashboard Statistics

- `GET /api/dashboard/stats`: Returns operational counts:
  - `totalRequests`
  - `newRequests`
  - `awaitingPurchasing`
  - `orderedProducts`
  - `partiallyReceived`
  - `readyForPickup`
  - `delivered`
- `GET /api/dashboard/top-requested`: Top missing items by request frequency.
- `GET /api/dashboard/recent-activity`: Real-time recent activity stream.

## 6. Staff & Audit Management (Admin)

- `GET /api/employees`: List all employees.
- `POST /api/employees`: Create new employee account.
- `PATCH /api/employees/:id`: Edit employee details, toggle active state, update role, or reset PIN.
- `GET /api/activity-logs`: Append-only audit log query with pagination and filters.

## 7. Socket.IO Real-Time Events

- `order:created`: Triggered when an order is created.
- `orderItem:statusChanged`: Triggered when an order item status updates.
- `purchaseBatch:created`: Triggered when a new purchasing batch is created.
- `purchaseBatch:updated`: Triggered when a batch status changes.
- `stats:updated`: Emitted to inform clients to refresh statistical cards.
