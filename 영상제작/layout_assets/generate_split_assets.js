const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const outDir = 'c:/Users/kdy02/OneDrive/문서/GitHub/mallang-blast/영상제작/layout_assets';

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

// 1. 삼각형 단독 렌더링용 HTML (650x650)
let triangleHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 650px;
    height: 650px;
    overflow: hidden;
    background: transparent;
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
</style>
</head>
<body>
  <div id="container"></div>
</body>
</html>`;

// 2. 텍스트 박스 단독 렌더링용 HTML (박스 크기에 맞춘 컴팩트 렌더링)
let textboxHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    padding: 30px;
    background: transparent;
    display: inline-block;
    font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
  }
  .text-card {
    display: inline-block;
    padding: 22px 36px;
    border-radius: 26px;
    border: 6px solid #FFFFFF;
    box-shadow: 0 12px 30px rgba(0,0,0,0.65);
    text-align: center;
    line-height: 1.4;
  }
  .text-card span {
    display: block;
    font-size: 32px;
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
  <div id="target"></div>
</body>
</html>`;

fs.writeFileSync(path.join(outDir, 'render_split_triangle.html'), triangleHtml, 'utf8');
fs.writeFileSync(path.join(outDir, 'render_split_textbox.html'), textboxHtml, 'utf8');

(async () => {
  const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const proc = spawn(chrome, [
    '--headless=new',
    '--remote-debugging-port=9458',
    '--user-data-dir=' + path.join(outDir, 'prof_vars_split'),
    '--window-size=1500,1500',
    '--hide-scrollbars',
    'about:blank'
  ], { stdio: 'ignore' });

  let ws;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await (await fetch('http://127.0.0.1:9458/json')).json();
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

  // A. 삼각형 단독 (corner_bottom_right_[color].png)
  await send('Page.navigate', { url: 'file:///' + path.join(outDir, 'render_split_triangle.html').replace(/\\/g, '/') });
  await new Promise(r => setTimeout(r, 600));

  for (const t of THEMES) {
    const brHtml = `
      <div class="box-br">
        <img class="svg-bg" src="svg_bottom_right_${t.name}.svg">
      </div>
    `;
    await send('Runtime.evaluate', { expression: `document.getElementById('container').innerHTML = \`${brHtml}\`;` });
    await new Promise(r => setTimeout(r, 400));
    const shotBR = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, clip: { x: 0, y: 0, width: 650, height: 650, scale: 1 } });
    const pTriangle = path.join(outDir, `corner_bottom_right_${t.name}.png`);
    fs.writeFileSync(pTriangle, Buffer.from(shotBR.data, 'base64'));
    console.log(`Saved pure triangle: ${pTriangle}`);
  }

  // B. 텍스트 박스 단독 (textbox_[color].png)
  await send('Page.navigate', { url: 'file:///' + path.join(outDir, 'render_split_textbox.html').replace(/\\/g, '/') });
  await new Promise(r => setTimeout(r, 600));

  for (const t of THEMES) {
    const tbHtml = `
      <div class="text-card" style="background:${t.boxBg};">
        <span>${t.text}</span>
      </div>
    `;
    await send('Runtime.evaluate', { expression: `document.getElementById('target').innerHTML = \`${tbHtml}\`;` });
    await new Promise(r => setTimeout(r, 400));

    // 요소 크기 및 위치 가져오기
    const boxEval = await send('Runtime.evaluate', { 
      expression: `(() => {
        const rect = document.querySelector('.text-card').getBoundingClientRect();
        return { x: rect.left - 20, y: rect.top - 20, width: rect.width + 40, height: rect.height + 40 };
      })()`,
      returnByValue: true
    });
    const clip = boxEval.result.value;

    const shotTB = await send('Page.captureScreenshot', { 
      format: 'png', 
      fromSurface: true, 
      clip: { x: Math.max(0, clip.x), y: Math.max(0, clip.y), width: clip.width, height: clip.height, scale: 1 } 
    });

    const pTextbox = path.join(outDir, `textbox_${t.name}.png`);
    fs.writeFileSync(pTextbox, Buffer.from(shotTB.data, 'base64'));
    console.log(`Saved separate textbox: ${pTextbox}`);
  }

  proc.kill();
  console.log('All files split successfully!');
})();
