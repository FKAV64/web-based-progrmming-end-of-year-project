import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const includeExtensions = new Set([
  '.ts',
  '.html',
  '.css',
  '.scss',
  '.js',
  '.json',
  '.md',
]);

const ignoreNames = new Set([
  '.angular',
  'coverage',
  'dist',
  'node_modules',
]);

const rootsToScan = [
  path.join(rootDir, 'src'),
  path.join(rootDir, 'scripts'),
];

const rootFiles = [
  'angular.json',
  'jest.config.js',
  'package.json',
  'playwright.config.ts',
  'setup-jest.ts',
  'tailwind.config.js',
  'tsconfig.app.json',
  'tsconfig.e2e.json',
  'tsconfig.json',
  'tsconfig.spec.json',
  'vercel.json',
];

function collectFiles(dir, acc) {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoreNames.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      collectFiles(fullPath, acc);
      continue;
    }

    if (includeExtensions.has(path.extname(entry.name))) {
      acc.push(fullPath);
    }
  }
}

function normalizeFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  const eol = original.includes('\r\n') ? '\r\n' : '\n';

  let normalized = original.replace(/\r?\n/g, '\n');
  normalized = normalized.replace(/[ \t]+$/gm, '');
  normalized = normalized.replace(/\n*$/, '\n');
  normalized = normalized.replace(/\n/g, eol);

  if (normalized === original) {
    return false;
  }

  fs.writeFileSync(filePath, normalized, 'utf8');
  return true;
}

const files = [];
for (const dir of rootsToScan) {
  collectFiles(dir, files);
}

for (const fileName of rootFiles) {
  const fullPath = path.join(rootDir, fileName);
  if (fs.existsSync(fullPath)) {
    files.push(fullPath);
  }
}

let changedCount = 0;
for (const filePath of files) {
  if (normalizeFile(filePath)) {
    changedCount += 1;
  }
}

console.log(`Normalized ${changedCount} frontend file(s).`);
