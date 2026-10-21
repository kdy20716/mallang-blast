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

// 캐릭터 크기를 360px -> 720px로 정확히 2배 확대!
// 캔버스 및 박스 크기도 캐릭터가 잘리지 않도록 1000px로 넉넉하게 확장
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
    width: 1000px; height: 1000px;
  }
  .box-tl img.svg-bg {
    position: absolute;
    top: 0; left: 0;
    width: 750px; height: 750px;
    object-fit: contain;
  }
  .box-tl img.mascot {
    position: absolute;
    top: 25px; left: 35px;
    width: 720px; height: 720px; /* 기존 360px -> 720px (정확히 2배!) */
    object-fit: contain;
    filter: drop-shadow(0 20px 36px rgba(0,0,0,0.55));
  }
</style>
</head>
<body>
  <div id="container"></div>
</body>
</html>`;

fs.writeFileSync(path.join(outDir, 'render_variations_2x.html'), renderHtml, 'utf8');

(async () => {
  const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const proc = spawn(chrome, [
    '--headless=new',
    '--remote-debugging-port=9475',
    '--user-data-dir=' + path.join(outDir, 'prof_vars_2x'),
    '--window-size=2000,2000',
    '--hide-scrollbars',
    'about:blank'
  ], { stdio: 'ignore' });

  let ws;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await (await fetch('http://127.0.0.1:9475/json')).json();
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
  await send('Page.navigate', { url: 'file:///' + path.join(outDir, 'render_variations_2x.html').replace(/\\/g, '/') });
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
    // 720px 마스코트와 750px 삼각형을 모두 여유있게 담는 950x950 캡처
    const shotTL = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, clip: { x: 0, y: 0, width: 950, height: 950, scale: 1 } });
    fs.writeFileSync(path.join(outDir, `corner_top_left_${t.name}.png`), Buffer.from(shotTL.data, 'base64'));
    console.log(`Saved corner_top_left_${t.name}.png with 2x mascot`);
  }

  proc.kill();
  console.log('All 2x mascot top-left corners generated successfully!');
})();
