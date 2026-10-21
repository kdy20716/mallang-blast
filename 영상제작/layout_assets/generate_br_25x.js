const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const outDir = 'c:/Users/kdy02/OneDrive/문서/GitHub/mallang-blast/영상제작/layout_assets';

// 4가지 테마 정의
// 뒤에 네모 투명하지 않게 (100% 불투명 완전한 단색/그라데이션 솔리드 컬러)
// 텍스트 박스 크기 2.5배 확대:
// 이전: 440px 너비, 패딩 16px 22px, 폰트 21px
// 2.5배 확대: 너비 최대 ~780px, 패딩 30px 45px, 폰트 38px, 보더 8px, 라운드 32px
const THEMES = [
  {
    name: 'pink',
    boxBg: '#FF4081',
    boxBorder: '#FFFFFF',
    shadowColor: 'rgba(255, 64, 129, 0.7)',
    text: "말랑말랑 블록을 터트리며<br>쌓아가는 짜릿한 점수 경쟁!"
  },
  {
    name: 'mint',
    boxBg: '#00BFA5',
    boxBorder: '#FFFFFF',
    shadowColor: 'rgba(0, 191, 165, 0.7)',
    text: "화면 속 귀여운 젤리 캐릭터 '말랑이'와<br>교감하는 특별한 상호작용"
  },
  {
    name: 'gold',
    boxBg: '#FFB300',
    boxBorder: '#FFFFFF',
    shadowColor: 'rgba(255, 179, 0, 0.7)',
    text: "두근두근 가챠로 나만의 개성 넘치는<br>캐릭터와 아이템 획득!"
  },
  {
    name: 'purple',
    boxBg: '#9C27B0',
    boxBorder: '#FFFFFF',
    shadowColor: 'rgba(156, 39, 176, 0.7)',
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
    width: 2500px;
    height: 2500px;
    overflow: hidden;
    background: transparent;
    font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
  }
  /* 캔버스를 900x900으로 확장하여 삼각형과 2.5배 커진 텍스트 박스가 온전히 포함되도록 설정 */
  .box-br {
    position: absolute;
    top: 0; left: 0;
    width: 900px; height: 900px;
  }
  .box-br img.svg-bg {
    position: absolute;
    bottom: 0; right: 0;
    width: 850px; height: 850px;
    object-fit: contain;
  }
  .textbox-container {
    position: absolute;
    right: 50px;
    bottom: 50px;
    display: flex;
    justify-content: flex-end;
    align-items: flex-end;
    z-index: 10;
  }
  .text-card {
    padding: 26px 42px;
    border-radius: 30px;
    border: 7px solid #FFFFFF;
    text-align: right;
    line-height: 1.4;
  }
  .text-card span {
    display: block;
    font-size: 34px; /* 텍스트 사이즈 대폭 확대 */
    font-weight: 900;
    color: #FFFFFF;
    /* 굵고 선명한 검은색 외곽선 */
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
       0 6px 12px rgba(0, 0, 0, 0.9);
    letter-spacing: -0.8px;
    word-break: keep-all;
    white-space: nowrap;
  }
</style>
</head>
<body>
  <div id="container"></div>
</body>
</html>`;

fs.writeFileSync(path.join(outDir, 'render_br_25x.html'), renderHtml, 'utf8');

(async () => {
  const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const proc = spawn(chrome, [
    '--headless=new',
    '--remote-debugging-port=9482',
    '--user-data-dir=' + path.join(outDir, 'prof_vars_br_25x'),
    '--window-size=2500,2500',
    '--hide-scrollbars',
    'about:blank'
  ], { stdio: 'ignore' });

  let ws;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await (await fetch('http://127.0.0.1:9482/json')).json();
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
  await send('Page.navigate', { url: 'file:///' + path.join(outDir, 'render_br_25x.html').replace(/\\/g, '/') });
  await new Promise(r => setTimeout(r, 600));

  for (const t of THEMES) {
    const brHtml = `
      <div class="box-br">
        <img class="svg-bg" src="svg_bottom_right_${t.name}.svg">
        <div class="textbox-container">
          <div class="text-card" style="background:${t.boxBg}; border-color:${t.boxBorder}; box-shadow: 0 16px 36px rgba(0,0,0,0.6), 0 0 20px ${t.shadowColor};">
            <span>${t.text}</span>
          </div>
        </div>
      </div>
    `;
    await send('Runtime.evaluate', { expression: `document.getElementById('container').innerHTML = \`${brHtml}\`;` });
    await new Promise(r => setTimeout(r, 500));
    // 900x900 캡처
    const shotBR = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, clip: { x: 0, y: 0, width: 900, height: 900, scale: 1 } });
    fs.writeFileSync(path.join(outDir, `corner_bottom_right_${t.name}.png`), Buffer.from(shotBR.data, 'base64'));
    console.log(`Saved 2.5x solid box corner_bottom_right_${t.name}.png`);
  }

  proc.kill();
  console.log('All 4 bottom-right corners updated successfully!');
})();
