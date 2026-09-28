import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const root = resolve('dist');
const htmlFiles = [];

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.name.endsWith('.html')) htmlFiles.push(path);
  }
}

walk(root);
const failures = [];
let references = 0;

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const is404 = file.endsWith('/404.html');

  if (!is404) {
    const checks = [
      ['title', /<title>[^<]+<\/title>/i],
      ['description', /<meta\s+name="description"\s+content="[^"]+"/i],
      ['canonical', /<link\s+rel="canonical"\s+href="[^"]+"/i],
      ['Open Graph title', /<meta\s+property="og:title"\s+content="[^"]+"/i],
      ['Open Graph description', /<meta\s+property="og:description"\s+content="[^"]+"/i],
      ['Open Graph image', /<meta\s+property="og:image"\s+content="[^"]+"/i],
      ['single h1', /^((?!<h1[\s>]).)*<h1[\s>][\s\S]*?<\/h1>((?!<h1[\s>]).)*$/i],
      ['main landmark', /<main[\s>][\s\S]*?<\/main>/i],
    ];
    for (const [name, pattern] of checks) {
      if (!pattern.test(html)) failures.push(`${file}: missing or invalid ${name}`);
    }
  }

  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/gi)) {
    const value = match[1];
    if (/^(?:#|mailto:|tel:|data:|https?:|\/\/)/i.test(value)) continue;
    references += 1;
    const clean = decodeURIComponent(value.split(/[?#]/)[0]);
    if (!clean) continue;
    const target = clean.startsWith('/')
      ? resolve(root, clean.slice(1))
      : resolve(file, '..', clean);
    const candidates = [target];
    if (!extname(target)) candidates.push(join(target, 'index.html'), `${target}.html`);
    if (!candidates.some(existsSync)) failures.push(`${file}: broken reference ${value}`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Validated ${htmlFiles.length} HTML files and ${references} relative references.`);
