import { execSync } from 'child_process';
import { cpSync, rmSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const bin = join(root, 'node_modules', '.bin');
const pathSep = process.platform === 'win32' ? ';' : ':';
const env = { ...process.env, PATH: `${bin}${pathSep}${process.env.PATH ?? ''}` };

function run(cmd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: root, env });
}

// 1. Turkish (source locale) production build
run('ng build --configuration production');

// 2. English production build to a temp directory
run('ng build --configuration production,en --output-path dist/en-temp');

// 3. Copy English browser output into the Turkish browser tree at /en/
// Angular's application builder puts each localized build in browser/{locale}/,
// so the English files are at en-temp/browser/en/ — not directly in en-temp/browser/.
const enSrc = join(root, 'dist', 'en-temp', 'browser', 'en');
const enDst = join(root, 'dist', 'crypto-dashboard-frontend', 'browser', 'en');

if (!existsSync(enSrc)) {
  console.error(`English build output not found at ${enSrc}`);
  console.error('Contents of dist/en-temp:', readdirSync(join(root, 'dist', 'en-temp'), { recursive: true }).join('\n'));
  process.exit(1);
}

cpSync(enSrc, enDst, { recursive: true });

// 4. Remove temp directory
rmSync(join(root, 'dist', 'en-temp'), { recursive: true, force: true });

console.log('\nBuild complete.');
console.log('  Turkish → dist/crypto-dashboard-frontend/browser/');
console.log('  English → dist/crypto-dashboard-frontend/browser/en/');
