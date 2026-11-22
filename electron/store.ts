import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { defaults, settingsSchema, type Settings, type Conversation } from '../src/core/types';
export interface State { settings: Settings; conversations: Conversation[]; encryptedKey?: string }
export class Store {
  state: State = { settings: defaults, conversations: [] };
  private queue = Promise.resolve();
  constructor(readonly dir: string) {}
  async load() {
    await mkdir(this.dir, { recursive: true });
    try {
      const raw = JSON.parse(await readFile(path.join(this.dir, 'state.json'), 'utf8'));
      const schema = z.object({ settings: settingsSchema, conversations: z.array(z.object({ id: z.string(), title: z.string(), messages: z.array(z.any()), updatedAt: z.number() })), encryptedKey: z.string().optional() });
      this.state = schema.parse(raw);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
        // Never overwrite malformed state: preserve a recovery copy before starting fresh.
        await rename(path.join(this.dir, 'state.json'), path.join(this.dir, `state-recovery-${Date.now()}.json`));
      }
    }
  }
  save() {
    const snapshot = JSON.stringify(this.state, null, 2);
    const action = this.queue.then(async () => {
      const temp = path.join(this.dir, 'state.tmp');
      await writeFile(temp, snapshot, 'utf8');
      await rename(temp, path.join(this.dir, 'state.json'));
    });
    this.queue = action.catch(() => {});
    return action;
  }
}
