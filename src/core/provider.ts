import type { Settings } from './types';
export interface ChatMessage { role: 'system' | 'user' | 'assistant' | 'tool'; content: string | null; tool_calls?: ToolCall[]; tool_call_id?: string; reasoning_content?: string }
export interface ToolCall { id: string; type: 'function'; function: { name: string; arguments: string } }
export interface ToolDefinition { type: 'function'; function: { name: string; description: string; parameters: Record<string, unknown> } }
export function endpoint(baseUrl: string) {
  const url = new URL(baseUrl);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('请填写有效的 HTTP(S) API 地址，不含密码、查询参数或片段');
  if (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('非本机模型服务请使用 HTTPS');
  return baseUrl.replace(/\/+$/, '').replace(/\/chat\/completions$/, '') + '/chat/completions';
}
export async function chat(settings: Settings, key: string, messages: ChatMessage[], signal: AbortSignal, tools: ToolDefinition[] = []): Promise<{ content: string; toolCalls: ToolCall[]; reasoningContent?: string }> {
  const res = await fetch(endpoint(settings.baseUrl), {
    method: 'POST', signal: AbortSignal.any([signal, AbortSignal.timeout(180_000)]),
    headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) },
    body: JSON.stringify({ model: settings.model, messages, stream: false, max_tokens: 10000, ...(new URL(settings.baseUrl).hostname === 'api.deepseek.com' ? { thinking: { type: 'disabled' } } : {}), ...(settings.useTemperature ? { temperature: settings.temperature } : {}), ...(tools.length ? { tools, tool_choice: 'auto' } : {}) }),
  });
  if (!res.ok) {
    const hints: Record<number, string> = { 401: 'API Key 无效或已过期', 403: '服务拒绝访问，请检查权限', 404: 'API 地址或模型不存在', 429: '请求过多或额度不足，请稍后重试' };
    throw new Error(hints[res.status] || `模型服务返回 HTTP ${res.status}，请检查配置或稍后重试`);
  }
  const data = await res.json();
  const choice = data.choices?.[0];
  if (choice?.finish_reason === 'length') throw new Error('模型输出超过长度限制，请使用快速发散或缩小需求后重试');
  if (!choice?.message) throw new Error('服务未返回有效的 Chat Completions 响应');
  return { content: choice.message.content || '', toolCalls: choice.message.tool_calls || [], reasoningContent: choice.message.reasoning_content };
}
