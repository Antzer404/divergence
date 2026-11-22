import { describe, expect, it, vi, beforeEach } from 'vitest';
import { generate, parseResponse } from '../src/core/engine';
import { chat } from '../src/core/provider';
import { defaults, type RunInput } from '../src/core/types';
vi.mock('../src/core/provider', () => ({ chat: vi.fn() }));
const input: RunInput = { conversationId: 'test', prompt: '创意', mode: 'deep', clarify: false, selectedSkillIds: [] };
const idea = { title: '小实验', lens: '反转', concept: '让用户一起创作', why: '参与感', steps: ['先访谈两人'], experiment: '体验一次', caveat: '先确认同意' };
const response = { intro: '基于假设', questions: [], ideas: [idea] };
const ok = () => ({ content: JSON.stringify(response), toolCalls: [] });
beforeEach(() => vi.mocked(chat).mockReset());
describe('creative engine', () => {
  it('keeps independent branches isolated and preserves them alongside remix', async () => {
    vi.mocked(chat).mockResolvedValue(ok());
    const output = await generate(input, [{ id: 'u', role: 'user', text: '预算 100', createdAt: 1 }], defaults, 'key', [], new AbortController().signal, () => {});
    expect(chat).toHaveBeenCalledTimes(4);
    for (const call of vi.mocked(chat).mock.calls.slice(0, 3)) {
      expect(call[2][1].content).toContain('预算 100');
      expect(call[2][1].content).not.toContain('候选参考：');
    }
    expect(vi.mocked(chat).mock.calls[3][2][1].content).toContain('候选参考：');
    expect(output.ideas).toHaveLength(4);
    expect(new Set(output.ideas.map(i => i.id)).size).toBe(4);
  });
  it('retains successful results when a branch and remix fail', async () => {
    vi.mocked(chat).mockResolvedValueOnce(ok()).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(ok()).mockRejectedValueOnce(new Error('offline'));
    const output = await generate(input, [], defaults, '', [], new AbortController().signal, () => {});
    expect(output.ideas).toHaveLength(2);
    expect(output.intro).toContain('保留');
  });
  it('clarification only uses one request and produces questions', async () => {
    vi.mocked(chat).mockResolvedValue({ content: JSON.stringify({ intro: '了解处境', questions: ['你最想改变什么？'], ideas: [] }), toolCalls: [] });
    const output = await generate({ ...input, clarify: true }, [], defaults, '', [], new AbortController().signal, () => {});
    expect(chat).toHaveBeenCalledTimes(1); expect(output.ideas).toHaveLength(0); expect(output.questions).toHaveLength(1);
  });
  it('repairs malformed JSON once without silently using a canned answer', async () => {
    vi.mocked(chat).mockResolvedValueOnce({ content: 'broken', toolCalls: [] }).mockResolvedValueOnce(ok());
    const output = await generate({ ...input, mode: 'quick' }, [], defaults, '', [], new AbortController().signal, () => {});
    expect(output.ideas[0].title).toBe('小实验'); expect(chat).toHaveBeenCalledTimes(2);
  });
  it('passes approved tool results into a subsequent model call', async () => {
    vi.mocked(chat).mockResolvedValueOnce({ content: '', toolCalls: [{ id: 'tc1', type: 'function', function: { name: 'mcp_0', arguments: '{"q":"reference"}' } }] }).mockResolvedValueOnce(ok());
    const call = vi.fn().mockResolvedValue('real source result');
    await generate({ ...input, mode: 'quick' }, [], defaults, '', [], new AbortController().signal, () => {}, { definitions: [], call });
    expect(call).toHaveBeenCalledOnce();
    expect(vi.mocked(chat).mock.calls[1][2]).toContainEqual({ role: 'tool', tool_call_id: 'tc1', content: 'real source result' });
  });
  it('does not start a model request after cancellation', async () => {
    const controller = new AbortController(); controller.abort();
    await expect(generate(input, [], defaults, '', [], controller.signal, () => {})).rejects.toThrow();
    expect(chat).not.toHaveBeenCalled();
  });
  it('rejects empty or incomplete results and accepts fenced JSON', () => {
    expect(() => parseResponse('{"intro":"ok","ideas":[],"questions":[]}')).toThrow();
    expect(() => parseResponse('{"intro":"ok","ideas":[{"title":"empty"}]}')).toThrow();
    expect(parseResponse('```json\n' + JSON.stringify(response) + '\n```').ideas).toHaveLength(1);
  });
});
