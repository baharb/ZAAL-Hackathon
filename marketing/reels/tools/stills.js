// HTML=<reel>/index.html node tools/stills.js 1.5 3 ...  -> still_<t>.jpg frames of the reel at those times
const puppeteer = require('puppeteer-core');
const { pathToFileURL } = require('url');
const path = require('path');
const CHROME = process.env.CHROME_PATH || (process.platform === 'win32'
  ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  : process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : '/usr/bin/google-chrome');

async function open() {
  const b = await puppeteer.launch({
    executablePath: CHROME,
    args: ['--allow-file-access-from-files'],
  });
  const pg = await b.newPage();
  await pg.setViewport({ width: 1080, height: +(process.env.H || 1920) });   // H=1350 for 4:5 image posts
  await pg.goto(pathToFileURL(path.resolve(process.env.HTML)).href, { waitUntil: 'networkidle0' });
  await pg.evaluate(() => document.fonts.ready);
  await pg.evaluate(() => window.layout && window.layout());
  return { b, pg };
}
module.exports = open;

if (require.main === module) (async () => {
  const { b, pg } = await open();
  for (const t of process.argv.slice(2)) {
    await pg.evaluate(t => typeof seek === "function" && seek(+t), t);   // still posts have no timeline
    await pg.screenshot({ path: path.resolve(`${process.env.PFX || 'still'}_${t}.jpg`), quality: 70, type: 'jpeg' });
  }
  await b.close();
})();
