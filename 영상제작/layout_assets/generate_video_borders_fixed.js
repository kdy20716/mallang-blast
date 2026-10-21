const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const outDir = 'c:/Users/kdy02/OneDrive/문서/GitHub/mallang-blast/영상제작/layout_assets';

// 9:16 인게임 세로 영상 테두리
// 개별 액자 크기: 420x740 (내부 홀: 360x640 = 정확한 9:16)
// 3화면 일체형 오버레이: 1920x1080 (3화면 중앙 정렬)

const singleDesigns = [
  {
    name: 'pink_jelly',
    css: `border: 12px solid #FF6FA8; box-shadow: 0 0 0 4px #FFFFFF, 0 16px 36px rgba(0,0,0,0.6), inset 0 0 16px rgba(255, 111, 168, 0.4);`,
    deco: `<div style="position:absolute; top:2px; right:2px; font-size:32px; filter:drop-shadow(0 2px 8px rgba(0,0,0,0.5));">✨</div>`
  },
  {
    name: 'mint_glow',
    css: `border: 12px solid #00E676; box-shadow: 0 0 0 4px #FFFFFF, 0 0 24px rgba(0,230,118,0.7), 0 16px 36px rgba(0,0,0,0.6);`,
    deco: ``
  },
  {
    name: 'gold_star',
    css: `border: 12px solid #FFD700; box-shadow: 0 0 0 4px #FFFFFF, 0 0 24px rgba(255,215,0,0.7), 0 16px 36px rgba(0,0,0,0.6);`,
    deco: `<div style="position:absolute; top:-18px; left:50%; transform:translateX(-50%); font-size:36px; filter:drop-shadow(0 4px 10px rgba(0,0,0,0.5));">👑</div>`
  },
  {
    name: 'phone_clay',
    css: `border: 16px solid #2B233D; box-shadow: 0 0 0 5px #FFA6D5, 0 0 0 9px #FFFFFF, 0 18px 40px rgba(0,0,0,0.65);`,
    deco: `<div style="position:absolute; top:18px; left:50%; transform:translateX(-50%); width:60px; height:6px; background:#FFA6D5; border-radius:3px;"></div>`
  }
];

async function run() {
  const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const proc = spawn(chrome, [
    '--headless=new',
    '--remote-debugging-port=9444',
    '--user-data-dir=' + path.join(outDir, 'prof_vars_borders2'),
    '--window-size=2200,1400',
    '--hide-scrollbars',
    'about:blank'
  ], { stdio: 'ignore' });

  let ws;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await (await fetch('http://127.0.0.1:9444/json')).json();
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

  // 1. 개별 액자 4종 렌더링
  for (const d of singleDesigns) {
    const html = `<!DOCTYPE html>
    <html>
    <head>
    <meta charset="utf-8">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { width: 500px; height: 800px; background: transparent; overflow: hidden; }
      .wrap {
        position: absolute;
        top: 30px; left: 30px;
        width: 420px; height: 720px;
        display: flex; justify-content: center; align-items: center;
      }
      .hole {
        position: relative;
        width: 360px; height: 640px; /* 9:16 비율 */
        background: transparent;
        border-radius: 34px;
        ${d.css}
      }
    </style>
    </head>
    <body>
      <div class="wrap">
        <div class="hole">${d.deco}</div>
      </div>
    </body>
    </html>`;

    const htmlPath = path.join(outDir, `temp_single_${d.name}.html`);
    fs.writeFileSync(htmlPath, html, 'utf8');

    await send('Page.navigate', { url: 'file:///' + htmlPath.replace(/\\/g, '/') });
    await new Promise(r => setTimeout(r, 400));

    const shot = await send('Page.captureScreenshot', { 
      format: 'png', 
      fromSurface: true, 
      clip: { x: 30, y: 15, width: 420, height: 750, scale: 1 } 
    });

    const pOut = path.join(outDir, `비디오테두리_개별_${d.name}.png`);
    fs.writeFileSync(pOut, Buffer.from(shot.data, 'base64'));
    console.log(`Saved ${pOut}`);
  }

  // 2. 1920x1080 3화면 일체형 오버레이 4종 렌더링
  for (const d of singleDesigns) {
    const html = `<!DOCTYPE html>
    <html>
    <head>
    <meta charset="utf-8">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { width: 1920px; height: 1080px; background: transparent; overflow: hidden; }
      .container {
        width: 1920px; height: 1080px;
        display: flex; justify-content: center; align-items: center;
        gap: 65px;
      }
      .hole {
        position: relative;
        width: 360px; height: 640px; /* 9:16 비율 */
        background: transparent;
        border-radius: 34px;
        ${d.css}
      }
    </style>
    </head>
    <body>
      <div class="container">
        <div class="hole">${d.deco}</div>
        <div class="hole" style="transform: scale(1.04);">${d.deco}</div>
        <div class="hole">${d.deco}</div>
      </div>
    </body>
    </html>`;

    const htmlPath = path.join(outDir, `temp_full_${d.name}.html`);
    fs.writeFileSync(htmlPath, html, 'utf8');

    await send('Page.navigate', { url: 'file:///' + htmlPath.replace(/\\/g, '/') });
    await new Promise(r => setTimeout(r, 500));

    const shot = await send('Page.captureScreenshot', { 
      format: 'png', 
      fromSurface: true, 
      clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 1 } 
    });

    const pOut = path.join(outDir, `비디오테두리_3화면일체형_${d.name}.png`);
    fs.writeFileSync(pOut, Buffer.from(shot.data, 'base64'));
    console.log(`Saved ${pOut}`);
  }

  proc.kill();
  console.log('Finished all video borders!');
}

run().catch(console.error);
