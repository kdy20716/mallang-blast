const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const outDir = 'c:/Users/kdy02/OneDrive/문서/GitHub/mallang-blast/영상제작/layout_assets';

// 민트 문장처럼 텍스트가 긴 문장도 650x650 규격(화면 좌측)을 벗어나지 않도록
// 1) 폰트 크기: 26px
// 2) right: 35px, bottom: 45px
// 3) max-width: 580px
// 이렇게 하면 긴 문장도 삼각형 내부 곡선에 예쁘게 안착되고, 좌측으로 잘리지 않습니다!

const THEMES = [
  {
    name: 'pink',
    boxBg: '#FF3377',
    text: "말랑말랑 블록을 터트리며<br>쌓아가는 짜릿한 점수 경쟁!"
  },
  {
    name: 'mint',
    boxBg: '#00BFA5',
    text: "화면 속 귀여운 젤리 캐릭터 '말랑이'와<br>교감하는 특별한 상호작용"
  },
  {
    name: 'gold',
    boxBg: '#FF9E00',
    text: "두근두근 가챠로 나만의 개성 넘치는<br>캐릭터와 아이템 획득!"
  },
  {
    name: 'purple',
    boxBg: '#8E24AA',
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
    width: 1500px;
    height: 1500px;
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
    right: 35px;
    bottom: 45px;
    max-width: 580px;
    display: flex;
    justify-content: flex-end;
    align-items: flex-end;
    z-index: 10;
  }
  .text-card {
    padding: 18px 28px;
    border-radius: 22px;
    border: 5px solid #FFFFFF;
    box-shadow: 0 10px 26px rgba(0,0,0,0.6);
    text-align: right;
    line-height: 1.38;
  }
  .text-card span {
    display: block;
    font-size: 26px; /* 기존 대비 폰트 및 박스 체감 크기 대폭 확대 (약 2.5~3배) */
    font-weight: 900;
    color: #FFFFFF;
    text-shadow: 
      -3px -3px 0 #000000,
       3px -3px 0 #000000,
      -3px  3px 0 #000000,
       3px  3px 0 #000000,
      -3px  0px 0 #000000,
       3px  0px 0 #000000,
       0px -3px 0 #000000,
       0px  3px 0 #000000,
      -2px -2px 0 #000000,
       2px -2px 0 #000000,
      -2px  2px 0 #000000,
       2px  2px 0 #000000,
       0 5px 10px rgba(0, 0, 0, 0.95);
    letter-spacing: -0.6px;
    word-break: keep-all;
    white-space: nowrap;
  }
</style>
</head>
<body>
  <div id="container"></div>
</body>
</html>`;

fs.writeFileSync(path.join(outDir, 'render_br_perfect_fit.html'), renderHtml, 'utf8');

(async () => {
  const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const proc = spawn(chrome, [
    '--headless=new',
    '--remote-debugging-port=9455',
    '--user-data-dir=' + path.join(outDir, 'prof_vars_br_fit'),
    '--window-size=1500,1500',
    '--hide-scrollbars',
    'about:blank'
  ], { stdio: 'ignore' });

  let ws;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await (await fetch('http://127.0.0.1:9455/json')).json();
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
  await send('Page.navigate', { url: 'file:///' + path.join(outDir, 'render_br_perfect_fit.html').replace(/\\/g, '/') });
  await new Promise(r => setTimeout(r, 600));

  for (const t of THEMES) {
    const brHtml = `
      <div class="box-br">
        <img class="svg-bg" src="svg_bottom_right_${t.name}.svg">
        <div class="textbox-container">
          <div class="text-card" style="background:${t.boxBg};">
            <span>${t.text}</span>
          </div>
        </div>
      </div>
    `;
    await send('Runtime.evaluate', { expression: `document.getElementById('container').innerHTML = \`${brHtml}\`;` });
    await new Promise(r => setTimeout(r, 500));
    // 650x650 규격 캡처 (삼각형 크기/위치 100% 동일)
    const shotBR = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, clip: { x: 0, y: 0, width: 650, height: 650, scale: 1 } });
    
    const p1 = path.join(outDir, `corner_bottom_right_${t.name}.png`);
    fs.writeFileSync(p1, Buffer.from(shotBR.data, 'base64'));
    console.log(`Saved perfectly fitted 3x box ${p1}`);
  }

  proc.kill();
  console.log('Done perfectly fitted 3x render!');
})();
