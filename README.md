<div align="center">
  <img src="assets/icon.svg" width="88" alt="Divergence logo" />
  <h1>Divergence</h1>
  <p><strong>伟大的作品诞生于伟大的想法。</strong></p>
  <p>A little room for big ideas. The desktop anti-harness.</p>
  <p><a href="https://github.com/Antzer404/divergence/releases/latest">下载桌面版</a> · <a href="docs/RESEARCH.md">创造力研究</a> · <a href="docs/EXTENSIONS.md">扩展指南</a></p>
</div>

常见 Agent 帮你把任务收敛到完成。Divergence 帮你打开更多可能：多种视角独立发散、跨界重组，每条方向都附带第一步和最小验证实验，把选择权留给你。

![Divergence 桌面应用](assets/screenshot.png)

## 下载安装

只通过 [GitHub Releases](https://github.com/Antzer404/divergence/releases) 分发。

- **Windows 10/11 x64**：下载 `.exe` 一键安装并创建桌面快捷方式；或下载 `.zip` 解压后双击 `Divergence.exe`。无需安装 Node.js。
- 首次打开是明确标注的**内置体验模式**，使用固定示例，便于零配置体验。
- 打开「偏好设置 → 模型连接」，关闭体验模式，填写兼容 OpenAI Chat Completions 的 API 地址、模型 ID 和 Key，测试后保存。DeepSeek 与本地 Ollama 有快捷预设；本地模型可不填 Key，模型需要先自行下载并运行。
- 更新时使用「关于与更新 → 检查 GitHub 更新」，手动下载新版安装。会话存放在用户数据目录，更新安装程序不会主动删除它。

首版 Windows 安装包未购买代码签名证书，系统可能显示未知发布者。macOS/Linux 提供构建配置，首版不承诺经过实机验证；以 Release 实际附件为准。

## 可以怎样用

> 如何哄女朋友开心？预算100元，今晚就想做点真诚、有新意的小事。

> 给一些大学生创业项目参考。预算5000元，团队3人，比赛要求一个月内完成用户验证……

> 我是一名公司高管，团队最近没有工作热情。先问我几个问题，再一起寻找不同方向。

> 我想做个人网站。给我三个截然不同的完整风格预设，每个都提供可预览的 HTML demo。

- **深度探索**：三个独立模型请求分别从人、反转与跨界视角探索，再调用一次模型产生跨方向组合；保留原始候选，不评选唯一赢家。约4次调用，工具与格式修复可能增加调用。
- **快速发散**：一次请求提出多个不同方向，适合快速启发。
- **先问再想**：这一轮只问1–3个关键背景问题，回答后继续发散。
- **继续发散**：从任意点子分支，生成不同变体；也可要求避开已有机制。
- **灵感收藏 / 导出**：本机收藏卡片、导出 Markdown 会话、隔离预览与导出静态 HTML 原型。
- **Skills / Plugins**：标准 SKILL.md 导入；MCP stdio 与 Streamable HTTP 插件接入。工具调用有逐次授权，搜索能力来自用户配置的 MCP 服务器。

## 创造力方法

不是把 Temperature 拉满，也不保证“史无前例”。实现采用：独立视角减少锚定、跨领域类比、约束反转、分布式候选提示（受 Verbalized Sampling 启发）、用户主导的分支保留与可落地的小实验。详见包含论文出处、实现映射与评估方案的 [调研报告](docs/RESEARCH.md)。这些是研究启发的工程设计，尚未对本产品完成创造力增益实验。

## 本地开发

Node.js 22.12+，推荐 Node 24 LTS，npm 11。

```powershell
npm ci
npm run icons
npm run dev
```

生产构建与验证：

```powershell
npm run build
npm test
npm run test:e2e
npm run test:dev
npm run dist:win
```

`npm run dev` 一条命令启动开发服务与桌面窗口；修改 Electron 后端后需重新运行。安装版直接双击快捷方式。`npm run start` 启动已构建产物。

技术栈：Electron、React、TypeScript、Vite、Zod、MCP TypeScript SDK、electron-builder。原生聊天界面与图标为本项目编写，无需依赖其他 harness 前端。架构与边界见 [ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## 数据和隐私

无用户系统、遥测或中心后端。聊天记录与设置保存在 Electron 用户数据目录：Windows 默认 `%APPDATA%/Divergence`（开发版目录可能为 `divergence`）；API Key 用系统安全存储加密。聊天正文与 MCP 配置为本机明文 JSON，请勿在 MCP 配置里直接填写敏感令牌，优先让服务器从系统环境变量读取。

真实生成时，最近上下文与启用技能发送到你配置的模型服务。MCP 只连接显式启用的服务器；stdio 连接会启动配置的本机进程。生成的 HTML 会移除脚本、事件与外部资源，预览使用沙箱；它们是静态原型，不自动部署。软件不内置通用终端/任意文件操作工具，也不自动执行技能脚本。

## 发布

仓库包含 CI 与 Windows Release 工作流。CI 运行类型检查、测试和构建；推送 `v*` 标签会构建安装包、便携 ZIP、SHA256 校验文件并发布到 GitHub Releases。也可使用 `workflow_dispatch` 发布指定已有标签。无应用内自动安装更新。

MIT License.
