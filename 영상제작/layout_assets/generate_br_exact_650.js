const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const outDir = 'c:/Users/kdy02/OneDrive/문서/GitHub/mallang-blast/영상제작/layout_assets';

// 원인 규명 및 완벽한 해결책:
// 사용자는 프리미어 프로에서 1920x1080 타임라인 위에 이 에셋을 배치하고 있습니다.
// 이전 에셋의 해상도: 650x650
// 방금 generate_br_double_up.js에서 clip을 1100x750으로 변경했기 때문에
// 프리미어 프로에서 이미지 픽셀 크기가 달라져 scale/position이 틀어져 삼각형이 커지거나 밀려 보였던 것입니다!
//
// 따라서 해상도를 원래와 100% 동일한 【650x650】으로 완전히 고정합니다!
// 삼각형: 650x650 캔버스 안에 원래대로 꽉 차게 렌더링.
// 텍스트 박스:
// - 사용자가 마음에 들어한 큰 텍스트 크기 유지 (font-size: 25px~26px, padding: 16px 26px)
// - "텍스트의 크기는 마음에 드는데 왼쪽으로 더 옮겨줘 잘리지 않도록"
// - 텍스트 박스를 2줄로 깔끔하게 정리하고, 오른쪽 여백(right: 25px, bottom: 35px)을 주어
//   오른쪽 화면 밖으로 잘려나갔던 부분을 완전히 안쪽(왼쪽)으로 들여와서 650x650 프레임 안(0~650)에 100% 온전히 수용!

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
    width: 1000px;
    height: 1000px;
    overflow: hidden;
    background: transparent;
    font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
  }
  /* 정확히 650x650 (이전과 1픽셀도 오차 없이 동일한 캔버스 크기) */
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
  /* 오른쪽(우측 끝)에서 30px 떨어뜨려 우측 잘림 방지! 하단 38px 떨어뜨려 하단 잘림 방지! */
  .textbox-container {
    position: absolute;
    right: 28px;
    bottom: 35px;
    display: flex;
    justify-content: flex-end;
    align-items: flex-end;
    z-index: 10;
  }
  /* 불투명 박스 + 선명한 흰색 테두리 */
  .text-card {
    padding: 15px 24px;
    border-radius: 20px;
    border: 4.5px solid #FFFFFF;
    box-shadow: 0 10px 24px rgba(0,0,0,0.6);
    text-align: right;
    line-height: 1.35;
  }
  /* 마음에 드셔했던 큼직하고 시원한 폰트 (2줄 기준 650 안에 완벽히 수용) */
  .text-card span {
    display: block;
    font-size: 24.5px;
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
       0 4px 8px rgba(0, 0, 0, 0.9);
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

fs.writeFileSync(path.join(outDir, 'render_br_exact_650.html'), renderHtml, 'utf8');

(async () => {
  const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const proc = spawn(chrome, [
    '--headless=new',
    '--remote-debugging-port=9459',
    '--user-data-dir=' + path.join(outDir, 'prof_vars_br_exact650'),
    '--window-size=1200,1200',
    '--hide-scrollbars',
    'about:blank'
  ], { stdio: 'ignore' });

  let ws;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await (await fetch('http://127.0.0.1:9459/json')).json();
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
  await send('Page.navigate', { url: 'file:///' + path.join(outDir, 'render_br_exact_650.html').replace(/\\/g, '/') });
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
    
    // 정확히 650x650 규격으로 캡처 (이전 원본과 100% 동일한 파일 해상도 복원!)
    const shotBR = await send('Page.captureScreenshot', { 
      format: 'png', 
      fromSurface: true, 
      clip: { x: 0, y: 0, width: 650, height: 650, scale: 1 } 
    });
    
    const p1 = path.join(outDir, `corner_bottom_right_${t.name}.png`);
    fs.writeFileSync(p1, Buffer.from(shotBR.data, 'base64'));
    console.log(`Saved exact 650x650 corner_bottom_right_${t.name}.png`);
  }

  proc.kill();
  console.log('Finished restoring exact 650x650 corners!');
})();
