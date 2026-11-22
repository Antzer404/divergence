import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../electron/store';
const dirs: string[] = [];
async function temp() { const dir = await mkdtemp(path.join(os.tmpdir(), 'divergence-test-')); dirs.push(dir); return dir; }
afterEach(async () => { await Promise.all(dirs.splice(0).map(dir => rm(dir, { recursive: true, force: true }))); });
describe('local storage', () => {
  it('serializes concurrent writes atomically and round trips data', async () => {
    const store = new Store(await temp()); await store.load();
    store.state.settings.model = 'first'; const a = store.save();
    store.state.settings.model = 'last'; const b = store.save(); await Promise.all([a, b]);
    const next = new Store(store.dir); await next.load();
    expect(next.state.settings.model).toBe('last'); expect(await readdir(store.dir)).toEqual(['state.json']);
  });
  it('preserves corrupt state for recovery', async () => {
    const dir = await temp(); await writeFile(path.join(dir, 'state.json'), '{corrupt');
    const store = new Store(dir); await store.load();
    const recovery = (await readdir(dir)).find(f => f.startsWith('state-recovery-'))!;
    expect(await readFile(path.join(dir, recovery), 'utf8')).toBe('{corrupt');
    expect(store.state.conversations).toEqual([]);
  });
});
