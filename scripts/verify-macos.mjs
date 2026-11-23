import assert from 'node:assert/strict';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

assert.equal(process.platform, 'darwin', 'Run macOS bundle verification on macOS.');
const arch = process.env.MAC_ARCH || process.arch;
assert.ok(['arm64', 'x64'].includes(arch), `Unsupported macOS architecture: ${arch}`);
const { version, build } = JSON.parse(await readFile('package.json', 'utf8'));
const app = path.resolve('release', arch === 'arm64' ? 'mac-arm64' : 'mac', 'Divergence.app');
const contents = path.join(app, 'Contents');
const resources = path.join(contents, 'Resources');
const plist = path.join(contents, 'Info.plist');
const plistValue = key => execFileSync('/usr/libexec/PlistBuddy', ['-c', `Print :${key}`, plist], { encoding: 'utf8' }).trim();

assert.equal(plistValue('CFBundleIdentifier'), build.appId);
assert.equal(plistValue('CFBundleShortVersionString'), version);
const binary = path.join(contents, 'MacOS', plistValue('CFBundleExecutable'));
const binaryArch = execFileSync('lipo', ['-archs', binary], { encoding: 'utf8' }).trim();
assert.equal(binaryArch, arch === 'x64' ? 'x86_64' : 'arm64');
execFileSync('codesign', ['--verify', '--deep', '--strict', '--verbose=2', app], { stdio: 'inherit' });
const inspect = spawnSync('codesign', ['-d', '--verbose=4', '--entitlements', ':-', app], { encoding: 'utf8' });
assert.equal(inspect.status, 0, inspect.stderr);
const details = `${inspect.stdout}\n${inspect.stderr}`;
assert.match(details, /Signature=adhoc/);
assert.match(details, /flags=.*runtime/);
assert.match(details, /<key>com\.apple\.security\.cs\.allow-jit<\/key>\s*<true\s*\/>/);
assert.match(details, /<key>com\.apple\.security\.cs\.disable-library-validation<\/key>\s*<true\s*\/>/);

const icon = plistValue('CFBundleIconFile');
await access(path.join(resources, icon.endsWith('.icns') ? icon : `${icon}.icns`));
await access(path.join(resources, 'skills', 'creative-coach', 'SKILL.md'));
await access(path.join(resources, 'skills', 'website-directions', 'SKILL.md'));
const require = createRequire(import.meta.url);
const asar = require('@electron/asar');
const archive = path.join(resources, 'app.asar');
for (const file of ['dist/index.html', 'dist-electron/main.cjs', 'dist-electron/preload.cjs', 'assets/licenses/Inter.txt', 'assets/licenses/Noto-Sans-SC.txt']) {
  assert.ok(asar.statFile(archive, file).size > 0, `Missing packaged file: ${file}`);
}
assert.ok(asar.listPackage(archive).some(file => /dist\/assets\/.*\.woff2$/.test(file)), 'Packaged fonts must be present.');

const dmg = path.resolve('release', `Divergence-${version}-mac-${arch}.dmg`);
const zip = path.resolve('release', `Divergence-${version}-mac-${arch}.zip`);
await access(dmg); await access(zip);
execFileSync('hdiutil', ['verify', dmg], { stdio: 'inherit' });
await mkdir('test-results', { recursive: true });
await writeFile(`test-results/mac-build-${arch}.json`, JSON.stringify({
  version, architecture: binaryArch, signature: 'ad-hoc', hardenedRuntime: true,
  notarized: false, verified: ['bundle metadata', 'CPU architecture', 'deep signature', 'JIT entitlements', 'icon', 'built-in skills', 'application archive', 'fonts', 'DMG integrity'],
  runtimeAcceptance: 'Functionality accepted by the user on all distributed platforms before v1.0.0; this report verifies the rebuilt package only',
}, null, 2));
console.log(`PASS: macOS ${arch} archive, architecture, ad-hoc signature, resources and DMG. User runtime acceptance is recorded separately.`);
