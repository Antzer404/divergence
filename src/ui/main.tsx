import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import ReactMarkdown from 'react-markdown';
import { ArrowUp, ArrowUpRight, Plus, Search, Sparkles, Settings2, Puzzle, BookOpen, X, Check, ChevronDown, ChevronRight, Compass, Bookmark, MessageSquare, Trash2, Download, Copy, Square, SlidersHorizontal, ExternalLink, LoaderCircle, GitBranch, Lightbulb, WandSparkles, PanelLeftClose, PanelLeftOpen, RefreshCw, Eye, CheckCircle2, HelpCircle, Zap } from 'lucide-react';
import type { Boot, Conversation, CreativeResponse, Idea, Message, RunEvent, Settings, Skill } from '../core/types';
import './style.css';

const api = window.divergence;
const examples = [
  { icon: '✳', label: '让关系更近一点', text: '如何哄女朋友开心？想要一些真诚、有新意、今晚就能做的小事。', color: 'green' },
  { icon: '↗', label: '发现下一种可能', text: '给一些大学生创业项目的参考建议。预算5000元，团队3人，希望一个月内验证真实需求。', color: 'orange' },
  { icon: '◎', label: '重新点燃团队', text: '我是一名公司高管，团队最近缺少工作热情。请先引导我梳理处境，再提供几个不同的方向。', color: 'purple' },
  { icon: '⌘', label: '让风格有点不同', text: '我想做一个个人网站，提供三个完整、截然不同的风格预设，每个都给出可预览的HTML demo。', color: 'blue' },
];
function safeHtml(source: string) {
  const doc = new DOMParser().parseFromString(source, 'text/html');
  doc.querySelectorAll('script,iframe,frame,object,embed,link,base,meta,form,input,button,textarea,select,svg,math').forEach(el => el.remove());
  doc.querySelectorAll('*').forEach(el => {
    for (const attr of [...el.attributes]) {
      if (/^on/i.test(attr.name) || ['src', 'srcset', 'action', 'formaction', 'xlink:href', 'background', 'target'].includes(attr.name) || attr.name === 'href' && !attr.value.startsWith('#')) el.removeAttribute(attr.name);
    }
  });
  const csp = doc.createElement('meta'); csp.httpEquiv = 'Content-Security-Policy';
  csp.content = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; form-action 'none'; base-uri 'none'";
  doc.head.prepend(csp);
  return '<!doctype html>\n' + doc.documentElement.outerHTML;
}
function toMarkdown(c: Conversation) {
  return `# ${c.title}\n\n导出自 Divergence\n\n` + c.messages.map(m => `## ${m.role === 'user' ? '你' : 'Divergence'}\n\n${m.text}\n\n${m.result?.questions.map(q => `- ${q}`).join('\n') || ''}\n\n${m.result?.ideas.map(i => `### ${i.title}\n\n${i.lens}\n\n${i.concept}\n\n**为什么值得一试**：${i.why}\n\n${i.steps.map((s, n) => `${n + 1}. ${s}`).join('\n')}\n\n**最小实验**：${i.experiment}\n\n**留意**：${i.caveat}`).join('\n\n') || ''}`).join('\n\n---\n\n');
}
function Logo({ small = false }: { small?: boolean }) { return <span className={`logo ${small ? 'small' : ''}`}><svg viewBox="0 0 40 40" fill="none"><path d="M10 30 29 10M10 20l10-10M20 30l10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><circle cx="31" cy="8" r="2" fill="currentColor"/></svg></span>; }
function Modal({ title, close, children, wide = false }: { title: string; close: () => void; children: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement;
    ref.current?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        const els = ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input,select,textarea,a[href],[tabindex="0"]');
        if (!els?.length) return;
        const first = els[0], last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', key); return () => { document.removeEventListener('keydown', key); prev?.focus(); };
  }, []);
  return <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}><div className={`modal ${wide ? 'wide' : ''}`} ref={ref} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}><header><h2>{title}</h2><button className="icon-btn" aria-label="关闭" onClick={close}><X size={19}/></button></header>{children}</div></div>;
}
function Markdown({ text }: { text: string }) {
  return <ReactMarkdown components={{ a: ({ href, children }) => <a href={href} onClick={e => { e.preventDefault(); if (href) void api.openExternal(href); }}>{children}</a> }}>{text}</ReactMarkdown>;
}
function IdeaCard({ idea, index, saved, toggle, branch, preview, notify }: { idea: Idea; index: number; saved: boolean; toggle: () => void; branch: (p: string) => void; preview: () => void; notify: (s: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  return <article className={`idea-card tint-${index % 4}`}>
    <div className="idea-top"><span className="idea-number">{String(index + 1).padStart(2, '0')}</span><span className="lens">{idea.lens}</span><button className={`icon-btn ${saved ? 'is-saved' : ''}`} aria-label={saved ? '取消收藏' : '收藏点子'} onClick={toggle}><Bookmark size={17} fill={saved ? 'currentColor' : 'none'}/></button></div>
    <h3>{idea.title}</h3><p className="concept">{idea.concept}</p>
    {idea.html && <button className="preview-tile" onClick={preview}><iframe title={`${idea.title} 缩略预览`} srcDoc={safeHtml(idea.html)} sandbox="" tabIndex={-1}/><span><Eye size={15}/>打开完整 demo <ArrowUpRight size={14}/></span></button>}
    <div className="first-step"><span><Zap size={14}/> 从这一步开始</span><p>{idea.steps[0]}</p></div>
    {expanded && <div className="idea-details"><h4>为什么值得一试</h4><p>{idea.why}</p><h4>行动路径</h4><ol>{idea.steps.map((s, n) => <li key={n}>{s}</li>)}</ol><h4>最小验证实验</h4><p>{idea.experiment}</p><h4>需要留意</h4><p>{idea.caveat}</p></div>}
    <div className="idea-actions"><button onClick={() => setExpanded(!expanded)}>{expanded ? '收起细节' : '展开细节'}<ChevronDown size={14} className={expanded ? 'rotated' : ''}/></button><div><button title="复制点子" onClick={() => void navigator.clipboard.writeText(`${idea.title}\n${idea.concept}\n${idea.steps.join('\n')}\n${idea.experiment}\n${idea.caveat}`).then(() => notify('点子已复制')).catch(() => notify('复制失败'))}><Copy size={14}/></button><button onClick={() => branch(`沿着「${idea.title}」继续发散：${idea.concept}。给出三个机制上不同的变体，不要把它们合并。`)}><GitBranch size={14}/>继续发散</button></div></div>
  </article>;
}
function SettingsModal({ boot, close, refresh, initialTab, notify }: { boot: Boot; close: () => void; refresh: () => Promise<void>; initialTab: string; notify: (s: string) => void }) {
  const [tab, setTab] = useState(initialTab);
  const [settings, setSettings] = useState<Settings>(boot.settings);
  const [key, setKey] = useState('');
  const [keyChanged, setKeyChanged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [skills, setSkills] = useState<Skill[]>(boot.skills);
  const change = <K extends keyof Settings>(k: K, v: Settings[K]) => setSettings(s => ({ ...s, [k]: v }));
  async function action(fn: () => Promise<unknown>) { setBusy(true); setFeedback(''); try { const message = await fn(); if (typeof message === 'string') setFeedback(message); } catch (e) { setFeedback(e instanceof Error ? e.message : '操作失败'); } finally { setBusy(false); } }
  return <Modal title="偏好设置" close={close}><div className="settings-layout"><nav>{[['model', '模型连接', <SlidersHorizontal size={16}/>], ['skills', '技能', <BookOpen size={16}/>], ['plugins', '插件 · MCP', <Puzzle size={16}/>], ['about', '关于与更新', <Compass size={16}/>]].map(([id, label, icon]) => <button key={String(id)} className={tab === id ? 'selected' : ''} onClick={() => { setTab(String(id)); setFeedback(''); }}>{icon}{label}</button>)}</nav><div className="settings-body">
      {tab === 'model' && <><div className="section-eyebrow">BRING YOUR OWN MODEL</div><h3>连接你的想法引擎</h3><p className="muted">兼容 OpenAI Chat Completions。无需 Divergence 账号，模型费用由服务商收取。</p><label className="switch-row"><span><strong>内置体验模式</strong><small>使用固定示例体验功能，不调用模型</small></span><input type="checkbox" checked={settings.demo} onChange={e => change('demo', e.target.checked)}/></label>
      <div className="preset-row">{[['DeepSeek', 'https://api.deepseek.com', 'deepseek-flash'], ['Ollama', 'http://localhost:11434/v1', 'qwen3:8b']].map(([name, url, model]) => <button key={name} onClick={() => { setSettings(s => ({ ...s, baseUrl: url, model, demo: false })); }}>{name}<ArrowUpRight size={12}/></button>)}</div>
      <label>API 地址<input value={settings.baseUrl} onChange={e => change('baseUrl', e.target.value)} placeholder="https://api.example.com/v1"/></label>
      <label>API Key <span className="muted">{boot.hasKey ? '已安全保存，留空保留' : '本地模型可留空'}</span><input type="password" autoComplete="off" value={key} placeholder={boot.hasKey ? '••••••••••••••••' : '输入 API Key'} onChange={e => { setKey(e.target.value); setKeyChanged(true); }}/></label>
      {boot.hasKey && <button className="text-btn" onClick={() => { setKey(''); setKeyChanged(true); setFeedback('保存后将移除已存储的 API Key'); }}>移除已存储的 Key</button>}
      <label>模型 ID<input value={settings.model} onChange={e => change('model', e.target.value)}/></label>
      <label className="switch-row compact"><span>发送 Temperature 参数<small>固定采样参数的模型可关闭</small></span><input type="checkbox" checked={settings.useTemperature} onChange={e => change('useTemperature', e.target.checked)}/></label>
      {settings.useTemperature && <label>探索温度 <span className="value">{settings.temperature.toFixed(1)}</span><input type="range" min="0" max="2" step="0.1" value={settings.temperature} onChange={e => change('temperature', Number(e.target.value))}/><small>温度影响采样随机性；创意质量仍取决于模型与任务。</small></label>}
      <button className="secondary" disabled={busy} onClick={() => void action(() => api.testConnection(settings, keyChanged ? key : undefined))}><RefreshCw size={14}/>测试连接</button></>}
      {tab === 'skills' && <><div className="section-eyebrow">AGENT SKILLS</div><h3>给想法一些新方法</h3><p className="muted">兼容标准 SKILL.md。启用的技能会作为上下文发送给模型；脚本不会自动执行，参考文件会随导入保留。</p><div className="skill-list">{skills.map(skill => <label className="skill-row" key={skill.id}><span><strong>{skill.name}</strong><small>{skill.description}</small><em>{skill.builtIn ? '内置' : '已导入'}</em></span><input type="checkbox" checked={settings.enabledSkills.includes(skill.id)} onChange={e => change('enabledSkills', e.target.checked ? [...settings.enabledSkills, skill.id] : settings.enabledSkills.filter(id => id !== skill.id))}/></label>)}</div><div className="row"><button className="secondary" disabled={busy} onClick={() => void action(async () => { const skill = await api.importSkill(); if (skill) { setSkills(s => [...s.filter(x => x.id !== skill.id), skill]); change('enabledSkills', [...new Set([...settings.enabledSkills, skill.id])]); return `已导入 ${skill.name}，保存后启用`; } })}><Plus size={14}/>导入技能文件夹</button><button className="text-btn" onClick={() => void api.openSkills()}>打开目录<ExternalLink size={13}/></button></div></>}
      {tab === 'plugins' && <><div className="section-eyebrow">MODEL CONTEXT PROTOCOL</div><h3>和更大的世界连接</h3><p className="muted">支持 stdio 与 Streamable HTTP。服务器需显式设为 enabled: true。保存后将在探索时连接；工具每次调用都需要你的同意。</p><label>MCP 配置<textarea className="code-input" rows={13} spellCheck={false} value={settings.mcpServers} onChange={e => change('mcpServers', e.target.value)}/></label><details><summary>查看配置示例</summary><pre>{'{\n  "mcpServers": {\n    "research": {\n      "enabled": true,\n      "url": "https://your-server.example/mcp"\n    },\n    "local": {\n      "enabled": false,\n      "command": "node",\n      "args": ["/path/to/server.js"]\n    }\n  }\n}'}</pre></details><p className="hint">启用 stdio 会在本机启动你配置的进程；请只配置你信任的服务器。搜索能力由你接入的 MCP 提供。</p><button className="secondary" disabled={busy} onClick={() => void action(() => api.testMcp(settings.mcpServers))}><Puzzle size={14}/>测试已启用的服务器</button></>}
      {tab === 'about' && <div className="about"><Logo/><h3>Divergence <span>v{boot.version}</span></h3><p>伟大的作品诞生于伟大的想法。</p><p className="muted">一个鼓励探索的桌面 anti-harness。多种视角，多条方向，把选择权留给你。</p><div className="about-facts"><p><CheckCircle2 size={15}/>会话仅保存在当前设备</p><p><CheckCircle2 size={15}/>API Key 使用操作系统安全存储加密</p><p><CheckCircle2 size={15}/>模型请求直达你设置的服务商</p><p><CheckCircle2 size={15}/>无账号 · 无遥测 · 无后台自动更新</p></div><button className="secondary" disabled={busy} onClick={() => void action(async () => { const update = await api.checkUpdate(); if (update.newer) { await api.openExternal(update.url); return `发现 v${update.version}，已打开 GitHub Release`; } return `当前已是最新版本 v${update.version}`; })}><Download size={15}/>检查 GitHub 更新</button><button className="text-btn" onClick={() => void api.openExternal('https://github.com/Antzer404/divergence')}>查看源代码<ExternalLink size={13}/></button></div>}
      {feedback && <div className="feedback" role="status">{feedback}</div>}
    </div></div><footer className="modal-footer"><span>{busy && <><LoaderCircle size={14} className="spin"/>处理中…</>}</span><button className="secondary" onClick={close}>关闭</button><button className="primary" disabled={busy} onClick={() => void action(async () => { await api.saveSettings(settings, keyChanged ? key : undefined); await refresh(); notify('设置已保存'); close(); })}><Check size={15}/>保存设置</button></footer></Modal>;
}

function App() {
  const [boot, setBoot] = useState<Boot>();
  const [fatal, setFatal] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [view, setView] = useState<'chat' | 'saved'>('chat');
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'quick' | 'deep'>('deep');
  const [clarify, setClarify] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [settingsTab, setSettingsTab] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [sidebar, setSidebar] = useState(true);
  const [preview, setPreview] = useState<Idea>();
  const [approval, setApproval] = useState<RunEvent['approval']>();
  const [deleting, setDeleting] = useState<string>();
  const [saved, setSaved] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('divergence:saved') || '[]'); } catch { return []; } });
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const notify = (s: string) => { setToast(s); };
  const refresh = async () => { const data = await api.boot(); setBoot(data); setConversations(data.conversations); return; };
  useEffect(() => {
    if (!api) { setFatal('请使用 Divergence 桌面应用打开。开发模式请运行 npm run dev。'); return; }
    api.boot().then(data => { setBoot(data); setConversations(data.conversations); setMode(data.settings.mode); }).catch(e => setFatal(String(e)));
    return api.onEvent(event => {
      if (event.type === 'status') setStatus(event.text || '');
      if (event.type === 'approval') setApproval(event.approval);
      if (event.type === 'result' || event.type === 'error') {
        const message: Message = { id: crypto.randomUUID(), role: 'assistant', text: event.result?.intro || event.text || '', result: event.result, error: event.type === 'error', createdAt: Date.now() };
        setConversations(cs => cs.map(c => c.id === event.conversationId ? { ...c, messages: [...c.messages, message] } : c));
      }
      if (event.type === 'done') { setRunning(null); setApproval(undefined); setStatus(''); }
    });
  }, []);
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(''), 3500); return () => clearTimeout(timer); } }, [toast]);
  useEffect(() => { localStorage.setItem('divergence:saved', JSON.stringify(saved)); }, [saved]);
  useEffect(() => { if (view === 'chat' && conversations.some(c => c.id === active && c.messages.length)) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [conversations, status, active, view]);
  function newChat() { setActive(null); setView('chat'); setText(''); inputRef.current?.focus(); }
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.ctrlKey || e.metaKey) { if (e.key === 'n') { e.preventDefault(); newChat(); } if (e.key === ',') { e.preventDefault(); setSettingsTab('model'); } if (e.key === 'k') { e.preventDefault(); setShowSearch(v => !v); } } };
    document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key);
  }, []);
  const current = conversations.find(c => c.id === active);
  const allSaved = conversations.flatMap(c => c.messages.flatMap(m => m.result?.ideas || [])).filter(i => i.id && saved.includes(i.id));
  function toggleSave(idea: Idea) { if (idea.id) setSaved(s => s.includes(idea.id!) ? s.filter(x => x !== idea.id) : [...s, idea.id!]); }
  async function send(prompt = text, forceClarify = clarify) {
    if (!boot || running || !prompt.trim()) return;
    if (prompt.length > 30000) { notify('请将输入控制在 30000 字以内'); return; }
    const id = active || crypto.randomUUID();
    const user: Message = { id: crypto.randomUUID(), role: 'user', text: prompt.trim(), createdAt: Date.now() };
    setConversations(cs => cs.some(c => c.id === id) ? cs.map(c => c.id === id ? { ...c, messages: [...c.messages, user], updatedAt: Date.now() } : c) : [{ id, title: prompt.slice(0, 36), messages: [user], updatedAt: Date.now() }, ...cs]);
    setActive(id); setView('chat'); setText(''); setRunning(id); setStatus('准备探索…'); setClarify(false);
    try { await api.run({ conversationId: id, prompt: prompt.trim(), mode, clarify: forceClarify, selectedSkillIds: boot.settings.enabledSkills }); }
    catch (e) { setRunning(null); setStatus(''); await refresh(); notify(e instanceof Error ? e.message : '启动失败'); }
  }
  function branch(prompt: string) { setView('chat'); setText(prompt); inputRef.current?.focus(); }
  const renderIdea = (idea: Idea, index: number) => <IdeaCard key={idea.id || index} idea={idea} index={index} saved={Boolean(idea.id && saved.includes(idea.id))} toggle={() => toggleSave(idea)} branch={branch} preview={() => setPreview(idea)} notify={notify}/>;
  if (fatal) return <div className="fatal"><Logo/><h2>暂时无法打开工作空间</h2><p>{fatal}</p><button className="primary" onClick={() => location.reload()}>重新加载</button></div>;
  if (!boot) return <div className="loading"><Logo/><LoaderCircle className="spin" size={20}/><p>打开可能性…</p></div>;
  return <div className={`app ${sidebar ? '' : 'sidebar-hidden'}`}>
    {sidebar && <aside className="sidebar"><div className="brand"><Logo/><strong>Divergence<span>THE ANTI-HARNESS</span></strong><button className="icon-btn" title="收起侧栏" onClick={() => setSidebar(false)}><PanelLeftClose size={17}/></button></div>
      <button className="new-chat" onClick={newChat}><Plus size={17}/>开启新的探索<span>Ctrl N</span></button>
      <nav className="main-nav"><button className={view === 'chat' ? 'active' : ''} onClick={() => setView('chat')}><Compass size={18}/>探索空间<span className="nav-dot"/></button><button className={view === 'saved' ? 'active' : ''} onClick={() => setView('saved')}><Bookmark size={17}/>灵感收藏<span>{allSaved.length || ''}</span></button></nav>
      <div className="history-heading"><span>最近的探索</span><button className="icon-btn" aria-label="搜索会话" onClick={() => setShowSearch(v => !v)}><Search size={14}/></button></div>
      {showSearch && <div className="search-input"><Search size={14}/><input autoFocus placeholder="搜索探索记录…" value={query} onChange={e => setQuery(e.target.value)}/></div>}
      <div className="history">{conversations.filter(c => c.title.toLowerCase().includes(query.toLowerCase())).map(c => <div className={`history-item ${active === c.id && view === 'chat' ? 'selected' : ''}`} key={c.id}><button onClick={() => { setActive(c.id); setView('chat'); }}><MessageSquare size={14}/><span>{c.title}</span>{running === c.id && <span className="busy-dot"/>}</button><button className="delete-chat" aria-label={`删除 ${c.title}`} onClick={() => setDeleting(c.id)}><Trash2 size={13}/></button></div>)}{!conversations.length && <div className="history-empty">还没有探索记录。<br/>一个好问题，就是起点。</div>}{conversations.length > 0 && !conversations.some(c => c.title.toLowerCase().includes(query.toLowerCase())) && <p className="history-empty">没有匹配的探索记录</p>}</div>
      <div className="sidebar-bottom"><div className="extension-links"><button onClick={() => setSettingsTab('skills')}><BookOpen size={17}/>技能<span>{boot.settings.enabledSkills.length}</span></button><button onClick={() => setSettingsTab('plugins')}><Puzzle size={17}/>插件<ArrowUpRight size={14}/></button></div><button className="connection-card" onClick={() => setSettingsTab('model')}><span className={`connection-dot ${boot.settings.demo ? 'demo' : ''}`}/><span><strong>{boot.settings.demo ? '内置体验模式' : boot.settings.model}</strong><small>{boot.settings.demo ? '连接模型，探索你的真实问题' : '自定义模型 · 本地工作空间'}</small></span><Settings2 size={16}/></button><div className="sidebar-foot"><span>给想法留一点空间。</span><button className="icon-btn" title="设置" onClick={() => setSettingsTab('about')}><HelpCircle size={15}/></button></div></div>
    </aside>}
    <main className="workspace"><header className="topbar"><div>{!sidebar && <button className="icon-btn" title="展开侧栏" onClick={() => setSidebar(true)}><PanelLeftOpen size={18}/></button>}<span>{view === 'saved' ? '灵感收藏' : current?.title || '新的探索'}</span>{view === 'chat' && <span className="space-tag">开放式思考</span>}</div><div><span className="privacy-dot"/>仅本地保存<button className="icon-btn" title="偏好设置" onClick={() => setSettingsTab('model')}><SlidersHorizontal size={17}/></button></div></header>
      {boot.settings.demo && <div className="demo-banner"><Sparkles size={13}/><span>正在体验内置示例。连接模型，让每个想法因你而不同。</span><button onClick={() => setSettingsTab('model')}>连接模型<ArrowUpRight size={13}/></button></div>}
      <div className="scroll-area">
        {view === 'saved' ? <div className="saved-page"><div className="section-eyebrow">YOUR COLLECTION</div><h1>值得留下的灵感<span>({allSaved.length})</span></h1><p className="muted">先留下，再让它长出新的可能。</p>{allSaved.length ? <div className="ideas-grid">{allSaved.map(renderIdea)}</div> : <div className="empty-saved"><Bookmark size={30}/><h3>给一个想法，留个位置</h3><p>点击点子卡片上的收藏图标，在这里重新遇见它。</p><button className="secondary" onClick={newChat}>开始探索<ArrowUpRight size={14}/></button></div>}</div> : current?.messages.length ? <div className="conversation">
          {current.messages.map(message => <div key={message.id} className={`message ${message.role}`}>
            {message.role === 'user' ? <div className="user-bubble">{message.text}</div> : <><div className="assistant-heading"><Logo small/><strong>Divergence</strong><span>让可能性展开</span></div><div className={`assistant-content ${message.error ? 'error-message' : ''}`}><Markdown text={message.text}/></div>{message.result?.questions.length ? <div className="questions"><div><HelpCircle size={17}/><strong>先从你的处境开始</strong></div>{message.result.questions.map((q, n) => <p key={n}><span>0{n + 1}</span>{q}</p>)}<button className="text-btn" onClick={() => branch(message.result!.questions.map((q, n) => `${n + 1}. ${q}\n我的回答：`).join('\n\n'))}>填写我的回答<ArrowUpRight size={14}/></button></div> : null}{message.result?.ideas.length ? <><div className="directions-label"><span>{message.result.ideas.length} 个方向，都值得探索</span><span>无需选出唯一答案</span></div><div className="ideas-grid">{message.result.ideas.map(renderIdea)}</div></> : null}</>}
          </div>)}
          {running === active && <div className="thinking" role="status"><Logo small/><span className="thinking-dots"><i/><i/><i/></span><span>{status}</span></div>}
          {!running && current.messages.some(m => m.result?.ideas.length) && <div className="followup-row"><button onClick={() => branch('再给我几个完全不同的方向，避开前面已有的机制和比喻。')}><WandSparkles size={14}/>换个完全不同的角度</button><button onClick={() => void api.exportFile('Divergence-探索.md', toMarkdown(current)).then(ok => { if (ok) notify('探索记录已导出'); }).catch(e => notify(String(e)))}><Download size={14}/>导出这次探索</button></div>}
        </div> : <div className="welcome"><div className="welcome-top"><span className="welcome-label"><span/> A LITTLE ROOM FOR BIG IDEAS</span><div className="orbital-art" aria-hidden="true"><svg viewBox="0 0 180 160"><g fill="none" stroke="#b9c6f1" strokeWidth="1"><ellipse cx="90" cy="80" rx="72" ry="32" transform="rotate(-35 90 80)"/><ellipse cx="90" cy="80" rx="72" ry="32" transform="rotate(35 90 80)"/><circle cx="90" cy="80" r="49" strokeDasharray="3 6"/></g><path d="m72 101 39-43M72 79l18-21m1 43 21-23" stroke="#4676ed" strokeWidth="6" strokeLinecap="round"/><circle cx="149" cy="48" r="6" fill="#d4e8a7"/><circle cx="30" cy="107" r="4" fill="#86a9fc"/><path d="M143 112v12m-6-6h12" stroke="#afa0d6" strokeWidth="2"/></svg></div></div><h1>让想法，<br/>走向<span>意料之外。</span></h1><p className="welcome-copy">伟大的作品诞生于伟大的想法。<br/>从一个问题出发，发现不止一种可能。</p><div className="prompt-grid">{examples.map((ex, index) => <button key={ex.label} className="prompt-card" onClick={() => { setText(ex.text); setClarify(index === 2); inputRef.current?.focus(); }}><span className={`example-icon ${ex.color}`}>{ex.icon}</span><strong>{ex.label}</strong><p>{['给日常一点真诚的惊喜', '从限制里，长出创业灵感', '先理解，再一起想办法', '探索完整的网站风格 demo'][index]}</p><ArrowUpRight size={16}/></button>)}</div><div className="welcome-note"><GitBranch size={15}/><span>多种视角独立发散，保留每一条值得探索的方向。</span></div></div>}
        <div ref={endRef}/>
      </div>
      {view === 'chat' && <div className="composer-wrap"><div className="composer"><textarea ref={inputRef} aria-label="描述你想探索的问题" placeholder="一个问题、一个念头，或者一个大胆的‘如果’…" value={text} rows={2} maxLength={30000} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }}/><div className="composer-tools"><div><button className={`mode-btn ${mode === 'deep' ? 'enabled' : ''}`} onClick={() => setMode(m => m === 'deep' ? 'quick' : 'deep')} title="深度探索：三个独立视角与跨界重组；快速发散：单次生成"><Sparkles size={14}/>{mode === 'deep' ? '深度探索' : '快速发散'}<ChevronDown size={12}/></button><button className={`clarify-btn ${clarify ? 'enabled' : ''}`} onClick={() => setClarify(v => !v)} title="这一轮只询问关键背景"><MessageSquare size={14}/>先问再想</button><button className="skill-chip" onClick={() => setSettingsTab('skills')} title="管理技能"><BookOpen size={13}/>{boot.settings.enabledSkills.length} 技能</button></div>{running ? <button className="send-btn stopping" aria-label="停止探索" onClick={() => void api.cancel(running)}><Square size={15} fill="currentColor"/></button> : <button className="send-btn" aria-label="开始探索" disabled={!text.trim()} onClick={() => void send()}><ArrowUp size={20}/></button>}</div></div><div className="composer-foot"><span>{mode === 'deep' ? '深度模式约 4 次模型调用 · 多一些时间，多一些可能' : '快速模式约 1 次模型调用 · 轻巧地打开思路'}</span><span>Enter 发送 · Shift Enter 换行</span></div></div>}
    </main>
    {settingsTab && <SettingsModal boot={boot} initialTab={settingsTab} close={() => setSettingsTab(null)} refresh={refresh} notify={notify}/>}
    {preview && <Modal title={preview.title} close={() => setPreview(undefined)} wide><div className="preview-toolbar"><span>独立 HTML · 隔离预览 · 无脚本与网络资源</span><button className="secondary" onClick={() => void api.exportFile('Divergence-demo.html', safeHtml(preview.html!)).then(ok => { if (ok) notify('HTML demo 已导出'); }).catch(e => notify(String(e)))}><Download size={14}/>导出 HTML</button></div><iframe className="full-preview" sandbox="" title="完整网站 demo" srcDoc={safeHtml(preview.html!)}/></Modal>}
    {approval && <Modal title="允许这次工具调用？" close={() => { void api.approve(approval.id, false); setApproval(undefined); }}><div className="approval-content"><p>插件 <strong>{approval.server}</strong> 请求调用 <strong>{approval.name}</strong>。</p><p className="muted">请检查具体参数。工具会在你配置的服务器执行，可能读写数据或发送网络请求。</p><pre>{approval.args}</pre></div><footer className="modal-footer"><button className="secondary" onClick={() => { void api.approve(approval.id, false); setApproval(undefined); }}>拒绝</button><button className="primary" onClick={() => { void api.approve(approval.id, true); setApproval(undefined); }}>允许这一次</button></footer></Modal>}
    {deleting && <Modal title="删除这次探索？" close={() => setDeleting(undefined)}><div className="approval-content"><p>此操作会移除本机的会话记录及其中的收藏，无法撤销。</p></div><footer className="modal-footer"><button className="secondary" onClick={() => setDeleting(undefined)}>保留</button><button className="danger" onClick={() => void api.deleteConversation(deleting).then(() => { if (active === deleting) setActive(null); setDeleting(undefined); return refresh(); }).catch(e => notify(String(e)))}>删除探索</button></footer></Modal>}
    {toast && <div className="toast" role="status"><CheckCircle2 size={16}/>{toast}</div>}
  </div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
