import electron from 'electron';
import { cp, mkdir, access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
// Keep the original executable name so Electron recognizes development mode.
// A normal user cache avoids workspace ACLs interfering with Chromium's sandbox.
export async function electronPath() {
  if (process.platform !== 'win32') return electron;
  const version = (await readFile(path.join(path.dirname(electron), 'version'), 'utf8')).trim();
  const destination = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'Divergence-runtime', version);
  const executable = path.join(destination, 'electron.exe');
  try { await access(path.join(destination, '.ready')); await access(executable); return executable; } catch { /* First launch for this version. */ }
  await mkdir(destination, { recursive: true });
  await cp(path.dirname(electron), destination, { recursive: true });
  await writeFile(path.join(destination, '.ready'), version);
  return executable;
}
