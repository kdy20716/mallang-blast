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
    font-family: 'Montserrat', 'Arial Black', 'Malgun Gothic', sans-serif;
    overflow: hidden;
  }

  /* A. 투명 배경형 (핑크 캐릭터 최대 크기 + 밑에 Mallang / Games) */
  #target-clean {
    position: absolute;
    top: 50px;
    left: 50px;
    width: 340px;
    height: 420px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
  }
  #target-clean img {
    width: 280px;
    height: 280px;
    object-fit: contain;
    filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.45));
  }
  #target-clean .title-1 {
    font-size: 40px;
    font-weight: 900;
    color: #FFFFFF;
    line-height: 1.05;
    margin-top: 8px;
    letter-spacing: 1px;
    text-shadow: 
      -3px -3px 0 #000, 3px -3px 0 #000,
      -3px  3px 0 #000, 3px  3px 0 #000,
      -3px  0px 0 #000, 3px  0px 0 #000,
       0px -3px 0 #000, 0px  3px 0 #000,
       0 6px 12px rgba(0,0,0,0.85);
    text-align: center;
  }
  #target-clean .title-2 {
    font-size: 26px;
    font-weight: 900;
    color: #FFA6D5;
    line-height: 1.1;
    letter-spacing: 5px;
    text-shadow: 
      -2.5px -2.5px 0 #000, 2.5px -2.5px 0 #000,
      -2.5px  2.5px 0 #000, 2.5px  2.5px 0 #000,
      -2.5px  0px   0 #000, 2.5px  0px   0 #000,
       0px   -2.5px 0 #000, 0px    2.5px 0 #000,
       0 4px 8px rgba(0,0,0,0.85);
    text-align: center;
  }

  /* B. 네모 박스형 (네모 프레임 안을 핑크 캐릭터로 꽉 채우고 아래 Mallang / Games) */
  #target-box {
    position: absolute;
    top: 50px;
    left: 450px;
    width: 320px;
    height: 420px;
    background: rgba(22, 14, 32, 0.82);
    border: 4.5px solid #FF6FA8;
    border-radius: 40px;
    box-shadow: 0 12px 30px rgba(0,0,0,0.55), 0 0 16px rgba(255, 111, 168, 0.4);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
  #target-box img {
    width: 250px;
    height: 250px;
    object-fit: contain;
    filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.5));
  }
  #target-box .title-1 {
    font-size: 38px;
    font-weight: 900;
    color: #FFFFFF;
    line-height: 1.05;
    margin-top: 8px;
    letter-spacing: 1px;
    text-shadow: 0 3px 8px rgba(0,0,0,0.9);
    text-align: center;
  }
  #target-box .title-2 {
    font-size: 24px;
    font-weight: 900;
    color: #FFA6D5;
    line-height: 1.1;
    letter-spacing: 5px;
    text-shadow: 0 2px 6px rgba(0,0,0,0.9);
    text-align: center;
  }
</style>
</head>
<body>
  <div id="target-clean">
    <img src="data:image/png;base64,${mascotB64}" />
    <div class="title-1">Mallang</div>
    <div class="title-2">Games</div>
  </div>

  <div id="target-box">
    <img src="data:image/png;base64,${mascotB64}" />
    <div class="title-1">Mallang</div>
    <div class="title-2">Games</div>
  </div>
</body>
</html>`;

fs.writeFileSync(path.join(outDir, 'render_wm_big_pink.html'), renderHtml, 'utf8');

(async () => {
  const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const proc = spawn(chrome, [
    '--headless=new',
    '--remote-debugging-port=9450',
    '--user-data-dir=' + path.join(outDir, 'prof_vars_wm_big2'),
    '--window-size=1000,1000',
    '--hide-scrollbars',
    'about:blank'
  ], { stdio: 'ignore' });

  let ws;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await (await fetch('http://127.0.0.1:9450/json')).json();
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
  await send('Page.navigate', { url: 'file:///' + path.join(outDir, 'render_wm_big_pink.html').replace(/\\/g, '/') });
  await new Promise(r => setTimeout(r, 700));

  // 1. 투명 배경형 (캐릭터 최대 + Mallang / Games)
  const shot1 = await send('Page.captureScreenshot', { 
    format: 'png', 
    fromSurface: true, 
    clip: { x: 45, y: 45, width: 350, height: 430, scale: 1 } 
  });
  const p1 = path.join(outDir, '말랑게임즈_워터마크_핑크대형.png');
  fs.writeFileSync(p1, Buffer.from(shot1.data, 'base64'));
  console.log(`Saved ${p1}`);

  // 2. 네모 박스형 (네모 프레임 안 가득 채운 캐릭터 + Mallang / Games)
  const shot2 = await send('Page.captureScreenshot', { 
    format: 'png', 
    fromSurface: true, 
    clip: { x: 440, y: 45, width: 340, height: 430, scale: 1 } 
  });
  const p2 = path.join(outDir, '말랑게임즈_워터마크_핑크네모박스형.png');
  fs.writeFileSync(p2, Buffer.from(shot2.data, 'base64'));
  console.log(`Saved ${p2}`);

  proc.kill();
  console.log('Finished big pink mascot watermarks!');
})();
