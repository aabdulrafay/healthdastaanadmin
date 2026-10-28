import { test, expect } from '@playwright/test';

const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'superadmin@healthdastaan.com';
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'ChangeMe@HealthDastaan2026!';

test.describe('HealthDastaan Admin Smoke Suite', () => {
  test('API health check endpoint returns 200 OK', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('healthdastaan-admin');
  });

  test('Login page renders with clinical branding and form controls', async ({ page }) => {
    await page.goto('/login');

    await expect(page).toHaveTitle(/HealthDastaan Admin/i);
    await expect(page.getByText('HealthDastaan', { exact: true })).toBeVisible();
    await expect(page.getByText('Clinical Administration Portal')).toBeVisible();

    await expect(page.getByLabel(/Administrator Email/i)).toBeVisible();
    await expect(page.getByLabel(/Security Password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign In to Console/i })).toBeVisible();
  });

  test('Protected routes reject unauthenticated users and redirect to login', async ({ page }) => {
    // Attempting to access protected users page directly
    await page.goto('/users');

    // Should redirect to /login
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('button', { name: /Sign In to Console/i })).toBeVisible();
  });

  test('Authenticates and loads the clinical command dashboard shell', async ({ page }) => {
    await page.goto('/login');

    // Fill development test admin credentials
    await page.getByLabel(/Administrator Email/i).fill(TEST_ADMIN_EMAIL);
    await page.getByLabel(/Security Password/i).fill(TEST_ADMIN_PASSWORD);
    await page.getByRole('button', { name: /Sign In to Console/i }).click();

    // Verify redirected to Dashboard
    await expect(page).toHaveURL(/\/(#.*)?$/);
    await expect(page.getByText(/Clinical Mesh: Operational/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Total Registered Users')).toBeVisible();
    await expect(page.getByText('Pending Doctor Verifications')).toBeVisible();

    // Verify Sidebar Navigation is present
    await expect(page.getByRole('link', { name: 'User Management' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Practitioner Verification/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Feature Flags & APIs' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Audit Logs' })).toBeVisible();
  });

  test('Navigation to modules renders appropriate views', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel(/Administrator Email/i).fill(TEST_ADMIN_EMAIL);
    await page.getByLabel(/Security Password/i).fill(TEST_ADMIN_PASSWORD);
    await page.getByRole('button', { name: /Sign In to Console/i }).click();
    await expect(page.getByText(/Clinical Mesh: Operational/i)).toBeVisible({ timeout: 10000 });

    // Navigate to User Management
    await page.getByRole('link', { name: 'User Management' }).click();
    await expect(page).toHaveURL(/\/users/);
    await expect(page.getByText('User Directory & Session Governance')).toBeVisible();

    // Navigate to Feature Flags & APIs
    await page.getByRole('link', { name: 'Feature Flags & APIs' }).click();
    await expect(page).toHaveURL(/\/feature-flags/);
    await expect(page.getByText('Feature Flags & API Endpoint Control')).toBeVisible();
  });
});
