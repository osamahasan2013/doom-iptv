/* DOOM IPTV — subtitle sync: manual delay + automatic sync by listening to the dialogue.
 *
 * Automatic sync works like ffsubsync / alass: it listens to the audio while the video plays,
 * detects where people are speaking (voice-activity detection on the speech band 300–3400 Hz),
 * then finds the delay (and frame-rate ratio) that best lines the subtitle lines up with the speech.
 */
'use strict';

Object.assign(I18N.en, {
  subSync: 'Subtitle sync', subDelay: 'Delay', subReset: 'Reset', subAuto: 'Auto-sync (listens to the dialogue)', subListening: 'Listening to the dialogue… {n} s',
  subDone: 'Subtitles synced: {d}', subFail: 'Couldn’t find a clear match — adjust it manually', subNoSubs: 'Turn on or load subtitles first',
  subBlocked: 'This server doesn’t allow listening to the audio. Use the manual buttons.', subPaused: 'Press play — auto-sync listens while the video plays',
  subSize: 'Subtitle size', subSmall: 'Small', subMedium: 'Medium', subLarge: 'Large', subXL: 'Extra large', subFps: 'frame-rate fixed', subCancel: 'Stop'
});
Object.assign(I18N.ar, {
  subSync: 'مزامنة الترجمة', subDelay: 'التأخير', subReset: 'إعادة ضبط', subAuto: 'مزامنة تلقائية (تسمع الحوار)', subListening: 'جاري الاستماع للحوار… {n} ث',
  subDone: 'تمت مزامنة الترجمة: {d}', subFail: 'لم أجد تطابقاً واضحاً — اضبطها يدوياً', subNoSubs: 'شغّل الترجمة أو حمّل ملف ترجمة أولاً',
  subBlocked: 'هذا السيرفر لا يسمح بالاستماع للصوت. استخدم الأزرار اليدوية.', subPaused: 'شغّل الفيديو — المزامنة التلقائية تسمع أثناء التشغيل',
  subSize: 'حجم الترجمة', subSmall: 'صغير', subMedium: 'متوسط', subLarge: 'كبير', subXL: 'كبير جداً', subFps: 'تم تصحيح فرق سرعة الإطارات', subCancel: 'إيقاف'
});

const SubSync = {
  offset: 0, scale: 1, busy: false,
  store: LS.get('subSync', {}),
  key(it) { return it ? keyOf(it) : ''; },
  load(it) { const v = this.store[this.key(it)] || {}; this.offset = v.o || 0; this.scale = v.s || 1; },
  save(it) {
    const k = this.key(it); if (!k) return;
    if (!this.offset && this.scale === 1) delete this.store[k]; else this.store[k] = { o: Math.round(this.offset * 1000) / 1000, s: this.scale };
    const keys = Object.keys(this.store); if (keys.length > 400) delete this.store[keys[0]];
    LS.set('subSync', this.store);
  },
  track(v) { return Array.from(v.textTracks || []).find(t => t.mode === 'showing') || null; },
  /* move every cue of the showing track to base * scale + offset (base = original timing) */
  apply(v) {
    const tr = this.track(v); if (!tr || !tr.cues) return 0;
    const o = this.offset, s = this.scale; let n = 0;
    for (const c of Array.from(tr.cues)) {
      if (!c._b) c._b = [c.startTime, c.endTime];
      const st = Math.max(0, c._b[0] * s + o), en = Math.max(st + 0.05, c._b[1] * s + o);
      if (Math.abs(c.startTime - st) > 0.001 || Math.abs(c.endTime - en) > 0.001) { c.startTime = st; c.endTime = en; }
      n++;
    }
    return n;
  },
  fmt(o) { return (o > 0 ? '+' : o < 0 ? '−' : '±') + Math.abs(o).toFixed(1) + ' s'; },

  /* ---------- automatic sync ---------- */
  cues(v) {
    const tr = this.track(v); if (!tr || !tr.cues) return [];
    return Array.from(tr.cues).map(c => c._b || [c.startTime, c.endTime]).filter(b => b[1] > b[0]);
  },
  /* speech detection: per-frame energy in the voice band, adaptive threshold */
  speechMask(frames) {
    const es = frames.map(f => f.e).sort((a, b) => a - b);
    const p = q => es[Math.min(es.length - 1, Math.floor(q * es.length))];
    const floor = p(0.2), top = p(0.9);
    const thr = floor + Math.max(6, (top - floor) * 0.45);
    return frames.map(f => (f.e > thr && f.r > 0.35 ? 1 : 0));
  },
  /* find the delay (and frame-rate ratio) that best matches subtitle lines to detected speech */
  solve(frames, cues) {
    if (frames.length < 100) return null;
    const step = 0.1; frames = frames.slice().sort((a, b) => a.t - b.t);
    const t0 = frames[0].t, t1 = frames[frames.length - 1].t, n = Math.max(1, Math.round((t1 - t0) / step));
    const mask = this.speechMask(frames); const S = new Float32Array(n + 1); let fi = 0;
    for (let i = 0; i <= n; i++) { const tt = t0 + i * step; while (fi < frames.length - 1 && Math.abs(frames[fi + 1].t - tt) <= Math.abs(frames[fi].t - tt)) fi++; S[i] = mask[fi]; }
    let mean = 0; for (let i = 0; i <= n; i++) mean += S[i]; mean /= (n + 1);
    if (mean < 0.05 || mean > 0.95) return { ok: false, why: 'speech' };
    const P = new Float64Array(n + 2); for (let i = 0; i <= n; i++) P[i + 1] = P[i] + (S[i] - mean); // centred prefix sums
    const sumOver = (a, b) => { const ia = Math.max(0, Math.min(n + 1, Math.round((a - t0) / step))), ib = Math.max(0, Math.min(n + 1, Math.round((b - t0) / step))); return ib > ia ? P[ib] - P[ia] : 0; };
    const scales = [1, 25 / 23.976, 23.976 / 25, 24 / 23.976, 23.976 / 24, 25 / 24, 24 / 25];
    let best = { score: -Infinity }; const all = [];
    for (const s of scales) {
      const near = cues.filter(c => c[1] * s + 30 >= t0 && c[0] * s - 30 <= t1);
      for (let k = -300; k <= 300; k++) {
        const o = k * step; let sc = 0, inWin = 0;
        for (const c of near) { const a = c[0] * s + o, b = c[1] * s + o; if (b < t0 || a > t1) continue; inWin++; sc += sumOver(a, b); }
        if (inWin < 4) continue;
        const r = { s, o, score: sc, inWin }; all.push(r); if (sc > best.score) best = r;
      }
    }
    if (!isFinite(best.score) || best.score <= 0) return { ok: false, why: 'match' };
    // confidence: the best delay must clearly beat any delay more than 1 s away (same frame-rate)
    const second = all.filter(r => r.s === best.s && Math.abs(r.o - best.o) > 1).reduce((m, r) => Math.max(m, r.score), -Infinity);
    const conf = second > 0 ? (best.score - second) / best.score : 1;
    // keep the frame-rate ratio at 1 unless another ratio is clearly better
    const plain = all.filter(r => r.s === 1).reduce((m, r) => (r.score > m.score ? r : m), { score: -Infinity });
    const pick = best.s !== 1 && plain.score > best.score * 0.92 ? plain : best;
    return { ok: conf >= 0.12, offset: pick.o, scale: pick.s, conf, cues: pick.inWin, speech: mean };
  },
  /* listens to the playing video; calls onTick(seconds) and resolves with the result */
  async auto(player, onTick) {
    const v = player.v;
    if (!this.cues(v).length) return { ok: false, why: 'nosubs' };
    const an = await player.audioAnalyser(); if (!an) return { ok: false, why: 'blocked' };
    this.busy = true; this.cancelled = false;
    const sr = an.context.sampleRate, bins = an.frequencyBinCount, hz = sr / 2 / bins;
    const buf = new Float32Array(bins); const lo = Math.floor(300 / hz), hi = Math.ceil(3400 / hz), tlo = Math.floor(80 / hz), thi = Math.min(bins - 1, Math.ceil(8000 / hz));
    const frames = []; let silentFrames = 0; const startT = v.currentTime; let res = null;
    try {
      for (let listened = 0; ;) {
        await sleep(50);
        if (this.cancelled || !player.open_) return { ok: false, why: 'cancel' };
        if (v.paused || v.seeking || v.readyState < 3) continue;
        an.getFloatFrequencyData(buf);
        let band = 0, tot = 0;
        for (let i = tlo; i <= thi; i++) { const pw = Math.pow(10, buf[i] / 10); tot += pw; if (i >= lo && i <= hi) band += pw; }
        if (!isFinite(band) || tot < 1e-12) { silentFrames++; if (silentFrames > 120 && frames.length < 10) return { ok: false, why: 'blocked' }; continue; }
        frames.push({ t: v.currentTime, e: 10 * Math.log10(band + 1e-12), r: band / (tot + 1e-12) });
        listened = Math.abs(v.currentTime - startT);
        onTick && onTick(Math.floor(listened));
        if (listened >= 40 && frames.length % 40 === 0) { // try after 40 s, keep listening up to 120 s for a confident answer
          res = this.solve(frames, this.cues(v));
          if ((res && res.ok) || listened >= 120) break;
        }
      }
    } finally { this.busy = false; }
    return res || { ok: false, why: 'match' };
  }
};
