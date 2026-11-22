import { readdir, readFile, mkdir, cp, realpath } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import type { Skill } from '../src/core/types';
export async function readSkill(folder: string, builtIn: boolean): Promise<Skill> {
  const source = await readFile(path.join(folder, 'SKILL.md'), 'utf8');
  if (source.length > 40000) throw new Error('SKILL.md 不能超过 40 KB');
  const { data, content } = matter(source);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.name) || data.name.length > 64 || typeof data.description !== 'string' || !data.description.trim()) throw new Error('技能需要有效的 name 和 description YAML 字段');
  return { id: data.name, name: data.name, description: data.description.slice(0, 1024), body: content, path: folder, builtIn };
}
export async function listSkills(bundled: string, user: string) {
  await mkdir(user, { recursive: true });
  const all = new Map<string, Skill>();
  for (const [root, builtIn] of [[bundled, true], [user, false]] as const) {
    for (const dir of await readdir(root, { withFileTypes: true }).catch(() => [])) {
      if (!dir.isDirectory() || dir.isSymbolicLink()) continue;
      try { const skill = await readSkill(path.join(root, dir.name), builtIn); all.set(skill.id, skill); } catch { /* Invalid skills do not prevent startup. */ }
    }
  }
  return [...all.values()];
}
export async function importSkill(source: string, user: string) {
  const skill = await readSkill(source, false);
  const dest = path.join(user, skill.id);
  const realSource = await realpath(source);
  if (path.resolve(realSource) === path.resolve(dest)) return skill;
  // Preserve references/assets but never execute scripts automatically.
  await cp(realSource, dest, { recursive: true, errorOnExist: true, force: false, filter: src => !['node_modules', '.git'].includes(path.basename(src)) });
  return readSkill(dest, false);
}
