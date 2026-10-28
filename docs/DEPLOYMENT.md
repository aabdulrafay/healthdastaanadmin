# HealthDastaan Admin Portal - Production Deployment Guide

This document describes the deployment procedures, environment configurations, reverse proxy setup, and operational runbooks for the HealthDastaan Admin Portal (`admin.healthdastaan.com`).

---

## 1. Architecture Overview

```
                                    +-----------------------------------------+
                                    | Internet / Authorized Administrators   |
                                    +--------------------+--------------------+
                                                         | HTTPS (Port 443)
                                                         v
                                    +-----------------------------------------+
                                    | Nginx Reverse Proxy (TLS 1.3 / Certbot) |
                                    +--------------------+--------------------+
                                                         | HTTP (Port 3001)
                                                         v
                                    +-----------------------------------------+
                                    | Docker Container: healthdastaan-admin   |
                                    | Next.js Standalone (Port 3000)          |
                                    +--------------------+--------------------+
                                                         | Docker Network:
                                                         | healthdastaan-net
                                                         v
                                    +-----------------------------------------+
                                    | NestJS Backend API Service (api:3000)   |
                                    | PostgreSQL / Redis Clusters             |
                                    +-----------------------------------------+
```

The HealthDastaan Admin Portal is containerized as a lightweight, non-root Node.js Alpine container utilizing Next.js Standalone mode. It runs behind a hardened Nginx reverse proxy providing TLS termination, HTTP/2 or HTTP/3 transport, and security headers.

---

## 2. Prerequisites & System Requirements

- **Operating System:** Ubuntu Linux 22.04 LTS / 24.04 LTS (recommended) or Debian 12
- **Docker Engine:** Version 24.0+ with Compose V2
- **Hardware Profile:**
  - 2 vCPU
  - 4 GB RAM (minimum for build and runtime)
  - 20 GB NVMe / SSD disk space
- **Domain DNS Records:**
  - `A` or `CNAME` record for `admin.healthdastaan.com` pointing to the public reverse proxy IP.

---

## 3. Docker Network Configuration

The admin container connects to the backend through a shared external bridge network named `healthdastaan-net`. This isolates inter-service traffic from the public network.

### Create Network (if not already existing)

```bash
docker network create --driver bridge healthdastaan-net
```

### Verify Network

```bash
docker network inspect healthdastaan-net
```

---

## 4. Environment Variables Configuration

Create a production `.env` file on the deployment host. **Never commit production `.env` files to source control.**

```bash
# ==============================================================================
# HealthDastaan Admin - Production Environment Variables
# ==============================================================================

# Browser-facing backend API endpoint (inlined at build-time for client bundles)
NEXT_PUBLIC_API_BASE_URL=https://api.healthdastaan.com/v1

# Backward-compatibility alias
NEXT_PUBLIC_API_URL=https://api.healthdastaan.com/v1

# Internal Docker server-to-server endpoint (used if SSR or proxy routes are invoked)
INTERNAL_API_BASE_URL=http://backend:3000/v1

# Container runtime settings
NODE_ENV=production
PORT=3000
HOST_PORT=3001
NEXT_TELEMETRY_DISABLED=1
```

> **Important Build-Time Note:** `NEXT_PUBLIC_*` variables are evaluated and baked into JavaScript bundles at build time. When building the Docker image for different environments (e.g. Staging vs Production), supply the matching `NEXT_PUBLIC_API_BASE_URL` as a Docker build argument.

---

## 5. Building and Running with Docker Compose

### Step 1: Clone Repository

```bash
git clone https://github.com/aabdulrafay/healthdastaanadmin.git /opt/healthdastaan/admin
cd /opt/healthdastaan/admin
git checkout main
```

### Step 2: Build the Production Container

```bash
docker compose build --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.healthdastaan.com/v1
```

### Step 3: Launch Service in Detached Mode

```bash
docker compose up -d
```

### Step 4: Verify Container Status & Health Check

```bash
docker ps -f name=healthdastaan-admin
```

Expected status: `Up X minutes (healthy)`.

### Step 5: Test Endpoint

```bash
curl -I http://localhost:3001/api/health
# HTTP/1.1 200 OK
# Content-Type: application/json
```

---

## 6. Nginx Reverse Proxy & SSL/TLS Configuration

Install Nginx and Certbot for Let's Encrypt automated certificate management:

```bash
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx
```

### Nginx Site Configuration (`/etc/nginx/sites-available/admin.healthdastaan.com.conf`)

```nginx
# Rate Limiting Zone
limit_req_zone $binary_remote_addr zone=admin_limit:10m rate=20r/s;

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name admin.healthdastaan.com;
    return 301 https://$host$request_uri;
}

# HTTPS Server Block
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name admin.healthdastaan.com;

    # SSL Certificates (managed via Certbot)
    ssl_certificate /etc/letsencrypt/live/admin.healthdastaan.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.healthdastaan.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # Enterprise Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' https://api.healthdastaan.com;" always;

    # Reverse Proxy to Next.js Standalone Container
    location / {
        limit_req zone=admin_limit burst=30 nodelay;

        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
    }

    # Static Assets Caching
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3001/_next/static/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        expires 365d;
        access_log off;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Health Check Endpoint Bypass (No Rate Limiting)
    location /api/health {
        proxy_pass http://127.0.0.1:3001/api/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        access_log off;
    }
}
```

### Enable Site and Obtain Certificate

```bash
sudo ln -s /etc/nginx/sites-available/admin.healthdastaan.com.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d admin.healthdastaan.com
```

---

## 7. Staging Deployment Guidance

For staging or pre-production validation:

1. **Subdomain:** Deploy at `staging-admin.healthdastaan.com`.
2. **Backend API:** Connect to `https://staging-api.healthdastaan.com/v1`.
3. **Build Command:**
   ```bash
   docker compose -f docker-compose.yml build \
     --build-arg NEXT_PUBLIC_API_BASE_URL=https://staging-api.healthdastaan.com/v1
   ```
4. **Port Allocation:** Use `HOST_PORT=3002` if co-located on the same server as production.

---

## 8. Monitoring, Logs & Maintenance Runbook

### Inspect Container Logs

```bash
# View last 100 log lines with timestamp
docker logs --tail 100 -f healthdastaan-admin
```

### Restart Application

```bash
docker compose restart healthdastaan-admin
```

### Zero-Downtime Rolling Update Procedure

```bash
cd /opt/healthdastaan/admin
git pull origin main
docker compose build --pull
docker compose up -d --no-deps healthdastaan-admin
```

### Check Container Resource Utilization

```bash
docker stats healthdastaan-admin --no-stream
```

### Healthcheck Failure Recovery

If the container reports `unhealthy`:

1. Check internal health endpoint: `docker exec healthdastaan-admin wget -qO- http://localhost:3000/api/health`
2. Inspect server logs for memory exhaustion or uncaught exceptions: `docker logs --tail 50 healthdastaan-admin`
3. Verify backend connectivity from inside the container:
   `docker exec healthdastaan-admin wget -qO- http://backend:3000/health || true`
