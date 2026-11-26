/* DOOM IPTV — video player (hls.js / mpegts.js / native / demo engines) */
'use strict';

/* ---------- lazy library loader: bundled copy first, CDN fallback ---------- */
const LIB_SRC = {
  hls: ['lib/hls.min.js', 'https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js'],
  mpegts: ['lib/mpegts.js', 'https://cdn.jsdelivr.net/npm/mpegts.js@1/dist/mpegts.js']
};
const _libP = {};
function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.async = true; s.onload = res; s.onerror = () => { s.remove(); rej(new Error('load ' + src)); }; document.head.appendChild(s); });
}
function loadLib(name) {
  if (name === 'hls' && window.Hls) return Promise.resolve(window.Hls);
  if (name === 'mpegts' && window.mpegts) return Promise.resolve(window.mpegts);
  return _libP[name] || (_libP[name] = (async () => {
    for (const src of LIB_SRC[name]) { try { await loadScript(src); break; } catch {} }
    const lib = name === 'hls' ? window.Hls : window.mpegts;
    if (!lib) { delete _libP[name]; throw new Error(name + ' unavailable'); }
    return lib;
  })());
}
const hasMSE = () => !!(window.MediaSource || window.ManagedMediaSource);
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/* ---------- demo engine: a generated test picture with a virtual clock ---------- */
class DemoEngine {
  constructor(video, url, live) {
    const parts = url.split(':'); this.title = decodeURIComponent(parts.slice(3).join(':') || parts[2] || 'Demo');
    this.live = live; this.duration = live ? Infinity : 5400; this.t = 0; this.rate = 1; this.paused = false; this.name = 'demo';
    this.c = document.createElement('canvas'); this.c.width = 1280; this.c.height = 720; this.ctx = this.c.getContext('2d');
    this.last = performance.now(); this.draw();
    try { video.srcObject = this.c.captureStream(25); } catch (e) { console.warn(e); }
    video.play().catch(() => {});
    this.iv = setInterval(() => this.draw(), 40);
  }
  draw() {
    const now = performance.now(); const dt = (now - this.last) / 1000; this.last = now;
    if (!this.paused) { this.t += dt * this.rate; if (!this.live && this.t >= this.duration) { this.t = this.duration; this.paused = true; this.onended && this.onended(); } }
    const g = this.ctx, W = 1280, H = 720, x = this.t;
    const grd = g.createLinearGradient(0, 0, W, H); grd.addColorStop(0, `hsl(${(x * 8) % 360},60%,30%)`); grd.addColorStop(1, `hsl(${(x * 8 + 120) % 360},60%,12%)`);
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    const bars = ['#fff', '#ff0', '#0ff', '#0f0', '#f0f', '#f00', '#00f'];
    bars.forEach((c, i) => { g.globalAlpha = .18; g.fillStyle = c; g.fillRect(i * W / 7, H - 120, W / 7, 120); });
    g.globalAlpha = 1;
    for (let i = 0; i < 6; i++) { g.beginPath(); g.fillStyle = `hsla(${(i * 60 + x * 30) % 360},90%,65%,.55)`; g.arc(W / 2 + Math.cos(x * .8 + i) * 380, H / 2 + Math.sin(x * 1.1 + i * 2) * 180, 40 + 20 * Math.sin(x + i), 0, 7); g.fill(); }
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = 'bold 54px system-ui, sans-serif'; g.fillText(this.title, W / 2, 120);
    g.font = '28px system-ui, sans-serif'; g.fillStyle = 'rgba(255,255,255,.85)';
    g.fillText(this.live ? 'LIVE • ' + new Date().toLocaleTimeString() : 'Demo video • ' + fmtTime(this.t) + ' / ' + fmtTime(this.duration), W / 2, 175);
    g.font = '22px system-ui, sans-serif'; g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText('DOOM IPTV — test signal', W / 2, H - 150);
  }
  destroy() { clearInterval(this.iv); }
}

/* ---------- attach a stream to a <video> element ---------- */
async function attachStream(video, url, { live = false, mime = '', onFatal, startAt = 0 } = {}) {
  if (url.startsWith('demo:')) return new DemoEngine(video, url, live);
  video.srcObject = null;
  const isM3U8 = /\.m3u8(\?|$)/i.test(url) || mime === 'm3u8';
  const isTS = /\.ts(\?|$)/i.test(url) || mime === 'ts';
  const nativeHls = !!video.canPlayType('application/vnd.apple.mpegurl');
  if (isM3U8 && !(isNative() || isIOS() || (nativeHls && !hasMSE()))) {
    try {
      const Hls = await loadLib('hls');
      if (Hls.isSupported()) {
        const hls = new Hls({ startPosition: !live && startAt > 0 ? startAt : -1, enableWorker: true, lowLatencyMode: live, backBufferLength: live ? 30 : 90, maxBufferLength: live ? 20 : 60, startFragPrefetch: true, fragLoadingMaxRetry: 4, manifestLoadingMaxRetry: 3 });
        let recovered = 0;
        hls.on(Hls.Events.ERROR, (_, d) => {
          if (!d.fatal) return;
          if (d.type === Hls.ErrorTypes.MEDIA_ERROR && recovered++ < 2) { hls.recoverMediaError(); return; }
          if (d.type === Hls.ErrorTypes.NETWORK_ERROR && recovered++ < 2 && d.details !== 'manifestLoadError') { hls.startLoad(); return; }
          onFatal && onFatal(d.details || 'hls');
        });
        hls.loadSource(url); hls.attachMedia(video);
        video.play().catch(() => {});
        return { name: 'hls.js', hls, destroy() { try { hls.destroy(); } catch {} } };
      }
    } catch (e) { console.warn('hls.js unavailable, using native', e); }
  }
  if (isTS && hasMSE()) {
    try {
      const mpegts = await loadLib('mpegts');
      if (mpegts.isSupported()) {
        const p = mpegts.createPlayer({ type: 'mpegts', isLive: live, url }, { enableWorker: true, liveBufferLatencyChasing: live, lazyLoad: !live, autoCleanupSourceBuffer: true });
        p.on(mpegts.Events.ERROR, (type, detail) => onFatal && onFatal(detail || type));
        p.attachMediaElement(video); p.load(); p.play() && p.play().catch && p.play().catch(() => {});
        return { name: 'mpegts.js', mp: p, destroy() { try { p.pause(); p.unload(); p.detachMediaElement(); p.destroy(); } catch {} } };
      }
    } catch (e) { console.warn('mpegts.js unavailable', e); }
  }
  const onErr = () => onFatal && onFatal('native:' + (video.error && video.error.code));
  video.addEventListener('error', onErr);
  // resume: tell the player the start time up front (#t=) — it then asks the server for that part of the file
  // directly, instead of loading from the start and jumping (two requests at once, which many IPTV servers refuse)
  video.src = !live && startAt > 0 ? url + '#t=' + startAt.toFixed(1) : url; video.load(); video.play().catch(() => {});
  return { name: 'native', startsAt: !live && startAt > 0, destroy() { video.removeEventListener('error', onErr); try { video.pause(); video.removeAttribute('src'); video.load(); } catch {} } };
}

function srtToVtt(txt) {
  return 'WEBVTT\n\n' + txt.replace(/\r/g, '').replace(/^\d+\n(?=\d\d:\d\d)/gm, '').replace(/(\d\d:\d\d:\d\d),(\d\d\d)/g, '$1.$2');
}

/* ---------- the main player ---------- */
const ASPECTS = ['fit', 'fill', 'stretch', '16:9', '4:3', '21:9', 'original'];
const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3];

const Player = {
  el: null, v: null, engine: null, item: null, ctx: null, open_: false, uiTimer: 0, tickIv: 0, lastSave: 0, usageAcc: 0,
  brightness: 1, aspect: 'fit', attempts: [], attemptIdx: 0, sleepT: 0, epg: [], wake: null,

  init() {
    this.el = h('div', { id: 'player', class: 'player hidden', role: 'dialog', 'aria-label': 'Player' });
    this.el.innerHTML = `
      <div class="p-stage"><video playsinline webkit-playsinline preload="auto"></video></div>
      <div class="p-gest"></div>
      <div class="p-spin hidden"><div class="spinner"></div></div>
      <div class="p-osd hidden"></div>
      <div class="p-top">
        <button class="pbtn" data-a="close" aria-label="Back">${ic('chevLeft')}</button>
        <div class="p-titles"><div class="p-title"></div><div class="p-sub"></div></div>
        <div class="p-right">
          <span class="p-rec hidden">● REC</span>
          <button class="pbtn p-restart" data-a="restart" title="${t('restartVid')}" aria-label="${t('restartVid')}">${ic('restart')}</button>
          <button class="pbtn" data-a="stats" title="${t('stats')}">${ic('info')}</button>
          <button class="pbtn" data-a="fav" title="${t('addToList')}">${ic('star')}</button>
          <button class="pbtn" data-a="pip" title="${t('pip')}">${ic('pip')}</button>
        </div>
      </div>
      <div class="p-center">
        <button class="pbtn big" data-a="back">${ic('back10')}</button>
        <button class="pbtn huge" data-a="toggle">${ic('pause')}</button>
        <button class="pbtn big" data-a="fwd">${ic('fwd10')}</button>
      </div>
      <div class="p-bottom">
        <div class="p-seekrow"><span class="p-cur">0:00</span><input class="p-seek" type="range" min="0" max="1000" value="0" step="1" aria-label="Seek"><span class="p-dur">0:00</span><span class="p-live hidden">${t('live_now')}</span></div>
        <div class="p-ctrls">
          <div class="p-left">
            <button class="pbtn" data-a="prev" title="Previous">${ic('prev')}</button>
            <button class="pbtn" data-a="toggle2">${ic('pause')}</button>
            <button class="pbtn" data-a="next" title="${t('next')}">${ic('next')}</button>
            <button class="pbtn" data-a="mute">${ic('vol')}</button>
            <input class="p-vol" type="range" min="0" max="100" value="100" aria-label="${t('volume')}">
          </div>
          <div class="p-rightc">
            <button class="pbtn" data-a="side" title="${t('channels')}">${ic('list')}</button>
            <button class="pbtn" data-a="guide" title="${t('catchup')}">${ic('guide')}</button>
            <button class="pbtn" data-a="rec" title="${t('record')}">${ic('rec', 'red')}</button>
            <button class="pbtn" data-a="bright" title="${t('brightness')}">${ic('sun')}</button>
            <button class="pbtn txt" data-a="speed" title="${t('speed')}">1x</button>
            <button class="pbtn" data-a="aspect" title="${t('aspect')}">${ic('aspect')}</button>
            <button class="pbtn" data-a="tracks" title="${t('subtitles')}">${ic('cc')}</button>
            <button class="pbtn" data-a="sleep" title="${t('sleep')}">${ic('moon')}</button>
            <button class="pbtn" data-a="fs" title="${t('fullscreen')}">${ic('fs')}</button>
          </div>
        </div>
      </div>
      <div class="p-menu hidden"></div>
      <div class="p-side hidden"></div>
      <div class="p-stats hidden"></div>
      <div class="p-next hidden"></div>
      <div class="p-sync hidden"></div>
      <div class="p-err hidden"></div>
      <div class="p-resume hidden"></div>
      <input type="file" class="p-subfile hidden" accept=".srt,.vtt">`;
    document.body.appendChild(this.el);
    this.v = $('video', this.el);
    this.el.dataset.sub = Settings.get('subSize') || 'm';
    this.el.dataset.sub = Settings.get('subSize') || 'm';
    this.bind();
  },

  bind() {
    const el = this.el, v = this.v;
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      e.stopPropagation(); this.action(b.dataset.a, b); this.showUI();
    });
    const seek = $('.p-seek', el);
    seek.addEventListener('input', () => { this.seeking = true; const d = this.dur(); $('.p-cur', el).textContent = fmtTime(seek.value / 1000 * d); this.showUI(); });
    seek.addEventListener('change', () => { const d = this.dur(); this.seekTo(seek.value / 1000 * d); this.seeking = false; });
    $('.p-vol', el).addEventListener('input', e => this.setVolume(e.target.value / 100));
    $('.p-subfile', el).addEventListener('change', e => this.loadSubFile(e.target.files[0]));
    this.bindVideo(v);
    el.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && !this._touch) this.showUI(); });
    this.bindGestures();
    document.addEventListener('fullscreenchange', () => { $('[data-a=fs]', el).innerHTML = document.fullscreenElement ? ic('fsExit') : ic('fs'); this.applyAspect(); });
    window.addEventListener('resize', () => this.open_ && this.applyAspect());
  },

  bindVideo(v) {
    ['playing', 'pause', 'waiting', 'canplay', 'loadedmetadata', 'seeked'].forEach(ev => v.addEventListener(ev, () => this.onMediaEvent(ev)));
    v.addEventListener('ended', () => this.onEnded());
    v.textTracks && v.textTracks.addEventListener && v.textTracks.addEventListener('change', () => setTimeout(() => SubSync.apply(this.v), 50));
  },
  /* After auto-sync the element's sound goes through Web Audio; give each new video a fresh element. */
  freshVideo() {
    const old = this.v; const nv = document.createElement('video');
    ['playsinline', 'webkit-playsinline'].forEach(a => nv.setAttribute(a, '')); nv.preload = 'auto';
    nv.volume = old.volume; nv.muted = old.muted; nv.style.cssText = old.style.cssText;
    old.replaceWith(nv); this.v = nv; this.bindVideo(nv);
    try { this.actx && this.actx.close(); } catch {} this.actx = null; this.analyser = null; this._audioHooked = false;
  },
  /* Web Audio analyser on the playing video, without ever silencing it. */
  async audioAnalyser() {
    if (this.analyser && this._audioHooked) { try { await this.actx.resume(); } catch {} return this.analyser; }
    const v = this.v; const src = v.currentSrc || '';
    const sameOrigin = src.startsWith('blob:') || src.startsWith(location.origin) || src.startsWith('capacitor:') || src.startsWith('http://localhost');
    const safe = isElectron() || sameOrigin || (this.engine && /hls|mpegts/.test(this.engine.name));
    if (!safe && !(await this.corsReload())) return null; // a cross-origin stream without permission would go silent: never hook it
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext; this.actx = new Ctx();
      const node = this.actx.createMediaElementSource(v); node.connect(this.actx.destination);
      const an = this.actx.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = 0; node.connect(an);
      await this.actx.resume(); this.analyser = an; this._audioHooked = true; return an;
    } catch (e) { console.warn('audio analyser', e); return null; }
  },
  /* ask the server for permission (CORS) to read the audio; restore playback exactly as it was if refused */
  corsReload() {
    const v = this.v; const src = v.currentSrc; if (!src || v.srcObject) return Promise.resolve(false);
    const t = v.currentTime, wasPaused = v.paused; this._probing = true;
    const reload = cors => new Promise(res => {
      const done = ok => { clearTimeout(to); v.removeEventListener('canplay', okH); v.removeEventListener('error', errH); res(ok); };
      const okH = () => done(true), errH = () => done(false); const to = setTimeout(() => done(false), 12000);
      v.addEventListener('canplay', okH); v.addEventListener('error', errH);
      if (cors) v.crossOrigin = 'anonymous'; else v.removeAttribute('crossorigin');
      v.src = src; v.load(); try { v.currentTime = t; } catch {} if (!wasPaused) v.play().catch(() => {});
    });
    return reload(true).then(async ok => {
      if (!ok) await reload(false);
      $$('track', v).forEach(tr => { tr.track.mode = 'showing'; });
      this._probing = false; return ok;
    });
  },

  bindGestures() {
    const g = $('.p-gest', this.el); let s = null, lastTap = 0, tapT = 0;
    g.addEventListener('click', e => {
      if (this._touch) return; // touch taps are handled below
      clearTimeout(tapT); tapT = setTimeout(() => { this.togglePlay(); this.showUI(); }, 220);
    });
    g.addEventListener('dblclick', () => { if (this._touch) return; clearTimeout(tapT); this.toggleFS(); });
    g.addEventListener('touchstart', e => {
      this._touch = true; this._touchSeen = true; clearTimeout(this._touchT);
      const tt = e.touches[0]; const r = g.getBoundingClientRect();
      s = { x: tt.clientX, y: tt.clientY, rx: (tt.clientX - r.left) / r.width, w: r.width, hgt: r.height, mode: null, t0: this.time(), b0: this.brightness, v0: this.v.volume, moved: false };
    }, { passive: true });
    g.addEventListener('touchmove', e => {
      if (!s) return; const tt = e.touches[0]; const dx = tt.clientX - s.x, dy = tt.clientY - s.y;
      if (!s.mode && Math.hypot(dx, dy) > 14) s.mode = Math.abs(dx) > Math.abs(dy) ? (this.isLive() && this.ctx ? 'zap' : 'seek') : (s.rx < .5 ? 'bright' : 'vol');
      if (!s.mode) return; s.moved = true; if (e.cancelable) e.preventDefault();
      s.dx = dx;
      if (s.mode === 'zap') { // live TV: swipe left = next channel, swipe right = previous channel
        const dir = dx < 0 ? 1 : -1; const i = this.ctx.index + dir;
        if (Math.abs(dx) > 50 && i >= 0 && i < this.ctx.list.length) this.osd((dir > 0 ? '⟵ ' : '') + (this.ctx.list[i].num ? this.ctx.list[i].num + '. ' : '') + this.ctx.list[i].name + (dir < 0 ? ' ⟶' : ''));
      }
      if (s.mode === 'seek' && !this.isLive()) { const d = this.dur(); s.target = clamp(s.t0 + dx / s.w * Math.min(d, 600), 0, d); this.osd(`${fmtTime(s.target)} / ${fmtTime(d)}`); }
      if (s.mode === 'bright') this.setBrightness(clamp(s.b0 - dy / s.hgt * 1.6, .2, 2));
      if (s.mode === 'vol') this.setVolume(clamp(s.v0 - dy / s.hgt * 1.4, 0, 1));
    }, { passive: false });
    g.addEventListener('touchend', e => {
      if (e.cancelable) e.preventDefault(); // stop the browser's extra "click" from hitting the controls that just appeared
      if (!s) return;
      if (s.mode === 'zap' && Math.abs(s.dx || 0) > 70) this.step(s.dx < 0 ? 1 : -1);
      if (s.mode === 'seek' && s.target != null) this.seekTo(s.target);
      if (!s.moved) {
        const now = Date.now();
        if (now - lastTap < 300) { // double tap: sides seek, middle play/pause
          if (s.rx < .35) this.skip(-1); else if (s.rx > .65) this.skip(1); else this.togglePlay();
          lastTap = 0; this.showUI();
        } else { lastTap = now; this.toggleUI(); } // single tap: show / hide controls right away
      }
      s = null; this._touchT = setTimeout(() => { this._touch = false; }, 800);
    });
    // any touch on the controls themselves keeps them on screen
    ['.p-top', '.p-bottom', '.p-center', '.p-menu', '.p-side'].forEach(sel => $(sel, this.el).addEventListener('touchstart', () => this.showUI(), { passive: true }));
  },

  /* ---------- open / close ---------- */
  async open(item, ctx = null, opts = {}) {
    const reason = Parental.blockReason();
    if (reason && !(await UI.pinPrompt(t(reason), t('timeUpSub')))) return;
    if (reason) Parental.overrideUntil = Date.now() + 3600000;
    if (!this.el) this.init();
    clearInterval(this._nextIv); this.stopEngine();
    if (this._audioHooked) this.freshVideo();
    SubSync.cancelled = true; SubSync.load(item); $('.p-sync', this.el) && $('.p-sync', this.el).classList.add('hidden');
    this.item = item; this.ctx = ctx; this.epg = []; this.opts = opts;
    this.open_ = true; this.el.classList.remove('hidden'); document.body.classList.add('playing');
    this.hidePanels(); $('.p-err', this.el).classList.add('hidden'); $('.p-next', this.el).classList.add('hidden'); this._nextShown = false; this._nextCancel = false;
    const live = item.type === 'live' && !opts.catchup;
    this.el.classList.toggle('is-live', live);
    this.el.classList.toggle('has-ctx', !!ctx);
    this.el.classList.toggle('is-ep', item.type === 'episode');
    this.setTitles();
    // build attempt list: primary, alternate live format, then duplicate sources from other subscriptions
    this.attempts = [];
    if (opts.url) this.attempts.push({ url: opts.url, mime: opts.mime, pl: item.pl, live });
    else {
      const prov = provOf(item);
      const direct = prov.streamUrl(item);
      // Android app: movies & episodes go through the built-in proxy (one connection to the server, so resuming
      // and seeking work on single-connection subscriptions); the direct address stays as the fallback
      if (!live && window.DOOM_PROXY && /^https?:/i.test(direct) && !/\.(m3u8|ts)(\?|$)/i.test(direct)) this.attempts.push({ url: window.DOOM_PROXY + encodeURIComponent(direct), pl: item.pl, live, proxied: true });
      this.attempts.push({ url: direct, pl: item.pl, live });
      if (live && prov instanceof XtreamProvider) this.attempts.push({ url: prov.streamUrl(item, { format: Settings.get('liveFormat') === 'ts' ? 'm3u8' : 'ts' }), pl: item.pl, live });
      for (const a of item.alts || []) { const ai = Object.assign({}, item, a); const p2 = Playlists.provider(a.pl); if (p2) this.attempts.push({ url: p2.streamUrl(ai), pl: a.pl, live }); }
    }
    this.attemptIdx = 0; this._reconnected = false;
    const pr = !live && !opts.url ? Progress.get(item) : null;
    this.startAt = opts.startAt != null ? opts.startAt : (pr && pr.pos > 15 ? pr.pos : 0);
    await this.startAttempt();
    this.aspect = Settings.get('aspect') || 'fit'; this.applyAspect();
    this.setBrightness(this.brightness, true);
    this.updateRecBadge();
    if (live) this.loadEpg();
    this.mediaSession();
    try { if (navigator.wakeLock) this.wake = await navigator.wakeLock.request('screen'); } catch {}
    clearInterval(this.tickIv); this.tickIv = setInterval(() => this.tick(), 250);
    if (!this.userTapped) this.showUI(true); else this.showUI();
    if (document.body.classList.contains('tv')) setTimeout(() => $('[data-a=toggle]', this.el).focus(), 50);
  },

  setCtx(ctx) { this.ctx = ctx; this.el.classList.toggle('has-ctx', !!ctx); },
  async startAttempt() {
    const a = this.attempts[this.attemptIdx]; if (!a) return this.showError();
    $('.p-spin', this.el).classList.remove('hidden');
    Conn.open('main', 'main', a.pl);
    const myIdx = this.attemptIdx;
    try {
      this.engine = await attachStream(this.v, a.url, { live: a.live, mime: a.mime, startAt: this.startAt, onFatal: d => { if (this.attemptIdx === myIdx) this.fail(d); } });
    } catch (e) { return this.fail(e.message); }
    if (this.engine.demo !== false && this.engine instanceof DemoEngine) this.engine.onended = () => this.onEnded();
    this.v.playbackRate = this.item.type === 'live' ? 1 : (Settings.get('speed') || 1);
    if (this.engine instanceof DemoEngine) this.engine.rate = this.v.playbackRate;
    $('[data-a=speed]', this.el).textContent = this.v.playbackRate + 'x';
    if (this.startAt) {
      if (this.engine instanceof DemoEngine) this.engine.t = this.startAt;
      else if (this.engine.hls || this.engine.startsAt) this.checkSeek = this.startAt;   // already starting there; only correct it if ignored
      else this.pendingSeek = this.startAt;
    }
    if (this.engine instanceof DemoEngine) $('.p-spin', this.el).classList.add('hidden');
    this.watchStart();
  },
  /* resuming can be slow on some servers: after a few seconds offer "start from the beginning",
     and once reconnect by itself (the server may still be holding the previous connection) */
  watchStart() {
    clearTimeout(this._ws1); clearTimeout(this._ws2); this._started = false; $('.p-resume', this.el).classList.add('hidden');
    if (this.engine instanceof DemoEngine || (this.item && this.item.type === 'live')) return;
    const at = this.startAt, idx = this.attemptIdx;
    this._ws1 = setTimeout(() => {
      if (this._started || !this.open_ || this.attemptIdx !== idx) return;
      const box = $('.p-resume', this.el); box.classList.remove('hidden');
      box.innerHTML = `<div class="muted small">${at ? t('resumingAt', { t: fmtTime(at) }) : t('slowServer')}</div><div class="row gap">${at ? `<button class="btn" data-a="fromStart">${t('fromStart')}</button>` : ''}<button class="btn" data-a="reconnect">${t('reconnect')}</button></div>`;
      if (document.body.classList.contains('tv')) { const b = $('button', box); b && b.focus(); }
    }, 7000);
    this._ws2 = setTimeout(() => { if (!this._started && this.open_ && this.attemptIdx === idx && !this._reconnected) { this._reconnected = true; this.reconnect(); } }, 16000);
  },
  reconnect(fromStart) {
    clearTimeout(this._ws1); clearTimeout(this._ws2); $('.p-resume', this.el).classList.add('hidden');
    if (fromStart) this.startAt = 0; else if (this.lastTime > 5) this.startAt = this.lastTime;
    this.stopEngine(true); $('.p-spin', this.el).classList.remove('hidden');
    setTimeout(() => { if (this.open_) this.startAttempt(); }, 1500);   // give the server a moment to drop the old connection
  },

  fail(detail) {
    if (this._probing) return;
    console.warn('stream failed', detail);
    this.stopEngine(true);
    if (this.attemptIdx < this.attempts.length - 1) { this.attemptIdx++; this.startAt = this.lastTime || this.startAt; this.startAttempt(); }
    else this.showError(detail);
  },

  showError(detail) {
    $('.p-spin', this.el).classList.add('hidden');
    if (this.item && this.item.pl === '__free' && !this.opts.url) { FreeCat.markDead(this.attempts.map(a => a.url)); UI.toast(t('deadHidden')); }
    const box = $('.p-err', this.el); box.classList.remove('hidden');
    box.innerHTML = `<div class="p-err-in"><div class="p-err-t">${t('errPlay')}</div><div class="muted small">${esc(detail || '')}</div>
      <div class="row gap"><button class="btn primary" data-a="retry">${t('retry')}</button><button class="btn" data-a="close">${t('close')}</button></div></div>`;
    $('[data-a=retry]', box).focus();
  },

  stopEngine(keepConn) {
    if (this.engine) { try { this.engine.destroy(); } catch {} this.engine = null; }
    try { this.v.pause(); this.v.srcObject = null; } catch {}
    $$('track', this.v).forEach(tr => tr.remove());
    if (!keepConn) Conn.close('main');
  },

  close() {
    if (!this.open_) return;
    this.saveProgress(true); clearInterval(this._nextIv); $('.p-next', this.el).classList.add('hidden');
    this.stopEngine(); clearInterval(this.tickIv); clearTimeout(this.sleepT); this.sleepT = 0; clearTimeout(this._ws1); clearTimeout(this._ws2); this._reconnected = false;
    this.open_ = false; this.el.classList.add('hidden'); document.body.classList.remove('playing');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    try { this.wake && this.wake.release(); } catch {} this.wake = null;
    App.onPlayerClosed && App.onPlayerClosed();
  },

  /* ---------- time abstraction (demo or real) ---------- */
  time() { return this.engine instanceof DemoEngine ? this.engine.t : this.v.currentTime || 0; },
  dur() {
    if (this.engine instanceof DemoEngine) return this.engine.duration;
    const d = this.v.duration; if (isFinite(d)) return d;
    try { const s = this.v.seekable; if (s && s.length) return s.end(s.length - 1); } catch {}
    return 0;
  },
  /* auto-play next: the "next" card appears N seconds before the end (setting 0 / 5 / 10 / 15; 0 = straight after the end) */
  canNext() {
    const listCtx = this.ctx && this.ctx.kind === 'list';
    return !!(this.item && (this.item.type === 'episode' || listCtx) && Settings.get('autoNext') && this.ctx && this.ctx.index < this.ctx.list.length - 1);
  },
  nextCheck(cur, d, live) {
    const lead = +Settings.get('nextLead') || 0;
    if (live || !lead || !d || !isFinite(d) || d < 60 || this._nextCancel || !this.canNext()) return;
    const left = d - cur;
    if (left > lead + .3) { if (this._nextShown) this.hideNext(); return; }   // seeked back
    if (left > 0) this.showNext(Math.ceil(left));
  },
  showNext(n) {
    const box = $('.p-next', this.el), listCtx = this.ctx.kind === 'list', nx = this.ctx.list[this.ctx.index + 1];
    if (!this._nextShown) {
      this._nextShown = true; box.classList.remove('hidden');
      const label = nx.type === 'episode' ? `${esc(nx.seriesName || '')} ${t('sShort')}${nx.season} ${t('epShort')}${nx.episode}` : esc(nx.name);
      box.innerHTML = `<div>${listCtx ? t('nextUp') : t('nextEp')}: <b>${label}</b> — <span class="nx-n"></span></div><div class="row gap"><button class="btn primary" data-a="next">${t('play')}</button><button class="btn" data-a="cancelNext">${t('cancel')}</button></div>`;
      if (document.body.classList.contains('tv')) $('[data-a=next]', box).focus();
    }
    const s = $('.nx-n', box); if (s) s.textContent = n + 's';
  },
  hideNext() { this._nextShown = false; clearInterval(this._nextIv); $('.p-next', this.el).classList.add('hidden'); },
  isLive() { return this.item && this.item.type === 'live' && !(this.opts && this.opts.catchup); },
  paused() { return this.engine instanceof DemoEngine ? this.engine.paused : this.v.paused; },
  seekTo(s) {
    const d = this.dur(); s = clamp(s, 0, d || s);
    if (this.engine instanceof DemoEngine) { if (!this.engine.live) this.engine.t = s; }
    else try { this.v.currentTime = s; } catch {}
    this.tick(true);
  },
  skip(dir) {
    const step = +Settings.get('seekStep') || 10;
    if (this.isLive() && !(this.v.seekable && this.v.seekable.length && this.dur() > 60)) return;
    this.seekTo(this.time() + dir * step); this.osd((dir > 0 ? '+' : '−') + step + 's');
  },
  togglePlay() {
    if (this.engine instanceof DemoEngine) { this.engine.paused = !this.engine.paused; this.v.play().catch(() => {}); }
    else if (this.v.paused) this.v.play().catch(() => {}); else this.v.pause();
    this.tick(true);
  },
  setVolume(x) {
    this.v.volume = clamp(x, 0, 1); this.v.muted = x === 0; $('.p-vol', this.el).value = Math.round(this.v.volume * 100);
    $('[data-a=mute]', this.el).innerHTML = this.v.muted || !this.v.volume ? ic('mute') : ic('vol');
    this.osd(`${ic('vol')} ${Math.round(this.v.volume * 100)}%`, true); LS.set('volume', this.v.volume);
  },
  setBrightness(x, silent) {
    this.brightness = x; this.v.style.filter = x === 1 ? '' : `brightness(${x})`;
    if (!silent) this.osd(`${ic('sun')} ${Math.round(x * 100)}%`, true);
  },
  setSpeed(r) {
    this.v.playbackRate = r; if (this.engine instanceof DemoEngine) this.engine.rate = r;
    $('[data-a=speed]', this.el).textContent = r + 'x'; this.osd(r + 'x');
  },
  applyAspect() {
    const v = this.v, st = $('.p-stage', this.el); const a = this.aspect;
    v.style.width = '100%'; v.style.height = '100%';
    const fitMap = { fit: 'contain', fill: 'cover', stretch: 'fill', original: 'scale-down' };
    if (fitMap[a]) { v.style.objectFit = fitMap[a]; return; }
    const [rw, rh] = a.split(':').map(Number); const r = rw / rh; const W = st.clientWidth, H = st.clientHeight;
    if (W / H > r) { v.style.height = '100%'; v.style.width = Math.round(H * r) + 'px'; } else { v.style.width = '100%'; v.style.height = Math.round(W / r) + 'px'; }
    v.style.objectFit = 'fill';
  },
  toggleFS() {
    const d = document;
    if (d.fullscreenElement || d.webkitFullscreenElement) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); return; }
    const el = this.el, req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) { const p = req.call(el); p && p.then && p.then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch {} }).catch(() => {}); return; }
    if (this.v.webkitEnterFullscreen) { try { this.v.webkitEnterFullscreen(); } catch {} } // iPhone: native full-screen player
  },

  /* ---------- UI state ---------- */
  setTitles() {
    const it = this.item; let title = it.name, sub = '';
    if (it.type === 'episode') { title = it.seriesName || it.name; sub = `${t('sShort')}${it.season} ${t('epShort')}${it.episode} · ${it.name}`; }
    if (it.type === 'live') { title = (it.num ? it.num + '  ' : '') + it.name; sub = this.opts && this.opts.catchup ? t('catchup') + ' · ' + this.opts.catchup : ''; }
    if (this.ctx && this.ctx.kind === 'list') sub = (sub ? sub + ' · ' : '') + (this.ctx.name ? this.ctx.name + ' ' : '') + (this.ctx.index + 1) + '/' + this.ctx.list.length;
    if (Playlists.mode() === 'merged' && it.pl) sub = (sub ? sub + ' · ' : '') + Playlists.label(it.pl);
    $('.p-title', this.el).textContent = title; $('.p-sub', this.el).textContent = sub;
    const fav = $('[data-a=fav]', this.el); fav.classList.toggle('on', Lists.inAny(it));
  },
  showUI(auto) {
    this.el.classList.add('ui'); clearTimeout(this.uiTimer);
    // touch screens: after the user taps, the controls stay until the next tap (only the first appearance hides by itself)
    if (this.isTouch() && this.userTapped && !auto) return;
    this.uiTimer = setTimeout(() => {
      if (this.paused() || !$('.p-menu', this.el).classList.contains('hidden') || !$('.p-side', this.el).classList.contains('hidden') || !$('.p-sync', this.el).classList.contains('hidden')) return;
      if (this.el.contains(document.activeElement) && document.activeElement.matches('input[type=range]')) return;
      this.el.classList.remove('ui');
    }, this._touch || matchMedia('(pointer: coarse)').matches ? 6000 : 3500);
  },
  isTouch() { return this._touch || this._touchSeen || matchMedia('(pointer: coarse)').matches; },
  toggleUI() {
    const now = Date.now(); if (now - (this._lastToggle || 0) < 350) return; // one tap = one toggle, even if the browser repeats the event
    this._lastToggle = now; this.userTapped = true;
    if (this.el.classList.contains('ui')) { this.el.classList.remove('ui'); clearTimeout(this.uiTimer); } else this.showUI();
  },
  osd(html, isHtml) {
    const o = $('.p-osd', this.el); o.innerHTML = isHtml ? html : esc(html); o.classList.remove('hidden');
    clearTimeout(this._osdT); this._osdT = setTimeout(() => o.classList.add('hidden'), 900);
  },
  onMediaEvent(ev) {
    const spin = $('.p-spin', this.el);
    if (ev === 'waiting') spin.classList.remove('hidden');
    if (ev === 'playing' || ev === 'canplay' || ev === 'seeked') spin.classList.add('hidden');
    if (ev === 'loadedmetadata' && this.pendingSeek) { try { this.v.currentTime = this.pendingSeek; } catch {} this.pendingSeek = 0; }
    if (ev === 'loadedmetadata' && this.checkSeek) { const want = this.checkSeek; this.checkSeek = 0; if (Math.abs(this.v.currentTime - want) > 8) try { this.v.currentTime = want; } catch {} }
    if (ev === 'playing' || ev === 'timeupdate' && this.v.currentTime > 0 && !this.v.paused) { if (!this._started) { this._started = true; clearTimeout(this._ws1); clearTimeout(this._ws2); $('.p-resume', this.el).classList.add('hidden'); } }
    if (ev === 'loadedmetadata') { this.applyAspect(); this.refreshTrackBtn(); }
    if (ev === 'playing') $('.p-err', this.el).classList.add('hidden');
    this.tick(true);
  },
  tick(force) {
    if (!this.open_) return;
    const el = this.el, cur = this.time(), d = this.dur(), live = this.isLive(), paused = this.paused();
    if (cur) this.lastTime = cur;
    const pi = paused ? ic('play') : ic('pause');
    if (this._pi !== paused) { $('[data-a=toggle]', el).innerHTML = pi; $('[data-a=toggle2]', el).innerHTML = pi; this._pi = paused; }
    $('.p-live', el).classList.toggle('hidden', !live);
    const seekable = !live || d > 60;
    $('.p-seek', el).classList.toggle('hidden', live && !seekable);
    if (!this.seeking) {
      $('.p-cur', el).textContent = live ? '' : fmtTime(cur); $('.p-dur', el).textContent = live ? '' : fmtTime(d);
      if (d) $('.p-seek', el).value = Math.round(cur / d * 1000);
    }
    this.nextCheck(cur, d, live);
    if (!paused) {
      this.usageAcc += 0.25;
      if (this.usageAcc >= 1) { Parental.addUsage(Math.floor(this.usageAcc)); this.usageAcc %= 1; }
      if (Parental.blockReason() && !this._locking) this.parentalLock();
    }
    if (!live && Date.now() - this.lastSave > 5000) this.saveProgress();
    if ((SubSync.offset || SubSync.scale !== 1) && (this._subT = (this._subT || 0) + 1) % 8 === 0) SubSync.apply(this.v);
    if (!$('.p-stats', el).classList.contains('hidden') && (force || Math.random() < .1)) this.renderStats();
  },
  async parentalLock() {
    this._locking = true; const wasPaused = this.paused(); if (!wasPaused) this.togglePlay();
    const ok = await UI.pinPrompt(t(Parental.blockReason() || 'timeUp'), t('timeUpSub'));
    this._locking = false;
    if (ok) { Parental.overrideUntil = Date.now() + 3600000; if (!wasPaused) this.togglePlay(); } else this.close();
  },
  saveProgress(final) {
    this.lastSave = Date.now();
    if (!this.item || this.isLive() || (this.opts && (this.opts.catchup || this.opts.recording))) return;
    const d = this.dur(); if (!d || !isFinite(d)) return;
    Progress.set(this.item, this.time(), d);
    if (final) App.refreshContinue && App.refreshContinue();
  },
  onEnded() {
    this.saveProgress(true);
    if (this._nextCancel || !this.canNext()) return;
    // countdown already ran before the end, or the setting is 0: go straight to the next one
    if (this._nextShown || !(+Settings.get('nextLead'))) { this.hideNext(); return this.step(1); }
    const listCtx = this.ctx && this.ctx.kind === 'list';
    {
      const box = $('.p-next', this.el); let n = 8; box.classList.remove('hidden');
      const nx = this.ctx.list[this.ctx.index + 1];
      const label = nx.type === 'episode' ? `${esc(nx.seriesName || '')} ${t('sShort')}${nx.season} ${t('epShort')}${nx.episode}` : esc(nx.name);
      const render = () => { box.innerHTML = `<div>${listCtx ? t('nextUp') : t('nextEp')}: <b>${label}</b> — ${n}s</div><div class="row gap"><button class="btn primary" data-a="next">${t('play')}</button><button class="btn" data-a="cancelNext">${t('cancel')}</button></div>`; };
      render(); $('[data-a=next]', box).focus();
      this._nextIv = setInterval(() => { n--; if (n <= 0) { clearInterval(this._nextIv); this.step(1); } else render(); }, 1000);
    }
  },

  /* ---------- context navigation (episodes / channels) ---------- */
  step(dir) {
    clearInterval(this._nextIv);
    if (!this.ctx) return;
    const i = this.ctx.index + dir; if (i < 0 || i >= this.ctx.list.length) return;
    const it = this.ctx.list[i]; this.ctx.index = i;
    const pr = it.type !== 'live' ? Progress.get(it) : null;
    this.open(it, this.ctx, it.type === 'live' ? {} : { startAt: pr && !pr.done ? pr.pos || 0 : 0 });
  },

  async loadEpg() {
    const it = this.item;
    try {
      const list = await provOf(it).shortEpg(it.id, 3); if (this.item !== it) return; this.epg = list;
      const now = Date.now(); const cur = list.find(e => e.start <= now && e.end > now) || list[0];
      if (cur) $('.p-sub', this.el).textContent = `${t('nowPlaying')}: ${cur.title}  ${Clock.time(cur.start)}–${Clock.time(cur.end)}`;
    } catch {}
  },

  /* ---------- actions ---------- */
  action(a, btn) {
    switch (a) {
      case 'close': return this.close();
      case 'toggle': case 'toggle2': return this.togglePlay();
      case 'back': return this.skip(-1);
      case 'fwd': return this.skip(1);
      case 'prev': return this.step(-1);
      case 'next': return this.step(1);
      case 'cancelNext': this._nextCancel = true; return this.hideNext();
      case 'restart': this._nextCancel = false; this.hideNext(); this.seekTo(0); if (this.paused()) this.togglePlay(); this.osd(t('restartVid')); this.showUI(); return;
      case 'retry': $('.p-err', this.el).classList.add('hidden'); this.attemptIdx = 0; return this.startAttempt();
      case 'fromStart': return this.reconnect(true);
      case 'reconnect': return this.reconnect(false);
      case 'mute': this.v.muted = !this.v.muted; $('[data-a=mute]', this.el).innerHTML = this.v.muted ? ic('mute') : ic('vol'); return;
      case 'fs': return this.toggleFS();
      case 'pip': try { if (document.pictureInPictureElement) document.exitPictureInPicture(); else this.v.requestPictureInPicture().catch(() => {}); } catch {} return;
      case 'fav': return UI.listPicker(this.item, () => this.setTitles());
      case 'stats': { const s = $('.p-stats', this.el); s.classList.toggle('hidden'); return this.renderStats(); }
      case 'speed': return this.menu(t('speed'), SPEEDS.map(r => ({ label: r + 'x', active: this.v.playbackRate === r, run: () => { this.setSpeed(r); Settings.set('speed', r); } })));
      case 'aspect': return this.menu(t('aspect'), ASPECTS.map(x => ({ label: t(x) !== x ? t(x) : x, active: this.aspect === x, run: () => { this.aspect = x; this.applyAspect(); this.osd(t(x) !== x ? t(x) : x); } })));
      case 'bright': return this.menu(t('brightness'), [0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.7, 2].map(x => ({ label: Math.round(x * 100) + '%', active: Math.abs(this.brightness - x) < .01, run: () => this.setBrightness(x) })));
      case 'sleep': return this.menu(t('sleep'), [0, 15, 30, 45, 60, 90, 120].map(m => ({ label: m ? m + ' ' + t('minutes') : t('off'), active: (this.sleepMin || 0) === m, run: () => this.setSleep(m) })));
      case 'tracks': return this.tracksMenu();
      case 'side': return this.sidePanel();
      case 'guide': return this.guidePanel();
      case 'rec': return Recorder.toggle(this.item).then(() => this.updateRecBadge());
    }
  },
  setSleep(m) {
    clearTimeout(this.sleepT); this.sleepMin = m;
    if (m) { this.sleepT = setTimeout(() => { this.close(); }, m * 60000); this.osd(t('sleep') + ': ' + m + ' ' + t('minutes')); }
  },
  updateRecBadge() { const on = this.item && Recorder.isRecording(this.item); $('.p-rec', this.el).classList.toggle('hidden', !on); $('[data-a=rec]', this.el).classList.toggle('on', !!on); },

  menu(title, opts) {
    const m = $('.p-menu', this.el); $('.p-side', this.el).classList.add('hidden');
    m.innerHTML = `<div class="pm-title">${esc(title)}</div>`;
    for (const o of opts) {
      const b = h('button', { class: 'pm-item' + (o.active ? ' active' : '') }, o.active ? h('span', { html: ic('check') }) : h('span', { class: 'sp' }), o.label);
      b.addEventListener('click', ev => { ev.stopPropagation(); o.run(); if (!o.keep) m.classList.add('hidden'); this.showUI(); });
      m.appendChild(b);
    }
    m.classList.remove('hidden'); ($('.pm-item.active', m) || $('.pm-item', m)).focus();
  },
  hidePanels() { ['.p-menu', '.p-side', '.p-stats', '.p-sync'].forEach(s => $(s, this.el).classList.add('hidden')); },

  tracksMenu() {
    const opts = []; const hls = this.engine && this.engine.hls;
    if (hls && hls.audioTracks && hls.audioTracks.length > 1) hls.audioTracks.forEach((tr, i) => opts.push({ label: '🔊 ' + (tr.name || tr.lang || 'Audio ' + (i + 1)), active: hls.audioTrack === i, run: () => { hls.audioTrack = i; } }));
    else if (this.v.audioTracks && this.v.audioTracks.length > 1) Array.from(this.v.audioTracks).forEach((tr, i) => opts.push({ label: '🔊 ' + (tr.label || tr.language || 'Audio ' + (i + 1)), active: tr.enabled, run: () => { Array.from(this.v.audioTracks).forEach((x, j) => { x.enabled = j === i; }); } }));
    const tts = Array.from(this.v.textTracks || []);
    opts.push({ label: '💬 ' + t('subtitles') + ': ' + t('off'), active: !tts.some(x => x.mode === 'showing'), run: () => { tts.forEach(x => { x.mode = 'disabled'; }); if (hls) hls.subtitleTrack = -1; } });
    if (hls && hls.subtitleTracks && hls.subtitleTracks.length) hls.subtitleTracks.forEach((tr, i) => opts.push({ label: '💬 ' + (tr.name || tr.lang), active: hls.subtitleTrack === i, run: () => { hls.subtitleTrack = i; hls.subtitleDisplay = true; } }));
    else tts.forEach(tr => opts.push({ label: '💬 ' + (tr.label || tr.language || 'Track'), active: tr.mode === 'showing', run: () => { tts.forEach(x => { x.mode = x === tr ? 'showing' : 'disabled'; }); } }));
    opts.push({ label: '📄 ' + t('loadSub'), run: () => $('.p-subfile', this.el).click() });
    opts.push({ label: '⏱ ' + t('subSync') + ' (' + SubSync.fmt(SubSync.offset) + ')', run: () => this.syncPanel() });
    const sz = Settings.get('subSize') || 'm';
    opts.push({ label: '🔠 ' + t('subSize') + ': ' + t({ s: 'subSmall', m: 'subMedium', l: 'subLarge', xl: 'subXL' }[sz]), run: () => this.menu(t('subSize'), [['s', 'subSmall'], ['m', 'subMedium'], ['l', 'subLarge'], ['xl', 'subXL']].map(([k, l]) => ({ label: t(l), active: sz === k, run: () => { Settings.set('subSize', k); this.el.dataset.sub = k; } }))) });
    this.menu(t('audio') + ' / ' + t('subtitles'), opts);
  },
  nudgeSub(d) {
    if (!SubSync.track(this.v)) { this.osd(t('subNoSubs')); return; }
    SubSync.offset = Math.round((SubSync.offset + d) * 10) / 10; SubSync.apply(this.v); SubSync.save(this.item);
    this.osd('💬 ' + SubSync.fmt(SubSync.offset)); this.drawSync();
  },
  syncPanel() {
    const p = $('.p-sync', this.el); $('.p-menu', this.el).classList.add('hidden');
    p.classList.remove('hidden'); this.drawSync(); this.showUI();
    const f = $('.ps-btn', p); f && f.focus();
  },
  drawSync(msg) {
    const p = $('.p-sync', this.el); if (!p || p.classList.contains('hidden')) return;
    const has = !!SubSync.track(this.v);
    p.innerHTML = `<div class="ps-row"><b>⏱ ${t('subSync')}</b><button class="pbtn sm" data-s="x">${ic('close')}</button></div>
      <div class="ps-row ctrl"><button class="ps-btn" data-s="-1">−1s</button><button class="ps-btn" data-s="-0.1">−0.1</button>
      <div class="ps-val"><small>${t('subDelay')}</small><b>${SubSync.fmt(SubSync.offset)}</b>${SubSync.scale !== 1 ? `<small>${t('subFps')}</small>` : ''}</div>
      <button class="ps-btn" data-s="0.1">+0.1</button><button class="ps-btn" data-s="1">+1s</button></div>
      <div class="ps-row"><button class="btn sm" data-s="0">${t('subReset')}</button><button class="btn sm primary" data-s="auto" ${SubSync.busy ? 'disabled' : ''}>✨ ${t('subAuto')}</button>${SubSync.busy ? `<button class="btn sm" data-s="stop">${t('subCancel')}</button>` : ''}</div>
      <div class="ps-msg muted small">${esc(msg || (has ? '' : t('subNoSubs')))}</div>`;
    p.onclick = async e => {
      e.stopPropagation(); this.showUI(); const b = e.target.closest('[data-s]'); if (!b) return; const a = b.dataset.s;
      if (a === 'x') { p.classList.add('hidden'); return; }
      if (a === 'stop') { SubSync.cancelled = true; return; }
      if (a === '0') { SubSync.offset = 0; SubSync.scale = 1; SubSync.apply(this.v); SubSync.save(this.item); return this.drawSync(); }
      if (a === 'auto') return this.autoSync();
      this.nudgeSub(parseFloat(a));
    };
  },
  async autoSync() {
    if (!SubSync.track(this.v)) return this.drawSync(t('subNoSubs'));
    if (this.paused()) this.togglePlay();
    this.drawSync(t('subListening', { n: 0 }));
    const r = await SubSync.auto(this, n => { const m = $('.p-sync .ps-msg', this.el); if (m) m.textContent = t('subListening', { n }); });
    if (r.ok) {
      SubSync.offset = Math.round(r.offset * 10) / 10; SubSync.scale = r.scale; SubSync.apply(this.v); SubSync.save(this.item);
      this.drawSync('✅ ' + t('subDone', { d: SubSync.fmt(SubSync.offset) }) + (r.scale !== 1 ? ' · ' + t('subFps') : ''));
    } else this.drawSync(r.why === 'cancel' ? '' : r.why === 'blocked' ? t('subBlocked') : r.why === 'nosubs' ? t('subNoSubs') : t('subFail'));
  },
  refreshTrackBtn() {},
  async loadSubFile(f) {
    if (!f) return; let txt = await f.text(); if (!/^WEBVTT/.test(txt)) txt = srtToVtt(txt);
    const url = URL.createObjectURL(new Blob([txt], { type: 'text/vtt' }));
    $$('track', this.v).forEach(x => x.remove());
    const tr = h('track', { kind: 'subtitles', label: f.name, srclang: 'xx', src: url, default: true }); this.v.appendChild(tr);
    setTimeout(() => { Array.from(this.v.textTracks).forEach(x => { x.mode = x.label === f.name ? 'showing' : 'disabled'; }); setTimeout(() => SubSync.apply(this.v), 300); }, 100);
    this.osd('💬 ' + f.name);
  },

  sidePanel() {
    const side = $('.p-side', this.el);
    if (!side.classList.contains('hidden') && side.dataset.kind === 'list') { side.classList.add('hidden'); return; }
    $('.p-menu', this.el).classList.add('hidden'); side.dataset.kind = 'list';
    const list = this.ctx ? this.ctx.list : [];
    side.innerHTML = `<div class="ps-head"><b>${this.item.type === 'live' ? t('channels') : t('episodes')}</b><input class="input sm ps-q" placeholder="${t('search')}"></div><div class="ps-list"></div>`;
    const box = $('.ps-list', side);
    const render = q => {
      box.innerHTML = '';
      list.forEach((it, i) => {
        if (q && !it.name.toLowerCase().includes(q)) return;
        const b = h('button', { class: 'ps-item' + (i === (this.ctx && this.ctx.index) ? ' active' : '') },
          it.type === 'live' ? h('img', { src: it.img || '', loading: 'lazy', alt: '', onerror: function () { this.style.visibility = 'hidden'; } }) : h('span', { class: 'ps-num' }, t('epShort') + it.episode),
          h('span', { class: 'ps-name' }, it.type === 'live' ? (it.num ? it.num + '. ' : '') + it.name : it.name));
        b.addEventListener('click', e => { e.stopPropagation(); this.ctx.index = i; this.open(it, this.ctx); });
        box.appendChild(b);
      });
    };
    render(''); $('.ps-q', side).addEventListener('input', e => render(e.target.value.toLowerCase().trim()));
    side.classList.remove('hidden');
    const act = $('.ps-item.active', box); if (act) { act.scrollIntoView({ block: 'center' }); act.focus(); }
  },

  async guidePanel() {
    const side = $('.p-side', this.el);
    if (!side.classList.contains('hidden') && side.dataset.kind === 'guide') { side.classList.add('hidden'); return; }
    const it = this.item; side.dataset.kind = 'guide'; $('.p-menu', this.el).classList.add('hidden');
    side.innerHTML = `<div class="ps-head"><b>${esc(it.name)}</b></div><div class="ps-list"><div class="muted pad">${t('loading')}</div></div>`; side.classList.remove('hidden');
    let rows = [];
    try { const p = provOf(it); rows = p.epgTable ? await p.epgTable(it.id) : await p.shortEpg(it.id, 20); } catch {}
    const box = $('.ps-list', side); box.innerHTML = '';
    if (!rows.length) { box.innerHTML = `<div class="muted pad">${t('noEpg')}</div>`; return; }
    const now = Date.now(); const tf = d => Clock.time(d);
    let curEl = null;
    for (const r of rows) {
      const past = r.end < now, cur = r.start <= now && r.end > now;
      const canCatch = (past || cur) && it.archive && (r.archive || r.start > now - (it.archiveDays || 1) * 86400000);
      const b = h('button', { class: 'ps-item epg' + (cur ? ' active' : '') + (past ? ' past' : '') },
        h('span', { class: 'ps-num' }, tf(r.start)), h('span', { class: 'ps-name' }, r.title, h('small', { class: 'muted' }, ' ' + (r.desc || '').slice(0, 80))),
        canCatch ? h('span', { class: 'chip' }, '⏪ ' + t('catchup')) : null);
      if (canCatch) b.addEventListener('click', e => {
        e.stopPropagation(); const mins = Math.ceil((r.end - r.start) / 60000);
        const url = provOf(it).catchupUrl(it, r.start, mins);
        this.open(it, this.ctx, { url, catchup: r.title, mime: 'ts' });
      });
      box.appendChild(b); if (cur) curEl = b;
    }
    if (curEl) { curEl.scrollIntoView({ block: 'center' }); curEl.focus(); }
  },

  renderStats() {
    const s = $('.p-stats', this.el); const v = this.v; let buf = 0;
    try { for (let i = 0; i < v.buffered.length; i++) if (v.buffered.start(i) <= v.currentTime && v.buffered.end(i) >= v.currentTime) buf = v.buffered.end(i) - v.currentTime; } catch {}
    const a = this.attempts[this.attemptIdx] || {}; let host = ''; try { host = new URL(a.url).host; } catch {}
    const lvl = this.engine && this.engine.hls && this.engine.hls.levels && this.engine.hls.levels[this.engine.hls.currentLevel];
    s.innerHTML = `<div><b>${t('stats')}</b></div><div>Engine: ${esc(this.engine ? this.engine.name : '—')}</div><div>Video: ${v.videoWidth || 1280}×${v.videoHeight || 720}</div>`
      + (lvl ? `<div>Bitrate: ${Math.round(lvl.bitrate / 1000)} kbps</div>` : '') + `<div>Buffer: ${buf.toFixed(1)}s</div><div>Source: ${esc(host || a.url && a.url.slice(0, 30))}</div>`
      + (Playlists.mode() === 'merged' ? `<div>${t('account')}: ${esc(Playlists.label(a.pl))}</div>` : '') + `<div>Attempt: ${this.attemptIdx + 1}/${this.attempts.length}</div>`;
  },

  mediaSession() {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: this.item.seriesName || this.item.name, artist: this.item.type === 'episode' ? this.item.name : 'DOOM IPTV', artwork: this.item.img && !this.item.img.startsWith('data:') ? [{ src: this.item.img }] : [] });
      navigator.mediaSession.setActionHandler('play', () => this.paused() && this.togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => !this.paused() && this.togglePlay());
      navigator.mediaSession.setActionHandler('seekbackward', () => this.skip(-1));
      navigator.mediaSession.setActionHandler('seekforward', () => this.skip(1));
      navigator.mediaSession.setActionHandler('previoustrack', this.ctx ? () => this.step(-1) : null);
      navigator.mediaSession.setActionHandler('nexttrack', this.ctx ? () => this.step(1) : null);
    } catch {}
  },

  /* ---------- remote / keyboard ---------- */
  onKey(e) {
    const code = e.keyCode; const el = this.el;
    const k = code === 23 || e.key === 'Select' || e.key === 'Accept' ? 'Enter' : e.key; // remote OK button
    if (k === 'Enter' && code === 23) { // OK on a focused control presses it; otherwise it shows the controls / pauses
      const a = document.activeElement;
      if (a && el.contains(a) && a.matches('button, [data-a], input[type=checkbox]') && el.classList.contains('ui')) { a.click(); return true; }
    }
    const menuOpen = ['.p-menu', '.p-side', '.p-stats', '.p-sync'].some(x => !$(x, el).classList.contains('hidden'));
    const uiShown = el.classList.contains('ui');
    if (k === 'Escape' || k === 'Backspace' && !(e.target.matches && e.target.matches('input')) || k === 'GoBack' || k === 'BrowserBack' || code === 10009 || code === 461) {
      e.preventDefault();
      if (menuOpen) { this.hidePanels(); this.showUI(); return true; }
      if (uiShown && document.body.classList.contains('tv')) { el.classList.remove('ui'); return true; }
      this.close(); return true;
    }
    if (k === 'MediaPlayPause' || code === 179 || code === 10252) { this.togglePlay(); return true; }
    if (k === 'MediaPlay' || code === 415) { if (this.paused()) this.togglePlay(); return true; }
    if (k === 'MediaPause' || code === 19) { if (!this.paused()) this.togglePlay(); return true; }
    if (k === 'MediaFastForward' || code === 417) { this.skip(1); return true; }
    if (k === 'MediaRewind' || code === 412) { this.skip(-1); return true; }
    if (k === 'PageUp' || k === 'ChannelUp' || code === 427 || code === 33) { this.step(-1); return true; }
    if (k === 'PageDown' || k === 'ChannelDown' || code === 428 || code === 34) { this.step(1); return true; }
    if (e.target && e.target.matches && e.target.matches('input:not([type=range])')) return false;
    if (menuOpen || (uiShown && document.body.classList.contains('tv'))) { this.showUI(); return false; } // let spatial nav handle focus
    switch (k) {
      case ' ': case 'k': case 'Enter': if (k === 'Enter' && !uiShown) { this.showUI(); return true; } this.togglePlay(); this.showUI(); return true;
      case 'ArrowLeft': if (e.target.matches && e.target.matches('input[type=range]')) return false; this.skip(-1); this.showUI(); return true;
      case 'ArrowRight': if (e.target.matches && e.target.matches('input[type=range]')) return false; this.skip(1); this.showUI(); return true;
      case 'ArrowUp': if (this.isLive() && this.ctx) { this.step(-1); return true; } this.setVolume(this.v.volume + .05); return true;
      case 'ArrowDown': if (this.isLive() && this.ctx) { this.step(1); return true; } this.setVolume(this.v.volume - .05); return true;
      case 'f': this.toggleFS(); return true;
      case 'm': this.action('mute'); return true;
      case 'n': this.step(1); return true;
      case 'p': this.step(-1); return true;
      case 'i': this.action('stats'); return true;
      case 'g': this.nudgeSub(-0.1); return true;
      case 'h': this.nudgeSub(0.1); return true;
    }
    return false;
  }
};
