// Renders a reel template to MP4. Sound cues come from the page's window.AUDIO:
// [file in assets/audio, start (s), volume, kind?]; kind 'music' gets fades and is trimmed to length.
if (!process.env.HTML) { console.error('usage: HTML=<reel>/index.html [OUT=file.mp4] [HQ=1] [NOMUSIC=1] node tools/render.js'); process.exit(1); }
const { spawn } = require('child_process');
const path = require('path');
const ffmpeg = require('ffmpeg-static');
const open = require('./stills');
// 'voices/x.wav' is relative to the reel's folder; anything else is a file in the app's assets/audio
const audioPath = f => f.startsWith('voices/') ? path.join(HTML_DIR, f) : (/^[A-Za-z]:/.test(f) || f.startsWith('/') ? f : AUD + f);

// HQ=1: master for Instagram upload (lossless PNG frames, 60fps, near-lossless H.264, 256k audio)
const HQ = !!process.env.HQ;
const FPS = +(process.env.FPS || (HQ ? 60 : 30));   // FPS=30 for long YouTube episodes
const AUD = path.join(__dirname, '../../../assets/audio/');   // the app's own sound files
const HTML_DIR = path.dirname(path.resolve(process.env.HTML));
const OUT = path.resolve(process.env.OUT || path.join(HTML_DIR, 'reel.mp4'));

(async () => {
  const { b, pg } = await open();
  const { dur, cues: all } = await pg.evaluate(() => ({ dur: window.DURATION, cues: window.AUDIO }));
  // NOMUSIC=1: sound effects only, at their natural level (music gets added in Instagram)
  const noMusic = !!process.env.NOMUSIC;
  // skip clips that don't exist yet (e.g. a voice line still waiting on the TTS rate limit)
  const fs = require('fs');
  const cues = (noMusic ? all.filter(c => c[3] !== 'music') : all).filter(c => fs.existsSync(audioPath(c[0])) || (console.log('missing, skipped:', c[0].split('/').pop()), false));

  const args = ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-'];
  cues.forEach(([f]) => args.push('-i', audioPath(f)));
  // no sounds yet (e.g. a first-page preview): feed a silent track so the mix still has an input
  if (!cues.length) { args.push('-f', 'lavfi', '-t', String(dur), '-i', 'anullsrc=r=48000:cl=stereo'); cues.push(['__silence__', 0, 1]); }
  const chains = cues.map(([f, at, vol, kind, keep], i) => {
    if (f === '__silence__') return `[${i + 1}:a]anull[a${i}]`;
    const ms = Math.round(at * 1000);
    const shape = kind === 'music' ? `atrim=0:${dur},afade=t=in:d=0.4,afade=t=out:st=${dur - 1.6}:d=1.6,`
      : kind === 'voice' ? `atrim=0:${keep},afade=t=out:st=${keep - 0.15}:d=0.15,` : '';
    return `[${i + 1}:a]${shape}aresample=48000,aformat=channel_layouts=stereo,volume=${vol},adelay=${ms}|${ms}[a${i}]`;
  });
  const mix = cues.map((_, i) => `[a${i}]`).join('') +
    `amix=inputs=${cues.length}:normalize=0,${noMusic && !cues.some(c => c[3] === "voice") ? "" : "loudnorm=I=-15:TP=-1.5:LRA=11,aresample=48000,"}apad,atrim=0:${dur}[aout]`;
  args.push('-filter_complex', [...chains, mix].join(';'),
    '-map', '0:v', '-map', '[aout]',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-crf', HQ ? '12' : '17', '-preset', HQ ? 'slow' : 'medium', ...(HQ ? ['-level:v', '4.2', '-g', String(FPS * 2), '-bf', '2', '-vf', 'scale=out_color_matrix=bt709:out_range=tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'] : []), '-r', String(FPS),
    '-c:a', 'aac', '-b:a', HQ ? '256k' : '192k', '-ar', '48000', '-movflags', '+faststart', '-t', String(dur), OUT);

  const ff = spawn(ffmpeg, args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = ''; ff.stderr.on('data', d => { err = (err + d).slice(-3000); });
  const done = new Promise(r => ff.on('close', r));

  const n = Math.round(dur * FPS);
  for (let i = 0; i < n; i++) {
    await pg.evaluate(t => seek(t), i / FPS);
    const buf = await pg.screenshot(HQ ? { type: 'png' } : { type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log(`frame ${i}/${n}`);
  }
  ff.stdin.end();
  const code = await done;
  await b.close();
  if (code !== 0) { console.error(err); process.exit(1); }
  console.log('wrote', OUT, `(${cues.length} sound cues)`);
})();
