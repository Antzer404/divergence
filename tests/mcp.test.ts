import { describe, expect, it } from 'vitest';
import { connectMcp, parseMcp } from '../electron/mcp';
import path from 'node:path';
describe('MCP compatibility and consent', () => {
  it('requires explicit enabling and validates transport choice', () => {
    expect(parseMcp('{"mcpServers":{"off":{"command":"node"}}}').mcpServers.off.enabled).toBe(false);
    expect(() => parseMcp('{"mcpServers":{"bad":{"command":"node","url":"https://example.com"}}}')).toThrow();
  });
  it('connects to a real stdio server, lists tools, denies and permits individual calls', async () => {
    let allow = false;
    const bridge = await connectMcp(JSON.stringify({ mcpServers: { fixture: { enabled: true, command: process.execPath, args: [path.resolve('tests/fixtures/mcp-server.mjs')] } } }), async () => allow, new AbortController().signal);
    try {
      expect(bridge.definitions).toHaveLength(1);
      const alias = bridge.definitions[0].function.name;
      expect(await bridge.call(alias, '{"text":"first"}', new AbortController().signal)).toContain('拒绝');
      allow = true;
      expect(await bridge.call(alias, '{"text":"second"}', new AbortController().signal)).toContain('echo:second');
    } finally { await bridge.close(); }
  });
});
