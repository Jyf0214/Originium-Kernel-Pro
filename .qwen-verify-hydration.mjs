// 生产静态导出水合验证：检查 hydration mismatch 与 locale 中英切换
import WebSocket from 'ws';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const targets = await (await fetch('http://localhost:9222/json')).json();
const target = targets.find((t) => t.type === 'page');
if (!target) {
  console.error('无可用 page target');
  process.exit(1);
}

const ws = new WebSocket(target.webSocketDebuggerUrl, { maxPayload: 64 * 1024 * 1024 });
let msgId = 0;
const pending = new Map();
const errors = [];
ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    return;
  }
  // 收集 console 错误 / 异常 / 日志
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    errors.push({ kind: 'console.error', text: msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300) });
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    errors.push({ kind: 'exception', text: (msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text).slice(0, 300) });
  }
  if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
    errors.push({ kind: 'log.error', text: msg.params.entry.text.slice(0, 300) });
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
await new Promise((r) => ws.on('open', r));

await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');

// 模拟 en 浏览器
await send('Emulation.setLocaleOverride', { locale: 'en-US' });
await send('Page.navigate', { url: 'http://localhost:8080/posts/hello-world/' });

// 等待加载完成
for (let i = 0; i < 40; i++) {
  await sleep(500);
  const ev = await send('Runtime.evaluate', {
    expression: `({ ready: document.readyState, url: location.href })`,
    returnByValue: true,
  });
  const ready = ev.result?.value?.ready;
  if (i === 0 && !ready) console.log('首次 evaluate 返回:', JSON.stringify(ev).slice(0, 200));
  if (ready === 'complete') break;
}

await sleep(3000); // 等水合完成

const evFinal = await send('Runtime.evaluate', {
  expression: `({
    htmlLang: document.documentElement.lang,
    navTexts: [...document.querySelectorAll('nav a, header a, button')].map(el => (el.getAttribute('aria-label') || el.textContent || '').trim()).filter(Boolean).slice(0, 12),
    anyChinese: document.body.textContent.includes('打开菜单') || document.body.textContent.includes('首页'),
    anyEnglish: document.body.textContent.includes('Open menu') || document.body.textContent.includes('Home'),
  })`,
  returnByValue: true,
});
if (!evFinal.result?.value) {
  console.log('evaluate 异常:', JSON.stringify(evFinal).slice(0, 400));
  process.exit(1);
}
const v = evFinal.result.value;
console.log('html lang:', v.htmlLang);
console.log('导航文本样本:', JSON.stringify(v.navTexts, null, 0));
console.log('含中文 UI:', v.anyChinese, '| 含英文 UI:', v.anyEnglish);
console.log('--- 控制台/异常事件 ---');
if (errors.length === 0) console.log('（无错误）');
for (const e of errors) {
  console.log(`[${e.kind}] ${e.text}`);
}
ws.close();