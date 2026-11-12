# Windows 7 Compatibility Evaluation & Technical Report

## 1. Executive Summary

This document outlines the architectural analysis, technical constraints, risks, and configuration decisions made to support running the Pharmacy Missing Items Desktop Application on Windows 7 SP1 (64-bit and 32-bit) pharmacy workstations.

## 2. Operating System & Chromium Support Background

- **Microsoft Windows 7 End of Life**: Extended Security Updates (ESU) ended on January 10, 2023.
- **Chromium / Google Chrome**: Dropped support for Windows 7 with the release of Chromium 109 (January 2023). Chromium 110+ requires Windows 10 or later due to internal dependencies on newer Win32 kernel APIs (e.g., `SetProcessInformation`, `QueryWorkingSetEx`, DirectComposition changes).
- **Electron Lifecycle**:
  - Electron 22 is based on Chromium 108.0.5359.215 and Node.js 16.17.1.
  - Electron 22.3.27 is the **last official version of Electron** that can run natively on Windows 7 and Windows 8.1 without unofficial kernel shims.
  - Electron 23+ fails to launch on Windows 7 with missing procedure entry point errors in `KERNEL32.dll`.

## 3. Technology Selection & Trade-Offs

### Option A: Electron 22.3.27 + React 18 + Vite (Selected)
- **Pros**:
  - Cross-platform codebase ready for desktop, future mobile (React Native or shared components), and web.
  - Rich modern Arabic RTL design system (Tailwind CSS, Lucide icons, Cairo/Tajawal typography).
  - Modern reactive data management with real-time Socket.IO synchronization.
  - Strong TypeScript typing across frontend, shared package, and backend.
- **Cons & Risks**:
  - Electron 22 reached End-of-Life (EOL) in May 2023; no upstream Chromium security patches are provided.
- **Risk Mitigation**:
  1. The application operates in an isolated internal pharmacy LAN or secure WAN connecting strictly to the dedicated pharmacy backend API.
  2. The Electron renderer disables `nodeIntegration` and enables `contextIsolation`.
  3. External navigation is blocked; arbitrary URLs cannot be loaded.
  4. Workstations run with restricted user permissions.

### Option B: .NET Framework 4.8 / WPF Desktop Application
- **Pros**:
  - Supported natively on Windows 7 SP1 with .NET Framework 4.8 installed.
  - Deep OS integration.
- **Cons**:
  - Complete technology fork between desktop (C# / XAML) and future mobile / web systems.
  - RTL Arabic typography and modern fluid styling require complex custom XAML styles.
  - Inability to share code, DTOs, validation schemas, and real-time state handlers with the TypeScript backend and future Android mobile application.

### Decision
Option A (pinned to **Electron 22.3.27**) is chosen because it maintains monorepo coherence, allows TypeScript DTO sharing, provides rich RTL support, and meets the Windows 7 constraint while isolating security risks through strict IPC and context isolation.

## 4. Workstation Prerequisites for Windows 7

Target Windows 7 computers must have:
1. **Windows 7 Service Pack 1 (SP1)** (Build 7601).
2. **KB2533623** or **KB3063858** (Windows API updates).
3. **KB2999226** (Universal C Runtime in Windows).
4. DirectX 11 or enabled software rendering fallback (`--disable-gpu` flag if legacy Intel/AMD graphics drivers fail).

## 5. Electron Build Configuration

In `apps/desktop/package.json`:
- `"electron": "22.3.27"` (strictly pinned, no `^` or `~`).
- Target architecture: `ia32` or `x64`.
- Packaging via `electron-builder` with NSIS installer targeting `win32`.
