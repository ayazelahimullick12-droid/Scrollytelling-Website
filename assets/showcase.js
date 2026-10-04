/* Project showcase: scroll-driven steps, presenter keys, live apps and visuals. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const body = document.body;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /* ======================================================================
     Live apps: wake the free servers now, keep them awake, show status
     ====================================================================== */
  const LIVE = {
    agami: { url: 'https://accessible-agami.onrender.com/', status: 'idle' },
    voice: { url: 'https://brac-voice-assistant.onrender.com/healthz', status: 'idle' },
    field: { url: 'https://field-visit-v1-8.onrender.com/', status: 'idle' },
    pms:   { url: 'http://localhost:5500/', status: 'idle' },
  };
  // The project manager only runs on the presenter's laptop. When this page is opened from a public
  // address, don't contact localhost at all (Chrome would ask every visitor for local-network access):
  // its slide shows a screenshot instead.
  const ON_LAPTOP = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  if (!ON_LAPTOP) $('[data-ls="pms"]')?.remove();
  function setStatus(id, s) {
    LIVE[id].status = s;
    const dot = $(`[data-ls="${id}"] .dot`);
    if (dot) dot.className = 'dot ' + s;
    const ls = $(`[data-ls="${id}"]`);
    if (ls) ls.dataset.state = s;
    document.dispatchEvent(new CustomEvent('livestatus', { detail: { id, s } }));
  }
  async function ping(id) {
    const app = LIVE[id];
    if (id === 'pms' && !ON_LAPTOP) return setStatus(id, 'down');
    if (app.status !== 'live') setStatus(id, 'waking');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), id === 'pms' ? 6000 : 110000);
    try {
      const sep = app.url.includes('?') ? '&' : '?';
      await fetch(app.url + sep + 'wake=' + Date.now(), { mode: 'no-cors', cache: 'no-store', signal: ctrl.signal });
      setStatus(id, 'live');
    } catch (e) {
      setStatus(id, 'down');
    } finally {
      clearTimeout(timer);
    }
  }
  function pingAll() { Object.keys(LIVE).forEach(ping); }
  pingAll();
  // Render's free tier sleeps after 15 idle minutes; keep everything awake while presenting.
  setInterval(pingAll, 5 * 60 * 1000);
  // A local server that was down may have been started since: check it more often.
  if (ON_LAPTOP) setInterval(() => { if (LIVE.pms.status !== 'live') ping('pms'); }, 20000);

  /* ---------- embedded live apps ---------- */
  function fitLive(view) {
    const f = $('iframe', view);
    if (!f) return;
    const W = +view.dataset.w, H = +view.dataset.h;
    const r = view.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const expanded = view.closest('.browser.expanded');
    if (expanded) {
      f.style.width = r.width + 'px'; f.style.height = r.height + 'px'; f.style.transform = 'none';
    } else {
      const s = r.width / W;
      f.style.width = W + 'px';
      f.style.height = Math.max(H * 0.5, r.height / s) + 'px';
      f.style.transform = `scale(${s})`;
    }
  }
  function loadLive(view, force) {
    if (view.dataset.loaded && !force) return;
    view.dataset.loaded = '1';
    const id = view.dataset.live;
    if (id === 'pms' && !ON_LAPTOP) return showFallback(view);
    const cover = $('.live-cover', view);
    let f = $('iframe', view);
    if (f) f.remove();
    $('.fallback-img', view)?.remove();
    cover.classList.remove('gone');
    f = document.createElement('iframe');
    f.title = 'Live app: ' + id;
    f.allow = 'microphone; autoplay; clipboard-write; fullscreen';
    f.referrerPolicy = 'no-referrer-when-downgrade';
    f.addEventListener('load', () => {
      if (id === 'pms' && LIVE.pms.status === 'down') return showFallback(view);
      cover.classList.add('gone');
    });
    f.src = view.dataset.src;
    view.appendChild(f);
    fitLive(view);
    clearTimeout(view._slow);
    view._slow = setTimeout(() => {
      if (!cover.classList.contains('gone')) {
        const small = $('small', cover);
        if (small) small.innerHTML = `Still waking up. <a href="${view.dataset.src}" target="_blank" rel="noopener">Open it in a new tab ↗</a>`;
      }
    }, 45000);
  }
  function showFallback(view) {
    const cover = $('.live-cover', view);
    if (view.dataset.fallback && !$('.fallback-img', view)) {
      const img = new Image();
      img.className = 'fallback-img';
      img.src = view.dataset.fallback;
      img.alt = 'Screenshot of the app';
      img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top;z-index:1';
      view.appendChild(img);
    }
    cover.style.background = 'transparent';
    const msg = ON_LAPTOP ? "Screenshot · the app isn't running on this laptop. Start it, then press Reload."
                          : "Screenshot · this app runs locally, on the presenter's laptop.";
    cover.innerHTML = `<div style="align-self:end;background:rgba(0,0,0,.72);color:#fff;padding:10px 14px;border-radius:12px;font-size:13.5px;z-index:3;position:relative">${msg}</div>`;
  }
  document.addEventListener('livestatus', e => {
    if (e.detail.id === 'pms' && e.detail.s === 'live') {
      const v = $('[data-live="pms"]');
      if (v && v.dataset.loaded && $('.fallback-img', v)) restoreCover(v) || loadLive(v, true);
    }
  });
  function restoreCover(v) {
    const cover = $('.live-cover', v);
    cover.style.background = '';
    cover.innerHTML = '<div><div class="spinner"></div>Connecting…</div>';
    return false;
  }
  $$('[data-browser]').forEach(b => {
    const view = $('.view', b);
    $('[data-reload]', b).addEventListener('click', () => {
      if (view.dataset.live === 'pms') { restoreCover(view); ping('pms'); }
      loadLive(view, true);
    });
    $('[data-expand]', b).addEventListener('click', () => toggleExpand(b));
  });
  let scrollBeforeExpand = 0;
  function toggleExpand(b, force) {
    const on = force !== undefined ? force : !b.classList.contains('expanded');
    // Typing inside an expanded app can scroll this page; put it back where it was on close.
    if (on) scrollBeforeExpand = scrollY;
    else if (b.classList.contains('expanded')) requestAnimationFrame(() => scrollTo({ top: scrollBeforeExpand }));
    $$('.browser.expanded').forEach(x => { if (x !== b) x.classList.remove('expanded'); });
    b.classList.toggle('expanded', on);
    body.classList.toggle('has-expanded', on);
    $('[data-expand]', b).textContent = on ? 'Close ✕' : 'Expand ⤢';
    requestAnimationFrame(() => fitLive($('.view', b)));
  }
  $('.expand-scrim').addEventListener('click', () => $$('.browser.expanded').forEach(b => toggleExpand(b, false)));

  $$('[data-popup]').forEach(btn => btn.addEventListener('click', () => {
    const w = 440, h = Math.min(900, screen.availHeight - 40);
    const left = Math.max(0, screen.availWidth - w - 40), top = 20;
    window.open(btn.dataset.popup, 'live-voice', `popup,width=${w},height=${h},left=${left},top=${top}`);
  }));

  /* ======================================================================
     QR codes (library from cdnjs; falls back to the plain address)
     ====================================================================== */
  function drawQRs() {
    $$('[data-qr]').forEach(el => {
      const url = el.dataset.qr;
      if (window.qrcode) {
        try {
          const qr = window.qrcode(0, 'M');
          qr.addData(url); qr.make();
          el.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
          return;
        } catch (e) { /* fall through */ }
      }
      el.innerHTML = `<span class="fallback">${url}</span>`;
    });
  }
  window.addEventListener('load', drawQRs);

  /* ======================================================================
     Orb: canvas recreation of the voice assistant's orb
     ====================================================================== */
  class Orb {
    constructor(canvas) {
      this.c = canvas; this.x = canvas.getContext('2d');
      this.mode = 'idle'; this.level = 0; this.target = 0; this.t = 0; this.visible = false;
      this.bars = new Float32Array(72);
    }
    setMode(m) { this.mode = m; }
    frame(dt) {
      const { c, x } = this;
      const W = c.width, H = c.height, cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2;
      this.t += dt;
      const t = this.t;
      // a believable voice level for listening / speaking
      if (this.mode === 'listening' || this.mode === 'speaking') {
        const syll = Math.max(0, Math.sin(t * 7.3) * Math.sin(t * 2.1 + 1.3));
        this.target = 0.25 + 0.75 * syll * (0.7 + 0.3 * Math.sin(t * 13));
      } else if (this.mode === 'thinking') this.target = 0.25;
      else this.target = 0.08 + 0.05 * Math.sin(t * 1.4);
      this.level += (this.target - this.level) * Math.min(1, dt * 9);
      const L = this.level;

      x.clearRect(0, 0, W, H);
      // glow
      const g = x.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * (0.78 + L * 0.12));
      g.addColorStop(0, `rgba(255,79,168,${0.42 + L * 0.3})`);
      g.addColorStop(0.45, `rgba(230,0,126,${0.16 + L * 0.16})`);
      g.addColorStop(1, 'rgba(230,0,126,0)');
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.fill();

      // dashed rings
      const ring = (rad, rot, dash, gap, alpha, w) => {
        x.save(); x.translate(cx, cy); x.rotate(rot);
        x.setLineDash([dash, gap]); x.lineWidth = w; x.strokeStyle = `rgba(255,143,200,${alpha})`;
        x.beginPath(); x.arc(0, 0, rad, 0, Math.PI * 2); x.stroke(); x.restore();
      };
      const spin = this.mode === 'thinking' ? 2.2 : 0.35;
      ring(R * 0.62, t * spin, R * 0.05, R * 0.035, 0.45, R * 0.012);
      ring(R * 0.7, -t * spin * 0.7, R * 0.012, R * 0.03, 0.35, R * 0.01);

      const core = R * (0.36 + L * 0.05);
      if (this.mode === 'speaking') {
        // outward radial bars
        const n = this.bars.length;
        for (let i = 0; i < n; i++) {
          const want = L * (0.35 + 0.65 * Math.abs(Math.sin(i * 0.9 + t * 6) * Math.cos(i * 0.37 - t * 3.1)));
          this.bars[i] += (want - this.bars[i]) * Math.min(1, dt * 12);
        }
        x.save(); x.translate(cx, cy); x.lineCap = 'round';
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const r0 = core + R * 0.04, r1 = r0 + R * 0.04 + this.bars[i] * R * 0.2;
          x.strokeStyle = `rgba(255,${120 + this.bars[i] * 100},${190},${0.55 + this.bars[i] * 0.45})`;
          x.lineWidth = R * 0.018;
          x.beginPath(); x.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); x.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); x.stroke();
        }
        x.restore();
      }
      if (this.mode === 'listening') {
        // inward-drawn wave
        for (let k = 0; k < 3; k++) {
          const phase = ((t * 0.9 + k / 3) % 1);
          const rad = R * (0.66 - phase * 0.26);
          x.beginPath();
          for (let i = 0; i <= 120; i++) {
            const a = (i / 120) * Math.PI * 2;
            const wob = Math.sin(a * 6 + t * 5 + k) * L * R * 0.035 + Math.sin(a * 11 - t * 7) * L * R * 0.015;
            const rr = rad + wob;
            const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
            i ? x.lineTo(px, py) : x.moveTo(px, py);
          }
          x.strokeStyle = `rgba(255,170,215,${(1 - phase) * 0.7})`; x.lineWidth = R * 0.012; x.stroke();
        }
      }
      if (this.mode === 'thinking') {
        for (let i = 0; i < 3; i++) {
          const a = t * 3 + i * (Math.PI * 2 / 3);
          x.fillStyle = 'rgba(255,200,230,.9)';
          x.beginPath(); x.arc(cx + Math.cos(a) * R * 0.52, cy + Math.sin(a) * R * 0.52, R * 0.025, 0, Math.PI * 2); x.fill();
        }
      }
      // core
      const cg = x.createRadialGradient(cx - core * 0.3, cy - core * 0.35, core * 0.1, cx, cy, core);
      cg.addColorStop(0, '#FF9BCF'); cg.addColorStop(0.55, '#E6007E'); cg.addColorStop(1, '#7A0047');
      x.fillStyle = cg; x.beginPath(); x.arc(cx, cy, core, 0, Math.PI * 2); x.fill();
      x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = R * 0.008; x.stroke();
    }
  }
  const orbs = new Map();
  $$('canvas[data-orb]').forEach(cv => {
    const o = new Orb(cv);
    orbs.set(cv.dataset.orb, o);
    new IntersectionObserver(es => es.forEach(e => { o.visible = e.isIntersecting; })).observe(cv);
  });
  let lastT = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    orbs.forEach(o => { if (o.visible && o.c.offsetParent !== null) o.frame(dt); });
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Orbs that cycle through the states on their own
  const VA_LABELS = { idle: 'শুরু করতে বোতামে চাপ দিন', listening: 'শুনছি…', thinking: 'নথি খোঁজা হচ্ছে…', speaking: 'উত্তর দিচ্ছি…' };
  function cycler(orb, seq, onChange, gap = 2300) {
    let i = 0, timer = null;
    const step = () => { const m = seq[i % seq.length]; orb && orb.setMode(m); onChange && onChange(m); i++; timer = setTimeout(step, m === 'idle' ? 1500 : gap); };
    return { start() { this.stop(); i = 0; step(); }, stop() { clearTimeout(timer); } };
  }
  const miniCycle = cycler(orbs.get('mini'), ['listening', 'thinking', 'speaking'], null, 2600);
  miniCycle.start();
  const legend = $('[data-legend]');
  const voiceLabel = $('[data-state-label]');
  const voiceCycle = cycler(orbs.get('voice'), ['idle', 'listening', 'thinking', 'speaking'], m => {
    voiceLabel.textContent = VA_LABELS[m];
    $$('div[data-st]', legend).forEach(d => d.classList.toggle('on', d.dataset.st === m));
  });
  const localLabel = $('[data-local-label]');
  const localCycle = cycler(orbs.get('local'), ['listening', 'thinking', 'speaking'], m => { localLabel.textContent = VA_LABELS[m]; });

  /* ======================================================================
     Chapter visuals that animate on a step
     ====================================================================== */
  // Agami ১২৩ spoken menu
  const MENU = [
    { k: null, bn: 'এটি আপনার মূল মেনু। কোন তথ্য জানতে চান, নম্বর চেপে বেছে নিন।', en: 'This is your main menu. Choose what you want to know by pressing a number.', ms: 3400 },
    { k: '1', bn: 'ঋণের তথ্য জানতে এক চাপুন।', en: 'For your loan, press one.', ms: 2200 },
    { k: '2', bn: 'সঞ্চয়ের তথ্য জানতে দুই চাপুন।', en: 'For your savings, press two.', ms: 2200 },
    { k: '3', bn: 'বিশেষ সঞ্চয়ের তথ্য জানতে তিন চাপুন।', en: 'For special savings (DPS), press three.', ms: 2400 },
    { k: '4', bn: 'বীমার তথ্য জানতে চার চাপুন।', en: 'For insurance, press four.', ms: 2200 },
    { k: '0', bn: 'মেনুটি আবার শুনতে শূন্য চাপুন।', en: 'To hear the menu again, press zero.', ms: 2600 },
  ];
  const menuScene = $('[data-stage="agami"] .scene[data-show="4"]');
  let menuTimer = null;
  function menuPlay(i = 0) {
    const line = MENU[i % MENU.length];
    $$('.glow-tile', menuScene).forEach(g => g.classList.toggle('on', g.dataset.key === line.k));
    const say = $('[data-say]', menuScene), en = $('[data-say-en]', menuScene);
    say.textContent = line.bn; en.textContent = line.en;
    menuTimer = setTimeout(() => menuPlay(i + 1), line.ms);
  }
  function menuStop() { clearTimeout(menuTimer); $$('.glow-tile', menuScene).forEach(g => g.classList.remove('on')); }

  // Agami adaptive meter
  const RESULTS = [['ok', 1], ['ok', 1], ['bad', 1], ['ok', 1], ['ok', 2], ['ok', 2], ['bad', 2], ['ok', 3], ['ok', 3], ['ok', 3]];
  const tokWrap = $('[data-tokens]');
  tokWrap.innerHTML = RESULTS.map(() => '<span class="tok"></span>').join('');
  let meterRun = 0;
  async function meterPlay() {
    const run = ++meterRun;
    const toks = $$('.tok', tokWrap);
    const offer = $('[data-offer]'), dim = $('[data-dim]');
    toks.forEach(t => { t.className = 'tok'; t.textContent = ''; });
    offer.classList.remove('show'); dim.classList.remove('show');
    const set = (k, v, met) => { const d = $(`[data-r="${k}"]`); $('b', d).textContent = v; d.classList.toggle('met', !!met); };
    set('clean', 0); set('days', 0); set('rough', 0);
    await sleep(700);
    let clean = 0, rough = 0; const days = new Set();
    for (let i = 0; i < RESULTS.length; i++) {
      if (run !== meterRun) return;
      const [r, day] = RESULTS[i];
      toks[i].classList.add(r); toks[i].textContent = r === 'ok' ? '✓' : '✕';
      if (r === 'ok') { clean++; days.add(day); } else rough++;
      set('clean', clean, clean >= 8); set('days', days.size, days.size >= 3); set('rough', rough);
      await sleep(430);
    }
    await sleep(500);
    if (run !== meterRun) return;
    dim.classList.add('show'); offer.classList.add('show');
  }
  function meterStop() { meterRun++; }

  // Local pipeline: a highlight travelling down the stages
  const vpipe = $('[data-vpipe]');
  let pipeTimer = null;
  function pipeTravel() {
    pipeStop();
    const st = $$('.vstage', vpipe); let i = 0;
    pipeTimer = setInterval(() => { st.forEach((s, j) => s.classList.toggle('hot', j === i % st.length)); i++; }, 650);
  }
  function pipeStop() { clearInterval(pipeTimer); $$('.vstage', vpipe).forEach(s => s.classList.remove('hot')); }

  /* ---------- Field map ---------- */
  const RAMP = { lo: [205, 226, 251], hi: [13, 54, 107] };
  const rampColor = t => `rgb(${RAMP.lo.map((lo, i) => Math.round(lo + (RAMP.hi[i] - lo) * t)).join(',')})`;
  const fixName = n => (n === 'Rajshani' ? 'Rajshahi' : n);
  const hash = s => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; };
  const DIV_VISITS = { Dhaka: 412, Chittagong: 318, Rajshani: 236, Khulna: 201, Rangpur: 164, Mymensingh: 122, Sylhet: 97, Barisal: 74 };
  let map = null;
  function buildMap() {
    const M = window.BD_MAP; if (!M) return;
    const svg = $('[data-map] svg'), NS = 'http://www.w3.org/2000/svg';
    const mk = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent && parent.appendChild(e); return e; };
    const gDiv = mk('g', { class: 'div-l' }, svg), gDist = mk('g', { class: 'dist-l' }, svg);
    const gDivT = mk('g', { class: 'div-t' }, svg), gDistT = mk('g', { class: 'dist-t' }, svg);
    const vals = Object.values(DIV_VISITS), vmin = Math.min(...vals), vmax = Math.max(...vals);
    const divPaths = {};
    M.divisions.forEach(d => {
      const v = DIV_VISITS[d.n] || 0;
      const p = mk('path', { d: d.d, fill: rampColor((v - vmin) / (vmax - vmin)) }, gDiv);
      p.dataset.n = d.n; divPaths[d.n] = p;
      const t = mk('text', { x: d.c[0], y: d.c[1], 'text-anchor': 'middle' }, gDivT); t.textContent = fixName(d.n);
    });
    // districts: sample visits split from their division's total
    const byDiv = {};
    M.districts.forEach(d => { (byDiv[d.v] = byDiv[d.v] || []).push(d); });
    const distVal = {};
    Object.entries(byDiv).forEach(([dv, list]) => {
      const w = list.map(d => 0.35 + hash(d.n)); const sw = w.reduce((a, b) => a + b, 0);
      list.forEach((d, i) => { distVal[d.n] = Math.round((DIV_VISITS[dv] || 0) * w[i] / sw); });
    });
    const distPaths = M.districts.map(d => {
      const p = mk('path', { d: d.d, fill: '#D4DCE6' }, gDist); p.dataset.v = d.v; p.dataset.n = d.n;
      const t = mk('text', { x: d.c[0], y: d.c[1], 'text-anchor': 'middle' }, gDistT); t.textContent = d.n; t.dataset.v = d.v;
      return p;
    });
    map = { svg, el: $('[data-map]'), divPaths, distPaths, distVal, M, vb: [0, 0, M.w, M.h] };
    // mini map in the hero tile
    const mini = $('[data-minimap]');
    if (mini) M.divisions.forEach(d => { const v = DIV_VISITS[d.n] || 0; mk('path', { d: d.d, fill: rampColor((v - vmin) / (vmax - vmin)), stroke: '#fff', 'stroke-width': 3 }, mini); });
  }
  function tweenViewBox(to, ms = 1200) {
    if (!map) return;
    const from = map.vb.slice(); const t0 = performance.now();
    cancelAnimationFrame(map.raf);
    const ease = t => 1 - Math.pow(1 - t, 3);
    const tick = now => {
      const k = Math.min(1, (now - t0) / ms), e = ease(k);
      map.vb = from.map((f, i) => f + (to[i] - f) * e);
      map.svg.setAttribute('viewBox', map.vb.map(n => n.toFixed(1)).join(' '));
      if (k < 1) map.raf = requestAnimationFrame(tick);
    };
    map.raf = requestAnimationFrame(tick);
  }
  function countTo(el, to, decimals = 0, ms = 900) {
    const from = parseFloat(el.textContent) || 0; const t0 = performance.now();
    cancelAnimationFrame(el._raf);
    const tick = now => {
      const k = Math.min(1, (now - t0) / ms), v = from + (to - from) * (1 - Math.pow(1 - k, 3));
      el.textContent = v.toFixed(decimals);
      if (k < 1) el._raf = requestAnimationFrame(tick);
    };
    el._raf = requestAnimationFrame(tick);
  }
  function mapState(step) {
    if (!map) return;
    const k = n => $(`[data-k="${n}"]`);
    const crumbs = $('[data-crumbs]');
    $$('.hier [data-h]').forEach(h => h.classList.toggle('on', +h.dataset.h === (step === 2 ? 1 : 0)));
    if (step === 2) {
      const sel = 'Dhaka';
      const inSel = map.distPaths.filter(p => p.dataset.v === sel);
      const vals = inSel.map(p => map.distVal[p.dataset.n]); const lo = Math.min(...vals), hi = Math.max(...vals);
      inSel.forEach(p => { p.classList.add('in'); p.setAttribute('fill', rampColor((map.distVal[p.dataset.n] - lo) / Math.max(1, hi - lo))); });
      $$('.dist-t text', map.svg).forEach(t => t.classList.toggle('in', t.dataset.v === sel));
      Object.values(map.divPaths).forEach(p => p.classList.toggle('sel', p.dataset.n === sel));
      map.el.classList.add('zoomed');
      const bb = map.divPaths[sel].getBBox(); const pad = 26;
      const aspect = map.M.w / map.M.h; let w = bb.width + pad * 2, h = bb.height + pad * 2;
      if (w / h > aspect) h = w / aspect; else w = h * aspect;
      tweenViewBox([bb.x + bb.width / 2 - w / 2, bb.y + bb.height / 2 - h / 2, w, h]);
      crumbs.innerHTML = 'Bangladesh <span>›</span> <b>Dhaka division</b> <span>›</span> 13 districts';
      countTo(k('total'), DIV_VISITS.Dhaka); countTo(k('month'), 46); countTo(k('member'), 4.4, 1); countTo(k('staff'), 4.1, 1);
    } else {
      map.el.classList.remove('zoomed');
      map.distPaths.forEach(p => p.classList.remove('in'));
      $$('.dist-t text', map.svg).forEach(t => t.classList.remove('in'));
      tweenViewBox([0, 0, map.M.w, map.M.h]);
      crumbs.innerHTML = '<b>Bangladesh</b> <span>›</span> 8 divisions';
      const total = Object.values(DIV_VISITS).reduce((a, b) => a + b, 0);
      countTo(k('total'), total); countTo(k('month'), 151); countTo(k('member'), 4.2, 1); countTo(k('staff'), 4.0, 1);
    }
  }

  /* ---------- step hooks: called when a stage enters / leaves a step ---------- */
  const HOOKS = {
    agami(n) {
      n === 4 ? (menuStop(), menuPlay(0)) : menuStop();
      n === 5 ? meterPlay() : meterStop();
      if (n === 10) loadLive($('[data-live="agami"]'));
    },
    voice(n) {
      n === 1 ? voiceCycle.start() : voiceCycle.stop();
    },
    local(n) {
      n === 1 ? localCycle.start() : localCycle.stop();
      vpipe.classList.toggle('tags', n === 5);
      n === 2 ? pipeTravel() : pipeStop();
    },
    pm(n) { if (n >= 2) loadLive($('[data-live="pms"]')); },
    field(n) {
      if (n === 1 || n === 2) mapState(n);
      if (n >= 3) loadLive($('[data-live="field"]'));
    },
  };

  /* ======================================================================
     Scroll engine: theme, active step, progress
     ====================================================================== */
  const chapters = $$('.chapter').map(sec => {
    const stage = $('.stage', sec);
    const steps = $$('.step', sec);
    const scenes = $$('.scene', stage).map(s => ({ el: s, show: s.dataset.show.split(/\s+/).map(Number) }));
    return { sec, id: sec.dataset.chapter, label: sec.dataset.label, stage, steps, scenes, cur: 0, intro: $('.ch-intro', sec) };
  });
  const themed = [$('#top'), ...chapters.map(c => c.sec), $('#end')];
  const navBtns = $$('.chnav button');
  const stepcount = $('.stepcount');

  function setStep(ch, n) {
    if (ch.cur === n) return;
    ch.cur = n;
    ch.stage.dataset.step = n;
    ch.scenes.forEach(s => s.el.classList.toggle('on', s.show.includes(n)));
    ch.steps.forEach((s, i) => s.classList.toggle('is-active', i + 1 === n));
    HOOKS[ch.id] && HOOKS[ch.id](n);
  }
  chapters.forEach(ch => setStep(ch, 1));
  chapters.forEach(ch => ch.steps.forEach(s => s.classList.remove('is-active')));

  let ticking = false;
  function onScroll() {
    ticking = false;
    const mid = innerHeight / 2;
    body.classList.toggle('at-top', scrollY < 10);

    // theme
    let theme = themed[0];
    for (const el of themed) if (el.getBoundingClientRect().top <= mid) theme = el;
    if (body.dataset.theme !== theme.dataset.theme) body.dataset.theme = theme.dataset.theme;

    // steps + progress
    let counter = '';
    chapters.forEach((ch, ci) => {
      const r = ch.sec.getBoundingClientRect();
      let active = 0;
      ch.steps.forEach((s, i) => { if (s.getBoundingClientRect().top <= mid) active = i + 1; });
      const near = r.top < innerHeight * 1.6 && r.bottom > -innerHeight;
      if (near) setStep(ch, Math.max(1, active));
      ch.steps.forEach((s, i) => s.classList.toggle('is-active', i + 1 === active));
      let p = 0;
      if (r.bottom <= mid) p = 1; else if (r.top <= mid) p = active / ch.steps.length;
      navBtns[ci].style.setProperty('--p', p);
      const inside = r.top <= mid && r.bottom > mid;
      navBtns[ci].classList.toggle('is-current', inside);
      if (inside) counter = active ? `${ch.label} · ${active} / ${ch.steps.length}` : `${ch.label} · intro`;
      // Load live apps once their chapter's stage is on screen. Loading earlier risks a page jump:
      // a same-site app that autofocuses an input would scroll this page to reach it.
      const sr = $('.scrolly', ch.sec).getBoundingClientRect();
      if (sr.top < innerHeight * 0.6 && sr.bottom > 0) $$('.live', ch.sec).forEach(v => { if (!v.dataset.loaded) loadLive(v); });
    });
    stepcount.textContent = counter || ($('#end').getBoundingClientRect().top <= mid ? 'Thank you' : 'Introduction');
  }
  const requestTick = () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } };
  addEventListener('scroll', requestTick, { passive: true });
  addEventListener('resize', () => { requestTick(); $$('.live').forEach(fitLive); });
  window.addEventListener('load', () => { buildMap(); if (chapters.find(c => c.id === 'field').cur <= 2) mapState(chapters.find(c => c.id === 'field').cur || 1); onScroll(); });
  onScroll();

  /* ======================================================================
     Presenter navigation
     ====================================================================== */
  const stops = $$('[data-stop]');
  function targetY(el) {
    const r = el.getBoundingClientRect();
    if (el.classList.contains('step')) {
      const c = $('.card', el).getBoundingClientRect();
      return scrollY + c.top + c.height / 2 - (innerHeight + parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--chrome-h'))) / 2;
    }
    return scrollY + r.top;
  }
  // While a smooth scroll is still travelling, the next key press counts from where it is heading.
  let navAim = null, navAt = 0;
  addEventListener('scrollend', () => { navAim = null; });
  function base() { return navAim !== null && performance.now() - navAt < 2500 ? navAim : scrollY; }
  function go(y) {
    y = Math.max(0, Math.min(y, document.documentElement.scrollHeight - innerHeight));
    navAim = y; navAt = performance.now();
    scrollTo({ top: y, behavior: 'smooth' });
  }
  // The key hint only needs to be seen at the start; it hides itself after a few steps (H brings it back).
  let navCount = 0;
  const noteNav = () => { if (++navCount === 4) body.classList.add('hint-off'); };
  function next() { noteNav(); const b = base(); const s = stops.find(el => targetY(el) > b + 6); if (s) go(targetY(s)); }
  function prev() { noteNav(); const b = base(); const s = [...stops].reverse().find(el => targetY(el) < b - 6); go(s ? targetY(s) : 0); }
  function jump(id) {
    if (id === 'top') return go(0);
    const el = document.getElementById(id); if (!el) return;
    go(scrollY + el.getBoundingClientRect().top);
  }
  $$('[data-jump]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); jump(b.dataset.jump); }));

  addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const k = e.key;
    if (k === 'Escape') {
      body.classList.remove('show-help', 'is-blank');
      $$('.browser.expanded').forEach(b => toggleExpand(b, false));
      return;
    }
    if (body.classList.contains('has-expanded')) return;
    if (body.classList.contains('is-blank') && !['b', 'B', '.'].includes(k)) { body.classList.remove('is-blank'); e.preventDefault(); return; }
    if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(k)) { e.preventDefault(); next(); }
    else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(k)) { e.preventDefault(); prev(); }
    else if (k === 'Home') { e.preventDefault(); go(0); }
    else if (k === 'End') { e.preventDefault(); jump('end'); }
    else if (k === 'b' || k === 'B' || k === '.') body.classList.toggle('is-blank');
    else if (k === 'f' || k === 'F') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}); }
    else if (k === 'h' || k === 'H') body.classList.toggle('hint-off');
    else if (k === '?') body.classList.toggle('show-help');
    else if (/^[0-5]$/.test(k)) jump(['top', 'agami', 'voice', 'local', 'pm', 'field'][+k]);
  });
  $('.help').addEventListener('click', () => body.classList.remove('show-help'));
  $('.blank').addEventListener('click', () => body.classList.remove('is-blank'));
})();
