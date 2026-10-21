const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const outDir = 'c:/Users/kdy02/OneDrive/문서/GitHub/mallang-blast/영상제작/layout_assets';

// 인게임 영상 3개 프레임 규격 분석:
// 가로비율: 9:16 세로 스마트폰 비율 (예: 1080x1920 영상의 축소본)
// 1) 단독 프레임 에셋 (개별 영상 위에 씌우는 모듈형 액자):
//    - 규격: 400 x 720 (화면 영역: 가로 약 360, 세로 640 등 9:16 비율)
// 2) 3연속 풀 오버레이 (1920x1080 전체 화면에 한 방에 딱 맞물리는 일체형 액자)
//    - 프리미어 V10 트랙에 1920x1080 투명 PNG를 딱 1장만 올려놓으면 3개 화면에 정확한 위치로 테두리가 씌워짐!

// 디자인 테마 4종:
// 1. pink_jelly : 몽글몽글 핑크 젤리 둥근 프레임 + 반짝이 별빛
// 2. mint_glow  : 상큼한 민트 에메랄드 프레임 + 네온 글로우
// 3. gold_star  : 골드 리치 럭셔리 챔피언 프레임 + 별 장식
// 4. phone_clay : 귀여운 클레이 스마트폰 목업 프레임 (입체 버튼 & 스피커홀)

let renderHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: transparent;
    font-family: 'Malgun Gothic', sans-serif;
  }

  /* 개별 액자 기본 컨테이너 (420 x 750) */
  .frame-single {
    width: 420px;
    height: 750px;
    position: relative;
    padding: 24px;
    background: transparent;
    display: inline-block;
  }
  
  /* 내부 영상이 투과되는 빈 공간 (가로 360 x 세로 640 = 9:16) */
  .screen-hole {
    width: 360px;
    height: 640px;
    background: transparent;
    border-radius: 32px;
  }

  /* 1. 핑크 젤리 테두리 */
  .theme-pink .screen-hole {
    border: 12px solid #FF6FA8;
    box-shadow: 
      0 0 0 4px #FFFFFF,
      0 12px 30px rgba(0,0,0,0.5),
      inset 0 0 16px rgba(255, 111, 168, 0.4);
  }
  .theme-pink .deco-star {
    position: absolute;
    top: 14px; right: 14px;
    font-size: 26px;
    filter: drop-shadow(0 2px 6px rgba(0,0,0,0.4));
  }

  /* 2. 민트 글로우 테두리 */
  .theme-mint .screen-hole {
    border: 12px solid #00E676;
    box-shadow: 
      0 0 0 4px #FFFFFF,
      0 0 24px rgba(0, 230, 118, 0.6),
      0 12px 30px rgba(0,0,0,0.5);
  }

  /* 3. 골드 럭셔리 테두리 */
  .theme-gold .screen-hole {
    border: 12px solid #FFD700;
    box-shadow: 
      0 0 0 4px #FFFFFF,
      0 0 20px rgba(255, 215, 0, 0.6),
      0 12px 30px rgba(0,0,0,0.5);
  }

  /* 4. 클레이 스마트폰 목업 테두리 */
  .theme-clay .screen-hole {
    border: 16px solid #2B233D;
    box-shadow: 
      0 0 0 5px #FFA6D5,
      0 0 0 9px #FFFFFF,
      0 16px 36px rgba(0,0,0,0.6);
  }
  .theme-clay .speaker-bar {
    position: absolute;
    top: 32px; left: 50%;
    transform: translateX(-50%);
    width: 50px; height: 6px;
    background: #FFA6D5;
    border-radius: 3px;
  }

  /* B. 1920x1080 3개 화면 일체형 마스터 오버레이 */
  .full-1080p {
    width: 1920px;
    height: 1080px;
    position: relative;
    background: transparent;
  }
  .screens-wrap {
    position: absolute;
    inset: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 65px;
  }
  .full-frame {
    width: 360px;
    height: 640px;
    border-radius: 32px;
  }
  .full-pink .full-frame {
    border: 10px solid #FF6FA8;
    box-shadow: 0 0 0 4px #FFFFFF, 0 16px 36px rgba(0,0,0,0.55), inset 0 0 14px rgba(255, 111, 168, 0.35);
  }
  .full-mint .full-frame {
    border: 10px solid #00E676;
    box-shadow: 0 0 0 4px #FFFFFF, 0 0 20px rgba(0,230,118,0.5), 0 16px 36px rgba(0,0,0,0.55);
  }
  .full-gold .full-frame {
    border: 10px solid #FFD700;
    box-shadow: 0 0 0 4px #FFFFFF, 0 0 20px rgba(255,215,0,0.5), 0 16px 36px rgba(0,0,0,0.55);
  }
  .full-clay .full-frame {
    border: 14px solid #2B233D;
    box-shadow: 0 0 0 4px #FFA6D5, 0 0 0 8px #FFFFFF, 0 16px 36px rgba(0,0,0,0.55);
  }
</style>
</head>
<body>
  <!-- 개별 테두리들 -->
  <div id="target-pink" class="frame-single theme-pink"><div class="screen-hole"></div><div class="deco-star">✨</div></div>
  <div id="target-mint" class="frame-single theme-mint"><div class="screen-hole"></div></div>
  <div id="target-gold" class="frame-single theme-gold"><div class="screen-hole"></div></div>
  <div id="target-clay" class="frame-single theme-clay"><div class="screen-hole"></div><div class="speaker-bar"></div></div>

  <!-- 1920x1080 3화면 일체형 오버레이 -->
  <div id="full-pink" class="full-1080p full-pink"><div class="screens-wrap"><div class="full-frame"></div><div class="full-frame"></div><div class="full-frame"></div></div></div>
  <div id="full-mint" class="full-1080p full-mint"><div class="screens-wrap"><div class="full-frame"></div><div class="full-frame"></div><div class="full-frame"></div></div></div>
  <div id="full-gold" class="full-1080p full-gold"><div class="screens-wrap"><div class="full-frame"></div><div class="full-frame"></div><div class="full-frame"></div></div></div>
  <div id="full-clay" class="full-1080p full-clay"><div class="screens-wrap"><div class="full-frame"></div><div class="full-frame"></div><div class="full-frame"></div></div></div>
</body>
</html>`;

fs.writeFileSync(path.join(outDir, 'render_video_borders.html'), renderHtml, 'utf8');

(async () => {
  const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const proc = spawn(chrome, [
    '--headless=new',
    '--remote-debugging-port=9445',
    '--user-data-dir=' + path.join(outDir, 'prof_vars_borders'),
    '--window-size=2200,2200',
    '--hide-scrollbars',
    'about:blank'
  ], { stdio: 'ignore' });

  let ws;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await (await fetch('http://127.0.0.1:9445/json')).json();
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
  await send('Page.navigate', { url: 'file:///' + path.join(outDir, 'render_video_borders.html').replace(/\\/g, '/') });
  await new Promise(r => setTimeout(r, 800));

  // 1. 개별 액자 4종 캡처 (420 x 750)
  const singleTypes = ['pink', 'mint', 'gold', 'clay'];
  for (const t of singleTypes) {
    const box = await send('Runtime.evaluate', { 
      expression: `(() => {
        const r = document.querySelector('#target-${t}').getBoundingClientRect();
        return { x: r.left, y: r.top, width: r.width, height: r.height };
      })()`,
      returnByValue: true
    });
    const shot = await send('Page.captureScreenshot', { 
      format: 'png', 
      fromSurface: true, 
      clip: box.result.value 
    });
    const pOut = path.join(outDir, `비디오테두리_개별_${t}.png`);
    fs.writeFileSync(pOut, Buffer.from(shot.data, 'base64'));
    console.log(`Saved ${pOut}`);
  }

  // 2. 1920x1080 3화면 일체형 마스터 오버레이 4종 캡처
  for (const t of singleTypes) {
    const box = await send('Runtime.evaluate', { 
      expression: `(() => {
        const r = document.querySelector('#full-${t}').getBoundingClientRect();
        return { x: r.left, y: r.top, width: r.width, height: r.height };
      })()`,
      returnByValue: true
    });
    const shot = await send('Page.captureScreenshot', { 
      format: 'png', 
      fromSurface: true, 
      clip: box.result.value 
    });
    const pOut = path.join(outDir, `비디오테두리_3화면일체형_${t}.png`);
    fs.writeFileSync(pOut, Buffer.from(shot.data, 'base64'));
    console.log(`Saved ${pOut}`);
  }

  proc.kill();
  console.log('All video borders generated successfully!');
})();
