const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const outDir = 'c:/Users/kdy02/OneDrive/문서/GitHub/mallang-blast/영상제작/layout_assets';

// 사용자의 요청:
// "아직도 작아 텍스트 박스만 왼쪽위로 더 움직여주고 지금 사이즈의 2배를 키워줘"
//
// 삼각형: 650x650 그대로
// 캔버스 크기: 텍스트 박스가 2배 커지고 왼쪽 위로 움직이면 650 너머 좌측(x < 0)이나 상단으로 뻗어나갈 수 있으므로
// 캔버스를 1200x1200으로 설정하고,
// 삼각형(svg-bg)을 (right: 0, bottom: 0, width: 650px, height: 650px)에 정확히 고정!
// 텍스트 박스는 (right: 110px, bottom: 110px)로 왼쪽 위로 이동하고,
// 폰트 크기: 26px -> 48px (정확히 약 2배!)
// 패딩: 30px 48px, 라운드 32px, 보더 7px
//
// 이렇게 하면 프리미어 프로에서 1200x1200 크기의 이미지를 우하단(Right, Bottom)에 스냅하여 놓았을 때
// 삼각형 크기는 650x650 그대로 유지되고, 텍스트 박스는 시원하게 2배로 커져서 왼쪽 위로 이동한 상태가 됩니다!

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
    width: 2000px;
    height: 2000px;
    overflow: hidden;
    background: transparent;
    font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
  }
  /* 1200x1200 캔버스 안에서 우하단 기준으로 정렬 */
  .box-br {
    position: absolute;
    right: 0; bottom: 0;
    width: 1200px; height: 1200px;
  }
  /* 삼각형은 우하단에 650x650 크기 100% 동일하게 고정 */
  .box-br img.svg-bg {
    position: absolute;
    right: 0; bottom: 0;
    width: 650px; height: 650px;
    object-fit: contain;
  }
  /* 텍스트 박스를 왼쪽 위로 크게 이동: right 90px, bottom 95px */
  .textbox-container {
    position: absolute;
    right: 80px;
    bottom: 85px;
    display: flex;
    justify-content: flex-end;
    align-items: flex-end;
    z-index: 10;
  }
  /* 텍스트 박스 사이즈 2배 확대 */
  .text-card {
    padding: 28px 46px;
    border-radius: 30px;
    border: 7px solid #FFFFFF;
    box-shadow: 0 16px 36px rgba(0,0,0,0.65);
    text-align: right;
    line-height: 1.36;
  }
  /* 폰트 사이즈 2배: 26px -> 48px */
  .text-card span {
    display: block;
    font-size: 46px;
    font-weight: 900;
    color: #FFFFFF;
    text-shadow: 
      -4px -4px 0 #000000,
       4px -4px 0 #000000,
      -4px  4px 0 #000000,
       4px  4px 0 #000000,
      -4px  0px 0 #000000,
       4px  0px 0 #000000,
       0px -4px 0 #000000,
       0px  4px 0 #000000,
      -2px -2px 0 #000000,
       2px -2px 0 #000000,
      -2px  2px 0 #000000,
       2px  2px 0 #000000,
       0 6px 14px rgba(0, 0, 0, 0.95);
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

fs.writeFileSync(path.join(outDir, 'render_br_double_up.html'), renderHtml, 'utf8');

(async () => {
  const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const proc = spawn(chrome, [
    '--headless=new',
    '--remote-debugging-port=9451',
    '--user-data-dir=' + path.join(outDir, 'prof_vars_br_dbl'),
    '--window-size=2000,2000',
    '--hide-scrollbars',
    'about:blank'
  ], { stdio: 'ignore' });

  let ws;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await (await fetch('http://127.0.0.1:9451/json')).json();
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
  await send('Page.navigate', { url: 'file:///' + path.join(outDir, 'render_br_double_up.html').replace(/\\/g, '/') });
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
    
    // 텍스트 박스와 650x650 삼각형이 딱 맞게 캡처되도록 clip 계산
    // 텍스트 박스 폭이 약 900px 가량 되므로, 1100x750 영역 캡처
    // 우하단 기준으로 x: 2000 - 1100, y: 2000 - 750
    const shotBR = await send('Page.captureScreenshot', { 
      format: 'png', 
      fromSurface: true, 
      clip: { x: 2000 - 1100, y: 2000 - 750, width: 1100, height: 750, scale: 1 } 
    });
    
    const p1 = path.join(outDir, `corner_bottom_right_${t.name}.png`);
    fs.writeFileSync(p1, Buffer.from(shotBR.data, 'base64'));
    console.log(`Saved 2x scaled up text box ${p1}`);
  }

  proc.kill();
  console.log('Done!');
})();
