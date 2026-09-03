// Render's static host has no SPA fallback: it looks for a real file at the
// requested path and returns "Not Found" if there isn't one. So after the Vite
// build we materialise the shell at every client-side route — /dashboard
// becomes dist/dashboard/index.html, which Render serves as a directory index.
//
// Routes are read straight out of src/main.tsx so this stays in sync when a
// <Route> is added or removed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const shell = path.join(dist, 'index.html');

if (!fs.existsSync(shell)) {
  console.error('[spa-fallback] dist/index.html not found — run vite build first');
  process.exit(1);
}

const source = fs.readFileSync(path.join(root, 'src', 'main.tsx'), 'utf8');
const declared = [...source.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]);

// ':id' segments can't be enumerated at build time, and '/' is index.html already.
const staticRoutes = declared.filter((r) => r !== '/' && !r.includes(':') && !r.includes('*'));
const dynamicRoutes = declared.filter((r) => r.includes(':'));

const html = fs.readFileSync(shell);

for (const route of staticRoutes) {
  const target = path.join(dist, route, 'index.html');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html);
  console.log(`[spa-fallback] ${route} -> dist${route}/index.html`);
}

// Catch-all for the dynamic routes above, which have no fixed path to write to.
fs.writeFileSync(path.join(dist, '404.html'), html);
console.log('[spa-fallback] 404.html -> shell (covers ' + (dynamicRoutes.join(', ') || 'none') + ')');

if (!staticRoutes.length) {
  console.warn('[spa-fallback] no static routes parsed from main.tsx — check the <Route> syntax');
}
