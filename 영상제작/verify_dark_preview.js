const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const outDir = 'c:/Users/kdy02/OneDrive/문서/GitHub/mallang-blast/영상제작';
const srcPng = path.join(outDir, 'MALLANG_GAMES_LOGO_REMASTER_TRANSPARENT.png');
const b64 = fs.readFileSync(srcPng).toString('base64');

// 어두운 영상 배경 위에 올려서 실제로 내부 흰색이 온전히 살아있는지 미리보기 테스트
let testHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
</head>
<body style="margin:0; background:#1b1226; display:flex; justify-content:center; align-items:center; width:1024px; height:1024px;">
  <img src="data:image/png;base64,${b64}" style="width:900px; height:900px; object-fit:contain;" />
</body>
</html>`;

fs.writeFileSync(path.join(outDir, 'test_dark_bg.html'), testHtml, 'utf8');

(async () => {
  const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const proc = spawn(chrome, [
    '--headless=new',
    '--remote-debugging-port=9446',
    '--user-data-dir=' + path.join(outDir, 'prof_vars_test_dark'),
    '--window-size=1024,1024',
    '--hide-scrollbars',
    'about:blank'
  ], { stdio: 'ignore' });

  let ws;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await (await fetch('http://127.0.0.1:9446/json')).json();
      const p = res.find(t => t.type === 'page');
      if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; }
    } catch(e) {}
    await new Promise(r => setTimeout(r, 200));
  }
  await new Promise(r => ws.addEventListener('open', r));

  let mid = 0;
  const send = (m, p = {}) => new Promise(res => {
    const id = ++mid;
    const h = (e) => {
      const d = JSON.parse(e.data);
      if (d.id === id) { ws.removeEventListener('message', h); res(d.result); }
    };
    ws.addEventListener('message', h);
    ws.send(JSON.stringify({ id, method: m, params: p }));
  });

  await send('Page.enable');
  await send('Page.navigate', { url: 'file:///' + path.join(outDir, 'test_dark_bg.html').replace(/\\/g, '/') });
  await new Promise(r => setTimeout(r, 600));

  const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, clip: { x: 0, y: 0, width: 1024, height: 1024, scale: 1 } });
  fs.writeFileSync(path.join(outDir, 'MALLANG_GAMES_LOGO_DARK_PREVIEW.png'), Buffer.from(shot.data, 'base64'));
  console.log('Saved dark background preview verification');

  proc.kill();
})();
