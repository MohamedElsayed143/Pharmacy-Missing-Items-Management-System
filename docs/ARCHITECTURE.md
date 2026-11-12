# System Architecture & Design Documentation

## 1. Overview

The Pharmacy Missing Items Management System is designed as a modular monorepo that decouples presentation (Desktop application, future Mobile application) from business logic, data persistence, and synchronization (Central Backend API & PostgreSQL Database).

```
+-------------------------------------------------------------+
|                      Central Database                       |
|               (PostgreSQL 14+ / Prisma ORM)                 |
+-------------------------------------------------------------+
                              ^
                              |
+-------------------------------------------------------------+
|                     Backend API Server                      |
|       (Node.js / Express / Socket.IO / TypeScript)          |
+-------------------------------------------------------------+
          ^                                       ^
          | (REST + WebSockets)                   | (REST + WebSockets)
+------------------------+             +------------------------+
| Workstation 1 (Win 7)  |             | Workstation 2 (Win 7)  |
| Desktop Client (React) |             | Desktop Client (React) |
+------------------------+             +------------------------+
          |                                       |
          +-------------------+-------------------+
                              | (Future Phase)
                     +------------------+
                     |  Android Mobile  |
                     +------------------+
```

## 2. Monorepo Organization

- `packages/shared`: Universal domain models, TypeScript interfaces, enums, status workflow definitions, validation schemas (Zod).
- `apps/api`: RESTful API, Socket.IO gateway, Prisma ORM service, authentication, authorization, employee attribution verifier, append-only activity logger.
- `apps/desktop`: Electron 22 shell + React 18 + Vite + Tailwind CSS + RTL Arabic design system + Socket.IO client.
- `docs/`: Technical specifications, database schema docs, compatibility evaluations, setup manuals.

## 3. Two-Tier Identity & Performer Attribution Architecture

In pharmacy operations, a desktop terminal is often left logged into a general workstation account during a shift, while different pharmacists or technicians physically perform operations at the counter.

To solve accountability and prevent impersonation:
1. **Workstation Authentication**: The terminal logs into an authenticated session using credentials (`username` + `password`). This generates a secure JWT token identifying the workstation session.
2. **Performer Attribution**: Whenever a sensitive business operation is triggered (creating a request, transitioning status, creating purchasing batches, receiving inventory, or dispensing to customers), the user must:
   - Select their personal employee profile from an active employee list.
   - Enter their secret 4-to-6-digit PIN.
3. **Backend Enforcement**:
   - The API verifies both the workstation JWT and the performer's hashed PIN against the database.
   - The Activity Log records both:
     - `authenticatedUserId`: Workstation terminal account.
     - `performerEmployeeId`: The verified physical employee on duty.
   - Performer attribution is immutable and cannot be overridden on the client.

## 4. Real-Time Synchronization Model

All connected desktop workstations maintain an active WebSocket connection (Socket.IO).
- When any client executes a mutation (e.g., adds an order, updates receiving status):
  1. The API commits the transaction to PostgreSQL.
  2. The API creates an immutable audit entry in `ActivityLog`.
  3. The API emits a targeted event (`order:created`, `orderItem:statusChanged`, `stats:updated`) over Socket.IO.
  4. Other workstations receive the event and seamlessly update their React Query caches without losing active form inputs or requiring page refreshes.
