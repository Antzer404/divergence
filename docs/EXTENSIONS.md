# 技能与插件

## SKILL.md

在「技能」导入包含 SKILL.md 的文件夹，勾选后保存设置。

```text
my-method/
  SKILL.md
  references/      # 可保留，当前不自动展开/读取
  scripts/         # 可保留，当前不执行
```

```markdown
---
name: my-method
description: 说明此方法擅长处理什么问题、何时使用。
---
为每个需求先找三个隐含假设，再尝试反转其中一个。
保留不同机制的候选，并写下第一个能验证它的小实验。
```

兼容 Agent Skills 的基础指令格式。首版将启用技能正文注入上下文，尚不支持技能脚本执行、自动工具预授权或所有其他 harness 的私有扩展字段。导入同名已有技能不会覆盖；可在目录中自行维护再重新打开设置。

标准：[agentskills.io/specification](https://agentskills.io/specification)。

## MCP 插件

在「插件 · MCP」填写 JSON。支持与其他 MCP Host 常见配置相同的 mcpServers 包装，但**每个服务器必须显式 enabled: true** 才会启动。

```json
{
  "mcpServers": {
    "research": {
      "enabled": true,
      "url": "https://your-server.example/mcp"
    },
    "local-tool": {
      "enabled": false,
      "command": "node",
      "args": ["D:/tools/my-server.js"]
    }
  }
}
```

URL 是占位示例，需换成自己的服务器。stdio 支持 command、args、env；HTTP 支持 Streamable HTTP URL，不提供内置 OAuth/headers 编辑器。stdio 会继承当前系统环境变量，再叠加 env。请优先在系统环境或服务器自己的安全存储中管理令牌，MCP JSON 本身以明文保存。

「测试已启用的服务器」会连接并列举工具，不调用工具。真实探索时，模型可选择工具，界面展示服务器、原始工具名与参数，用户每次同意后才执行。本版使用 tools/list、tools/call，不实现资源浏览器、远端交互式插件 UI、旧版 SSE 或其他产品的专有 plugin marketplace 协议。

若需要实时网站参考或市场资料，接入可信搜索 MCP。没有搜索工具时，Divergence 不具备实时网络检索能力；模型必须将建议标为假设或推演。
