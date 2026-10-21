const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const outDir = 'c:/Users/kdy02/OneDrive/문서/GitHub/mallang-blast/영상제작';
// 리마스터 버전 이미지 읽기
const srcJpg = path.join(outDir, 'MALLANG_GAMES_LOGO_REMASTER.jpg');
const b64 = fs.readFileSync(srcJpg).toString('base64');

// 외부 플러드 필(Flood Fill / BFS) 기반 배경 제거 알고리즘:
// 이미지의 바깥쪽 가장자리(테두리)에서부터 시작하여 연속적으로 연결된 '흰색 배경'만 타고 들어가 투명화합니다.
// 이렇게 하면 캐릭터 눈동자의 하이라이트(흰색 빛), 글씨의 안쪽 흰색 하트(A 안), 텍스트의 흰색 윤곽선 등
// 로고 내부에 있는 모든 흰색 디테일은 100% 보존됩니다!

let renderHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
</head>
<body style="margin:0; background:transparent;">
  <canvas id="cv" width="1024" height="1024"></canvas>
  <script>
    const img = new Image();
    img.src = 'data:image/jpeg;base64,${b64}';
    img.onload = () => {
      const cv = document.getElementById('cv');
      const ctx = cv.getContext('2d');
      const w = 1024, h = 1024;
      ctx.drawImage(img, 0, 0, w, h);
      
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      // 1. 방문 여부 및 외부 배경 여부 마스크
      const isBg = new Uint8Array(w * h);
      const queue = new Int32Array(w * h);
      let head = 0, tail = 0;

      // 색상이 배경 흰색(가까운 색상)인지 판별
      // JPEG 압축 노이즈를 고려하여 R,G,B가 모두 238 이상이면 배경 후보로 판정
      function isWhitePixel(idx) {
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        return (r >= 238 && g >= 238 && b >= 238);
      }

      // 4면의 테두리 픽셀을 큐에 추가
      for (let x = 0; x < w; x++) {
        // 상단 테두리
        const topIdx = (0 * w + x) * 4;
        if (isWhitePixel(topIdx)) {
          isBg[0 * w + x] = 1;
          queue[tail++] = (0 * w + x);
        }
        // 하단 테두리
        const botIdx = ((h - 1) * w + x) * 4;
        if (isWhitePixel(botIdx)) {
          isBg[(h - 1) * w + x] = 1;
          queue[tail++] = ((h - 1) * w + x);
        }
      }
      for (let y = 0; y < h; y++) {
        // 좌측 테두리
        const leftIdx = (y * w + 0) * 4;
        if (!isBg[y * w + 0] && isWhitePixel(leftIdx)) {
          isBg[y * w + 0] = 1;
          queue[tail++] = (y * w + 0);
        }
        // 우측 테두리
        const rightIdx = (y * w + (w - 1)) * 4;
        if (!isBg[y * w + (w - 1)] && isWhitePixel(rightIdx)) {
          isBg[y * w + (w - 1)] = 1;
          queue[tail++] = (y * w + (w - 1));
        }
      }

      // 2. BFS 탐색 (Flood Fill): 바깥에서 연결된 흰색만 추적
      const dx = [1, -1, 0, 0];
      const dy = [0, 0, 1, -1];

      while (head < tail) {
        const curr = queue[head++];
        const cx = curr % w;
        const cy = Math.floor(curr / w);

        for (let i = 0; i < 4; i++) {
          const nx = cx + dx[i];
          const ny = cy + dy[i];

          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            const npos = ny * w + nx;
            if (!isBg[npos]) {
              const nIdx = npos * 4;
              if (isWhitePixel(nIdx)) {
                isBg[npos] = 1;
                queue[tail++] = npos;
              }
            }
          }
        }
      }

      // 3. 외부 배경으로 판명된 픽셀만 부드럽게 알파 투명화
      // 로고 내부의 흰색(눈 하이라이트, 글자 안쪽 흰색 등)은 isBg가 0이므로 절대 건드리지 않음!
      for (let pos = 0; pos < w * h; pos++) {
        if (isBg[pos]) {
          const idx = pos * 4;
          const r = data[idx], g = data[idx + 1], b = data[idx + 2];
          const brightness = (r + g + b) / 3;
          if (brightness >= 248) {
            data[idx + 3] = 0; // 완전 투명
          } else {
            // 경계선 안티앨리어싱 부드럽게 페더링
            const alpha = 1 - (brightness - 238) / 10;
            data[idx + 3] = Math.round(data[idx + 3] * Math.max(0, Math.min(1, alpha)));
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
      window.done = true;
    };
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(outDir, 'render_floodfill_remaster.html'), renderHtml, 'utf8');

(async () => {
  const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const proc = spawn(chrome, [
    '--headless=new',
    '--remote-debugging-port=9447',
    '--user-data-dir=' + path.join(outDir, 'prof_vars_floodfill'),
    '--window-size=1200,1200',
    '--hide-scrollbars',
    'about:blank'
  ], { stdio: 'ignore' });

  let ws;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await (await fetch('http://127.0.0.1:9447/json')).json();
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
  await send('Page.navigate', { url: 'file:///' + path.join(outDir, 'render_floodfill_remaster.html').replace(/\\/g, '/') });

  for (let i = 0; i < 40; i++) {
    const res = await send('Runtime.evaluate', { expression: 'window.done' });
    if (res.result && res.result.value) break;
    await new Promise(r => setTimeout(r, 100));
  }

  const shot = await send('Page.captureScreenshot', { 
    format: 'png', 
    fromSurface: true, 
    clip: { x: 0, y: 0, width: 1024, height: 1024, scale: 1 } 
  });
  
  const outPath = path.join(outDir, 'MALLANG_GAMES_LOGO_REMASTER_TRANSPARENT.png');
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  console.log(`Saved outer-background-only transparent logo to ${outPath}`);

  proc.kill();
})();
