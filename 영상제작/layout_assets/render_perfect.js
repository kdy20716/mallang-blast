const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const outDir = 'c:/Users/kdy02/OneDrive/문서/GitHub/mallang-blast/영상제작/layout_assets';
const assetsImgDir = 'C:/Users/kdy02/OneDrive/문서/GitHub/mallang-blast/발표자료/assets/img';

const THEMES = [
  { name: 'pink', mascot: 'mascot_0.png', mascotW: 680, top: 40, left: 40 },
  { name: 'mint', mascot: 'mascot_1.png', mascotW: 680, top: 35, left: 35 },
  { name: 'gold', mascot: 'mascot_2.png', mascotW: 680, top: 40, left: 40 },
  { name: 'purple', mascot: 'mascot_3.png', mascotW: 680, top: 40, left: 40 }
];

// 캔버스를 900x900으로 설정하고,
// 삼각형(svg-bg)을 900x900 전체(0,0)에 꽉 차게 둡니다. (원래 SVG viewBox가 900x900)
// 캐릭터는 상단 40px, 좌측 40px에 두어 상단/좌측이 절대 잘리지 않고 온전히 살아있으면서
// 삼각형 내부와 곡선 테두리를 풍성하게 덮도록 배치합니다.
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
    width: 900px; height: 900px;
  }
  .box-tl img.svg-bg {
    position: absolute;
    top: 0; left: 0;
    width: 900px; height: 900px;
    object-fit: fill;
  }
  .box-tl img.mascot {
    position: absolute;
    top: 40px; left: 40px;
    width: 680px; height: 680px;
    object-fit: contain;
    filter: drop-shadow(0 20px 38px rgba(0,0,0,0.55));
  }
</style>
</head>
<body>
  <div id="container"></div>
</body>
</html>`;

fs.writeFileSync(path.join(outDir, 'render_perfect.html'), renderHtml, 'utf8');

(async () => {
  const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const proc = spawn(chrome, [
    '--headless=new',
    '--remote-debugging-port=9495',
    '--user-data-dir=' + path.join(outDir, 'prof_vars_perfect'),
    '--window-size=2000,2000',
    '--hide-scrollbars',
    'about:blank'
  ], { stdio: 'ignore' });

  let ws;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await (await fetch('http://127.0.0.1:9495/json')).json();
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
  await send('Page.navigate', { url: 'file:///' + path.join(outDir, 'render_perfect.html').replace(/\\/g, '/') });
  await new Promise(r => setTimeout(r, 600));

  for (const t of THEMES) {
    const tlHtml = `
      <div class="box-tl">
        <img class="svg-bg" src="svg_top_left_${t.name}.svg">
        <img class="mascot" style="top:${t.top}px; left:${t.left}px; width:${t.mascotW}px; height:${t.mascotW}px;" src="file:///${assetsImgDir.replace(/\\/g, '/')}/${t.mascot}">
      </div>
    `;
    await send('Runtime.evaluate', { expression: `document.getElementById('container').innerHTML = \`${tlHtml}\`;` });
    await new Promise(r => setTimeout(r, 500));
    const shotTL = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, clip: { x: 0, y: 0, width: 900, height: 900, scale: 1 } });
    fs.writeFileSync(path.join(outDir, `corner_top_left_${t.name}.png`), Buffer.from(shotTL.data, 'base64'));
    console.log(`Saved corner_top_left_${t.name}.png`);
  }

  proc.kill();
  console.log('Finished perfect alignment render!');
})();
