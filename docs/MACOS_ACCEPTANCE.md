# MacBook 验收说明

## 选择安装包

从「苹果菜单 → 关于本机」查看芯片：M 系列使用 `Divergence-0.1.2-mac-arm64.dmg`；Intel 使用 `Divergence-0.1.2-mac-x64.dmg`。两个架构也提供 ZIP。

从 [GitHub Release](https://github.com/Antzer404/divergence/releases/tag/v0.1.2) 下载，打开 DMG，把 Divergence 拖入 Applications 后再运行。更新时先完全退出旧版本。应用本身不需要安装 Node.js；自行配置的本地模型或 stdio MCP 仍需对应运行环境。

## 签名状态

当前为 ad-hoc 签名的 macOS 首次验收版，尚无 Apple Developer ID 签名和 Apple 公证。首次打开可能被 Gatekeeper 拦截。如果你确认文件来自上面的项目 Release，可按 Apple 的说明，在尝试打开后进入「系统设置 → 隐私与安全性」为这次应用打开操作选择「仍要打开」。操作系统的提示以你的 macOS 版本为准。

来源：[Apple：在 Mac 上安全地打开 App](https://support.apple.com/en-us/102445)。无需关闭 Gatekeeper 或其他全局系统保护。如果提示应用已损坏，请先核对 Release 的 `SHA256SUMS.txt` 并保留完整提示反馈。

本版保留 Hardened Runtime。CI 使用 `codesign --verify --deep --strict` 等检查产物完整性；这些检查不代表已通过 Apple 公证，也不代替你的运行验收。

## 建议检查顺序

1. **启动与字体**：从 Applications 打开，检查图标、内置字体、窗口缩放、浅色界面与动效。
2. **内置体验**：选择网站风格示例，生成三个方向；展开点子、收藏、打开预览、导出 HTML 与 Markdown。
3. **输入与菜单**：输入中文，测试选中文本、Cmd+C/V/X/Z、Shift+Enter 换行；打开设置后用方向键切换分类，Escape 关闭。
4. **窗口生命周期**：Cmd+W 关闭窗口，再点击 Dock 图标重新打开；Cmd+Q 完全退出后重启，确认记录和收藏保留。
5. **真实模型**：配置自己的地址、模型与 API Key，测试连接与生成。系统可能询问钥匙串访问；完全退出再打开，确认 Key 仍可用。不要把 API Key 放进反馈截图。
6. **插件（可选）**：导入一个 SKILL.md，连接自己的 MCP，检查逐次工具授权与取消操作。

如有异常，反馈芯片型号、macOS 版本、复现步骤、完整提示，以及退出或重启后是否仍存在即可。
