/* DOOM IPTV — offline downloads and live recording */
'use strict';

const MIME = { mp4: 'video/mp4', m4v: 'video/mp4', mkv: 'video/x-matroska', webm: 'video/webm', avi: 'video/x-msvideo', mov: 'video/quicktime', ts: 'video/mp2t' };

/* Writes a byte stream into IndexedDB in ~4 MB chunks (works in every browser / WebView) */
class ChunkSink {
  constructor(id, startIdx = 0) { this.id = id; this.idx = startIdx; this.buf = []; this.len = 0; }
  async write(u8) { this.buf.push(u8); this.len += u8.byteLength; if (this.len >= 4 * 1048576) await this.flush(); }
  async flush() {
    if (!this.len) return;
    const blob = new Blob(this.buf); this.buf = []; this.len = 0;
    await IDB.put('chunks', [this.id, this.idx++], blob);
  }
}
async function blobFromChunks(id, type) {
  const parts = await IDB.getRange('chunks', [id, 0], [id, Number.MAX_SAFE_INTEGER]);
  return new Blob(parts, { type });
}
const dropChunks = id => IDB.delRange('chunks', [id, 0], [id, Number.MAX_SAFE_INTEGER]).catch(() => {});
const nativeFS = () => isNative() && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem && window.Capacitor.Plugins.Filesystem.downloadFile ? window.Capacitor.Plugins.Filesystem : null;
const rawFetch = (...a) => (window.CapacitorWebFetch || fetch)(...a);

/* ---------------- downloads ---------------- */
const Downloads = {
  list: LS.get('downloads', []), ctrls: new Map(), running: false, listeners: new Set(),
  save() { LS.set('downloads', this.list.map(d => Object.assign({}, d, { status: d.status === 'running' ? 'paused' : d.status }))); this.emit(); },
  emit: debounce(function () { Downloads.listeners.forEach(f => { try { f(); } catch {} }); }, 150),
  find(item) { return this.list.find(d => d.key === keyOf(item)); },
  isDone(item) { const d = this.find(item); return !!(d && d.status === 'done'); },
  add(item, extra = {}) {
    if (this.find(item)) { UI.toast(t('downloads') + ': ' + item.name); return; }
    const d = { id: uid(), key: keyOf(item), pl: item.pl, status: 'queued', bytes: 0, total: 0, ts: Date.now(), ext: item.ext || 'mp4',
      item: { type: item.type, id: item.id, pl: item.pl, name: item.name, img: item.img || extra.seriesImg || '', ext: item.ext, url: item.url, seriesId: item.seriesId, season: item.season, episode: item.episode, seriesName: item.seriesName || extra.seriesName } };
    this.list.unshift(d); this.save(); UI.toast(t('dlQueued') + ': ' + (d.item.seriesName ? d.item.seriesName + ' ' + t('sShort') + d.item.season + t('epShort') + d.item.episode : d.item.name));
    try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch {}
    this.pump();
  },
  async pump() {
    if (this.running) return;
    const next = this.list.find(d => d.status === 'queued'); if (!next) return;
    const prov = Playlists.provider(next.pl);
    if (prov && !(prov instanceof DemoProvider) && !(prov instanceof M3UProvider)) {
      const c = await Conn.canOpenExtra(next.pl);
      if (!c.ok) { setTimeout(() => this.pump(), 30000); return; } // wait until a connection is free
    }
    this.running = true;
    try { await this.run(next); } catch (e) { console.warn('download', e); if (next.status === 'running') { next.status = 'error'; next.err = String(e.message || e); } }
    this.running = false; Conn.close('dl:' + next.id); this.save(); this.pump();
  },
  async run(d) {
    d.status = 'running'; this.emit();
    const prov = Playlists.provider(d.pl);
    if (!prov) throw new Error('subscription removed');
    const url = prov.streamUrl(d.item);
    Conn.open('dl:' + d.id, 'download', d.pl);
    if (url.startsWith('demo:')) { // simulated download for demo mode
      d.total = 50 * 1048576; d.demoUrl = url;
      while (d.bytes < d.total && d.status === 'running') { await sleep(120); d.bytes += 2.5 * 1048576; this.emit(); }
      if (d.status === 'running') { d.bytes = d.total; d.status = 'done'; }
      return;
    }
    const fs = nativeFS();
    if (fs) { // Android / iOS app: native downloader writes straight to app storage
      const path = 'doom/' + d.id + '.' + d.ext;
      const sub = await fs.addListener('progress', p => { if (p.url === url) { d.bytes = p.bytes; d.total = p.contentLength; this.emit(); } });
      try { const r = await fs.downloadFile({ url, path, directory: 'DATA', recursive: true, progress: true }); d.nativePath = r.path || path; d.status = 'done'; }
      finally { sub && sub.remove && sub.remove(); }
      return;
    }
    const ctrl = new AbortController(); this.ctrls.set(d.id, ctrl);
    const headers = d.bytes ? { Range: 'bytes=' + d.bytes + '-' } : {};
    const res = await rawFetch(url, { headers, signal: ctrl.signal });
    if (!res.ok && res.status !== 206) throw new Error('HTTP ' + res.status);
    if (d.bytes && res.status !== 206) { await dropChunks(d.id); d.bytes = 0; d.chunks = 0; } // server ignored Range: restart
    const len = +res.headers.get('content-length') || 0; if (len) d.total = d.bytes + len;
    const sink = new ChunkSink(d.id, d.chunks || 0); const reader = res.body.getReader();
    let lastSave = Date.now();
    try {
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        await sink.write(value); d.bytes += value.byteLength;
        if (sink.idx !== d.chunks) { d.chunks = sink.idx; }
        if (Date.now() - lastSave > 2000) { lastSave = Date.now(); this.emit(); LS.set('downloads', this.list); }
      }
      await sink.flush(); d.chunks = sink.idx; d.status = 'done';
    } catch (e) {
      // keep only fully flushed chunks so resume (HTTP Range) continues from a clean boundary
      d.bytes -= sink.len; d.chunks = sink.idx;
      if (d.status === 'paused') return; throw e;
    } finally { this.ctrls.delete(d.id); }
  },
  pause(d) { if (d.status === 'running') { d.status = 'paused'; const c = this.ctrls.get(d.id); c && c.abort(); } else if (d.status === 'queued') d.status = 'paused'; this.save(); },
  resume(d) { d.status = 'queued'; d.err = null; this.save(); this.pump(); },
  async remove(d) {
    if (d.status === 'running') { d.status = 'paused'; const c = this.ctrls.get(d.id); c && c.abort(); }
    this.list = this.list.filter(x => x !== d); this.save();
    await dropChunks(d.id);
    const fs = nativeFS(); if (fs && d.nativePath) { try { await fs.deleteFile({ path: 'doom/' + d.id + '.' + d.ext, directory: 'DATA' }); } catch {} }
  },
  async play(d) {
    const it = Object.assign({}, d.item, { offline: true });
    if (d.demoUrl) return Player.open(it, null, { url: d.demoUrl });
    if (d.nativePath) return Player.open(it, null, { url: window.Capacitor.convertFileSrc(d.nativePath) });
    const blob = await blobFromChunks(d.id, MIME[d.ext] || 'video/mp4');
    const url = URL.createObjectURL(blob);
    Player.open(it, null, { url, mime: d.ext === 'ts' ? 'ts' : '' });
  },
  async saveToDevice(d) {
    if (d.demoUrl) return UI.toast(t('demoNote'));
    const blob = await blobFromChunks(d.id, MIME[d.ext] || 'video/mp4');
    const a = h('a', { href: URL.createObjectURL(blob), download: (d.item.seriesName ? d.item.seriesName + ' S' + d.item.season + 'E' + d.item.episode : d.item.name).replace(/[\\/:*?"<>|]+/g, '_') + '.' + d.ext });
    document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 1000);
  },
  usage() { return this.list.reduce((s, d) => s + (d.bytes || 0), 0); }
};

/* ---------------- recordings (live TV) ---------------- */
const Recorder = {
  list: LS.get('recordings', []), ctrls: new Map(), listeners: new Set(),
  save() { LS.set('recordings', this.list); this.emit(); },
  emit: debounce(function () { Recorder.listeners.forEach(f => { try { f(); } catch {} }); }, 150),
  isRecording(item) { return this.list.some(r => r.status === 'recording' && r.key === keyOf(item)); },
  async toggle(item) {
    const r = this.list.find(x => x.status === 'recording' && x.key === keyOf(item));
    if (r) return this.stop(r);
    return this.start(item, 0);
  },
  schedule(item, startMs, minutes) {
    this.list.unshift({ id: uid(), key: keyOf(item), pl: item.pl, item: { type: 'live', id: item.id, pl: item.pl, name: item.name, img: item.img, url: item.url }, status: 'scheduled', start: startMs, minutes, bytes: 0, ts: Date.now() });
    this.save(); UI.toast(t('scheduled') + ': ' + item.name);
  },
  async start(item, minutes, existing) {
    const prov = Playlists.provider(item.pl);
    if (!prov) return;
    if (!(prov instanceof DemoProvider)) {
      const c = await Conn.canOpenExtra(item.pl);
      if (!c.ok) { UI.alert(t('connLimitTitle'), t('connLimit', { n: c.max })); if (existing) { existing.status = 'error'; existing.err = 'connections'; this.save(); } return; }
    }
    const r = existing || { id: uid(), key: keyOf(item), pl: item.pl, item: { type: 'live', id: item.id, pl: item.pl, name: item.name, img: item.img, url: item.url }, bytes: 0, ts: Date.now() };
    if (!existing) this.list.unshift(r);
    r.status = 'recording'; r.started = Date.now(); r.minutes = minutes || r.minutes || 0; r.chunks = 0; this.save();
    UI.toast('● ' + t('recording') + ': ' + item.name);
    const url = prov instanceof XtreamProvider ? prov.streamUrl(item, { format: 'ts' }) : prov.streamUrl(item);
    Conn.open('rec:' + r.id, 'record', item.pl);
    const ctrl = new AbortController(); this.ctrls.set(r.id, ctrl);
    if (r.minutes) r.timer = setTimeout(() => this.stop(r), r.minutes * 60000);
    if (url.startsWith('demo:')) {
      r.demoUrl = url;
      (async () => { while (r.status === 'recording') { await sleep(1000); r.bytes += 600000; this.emit(); } })();
      return;
    }
    try {
      const res = await rawFetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const sink = new ChunkSink('rec:' + r.id); const reader = res.body.getReader();
      try {
        for (;;) { const { done, value } = await reader.read(); if (done) break; await sink.write(value); r.bytes += value.byteLength; this.emit(); }
      } finally { await sink.flush(); r.chunks = sink.idx; }
      if (r.status === 'recording') r.status = 'done';
    } catch (e) {
      if (r.status === 'recording') { r.status = r.bytes > 0 ? 'done' : 'error'; r.err = String(e.message || e); }
    } finally {
      this.ctrls.delete(r.id); Conn.close('rec:' + r.id); r.ended = Date.now(); this.save();
      Player.open_ && Player.updateRecBadge();
    }
  },
  stop(r) {
    clearTimeout(r.timer);
    if (r.status === 'recording') { r.status = 'done'; r.ended = Date.now(); const c = this.ctrls.get(r.id); c && c.abort(); Conn.close('rec:' + r.id); }
    else if (r.status === 'scheduled') r.status = 'cancelled';
    this.save(); Player.open_ && Player.updateRecBadge();
  },
  async remove(r) { this.stop(r); this.list = this.list.filter(x => x !== r); this.save(); await dropChunks('rec:' + r.id); },
  async play(r) {
    const it = Object.assign({}, r.item, { type: 'live', name: r.item.name + ' — ' + new Date(r.started || r.ts).toLocaleString() });
    if (r.demoUrl) return Player.open(it, null, { url: r.demoUrl.replace('demo:live', 'demo:movie'), catchup: t('recordings'), recording: true });
    const blob = await blobFromChunks('rec:' + r.id, 'video/mp2t');
    Player.open(it, null, { url: URL.createObjectURL(blob), mime: 'ts', catchup: t('recordings'), recording: true });
  },
  async saveToDevice(r) {
    if (r.demoUrl) return UI.toast(t('demoNote'));
    const blob = await blobFromChunks('rec:' + r.id, 'video/mp2t');
    const a = h('a', { href: URL.createObjectURL(blob), download: (r.item.name + ' ' + new Date(r.started || r.ts).toISOString().slice(0, 16)).replace(/[\\/:*?"<>|]+/g, '_') + '.ts' });
    document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 1000);
  },
  tick() {
    const now = Date.now();
    for (const r of this.list) {
      if (r.status === 'scheduled' && r.start <= now) {
        const endAt = r.start + r.minutes * 60000;
        if (now < endAt) this.start(r.item, Math.ceil((endAt - now) / 60000), r); else { r.status = 'missed'; this.save(); }
      }
    }
  },
  init() {
    // recordings interrupted by closing the app are kept as finished files
    for (const r of this.list) if (r.status === 'recording') { r.status = r.bytes ? 'done' : 'error'; }
    this.save(); setInterval(() => this.tick(), 15000); this.tick();
  }
};
