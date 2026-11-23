伟大的作品诞生于伟大的想法。

Divergence v0.1.2：增加 macOS 的 Apple Silicon 与 Intel 安装包。

- **M 系列 Mac**：下载 `Divergence-0.1.2-mac-arm64.dmg`。
- **Intel Mac**：下载 `Divergence-0.1.2-mac-x64.dmg`。
- 打开 DMG，将 Divergence 拖入 Applications 再运行；两个架构均提供 ZIP 备用包。
- **Windows x64**：继续提供 `.exe` 一键安装版和 `.zip`。

macOS 为首次验收版，运行体验交由用户在 MacBook 上验收。构建流程检查实际 CPU 架构、包结构、深度签名、图标、内置技能、字体及 DMG 完整性；Windows 保留完整桌面测试。

macOS 当前使用 ad-hoc 签名，保留 Hardened Runtime，尚无 Apple Developer ID 签名和 Apple 公证。首次打开可能需要你按 macOS 提示手动批准，详见 [MacBook 安装与验收说明](https://github.com/Antzer404/divergence/blob/main/docs/MACOS_ACCEPTANCE.md)。无需关闭全局系统保护。

保留 v0.1.1 的可变字体、流畅动效、聊天框交互与完整创意功能。新增 macOS 原生编辑菜单与窗口行为。已有用户安装新版会沿用本机会话和设置；macOS 的钥匙串访问提示需手动确认。

首次运行使用内置示例；真实生成需配置模型，实时检索需要搜索 MCP。所有安装包通过本 Release 分发，`SHA256SUMS.txt` 包含全部平台产物的校验值。
