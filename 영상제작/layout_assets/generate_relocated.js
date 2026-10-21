const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const outDir = 'c:/Users/kdy02/OneDrive/문서/GitHub/mallang-blast/영상제작/layout_assets';
const assetsImgDir = 'C:/Users/kdy02/OneDrive/문서/GitHub/mallang-blast/발표자료/assets/img';

const THEMES = [
  { name: 'pink', mascot: 'mascot_0.png' },
  { name: 'mint', mascot: 'mascot_1.png' },
  { name: 'gold', mascot: 'mascot_2.png' },
  { name: 'purple', mascot: 'mascot_3.png' }
];

// 삼각형은 좌상단 (0,0)에 정확히 밀착!
// 캐릭터는 삼각형과 겹치면서(원래 자리의 중심을 지향하되 상단/좌측이 절대 잘리지 않도록 여백 25px 확보)
// 캔버스 크기는 마스코트와 삼각형, 그림자 전체를 여유있게 담도록 1100x1100
let renderHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 2000px;
    height: 2000px;
    overflow: hidden;
    background: transparent;
  }
  .box-tl {
    position: absolute;
    top: 0; left: 0;
    width: 1100px; height: 1100px;
  }
  .box-tl img.svg-bg {
    position: absolute;
    top: 0; left: 0;
    width: 750px; height: 750px;
    object-fit: contain;
  }
  .box-tl img.mascot {
    position: absolute;
    top: 25px; left: 30px;
    width: 580px; height: 580px;
    object-fit: contain;
    filter: drop-shadow(0 18px 32px rgba(0,0,0,0.52));
  }
</style>
</head>
<body>
  <div id="container"></div>
</body>
</html>`;

fs.writeFileSync(path.join(outDir, 'render_variations_relocated.html'), renderHtml, 'utf8');

(async () => {
  const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const proc = spawn(chrome, [
    '--headless=new',
    '--remote-debugging-port=9485',
    '--user-data-dir=' + path.join(outDir, 'prof_vars_relocated'),
    '--window-size=2000,2000',
    '--hide-scrollbars',
    'about:blank'
  ], { stdio: 'ignore' });

  let ws;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await (await fetch('http://127.0.0.1:9485/json')).json();
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
  await send('Page.navigate', { url: 'file:///' + path.join(outDir, 'render_variations_relocated.html').replace(/\\/g, '/') });
  await new Promise(r => setTimeout(r, 600));

  for (const t of THEMES) {
    const tlHtml = `
      <div class="box-tl">
        <img class="svg-bg" src="svg_top_left_${t.name}.svg">
        <img class="mascot" src="file:///${assetsImgDir.replace(/\\/g, '/')}/${t.mascot}">
      </div>
    `;
    await send('Runtime.evaluate', { expression: `document.getElementById('container').innerHTML = \`${tlHtml}\`;` });
    await new Promise(r => setTimeout(r, 500));
    const shotTL = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, clip: { x: 0, y: 0, width: 850, height: 850, scale: 1 } });
    fs.writeFileSync(path.join(outDir, `corner_top_left_${t.name}.png`), Buffer.from(shotTL.data, 'base64'));
    console.log(`Saved corner_top_left_${t.name}.png`);
  }

  proc.kill();
  console.log('All corners re-rendered successfully!');
})();
