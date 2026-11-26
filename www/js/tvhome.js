/* DOOM IPTV — big-screen home (TVs and large screens)
   Left icon rail · top bar (logo, Live TV / Movies / Series / Latest, accounts, update, clock) ·
   hero with the current title over a full-screen background that changes with the content ·
   rows of wide cards (Continue watching, recently added, top rated, favourites, live). */
'use strict';
Object.assign(I18N.en, {
  homeView: 'Home screen', hvClassic: 'Classic (side menu)', hvTv: 'Big screen (TV home)', homeViewHint: 'For TVs and big screens: a home page with rows and a background that follows the content',
  playNow: 'Play Now', moreInfo: 'More Info', myList: 'My List', inMyList: 'In My List', latest: 'Latest', accounts: 'Accounts', update: 'Update', home: 'Home',
  rowContinue: 'Continue Watching', rowNewMovies: 'Recently added movies', rowNewSeries: 'Recently added series', rowTop: 'Top rated', rowFav: 'My List', rowLive: 'Live TV',
  nothingHere: 'Nothing here yet', seeAll: 'See all', searchTv: 'Search movies, series, channels', noResults: 'Nothing found', minLeft: '{n}m left', hLeft: '{h}h {m}m left', movie: 'Movie', show: 'Series', channel: 'Channel', featured: 'Featured', resumeAt: 'Resume'
});
Object.assign(I18N.ar, {
  homeView: 'الشاشة الرئيسية', hvClassic: 'الكلاسيكية (قائمة جانبية)', hvTv: 'الشاشات الكبيرة (رئيسية التلفزيون)', homeViewHint: 'للتلفزيونات والشاشات الكبيرة: صفحة رئيسية بصفوف وخلفية بتتغير مع المحتوى',
  playNow: 'تشغيل', moreInfo: 'تفاصيل', myList: 'قائمتي', inMyList: 'في قائمتي', latest: 'الأحدث', accounts: 'الحسابات', update: 'تحديث', home: 'الرئيسية',
  rowContinue: 'متابعة المشاهدة', rowNewMovies: 'أفلام مضافة حديثاً', rowNewSeries: 'مسلسلات مضافة حديثاً', rowTop: 'الأعلى تقييماً', rowFav: 'قائمتي', rowLive: 'البث المباشر',
  nothingHere: 'لا يوجد محتوى هنا بعد', seeAll: 'عرض الكل', searchTv: 'ابحث عن فيلم أو مسلسل أو قناة', noResults: 'لا توجد نتائج', minLeft: 'متبقي {n} د', hLeft: 'متبقي {h}س {m}د', movie: 'فيلم', show: 'مسلسل', channel: 'قناة', featured: 'مميز', resumeAt: 'استكمال'
});

const TvHome = {
  el: null, open_: false, cur: null, feat: [], fi: 0, info: new Map(), _rot: 0, _fT: 0, _clk: 0, _bgSrc: '',
  view: { mode: 'home' }, stack: [], bdc: LS.get('bdCache', {}),
  enabled() { return Settings.get('homeView') === 'tv'; },

  open() {
    if (!App.data || !App.el) return;
    if (!this.el) this.build();
    this.open_ = true; document.body.classList.add('th-on'); this.el.classList.remove('hidden');
    this.view = { mode: 'home' }; this.stack = []; this.render(); this.pickFeatured(); this.show(this.feat[0] || null, true); this.startRotate(); this.tick();
    clearInterval(this._clk); if (!this._clkL) { this._clkL = 1; window.addEventListener('doom:clock', () => this.tick()); }
    setTimeout(() => { const b = $('.th-play', this.el); if (document.body.classList.contains('tv') && b) b.focus({ preventScroll: true }); }, 80);
  },
  close() {
    if (!this.el) return; this.open_ = false; document.body.classList.remove('th-on'); this.el.classList.add('hidden');
    clearInterval(this._rot); clearInterval(this._clk); clearTimeout(this._clkT);
  },
  refresh() { if (this.open_) { this.render(true); this.pickFeatured(); } },
  /* inside the big-screen mode: home → a section (rows per category) → one category (grid); also search, my lists, continue */
  go(v) {
    this.stack.push(this.view); this.view = v; this.render(); const m = $('.th-main', this.el); if (m) m.scrollTop = 0;
    setTimeout(() => { const f = v.mode === 'search' ? $('.th-sin', this.el) : $('.th-rows .th-card', this.el); if (f) { f.focus({ preventScroll: true }); if (f._it) this.show(f._it); } }, 60);
  },
  back() { if (!this.open_ || !this.stack.length) return false; this.view = this.stack.pop(); this.render(); setTimeout(() => { const f = $('.th-rows .th-card', this.el) || $('.th-play', this.el); f && f.focus({ preventScroll: true }); }, 60); return true; },
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
          rb(ic('search'), t('search'), () => this.go({ mode: 'search', q: '' }), 'r-search'),
          rb(ic('home'), t('home'), () => { this.stack = []; this.view = { mode: 'home' }; this.render(); this.scrollTop(); }, 'r-home'),
          rb(ic('tv'), t('live'), () => this.go({ mode: 'sec', sec: 'live' }), 'r-live'),
          rb(ic('film'), t('movies'), () => this.go({ mode: 'sec', sec: 'movies' }), 'r-movies'),
          rb(ic('series'), t('series'), () => this.go({ mode: 'sec', sec: 'series' }), 'r-series'),
          rb(HEART, t('favorites'), () => this.go({ mode: 'lists' }), 'heart r-lists'),
          rb(ic('history'), t('continue'), () => this.go({ mode: 'cont' }), 'r-cont'),
          rb(ic('mv'), t('multiview'), () => this.leave('multiview'))),
        rb(ic('settings'), t('settings'), () => this.leave('settings'), 'bottom')),
      h('div', { class: 'th-main' },
        h('header', { class: 'th-top' },
          h('div', { class: 'th-logo' }, h('img', { src: 'icons/logo-128.png', alt: '' }), h('b', {}, 'DOOM'), h('span', {}, 'iptv')),
          h('div', { class: 'th-tabs' },
            tab('t-live', ic('tv'), t('live'), () => this.go({ mode: 'sec', sec: 'live' })),
            tab('t-mov', ic('film'), t('movies'), () => this.go({ mode: 'sec', sec: 'movies' })),
            tab('t-ser', ic('series'), t('series'), () => this.go({ mode: 'sec', sec: 'series' })),
            tab('t-new', ic('trend'), t('latest'), () => this.go({ mode: 'latest' }))),
          h('div', { class: 'th-right' },
            (() => { const b = h('button', { class: 'th-link' }, h('span', { html: ic('swap') }), t('accounts')); b.addEventListener('click', () => this.leave('settings')); return b; })(),
            (() => { const b = h('button', { class: 'th-link th-upd' }, h('span', { html: ic('refresh') }), t('update')); b.addEventListener('click', async () => { b.classList.add('busy'); await App.refreshLibrary(); b.classList.remove('busy'); this.refresh(); }); return b; })(),
            h('div', { class: 'th-clock' }, h('b', {}), h('small', {})))),
        h('section', { class: 'th-hero' },
          h('div', { class: 'th-pst' }, h('img', { alt: '', referrerpolicy: 'no-referrer' })),
          h('div', { class: 'th-hero-in' },
            h('div', { class: 'th-kicker' }), h('h1', { class: 'th-title' }), h('div', { class: 'th-meta' }), h('p', { class: 'th-plot' }),
            h('div', { class: 'th-btns' },
              (() => { const b = h('button', { class: 'th-btn th-play' }, h('span', { html: ic('play') }), h('span', { class: 'tl' }, t('playNow'))); b.addEventListener('click', () => this.play(this.cur)); return b; })(),
              (() => { const b = h('button', { class: 'th-btn' }, h('span', { html: ic('info') }), t('moreInfo')); b.addEventListener('click', () => this.more(this.cur)); return b; })(),
              (() => { const b = h('button', { class: 'th-btn th-my' }, h('span', { class: 'pl' }, '+'), h('span', { class: 'tl' }, t('myList'))); b.addEventListener('click', () => { if (!this.cur) return; Lists.toggle('fav', this.cur); this.updMy(); this.render(true); }); return b; })())),
          h('div', { class: 'th-car' },
            (() => { const b = h('button', { class: 'th-arr', html: ic('chevLeft'), 'aria-label': 'prev', tabindex: -1 }); b.addEventListener('click', () => this.step(-1)); return b; })(),
            h('div', { class: 'th-dots' }),
            (() => { const b = h('button', { class: 'th-arr', html: ic('chevRight'), 'aria-label': 'next', tabindex: -1 }); b.addEventListener('click', () => this.step(1)); return b; })())),
        h('div', { class: 'th-rows' })));
    // ONE highlight frame on its own layer slides to the focused card. Cards themselves never change on focus,
    // so moving with the remote doesn't repaint or re-layer the page (that was the lag on TV boxes).
    this.ring = h('div', { class: 'th-ring' }); this.el.appendChild(this.ring);
    document.body.appendChild(this.el);
    // the background and the hero follow the card you STOP on (not every card you pass); rows scroll sideways
    this.el.addEventListener('focusin', e => {
      const c = e.target.closest('.th-card');
      if (c) { const b = c.getBoundingClientRect(), dx = this.reveal(c, b); this.ringAt(c, b.left - dx, b.top, b.width, b.height); } else this.ringTo(null);   // one measurement per move
      if (c && c._it) { clearInterval(this._rot); this._rot = 0; clearTimeout(this._fT); this._fT = setTimeout(() => this.show(c._it, false, c), 550); this.maybeMore(c); }
      else if (e.target.closest('.th-hero') && !this._rot) this.startRotate();
    });
    this.el.addEventListener('focusout', e => { if (!this.el.contains(e.relatedTarget)) this.ringTo(null); });
    // keep the frame on the card when a list scrolls (mouse wheel, touch, pages loading)
    const follow = () => { if (this._rf) return; this._rf = requestAnimationFrame(() => { this._rf = 0; const a = document.activeElement; if (a && a.classList && a.classList.contains('th-card') && this.el.contains(a)) this.ringTo(a, true); }); };
    this.el.addEventListener('scroll', follow, true); addEventListener('resize', follow);
    this.el.addEventListener('mouseover', e => { const c = e.target.closest('.th-card'); if (c && c._it && c._it !== this.cur) { clearTimeout(this._fT); this._fT = setTimeout(() => this.show(c._it), 400); } });
  },
  ringAt(c, x, y, w, hh) {
    const r = this.ring; if (!r) return; w = Math.round(w); hh = Math.round(hh);
    if (r._w !== w || r._h !== hh) { r.style.width = w + 'px'; r.style.height = hh + 'px'; r._w = w; r._h = hh; }
    r.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`; r.classList.add('on');
    requestAnimationFrame(() => requestAnimationFrame(() => { if (document.activeElement === c) this.ringTo(c, true); }));   // after a page scroll
  },
  ringTo(c, now) {
    const r = this.ring; if (!r) return;
    if (!c) { r.classList.remove('on'); return; }
    const b = c.getBoundingClientRect(), w = Math.round(b.width), hh = Math.round(b.height);
    if (r._w !== w || r._h !== hh) { r.style.width = w + 'px'; r.style.height = hh + 'px'; r._w = w; r._h = hh; }
    r.style.transform = `translate3d(${Math.round(b.left)}px, ${Math.round(b.top)}px, 0)`;
    if (!r.classList.contains('on')) r.classList.add('on');
    // the list may scroll right after this move (SpatialNav scrolls in the next frame): place it again then
    if (!now) requestAnimationFrame(() => requestAnimationFrame(() => { if (document.activeElement === c) this.ringTo(c, true); }));
  },
  /* keep the focused card inside its row (scroll only the row, never the page sideways) */
  reveal(c, r) {   // returns how far the row moved (so the caller needn't measure again)
    const row = c.parentElement; r = r || c.getBoundingClientRect(); let dx = 0;
    const w = row._box && row._boxW === innerWidth ? row._box : (row._box = row.getBoundingClientRect(), row._boxW = innerWidth, row._box), pad = 40;
    if (!row.classList.contains('th-grid')) {
      if (r.left < w.left + pad) dx = r.left - w.left - pad; else if (r.right > w.right - pad) dx = r.right - w.right + pad;
      if (dx) { const before = row.scrollLeft; row.scrollLeft += dx; dx = row.scrollLeft - before; }
      return dx;
    }
    { const mm = $('.th-main', this.el), mr = mm.getBoundingClientRect(), q = r; if (q.top < mr.top + 30) mm.scrollTop -= mr.top + 30 - q.top; else if (q.bottom > mr.bottom - 30) mm.scrollTop += q.bottom - mr.bottom + 30; }
    return 0;
  },
  scrollTop() { const m = $('.th-main', this.el); if (m) m.scrollTop = 0; const b = $('.th-play', this.el); b && b.focus({ preventScroll: true }); this.startRotate(); },
  tick() {
    if (!this.el) return; const d = Clock.now();
    $('.th-clock b', this.el).textContent = Clock.time(d);
    $('.th-clock small', this.el).textContent = Clock.date(d);
    /* re-tick right on the minute so the clock never lags behind */
    clearTimeout(this._clkT); this._clkT = setTimeout(() => this.tick(), 60000 - (d.getSeconds() * 1000 + d.getMilliseconds()) + 50);
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
  /* rows for the current view; long pages get a few rows at a time while you scroll */
  render(keep) {
    if (!this.el) return;
    const v = this.view, box = $('.th-rows', this.el);
    const had = keep && document.activeElement && box.contains(document.activeElement);
    this.el.dataset.mode = v.mode; this.el.classList.toggle('compact', v.mode !== 'home');
    $$('.th-tab', this.el).forEach((b, i) => b.classList.toggle('on', ['live', 'movies', 'series', 'latest'][i] === (v.mode === 'latest' ? 'latest' : v.sec)));
    const rk = v.mode === 'sec' || v.mode === 'cat' ? v.sec : v.mode;
    $$('.th-rb', this.el).forEach(b => b.classList.toggle('on', b.classList.contains('r-' + rk)));
    box.innerHTML = ''; this._pending = []; if (this._io) { this._io.disconnect(); this._io = null; }
    if (v.mode === 'search') return this.renderSearch(box);
    if (v.mode === 'cat') return this.renderGrid(box, v.title, v.items);
    this._pending = this.rowsFor(v); this.moreRows(8, box);
    if (!box.children.length) box.appendChild(h('p', { class: 'th-empty' }, t('nothingHere')));
    if (had) { const f = $('.th-card', box); f && f.focus({ preventScroll: true }); }
  },
  rowsFor(v) {
    const R = (title, items, sec, extra) => items && items.length ? Object.assign({ title, items, sec }, extra || {}) : null;
    const cont = sec => Progress.continueList().filter(p => !sec || (sec === 'series' ? !!p.item.seriesId : !p.item.seriesId)).slice(0, 30).map(p => {
      const m = p.item.seriesId ? null : App.findItem('movies', p.item.id, p.item.pl); return Object.assign({}, m || p.item, { _p: p });
    });
    const lists = Lists.data.map(l => R(Lists.name(l), l.items.slice().reverse(), null));
    if (v.mode === 'home') return [R(t('rowContinue'), cont()), R(t('rowNewMovies'), this.list('movies', 'added', 400), 'movies'), R(t('rowNewSeries'), this.list('series', 'added', 400), 'series'),
      R(t('rowTop'), [...this.list('movies', 'rating', 60), ...this.list('series', 'rating', 60)].sort((a, b) => (+b.rating) - (+a.rating))), lists[0], R(t('rowLive'), this.list('live', 'default', 400), 'live')].filter(Boolean);
    if (v.mode === 'lists') return lists.filter(Boolean);
    if (v.mode === 'cont') return [R(t('rowContinue'), cont())].filter(Boolean);
    if (v.mode === 'latest') return [R(t('rowNewMovies'), this.list('movies', 'added', 400), 'movies'), R(t('rowNewSeries'), this.list('series', 'added', 400), 'series')].filter(Boolean);
    // a section: continue + newest + one row per category (grouped in one pass, fast even with huge lists)
    const sec = v.sec, all = App.listFor(sec, 'all'), by = new Map();
    for (const it of all) { let a = by.get(it.cat); if (!a) by.set(it.cat, a = []); a.push(it); }
    const rows = sec === 'live' ? [] : [R(t('rowContinue'), cont(sec)), R(t(sec === 'movies' ? 'rowNewMovies' : 'rowNewSeries'), this.list(sec, 'added', 400), sec)];
    for (const c of App.visibleCats(sec)) rows.push(R(c.name, by.get(c.id), sec, { cat: c.id }));
    return rows.filter(Boolean);
  },
  moreRows(n, box) {
    box = box || this._rowBox || $('.th-rows', this.el); this._rowBox = box;
    for (let i = 0; i < n && this._pending.length; i++) {
      const r = this._pending.shift(), MAX = 30;
      const row = h('div', { class: 'th-row' });
      r.items.slice(0, MAX).forEach(it => row.appendChild(this.card(it, r.items)));
      if (r.items.length > MAX) {   // last card of a long row: see the whole category
        const m = h('button', { class: 'th-card th-more', 'aria-label': t('seeAll') }, h('span', { class: 'mi', html: ic('chevRight') }), h('b', {}, t('seeAll')), h('small', {}, String(r.items.length)));
        m._more = true; m.addEventListener('click', () => this.go({ mode: 'cat', sec: r.sec || this.view.sec, title: r.title, items: r.items })); row.appendChild(m);
      }
      box.appendChild(h('section', { class: 'th-sec' }, h('h3', {}, r.title, h('small', {}, String(r.items.length))), row));
    }
  },
  maybeMore(c) {
    if (!this._pending || !this._pending.length) return;
    const secs = $$('.th-sec', this._rowBox || this.el), i = secs.indexOf(c.closest('.th-sec'));
    if (i >= secs.length - 3 && !this._mq) { this._mq = true; setTimeout(() => { this._mq = false; this.moreRows(3); }, 30); }   // after this move has been drawn
  },
  /* one category ("see all"): a grid of the same wide cards, added page by page */
  renderGrid(box, title, items) {
    box.appendChild(h('h2', { class: 'th-gt' }, title, h('small', {}, String(items.length))));
    const g = h('div', { class: 'th-grid' }); box.appendChild(g); let n = 0;
    const page = () => { const end = Math.min(items.length, n + 48); for (; n < end; n++) g.appendChild(this.card(items[n], items)); };
    page();
    const sent = h('div', { class: 'th-sent' }); box.appendChild(sent);
    this._io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting) && n < items.length) page(); }, { root: $('.th-main', this.el), rootMargin: '900px' });
    this._io.observe(sent);
  },
  renderSearch(box) {
    const inp = h('input', { class: 'th-sin', type: 'search', placeholder: t('searchTv'), autocomplete: 'off' }); inp.value = this.view.q || '';
    const out = h('div', { class: 'th-sres' });
    box.appendChild(h('div', { class: 'th-sbar' }, h('span', { html: ic('search') }), inp)); box.appendChild(out);
    const run = () => {
      const q = inp.value.trim(); this.view.q = q; out.innerHTML = ''; this._pending = [];
      if (fold(q).length < 2) return;
      for (const sec of ['movies', 'series', 'live']) { const r = App.search(App.listFor(sec, 'all'), q); if (r.length) this._pending.push({ title: t(sec), items: r, sec }); }
      if (!this._pending.length) { out.appendChild(h('p', { class: 'th-empty' }, t('noResults'))); return; }
      this.moreRows(3, out);
    };
    let tm; inp.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(run, 300); });
    inp.addEventListener('keyup', e => { if (e.key === 'Enter') { clearTimeout(tm); run(); setTimeout(() => { const c = $('.th-sres .th-card', this.el); c && c.focus(); }, 80); } });
    if (window.TvKeyboard && TvKeyboard._mo) TvKeyboard.guard(box);
    if (this.view.q) run();
  },
  /* remember wide pictures found in movie details, and upgrade the card that asked for it */
  remember(it, bd, card) {
    const k = keyOf(it); this.bdc[k] = bd; const keys = Object.keys(this.bdc); if (keys.length > 600) delete this.bdc[keys[0]];
    clearTimeout(this._bdT); this._bdT = setTimeout(() => LS.set('bdCache', this.bdc), 1500);
    if (card && card.isConnected && card.classList.contains('pcard')) {
      const box = $('.th-img', card); box.className = 'th-img'; box.innerHTML = ''; box.appendChild(App.imgEl(bd, it.name)); card.classList.remove('pcard');
    }
  },
  stars(r) { r = Math.max(0, Math.min(10, +r || 0)) / 2; let s = ''; for (let i = 1; i <= 5; i++) s += r >= i - .25 ? '★' : r >= i - .75 ? '⯪' : '☆'; return s.replace(/⯪/g, '★'); },
  card(it, list) {
    const p = it._p; const live = it.type === 'live';
    const bd = it.bd || this.bdc[keyOf(it)] || '';
    const sub = p ? (() => { const left = Math.max(0, (p.dur - p.pos) / 60); return left >= 60 ? t('hLeft', { h: Math.floor(left / 60), m: Math.round(left % 60) }) : t('minLeft', { n: Math.max(1, Math.round(left)) }); })()
      : [it.type === 'movie' ? t('movie') : it.type === 'series' ? t('show') : t('channel'), it.year].filter(Boolean).join(' · ');
    const title = p && p.item.seriesName ? p.item.seriesName + ' · ' + t('sShort') + p.item.season + t('epShort') + p.item.episode : it.name;
    // wide picture when we have one; otherwise the whole poster on the side over a dimmed copy of it (no ugly crops)
    const pst = it.img || (p && p.item.seriesImg) || '';
    const imgBox = live ? h('div', { class: 'th-img' }, App.imgEl(it.img, it.name, 'logo'))
      : bd ? h('div', { class: 'th-img' }, App.imgEl(bd, it.name))
      : h('div', { class: 'th-img pc' }, pst ? h('img', { class: 'amb', src: App.thumb(pst), alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }) : null, App.imgEl(pst, it.name));
    const c = h('button', { class: 'th-card' + (live ? ' live' : '') + (!live && !bd ? ' pcard' : ''), 'aria-label': title },
      imgBox,
      +it.rating > 0 ? h('span', { class: 'th-rate' }, h('em', {}, this.stars(it.rating)), ' ' + (+it.rating).toFixed(1)) : null,
      App.marks ? App.marks(it) : null,
      h('div', { class: 'th-cap' }, p ? h('div', { class: 'th-prog' }, h('i', { style: { width: Math.min(100, p.pos / p.dur * 100) + '%' } })) : null, h('b', {}, title), h('small', {}, sub)));
    c._it = it; c._list = list;
    c.addEventListener('click', () => { if (c._lp) { c._lp = false; return; } this.play(it, true, list); });
    App.bindPress && App.bindPress(c, it, () => this.play(it, true, list), {});
    return c;
  },
  /* play: a card from "continue" resumes; a movie plays; a series opens its episodes; a channel plays */
  play(it, fromCard, list) {
    if (!it) return;
    const p = it._p;
    if (p) { if (p.item.seriesId) return App.playEpisode(p.item); return Player.open(App.findItem('movies', p.item.id, p.item.pl) || p.item, null, { startAt: p.pos }); }
    if (it.type === 'live') return App.playLive(it, (list && list.length ? list : App.listFor('live', it.cat || 'all')).filter(x => x.type === 'live'));
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
  async show(it, first, card) {
    if (!it || !this.el) return; this.cur = it; const me = it;
    const p = it._p; const name = p && p.item.seriesName ? p.item.seriesName : it.name;
    $('.th-kicker', this.el).textContent = p ? t('resumeAt') : this.feat.includes(it) ? t('featured') : (it.type === 'movie' ? t('movie') : it.type === 'series' ? t('show') : t('channel'));
    $('.th-title', this.el).textContent = (name || '').replace(/^\s*((\[[^\]]{1,12}\]|[A-Za-z0-9+]{1,6})\s*[|:\-–]\s*)+/, '');
    $('.th-play .tl', this.el).textContent = p ? t('resumeAt') : t('playNow');
    this.meta(it, {}); $('.th-plot', this.el).textContent = it.plot || '';
    this.updMy();
    const bd0 = it.bd || this.bdc[keyOf(it)] || '';
    this.bg(bd0, it.img || (p && p.item.seriesImg) || '');
    const info = await this.details(it); if (this.cur !== me) return;
    this.meta(it, info); if (info.plot) $('.th-plot', this.el).textContent = info.plot;
    if (info.backdrop && info.backdrop !== bd0) { this.bg(info.backdrop, ''); this.remember(it, info.backdrop, card); }
  },
  meta(it, info) {
    const genre = String(info.genre || it.genre || '').split(/[,/|]/)[0].trim();
    const parts = [genre ? h('span', { class: 'g' }, genre) : null, (info.year || it.year) ? h('span', { class: 'y' }, String(info.year || it.year)) : null, this.dur(info.duration) ? h('span', {}, this.dur(info.duration)) : null];
    const r = +(info.rating || it.rating) || 0;
    const box = $('.th-meta', this.el); box.innerHTML = '';
    parts.filter(Boolean).forEach((x, i) => { if (i) box.appendChild(h('i', { class: 'sep' }, '·')); box.appendChild(x); });
    if (r) { if (box.children.length) box.appendChild(h('i', { class: 'sep' }, '·')); box.appendChild(h('span', { class: 'st' }, this.stars(r))); box.appendChild(h('span', { class: 'rn' }, r.toFixed(1))); }
  },
  /* background: a wide picture fills the screen. A portrait poster is never stretched over the screen —
     it is shown sharp and framed on the side, over a dark, softened copy of itself. */
  bg(wide, poster) {
    const big = u => String(u || '').replace(/(image\.tmdb\.org\/t\/p\/)(original|w\d{3,4})\//, '$1w1280/');
    const src = big(wide || poster); if (!src || src === this._bgSrc) return; this._bgSrc = src;
    const im = new Image(); im.referrerPolicy = 'no-referrer';
    im.onload = () => {
      if (this._bgSrc !== src) return;
      // treat anything that is not clearly landscape (or too small to fill a TV) as a poster
      const isWide = im.naturalWidth >= 1.25 * im.naturalHeight && im.naturalWidth >= 640;
      const [a, b] = $$('.th-bgi', this.el); const on = a.classList.contains('on') ? a : b, off = on === a ? b : a;
      off.textContent = '';
      if (isWide) { off.style.backgroundImage = `url("${src.replace(/"/g, '%22')}")`; }
      else {
        // soft poster background without a blur filter: the poster drawn into a tiny canvas, stretched over the screen
        off.style.backgroundImage = 'none';
        const cv = document.createElement('canvas'); cv.width = 32; cv.height = 48; cv.className = 'th-soft';
        try { const g = cv.getContext('2d'); g.drawImage(im, 0, 0, 32, 48); g.fillStyle = 'rgba(7,11,24,.45)'; g.fillRect(0, 0, 32, 48); off.appendChild(cv); } catch { off.style.backgroundImage = `url("${src.replace(/"/g, '%22')}")`; }
      }
      off.classList.toggle('poster', !isWide);
      on.classList.remove('on'); off.classList.add('on');
      const pst = $('.th-pst', this.el), pi = $('img', pst);
      if (!isWide) { pi.src = src; pst.classList.add('on'); } else pst.classList.remove('on');
      this.el.classList.toggle('has-pst', !isWide);
    };
    im.onerror = () => { if (this._bgSrc === src && wide && poster) { this._bgSrc = ''; this.bg('', poster); } };
    im.src = src;
  }
};
window.TvHome = TvHome;
