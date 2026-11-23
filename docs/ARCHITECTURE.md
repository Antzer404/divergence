# 架构

```text
React 聊天窗口（无 Node 权限）
       │ 有限的 preload IPC API
Electron 主进程
       ├─ 本地原子 JSON 存储 + 系统加密 API Key
       ├─ 独立视角生成 → 跨界重组 → 保留多个方向
       │       └─ 用户配置的 Chat Completions 服务
       ├─ 标准 SKILL.md 导入与指令注入
       ├─ MCP Client → 工具参数显示 → 逐次授权 → 服务器
       └─ GitHub Release 查询 / 原生保存对话框
```

`src/core` 包含模型协议、提示、编排和示例；`electron` 处理桌面权限、存储和扩展；`src/ui` 提供聊天、点子、收藏与隔离预览。网络请求只在主进程执行，UI 不接触已保存的 Key。

## 运行约束

- 同一应用一次运行一条探索。请求总超时、工具调用轮数及结果长度均有上限。停止操作传播 AbortSignal 并清理 MCP 连接。
- 模型返回结构经 Zod 校验，失败后尝试一次格式修复，不使用固定示例冒充真实生成。
- 深度模式保留成功分支；重组失败仍交付已生成的候选。状态提示反映真实阶段，不显示虚构思考过程。
- 单条会话发送最近12条消息、最多约60,000字符上下文；启用技能合计最多40,000字符。超长历史不全部传输。
- 本版非 token 流式聊天；各阶段结束后显示完整结构化卡片。长请求可停止。
- DeepSeek 官方地址使用当前 `deepseek-flash` 预设，并显式发送 `thinking: {type: "disabled"}`，让温度采样生效并控制延迟；其他兼容服务不发送此专有参数。工具请求如返回 reasoning_content，会在同轮工具续接时原样传回，不在 UI 展示或保存。
- 跨界重组可通过 MCP 检索；独立初始分支只使用已给定简报，避免工具调用膨胀。未接搜索插件时输出是模型推演。

## 权限与数据

启用 contextIsolation、sandbox，关闭 nodeIntegration 和 webview。IPC 验证来自主窗口主 frame；导航和新窗口默认拒绝。外链通过有限 HTTP(S) API 打开系统浏览器。

API Key 通过 Electron safeStorage 的异步接口加密后存盘。会话与 MCP 配置以明文 JSON 保存在 userData，无遥测。自动化测试用 `DIVERGENCE_DATA_DIR` 隔离数据。损坏的状态文件先改名为 `state-recovery-*.json`，不会被静默覆盖。

HTML 预览使用 `sandbox=""` 的 srcdoc iframe，移除脚本、事件、表单及外部资源，并添加禁网 CSP。导出使用相同清理后的静态 HTML。生成原型不拥有 Electron bridge，不能调用本机工具。

SKILL.md 的脚本不自动执行。stdio MCP 是用户选择启动的进程，拥有该用户的操作系统权限；逐次工具同意不能约束恶意服务器在连接时的自主行为。因此只启用可信来源，默认关闭所有未显式 enabled 的服务器。当前不提供 MCP OAuth UI；需要 OAuth 的服务器须先用本地代理处理。

## 分发

electron-builder 生成 Windows NSIS 安装包/ZIP，以及 macOS arm64、x64 各自的 DMG/ZIP。工作流在 Windows、原生 Apple Silicon 与 Intel macOS runner 分别构建，再由单一发布任务合并产物并计算统一校验文件。标签必须与 package.json 版本一致。更新只查询固定 GitHub 仓库的最新正式 Release 并打开下载页面，不下载或执行任意更新代码。

macOS 首版用于用户验收，使用 `identity: "-"` 显式 ad-hoc 签名，尚无 Developer ID 或 Apple 公证。保留 Hardened Runtime，声明 Electron JIT 与 ad-hoc 框架加载所需的 entitlement。包验证会检查 Mach-O 实际架构、深度签名、entitlements、字体、技能、图标及 DMG 完整性；不会把这些静态检查表述为 MacBook 运行验收通过。macOS 使用原生应用、编辑、窗口菜单，支持标准复制粘贴和退出行为。

Windows 开发/测试脚本把 Electron 运行时缓存到 `%LOCALAPPDATA%/Divergence-runtime/<version>`，保留 `electron.exe` 文件名，以避免某些工作目录的权限干扰 Chromium 沙箱，同时正确识别开发资源路径。安装版不需要这份开发缓存。

参考：[Electron security](https://www.electronjs.org/docs/latest/tutorial/security)、[safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage)、[MCP SDK client](https://ts.sdk.modelcontextprotocol.io/client.html)、[Agent Skills specification](https://agentskills.io/specification)。
