import { createServer, type Server, type RequestListener } from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { chat, endpoint } from '../src/core/provider';
import { defaults } from '../src/core/types';
let server: Server;
afterEach(async () => { vi.restoreAllMocks(); if (server) await new Promise<void>(r => server.close(() => r())); });
async function local(handler: RequestListener) {
  server = createServer(handler); await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  return `http://127.0.0.1:${(server.address() as { port: number }).port}/v1`;
}
describe('OpenAI compatible provider', () => {
  it('uses the current DeepSeek model and disables default thinking without changing generic providers', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ choices: [{ message: { content: 'OK' } }] }), { headers: { 'Content-Type': 'application/json' } }));
    await chat(defaults, 'test-key', [], new AbortController().signal);
    const body = JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
    expect(body.model).toBe('deepseek-flash'); expect(body.thinking).toEqual({ type: 'disabled' });
    await chat({ ...defaults, baseUrl: 'http://localhost:11434/v1' }, '', [], new AbortController().signal);
    expect(JSON.parse(fetchMock.mock.calls[1][1]!.body as string).thinking).toBeUndefined();
  });
  it('uses the configured endpoint, auth and optional temperature', async () => {
    let body: any; let auth; let url;
    const baseUrl = await local(async (req, res) => { const chunks = []; for await (const chunk of req) chunks.push(chunk); body = JSON.parse(Buffer.concat(chunks).toString()); auth = req.headers.authorization; url = req.url; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ choices: [{ message: { content: 'OK' } }] })); });
    const out = await chat({ ...defaults, baseUrl, useTemperature: false }, 'test-only-key', [{ role: 'user', content: 'hello' }], new AbortController().signal);
    expect(out.content).toBe('OK'); expect(auth).toBe('Bearer test-only-key'); expect(url).toBe('/v1/chat/completions'); expect(body.temperature).toBeUndefined();
  });
  it('redacts remote error bodies rather than exposing credentials', async () => {
    const baseUrl = await local((_req, res) => { res.statusCode = 401; res.end('secret-reflected-key'); });
    await expect(chat({ ...defaults, baseUrl }, 'key', [], new AbortController().signal)).rejects.toThrow('API Key 无效');
  });
  it('blocks credential-bearing or insecure nonlocal URLs', () => {
    expect(() => endpoint('http://remote.example/v1')).toThrow();
    expect(() => endpoint('https://user:pass@example.com/v1')).toThrow();
    expect(endpoint('http://localhost:11434/v1/')).toBe('http://localhost:11434/v1/chat/completions');
  });
});
