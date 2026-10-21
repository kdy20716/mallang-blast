const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const outDir = 'c:/Users/kdy02/OneDrive/문서/GitHub/mallang-blast/영상제작';
const srcPng = path.join(outDir, 'MALLANG_GAMES_LOGO_ORIGINAL_HD.png');
const b64 = fs.readFileSync(srcPng).toString('base64');

// 흰색 배경을 투명하게 누끼(Alpha 추출) 처리하는 캔버스 스크립트
let renderHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
</head>
<body style="margin:0; background:transparent;">
  <canvas id="cv" width="1024" height="1024"></canvas>
  <script>
    const img = new Image();
    img.src = 'data:image/png;base64,${b64}';
    img.onload = () => {
      const cv = document.getElementById('cv');
      const ctx = cv.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, 1024, 1024);
      const d = imgData.data;

      // 흰색 배경 투명화 알고리즘 (부드러운 페더링)
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2];
        // 배경 순백색 계열 판정
        if (r > 240 && g > 240 && b > 240) {
          const brightness = (r + g + b) / 3;
          if (brightness >= 252) {
            d[i+3] = 0; // 완전 투명
          } else {
            // 부드러운 경계 처리
            const alpha = 1 - (brightness - 240) / 12;
            d[i+3] = Math.round(d[i+3] * alpha);
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);
      window.done = true;
    };
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(outDir, 'render_transparent_logo.html'), renderHtml, 'utf8');

(async () => {
  const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const proc = spawn(chrome, [
    '--headless=new',
    '--remote-debugging-port=9448',
    '--user-data-dir=' + path.join(outDir, 'prof_vars_logo_trans'),
    '--window-size=1200,1200',
    '--hide-scrollbars',
    'about:blank'
  ], { stdio: 'ignore' });

  let ws;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await (await fetch('http://127.0.0.1:9448/json')).json();
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
  await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  await send('Page.navigate', { url: 'file:///' + path.join(outDir, 'render_transparent_logo.html').replace(/\\/g, '/') });

  for (let i = 0; i < 30; i++) {
    const res = await send('Runtime.evaluate', { expression: 'window.done' });
    if (res.result && res.result.value) break;
    await new Promise(r => setTimeout(r, 100));
  }

  const shot = await send('Page.captureScreenshot', { 
    format: 'png', 
    fromSurface: true, 
    clip: { x: 0, y: 0, width: 1024, height: 1024, scale: 1 } 
  });
  
  const outPath = path.join(outDir, 'MALLANG_GAMES_LOGO_TRANSPARENT.png');
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  console.log(`Saved transparent logo to ${outPath}`);

  proc.kill();
})();
