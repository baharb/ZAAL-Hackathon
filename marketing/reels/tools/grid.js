// node grid.js out.jpg a.jpg b.jpg ... — tiles stills 4 across at 1/3 size
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const CHROME = process.env.CHROME_PATH || (process.platform === 'win32'
  ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  : process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : '/usr/bin/google-chrome');
(async () => {
  const [out, ...files] = process.argv.slice(2);
  const html = `<body style="margin:0;background:#222;display:grid;grid-template-columns:repeat(4,360px);gap:6px">` +
    files.map(f => `<img src="${pathToFileURL(path.resolve(f)).href}" style="width:360px;height:640px">`).join('');
  const tmp = path.resolve('_grid.html');
  fs.writeFileSync(tmp, html);
  const b = await puppeteer.launch({ executablePath: CHROME, args: ['--allow-file-access-from-files'] });
  const pg = await b.newPage();
  await pg.setViewport({ width: 4 * 360 + 18, height: Math.ceil(files.length / 4) * 646 });
  await pg.goto(pathToFileURL(tmp).href, { waitUntil: 'networkidle0' });
  await pg.screenshot({ path: path.resolve(out), type: 'jpeg', quality: 80 });
  await b.close();
})();
