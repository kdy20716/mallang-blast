const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const outDir = 'c:/Users/kdy02/OneDrive/문서/GitHub/mallang-blast/영상제작';
const mascotPath = 'c:/Users/kdy02/OneDrive/문서/GitHub/mallang-blast/발표자료/assets/img/mascot_0.png';
const mascotB64 = fs.readFileSync(mascotPath).toString('base64');

let renderHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1000px;
    height: 1000px;
    background: transparent;
    font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
    overflow: hidden;
  }

  /* 1. 핑크 네모 캐릭터 단독 워터마크 (정사각형 200x200) */
  #target-1 {
    position: absolute;
    top: 50px;
    left: 50px;
    width: 200px;
    height: 200px;
    background: linear-gradient(135deg, #FFA6D5, #FF5B99);
    border: 4.5px solid #FFFFFF;
    border-radius: 40px;
    box-shadow: 0 10px 24px rgba(0,0,0,0.45);
    display: flex;
    justify-content: center;
    align-items: center;
  }
  #target-1 .inner-white {
    width: 152px;
    height: 152px;
    background: #FFFFFF;
    border-radius: 28px;
    box-shadow: inset 0 2px 6px rgba(0,0,0,0.12);
    display: flex;
    justify-content: center;
    align-items: center;
  }
  #target-1 img {
    width: 135px;
    height: 135px;
    object-fit: contain;
    filter: drop-shadow(0 6px 12px rgba(220, 50, 110, 0.4));
  }

  /* 2. 네모 글래스모피즘 + 핑크 캐릭터 워터마크 (정사각형 200x200) */
  #target-2 {
    position: absolute;
    top: 50px;
    left: 320px;
    width: 200px;
    height: 200px;
    background: rgba(30, 22, 42, 0.85);
    border: 3.5px solid #FF6FA8;
    border-radius: 38px;
    box-shadow: 0 10px 24px rgba(0,0,0,0.5), 0 0 14px rgba(255, 111, 168, 0.4);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  #target-2 img {
    width: 125px;
    height: 125px;
    object-fit: contain;
    filter: drop-shadow(0 6px 12px rgba(0,0,0,0.5));
  }
  #target-2 span {
    font-size: 14px;
    font-weight: 900;
    color: #FFA6D5;
    letter-spacing: 1px;
    margin-top: 3px;
  }
</style>
</head>
<body>
  <div id="target-1">
    <div class="inner-white">
      <img src="data:image/png;base64,${mascotB64}" />
    </div>
  </div>

  <div id="target-2">
    <img src="data:image/png;base64,${mascotB64}" />
    <span>MALLANG</span>
  </div>
</body>
</html>`;

fs.writeFileSync(path.join(outDir, 'render_wm_square.html'), renderHtml, 'utf8');

(async () => {
  const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const proc = spawn(chrome, [
    '--headless=new',
    '--remote-debugging-port=9456',
    '--user-data-dir=' + path.join(outDir, 'prof_vars_wm_sq2'),
    '--window-size=1000,1000',
    '--hide-scrollbars',
    'about:blank'
  ], { stdio: 'ignore' });

  let ws;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await (await fetch('http://127.0.0.1:9456/json')).json();
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
  await send('Page.navigate', { url: 'file:///' + path.join(outDir, 'render_wm_square.html').replace(/\\/g, '/') });
  await new Promise(r => setTimeout(r, 600));

  // 1. 핑크 네모형 캡처
  const shot1 = await send('Page.captureScreenshot', { 
    format: 'png', 
    fromSurface: true, 
    clip: { x: 40, y: 40, width: 220, height: 220, scale: 1 } 
  });
  fs.writeFileSync(path.join(outDir, '말랑게임즈_워터마크_핑크네모형.png'), Buffer.from(shot1.data, 'base64'));
  console.log('Saved 말랑게임즈_워터마크_핑크네모형.png');

  // 2. 다크핑크 네모형 캡처
  const shot2 = await send('Page.captureScreenshot', { 
    format: 'png', 
    fromSurface: true, 
    clip: { x: 310, y: 40, width: 220, height: 220, scale: 1 } 
  });
  fs.writeFileSync(path.join(outDir, '말랑게임즈_워터마크_다크핑크네모형.png'), Buffer.from(shot2.data, 'base64'));
  console.log('Saved 말랑게임즈_워터마크_다크핑크네모형.png');

  proc.kill();
  console.log('All watermarks saved cleanly!');
})();
