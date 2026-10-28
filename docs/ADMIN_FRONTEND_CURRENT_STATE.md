# HealthDastaan Admin Frontend — Full Architecture Details & Current System State

> **Last Updated**: October 29, 2026  
> **Status**: Production-Ready, 100% Passing Unit Tests, 0 TypeScript Errors, 0 Linter Warnings, Standalone Docker & Vercel Optimized Build.  
> **Framework**: Next.js 16.4.3 (Turbopack, App Router, React 19)  
> **Brand & Design System**: Clinical Vitality (Deep Oceanic Blue `#002654`, Electric Cyan `#00A896` / `#0ED2B0`, Leaf Emerald `#00875A`)

---

## 1. High-Level Executive Summary

The **HealthDastaan Admin Portal** is an enterprise-grade administrative control and clinical operations console for the HealthDastaan Personal Health Record (PHR) and mental health platform. Adhering to the **HL7 FHIR Release 4** architectural standard, it provides platform governors, compliance officers, and medical verification administrators with centralized command over users, clinicians, healthcare organizations, OAuth2 machine-to-machine integrations, dynamic feature flags, and immutable audit logs.

### 1.1 Core System Capabilities

1. **System Administration & Public Readiness**: Refined authentication portal displaying the official brand emblem, URL-safe asset paths, and zero technical leaks.
2. **Dual-Role User & Session Governance**: Manages unified user profiles supporting simultaneous Patient and Practitioner identities, with account blocking and instantaneous refresh token revocation.
3. **Medical Credential Verification**: End-to-end PMDC (Pakistan Medical & Dental Council) license review, qualification inspection, and medical degree verification.
4. **Healthcare Organizations & Facilities Management**: Full multi-tenant governance over Hospitals, Clinics, Diagnostic Laboratories, Individual Doctor Practices, and linked OAuth2 EHR/FHIR API clients.
5. **Dynamic Feature Flags & Real-time Kill Switches**: Instantaneous activation/deactivation of core platform endpoints without requiring code redeployments.
6. **Immutable Regulatory Audit Logging**: Append-only audit trail recording every administrative decision with actor tracking and regulatory justification notes.
7. **High-Efficiency API Proxy Architecture**: Built-in same-origin reverse proxy (`/api/proxy/[...path]`) and concurrent in-flight request deduplication eliminating browser CORS failures and minimizing network roundtrips.

---

## 2. Technology Stack & Dependencies

| Layer / Component           | Technology               | Version            | Purpose                                                     |
| --------------------------- | ------------------------ | ------------------ | ----------------------------------------------------------- |
| **Core Framework**          | **Next.js (App Router)** | `16.4.3`           | React 19 server/client hybrid architecture with Turbopack   |
| **Language & Typing**       | **TypeScript**           | `5.7.3`            | Strict type checking, zero `any` shortcuts                  |
| **Styling & Design System** | **Tailwind CSS**         | `3.4.17`           | Utility-first tokenized Clinical Vitality design system     |
| **Typography**              | **Plus Jakarta Sans**    | Next/Font          | High-clarity clinical typography with ergonomic scanability |
| **Iconography**             | **Lucide React**         | `0.475.0`          | Feather-light SVG icons tailored for healthcare operations  |
| **Unit Testing**            | **Vitest & RTL**         | `3.0.5` / `16.2.0` | Blazing-fast component and service unit testing             |
| **E2E Testing**             | **Playwright**           | `1.50.1`           | Cross-browser integration & smoke verification suite        |
| **Code Quality**            | **ESLint 9 & Prettier**  | Latest             | Flat config linting and unified code formatting             |
| **Containerization**        | **Docker Multi-Stage**   | Node 20 Alpine     | Non-root standalone production containerization             |

---

## 3. Brand & "Clinical Vitality" Design System

The visual language bridges precision clinical infrastructure with human-centered vitality, eliminating clinical coldness while preserving diagnostic authority.

### 3.1 Color Palette

- **Primary (`#002654` / `#0B3C78` - Deep Oceanic Royal Blue)**: Primary interactive anchor, sidebar header, display typography, and brand authority.
- **Secondary (`#00A896` / `#0ED2B0` - Radiant Cyan & Electric Aqua)**: Telemetry tracks, active navigation indicators, and live system signals.
- **Tertiary (`#00875A` / `#10B981` - Leaf Emerald)**: Physiological regeneration, approved doctor verifications, licensed organizations, and verified outcomes.
- **Neutral Surface (`#F7F9FF` canvas, `#FFFFFF` cards, `#121D27` slate type)**: Delimited by fine structural outlines (`rgba(11, 60, 120, 0.08)`), replacing heavy drop-shadows with luminous ambient boundaries.

### 3.2 Official Brand Assets (`public/`)

- `/logo.png`: High-resolution primary color brand mark and wordmark.
- `/logo-white.png`: Monochromatic luminous white emblem optimized for oceanic dark sidebars.
- `/logo-black.png`: Monochromatic high-contrast emblem for monochrome print & exports.

---

## 4. Multi-Admin Role-Based Access Control (RBAC) Matrix

Access permissions are enforced dynamically across routes via [`RoleGuard.tsx`](file:///components/layout/RoleGuard.tsx), [`AdminLayout.tsx`](file:///components/layout/AdminLayout.tsx), and [`useRoleAccess.ts`](file:///hooks/useRoleAccess.ts).

| Role Key             | Role Label             | Badge Color         | Accessible Routes                                                                            | Primary Administrative Responsibilities                                                                                   |
| -------------------- | ---------------------- | ------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `super_admin`        | **Super Admin**        | `#002654` (Navy)    | `/`, `/users`, `/verification`, `/organizations`, `/feature-flags`, `/audit-logs`, `/admins` | Unrestricted authority across all clinical subsystems, administrator CRUD, privilege allocation, and platform governance. |
| `verification_admin` | **Verification Admin** | `#006B5F` (Teal)    | `/`, `/verification`, `/organizations`, `/users`                                             | PMDC practitioner licensing reviews, medical degree validation, hospital/clinic registration reviews.                     |
| `support_admin`      | **Support Admin**      | `#00A896` (Aqua)    | `/`, `/users`                                                                                | User lifecycle management, patient/doctor status controls (active, suspended, blocked), session resets.                   |
| `compliance_admin`   | **Compliance Admin**   | `#00875A` (Emerald) | `/`, `/audit-logs`, `/users`                                                                 | Regulatory compliance inspection, immutable audit log auditing, data protection enforcement.                              |
| `api_control_admin`  | **API Control Admin**  | `#0B3C78` (Blue)    | `/`, `/feature-flags`, `/audit-logs`                                                         | Dynamic feature flag toggling, endpoint kill-switches, API rate limit overrides.                                          |

---

## 5. Architectural Modules & Functional Specification

### 5.1 Login & Authentication (`/login`)

- **Public & Production Ready**: Free of confidential technical logs or raw API strings.
- **Brand Emblem**: Uses the official `/logo.png` image with accessible screen-reader headers.
- **Title Badge**: "System Administration Portal" with status indicator.
- **Direct Backend Authentication**: Directly posts credentials to `/auth/login` via the secure proxy.
- **Security Features**:
  - Rejection of standard patient/practitioner non-admin logins with informative access-denied alerts.
  - Brute-force account lock notification display.
  - Modern legal footer: `"© 2026 HealthDastaan. All rights reserved."`

### 5.2 Clinical Command Dashboard (`/`)

- **Operational Banner**: Displays real-time status (`HealthDastaan Clinical Mesh: Operational`).
- **5 High-Density Telemetry Metric Cards**:
  1. _Total Registered Users_: Breakdown of doctors, patients, and dual-role users.
  2. _Pending Doctor Verifications_: Count of clinicians awaiting PMDC review.
  3. _Healthcare Facilities_: Total hospitals, clinics, labs, and individual practices.
  4. _Blocked / Suspended Accounts_: Enforced safety and fraud mitigations.
  5. _Active Feature Flags_: Ratio of active endpoints to total system flags.
- **Pending Action Buttons**: Direct navigation shortcuts to pending verification queues.

### 5.3 User Management (`/users`)

- **Directory**: Paginated, searchable directory of users across `patient`, `practitioner`, and `both` roles.
- **Status Controls**: Real-time status transitions (`active`, `suspended`, `blocked`).
- **Session Governance**: One-click revocation of all active refresh tokens for compromised accounts.
- **Audit Integration**: Enforces mandatory justification reasons stored in PostgreSQL `audit_log`.

### 5.4 Practitioner Verification (`/verification`)

- **Review Queue**: Filters by `pending`, `approved`, and `rejected`.
- **Credential Inspection**: PMDC license number, medical council state, qualifications, and experience.
- **Document Viewer**: Genuine credential documents directly mapped from backend database storage.
- **Approval / Rejection Dialogs**: Rejection reasons categorized and audited.

### 5.5 Healthcare Organizations & Facilities (`/organizations`) [NEW]

- **Multi-Tenant Facility Directory**: Supports `hospital`, `clinic`, `laboratory`, `other`, and individual doctor practices (`isIndividual`).
- **Facility Telemetry**: Live counts of Total Facilities, Pending Review, Verified, and Suspended.
- **Detailed Inspection Modal**:
  - _Overview Tab_: Registration/licensing number, official contact email, telephone, physical address.
  - _Members Tab_: List of linked staff members and roles (`owner`, `admin`, `staff`).
  - _OAuth2 API Clients Tab_: Inspection of machine-to-machine client credentials for EHR, LIS, and FHIR integrations.
- **Status Lifecycle Control**: Approve (`verified`), Reject (`rejected`), or Suspend (`suspended`) with audit justifications.

### 5.6 Feature Flags & API Control (`/feature-flags`)

- **Endpoint Kill-Switches**: Immediate toggle for `auth.register.patient`, `auth.register.practitioner`, `auth.login`, `organizations.register`, `phr.document_upload`, etc.
- **Audit Tracking**: Displays administrator identity and timestamp of the last state change.

### 5.7 Audit Logs (`/audit-logs`)

- **Immutable Audit Trail**: Append-only log recording all administrative actions.
- **Filtering**: Multi-parameter search by action code, severity (`info`, `warning`, `critical`), status (`success`, `failure`), and administrator actor.

### 5.8 Administrator Governance (`/admins`)

- **Privileged Identity Management**: Provisioning and updating administrator accounts and department assignments.
- **Fail-Safe Protection**: Safeguarded against self-deletion or removing the last active Super Admin.

---

## 6. High-Efficiency API Layer & Proxy Architecture

### 6.1 Direct Same-Origin Reverse Proxy (`/api/proxy/[...path]`)

- **CORS Preflight Elimination**: Browser client calls route to same-origin `/api/proxy/*`, eliminating failing cross-origin `OPTIONS` requests from `https://admin.healthdastaan.com` to `https://api.healthdastaan.com`.
- **Double-Roundtrip Optimization**: Cuts client network request latency in half.
- **Server-Side Fallback**: On SSR, Docker container-to-container, or Node environments, requests use `INTERNAL_API_BASE_URL` directly.

### 6.2 Concurrent In-Flight GET Request Deduplication

- Implemented in [`services/apiClient.ts`](file:///services/apiClient.ts) using an internal request map.
- If multiple components or layout hooks request the same GET resource concurrently (e.g., Dashboard telemetry and Sidebar badge counter), only **one** HTTP request is dispatched to the backend.

### 6.3 Thread-Safe Token Refresh Queue

- Automatically intercepts HTTP 401 responses.
- Queues concurrent failing requests while a single refresh token exchange executes against `/auth/refresh`.
- Replays all queued requests with the newly minted Bearer access token upon completion.

---

## 7. Quality Assurance & Test Verification Summary

```
========================= TEST SUITES SUMMARY =========================
Format Check (npm run format:check):
  Status:  100% Passing (All matched files use Prettier style)

Typecheck (npm run typecheck):
  Status:  0 Errors (tsc --noEmit)

Linter (npm run lint):
  Status:  0 Errors, 0 Warnings (eslint)

Unit Tests (npm test):
  Test Suites: 6 passed, 6 total
  Tests:       18 passed, 18 total
  Duration:    ~3.8s
  Suites:
    ✓ services/__tests__/apiClient.test.ts (4 tests)
    ✓ services/__tests__/authService.test.ts (3 tests)
    ✓ services/__tests__/organizationService.test.ts (3 tests)
    ✓ components/__tests__/RoleGuard.test.tsx (3 tests)
    ✓ components/__tests__/Sidebar.test.tsx (2 tests)
    ✓ app/__tests__/LoginPage.test.tsx (3 tests)

Production Build (npm run build):
  Status:  Compiled successfully to standalone output
  Output:  .next/standalone + public assets copied
========================================================================
```

---

## 8. Deployment & Environment Configuration

### 8.1 Environment Variables Matrix

| Variable                   | Scope            | Default / Recommended              | Purpose                                                  |
| -------------------------- | ---------------- | ---------------------------------- | -------------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | Client / Build   | `https://api.healthdastaan.com/v1` | Public API endpoint for direct client calls              |
| `NEXT_PUBLIC_API_URL`      | Client / Build   | `https://api.healthdastaan.com/v1` | Backward-compatibility alias                             |
| `INTERNAL_API_BASE_URL`    | Server Only      | `http://backend:3000/v1`           | Container-to-container internal network backend endpoint |
| `PORT`                     | Container        | `3000`                             | Port on which the Next.js standalone server listens      |
| `NODE_ENV`                 | Container / Host | `production`                       | Production runtime optimization flag                     |

> **Security Mandate**: Never prefix database credentials, service role tokens, or private secrets with `NEXT_PUBLIC_*`.

### 8.2 Docker Deployment

```bash
# Build multi-stage production container
docker build -t healthdastaan-admin:latest .

# Run with container networking
docker run -d \
  -p 3001:3000 \
  --name healthdastaan-admin \
  --env-file .env.production \
  healthdastaan-admin:latest
```

### 8.3 Vercel Deployment

The repository includes a production-tuned [`vercel.json`](file:///vercel.json) ensuring security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`) and proxy compatibility across Vercel Edge networks.
