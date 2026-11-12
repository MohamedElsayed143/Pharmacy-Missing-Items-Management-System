# Installation, Deployment & Operations Manual

## 1. System Overview

The Pharmacy Missing Items Management System (نظام إدارة نواقص الصيدلية) is engineered to connect multiple Windows workstations (including Windows 7 SP1 and newer) to a centralized backend server and PostgreSQL database within the pharmacy's local area network (LAN).

---

## 2. Server Installation (Central Machine)

The central pharmacy computer or server hosts the database and API service.

### Step 1: Install Prerequisites
1. **Node.js**: Version 18 LTS or newer.
2. **PostgreSQL**: Version 14 or newer.

### Step 2: Database Configuration
1. Initialize or start PostgreSQL.
2. Use the provided automation script to manage the local PostgreSQL cluster if needed:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\manage-db.ps1 -Action start
   ```
3. Set your environment variables in `apps/api/.env`:
   ```env
   PORT=4000
   NODE_ENV=production
   JWT_SECRET=your-secure-jwt-production-secret-key
   DATABASE_URL="postgresql://postgres:postgres@localhost:5433/pharmacy_db?schema=public"
   CORS_ORIGIN=*
   ```

### Step 3: Database Migrations and Seeding
```bash
# Push Prisma schema to PostgreSQL
npm run db:push

# Seed default pharmacy roles, pharmacists, and pharmaceutical product catalog
npm run db:seed
```

### Step 4: Run the API Service
```bash
# Start backend in production mode
npm run build:api
npm run dev:api  # or node apps/api/dist/main.js
```
The server will bind to `0.0.0.0:4000`, making it accessible across the pharmacy local network (e.g., `http://192.168.1.100:4000`).

---

## 3. Workstation Desktop Client Installation

### Target OS Compatibility
- **Windows 7 Service Pack 1** (32-bit & 64-bit) with KB2533623 and KB2999226 installed.
- **Windows 10 / Windows 11**.

### Option A: Using the Windows NSIS Installer (Recommended for Staff)
1. Copy the generated installer from `apps/desktop/release/Pharmacy Missing Items Setup 1.0.0.exe` to a USB flash drive or shared network folder.
2. Run the installer on the target pharmacy computer.
3. Follow the wizard steps to complete the installation. A desktop shortcut named **"Pharmacy Missing Items"** will be created on the desktop and start menu.

### Option B: Portable Unpacked Run
1. Copy the folder `apps/desktop/release/win-unpacked` to the workstation (e.g. `C:\PharmacyApp`).
2. Run `Pharmacy Missing Items.exe`.

### Option C: Running from Source (Developer Mode)
```bash
# Run desktop client in development mode
npm run dev:desktop
```

---

## 4. Default Credentials (Pre-seeded)

| Role | Username | Password | Default PIN | Staff Name |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | `1111` | د. أحمد القدري (مدير الصيدلية) |
| **Purchasing Manager** | `purchasing` | `manager123` | `2222` | د. سارة محمود (مسؤول المشتريات) |
| **Staff Pharmacist 1** | `employee1` | `staff123` | `3333` | د. محمد السيد (صيدلي أول) |
| **Staff Pharmacist 2** | `employee2` | `staff123` | `4444` | أ. مريم علي (مساعد صيدلي) |

---

## 5. Network Firewall Configuration

If running across multiple physical machines:
- Ensure Windows Firewall on the central server allows inbound TCP connections on port **4000** for the pharmacy private network.
- Workstations point their `API_BASE_URL` to `http://<CENTRAL_SERVER_IP>:4000/api`.
