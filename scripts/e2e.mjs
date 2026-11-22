import { _electron as electron, expect } from '@playwright/test';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { electronPath } from './electron-path.mjs';
const dir = await mkdtemp(path.join(os.tmpdir(), 'divergence-e2e-'));
await mkdir('test-results', { recursive: true });
const env = { ...process.env, DIVERGENCE_DATA_DIR: dir }; delete env.ELECTRON_RUN_AS_NODE;
let devServer;
if (process.argv.includes('--dev')) {
  const { createServer } = await import('vite');
  devServer = await createServer(); await devServer.listen();
  env.DIVERGENCE_DEV_URL = 'http://127.0.0.1:5173';
}
let requests = 0, tools = false;
const fixture = { intro: '本地集成测试返回：独立视角探索，不是实时调研。', questions: [], ideas: [{ title: '测试中的新方向', lens: '跨界借用', concept: '把不同机制转化为可以测试的小实验。', why: '先验证需求', steps: ['邀请两个人体验', '记录反馈'], experiment: '观察是否愿意再次体验', caveat: '这是测试模型', html: '<!doctype html><html><body style="background:#c6e4fa;padding:50px"><h1>TEST DEMO</h1><script>window.parent.hacked=true</script><img src="https://example.com/tracker"><p>完整的静态原型</p></body></html>' }] };
const server = createServer(async (req, res) => {
  const chunks = []; for await (const chunk of req) chunks.push(chunk);
  const body = JSON.parse(Buffer.concat(chunks).toString()); requests++;
  let message = { content: JSON.stringify(fixture) };
  if (body.messages.some(m => m.content?.includes('这轮只进行引导式提问'))) message = { content: JSON.stringify({ intro: '本地引导测试', questions: ['你最关心的约束是什么？'], ideas: [] }) };
  if (tools && body.tools?.length && !body.messages.some(m => m.role === 'tool')) message = { content: null, tool_calls: [{ id: 'call_test', type: 'function', function: { name: body.tools[0].function.name, arguments: '{"text":"integration"}' } }] };
  res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ choices: [{ message, finish_reason: 'stop' }] }));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
let app;
const errors = [];
async function launch() {
  app = await electron.launch({ executablePath: process.env.DIVERGENCE_TEST_EXECUTABLE || await electronPath(), args: process.env.DIVERGENCE_TEST_EXECUTABLE ? [] : ['.'], env });
  const page = await app.firstWindow(); page.on('pageerror', e => errors.push(e.message));
  await expect(page.getByRole('button', { name: '开启新的探索' })).toBeVisible();
  return page;
}
try {
  let page = await launch();
  await page.screenshot({ path: 'test-results/welcome.png' });
  await page.getByRole('button', { name: /让风格有点不同/ }).click();
  await page.getByRole('button', { name: '开始探索', exact: true }).click();
  await expect(page.getByText('3 个方向，都值得探索')).toBeVisible();
  await page.getByRole('button', { name: '收藏点子', exact: true }).first().click();
  await page.getByRole('button', { name: /灵感收藏/ }).click();
  await expect(page.locator('.saved-page .idea-card')).toHaveCount(1);
  await page.getByRole('button', { name: /探索空间/ }).click();
  await page.getByRole('button', { name: /打开完整 demo/ }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({ path: 'test-results/demo.png' });
  const exportPath = path.join(dir, 'export.html');
  await app.evaluate(({ dialog }, filePath) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath }); }, exportPath);
  await page.getByRole('button', { name: '导出 HTML', exact: true }).click();
  await expect.poll(async () => (await readFile(exportPath, 'utf8')).includes('<!doctype html>')).toBe(true);
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await page.getByRole('button', { name: '偏好设置', exact: true }).click();
  await page.getByRole('button', { name: '技能', exact: true }).click();
  await expect(page.getByText('creative-coach', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '关闭', exact: true }).last().click();
  const baseUrl = `http://127.0.0.1:${server.address().port}/v1`;
  await page.evaluate(async ({ baseUrl }) => { const boot = await window.divergence.boot(); await window.divergence.saveSettings({ ...boot.settings, demo: false, baseUrl, model: 'test-model', mode: 'quick' }, 'e2e-private-key'); }, { baseUrl });
  await app.close(); page = await launch();
  await app.evaluate(({ dialog }, filePath) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath }); }, exportPath);
  const stateText = await readFile(path.join(dir, 'state.json'), 'utf8');
  expect(stateText).not.toContain('e2e-private-key');
  expect(JSON.parse(stateText).encryptedKey).toBeTruthy();
  await page.getByRole('button', { name: /灵感收藏/ }).click();
  await expect(page.locator('.saved-page .idea-card')).toHaveCount(1);
  await page.getByRole('button', { name: /开启新的探索/ }).click();
  await page.getByRole('textbox', { name: '描述你想探索的问题' }).fill('给我网站风格');
  await page.getByRole('button', { name: '开始探索', exact: true }).click();
  await expect(page.getByText('测试中的新方向', { exact: true })).toBeVisible();
  expect(requests).toBe(1);
  await page.getByRole('button', { name: /打开完整 demo/ }).click();
  await expect(page.frameLocator('.full-preview').getByText('TEST DEMO')).toBeVisible();
  expect(await page.evaluate(() => window.hacked)).toBeUndefined();
  await page.getByRole('button', { name: '导出 HTML', exact: true }).click();
  await expect.poll(async () => { const html = await readFile(exportPath, 'utf8'); return html.includes('TEST DEMO') && !html.includes('<script') && !html.includes('https://example.com'); }).toBe(true);
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await page.getByRole('button', { name: '先问再想', exact: true }).click();
  await page.getByRole('textbox', { name: '描述你想探索的问题' }).fill('员工缺少热情');
  await page.getByRole('button', { name: '开始探索', exact: true }).click();
  await expect(page.locator('.questions p').filter({ hasText: '你最关心的约束是什么？' })).toBeVisible();
  await page.getByRole('button', { name: '填写我的回答' }).click();
  await expect(page.getByRole('textbox', { name: '描述你想探索的问题' })).toHaveValue(/我的回答/);
  // Real stdio integration through main process + renderer approval dialog.
  tools = true;
  await page.evaluate(async ({ node, script }) => { const boot = await window.divergence.boot(); await window.divergence.saveSettings({ ...boot.settings, mcpServers: JSON.stringify({ mcpServers: { fixture: { enabled: true, command: node, args: [script] } } }) }); }, { node: process.execPath, script: path.resolve('tests/fixtures/mcp-server.mjs') });
  await page.getByRole('textbox', { name: '描述你想探索的问题' }).fill('使用工具查找参考');
  await page.getByRole('button', { name: '开始探索', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '允许这次工具调用？' })).toBeVisible();
  await page.getByRole('button', { name: '允许这一次', exact: true }).click();
  await expect(page.getByRole('button', { name: '停止探索', exact: true })).toHaveCount(0);
  await page.screenshot({ path: 'test-results/chat.png' });
  // Cancellation: run a local demo with enough delay to interrupt.
  await page.evaluate(async () => { const boot = await window.divergence.boot(); await window.divergence.saveSettings({ ...boot.settings, demo: true }); });
  await page.getByRole('textbox', { name: '描述你想探索的问题' }).fill('停止测试');
  await page.getByRole('button', { name: '开始探索', exact: true }).click();
  await page.getByRole('button', { name: '停止探索', exact: true }).click();
  await expect(page.getByText('探索已停止。你可以调整方向后继续。', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  console.log('PASS: desktop launch, demos, bookmarks, HTML export, sandbox, settings, encrypted key restart, live provider, clarification, MCP consent, cancellation.');
} finally {
  if (app) await app.close().catch(() => {});
  await devServer?.close();
  await new Promise(r => server.close(r));
  await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
}
