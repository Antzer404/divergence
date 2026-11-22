import { app, BrowserWindow, ipcMain, dialog, shell, safeStorage, Menu } from 'electron';
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Store } from './store';
import { listSkills, importSkill } from './skills';
import { connectMcp, parseMcp } from './mcp';
import { settingsSchema, type RunEvent, type RunInput } from '../src/core/types';
import { generate } from '../src/core/engine';
import { chat, endpoint } from '../src/core/provider';
import { demoResponse } from '../src/core/demo';

if (process.env.DIVERGENCE_DATA_DIR) app.setPath('userData', process.env.DIVERGENCE_DATA_DIR);
const runs = new Map<string, AbortController>();
const approvals = new Map<string, (allow: boolean) => void>();
let win: BrowserWindow;
let store: Store;
let memoryKey = '';
const RELEASES = 'https://github.com/Antzer404/divergence/releases';
const bundledSkills = app.isPackaged ? path.join(process.resourcesPath, 'skills') : path.join(app.getAppPath(), 'skills');
const userSkills = () => path.join(app.getPath('userData'), 'skills');
function emit(event: RunEvent) { if (win && !win.isDestroyed()) win.webContents.send('run-event', event); }
function handle(channel: string, fn: (...args: any[]) => unknown) {
  ipcMain.handle(channel, (event, ...args) => {
    if (event.sender !== win.webContents || event.senderFrame !== win.webContents.mainFrame) throw new Error('Unauthorized IPC');
    return fn(...args);
  });
}
async function getKey() {
  if (memoryKey) return memoryKey;
  if (!store.state.encryptedKey) return '';
  try { return (await safeStorage.decryptStringAsync(Buffer.from(store.state.encryptedKey, 'base64'))).result; }
  catch { throw new Error('无法解密 API Key，请在设置中重新保存'); }
}
function setupIpc() {
  handle('boot', async () => ({ settings: store.state.settings, hasKey: Boolean(memoryKey || store.state.encryptedKey), conversations: store.state.conversations, skills: await listSkills(bundledSkills, userSkills()), version: app.getVersion() }));
  handle('settings-save', async (raw, rawKey) => {
    const settings = settingsSchema.parse(raw); endpoint(settings.baseUrl); parseMcp(settings.mcpServers);
    if (runs.size) throw new Error('请等待当前探索完成，或先停止探索后修改设置');
    const key = z.string().max(16000).optional().parse(rawKey);
    if (key !== undefined) {
      if (key && !await safeStorage.isAsyncEncryptionAvailable()) throw new Error('系统安全存储暂不可用，无法保存 API Key');
      store.state.encryptedKey = key ? (await safeStorage.encryptStringAsync(key)).toString('base64') : undefined;
      memoryKey = key;
    }
    store.state.settings = settings;
    await store.save();
  });
  handle('connection-test', async (raw, rawKey) => {
    const settings = settingsSchema.parse(raw);
    const key = z.string().max(16000).optional().parse(rawKey) ?? await getKey();
    await chat(settings, key, [{ role: 'user', content: 'Reply with OK.' }], AbortSignal.timeout(25000));
    return '连接成功，模型已响应。';
  });
  handle('run', async (raw) => {
    const input = z.object({ conversationId: z.string().uuid(), prompt: z.string().trim().min(1).max(30000), mode: z.enum(['quick', 'deep']), clarify: z.boolean(), selectedSkillIds: z.array(z.string()).max(100) }).parse(raw) as RunInput;
    if (runs.size) throw new Error('已有探索正在进行，请先等待或停止');
    const controller = new AbortController(); runs.set(input.conversationId, controller);
    let conversation = store.state.conversations.find(c => c.id === input.conversationId);
    if (!conversation) {
      conversation = { id: input.conversationId, title: input.prompt.slice(0, 36), messages: [], updatedAt: Date.now() };
      store.state.conversations.unshift(conversation);
    }
    conversation.messages.push({ id: randomUUID(), role: 'user', text: input.prompt, createdAt: Date.now() });
    conversation.updatedAt = Date.now();
    try { await store.save(); } catch (e) { runs.delete(input.conversationId); throw e; }
    // Start asynchronously, so cancellation and tool decisions remain available.
    void (async () => {
      let bridge: Awaited<ReturnType<typeof connectMcp>> | undefined;
      try {
        const settings = structuredClone(store.state.settings);
        let result;
        if (settings.demo) {
          emit({ type: 'status', conversationId: input.conversationId, text: '正在展开内置体验示例…' });
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(resolve, 450);
            controller.signal.addEventListener('abort', () => { clearTimeout(timer); reject(new Error('已停止')); }, { once: true });
          });
          result = demoResponse(input);
        } else {
          const key = await getKey();
          if (Object.values(parseMcp(settings.mcpServers).mcpServers).some(s => s.enabled)) {
            emit({ type: 'status', conversationId: input.conversationId, text: '正在连接已启用的 MCP 插件…' });
            bridge = await connectMcp(settings.mcpServers, (server, name, args, signal) => new Promise(resolve => {
              const id = randomUUID();
              const finish = (allow: boolean) => { approvals.delete(id); signal.removeEventListener('abort', abort); resolve(allow); };
              const abort = () => finish(false);
              approvals.set(id, finish); signal.addEventListener('abort', abort, { once: true });
              emit({ type: 'approval', conversationId: input.conversationId, approval: { id, server, name, args } });
            }), controller.signal);
          }
          result = await generate(input, conversation!.messages, settings, key, await listSkills(bundledSkills, userSkills()), controller.signal, emit, bridge);
        }
        controller.signal.throwIfAborted();
        conversation!.messages.push({ id: randomUUID(), role: 'assistant', text: result.intro, result, createdAt: Date.now() });
        await store.save();
        emit({ type: 'result', conversationId: input.conversationId, result });
      } catch (e) {
        const text = controller.signal.aborted ? '探索已停止。你可以调整方向后继续。' : e instanceof Error ? e.message : '探索失败，请重试';
        conversation!.messages.push({ id: randomUUID(), role: 'assistant', text, error: true, createdAt: Date.now() });
        await store.save().catch(() => {});
        emit({ type: 'error', conversationId: input.conversationId, text });
      } finally {
        await bridge?.close(); runs.delete(input.conversationId);
        emit({ type: 'done', conversationId: input.conversationId });
      }
    })();
  });
  handle('cancel', (id) => { runs.get(z.string().parse(id))?.abort(); });
  handle('approve', (id, allow) => { approvals.get(z.string().parse(id))?.(z.boolean().parse(allow)); });
  handle('conversation-delete', async (id) => {
    z.string().uuid().parse(id);
    if (runs.has(id)) throw new Error('请先停止当前探索');
    store.state.conversations = store.state.conversations.filter(c => c.id !== id); await store.save();
  });
  handle('skill-import', async () => {
    const picked = await dialog.showOpenDialog(win, { title: '选择包含 SKILL.md 的技能文件夹', properties: ['openDirectory'] });
    if (picked.canceled) return null;
    return importSkill(picked.filePaths[0], userSkills());
  });
  handle('skills-open', () => shell.openPath(userSkills()));
  handle('mcp-test', async (config) => {
    z.string().max(100000).parse(config);
    const bridge = await connectMcp(config, async () => false, AbortSignal.timeout(25000));
    await bridge.close(); return bridge.summary;
  });
  handle('export', async (name, content) => {
    z.string().max(200).parse(name); z.string().max(2_000_000).parse(content);
    const result = await dialog.showSaveDialog(win, { defaultPath: path.basename(name), filters: [{ name: name.endsWith('.html') ? 'HTML' : 'Markdown', extensions: [name.endsWith('.html') ? 'html' : 'md'] }] });
    if (result.canceled || !result.filePath) return false;
    await writeFile(result.filePath, content, 'utf8'); return true;
  });
  handle('external', async (raw) => {
    const url = new URL(z.string().max(4000).parse(raw));
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('不支持的链接');
    await shell.openExternal(url.toString());
  });
  handle('update-check', async () => {
    const res = await fetch('https://api.github.com/repos/Antzer404/divergence/releases/latest', { headers: { Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(res.status === 404 ? '还没有正式 Release' : '暂时无法连接 GitHub');
    const release = await res.json();
    const version = String(release.tag_name).replace(/^v/, '');
    const parts = (v: string) => v.split('.').map(Number);
    const a = parts(version), b = parts(app.getVersion());
    const newer = a.some((n, i) => n > (b[i] || 0) && a.slice(0, i).every((p, j) => p === b[j]));
    return { version, url: `${RELEASES}/latest`, newer };
  });
}
async function createWindow() {
  win = new BrowserWindow({ width: 1440, height: 940, minWidth: 960, minHeight: 680, title: 'Divergence', backgroundColor: '#f8f9fb', icon: path.join(app.getAppPath(), 'assets/icon.png'), webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, webviewTag: false } });
  Menu.setApplicationMenu(null);
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', event => event.preventDefault());
  if (!app.isPackaged && process.env.DIVERGENCE_DEV_URL) await win.loadURL(process.env.DIVERGENCE_DEV_URL);
  else await win.loadFile(path.join(app.getAppPath(), 'dist/index.html'));
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(async () => { store = new Store(app.getPath('userData')); await store.load(); setupIpc(); await createWindow(); });
  app.on('window-all-closed', () => { for (const run of runs.values()) run.abort(); if (process.platform !== 'darwin') app.quit(); });
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) void createWindow(); });
}
