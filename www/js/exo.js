/* DOOM IPTV — Android's own player (ExoPlayer) as an optional engine.
   The picture comes from the system decoder in a view behind the page; this file makes it look like a
   <video> element to the player (same controls, menus, remote keys, progress saving). */
'use strict';
Object.assign(I18N.en, {
  playerEngine: 'Video player', peWeb: 'Built-in (current)', peExo: 'Android player (ExoPlayer)', playerEngineHint: 'Android player: decoding by the device itself — smoother on TV boxes, plays more file types and sound formats (MKV, AC3, EAC3)',
  exoFallback: 'Android player could not play this — trying the built-in player',
  bootStart: 'Start when the device turns on', bootHint: 'Opens DOOM IPTV by itself after the TV / box starts', bootNeedPerm: 'Needs "Display over other apps" for DOOM IPTV to work on this device',
  bootPermAsk: 'This Android version only lets an app open itself at start-up when it may "display over other apps". Open that setting now and turn it on for DOOM IPTV?'
});
Object.assign(I18N.ar, {
  playerEngine: 'مشغل الفيديو', peWeb: 'المدمج (الحالي)', peExo: 'مشغل أندرويد (ExoPlayer)', playerEngineHint: 'مشغل أندرويد: فك الفيديو بعتاد الجهاز نفسه — أنعم على أجهزة التلفزيون، ويشغّل صيغ ملفات وصوت أكثر (MKV, AC3, EAC3)',
  exoFallback: 'مشغل أندرويد لم يستطع تشغيل هذا — جاري التجربة بالمشغل المدمج',
  bootStart: 'التشغيل التلقائي مع تشغيل الجهاز', bootHint: 'يفتح DOOM IPTV تلقائياً بعد تشغيل التلفزيون / الجهاز', bootNeedPerm: 'يحتاج صلاحية «الظهور فوق التطبيقات الأخرى» لـ DOOM IPTV ليعمل على هذا الجهاز',
  bootPermAsk: 'إصدار أندرويد هذا لا يسمح للتطبيق بفتح نفسه عند التشغيل إلا بصلاحية «الظهور فوق التطبيقات الأخرى». أفتح هذا الإعداد الآن لتفعيلها لـ DOOM IPTV؟'
});

/* A native plugin of the app. The page has no Capacitor JS library bundled: the Android bridge itself puts
   each plugin on Capacitor.Plugins (methods + addListener). registerPlugin only exists with that library. */
const capPlugin = name => { const C = window.Capacitor || {}; return (C.Plugins && C.Plugins[name]) || (C.registerPlugin ? C.registerPlugin(name) : null); };
const Exo = {
  _p: null,
  available() {
    try { const C = window.Capacitor; return !!(C && C.getPlatform && C.getPlatform() === 'android' && C.isPluginAvailable && C.isPluginAvailable('NativePlayer')); } catch { return false; }
  },
  plugin() { if (!this._p) this._p = capPlugin('NativePlayer'); return this._p; },
  wanted() { return Settings.get('playerEngine') === 'exo' && this.available(); },
  call(m, a) { try { return this.plugin()[m](a || {}).catch(e => console.warn('exo ' + m, e)); } catch (e) { console.warn('exo ' + m, e); return Promise.resolve(); } }
};
const SUB_SCALE = { s: .8, m: 1, l: 1.3, xl: 1.65 };

/* a time range list with one range, like video.buffered / video.seekable */
const oneRange = (a, b) => ({ length: b > a ? 1 : 0, start: () => a, end: () => b });

class NativeVideo extends EventTarget {
  constructor(host) {
    super();
    this.isNative = true; this.style = {}; this.srcObject = null; this.src = ''; this.currentSrc = ''; this.crossOrigin = null; this.error = null; this.seeking = false;
    this._t = 0; this._d = NaN; this._buf = 0; this._paused = true; this._playing = false; this._vol = 1; this._muted = false; this._rate = 1; this._rs = 0; this._w = 0; this._h = 0; this._live = false;
    this._tracks = { audio: [], text: [] };
    // subtitle FILES (loaded by you or found online) live on a small hidden <video>; their lines are drawn by the player page
    this.sub = document.createElement('video'); this.sub.className = 'xsub-host'; this.sub.muted = true; host && host.appendChild(this.sub);
    this._ready = this._listen();
  }
  async _listen() {
    const P = Exo.plugin();
    await P.addListener('time', d => this._time(d));
    await P.addListener('state', d => this._state(d));
    await P.addListener('error', d => { this.error = { code: 4, message: (d && (d.code + ' ' + d.message)) || 'exo' }; this.emit('error'); this._fatal && this._fatal('exo:' + (d && d.code || 'error')); });
    await P.addListener('size', d => { this._w = d.w || 0; this._h = d.h || 0; this.emit('resize'); });
    await P.addListener('tracks', d => { this._tracks = d || { audio: [], text: [] }; });
    await P.addListener('seeked', () => { this.seeking = false; this.emit('seeked'); });
    await P.addListener('ended', () => { this._paused = true; this.emit('ended'); });
  }
  emit(n) { this.dispatchEvent(new Event(n)); }
  _time(d) {
    if (!this._on) return;
    this._t = (d.pos || 0) / 1000; this._buf = (d.buf || 0) / 1000; this._live = !!d.live;
    const nd = d.dur >= 0 ? d.dur / 1000 : (d.live ? Infinity : NaN);
    if (nd !== this._d) { this._d = nd; this.emit('durationchange'); }
    this.emit('timeupdate');
  }
  _state(d) {
    if (!this._on) return;
    if (d.state === 'ready' && this._rs < 4) { this._rs = 4; this.emit('loadedmetadata'); this.emit('canplay'); }
    if (d.state === 'buffering' && d.pwr) this.emit('waiting');
    if (d.playing && !this._playing) { this._playing = true; this._paused = false; this.emit('playing'); }
    if (!d.playing && this._playing) this._playing = false;
    if (!d.pwr && !this._paused) { this._paused = true; this.emit('pause'); }
    if (d.pwr && this._paused && d.state !== 'ended') { this._paused = false; this.emit('play'); }
  }
  /* start a stream; returns an "engine" object like attachStream does */
  async attach(url, { live = false, mime = '', startAt = 0, onFatal } = {}) {
    await this._ready;
    this._fatal = onFatal; this.error = null; this._on = true; this._rs = 0; this._t = live ? 0 : startAt || 0; this._d = NaN; this._buf = 0; this._paused = false; this._playing = false; this._tracks = { audio: [], text: [] };
    this.currentSrc = this.src = url;
    const ua = (window.Settings && Settings.get('userAgent')) || navigator.userAgent || 'DOOM-IPTV';
    await Exo.plugin().load({ url, start: !live && startAt > 0 ? startAt : 0, live, mime: mime || '', ua, aspect: (window.Player && Player.aspect) || 'fit', sub: SUB_SCALE[Settings.get('subSize') || 'm'] || 1 });
    this._vol !== 1 || this._muted ? Exo.call('volume', { v: this._muted ? 0 : this._vol }) : null;
    return { name: 'android', native: true, startsAt: !live && startAt > 0, destroy: () => { this._on = false; this._fatal = null; Exo.call('stop'); } };
  }
  release() { this._on = false; this._fatal = null; Exo.call('release'); }

  // ---- the <video> surface the player uses ----
  get currentTime() { return this._t; }
  set currentTime(s) { if (!isFinite(s)) return; this._t = Math.max(0, s); this.seeking = true; this.emit('seeking'); Exo.call('seek', { t: this._t }); }
  get duration() { return this._d; }
  get paused() { return this._paused; }
  get ended() { return false; }
  get readyState() { return this._rs; }
  get videoWidth() { return this._w; }
  get videoHeight() { return this._h; }
  get buffered() { return oneRange(0, this._buf); }
  get seekable() { return this._live || !isFinite(this._d) ? oneRange(0, 0) : oneRange(0, this._d); }
  get volume() { return this._vol; }
  set volume(x) { this._vol = Math.max(0, Math.min(1, +x || 0)); Exo.call('volume', { v: this._muted ? 0 : this._vol }); }
  get muted() { return this._muted; }
  set muted(m) { this._muted = !!m; Exo.call('volume', { v: this._muted ? 0 : this._vol }); }
  get playbackRate() { return this._rate; }
  set playbackRate(r) { this._rate = +r || 1; Exo.call('speed', { r: this._rate }); }
  play() { if (this._on) { this._paused = false; Exo.call('play'); this.emit('play'); } return Promise.resolve(); }
  pause() { if (this._on && !this._paused) { this._paused = true; Exo.call('pause'); this.emit('pause'); } }
  load() {} removeAttribute() {} setAttribute() {} canPlayType() { return 'probably'; }
  appendChild(n) { return this.sub.appendChild(n); }
  querySelectorAll(s) { return this.sub.querySelectorAll(s); }
  querySelector(s) { return this.sub.querySelector(s); }
  /* audio tracks inside the file (switching asks the native player) */
  get audioTracks() {
    return this._tracks.audio.map(tr => ({ label: tr.label || this._lang(tr.lang) + (tr.ch > 2 ? ' ' + tr.ch + 'ch' : ''), language: tr.lang, get enabled() { return tr.on; },
      set enabled(v) { if (v && !tr.on) { tr.on = true; Exo.call('select', { type: 'audio', id: tr.id }); } } }));
  }
  /* subtitles inside the file + subtitle files you loaded */
  get textTracks() {
    const nat = this._tracks.text.map(tr => ({ kind: 'subtitles', label: tr.label || this._lang(tr.lang), language: tr.lang, cues: null, native: true,
      get mode() { return tr.on ? 'showing' : 'disabled'; },
      set mode(m) { if (m === 'showing' && !tr.on) { tr.on = true; Exo.call('select', { type: 'text', id: tr.id }); } else if (m !== 'showing' && tr.on) { tr.on = false; Exo.call('select', { type: 'text', id: 'off' }); } } }));
    return nat.concat(Array.from(this.sub.textTracks || []));
  }
  _lang(l) { try { return l ? new Intl.DisplayNames([LANG === 'ar' ? 'ar' : 'en'], { type: 'language' }).of(l) : 'Track'; } catch { return l || 'Track'; } }
  /* the subtitle-file line for the current time (drawn by the player page) */
  cueText() {
    const tr = Array.from(this.sub.textTracks || []).find(x => x.mode === 'showing'); if (!tr || !tr.cues) return '';
    const t = this._t, out = [];
    for (const c of Array.from(tr.cues)) { if (c.startTime <= t && c.endTime > t) out.push(c.text); else if (c.startTime > t + 30) break; }
    return out.join('\n').replace(/<[^>]+>/g, '');
  }
}
window.Exo = Exo; window.NativeVideo = NativeVideo;
