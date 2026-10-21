const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const outDir = 'c:/Users/kdy02/OneDrive/문서/GitHub/mallang-blast/영상제작/layout_assets';

const THEMES = [
  {
    name: 'pink',
    boxBorder: '#FF4081',
    boxBg: 'rgba(255, 64, 129, 0.45)',
    glow: 'rgba(255, 64, 129, 0.6)',
    text: "말랑말랑 블록을 터트리며<br>쌓아가는 짜릿한 점수 경쟁!"
  },
  {
    name: 'mint',
    boxBorder: '#00E676',
    boxBg: 'rgba(0, 230, 118, 0.40)',
    glow: 'rgba(0, 230, 118, 0.55)',
    text: "화면 속 귀여운 젤리 캐릭터 '말랑이'와<br>교감하는 특별한 상호작용"
  },
  {
    name: 'gold', // 노란색
    boxBorder: '#FFD700',
    boxBg: 'rgba(255, 215, 0, 0.42)',
    glow: 'rgba(255, 215, 0, 0.6)',
    text: "두근두근 가챠로 나만의 개성 넘치는<br>캐릭터와 아이템 획득!"
  },
  {
    name: 'purple', // 보라색
    boxBorder: '#D500F9',
    boxBg: 'rgba(170, 0, 255, 0.42)',
    glow: 'rgba(170, 0, 255, 0.6)',
    text: "상점, 로비, 도감까지<br>깨알 같은 재미로 채운 풍성한 콘텐츠"
  }
];

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
    font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
  }
  .box-br {
    position: absolute;
    top: 0; left: 0;
    width: 650px; height: 650px;
  }
  .box-br img.svg-bg {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    object-fit: contain;
  }
  .textbox-container {
    position: absolute;
    right: 48px;
    bottom: 48px;
    max-width: 440px;
    display: flex;
    justify-content: flex-end;
    align-items: flex-end;
  }
  .text-card {
    padding: 16px 22px;
    border-radius: 18px;
    border: 3.5px solid #FFFFFF;
    box-shadow: 0 10px 24px rgba(0,0,0,0.45);
    text-align: right;
    backdrop-filter: blur(10px);
    line-height: 1.45;
  }
  .text-card span {
    display: block;
    font-size: 21px;
    font-weight: 900;
    color: #FFFFFF;
    /* 검은색 외곽선 (스트로크) 효과 */
    text-shadow: 
      -2px -2px 0 #000000,
       2px -2px 0 #000000,
      -2px  2px 0 #000000,
       2px  2px 0 #000000,
      -2px  0px 0 #000000,
       2px  0px 0 #000000,
       0px -2px 0 #000000,
       0px  2px 0 #000000,
       0 4px 8px rgba(0, 0, 0, 0.85);
    letter-spacing: -0.5px;
    word-break: keep-all;
  }
</style>
</head>
<body>
  <div id="container"></div>
</body>
</html>`;

fs.writeFileSync(path.join(outDir, 'render_bottom_right_texts.html'), renderHtml, 'utf8');

(async () => {
  const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const proc = spawn(chrome, [
    '--headless=new',
    '--remote-debugging-port=9488',
    '--user-data-dir=' + path.join(outDir, 'prof_vars_br_text'),
    '--window-size=2000,2000',
    '--hide-scrollbars',
    'about:blank'
  ], { stdio: 'ignore' });

  let ws;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await (await fetch('http://127.0.0.1:9488/json')).json();
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
  await send('Page.navigate', { url: 'file:///' + path.join(outDir, 'render_bottom_right_texts.html').replace(/\\/g, '/') });
  await new Promise(r => setTimeout(r, 600));

  for (const t of THEMES) {
    const brHtml = `
      <div class="box-br">
        <img class="svg-bg" src="svg_bottom_right_${t.name}.svg">
        <div class="textbox-container">
          <div class="text-card" style="background:${t.boxBg}; border-color:${t.boxBorder}; box-shadow: 0 10px 24px rgba(0,0,0,0.5), 0 0 16px ${t.glow};">
            <span>${t.text}</span>
          </div>
        </div>
      </div>
    `;
    await send('Runtime.evaluate', { expression: `document.getElementById('container').innerHTML = \`${brHtml}\`;` });
    await new Promise(r => setTimeout(r, 500));
    const shotBR = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, clip: { x: 0, y: 0, width: 650, height: 650, scale: 1 } });
    fs.writeFileSync(path.join(outDir, `corner_bottom_right_${t.name}.png`), Buffer.from(shotBR.data, 'base64'));
    console.log(`Saved corner_bottom_right_${t.name}.png with text box`);
  }

  proc.kill();
  console.log('Finished rendering bottom-right corners with colored textboxes!');
})();
