# Pharmacy Missing Items Management System (نظام إدارة نواقص الصيدلية)

A production-ready desktop and central backend system tailored for pharmacies to streamline, group, track, and fulfill customer requests for out-of-stock items, replacing traditional manual spreadsheets with real-time synchronized desktop stations.

## Architecture

This project is built as a TypeScript monorepo:

- **`packages/shared`**: Shared domain models, status transition logic, DTOs, and validation schemas.
- **`apps/api`**: Central backend built with Node.js, Express, Socket.IO, PostgreSQL, and Prisma ORM.
- **`apps/desktop`**: High-performance desktop application built with Electron 22 (Windows 7 compatible), React 18, TypeScript, Vite, and Tailwind CSS with full Arabic RTL design.
- **`docs/`**: Comprehensive architectural, database, API, and Windows 7 compatibility documentation.

## Windows 7 SP1 Compatibility Note

The desktop client is intentionally built on **Electron 22.3.27**, the final major release of Electron supporting Windows 7 SP1 and Windows 8.1.
For complete architectural details and security considerations, see [`docs/WINDOWS7_COMPATIBILITY.md`](./docs/WINDOWS7_COMPATIBILITY.md).

## Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node.js v24.17.0 and v18 LTS)
- **PostgreSQL**: PostgreSQL 14+ installed and running.
- **Operating System**: Windows 7 SP1+ / Windows 10 / Windows 11.

### 2. Installation
```bash
# Clone and install dependencies
npm install
```

### 3. Database Setup
```bash
# Copy API environment variables
cd apps/api
cp .env.example .env

# Run Prisma migrations & seed default employees
npm run db:push
npm run db:seed
```

### 4. Running the Development Environment
```bash
# Start backend API (from workspace root)
npm run dev:api

# Start Desktop application in another terminal
npm run dev:desktop
```

### 5. Default Credentials (Seeded)
- **Admin**: `admin` / `admin123` (Default PIN: `1111`)
- **Purchasing Manager**: `purchasing` / `manager123` (Default PIN: `2222`)
- **Employee**: `employee` / `staff123` (Default PIN: `3333`)
