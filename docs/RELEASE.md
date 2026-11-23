伟大的作品诞生于伟大的想法。

# Divergence v1.0.0 正式版

基于用户已完成全平台验收的版本，Divergence 正式发布 v1.0.0。

## 下载

| 平台 | 安装包 |
| --- | --- |
| Windows x64 | `Divergence-1.0.0-win-x64.exe`，或便携 ZIP |
| Apple Silicon / M 系列 Mac | `Divergence-1.0.0-mac-arm64.dmg`，或 ZIP |
| Intel Mac | `Divergence-1.0.0-mac-x64.dmg`，或 ZIP |

打开 DMG 后将 Divergence 拖入 Applications。Windows 安装程序会创建桌面快捷方式。应用无需另装 Node.js。

## 正式版功能

- 三个独立视角发散与跨界重组，保留多条有创造力、可落地的方向。
- 快速发散与引导问答、点子收藏和继续分支。
- 多套网站 HTML demo 的隔离预览、导出，以及 Markdown 会话导出。
- 兼容模型服务，API Key 使用操作系统安全存储加密，会话与设置保存在本机。
- 标准 SKILL.md 与 MCP 插件通道，工具调用逐次授权。
- 内置可变字体、柔和页面动效、聊天框指针交互与原生 macOS 菜单。
- 无 Divergence 账号、无遥测，只通过 GitHub Releases 分发和手动更新。

## 升级与校验

已有用户完全退出后安装新版，可沿用现有会话、收藏和配置；macOS 钥匙串访问提示按系统要求确认。

所有平台重新构建并进行对应检查，`SHA256SUMS.txt` 包含六个安装产物的校验值。用户全平台运行验收已通过，CI 检查记录见本次发布工作流。

签名方案沿用已验收版本：Windows 未购买代码签名证书；macOS 使用 ad-hoc 签名并保留 Hardened Runtime，尚无 Apple Developer ID 签名和 Apple 公证。首次打开如遇系统提示，请参阅 [MacBook 安装说明](https://github.com/Antzer404/divergence/blob/v1.0.0/docs/MACOS_ACCEPTANCE.md)。

首次运行可直接体验内置示例；真实生成需配置模型服务和 API Key，实时检索通过搜索 MCP 提供。
