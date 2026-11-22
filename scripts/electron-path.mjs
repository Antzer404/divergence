import electron from 'electron';
import { copyFile, stat } from 'node:fs/promises';
import path from 'node:path';
// A distinct dev executable name avoids machine-wide policies targeting electron.exe.
// Installed builds are already named Divergence.exe by electron-builder.
export async function electronPath() {
  if (process.platform !== 'win32') return electron;
  const named = path.join(path.dirname(electron), 'Divergence-dev.exe');
  const source = await stat(electron);
  const previous = await stat(named).catch(() => null);
  if (!previous || previous.size !== source.size || previous.mtimeMs < source.mtimeMs) await copyFile(electron, named);
  return named;
}
