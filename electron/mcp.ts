import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { z } from 'zod';
import type { ToolBridge } from '../src/core/engine';
const serverSchema = z.object({ enabled: z.boolean().default(false), command: z.string().optional(), args: z.array(z.string()).optional(), env: z.record(z.string(), z.string()).optional(), url: z.string().url().optional() }).refine(s => Boolean(s.command) !== Boolean(s.url), '每个服务器应设置 command 或 url 之一');
export function parseMcp(config: string) { return z.object({ mcpServers: z.record(z.string(), serverSchema) }).parse(JSON.parse(config)); }
export async function connectMcp(config: string, approve: (server: string, name: string, args: string, signal: AbortSignal) => Promise<boolean>, signal: AbortSignal): Promise<ToolBridge & { close(): Promise<void>; summary: string }> {
  const clients: Client[] = [];
  const map = new Map<string, { client: Client; server: string; name: string }>();
  const definitions: ToolBridge['definitions'] = [];
  try {
    for (const [name, spec] of Object.entries(parseMcp(config).mcpServers)) {
      if (!spec.enabled) continue;
      signal.throwIfAborted();
      const client = new Client({ name: 'divergence', version: '0.1.0' }, { capabilities: {} });
      clients.push(client);
      const transport = spec.url ? new StreamableHTTPClientTransport(new URL(spec.url)) : new StdioClientTransport({ command: spec.command!, args: spec.args || [], env: { ...Object.fromEntries(Object.entries(process.env).filter((p): p is [string, string] => p[1] !== undefined)), ...spec.env }, stderr: 'pipe' });
      await client.connect(transport, { signal, timeout: 15000 });
      const result = await client.listTools({}, { signal, timeout: 15000 });
      for (const tool of result.tools.slice(0, 30)) {
        const alias = `mcp_${map.size}`;
        map.set(alias, { client, server: name, name: tool.name });
        definitions.push({ type: 'function', function: { name: alias, description: `[${name}] ${tool.name}: ${tool.description || ''}`.slice(0, 3000), parameters: tool.inputSchema as Record<string, unknown> } });
      }
    }
  } catch (e) { await Promise.allSettled(clients.map(c => c.close())); throw e; }
  return {
    definitions, summary: `已连接 ${clients.length} 个服务器，发现 ${definitions.length} 个工具。`,
    async call(alias, args, callSignal) {
      const target = map.get(alias);
      if (!target) return '错误：未知工具';
      let parsed: Record<string, unknown>;
      try { parsed = z.record(z.string(), z.unknown()).parse(JSON.parse(args)); } catch { return '错误：工具参数必须为 JSON 对象'; }
      if (!await approve(target.server, target.name, args, callSignal)) return '用户拒绝了本次工具调用，不要再次请求相同调用。';
      callSignal.throwIfAborted();
      try { return JSON.stringify(await target.client.callTool({ name: target.name, arguments: parsed }, undefined, { signal: callSignal, timeout: 30000 })); }
      catch { callSignal.throwIfAborted(); return '工具执行失败，请明确告知资料不可用，不要编造结果。'; }
    },
    async close() { await Promise.allSettled(clients.map(c => c.close())); },
  };
}
