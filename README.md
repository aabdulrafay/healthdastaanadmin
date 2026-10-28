# HealthDastaan Admin Portal

HealthDastaan Admin is the mission-critical clinical administration and platform governance portal for the HealthDastaan healthcare ecosystem. It provides role-based administrative control over doctor credential verification, patient/practitioner directory management, feature flag and API kill-switches, audit trail inspection, and platform infrastructure.

---

## 1. Architecture & Design Principles

- **Framework:** Next.js 16 (App Router) with TypeScript & React 19
- **Aesthetic:** "Clinical Vitality" enterprise theme (Deep Navy `#002654`, Oceanic Mint `#00A896`, Slate White `#F7F9FF`)
- **Styling:** Tailwind CSS v4 with PostCSS
- **Runtime Deployment:** Multi-stage Docker container utilizing Next.js Standalone mode
- **Process Security:** Unprivileged `nextjs:nodejs` system user with Alpine minimal base image
- **Network Topology:** External bridge network `healthdastaan-net` connecting frontend to the NestJS backend
- **Authentication:** Defense-in-depth security model featuring Next.js proxy middleware, client-side role guards, and `SameSite=Strict` session cookies

---

## 2. Directory Structure & Route Map

```
healthdastaanadmin/
├── app/
│   ├── (dashboard)/
│   │   ├── page.tsx               # Primary Clinical Mesh Command Dashboard
│   │   ├── users/page.tsx         # User Directory & Session Governance
│   │   ├── verification/page.tsx  # Doctor Credentialing & PMDC Verification
│   │   ├── feature-flags/page.tsx # Feature Flags & API Endpoint Control
│   │   ├── audit-logs/page.tsx    # HIPAA / Regulatory Audit Trails
│   │   └── admins/page.tsx        # System Administrator User Management
│   ├── login/page.tsx             # Administrative Authentication Gateway
│   ├── access-denied/page.tsx     # Role Authorization Fallback Screen
│   ├── api/health/route.ts        # Internal Docker & Kubernetes Health Check
│   ├── layout.tsx                 # Root layout with font and metadata
│   └── globals.css                # Clinical design system CSS tokens
├── components/
│   ├── layout/
│   │   ├── AdminLayout.tsx        # Shell wrapping authenticated pages
│   │   ├── Header.tsx             # Clinical status header and user menu
│   │   ├── Sidebar.tsx            # Role-aware navigation drawer
│   │   └── RoleGuard.tsx          # Declarative component-level authorization
│   └── ui/                        # Reusable clinical design components
├── docs/
│   ├── DEPLOYMENT.md              # Production deployment & Nginx SSL guide
│   └── DECISIONS.md               # Architectural Decision Records (ADRs)
├── e2e/
│   └── smoke.spec.ts              # Playwright browser end-to-end smoke tests
├── hooks/
│   ├── useAuth.tsx                # Context provider for authentication state
│   ├── useRoleAccess.ts           # Hook for fine-grained permission queries
│   └── useToast.tsx               # Clinical feedback alert manager
├── lib/
│   ├── constants.ts               # Role definitions, URLs, and routes
│   ├── mockData.ts                # Initial development dataset
│   ├── storage.ts                 # Local storage and cookie session manager
│   └── utils.ts                   # Class variance and string utilities
├── services/                      # Modular API clients & error normalization
│   ├── apiClient.ts
│   ├── authService.ts
│   ├── userService.ts
│   ├── verificationService.ts
│   ├── featureFlagService.ts
│   ├── auditService.ts
│   └── adminService.ts
├── scripts/
│   └── copy-standalone-assets.mjs # Standalone asset packaging helper
├── Dockerfile                     # Multi-stage production container build
├── docker-compose.yml             # Production container definition
├── docker-compose.dev.yml         # Local development container with hot-reload
├── middleware.ts                  # Edge token validation & route protection
├── vitest.config.mjs              # Unit and component test runner configuration
└── playwright.config.ts           # Browser smoke test automation setup
```

---

## 3. Environment Variables & Configuration

Copy `.env.example` to create your local `.env.local`:

```bash
cp .env.example .env.local
```

### Configuration Parameters

| Variable                   | Description                                   | Default / Example                  |
| :------------------------- | :-------------------------------------------- | :--------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | Public browser-facing backend API endpoint    | `https://api.healthdastaan.com/v1` |
| `NEXT_PUBLIC_API_URL`      | Backward-compatibility alias for API base URL | `https://api.healthdastaan.com/v1` |
| `INTERNAL_API_BASE_URL`    | Server-to-server internal Docker network URL  | `http://backend:3000/v1`           |
| `PORT`                     | Container internal listening port             | `3000`                             |
| `HOST_PORT`                | Local host port mapped to container port      | `3001`                             |
| `NODE_ENV`                 | Application runtime environment               | `development` or `production`      |

> **Security Note:** Variables prefixed with `NEXT_PUBLIC_*` are inlined into JavaScript bundles during build time. Never place secrets, database passwords, or private API keys in `NEXT_PUBLIC_*` variables.

---

## 4. Prerequisites

- **Node.js:** Version `20.18.0+` (refer to [.nvmrc](file:///.nvmrc))
- **Package Manager:** `npm` 10+
- **Docker:** Engine version 24.0+ & Docker Compose V2 (optional for containerized runs)

---

## 5. Local Development Commands

```bash
# Pin Node.js version
nvm use

# Install dependencies (respecting peer constraints)
npm install --legacy-peer-deps

# Start Next.js development server with Turbopack
npm run dev

# Access the admin portal
http://localhost:3000
```

---

## 6. Code Quality, Testing, and Build Commands

```bash
# Code formatting check with Prettier
npm run format:check

# Auto-format all code
npm run format

# Run ESLint validation
npm run lint

# TypeScript strict type checking
npm run typecheck

# Execute unit and component tests (Vitest)
npm run test

# Run tests in watch mode
npm run test:watch

# Build production bundle with standalone output
npm run build

# Start local standalone production server
npm run start
```

---

## 7. Automated Smoke Testing with Playwright

Playwright runs automated browser-level smoke tests covering authentication, middleware route protection, health endpoints, and navigation:

```bash
# Install Chromium browser binary (one-time)
npx playwright install --with-deps chromium

# Run all end-to-end smoke tests
npm run test:e2e
```

---

## 8. Running with Docker

### Step 1: Create Shared Docker Network

The admin container expects an external bridge network `healthdastaan-net` to connect to the backend:

```bash
docker network create healthdastaan-net || true
```

### Step 2: Production Container

Run using `docker-compose.yml`:

```bash
# Build and start in detached mode
npm run docker:up
# Or directly:
docker compose up -d --build

# View container status and healthcheck
docker compose ps

# Inspect logs
docker compose logs -f

# Shut down container
npm run docker:down
```

The application will be accessible at `http://localhost:3001`.

### Step 3: Development Container (with Hot Reload)

Run using `docker-compose.dev.yml`:

```bash
docker compose -f docker-compose.dev.yml up
```

---

## 9. Backend Integration & Networking

The Admin Portal connects to a separate NestJS backend API:

1. **Client-Side Requests:** Browser JavaScript makes requests directly to `NEXT_PUBLIC_API_BASE_URL` (e.g. `https://api.healthdastaan.com/v1`).
2. **Server-Side Requests:** When executing inside Docker, server-rendered components or proxy calls use `INTERNAL_API_BASE_URL` (e.g. `http://backend:3000/v1`).

### Health Endpoint

The admin portal exposes a lightweight health check at:

```http
GET /api/health
```

Response:

```json
{
  "status": "ok",
  "service": "healthdastaan-admin",
  "uptime": 124.5,
  "timestamp": "2026-10-28T14:50:00.000Z"
}
```

---

## 10. Troubleshooting Common Issues

### 1. `docker compose up` fails with "network healthdastaan-net not found"

Create the external Docker network before launching:

```bash
docker network create healthdastaan-net
```

### 2. Port Conflict on 3001

If port 3001 is occupied on your host machine, override `HOST_PORT` in `.env`:

```bash
HOST_PORT=3005 docker compose up -d
```

### 3. Middleware redirects immediately to `/login`

Ensure that the `hd_admin_token` cookie is set upon authentication, or log in using valid development administrator credentials from the login quick-fill panel.

### 4. Standalone output missing static assets in manual runs

If running `node .next/standalone/server.js` outside Docker, ensure `npm run build` was executed (which runs `scripts/copy-standalone-assets.mjs` to synchronize `.next/static` and `public`).

---

## 11. Production Deployment

Refer to the complete deployment guide in [docs/DEPLOYMENT.md](file:///docs/DEPLOYMENT.md) for reverse proxy configuration, TLS setup, and maintenance runbooks.
