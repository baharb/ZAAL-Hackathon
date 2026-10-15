// Shared engine for "list" reels: a hook page, a few item pages, and an ending with the app download block.
// A reel's index.html sets window.REEL = { palette, hook, items, end, speech } and loads this file.
// Same contract as the other templates: window.seek(t), window.DURATION, window.AUDIO, window.layout().
(function () {
  const R = window.REEL;
  const P = R.palette;
  const CH = new URL('../../../assets/neli-world/characters/', location.href).href;
  const art = p => new URL(p, CH).href;

  document.head.insertAdjacentHTML('beforeend', `<link href="https://fonts.googleapis.com/css2?family=Lalezar&family=Nunito:wght@700;800;900&display=block" rel="stylesheet">
<style>
:root{--bg:${P.bg};--shape:${P.shape};--onshape:${P.onshape};--ink:${P.ink};--ink2:${P.ink2};--card:#fff}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1920px;overflow:hidden}
body{background:var(--bg);font-family:'Nunito',sans-serif;color:var(--ink);position:relative}
.a{position:absolute;will-change:transform}
.scene{position:absolute;inset:0;display:none}
/* Instagram safe area: text within x 130..950, content above y ~1600 */
.stack{position:absolute;left:0;width:1080px;display:flex;flex-direction:column;align-items:center;text-align:center}
.fa{direction:rtl;font-family:'Lalezar',sans-serif;line-height:1.25;text-wrap:balance;max-width:830px}
.fa .w{display:inline-block}
.en{font-weight:900;font-size:50px;line-height:1.25;margin-top:22px;max-width:820px}
.pill{background:var(--shape);color:var(--onshape);font-weight:900;font-size:46px;padding:14px 40px 12px;border-radius:60px}
.count{background:var(--card);color:var(--ink);font-family:'Lalezar';font-size:52px;line-height:1;padding:18px 34px 8px;border-radius:60px}
.bubble{position:relative;background:var(--card);border-radius:64px;padding:44px 56px 40px;max-width:900px}
.bubble:after{content:'';position:absolute;bottom:-46px;left:30%;border:34px solid transparent;border-top:50px solid var(--card)}
.emoji{font-size:300px;line-height:1}
.icon{width:250px;height:250px;border-radius:66px;box-shadow:0 16px 0 rgba(0,0,0,.18)}
.stores{display:flex;gap:24px;margin-top:30px}
.store{background:#111;color:#fff;border-radius:26px;padding:16px 30px 14px;text-align:left;display:flex;align-items:center;gap:18px}
.store svg{width:52px;height:52px}
.store small{display:block;font-weight:800;font-size:22px;opacity:.85}
.store span{display:block;font-weight:900;font-size:38px;line-height:1.05}
</style>`);

  const words = (txt, at, step) => { let n = 0; return txt.split(/\s+/).map(w => w === '|' ? '<br>' :
    `<span class="w" data-in="${(at + n++ * step).toFixed(2)}" data-anim="word">${w}</span>`).join(' '); };
  const STORES = `<div class="stores" data-in="2.0" data-anim="pop">
    <div class="store"><svg viewBox="0 0 24 24"><path fill="#fff" d="M16.4 12.6c0-2.5 2-3.6 2.1-3.7-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.1 2.5-1.8 3.1-.5 7.6 1.3 10.1.8 1.2 1.8 2.6 3.1 2.5 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.4-.9-2.4-3.6zM14 5.3c.7-.8 1.1-1.9 1-3-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.2-.6 2.9-1.4z"/></svg><div><small>Download on the</small><span>App Store</span></div></div>
    <div class="store"><svg viewBox="0 0 24 24"><path fill="#34d27b" d="M3.6 1.8 13.8 12 3.6 22.2c-.4-.2-.6-.6-.6-1.1V2.9c0-.5.2-.9.6-1.1z"/><path fill="#ffce3a" d="m17.2 15.4-3.4-3.4 3.4-3.4 4 2.3c1.1.6 1.1 1.7 0 2.3z"/><path fill="#ff4f5e" d="M17.2 15.4 13.8 12 3.6 22.2c.4.2.9.2 1.4-.1z"/><path fill="#3fa9ff" d="M17.2 8.6 5 1.9c-.5-.3-1-.3-1.4-.1L13.8 12z"/></svg><div><small>GET IT ON</small><span>Google Play</span></div></div></div>`;
  const FA = '۰۱۲۳۴۵۶۷۸۹', faNum = n => String(n).replace(/\d/g, d => FA[d]);

  // --- pages ---
  const H = R.hook, N = R.items.length;
  let html = `
<svg class="a" id="b1" viewBox="0 0 200 200" style="width:560px;left:-230px;top:110px"><path fill="var(--shape)" d="M100 12C122 10 128 40 146 44 168 48 190 40 192 66 194 90 166 96 170 116 174 138 196 156 180 176 164 194 140 176 120 184 100 192 86 200 68 186 50 172 62 150 46 138 28 124 4 128 6 104 8 80 34 84 38 64 42 44 22 26 42 16 62 6 80 14 100 12Z"/></svg>
<svg class="a" id="b2" viewBox="0 0 200 200" style="width:520px;right:-110px;top:1090px"><path fill="var(--shape)" d="M62 28C96 4 132 22 150 40 170 60 196 58 192 92 188 120 168 124 176 150 186 182 150 200 118 188 92 178 82 198 50 186 18 174 28 144 16 120 2 92 12 70 30 56 42 46 46 40 62 28Z"/></svg>
<div class="scene" data-i="0">
  <div class="stack" style="top:${H.top || 300}px">
    <div class="fa" style="font-size:${H.size || 116}px;line-height:1.2">${words(H.fa, 0.2, 0.22)}</div>
    <div class="en" data-in="1.5" data-anim="up">${H.en}</div>
    ${H.pill ? `<div class="pill" style="margin-top:30px" data-in="1.9" data-anim="pop">${H.pill}</div>` : ''}
  </div>
  <img class="a" src="${art(H.art)}" style="width:${H.artW || 470}px;left:${H.artX || 170}px;top:${H.artY || 1080}px" data-in=".35" data-anim="rise" data-bob="1">
</div>`;
  R.items.forEach((it, i) => {
    html += `
<div class="scene" data-i="${i + 1}">
  <div class="stack" style="top:230px"><div class="count" data-in=".05" data-anim="pop">${faNum(i + 1)} / ${faNum(N)}</div></div>
  <div class="stack" style="top:${it.top || 400}px">
    <div class="bubble" data-in=".15" data-anim="pop"><div class="fa" style="font-size:${it.size || 120}px;line-height:1.15">${words(it.fa, 0.3, 0.18)}</div></div>
    <div class="pill" style="margin-top:78px;max-width:880px;white-space:nowrap;font-size:${it.enSize || 46}px" data-in="${it.enAt || 1.3}" data-anim="pop">${it.en}</div>
    ${it.note ? `<div class="en" style="font-size:42px;margin-top:20px" data-in="${(it.enAt || 1.3) + 0.4}" data-anim="up">${it.note}</div>` : ''}
  </div>
  ${it.emoji ? `<div class="a emoji" style="left:${it.emojiX || 190}px;top:${it.emojiY || 1150}px" data-in=".5" data-anim="pop" data-bob="1">${it.emoji}</div>` : ''}
  ${it.art ? `<img class="a" src="${art(it.art)}" style="width:${it.artW || 420}px;left:${it.artX || 170}px;top:${it.artY || 1190}px" data-in=".3" data-anim="rise" data-bob="1">` : ''}
</div>`;
  });
  const E = R.end;
  html += `
<div class="scene" data-i="${N + 1}">
  <div class="stack" style="top:150px">
    <img class="icon" src="../../../assets/icon.png" data-in=".05" data-anim="pop">
    <div class="fa" style="font-size:${E.size || 96}px;line-height:1.2;margin-top:34px">${words(E.fa, 0.3, 0.2)}</div>
    <div class="en" data-in="1.4" data-anim="up">${E.en}</div>
    ${STORES}
    <div class="pill" style="margin-top:30px" data-in="2.4" data-anim="pop">${E.pill}</div>
  </div>
  <img class="a" src="${art(E.art || 'Neli/04_dancing_base.webp')}" style="width:360px;left:360px;top:1250px" data-in=".5" data-anim="rise" data-bob="1">
</div>
<img class="a" id="wm" src="../../../assets/logo-white.webp" style="width:240px;right:120px;top:1320px">`;
  document.body.insertAdjacentHTML('afterbegin', html);

  // --- timeline from the voice clips (R.speech: page -> [clip, start, end] or null for silent pages) ---
  const LEAD = 0.35, segs = [], cues = [];
  let t = 0;
  const pages = N + 2;
  for (let i = 0; i < pages; i++) {
    const sp = R.speech && R.speech[i];
    const hold = i === 0 ? 1.1 : i === pages - 1 ? 3.0 : (R.items[i - 1].hold || 1.4);
    let len = sp ? LEAD + (sp[2] - sp[1]) + hold : (i === 0 ? 3.4 : i === pages - 1 ? 5.0 : 3.2);
    len = Math.max(len, i === 0 ? 3.4 : 2.8);
    if (sp) cues.push(['voices/' + sp[0] + '.wav', +Math.max(0, t + LEAD - sp[1]).toFixed(2), 1, 'voice', +(sp[2] + 0.12).toFixed(2)]);
    if (i > 0 && i < pages - 1) cues.push(['pop.wav', +(t + 0.12).toFixed(2), 0.3]);
    segs.push({ start: t, end: t + len }); t += len;
  }
  cues.push(['pop.wav', +(segs[pages - 1].start + 0.08).toFixed(2), 0.3]);
  cues.push(['yay-kids.wav', +(segs[pages - 1].end - 2.4).toFixed(2), 0.5]);
  window.DURATION = +t.toFixed(2);
  window.AUDIO = cues;
  window.layout = () => seek(0);
  const scenes = [...document.querySelectorAll('.scene')].map(el => ({ el, ...segs[+el.dataset.i] }));

  const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const eo = x => 1 - Math.pow(1 - cl(x), 3);
  const back = x => { x = cl(x); const c = 1.6; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  function animate(e, k) {
    const anim = e.dataset.anim; k -= +(e.dataset.in || 0);
    let op = 1, tf = '';
    if (anim === 'pop') { op = cl(k / .15); tf += `scale(${back(k / .5)})`; }
    else if (anim === 'word') { op = cl(k / .12); tf += `translateY(${(1 - eo(k / .45)) * 50}px) scale(${back(k / .45)})`; }
    else if (anim === 'up') { op = cl(k / .3); tf += `translateY(${(1 - eo(k / .5)) * 70}px)`; }
    else if (anim === 'rise') { op = cl(k / .2); tf += `translateY(${(1 - eo(k / .55)) * 520}px)`; }
    if (anim && k < 0) op = 0;
    if (e.dataset.bob && k > 0) tf += ` translateY(${Math.sin(k * 3.4) * 10}px) rotate(${Math.sin(k * 2.2) * 2}deg)`;
    e.style.opacity = op; e.style.transform = tf;
  }
  window.seek = function (t) {
    if (t < 1 / 60) t = 2.8;   // first frame = finished hook page, so it is Instagram's default cover
    scenes.forEach(s => {
      const vis = t >= s.start && t < s.end;
      s.el.style.display = vis ? 'block' : 'none';
      if (!vis) return;
      const lt = t - s.start, out = cl((t - (s.end - 0.22)) / 0.22);
      s.el.style.opacity = 1 - out;
      s.el.style.transform = `translateY(${-out * 60}px)`;
      s.el.querySelectorAll('[data-anim]').forEach(e => animate(e, lt));
    });
    document.getElementById('wm').style.opacity = t >= segs[pages - 1].start ? 0 : 1;
    document.getElementById('b1').style.transform = `rotate(${t * 6}deg)`;
    document.getElementById('b2').style.transform = `rotate(${-t * 5}deg)`;
  };
  document.fonts.ready.then(() => seek(0));
})();
