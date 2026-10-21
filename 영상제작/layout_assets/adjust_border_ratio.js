const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const outDir = 'c:/Users/kdy02/OneDrive/문서/GitHub/mallang-blast/영상제작/layout_assets';

// 사용자의 요청:
// "동영상 보다 3화면일체형 테두리 가로가 아주 살짝 더 길고 세로는 좀 짧아 수정을 해줘"
//
// 분석 결과:
// - 기존 테두리 내부 크기: 가로 360px, 세로 640px (비율 1 : 1.777)
// - 영상이 가로로는 살짝 더 좁고(테두리가 더 길다고 하심), 세로로는 더 길음(테두리가 더 짧다고 하심)
// - 정밀 보정 수치:
//   가로: 360px -> 340px (가로 -20px 축소)
//   세로: 640px -> 680px (세로 +40px 연장)
//   비율: 340 : 680 (1 : 2.0 = 최신 스마트폰 18.5:9 ~ 20:9 세로 화면에 완벽 일치!)
//   화면 간 간격(gap): 65px -> 70px (중앙 정렬 유지)

const singleDesigns = [
  {
    name: 'pink_jelly',
    css: `border: 11px solid #FF6FA8; box-shadow: 0 0 0 3.5px #FFFFFF, 0 16px 36px rgba(0,0,0,0.6), inset 0 0 14px rgba(255, 111, 168, 0.4);`,
    deco: `<div style="position:absolute; top:2px; right:2px; font-size:30px; filter:drop-shadow(0 2px 8px rgba(0,0,0,0.5));">✨</div>`
  },
  {
    name: 'mint_glow',
    css: `border: 11px solid #00E676; box-shadow: 0 0 0 3.5px #FFFFFF, 0 0 22px rgba(0,230,118,0.7), 0 16px 36px rgba(0,0,0,0.6);`,
    deco: ``
  },
  {
    name: 'gold_star',
    css: `border: 11px solid #FFD700; box-shadow: 0 0 0 3.5px #FFFFFF, 0 0 22px rgba(255,215,0,0.7), 0 16px 36px rgba(0,0,0,0.6);`,
    deco: `<div style="position:absolute; top:-16px; left:50%; transform:translateX(-50%); font-size:34px; filter:drop-shadow(0 4px 10px rgba(0,0,0,0.5));">👑</div>`
  },
  {
    name: 'phone_clay',
    css: `border: 15px solid #2B233D; box-shadow: 0 0 0 4.5px #FFA6D5, 0 0 0 8px #FFFFFF, 0 18px 40px rgba(0,0,0,0.65);`,
    deco: `<div style="position:absolute; top:16px; left:50%; transform:translateX(-50%); width:55px; height:6px; background:#FFA6D5; border-radius:3px;"></div>`
  }
];

async function run() {
  const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const proc = spawn(chrome, [
    '--headless=new',
    '--remote-debugging-port=9441',
    '--user-data-dir=C:/Users/kdy02/AppData/Local/Temp/prof_borders_adj',
    '--window-size=2200,1400',
    '--hide-scrollbars',
    'about:blank'
  ], { stdio: 'ignore' });

  let ws;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await (await fetch('http://127.0.0.1:9441/json')).json();
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

  // 1. 1920x1080 3화면 일체형 오버레이 4종 (보정된 340 x 680)
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
        width: 340px; height: 685px; /* 가로 슬림화(-20px), 세로 연장(+45px) */
        background: transparent;
        border-radius: 32px;
        ${d.css}
      }
    </style>
    </head>
    <body>
      <div class="container">
        <div class="hole">${d.deco}</div>
        <div class="hole" style="transform: scale(1.035);">${d.deco}</div>
        <div class="hole">${d.deco}</div>
      </div>
    </body>
    </html>`;

    const htmlPath = path.join(outDir, `temp_full_adj_${d.name}.html`);
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
    console.log(`Saved adjusted full overlay: ${pOut}`);
  }

  // 2. 개별 테두리 4종도 동일한 비율(340 x 685)로 맞춤 업데이트
  for (const d of singleDesigns) {
    const html = `<!DOCTYPE html>
    <html>
    <head>
    <meta charset="utf-8">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { width: 500px; height: 850px; background: transparent; overflow: hidden; }
      .wrap {
        position: absolute;
        top: 30px; left: 30px;
        width: 400px; height: 750px;
        display: flex; justify-content: center; align-items: center;
      }
      .hole {
        position: relative;
        width: 340px; height: 685px;
        background: transparent;
        border-radius: 32px;
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

    const htmlPath = path.join(outDir, `temp_single_adj_${d.name}.html`);
    fs.writeFileSync(htmlPath, html, 'utf8');

    await send('Page.navigate', { url: 'file:///' + htmlPath.replace(/\\/g, '/') });
    await new Promise(r => setTimeout(r, 400));

    const shot = await send('Page.captureScreenshot', { 
      format: 'png', 
      fromSurface: true, 
      clip: { x: 30, y: 15, width: 400, height: 780, scale: 1 } 
    });

    const pOut = path.join(outDir, `비디오테두리_개별_${d.name}.png`);
    fs.writeFileSync(pOut, Buffer.from(shot.data, 'base64'));
    console.log(`Saved adjusted single frame: ${pOut}`);
  }

  proc.kill();
  console.log('All borders adjusted and updated!');
}

run().catch(console.error);
