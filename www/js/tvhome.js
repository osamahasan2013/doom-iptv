/* DOOM IPTV — big-screen home (TVs and large screens)
   Left icon rail · top bar (logo, Live TV / Movies / Series / Latest, accounts, update, clock) ·
   hero with the current title over a full-screen background that changes with the content ·
   rows of wide cards (Continue watching, recently added, top rated, favourites, live). */
'use strict';
Object.assign(I18N.en, {
  homeView: 'Home screen', hvClassic: 'Classic (side menu)', hvTv: 'Big screen (TV home)', homeViewHint: 'For TVs and big screens: a home page with rows and a background that follows the content',
  playNow: 'Play Now', moreInfo: 'More Info', myList: 'My List', inMyList: 'In My List', latest: 'Latest', accounts: 'Accounts', update: 'Update', home: 'Home',
  rowContinue: 'Continue Watching', rowNewMovies: 'Recently added movies', rowNewSeries: 'Recently added series', rowTop: 'Top rated', rowFav: 'My List', rowLive: 'Live TV',
  minLeft: '{n}m left', hLeft: '{h}h {m}m left', movie: 'Movie', show: 'Series', channel: 'Channel', featured: 'Featured', resumeAt: 'Resume'
});
Object.assign(I18N.ar, {
  homeView: 'الشاشة الرئيسية', hvClassic: 'الكلاسيكية (قائمة جانبية)', hvTv: 'الشاشات الكبيرة (رئيسية التلفزيون)', homeViewHint: 'للتلفزيونات والشاشات الكبيرة: صفحة رئيسية بصفوف وخلفية بتتغير مع المحتوى',
  playNow: 'تشغيل', moreInfo: 'تفاصيل', myList: 'قائمتي', inMyList: 'في قائمتي', latest: 'الأحدث', accounts: 'الحسابات', update: 'تحديث', home: 'الرئيسية',
  rowContinue: 'متابعة المشاهدة', rowNewMovies: 'أفلام مضافة حديثاً', rowNewSeries: 'مسلسلات مضافة حديثاً', rowTop: 'الأعلى تقييماً', rowFav: 'قائمتي', rowLive: 'البث المباشر',
  minLeft: 'متبقي {n} د', hLeft: 'متبقي {h}س {m}د', movie: 'فيلم', show: 'مسلسل', channel: 'قناة', featured: 'مميز', resumeAt: 'استكمال'
});

const TvHome = {
  el: null, open_: false, cur: null, feat: [], fi: 0, info: new Map(), _rot: 0, _fT: 0, _clk: 0, _bgSrc: '',
  enabled() { return Settings.get('homeView') === 'tv'; },

  open() {
    if (!App.data || !App.el) return;
    if (!this.el) this.build();
    this.open_ = true; document.body.classList.add('th-on'); this.el.classList.remove('hidden');
    this.fillRows(); this.pickFeatured(); this.show(this.feat[0] || null, true); this.startRotate(); this.tick();
    clearInterval(this._clk); this._clk = setInterval(() => this.tick(), 20000);
    setTimeout(() => { const b = $('.th-play', this.el); if (document.body.classList.contains('tv') && b) b.focus({ preventScroll: true }); }, 80);
  },
  close() {
    if (!this.el) return; this.open_ = false; document.body.classList.remove('th-on'); this.el.classList.add('hidden');
    clearInterval(this._rot); clearInterval(this._clk);
  },
  refresh() { if (this.open_) { this.fillRows(); this.pickFeatured(); } },
  /* leave the home page for a section of the classic layout */
  leave(sec, then) { this.close(); if (sec) App.go(sec); then && then(); setTimeout(() => App.ensureFocus && App.ensureFocus(), 80); },

  build() {
    const rb = (icon, label, run, cls = '') => { const b = h('button', { class: 'th-rb ' + cls, title: label, 'aria-label': label, html: icon }); b.addEventListener('click', run); return b; };
    const tab = (cls, icon, label, run) => { const b = h('button', { class: 'th-tab' }, h('span', { class: 'th-ti ' + cls, html: icon }), h('span', {}, label)); b.addEventListener('click', run); return b; };
    this.el = h('div', { class: 'th hidden' },
      h('div', { class: 'th-bg' }, h('div', { class: 'th-bgi a on' }), h('div', { class: 'th-bgi b' }), h('div', { class: 'th-shade' })),
      h('nav', { class: 'th-rail' },
        rb(ic('user'), t('accounts'), () => this.leave('settings'), 'top'),
        h('div', { class: 'th-rail-mid' },
          rb(ic('search'), t('search'), () => this.leave(null, () => { const s = $('.search-in', App.el); s && s.focus(); })),
          rb(ic('home'), t('home'), () => this.scrollTop(), 'on'),
          rb(ic('tv'), t('live'), () => this.leave('live')),
          rb(ic('film'), t('movies'), () => this.leave('movies')),
          rb(ic('series'), t('series'), () => this.leave('series')),
          rb(HEART, t('favorites'), () => this.leave('favorites'), 'heart'),
          rb(ic('history'), t('continue'), () => this.leave('continue')),
          rb(ic('mv'), t('multiview'), () => this.leave('multiview'))),
        rb(ic('settings'), t('settings'), () => this.leave('settings'), 'bottom')),
      h('div', { class: 'th-main' },
        h('header', { class: 'th-top' },
          h('div', { class: 'th-logo' }, h('img', { src: 'icons/logo-128.png', alt: '' }), h('b', {}, 'DOOM'), h('span', {}, 'iptv')),
          h('div', { class: 'th-tabs' },
            tab('t-live', ic('tv'), t('live'), () => this.leave('live')),
            tab('t-mov', ic('film'), t('movies'), () => this.leave('movies')),
            tab('t-ser', ic('series'), t('series'), () => this.leave('series')),
            tab('t-new', ic('trend'), t('latest'), () => { Settings.set('sort', 'added'); const s = $('.sort-sel', App.el); if (s) s.value = 'added'; this.leave('movies'); })),
          h('div', { class: 'th-right' },
            (() => { const b = h('button', { class: 'th-link' }, h('span', { html: ic('swap') }), t('accounts')); b.addEventListener('click', () => this.leave('settings')); return b; })(),
            (() => { const b = h('button', { class: 'th-link th-upd' }, h('span', { html: ic('refresh') }), t('update')); b.addEventListener('click', async () => { b.classList.add('busy'); await App.refreshLibrary(); b.classList.remove('busy'); this.refresh(); }); return b; })(),
            h('div', { class: 'th-clock' }, h('b', {}), h('small', {})))),
        h('section', { class: 'th-hero' },
          h('div', { class: 'th-hero-in' },
            h('div', { class: 'th-kicker' }), h('h1', { class: 'th-title' }), h('div', { class: 'th-meta' }), h('p', { class: 'th-plot' }),
            h('div', { class: 'th-btns' },
              (() => { const b = h('button', { class: 'th-btn th-play' }, h('span', { html: ic('play') }), h('span', { class: 'tl' }, t('playNow'))); b.addEventListener('click', () => this.play(this.cur)); return b; })(),
              (() => { const b = h('button', { class: 'th-btn' }, h('span', { html: ic('info') }), t('moreInfo')); b.addEventListener('click', () => this.more(this.cur)); return b; })(),
              (() => { const b = h('button', { class: 'th-btn th-my' }, h('span', { class: 'pl' }, '+'), h('span', { class: 'tl' }, t('myList'))); b.addEventListener('click', () => { if (!this.cur) return; Lists.toggle('fav', this.cur); this.updMy(); this.fillRows(true); }); return b; })())),
          h('div', { class: 'th-car' },
            (() => { const b = h('button', { class: 'th-arr', html: ic('chevLeft'), 'aria-label': 'prev', tabindex: -1 }); b.addEventListener('click', () => this.step(-1)); return b; })(),
            h('div', { class: 'th-dots' }),
            (() => { const b = h('button', { class: 'th-arr', html: ic('chevRight'), 'aria-label': 'next', tabindex: -1 }); b.addEventListener('click', () => this.step(1)); return b; })())),
        h('div', { class: 'th-rows' })));
    document.body.appendChild(this.el);
    // the background and the hero follow the focused card; the row scrolls sideways to keep it in view
    this.el.addEventListener('focusin', e => {
      const c = e.target.closest('.th-card');
      if (c && c._it) { clearInterval(this._rot); this._rot = 0; clearTimeout(this._fT); this._fT = setTimeout(() => this.show(c._it), 260); this.reveal(c); }
      else if (e.target.closest('.th-hero') && !this._rot) this.startRotate();
    });
    this.el.addEventListener('mouseover', e => { const c = e.target.closest('.th-card'); if (c && c._it && c._it !== this.cur) { clearTimeout(this._fT); this._fT = setTimeout(() => this.show(c._it), 400); } });
  },
  /* keep the focused card inside its row (scroll only the row, never the page sideways) */
  reveal(c) {
    const row = c.parentElement, main = $('.th-main', this.el); if (main) main.scrollLeft = 0;
    const r = c.getBoundingClientRect(), w = row.getBoundingClientRect(), pad = 40;
    if (r.left < w.left + pad) row.scrollLeft -= (w.left + pad - r.left); else if (r.right > w.right - pad) row.scrollLeft += (r.right - w.right + pad);
  },
  scrollTop() { const m = $('.th-main', this.el); if (m) m.scrollTop = 0; const b = $('.th-play', this.el); b && b.focus({ preventScroll: true }); this.startRotate(); },
  tick() {
    if (!this.el) return; const d = new Date();
    $('.th-clock b', this.el).textContent = d.toLocaleTimeString(LANG === 'ar' ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
    $('.th-clock small', this.el).textContent = d.toLocaleDateString(LANG === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  },

  /* ---------- content ---------- */
  list(sec, how, n = 24) {
    if (!App.data || !App.data[sec]) return [];
    const a = App.listFor(sec, 'all').slice();
    if (how === 'added') a.sort((x, y) => (y.added || 0) - (x.added || 0));
    if (how === 'rating') return a.filter(x => +x.rating > 0).sort((x, y) => (+y.rating) - (+x.rating) || (y.added || 0) - (x.added || 0)).slice(0, n);
    return a.slice(0, n);
  },
  pickFeatured() {
    // newest movies and series, alternating, with a picture
    const m = this.list('movies', 'added', 12).filter(x => x.img), s = this.list('series', 'added', 12).filter(x => x.img || x.bd);
    const out = []; for (let i = 0; out.length < 6 && (i < m.length || i < s.length); i++) { if (m[i]) out.push(m[i]); if (s[i] && out.length < 6) out.push(s[i]); }
    this.feat = out; this.fi = 0;
    const dots = $('.th-dots', this.el); dots.innerHTML = ''; this.feat.forEach((_, i) => dots.appendChild(h('i', { class: i === 0 ? 'on' : '' })));
  },
  startRotate() { clearInterval(this._rot); if (this.feat.length < 2) return; this._rot = setInterval(() => { if (!this.open_ || UI.top() || Player.open_) return; this.step(1, true); }, 9000); },
  step(d, auto) {
    if (!this.feat.length) return; this.fi = (this.fi + d + this.feat.length) % this.feat.length; this.show(this.feat[this.fi]);
    $$('.th-dots i', this.el).forEach((x, i) => x.classList.toggle('on', i === this.fi)); if (!auto) this.startRotate();
  },
  fillRows(keepFocus) {
    const box = $('.th-rows', this.el); const had = keepFocus && document.activeElement && box.contains(document.activeElement);
    box.innerHTML = '';
    const cont = Progress.continueList().slice(0, 20).map(p => {
      const live = p.item.seriesId ? null : App.findItem('movies', p.item.id, p.item.pl);
      return Object.assign({}, live || p.item, { _p: p });
    });
    const favs = (Lists.data.find(l => l.id === 'fav') || { items: [] }).items.slice().reverse().slice(0, 24);
    const rows = [
      ['rowContinue', cont, 'history'], ['rowNewMovies', this.list('movies', 'added'), 'film'], ['rowNewSeries', this.list('series', 'added'), 'series'],
      ['rowTop', [...this.list('movies', 'rating', 12), ...this.list('series', 'rating', 12)].sort((a, b) => (+b.rating) - (+a.rating)), 'star'],
      ['rowFav', favs, 'heart'], ['rowLive', this.list('live', 'default', 24), 'tv']
    ];
    for (const [k, items, icn] of rows) {
      if (!items.length) continue;
      const row = h('div', { class: 'th-row' });
      items.forEach(it => row.appendChild(this.card(it)));
      box.appendChild(h('section', { class: 'th-sec' }, h('h3', {}, t(k)), row));
    }
    if (had) { const f = $('.th-card', box); f && f.focus({ preventScroll: true }); }
  },
  stars(r) { r = Math.max(0, Math.min(10, +r || 0)) / 2; let s = ''; for (let i = 1; i <= 5; i++) s += r >= i - .25 ? '★' : r >= i - .75 ? '⯪' : '☆'; return s.replace(/⯪/g, '★'); },
  card(it) {
    const p = it._p; const live = it.type === 'live';
    const sub = p ? (() => { const left = Math.max(0, (p.dur - p.pos) / 60); return left >= 60 ? t('hLeft', { h: Math.floor(left / 60), m: Math.round(left % 60) }) : t('minLeft', { n: Math.max(1, Math.round(left)) }); })()
      : [it.type === 'movie' ? t('movie') : it.type === 'series' ? t('show') : t('channel'), it.year].filter(Boolean).join(' · ');
    const title = p && p.item.seriesName ? p.item.seriesName + ' · ' + t('sShort') + p.item.season + t('epShort') + p.item.episode : it.name;
    const img = live ? App.imgEl(it.img, it.name, 'logo') : App.imgEl(it.bd || it.img || (p && p.item.seriesImg), it.name);
    const c = h('button', { class: 'th-card' + (live ? ' live' : ''), 'aria-label': title },
      h('div', { class: 'th-img' }, img),
      +it.rating > 0 ? h('span', { class: 'th-rate' }, h('em', {}, this.stars(it.rating)), ' ' + (+it.rating).toFixed(1)) : null,
      App.marks ? App.marks(it) : null,
      h('div', { class: 'th-cap' }, p ? h('div', { class: 'th-prog' }, h('i', { style: { width: Math.min(100, p.pos / p.dur * 100) + '%' } })) : null, h('b', {}, title), h('small', {}, sub)));
    c._it = it;
    c.addEventListener('click', () => { if (c._lp) { c._lp = false; return; } this.play(it, true); });
    App.bindPress && App.bindPress(c, it, () => this.play(it, true), {});
    return c;
  },
  /* play: a card from "continue" resumes; a movie plays; a series opens its episodes; a channel plays */
  play(it, fromCard) {
    if (!it) return;
    const p = it._p;
    if (p) { if (p.item.seriesId) return App.playEpisode(p.item); return Player.open(App.findItem('movies', p.item.id, p.item.pl) || p.item, null, { startAt: p.pos }); }
    if (it.type === 'live') return App.playLive(it, this.list('live', 'default', 500));
    if (it.type === 'series') return App.openItem(it);
    const pr = Progress.get(it);
    if (fromCard) return App.openItem(it);
    Player.open(it, null, { startAt: pr && !pr.done ? pr.pos || 0 : 0 });
  },
  more(it) { if (!it) return; if (it._p && it._p.item.seriesId) { const s = App.findItem('series', it._p.item.seriesId, it._p.item.pl); if (s) return App.openItem(s); } if (it.type === 'live') return this.play(it); App.openItem(it._p ? (App.findItem('movies', it.id, it.pl) || it) : it); },
  updMy() { const on = this.cur && Lists.has('fav', this.cur); const b = $('.th-my', this.el); if (!b) return; b.classList.toggle('on', !!on); $('.pl', b).textContent = on ? '✓' : '+'; $('.tl', b).textContent = on ? t('inMyList') : t('myList'); },

  /* ---------- hero + background ---------- */
  async details(it) {
    const k = keyOf(it); if (this.info.has(k)) return this.info.get(k);
    if (it.type === 'live' || it.type === 'episode' || it._p && it._p.item.seriesId) return {};
    let info = {};
    try { info = it.type === 'movie' ? await provOf(it).movieInfo(it.id, it) : {}; } catch {}
    if (this.info.size > 300) this.info.clear(); this.info.set(k, info || {}); return info || {};
  },
  dur(s) { if (!s) return ''; const m = String(s).match(/(\d+):(\d+)(?::(\d+))?/); let mins = m ? (m[3] != null ? +m[1] * 60 + +m[2] : +m[1]) : parseInt(s, 10); if (!mins) return ''; return mins >= 60 ? Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm' : mins + 'm'; },
  async show(it, first) {
    if (!it || !this.el) return; this.cur = it; const me = it;
    const p = it._p; const name = p && p.item.seriesName ? p.item.seriesName : it.name;
    $('.th-kicker', this.el).textContent = p ? t('resumeAt') : this.feat.includes(it) ? t('featured') : (it.type === 'movie' ? t('movie') : it.type === 'series' ? t('show') : t('channel'));
    $('.th-title', this.el).textContent = (name || '').replace(/^\s*((\[[^\]]{1,12}\]|[A-Za-z0-9+]{1,6})\s*[|:\-–]\s*)+/, '');
    $('.th-play .tl', this.el).textContent = p ? t('resumeAt') : t('playNow');
    this.meta(it, {}); $('.th-plot', this.el).textContent = it.plot || '';
    this.updMy();
    this.bg(it.bd || '', it.img || (p && p.item.seriesImg) || '');
    const info = await this.details(it); if (this.cur !== me) return;
    this.meta(it, info); if (info.plot) $('.th-plot', this.el).textContent = info.plot;
    if (info.backdrop) this.bg(info.backdrop, '');
  },
  meta(it, info) {
    const genre = String(info.genre || it.genre || '').split(/[,/|]/)[0].trim();
    const parts = [genre ? h('span', { class: 'g' }, genre) : null, (info.year || it.year) ? h('span', { class: 'y' }, String(info.year || it.year)) : null, this.dur(info.duration) ? h('span', {}, this.dur(info.duration)) : null];
    const r = +(info.rating || it.rating) || 0;
    const box = $('.th-meta', this.el); box.innerHTML = '';
    parts.filter(Boolean).forEach((x, i) => { if (i) box.appendChild(h('i', { class: 'sep' }, '·')); box.appendChild(x); });
    if (r) { if (box.children.length) box.appendChild(h('i', { class: 'sep' }, '·')); box.appendChild(h('span', { class: 'st' }, this.stars(r))); box.appendChild(h('span', { class: 'rn' }, r.toFixed(1))); }
  },
  /* cross-fade between two layers once the new picture has loaded (wide art fills the screen, a poster sits on the right) */
  bg(wide, poster) {
    // full-screen picture: ask TMDB for a large size (the lists use small thumbnails)
    const src = String(wide || poster || '').replace(/(image\.tmdb\.org\/t\/p\/)(original|w\d{3,4})\//, '$1w1280/'); if (!src || src === this._bgSrc) return; this._bgSrc = src;
    const im = new Image(); im.referrerPolicy = 'no-referrer';
    im.onload = () => {
      if (this._bgSrc !== src) return;
      const [a, b] = $$('.th-bgi', this.el); const on = a.classList.contains('on') ? a : b, off = on === a ? b : a;
      off.style.backgroundImage = `url("${src.replace(/"/g, '%22')}")`; off.classList.toggle('poster', !wide || im.naturalHeight > im.naturalWidth);
      on.classList.remove('on'); off.classList.add('on');
    };
    im.src = src;
  }
};
window.TvHome = TvHome;
