# ChatGPT Smooth

[简体中文](README.zh-CN.md)

A lightweight Tampermonkey userscript to reduce scrolling lag in formula-heavy ChatGPT conversations.

## What it does

- Keeps nearby paragraphs and formulas rendered, including an approximately 800px buffer.
- Skips rendering distant content while preserving its space in the conversation.
- Keeps the growing end of a reply rendered and adjusts when the conversation pane changes width.
- Pauses the optimization for search, text selection, copying, and printing.
- Includes a Tampermonkey menu switch to turn the optimization on or off.

The script runs locally in the page. It does not intercept requests, change model output, or delete messages.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) in Chrome.
2. Open **[Install ChatGPT Smooth](https://raw.githubusercontent.com/Elnyxn/chatgpt-smooth/main/chatgpt-smooth.user.js)** and confirm the installation.
3. Refresh your ChatGPT tab.

If the install link opens as plain text, create a new script in Tampermonkey, replace the template with the file contents, and save.

To update an existing installation, replace the previous script with this version. Keep only one copy enabled.

## Usage

No setup is required. Open a conversation and scroll normally.

Use the Tampermonkey menu entry **切换轻量滚动** to toggle the script. After using Ctrl+F or Cmd+F, click the page or press Escape to resume the optimization. If you use a screen reader and need all content exposed at all times, turn the optimization off.

Current version: **0.2.0**. Works on `chatgpt.com` and `chat.openai.com`. Older browsers without `IntersectionObserver.scrollMargin` use the browser's automatic content-visibility mode instead.

Independent community project. Not affiliated with OpenAI.
