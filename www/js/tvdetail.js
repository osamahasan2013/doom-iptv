/* DOOM IPTV — big-screen details page + trailer previews.
   Details: full-screen backdrop, title, info, actions, seasons and episodes (series), more like this.
   Trailers: the title's YouTube trailer plays muted behind the hero / details page after you stop on it
   for a moment; "Trailer" plays it full screen with sound. One YouTube player is reused. */
'use strict';
Object.assign(I18N.en, {
  trailers: 'Trailer previews', trOff: 'Off', trDetail: 'Details page only', trAll: 'Home and details page', trailersHint: 'Plays the trailer muted in the background when you stop on a movie',
  watchTrailer: 'Trailer', startOver: 'Start over', moreLike: 'More like this', nSeasons: '{n} seasons', oneSeason: '1 season', epsN: '{n} episodes', noEpisodes: 'No episodes yet'
});
Object.assign(I18N.ar, {
  trailers: 'عرض الإعلانات', trOff: 'إيقاف', trDetail: 'في صفحة التفاصيل فقط', trAll: 'في الرئيسية وصفحة التفاصيل', trailersHint: 'يشغّل إعلان الفيلم بدون صوت في الخلفية عند الوقوف عليه',
  watchTrailer: 'الإعلان', startOver: 'من البداية', moreLike: 'محتوى مشابه', nSeasons: '{n} مواسم', oneSeason: 'موسم واحد', epsN: '{n} حلقات', noEpisodes: 'لا توجد حلقات بعد'
});

const Trailer = {
  layer: null, fr: null, cur: '', state: -1, bad: new Set(),
  mode() { return Settings.get('trailers') || 'all'; },
  allowed(where) { const m = this.mode(); return m === 'all' || (m === 'detail' && where === 'detail'); },
  idOf(x) {
    x = String(x || '').trim(); if (!x) return '';
    const m = x.match(/(?:[?&]v=|youtu\.be\/|\/embed\/|\/shorts\/|\/v\/)([\w-]{11})/); if (m) return m[1];
    return /^[\w-]{11}$/.test(x) ? x : '';
  },
  url(id, full) {
    const o = /^https?:/.test(location.origin) ? '&origin=' + encodeURIComponent(location.origin) : '';
    return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0&iv_load_policy=3&modestbranding=1&enablejsapi=1${o}` +
      (full ? '&controls=1&fs=0' : `&mute=1&controls=0&disablekb=1&fs=0&loop=1&playlist=${id}`);
  },
  frame(id, full) {
    const f = h('iframe', { src: this.url(id, full), allow: 'autoplay; encrypted-media; picture-in-picture', referrerpolicy: 'strict-origin-when-cross-origin', tabindex: '-1', title: 'trailer' });
    f.addEventListener('load', () => this.hello(f)); return f;
  },
  // the YouTube page only reports its state after it is told someone is listening
  hello(f) { let n = 0; const go = () => { if (!f.isConnected || n++ > 16 || f._live) return; try { f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 'doom', channel: 'widget' }), '*'); } catch {} setTimeout(go, 250); }; go(); },
  cmd(f, func, args) { try { f && f.contentWindow && f.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args: args || [] }), '*'); } catch {} },
  init() {
    if (this._on) return; this._on = true;
    addEventListener('message', e => {
      const f = [this.fr, this.full && this.full.f].find(x => x && x.contentWindow === e.source); if (!f) return;
      let d; try { d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; } if (!d || !d.event) return;
      f._live = true;
      if (d.event === 'onError') { if (f === this.fr) { this.bad.add(this.cur); this.stop(); } else if (this.full) this.full.err(); return; }
      const st = d.event === 'onStateChange' ? d.info : (d.event === 'infoDelivery' && d.info && d.info.playerState != null ? d.info.playerState : null);
      if (st == null || f !== this.fr) return;
      this.state = st;
      if (st === 1) { clearTimeout(this._to); this.layer.classList.add('on'); }
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.stop(); });
  },
  /* muted preview behind the page; host = the background box to sit in */
  play(host, raw, where) {
    const id = this.idOf(raw);
    if (!host || !id || this.bad.has(id) || !this.allowed(where) || navigator.onLine === false || (window.Player && Player.open_)) return this.stop();
    if (this.cur === id && this.fr && this.layer.parentNode === host) return;
    this.init(); this.stop(true);
    if (!this.layer) this.layer = h('div', { class: 'trl' });
    if (this.layer.parentNode !== host) host.insertBefore(this.layer, $('.th-shade', host) || null);   // under the shade, so the text stays readable
    this.cur = id; this.state = -1; const f = this.frame(id, false); this.fr = f; this.layer.appendChild(f);
    clearTimeout(this._to); this._to = setTimeout(() => { if (this.fr === f && this.state !== 1) this.stop(); }, 12000);   // never started: give up quietly
  },
  stop(now) {
    clearTimeout(this._to); if (!this.layer) return;
    this.layer.classList.remove('on'); const f = this.fr; this.fr = null; this.cur = ''; this.state = -1;
    if (f) { this.cmd(f, 'pauseVideo'); if (now) f.remove(); else setTimeout(() => f.remove(), 500); }
  },
  /* full screen with sound; Back closes it */
  open(raw, title) {
    const id = this.idOf(raw); if (!id) return; this.init(); this.stop(true);
    const f = this.frame(id, true), msg = h('div', { class: 'trf-msg hidden' }, h('p', {}, t('errPlay') || 'Could not play'),
      h('a', { class: 'btn', href: 'https://www.youtube.com/watch?v=' + id, target: '_blank', rel: 'noopener' }, 'YouTube'));
    const box = h('div', { class: 'trf' }, f, msg);
    const m = UI.modal(title || t('watchTrailer'), box, { cls: 'trf-modal', onClose: () => { this.full = null; f.remove(); } });
    m.back.classList.add('trf-back');
    this.full = { f, m, err: () => msg.classList.remove('hidden') };
    // OK pauses / plays (the keys stay with the app, not the YouTube page)
    let paused = false; const btn = h('button', { class: 'trf-key', 'aria-label': 'play/pause' });
    btn.addEventListener('click', () => { paused = !paused; this.cmd(f, paused ? 'pauseVideo' : 'playVideo'); });
    box.appendChild(btn); setTimeout(() => btn.focus(), 60);
  }
};

const TvDetail = {
  open(it) { if (!it || !window.TvHome || !TvHome.open_) return false; Trailer.stop(); TvHome.go({ mode: 'detail', it }); return true; },
  /* called by TvHome.render for mode 'detail' */
  async render(box, v) {
    const it = v.it, me = v; const isS = it.type === 'series';
    const head = h('div', { class: 'thd-head' },
      h('div', { class: 'th-kicker' }, isS ? t('show') : t('movie')),
      h('h1', { class: 'thd-title' }, this.clean(it.name)),
      h('div', { class: 'th-meta thd-meta' }), h('p', { class: 'thd-plot' }, it.plot || ''),
      h('div', { class: 'thd-credits' }), h('div', { class: 'th-btns thd-btns' }));
    const page = h('div', { class: 'thd' }, head); box.appendChild(page);
    const M = Object.assign(Object.create(TvHome), { el: page }); M.meta(it, {});
    TvHome.bg(it.bd || TvHome.bdc[keyOf(it)] || '', it.img || '');
    this.buttons(head, it, null, null);
    setTimeout(() => { const b = $('.thd-btns .th-btn', page); b && TvHome.view === me && b.focus({ preventScroll: true }); }, 40);
    // details (and the episode list) arrive from the server
    let info = {};
    try { info = isS ? await provOf(it).seriesInfo(it.id, it) : await provOf(it).movieInfo(it.id, it); } catch {}
    if (TvHome.view !== me || !page.isConnected) return;
    info = info || {}; v.info = info; if (info.ext) it.ext = info.ext;
    M.meta(it, info);
    if (info.plot) $('.thd-plot', page).textContent = info.plot;
    const cr = $('.thd-credits', page);
    if (info.director) cr.appendChild(h('p', {}, h('b', {}, t('director') + ': '), String(info.director)));
    if (info.cast) cr.appendChild(h('p', {}, h('b', {}, t('cast') + ': '), String(info.cast)));
    if (info.backdrop) { TvHome.bg(info.backdrop, ''); TvHome.remember(it, info.backdrop); }
    let all = null;
    if (isS) {
      all = App.episodesFlat(info, it);
      const n = Object.keys(info.seasons || {}).length; if (n) { const mt = $('.thd-meta', page); mt.appendChild(h('i', { class: 'sep' }, '·')); mt.appendChild(h('span', {}, n === 1 ? t('oneSeason') : t('nSeasons', { n }))); }
      this.episodes(page, it, info, all);
    }
    const had = page.contains(document.activeElement) ? [...$$('.thd-btns .th-btn', page)].indexOf(document.activeElement) : -1;
    this.buttons(head, it, info, all);
    if (had >= 0) { const b = $$('.thd-btns .th-btn', page)[had] || $('.thd-btns .th-btn', page); b && b.focus({ preventScroll: true }); }
    this.more(page, it);
    clearTimeout(this._tt); if (info.trailer) this._tt = setTimeout(() => { if (TvHome.view === me && TvHome.open_) Trailer.play($('.th-bg', TvHome.el), info.trailer, 'detail'); }, 1000);
  },
  clean(n) { return String(n || '').replace(/^\s*((\[[^\]]{1,12}\]|[A-Za-z0-9+]{1,6})\s*[|:\-–]\s*)+/, ''); },
  btn(icon, label, run, cls = '') { const b = h('button', { class: 'th-btn ' + cls }, icon ? h('span', { html: icon }) : null, h('span', { class: 'tl' }, label)); b.addEventListener('click', run); return b; },
  buttons(head, it, info, all) {
    const box = $('.thd-btns', head); box.innerHTML = ''; const isS = it.type === 'series';
    if (isS) {
      const next = all && (all.find(e => { const p = Progress.get(e); return p && !p.done && p.pos > 15; }) || all.find(e => !(Progress.get(e) || {}).done) || all[0]);
      if (next) {
        const p = Progress.get(next), lab = `${p && p.pos > 15 && !p.done ? t('resume') : t('play')} ${t('sShort')}${next.season} ${t('epShort')}${next.episode}`;
        box.appendChild(this.btn(ic('play'), lab, () => Player.open(next, { list: all, index: all.indexOf(next) }), 'th-play'));
        if (p && p.pos > 15 && !p.done) box.appendChild(this.btn(ic('refresh'), t('startOver'), () => Player.open(next, { list: all, index: all.indexOf(next) }, { startAt: 0 })));
      } else box.appendChild(this.btn(ic('play'), t('play'), () => {}, 'th-play dim'));
    } else {
      const p = Progress.get(it), res = p && p.pos > 15 && !p.done;
      box.appendChild(this.btn(ic('play'), res ? t('resume') + ' ' + fmtTime(p.pos) : t('play'), () => Player.open(it, null, res ? { startAt: p.pos } : { startAt: 0 }), 'th-play'));
      if (res) box.appendChild(this.btn(ic('refresh'), t('startOver'), () => Player.open(it, null, { startAt: 0 })));
    }
    if (info && info.trailer && Trailer.idOf(info.trailer)) box.appendChild(this.btn(ic('film'), t('watchTrailer'), () => Trailer.open(info.trailer, this.clean(it.name))));
    const fav = Lists.has('fav', it);
    box.appendChild(this.btn(HEART, fav ? t('inMyList') : t('myList'), () => { Lists.toggle('fav', it); this.buttons(head, it, info, all); const b = $('.thd-fav', head); b && b.focus({ preventScroll: true }); }, 'thd-fav th-my' + (fav ? ' on' : '')));
    box.appendChild(this.btn(ic('star'), t('addToList'), () => UI.listPicker(it)));
    if (!isS && typeof Downloads !== 'undefined' && it.pl !== FREE_ID) box.appendChild(this.btn(ic('download'), Downloads.find(it) ? t('downloads') : t('download'), () => Downloads.add(it)));
  },
  episodes(page, series, info, all) {
    const seasons = Object.keys(info.seasons || {}).sort((a, b) => +a - +b);
    const wrap = h('div', { class: 'thd-eps-wrap' }); page.appendChild(wrap);
    if (!seasons.length) { wrap.appendChild(h('p', { class: 'th-empty' }, t('noEpisodes'))); return; }
    const next = all.find(e => { const p = Progress.get(e); return p && !p.done && p.pos > 15; }) || all.find(e => !(Progress.get(e) || {}).done);
    const v = TvHome.view; let cur = v.season && seasons.includes(v.season) ? v.season : next ? String(next.season) : seasons[0];
    const pills = h('div', { class: 'thd-seasons' }), list = h('div', { class: 'thd-eps' });
    wrap.append(pills, list);
    const draw = () => {
      $$('.thd-pill', pills).forEach(b => b.classList.toggle('on', b.dataset.s === cur));
      list.innerHTML = '';
      for (const e of all.filter(x => String(x.season) === cur)) list.appendChild(this.epRow(e, all));
    };
    seasons.forEach(s => {
      const n = (info.seasons[s] || []).length;
      const b = h('button', { class: 'thd-pill', 'data-s': s }, t('season') + ' ' + s, n ? h('small', {}, '· ' + t('epsN', { n })) : null);
      b.addEventListener('click', () => { if (cur === s) return; cur = v.season = s; draw(); });
      b.addEventListener('focus', () => { clearTimeout(this._pt); this._pt = setTimeout(() => { if (document.activeElement === b && cur !== s) { cur = v.season = s; draw(); } }, 350); });   // like tabs: stopping on a season shows it
      pills.appendChild(b);
    });
    draw();
  },
  epRow(e, all) {
    const p = Progress.get(e), mins = TvHome.dur(e.duration);
    const r = h('button', { class: 'thd-ep' + (p && p.done ? ' done' : '') },
      h('span', { class: 'thd-en' }, String(e.episode)),
      h('div', { class: 'thd-et' }, App.imgEl(e.img, e.name), p && p.dur ? h('div', { class: 'th-prog' }, h('i', { style: { width: (p.done ? 100 : Math.min(100, p.pos / p.dur * 100)) + '%' } })) : null),
      h('div', { class: 'thd-ex' },
        h('div', { class: 'thd-eh' }, h('b', {}, e.name || `${t('episode')} ${e.episode}`), mins ? h('small', {}, mins) : null, p && p.done ? h('span', { class: 'ok', html: ic('check') }) : null),
        e.plot ? h('p', {}, e.plot) : null));
    r._k = keyOf(e);
    r.addEventListener('click', () => { TvHome.view.lastEp = keyOf(e); Player.open(e, { list: all, index: all.indexOf(e) }); });
    return r;
  },
  more(page, it) {
    const sec = it.type === 'series' ? 'series' : 'movies';
    const same = App.listFor(sec, it.cat || 'all').filter(x => keyOf(x) !== keyOf(it) && App.itemAllowed(x));
    // newest first, so the row isn't the same old titles every time
    const items = same.slice().sort((a, b) => (+b.added || 0) - (+a.added || 0)).slice(0, 24);
    if (!items.length) return;
    const row = h('div', { class: 'th-row' }); items.forEach(x => row.appendChild(TvHome.card(x, items)));
    page.appendChild(h('section', { class: 'th-sec thd-more' }, h('h3', {}, t('moreLike')), row));
  },
  /* after the player closes: progress, resume button and ticks are fresh */
  refresh() {
    const v = TvHome.view; if (!v || v.mode !== 'detail' || !v.info) return;
    const page = $('.thd', TvHome.el); if (!page) return;
    const all = v.it.type === 'series' ? App.episodesFlat(v.info, v.it) : null;
    this.buttons($('.thd-head', page), v.it, v.info, all);
    if (all) { const w = $('.thd-eps-wrap', page), mo = $('.thd-more', page); if (w) w.remove(); this.episodes(page, v.it, v.info, all); if (mo) page.appendChild(mo); }
    const r = v.lastEp && $$('.thd-ep', page).find(x => x._k === v.lastEp); v.lastEp = null;
    if (r) r.focus({ preventScroll: true });
    else if (!page.contains(document.activeElement)) { const b = $('.thd-btns .th-btn', page); b && b.focus({ preventScroll: true }); }
  }
};
window.TvDetail = TvDetail; window.Trailer = Trailer;
