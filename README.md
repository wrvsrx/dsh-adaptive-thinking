# 自适应思考 / Adaptive thinking

面向 DeepSeek Harness Web `0.2.2-rc.3` 的本地插件。在 **设置 → 模型**，找到已保存的 Anthropic Messages 提供商，展开 **自适应思考**，为目标模型选择模式并保存。选 **使用自适应思考** 后，在聊天模型选择器设置 `high` 等网关支持的非关闭推理等级。插件不会自动添加推理等级或修改其他模型；如没有推理等级菜单，先在模型选项里声明端点支持的等级。

- **使用默认模式（移除模型覆盖）**：移除模型级自定义值（DSH 会恢复存在的下层值）。
- **使用自适应思考**：为这个模型选择 Anthropic 的 adaptive 请求模式，不要求模型每次都思考。
- **使用旧式 token 预算**：明确覆盖提供商设定，采用旧式思考；不适用于仅接受 adaptive 的模型。

只支持已保存且在当前用户层有明确 `models` 列表的 Anthropic Messages 路由；不编辑内置目录模型或尚未保存的草稿。不接触 API 密钥，不直接读写配置文件。只调用 DSH 复用的 Settings 接口，修改匹配模型的一个兼容字段，并用配置 revision 防止并发写错行。卸载插件会移除界面和工具，已保存的兼容字段会保留；如需撤销，请在卸载前选择默认模式并保存。

## 安装 / Install

在 DSH 的 **插件 → 添加插件** 中选择本地目录并指向此目录。没有 npm 依赖或安装脚本。

## 开发 / Development

`npm run build` regenerates the browser entry from the shared operations and client source. `npm test` checks the generated entry and runs the unit tests. The agent tool `adaptive_thinking` reads or changes the same model override by provider/model ID.
