import fs from 'node:fs';
import path from 'node:path';

if (process.env.VERCEL) {
  process.exit(0);
}

const root = process.cwd();
const srcStatic = path.join(root, '.next', 'static');
const destStatic = path.join(root, '.next', 'standalone', '.next', 'static');
const srcPublic = path.join(root, 'public');
const destPublic = path.join(root, '.next', 'standalone', 'public');

try {
  if (fs.existsSync(srcStatic)) {
    fs.mkdirSync(path.dirname(destStatic), { recursive: true });
    fs.cpSync(srcStatic, destStatic, { recursive: true });
    console.log('[standalone] Successfully copied .next/static to .next/standalone/.next/static');
  }

  if (fs.existsSync(srcPublic)) {
    fs.cpSync(srcPublic, destPublic, { recursive: true });
    console.log('[standalone] Successfully copied public to .next/standalone/public');
  }
} catch (err) {
  console.warn('[standalone] Warning while copying standalone static assets:', err);
}
