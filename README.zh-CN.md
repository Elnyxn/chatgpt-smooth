# ChatGPT Smooth · 轻量滚动

[English](README.md)

一个轻量油猴脚本，用于缓解 ChatGPT 公式密集对话的滚动卡顿。

## 功能

- 保持附近的段落和公式正常渲染，并提前准备约 800px 范围内的内容。
- 跳过远处内容的渲染，保留它们在对话中占据的空间。
- 保持正在生成的回复末尾正常渲染，面板宽度变化后自动调整。
- 搜索、选择文字、复制和打印时暂停优化。
- 可以通过油猴菜单随时开启或关闭。

脚本在页面本地运行，不拦截网络请求、不修改模型输出，也不删除消息。

## 安装

1. 在 Chrome 中安装 [Tampermonkey（油猴）](https://www.tampermonkey.net/)。
2. 打开 **[安装 ChatGPT Smooth](https://raw.githubusercontent.com/Elnyxn/chatgpt-smooth/main/chatgpt-smooth.user.js)**，确认安装。
3. 刷新 ChatGPT 页面。

如果安装链接显示为纯文本，在油猴中添加新脚本，用文件全文替换默认模板并保存。

更新时替换原来的脚本，只保留一个版本启用。

## 使用

无需配置，打开对话后正常滚动即可。

油猴菜单中的 **切换轻量滚动** 可以开关脚本。使用 Ctrl+F 或 Cmd+F 搜索后，点击页面或按 Escape 恢复优化。如果使用屏幕阅读器并需要始终访问全部正文，请关闭优化。

当前版本：**0.2.0**。适用于 `chatgpt.com` 和 `chat.openai.com`。不支持 `IntersectionObserver.scrollMargin` 的旧浏览器会回退到浏览器自动控制的内容渲染模式。

个人社区项目，与 OpenAI 无隶属关系。
