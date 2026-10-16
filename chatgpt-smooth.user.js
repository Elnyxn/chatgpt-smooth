// ==UserScript==
// @name         ChatGPT 轻量滚动
// @namespace    local.chatgpt.smooth
// @version      0.2.0
// @description  提前渲染附近正文，冻结屏幕外公式和段落，保留搜索、复制和打印。
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @run-at       document-idle
// @grant        GM_registerMenuCommand
// ==/UserScript==

(() => {
  'use strict';
  const KEY = '__chatgptSmoothMVP';
  const VERSION = '0.2.0';
  if (window[KEY]?.version === VERSION) return;
  window[KEY]?.destroy();
  if (!CSS.supports('content-visibility', 'auto')) return;

  const ROOTS = '[data-dil-message-id], .markdown, [data-markdown-text-style="assistant-message"]';
  const CLASS = 'cgpt-smooth-v2-block';
  const HIDDEN = 'data-cgpt-v2-offscreen';
  const HEIGHT = '--cgpt-smooth-v2-height';
  const EDITABLE = 'input, textarea, [contenteditable]:not([contenteditable="false"]), [role="textbox"]';
  const manual = 'scrollMargin' in IntersectionObserver.prototype;
  const records = new Map();
  const roots = new Set();
  const pending = new Set();
  const pauses = new Set();
  const widths = new WeakMap();
  const events = new AbortController();
  let enabled = true;
  let stopped = false;
  let timer = 0;
  let resizeTimer = 0;
  let copyTimer = 0;

  const legacyStyles = [...document.querySelectorAll('style#cgpt-smooth-style')]
    .map(element => ({element, disabled: element.disabled}));
  for (const {element} of legacyStyles) element.disabled = true;
  const style = document.createElement('style');
  style.id = 'cgpt-smooth-v2-style';
  style.textContent = manual ? [
    '.' + CLASS + ' { content-visibility: visible !important; }',
    '.' + CLASS + '[' + HIDDEN + '] {',
    'content-visibility: hidden !important;',
    'contain-intrinsic-block-size: var(' + HEIGHT + ') !important; }',
    '@media print { .' + CLASS + '[' + HIDDEN + '] { content-visibility: visible !important; } }'
  ].join('\n') : [
    '.' + CLASS + ' { content-visibility: auto !important;',
    'contain-intrinsic-block-size: auto var(' + HEIGHT + ') !important; }',
    '@media print { .' + CLASS + ' { content-visibility: visible !important; } }'
  ].join('\n');
  (document.head || document.documentElement).append(style);
  const active = () => enabled && !pauses.size && !stopped;

  const viewport = new IntersectionObserver(entries => {
    if (!active()) return;
    for (const {target, isIntersecting} of entries) {
      const keep = isIntersecting || target.contains(document.activeElement);
      target.toggleAttribute(HIDDEN, !keep);
    }
  }, {rootMargin: '800px 0px', scrollMargin: '800px 0px'});

  function saveHeight(block, height) {
    const record = records.get(block);
    if (!record || !Number.isFinite(height) || height < 0) return;
    if (Math.abs(record.height - height) < 0.1) return;
    record.height = height;
    block.style.setProperty(HEIGHT, height + 'px');
  }
  const resize = new ResizeObserver(entries => {
    for (const entry of entries) {
      const block = entry.target;
      if (records.has(block)) {
        if (!active() || !block.hasAttribute(HIDDEN)) saveHeight(block, entry.contentRect.height);
      } else {
        const previous = widths.get(block);
        widths.set(block, entry.contentRect.width);
        if (previous !== undefined && Math.abs(previous - entry.contentRect.width) > 1) {
          clearTimeout(resizeTimer);
          resizeTimer = window.setTimeout(recalibrate, 250);
        }
      }
    }
  });

  function schedule() {
    if (!timer && !stopped) timer = window.setTimeout(flush, 350);
  }
  function queue(root) {
    if (root?.isConnected) pending.add(root);
    schedule();
  }
  function findRoots(node) {
    if (!(node instanceof Element)) return;
    if (node.matches(ROOTS)) queue(node);
    node.querySelectorAll(ROOTS).forEach(queue);
  }
  function flush() {
    clearTimeout(timer);
    timer = 0;
    if (stopped) return;
    for (const root of roots) {
      if (!root.isConnected) { resize.unobserve(root); roots.delete(root); }
    }
    for (const [block] of records) {
      if (!block.isConnected) {
        viewport.unobserve(block);
        resize.unobserve(block);
        records.delete(block);
      }
    }
    const candidates = new Set();
    for (const root of pending) {
      if (!root.isConnected || root.querySelector(ROOTS)) continue;
      roots.add(root);
      resize.observe(root);
      const children = [...root.children];
      const complete = root.closest('[data-talvt-turn-state]')?.getAttribute('data-talvt-turn-state') === 'complete';
      // Keep the growing tail rendered even when the user scrolls away.
      const limit = complete ? children.length : Math.max(0, children.length - 2);
      for (const child of children.slice(0, limit)) {
        if (!records.has(child) && !child.matches('style, script, button, ' + EDITABLE) &&
            !child.querySelector(EDITABLE)) candidates.add(child);
      }
    }
    pending.clear();
    // Read before writing. Intrinsic size uses the content box, not borders.
    const sizes = [];
    for (const block of candidates) {
      const css = getComputedStyle(block);
      if (['none', 'contents'].includes(css.display) || css.display.startsWith('inline')) continue;
      const rect = block.getBoundingClientRect();
      if (rect.height < 1) continue;
      const zoom = block.currentCSSZoom || 1;
      const padding = parseFloat(css.paddingTop) + parseFloat(css.paddingBottom);
      const border = parseFloat(css.borderTopWidth) + parseFloat(css.borderBottomWidth);
      sizes.push([block, Math.max(0, rect.height / zoom - padding - border)]);
    }
    for (const [block, height] of sizes) {
      records.set(block, {height});
      block.style.setProperty(HEIGHT, height + 'px');
      block.classList.add(CLASS);
      resize.observe(block);
      if (manual && active()) viewport.observe(block);
    }
  }

  function updateState() {
    style.disabled = !active();
    viewport.disconnect();
    if (manual && active()) for (const [block] of records) viewport.observe(block);
  }
  function suspend(reason) {
    if (!pauses.has(reason)) { pauses.add(reason); updateState(); }
  }
  function resume(reason) {
    if (pauses.delete(reason)) updateState();
  }
  function recalibrate() {
    if (stopped) return;
    suspend('resize');
    // Observe natural content sizes before freezing at the new pane width.
    requestAnimationFrame(() => requestAnimationFrame(() => resume('resize')));
  }

  const mutations = new MutationObserver(changes => {
    // Structure only: token text and our attributes cannot trigger a full scan.
    for (const change of changes) {
      const root = change.target instanceof Element ? change.target.closest(ROOTS) : null;
      if (root) queue(root);
      for (const node of change.addedNodes) findRoots(node);
      if (change.removedNodes.length) schedule();
    }
  });
  mutations.observe(document.body, {childList: true, subtree: true});
  findRoots(document.body);
  flush();

  const listen = (target, name, handler, capture = false) =>
    target.addEventListener(name, handler, {capture, signal: events.signal});
  listen(window, 'keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') suspend('find');
    if (event.key === 'Escape') resume('find');
  }, true);
  listen(window, 'pointerdown', () => resume('find'), true);
  listen(document, 'selectionchange', () => {
    const selection = document.getSelection();
    if (!selection || selection.isCollapsed) return resume('selection');
    const node = selection.anchorNode;
    const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    if (element?.closest(ROOTS)) suspend('selection');
  });
  listen(document, 'copy', () => {
    suspend('copy');
    clearTimeout(copyTimer);
    copyTimer = window.setTimeout(() => resume('copy'), 1000);
  }, true);
  listen(window, 'beforeprint', () => suspend('print'));
  listen(window, 'afterprint', () => resume('print'));

  const api = {
    version: VERSION,
    setEnabled(value) { enabled = Boolean(value); updateState(); return enabled; },
    refresh() { findRoots(document.body); flush(); },
    stats() {
      return {version: VERSION, enabled, active: active(), mode: manual ? 'viewport' : 'auto',
        blocks: records.size, hidden: [...records.keys()].filter(e => e.hasAttribute(HIDDEN)).length,
        pauses: [...pauses], pendingRoots: pending.size};
    },
    destroy() {
      stopped = true;
      events.abort();
      mutations.disconnect();
      viewport.disconnect();
      resize.disconnect();
      clearTimeout(timer);
      clearTimeout(resizeTimer);
      clearTimeout(copyTimer);
      style.remove();
      for (const {element, disabled} of legacyStyles) element.disabled = disabled;
      for (const [block] of records) {
        block.classList.remove(CLASS);
        block.removeAttribute(HIDDEN);
        block.style.removeProperty(HEIGHT);
      }
      pending.clear();
      roots.clear();
      records.clear();
      delete window[KEY];
    }
  };
  window[KEY] = api;
  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('切换轻量滚动', () => {
      api.setEnabled(!enabled);
      alert('轻量滚动：' + (enabled ? '开启' : '关闭'));
    });
  }
})();
