#!/usr/bin/env node
// Headless-Chromium REPL driver for the bodhi client (Vite dev server, :5173).
// chromium-cli isn't installed in this environment, so this adapts the same
// nav -> wait -> act -> screenshot loop directly on top of playwright-core,
// pointed at the local Google Chrome install (no separate browser download).
//
// Usage (pipe commands to stdin):
//   node .claude/skills/run-bodhi/ui-driver.mjs <<'EOF'
//   nav http://localhost:5173
//   wait textarea
//   screenshot 01-landing
//   fill textarea Spent $10 on coffee
//   click button[aria-label=Submit]
//   screenshot 02-after-submit
//   console
//   quit
//   EOF
//
// Screenshots land in SCREENSHOT_DIR (default /tmp/bodhi-shots).

import { chromium } from 'playwright-core';
import * as readline from 'node:readline';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SHOT_DIR = process.env.SCREENSHOT_DIR || '/tmp/bodhi-shots';
fs.mkdirSync(SHOT_DIR, { recursive: true });

const CHROME_PATH = process.env.CHROME_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

let browser = null;
let page = null;
const consoleErrors = [];

const COMMANDS = {
  async launch() {
    if (browser) return console.log('already launched');
    browser = await chromium.launch({ executablePath: CHROME_PATH });
    page = await browser.newPage();
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    console.log('launched');
  },

  async nav(url) {
    if (!page) await COMMANDS.launch();
    await page.goto(url);
    console.log('nav ->', url);
  },

  async wait(sel) {
    if (!page) return console.log('ERROR: launch/nav first');
    try { await page.waitForSelector(sel, { timeout: 10_000 }); console.log('found:', sel); }
    catch { console.log('TIMEOUT:', sel); }
  },

  async screenshot(name) {
    if (!page) return console.log('ERROR: launch/nav first');
    const f = path.join(SHOT_DIR, (name || `ss-${Date.now()}`) + '.png');
    await page.screenshot({ path: f });
    console.log('screenshot:', f);
  },

  async fill(args) {
    if (!page) return console.log('ERROR: launch/nav first');
    const [sel, ...rest] = args.split(' ');
    await page.fill(sel, rest.join(' '));
    console.log('fill', sel);
  },

  async click(sel) {
    if (!page) return console.log('ERROR: launch/nav first');
    await page.click(sel);
    console.log('click', sel);
  },

  async 'click-text'(text) {
    if (!page) return console.log('ERROR: launch/nav first');
    const r = await page.evaluate(t => {
      const els = [...document.querySelectorAll('button, a, [role="button"]')];
      const el = els.find(e => e.textContent?.trim() === t) ?? els.find(e => e.textContent?.includes(t));
      if (!el) return 'NOT_FOUND';
      el.click(); return 'OK: ' + el.tagName;
    }, text);
    console.log('click-text', JSON.stringify(text), '->', r);
  },

  async type(text) { if (page) await page.keyboard.type(text, { delay: 20 }); },
  async press(key) { if (page) await page.keyboard.press(key); },

  async eval(expr) {
    if (!page) return console.log('ERROR: launch/nav first');
    try { console.log(JSON.stringify(await page.evaluate(expr))); }
    catch (e) { console.log('ERROR:', e.message); }
  },

  async text(sel) {
    if (!page) return console.log('ERROR: launch/nav first');
    console.log(await page.evaluate(s => (s ? document.querySelector(s) : document.body)?.innerText ?? '(null)', sel || null));
  },

  console(filter) {
    const list = filter === '--errors' || !filter ? consoleErrors : [];
    console.log(JSON.stringify(list));
  },

  async quit() { if (browser) await browser.close().catch(() => {}); browser = null; page = null; },
  help() { console.log('commands:', Object.keys(COMMANDS).join(', ')); },
};

// readline emits 'line' for every buffered stdin line back-to-back when
// stdin is piped (not a TTY) — it does NOT wait for an async handler to
// resolve before firing the next one. Piped multi-command scripts would
// otherwise race (e.g. `nav` still launching when `fill` already runs).
// Serialize with a promise chain so commands run strictly in order.
let queue = Promise.resolve();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: 'ui> ' });
rl.on('line', line => {
  queue = queue.then(async () => {
    const trimmed = line.trim();
    if (!trimmed) return rl.prompt();
    const sp = trimmed.indexOf(' ');
    const cmd = sp === -1 ? trimmed : trimmed.slice(0, sp);
    const arg = sp === -1 ? '' : trimmed.slice(sp + 1);
    const fn = COMMANDS[cmd];
    if (!fn) { console.log('unknown:', cmd, '- try: help'); return rl.prompt(); }
    try { await fn(arg); } catch (e) { console.log('ERROR:', e.message); }
    if (cmd === 'quit') { rl.close(); process.exit(0); }
    rl.prompt();
  });
});
rl.on('close', async () => { await queue.catch(() => {}); await COMMANDS.quit(); process.exit(0); });
console.log('bodhi ui-driver - "help" for commands, "nav <url>" to start');
rl.prompt();
