import { randomUUID } from 'node:crypto';
import { responseSchema, type CreativeResponse, type Idea, type RunInput, type RunEvent, type Settings, type Message, type Skill } from './types';
import { chat, type ChatMessage, type ToolDefinition } from './provider';
import { SYSTEM, LENSES, requestPrompt } from './prompts';

export function parseResponse(text: string): CreativeResponse {
  const raw = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = responseSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) throw new Error('模型返回的数据结构不完整，请重试或更换支持结构化输出的模型');
  return { ...parsed.data, ideas: parsed.data.ideas.map(idea => ({ ...idea, id: randomUUID() })) };
}
export interface ToolBridge {
  definitions: ToolDefinition[];
  call(name: string, args: string, signal: AbortSignal): Promise<string>;
}
export async function generate(input: RunInput, history: Message[], settings: Settings, key: string, skills: Skill[], signal: AbortSignal, emit: (e: RunEvent) => void, bridge?: ToolBridge): Promise<CreativeResponse> {
  const status = (text: string) => emit({ conversationId: input.conversationId, type: 'status', text });
  const context = history.slice(-12).map(m => `${m.role === 'user' ? '用户' : 'Divergence'}：${m.result ? JSON.stringify(m.result) : m.text}`).join('\n').slice(-60000);
  const skillText = skills.filter(s => input.selectedSkillIds.includes(s.id)).map(s => `### ${s.name}\n${s.body}`).join('\n').slice(0, 40000);
  async function ask(instruction: string, useTools = false, extra = '') {
    signal.throwIfAborted();
    const messages: ChatMessage[] = [{ role: 'system', content: SYSTEM }, { role: 'user', content: requestPrompt(context + extra, instruction, skillText) }];
    for (let round = 0; round < 5; round++) {
      const result = await chat(settings, key, messages, signal, useTools ? bridge?.definitions : []);
      if (!result.toolCalls.length) {
        try { return parseResponse(result.content); }
        catch {
          status('正在修复输出格式…');
          messages.push({ role: 'assistant', content: result.content.slice(0, 80000) }, { role: 'user', content: '你的回复不是有效的完整 JSON。请按系统结构重写，只返回 JSON，保留内容。' });
          const fixed = await chat(settings, key, messages, signal);
          try { return parseResponse(fixed.content); } catch { throw new Error('模型未返回有效的点子结构，请重试或更换模型'); }
        }
      }
      if (!bridge || !useTools) throw new Error('模型请求了未启用的工具');
      messages.push({ role: 'assistant', content: result.content || null, tool_calls: result.toolCalls, ...(result.reasoningContent ? { reasoning_content: result.reasoningContent } : {}) });
      for (const call of result.toolCalls.slice(0, 8)) {
        status('等待工具资料或你的授权…');
        const content = await bridge.call(call.function.name, call.function.arguments, signal);
        messages.push({ role: 'tool', tool_call_id: call.id, content: content.slice(0, 20000) });
      }
      if (result.toolCalls.length > 8) throw new Error('单轮工具请求过多，请缩小范围');
    }
    throw new Error('工具调用达到本轮上限，请缩小检索范围后重试');
  }
  if (input.clarify) {
    status('先了解你的处境…');
    return ask('这轮只进行引导式提问，针对尚未明确、最影响建议的处境提出1–3个简短问题，不重复已有信息。ideas 返回空数组。');
  }
  if (input.mode === 'quick') {
    status('探索几种截然不同的可能…');
    return ask('生成4个机制上不同的点子。使用分布式候选思路，包含一个非典型方向；可给出主观 probability。明确约束、第一步与验证方法。questions为空。', true);
  }
  status('三个独立视角正在发散…');
  // Each call sees the same brief, but none sees the other branches: reduce anchoring.
  const branches = await Promise.allSettled(LENSES.map(lens => ask(`以「${lens.name}」为独立视角：${lens.instruction} 生成2个方向，包括非典型候选。不要评选最佳。questions为空。`, false)));
  signal.throwIfAborted();
  const good = branches.filter((r): r is PromiseFulfilledResult<CreativeResponse> => r.status === 'fulfilled').map(r => r.value);
  if (!good.length) throw (branches[0] as PromiseRejectedResult).reason;
  const ideas: Idea[] = good.flatMap(r => r.ideas).slice(0, 6);
  status('保留原始方向，尝试一次跨界重组…');
  try {
    const remix = await ask('保留用户选择权：基于下方候选，补充1–2个新的跨方向组合，不重复已有机制，不投票、不合成唯一答案。若配置工具且需要实时资料，可检索并在 intro 标注实际来源。questions为空。', true, `\n候选参考：${JSON.stringify(ideas).slice(0, 50000)}`);
    return { intro: `${good[0].intro}\n\n三个视角独立探索，追加跨界重组。${good.length < 3 ? '部分视角暂时不可用，已保留成功结果。' : ''}\n${remix.intro}`, questions: [], ideas: [...ideas, ...remix.ideas.slice(0, 2)] };
  } catch (error) {
    signal.throwIfAborted();
    return { intro: `${good[0].intro}\n\n跨界重组暂未完成，已保留 ${ideas.length} 个独立方向。${error instanceof Error ? error.message : ''}`, questions: [], ideas };
  }
}
