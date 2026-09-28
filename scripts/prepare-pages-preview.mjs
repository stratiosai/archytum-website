import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve('dist');
const base = process.env.ARCHYTUM_DEPLOY_BASE;

if (!base || !/^\/[a-z0-9][a-z0-9-]*$/i.test(base)) {
  throw new Error('ARCHYTUM_DEPLOY_BASE must be a safe single path segment such as /archytum-website.');
}

let updated = 0;

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(path);
      continue;
    }
    if (!entry.name.endsWith('.html')) continue;

    const before = readFileSync(path, 'utf8');
    const after = before.replace(
      /\b(href|src|action)="\/(?!\/|archytum-website(?:\/|"))/gi,
      `$1="${base}/`,
    ).replace(
      /\b(href|src|action)="\/("|#)/gi,
      `$1="${base}/$2`,
    );

    if (after !== before) {
      writeFileSync(path, after);
      updated += 1;
    }
  }
}

walk(root);
console.log(`Prepared ${updated} HTML files for the GitHub Pages preview base ${base}.`);
