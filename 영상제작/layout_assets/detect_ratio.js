const fs = require('fs');
const { spawn } = require('child_process');

const imgPath = 'C:/Users/kdy02/.gemini/antigravity/brain/d20baea5-04c8-4a7e-bb46-e0b55c98e580/.user_uploaded/media_1792602827137_9975a66b.png';
const b64 = fs.readFileSync(imgPath).toString('base64');

(async () => {
  const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const proc = spawn(chrome, [
    '--headless=new',
    '--remote-debugging-port=9442',
    '--user-data-dir=C:/Users/kdy02/AppData/Local/Temp/prof_ratio',
    '--hide-scrollbars',
    'about:blank'
  ], { stdio: 'ignore' });

  let ws;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await (await fetch('http://127.0.0.1:9442/json')).json();
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
  await send('Page.navigate', { url: 'data:text/html,<canvas id="cv"></canvas>' });
  await new Promise(r => setTimeout(r, 300));

  const ratio = await send('Runtime.evaluate', {
    expression: `new Promise(resolve => {
      const img = new Image();
      img.src = 'data:image/png;base64,${b64}';
      img.onload = () => {
        const cv = document.getElementById('cv');
        cv.width = img.width; cv.height = img.height;
        const ctx = cv.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        const d = imgData.data;

        // Find the blue selection outline coordinates in the left video
        // Blue outline in Premiere is around (r: 40-70, g: 130-180, b: 230-255)
        let minX = 9999, maxX = -1, minY = 9999, maxY = -1;
        for (let y = 0; y < img.height; y++) {
          for (let x = 0; x < img.width * 0.45; x++) { // search left half
            const idx = (y * img.width + x) * 4;
            const r = d[idx], g = d[idx+1], b = d[idx+2];
            // Check for Premiere blue highlight outline
            if (b > 180 && b > r + 80 && g > 100) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        resolve({ imgW: img.width, imgH: img.height, minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY });
      };
    })`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('Detected Premiere Blue Handle Bounding Box:', ratio.result.value);
  proc.kill();
})();
