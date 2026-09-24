// Collects the three Vite builds into a single `dist/` folder for Netlify:
//   dist/        <- launcher (game menu)
//   dist/cah/    <- Cards Against Humanity client
//   dist/sh/     <- Secret Hitler client
import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'dist');

const parts = [
  { from: 'launcher/dist', to: '' },
  { from: 'Cards-against-humanity/client/dist', to: 'cah' },
  { from: 'SH/client/dist', to: 'sh' },
];

rmSync(out, { recursive: true, force: true });

for (const { from, to } of parts) {
  const src = resolve(root, from);
  if (!existsSync(src)) {
    console.error(`[assemble] Missing build output: ${from}`);
    process.exit(1);
  }
  cpSync(src, resolve(out, to), { recursive: true });
  console.log(`[assemble] ${from} -> dist/${to}`);
}
