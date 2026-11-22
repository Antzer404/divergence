import type { CreativeResponse, RunInput } from './types';
const layouts = [
  { bg: '#f4efe4', fg: '#203b30', accent: '#d3e997', font: 'Georgia, serif', title: 'Small stories.\nLong echoes.', tag: 'FIELD NOTES / 2026', text: 'A quiet corner of the internet. Selected work, observations, and things worth keeping.' },
  { bg: '#2022ee', fg: '#ffffff', accent: '#ddff00', font: 'Arial, sans-serif', title: 'MAKE\nSOME NOISE.', tag: 'INDEPENDENT DESIGNER', text: 'Playful systems. Bold experiments. Digital experiences that refuse to blend in.' },
  { bg: '#141518', fg: '#efefed', accent: '#ed9979', font: 'monospace', title: 'Ideas,\nin orbit.', tag: 'PERSONAL OBSERVATORY — VOL. 01', text: 'An evolving archive of code, experiments, and small discoveries from the edges.' },
];
export function demoHtml(n: number) {
  const x = layouts[n % 3];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;background:${x.bg};color:${x.fg};font-family:${x.font};padding:32px}nav{display:flex;justify-content:space-between;border-bottom:1px solid;padding-bottom:20px;font-size:11px}main{padding:55px 0 35px}small{letter-spacing:2px}h1{font-size:clamp(45px,10vw,105px);line-height:.98;font-weight:${n === 0 ? '400' : '800'};letter-spacing:-4px;white-space:pre-line;margin:30px 0}p{max-width:400px;line-height:1.7;font-size:14px}a{display:inline-block;color:${x.bg};background:${x.accent};padding:14px 22px;margin-top:14px;text-decoration:none}section{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:30px}article{padding:24px 16px;border:1px solid;min-height:130px;font-size:12px}article b{display:block;font-size:22px;margin:20px 0}footer{margin-top:35px;font-size:10px;letter-spacing:2px}</style></head><body><nav><b>STUDIO / ${n + 1}</b><span>WORK &nbsp; ABOUT &nbsp; CONTACT</span></nav><main><small>${x.tag}</small><h1>${x.title}</h1><p>${x.text}</p><a href="#work">Explore selected work ↗</a></main><section id="work"><article>01 / EXPERIMENT<b>New perspectives</b>Art direction · 2026</article><article>02 / SELECTED<b>A different rhythm</b>Digital experience</article><article>03 / NOTES<b>Still becoming</b>Writing & observations</article></section><footer>OPEN TO UNEXPECTED POSSIBILITIES.</footer></body></html>`;
}
export function demoResponse(input: RunInput): CreativeResponse {
  if (input.clarify) return { intro: '这是内置体验示例。真正有用的点子，要从你的具体处境开始。', questions: ['你最希望改变的具体时刻是什么？', '有哪些必须遵守的预算、时间或规则？', '你已经试过什么，对方或用户的反应如何？'], ideas: [] };
  const web = /网站|网页|风格|website|landing|demo/i.test(input.prompt);
  const relation = /女朋友|男朋友|关系|开心|伴侣/.test(input.prompt);
  const management = /员工|高管|团队|热情|公司/.test(input.prompt);
  const rows = web ? [
    ['慢刊 · 数字手札', '编辑设计 × 个人叙事', '把网站当作一本持续更新的独立杂志。留白、衬线字体与苔绿，把项目写成有起承转合的故事。', '先挑三个项目，每个只写一个值得被记住的瞬间。'],
    ['高声说 · 实验海报', '反转 × 大胆表达', '把个人主页变成一张可以探索的蓝色海报。酸黄色按钮、巨型排版与不对称节奏，适合设计师和创作者。', '选择一句能表达你立场的短句，替换平淡的自我介绍。'],
    ['轨道 · 私人观测站', '天文台 × 知识花园', '深色背景、等宽字体和编号档案，把代码、随笔、实验视为持续运转的观测记录。', '整理三条最新的实验日志，让过程也成为作品。'],
  ] : relation ? [
    ['给普通的一天，做一场微型首映', '共同记忆', '选一段只有你们懂的普通经历，用三张照片和一张手写票，邀请她参加十分钟的“我们的小电影”。让她决定故事的下一幕。', '先问她今晚想独处还是一起待一会儿，再准备三张照片。'],
    ['把决定权装进一张菜单', '反转常识', '不猜她“应该喜欢什么”。做三选一的小菜单：安静陪伴、一起散步、我来听你说。每项都能随时拒绝或改选。', '发一句真诚的邀请：“今天想被怎样陪伴？”'],
    ['一起交换一小时的好奇心', '跨界借用', '借用博物馆策展：各自选三件小物，向对方讲它们为什么重要。不必花钱，也不把开心变成必须完成的任务。', '你先选一件日常小物，说一个她还不知道的故事。'],
  ] : management ? [
    ['让员工认领一个“值得修的小问题”', '自主性', '开放每周两小时，让员工自己选择一个妨碍工作的微小问题，管理者负责移除障碍，团队分享前后变化。', '先匿名征集三个最消耗精力的工作摩擦点。'],
    ['反向办公时间', '反转权力', '由一线员工主持，管理者来提问。只解决一件具体卡点，不能把讨论变成员工额外的汇报任务。', '邀请一名自愿的同事，安排20分钟且不留绩效记录。'],
    ['项目的幕后片尾字幕', '电影 × 贡献可见性', '每个项目结束后展示看不见的贡献：谁减少了返工、帮助了同事。由同伴提名，避免只奖励台前角色。', '下次复盘先感谢一件具体行为，询问当事人是否愿意公开。'],
  ] : [
    ['校园闲置时间交换站', '从人出发', '让学生交换15分钟的微技能帮助：改一页简历、陪练一次答辩、教一道家常菜。以时间积分交换，先在一个社团测试。', '访谈5名同学，记录他们最近一次愿意找人帮忙的小事。'],
    ['把废弃物变成课程素材', '反转常识', '连接校园实验室的合规废料与设计课程，做可追溯的材料盲盒。价值来自教学方案与创作挑战，而不只是卖废料。', '确认一类安全、允许流转的材料，找一位老师共创一节体验课。'],
    ['给陌生人设计一次小合作', '游戏 × 社区', '把线下活动设计为需要两种不同专业才能完成的短任务，让破冰从自我介绍变成一起做出一件小作品。', '用纸笔设计一个20分钟任务，邀请6人测试。'],
  ];
  return { intro: '内置示例 · 以下用于体验交互，并非根据当前需求实时生成。接入模型后，Divergence 会结合你的完整上下文探索不同方向，保留选择权。', questions: [], ideas: rows.map((r, i) => ({ id: `demo-${i}-${Date.now()}`, title: r[0], lens: r[1], concept: r[2], why: '用不同的机制打开可能性，同时保留真实的参与感与可执行性。', steps: [r[3], '在小范围内试一次，记录实际反应，再决定是否继续。'], experiment: '邀请2–3位真实参与者体验，询问最想留下和最想改变的部分。', caveat: '示例中的假设需要结合你的预算、边界和实际反馈验证。', ...(web ? { html: demoHtml(i) } : {}) })) };
}
