const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const baseDir = path.resolve(__dirname);
const assetsDir = path.resolve(baseDir, '../../발표자료/assets');

const themes = [
  { name: 'pink', mascot: 'mascot_0.png', svgTL: 'svg_top_left_pink.svg' },
  { name: 'mint', mascot: 'mascot_1.png', svgTL: 'svg_top_left_mint.svg' },
  { name: 'gold', mascot: 'mascot_2.png', svgTL: 'svg_top_left_gold.svg' },
  { name: 'purple', mascot: 'mascot_3.png', svgTL: 'svg_top_left_purple.svg' }
];

async function run() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    userDataDir: path.join(baseDir, 'prof_vars_2x'),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--force-device-scale-factor=1']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1400, deviceScaleFactor: 1 });

  const htmlPath = 'file:///' + path.join(baseDir, 'render_variations_2x.html').replace(/\\/g, '/');
  await page.goto(htmlPath);

  for (const t of themes) {
    const mascotB64 = fs.readFileSync(path.join(assetsDir, t.mascot)).toString('base64');
    const svgTLContent = fs.readFileSync(path.join(baseDir, t.svgTL)).toString('base64');

    await page.evaluate(({ svgTLContent, mascotB64 }) => {
      const container = document.getElementById('container');
      container.innerHTML = `
        <div class="box-tl" id="target">
          <img class="svg-bg" src="data:image/svg+xml;base64,${svgTLContent}" />
          <img class="mascot" src="data:image/png;base64,${mascotB64}" />
        </div>
      `;
    }, { svgTLContent, mascotB64 });

    await new Promise(r => setTimeout(r, 100));

    const element = await page.$('#target');
    const outPng = path.join(baseDir, `corner_top_left_${t.name}.png`);
    await element.screenshot({
      path: outPng,
      omitBackground: true
    });
    console.log('Saved:', outPng);
  }

  await browser.close();
}

run().catch(console.error);
