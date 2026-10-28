# Architectural & Infrastructure Decisions (ADR)

This document records the architectural, design, infrastructure, and DevOps decisions made for the HealthDastaan Admin Portal frontend application.

---

## ADR 001: Next.js Standalone Build for Minimal Docker Footprint

### Status

Accepted

### Context

Next.js applications can be containerized in multiple ways:

1. Copying the entire repository with `node_modules` and running `next start`.
2. Static export (`next export` / `output: 'export'`).
3. Next.js standalone output (`output: 'standalone'`).

The admin application requires server capabilities: Next.js middleware for route protection, runtime HTTP cookie validation, and an internal health probe endpoint (`/api/health`). Static HTML export is therefore unsuitable. However, bundling all development dependencies into a container leads to images exceeding 1.2 GB and slow cold starts.

### Decision

Configure `output: 'standalone'` in `next.config.ts`. Next.js automatically traces required dependencies and outputs a lean `server.js` with only the needed `node_modules` into `.next/standalone`.
To ensure local and container parity, a cross-platform helper `scripts/copy-standalone-assets.mjs` was introduced to copy `.next/static` and `public` into the standalone structure immediately following `next build`.

### Consequences

- **Positive:** Production Docker image size is reduced significantly (~150MB compressed Alpine image). Fast container startup (~300ms).
- **Positive:** Unused dev dependencies (Playwright, Vitest, Prettier, PostCSS) are eliminated from the runtime image.
- **Trade-off:** Standalone server requires `node server.js` rather than `next start`.

---

## ADR 002: Multi-Stage Docker Build with Unprivileged User

### Status

Accepted

### Context

Running containers as the `root` user presents security vulnerabilities. Containers running medical administrative dashboards must adhere to strict enterprise security standards and least-privilege principles.

### Decision

Structure `Dockerfile` with four distinct stages:

1. `base`: Minimal `node:20-alpine` with `libc6-compat`.
2. `deps`: Installs production and build dependencies with `npm ci --legacy-peer-deps`.
3. `builder`: Bakes build-time arguments (`NEXT_PUBLIC_API_BASE_URL`), runs `npm run build`, and copies static assets.
4. `runner`: Sets up an unprivileged system user (`nextjs:nodejs`, UID/GID 1001), copies only the standalone artifacts, defines a lightweight `wget` healthcheck, and drops root privileges with `USER nextjs`.

### Consequences

- **Positive:** Zero root privileges at container runtime.
- **Positive:** Docker build cache is maximized; code changes do not re-run dependency downloads.
- **Positive:** Healthcheck is native to Alpine (`wget`) with no external curl dependency required.

---

## ADR 003: Isolated External Docker Network (`healthdastaan-net`)

### Status

Accepted

### Context

HealthDastaan consists of a separate NestJS backend API with database access and an admin frontend. If containers communicate over public host interfaces, latency increases and internal API endpoints are exposed.

### Decision

Attach the admin container to an external Docker bridge network named `healthdastaan-net`.
Server-side calls inside the Docker network use `INTERNAL_API_BASE_URL=http://backend:3000/v1`, while browser-side requests use `NEXT_PUBLIC_API_BASE_URL=https://api.healthdastaan.com/v1`.

### Consequences

- **Positive:** Fast internal DNS resolution (`backend:3000`).
- **Positive:** Admin frontend can communicate with backend services even if backend ports are not exposed to the public Internet.
- **Requirement:** Deployment scripts must verify `healthdastaan-net` exists prior to `docker compose up`.

---

## ADR 004: Role-Based Access Control and Route Protection

### Status

Accepted

### Context

The platform defines multiple distinct admin personas:

- `super_admin` (Full platform governance)
- `verification_admin` (Doctor PMDC verification and credential review)
- `support_admin` (Patient/practitioner account support and session control)
- `compliance_admin` (HIPAA/regulatory compliance and audit trail review)
- `api_control_admin` (Feature flags and API kill-switches)

Patients and practitioners must never be permitted into administrative routes.

### Decision

Implement defense-in-depth security:

1. **Edge/Proxy Middleware (`middleware.ts`):** Evaluates `hd_admin_token` cookie for all protected admin routes. Missing tokens immediately redirect to `/login`.
2. **Client-Side Role Guard (`RoleGuard.tsx`):** Protects UI sections based on active admin role capabilities. Unauthorized users are routed to `/access-denied` or presented with a fallback lock screen.
3. **Session Cookie Storage:** Sets `SameSite=Strict`, `path=/` cookies upon successful authentication.

### Consequences

- **Positive:** Unauthenticated requests are blocked before page components render.
- **Positive:** Granular role checking protects clinical modules while preserving super-admin override.

---

## ADR 005: Automated Testing Pyramid (Vitest + Playwright)

### Status

Accepted

### Context

The application needed both fast component/unit test feedback for continuous development and end-to-end smoke verification for deployment validation without requiring real production database mutations.

### Decision

1. **Vitest + React Testing Library:** Unit and component tests for services, error handling, role guards, and login form validation with fast in-memory jsdom execution.
2. **Playwright:** End-to-end smoke tests verifying browser-level rendering, middleware redirects, navigation routes, and health endpoint availability.
3. **Mocks:** Backend requests are mocked in test environments to guarantee deterministic, isolated CI execution.

### Consequences

- **Positive:** Fast unit test execution (< 5 seconds for full suite).
- **Positive:** Full CI smoke test coverage verifying real browser interaction on Chromium.
