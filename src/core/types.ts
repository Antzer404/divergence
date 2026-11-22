import { z } from 'zod';
export const settingsSchema = z.object({
  baseUrl: z.string().url().max(2048), model: z.string().min(1).max(200),
  temperature: z.number().min(0).max(2), useTemperature: z.boolean(),
  mode: z.enum(['quick', 'deep']), demo: z.boolean(),
  enabledSkills: z.array(z.string()).max(100),
  mcpServers: z.string().max(100_000),
});
export type Settings = z.infer<typeof settingsSchema>;
export const defaults: Settings = { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', temperature: 1.1, useTemperature: true, mode: 'deep', demo: true, enabledSkills: ['creative-coach', 'website-directions'], mcpServers: '{\n  "mcpServers": {}\n}' };
export const ideaSchema = z.object({
  id: z.string().optional(), title: z.string().min(1).max(200), lens: z.string().max(100),
  concept: z.string().min(1).max(6000), why: z.string().max(3000),
  steps: z.array(z.string().max(2000)).min(1).max(8), experiment: z.string().max(3000),
  caveat: z.string().max(3000), html: z.string().max(100_000).optional(),
  probability: z.number().min(0).max(1).optional(),
});
export type Idea = z.infer<typeof ideaSchema>;
export const responseSchema = z.object({ intro: z.string().max(8000), questions: z.array(z.string().max(500)).max(3).default([]), ideas: z.array(ideaSchema).max(12).default([]) }).refine(x => x.questions.length > 0 || x.ideas.length > 0, '没有返回问题或点子');
export type CreativeResponse = z.infer<typeof responseSchema>;
export interface Message { id: string; role: 'user' | 'assistant'; text: string; result?: CreativeResponse; error?: boolean; createdAt: number }
export interface Conversation { id: string; title: string; messages: Message[]; updatedAt: number }
export interface Skill { id: string; name: string; description: string; body: string; path: string; builtIn: boolean }
export interface RunInput { conversationId: string; prompt: string; mode: 'quick' | 'deep'; clarify: boolean; selectedSkillIds: string[] }
export interface RunEvent { conversationId: string; type: 'status' | 'result' | 'error' | 'done' | 'approval'; text?: string; result?: CreativeResponse; approval?: { id: string; server: string; name: string; args: string } }
export interface Boot { settings: Settings; hasKey: boolean; conversations: Conversation[]; skills: Skill[]; version: string }
export interface DesktopApi {
  boot(): Promise<Boot>;
  saveSettings(settings: Settings, apiKey?: string): Promise<void>;
  testConnection(settings: Settings, apiKey?: string): Promise<string>;
  run(input: RunInput): Promise<void>;
  cancel(id: string): Promise<void>;
  approve(id: string, allow: boolean): Promise<void>;
  onEvent(cb: (event: RunEvent) => void): () => void;
  deleteConversation(id: string): Promise<void>;
  importSkill(): Promise<Skill | null>;
  openSkills(): Promise<void>;
  testMcp(config: string): Promise<string>;
  exportFile(name: string, content: string): Promise<boolean>;
  openExternal(url: string): Promise<void>;
  checkUpdate(): Promise<{ version: string; url: string; newer: boolean }>;
}
