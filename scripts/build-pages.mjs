// Builds the static (backend-free) client and copies it into ./docs so it can
// be served by GitHub Pages from the /docs folder. Cross-platform.
import { execSync } from 'node:child_process';
import { cpSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'client', 'dist');
const docs = join(root, 'docs');

console.log('▶ Building static client (VITE_STATIC=true)…');
execSync('npm --prefix client run build', {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, VITE_STATIC: 'true' },
});

console.log('▶ Copying build into docs/ (keeping screenshots + .nojekyll)…');
if (!existsSync(docs)) mkdirSync(docs);
rmSync(join(docs, 'assets'), { recursive: true, force: true });
rmSync(join(docs, 'index.html'), { force: true });
rmSync(join(docs, 'favicon.svg'), { force: true });
cpSync(join(dist, 'index.html'), join(docs, 'index.html'));
cpSync(join(dist, 'assets'), join(docs, 'assets'), { recursive: true });
if (existsSync(join(dist, 'favicon.svg'))) cpSync(join(dist, 'favicon.svg'), join(docs, 'favicon.svg'));

console.log('✅ docs/ updated. Commit & push to publish to GitHub Pages.');
