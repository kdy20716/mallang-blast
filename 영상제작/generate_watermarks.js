const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const outDir = 'c:/Users/kdy02/OneDrive/문서/GitHub/mallang-blast/영상제작';
const mascotPath = 'c:/Users/kdy02/OneDrive/문서/GitHub/mallang-blast/발표자료/assets/img/mascot_0.png';
const mascotB64 = fs.readFileSync(mascotPath).toString('base64');

// 영상 우측에 배치할 네모 규격의 대표 핑크 캐릭터 워터마크
// 여러 상황에서 선택해 쓰실 수 있도록 3가지 인기 규격으로 정교하게 제작:
// 1) watermark_square_icon.png (정사각형 앱아이콘/인장형: 240x240) - 핑크 캐릭터 단독 + 소프트 핑크 네모 프레임
// 2) watermark_square_brand.png (정사각형 브랜드형: 240x240) - 핑크 캐릭터 + MALLANG GAMES 텍스트
// 3) watermark_rect_badge.png (직사각형 네모 배지형: 380x120) - 핑크 네모 배지 + 핑크 캐릭터 + 타이틀

let renderHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: transparent;
    font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
    padding: 30px;
  }

  /* 1. 정사각형 핑크 아이콘형 (200x200) */
  .wm-sq-icon {
    width: 200px;
    height: 200px;
    background: linear-gradient(145deg, rgba(255, 111, 168, 0.88), rgba(220, 60, 130, 0.92));
    border: 4px solid #FFFFFF;
    border-radius: 40px;
    box-shadow: 0 10px 24px rgba(0,0,0,0.45), inset 0 2px 4px rgba(255,255,255,0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    overflow: hidden;
  }
  .wm-sq-icon .inner-circle {
    position: absolute;
    width: 155px;
    height: 155px;
    background: #FFFFFF;
    border-radius: 30px;
    box-shadow: inset 0 3px 8px rgba(0,0,0,0.12);
  }
  .wm-sq-icon img {
    position: relative;
    width: 140px;
    height: 140px;
    object-fit: contain;
    filter: drop-shadow(0 8px 14px rgba(180, 40, 90, 0.4));
  }

  /* 2. 정사각형 네모 브랜드형 (220x220) */
  .wm-sq-brand {
    width: 220px;
    height: 220px;
    background: rgba(30, 24, 45, 0.82);
    backdrop-filter: blur(8px);
    border: 3.5px solid #FF6FA8;
    border-radius: 36px;
    box-shadow: 0 10px 26px rgba(0,0,0,0.55), 0 0 14px rgba(255, 111, 168, 0.45);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 14px;
  }
  .wm-sq-brand img {
    width: 110px;
    height: 110px;
    object-fit: contain;
    filter: drop-shadow(0 6px 12px rgba(0,0,0,0.5));
  }
  .wm-sq-brand .brand-title {
    font-size: 19px;
    font-weight: 900;
    color: #FFFFFF;
    letter-spacing: 0.5px;
    margin-top: 6px;
    text-shadow: 0 2px 6px rgba(0,0,0,0.8);
  }
  .wm-sq-brand .brand-sub {
    font-size: 11px;
    font-weight: 800;
    color: #FFA6D5;
    letter-spacing: 2px;
    text-shadow: 0 1px 3px rgba(0,0,0,0.8);
  }

  /* 3. 직사각형 네모 컴팩트 배지형 (360x105) */
  .wm-rect-pink {
    width: 360px;
    height: 105px;
    background: rgba(28, 20, 38, 0.85);
    backdrop-filter: blur(8px);
    border: 3px solid #FF6FA8;
    border-radius: 24px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5), 0 0 12px rgba(255, 111, 168, 0.4);
    display: flex;
    align-items: center;
    padding: 10px 18px;
    gap: 16px;
  }
  .wm-rect-pink .char-box {
    width: 80px;
    height: 80px;
    background: #FFFFFF;
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: inset 0 2px 6px rgba(0,0,0,0.15);
  }
  .wm-rect-pink .char-box img {
    width: 72px;
    height: 72px;
    object-fit: contain;
    filter: drop-shadow(0 4px 8px rgba(180, 40, 90, 0.35));
  }
  .wm-rect-pink .text-group {
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .wm-rect-pink .t-main {
    font-size: 24px;
    font-weight: 900;
    color: #FFFFFF;
    letter-spacing: 0.5px;
    text-shadow: 0 2px 6px rgba(0,0,0,0.8);
  }
  .wm-rect-pink .t-sub {
    font-size: 13px;
    font-weight: 800;
    color: #FF85B8;
    letter-spacing: 2.5px;
  }
</style>
</head>
<body>
  <div id="icon-target" style="padding: 20px; display: inline-block;">
    <div class="wm-sq-icon">
      <div class="inner-circle"></div>
      <img src="data:image/png;base64,${mascotB64}" />
    </div>
  </div>

  <div id="brand-target" style="padding: 20px; display: inline-block;">
    <div class="wm-sq-brand">
      <img src="data:image/png;base64,${mascotB64}" />
      <div class="brand-title">MALLANG BLAST</div>
      <div class="brand-sub">OFFICIAL</div>
    </div>
  </div>

  <div id="rect-target" style="padding: 20px; display: inline-block;">
    <div class="wm-rect-pink">
      <div class="char-box">
        <img src="data:image/png;base64,${mascotB64}" />
      </div>
      <div class="text-group">
        <span class="t-main">MALLANG GAMES</span>
        <span class="t-sub">말랑블라스트</span>
      </div>
    </div>
  </div>
</body>
</html>`;

fs.writeFileSync(path.join(outDir, 'render_watermarks.html'), renderHtml, 'utf8');

(async () => {
  const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const proc = spawn(chrome, [
    '--headless=new',
    '--remote-debugging-port=9453',
    '--user-data-dir=' + path.join(outDir, 'prof_vars_wm'),
    '--window-size=1500,1500',
    '--hide-scrollbars',
    'about:blank'
  ], { stdio: 'ignore' });

  let ws;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await (await fetch('http://127.0.0.1:9453/json')).json();
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
  await send('Page.navigate', { url: 'file:///' + path.join(outDir, 'render_watermarks.html').replace(/\\/g, '/') });
  await new Promise(r => setTimeout(r, 800));

  // 1) 정사각형 핑크 캐릭터 아이콘 워터마크
  const shot1 = await send('Page.captureScreenshot', { 
    format: 'png', 
    fromSurface: true, 
    clip: { x: 20, y: 20, width: 200, height: 200, scale: 1 } 
  });
  fs.writeFileSync(path.join(outDir, '말랑게임즈_워터마크_핑크네모형.png'), Buffer.from(shot1.data, 'base64'));
  console.log('Saved 말랑게임즈_워터마크_핑크네모형.png');

  // 2) 정사각형 브랜드 타이틀 워터마크
  const box2 = await send('Runtime.evaluate', { 
    expression: `(() => {
      const r = document.querySelector('.wm-sq-brand').getBoundingClientRect();
      return { x: r.left, y: r.top, width: r.width, height: r.height };
    })()`,
    returnByValue: true
  });
  const shot2 = await send('Page.captureScreenshot', { 
    format: 'png', 
    fromSurface: true, 
    clip: { x: box2.result.value.x, y: box2.result.value.y, width: box2.result.value.width, height: box2.result.value.height, scale: 1 } 
  });
  fs.writeFileSync(path.join(outDir, '말랑게임즈_워터마크_정사각브랜드형.png'), Buffer.from(shot2.data, 'base64'));
  console.log('Saved 말랑게임즈_워터마크_정사각브랜드형.png');

  // 3) 직사각형 핑크 배지 워터마크
  const box3 = await send('Runtime.evaluate', { 
    expression: `(() => {
      const r = document.querySelector('.wm-rect-pink').getBoundingClientRect();
      return { x: r.left, y: r.top, width: r.width, height: r.height };
    })()`,
    returnByValue: true
  });
  const shot3 = await send('Page.captureScreenshot', { 
    format: 'png', 
    fromSurface: true, 
    clip: { x: box3.result.value.x, y: box3.result.value.y, width: box3.result.value.width, height: box3.result.value.height, scale: 1 } 
  });
  fs.writeFileSync(path.join(outDir, '말랑게임즈_워터마크_핑크직사각배지형.png'), Buffer.from(shot3.data, 'base64'));
  console.log('Saved 말랑게임즈_워터마크_핑크직사각배지형.png');

  proc.kill();
  console.log('Finished rendering watermarks!');
})();
