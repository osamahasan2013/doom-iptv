/* DOOM IPTV — interface: dialogs, browsing, pages, TV navigation */
'use strict';

Object.assign(I18N.en, {
  viewMode: 'How to use several subscriptions', separate: 'Separate', merged: 'Merged', separateDesc: 'Switch between subscriptions from the top bar. Each keeps its own library.',
  mergedDesc: 'Combine the included subscriptions into one library. Duplicate titles become backup sources if one server fails.', includeMerged: 'Include in merged library',
  daysLeft: '{n} days left', expired: 'Expired', unlimited: 'No expiry', lastChecked: 'Checked', allSubs: 'All subscriptions (merged)', expSoon: 'Subscription expiring soon',
  useThis: 'Use this', edit: 'Edit', maxConn: 'Allowed connections', created: 'Created', trial: 'Trial', subscriptions: 'Subscriptions', source: 'Source', current: 'In use',
  nothingFound: 'No results', results: 'Results', moreResults: 'Show more', manageCats: 'Choose allowed categories', playerSettings: 'Player', general: 'General', backup: 'Backup',
  liveTvChannels: 'channels', titles: 'titles', today: 'today', checkAccounts: 'Check accounts'
});
Object.assign(I18N.ar, {
  viewMode: 'طريقة استخدام أكثر من اشتراك', separate: 'منفصلة', merged: 'مدمجة', separateDesc: 'تنقّل بين الاشتراكات من الشريط العلوي، ولكل اشتراك مكتبته الخاصة.',
  mergedDesc: 'دمج الاشتراكات المختارة في مكتبة واحدة. العناوين المكررة تصبح مصادر احتياطية لو تعطل أحد السيرفرات.', includeMerged: 'ضمن المكتبة المدمجة',
  daysLeft: 'متبقي {n} يوم', expired: 'منتهي', unlimited: 'بدون تاريخ انتهاء', lastChecked: 'آخر فحص', allSubs: 'كل الاشتراكات (مدمجة)', expSoon: 'اشتراك على وشك الانتهاء',
  useThis: 'استخدام', edit: 'تعديل', maxConn: 'الاتصالات المسموحة', created: 'تاريخ الإنشاء', trial: 'تجريبي', subscriptions: 'الاشتراكات', source: 'المصدر', current: 'قيد الاستخدام',
  nothingFound: 'لا توجد نتائج', results: 'النتائج', moreResults: 'عرض المزيد', manageCats: 'اختيار الفئات المسموحة', playerSettings: 'المشغل', general: 'عام', backup: 'النسخ الاحتياطي',
  liveTvChannels: 'قناة', titles: 'عنوان', today: 'اليوم', checkAccounts: 'فحص الاشتراكات'
});

/* ====================== dialogs & small UI helpers ====================== */
const UI = {
  stack: [],
  modal(title, body, { wide = false, onClose, cls = '' } = {}) {
    const back = h('div', { class: 'modal-back' });
    const box = h('div', { class: 'modal ' + (wide ? 'wide ' : '') + cls, role: 'dialog' },
      h('div', { class: 'modal-head' }, h('div', { class: 'modal-title' }, title || ''), h('button', { class: 'icon-btn', 'aria-label': t('close'), html: ic('close'), onclick: () => close() })),
      h('div', { class: 'modal-body' }, body));
    back.appendChild(box); document.body.appendChild(back);
    const prevFocus = document.activeElement;
    const close = () => { if (!back.isConnected) return; back.remove(); this.stack = this.stack.filter(x => x.back !== back); onClose && onClose(); try { prevFocus && prevFocus.focus(); } catch {} };
    back.addEventListener('mousedown', e => { if (e.target === back) close(); });
    const m = { back, box, close }; this.stack.push(m);
    setTimeout(() => { const f = $('input,select,textarea,button.primary,.modal-body button', box); f && f.focus(); }, 30);
    return m;
  },
  top() { return this.stack[this.stack.length - 1]; },
  alert(title, msg) { return new Promise(res => { const m = this.modal(title, h('div', {}, h('p', {}, msg), h('div', { class: 'row end' }, h('button', { class: 'btn primary', onclick: () => m.close() }, t('ok')))), { onClose: res }); }); },
  confirm(title, msg) {
    return new Promise(res => { let v = false; const m = this.modal(title, h('div', {}, msg ? h('p', {}, msg) : null, h('div', { class: 'row end gap' },
      h('button', { class: 'btn', onclick: () => m.close() }, t('cancel')), h('button', { class: 'btn primary danger', onclick: () => { v = true; m.close(); } }, t('yes')))), { onClose: () => res(v) }); });
  },
  prompt(title, label, value = '') {
    return new Promise(res => {
      let v = null; const inp = h('input', { class: 'input', value, placeholder: label });
      const m = this.modal(title, h('form', { onsubmit: e => { e.preventDefault(); v = inp.value.trim(); m.close(); } }, h('label', { class: 'lbl' }, label), inp,
        h('div', { class: 'row end gap' }, h('button', { type: 'button', class: 'btn', onclick: () => m.close() }, t('cancel')), h('button', { class: 'btn primary' }, t('save')))), { onClose: () => res(v || null) });
    });
  },
  pinPad(title, sub, onDone, onClose) {
    let val = ''; const dots = h('div', { class: 'pin-dots' }); const err = h('div', { class: 'pin-err' });
    const draw = () => { dots.innerHTML = [0, 1, 2, 3].map(i => `<i class="${i < val.length ? 'on' : ''}"></i>`).join(''); };
    const press = k => { if (k === '⌫') val = val.slice(0, -1); else if (val.length < 4) val += k; draw(); if (val.length === 4) { const v = val; val = ''; setTimeout(() => onDone(v, msg => { err.textContent = msg; draw(); }), 120); } };
    const pad = h('div', { class: 'pin-pad' }, ...['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map(k => k ? h('button', { class: 'btn pin-k', onclick: () => press(k) }, k) : h('span')));
    const body = h('div', { class: 'pin-wrap' }, sub ? h('p', { class: 'muted' }, sub) : null, dots, err, pad);
    body.addEventListener('keydown', e => { if (/^\d$/.test(e.key)) { press(e.key); e.preventDefault(); } if (e.key === 'Backspace') { press('⌫'); e.preventDefault(); } });
    draw(); return this.modal(title, body, { cls: 'pin-modal', onClose });
  },
  pinPrompt(title, sub) {
    if (!Parental.d.pin) return Promise.resolve(true);
    return new Promise(res => { let ok = false; const m = this.pinPad(title || t('pinEnter'), sub, async (v, fail) => { if (await Parental.checkPin(v)) { ok = true; m.close(); } else fail(t('pinWrong')); }, () => res(ok)); });
  },
  pinCreate() {
    return new Promise(res => { let first = null, out = null; const m = this.pinPad(t('pinNew'), '', (v, fail) => { if (!first) { first = v; fail('↻ ' + t('pinNew')); } else if (v === first) { out = v; m.close(); } else { first = null; fail(t('pinWrong')); } }, () => res(out)); });
  },
  toast(msg) {
    let w = $('#toasts'); if (!w) { w = h('div', { id: 'toasts' }); document.body.appendChild(w); }
    const tt = h('div', { class: 'toast' }, msg); w.appendChild(tt); setTimeout(() => tt.classList.add('out'), 2600); setTimeout(() => tt.remove(), 3000);
  },
  ctxMenu(anchor, options) {
    $$('.ctx').forEach(x => x.remove());
    const m = h('div', { class: 'ctx' }, ...options.filter(Boolean).map(o => h('button', { class: 'ctx-item' + (o.danger ? ' danger' : ''), onclick: () => { m.remove(); o.run(); } }, h('span', { html: ic(o.icon || 'chevRight') }), o.label)));
    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: anchor.x, top: anchor.y, bottom: anchor.y, right: anchor.x };
    const W = m.offsetWidth, H = m.offsetHeight;
    m.style.left = clamp(r.left, 8, innerWidth - W - 8) + 'px'; m.style.top = (r.bottom + H + 8 > innerHeight ? Math.max(8, r.top - H - 4) : r.bottom + 4) + 'px';
    setTimeout(() => { const off = e => { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('pointerdown', off, true); } }; document.addEventListener('pointerdown', off, true); }, 0);
    $('button', m).focus();
  },
  listPicker(item, cb) {
    const body = h('div', { class: 'stack' });
    const draw = () => {
      body.innerHTML = '';
      for (const l of Lists.data) {
        const on = Lists.has(l.id, item);
        body.appendChild(h('button', { class: 'list-opt' + (on ? ' on' : ''), onclick: () => { const added = Lists.toggle(l.id, item); UI.toast((added ? t('addedTo') : t('removedFrom')) + ' ' + Lists.name(l)); draw(); cb && cb(); App.section === 'favorites' && App.render(); } },
          h('span', { html: ic(on ? 'check' : 'plus') }), h('span', { class: 'grow' }, Lists.name(l)), h('small', { class: 'muted' }, l.items.length + ' ' + t('items'))));
      }
      body.appendChild(h('button', { class: 'btn ghost', onclick: async () => { const n = await UI.prompt(t('newList'), t('listName')); if (n) { const l = Lists.create(n); Lists.toggle(l.id, item); cb && cb(); } } }, '+ ' + t('newList')));
    };
    draw(); this.modal(t('addToList') + ' — ' + (item.seriesName ? item.seriesName + ' ' + t('sShort') + item.season + t('epShort') + item.episode : item.name), body);
  }
};

/* ====================== TV / remote spatial navigation ====================== */
const SpatialNav = {
  focusables(root) {
    return $$('button:not([disabled]),a[href],input:not([type=hidden]):not(.hidden),select,textarea,[tabindex]:not([tabindex="-1"])', root)
      .filter(el => { if (el.closest('.hidden')) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; });
  },
  root() {
    const m = UI.top(); if (m) return m.box;
    const ctx = $('.ctx'); if (ctx) return ctx;
    if (Player.open_) { for (const s of ['.p-menu', '.p-side', '.p-err', '.p-next']) { const x = $(s, Player.el); if (x && !x.classList.contains('hidden')) return x; } return Player.el; }
    return document.body;
  },
  move(dir) {
    const root = this.root(); const cur = document.activeElement && root.contains(document.activeElement) ? document.activeElement : null;
    const items = this.focusables(root);
    if (!cur) { items[0] && items[0].focus(); return true; }
    const r = cur.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let best = null, bestScore = Infinity;
    for (const el of items) {
      if (el === cur) continue; const q = el.getBoundingClientRect(); const x = q.left + q.width / 2, y = q.top + q.height / 2;
      const dx = x - cx, dy = y - cy; let main, cross;
      if (dir === 'left') { if (q.right > r.left + 2) continue; main = -dx; cross = Math.abs(dy); }
      if (dir === 'right') { if (q.left < r.right - 2) continue; main = dx; cross = Math.abs(dy); }
      if (dir === 'up') { if (q.bottom > r.top + 2) continue; main = -dy; cross = Math.abs(dx); }
      if (dir === 'down') { if (q.top < r.bottom - 2) continue; main = dy; cross = Math.abs(dx); }
      const score = main + cross * 2.2; if (score < bestScore) { bestScore = score; best = el; }
    }
    if (!best && (dir === 'down' || dir === 'up')) { // scroll containers when nothing visible further
      const sc = cur.closest('.content, .modal-body, .ps-list, .sidebar'); if (sc) { sc.scrollBy({ top: dir === 'down' ? 300 : -300 }); return true; }
    }
    if (best) { best.focus({ preventScroll: false }); best.scrollIntoView({ block: 'nearest', inline: 'nearest' }); return true; }
    return false;
  }
};

/* ====================== the application ====================== */
const App = {
  data: null, idx: null, section: 'movies', cat: 'all', q: '', showHidden: false, refreshing: false, catsBySec: {},
  account: null, provider: null,

  async start() {
    Recorder.init();
    this.applyLang(); this.applyTheme();
    Player.init();
    const vol = LS.get('volume', 1); Player.v.volume = vol;
    this.bindGlobalKeys();
    let framed = false; try { framed = window.self !== window.top; } catch { framed = true; }
    if (!Playlists.all().length && (location.hash === '#demo' || framed)) Playlists.add({ type: 'demo', name: 'Demo' });
    if (!Playlists.all().length && LS.get('freeOnly', false)) return this.startFreeOnly();
    if (!Playlists.all().length) return this.welcome();
    LS.del('freeOnly'); document.body.classList.remove('free-only');
    this.renderShell();
    this.section = Settings.get('lastSection') || 'movies'; if (!['movies', 'series', 'live'].includes(this.section)) this.section = 'movies';
    await this.loadCatalog();
    Accounts.refreshAll().then(() => { this.renderExpiryBanner(); if (this.section === 'settings') this.render(); });
    if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !isNative()) navigator.serviceWorker.register('sw.js').catch(() => {});
    window.addEventListener('online', () => this.renderExpiryBanner()); window.addEventListener('offline', () => this.renderExpiryBanner());
  },

  startFreeOnly() {
    document.body.classList.add('free-only');
    this.renderShell();
    this.setData({ movies: { cats: [], items: [] }, series: { cats: [], items: [] }, live: { cats: [], items: [] } }, Date.now());
    this.section = 'free'; this.renderCats(); this.render();
  },
  addSubscription() {
    const m = UI.modal(t('addPlaylist'), this.playlistForm(null, () => { m.close(); LS.del('freeOnly'); location.reload(); }));
  },
  applyLang() {
    const s = Settings.get('lang'); LANG = s === 'auto' ? ((navigator.language || 'en').startsWith('ar') ? 'ar' : 'en') : s;
    document.documentElement.lang = LANG; document.documentElement.dir = LANG === 'ar' ? 'rtl' : 'ltr';
  },
  applyTheme() {
    document.documentElement.style.setProperty('--accent', Settings.get('accent') || '#5b8cff');
    const mode = Settings.get('theme') || 'auto'; const mq = window.matchMedia && matchMedia('(prefers-color-scheme: light)');
    const light = mode === 'light' || (mode === 'auto' && mq && mq.matches);
    document.body.classList.toggle('light', light);
    const meta = $('meta[name=theme-color]'); if (meta) meta.content = light ? '#f3f5fa' : '#0a0f1e';
    $$('.theme-btn').forEach(tb => { tb.innerHTML = ic(light ? 'moon' : 'sun'); });
    if (mq && !this._mqBound) { this._mqBound = true; (mq.addEventListener ? mq.addEventListener('change', () => this.applyTheme()) : mq.addListener(() => this.applyTheme())); }
    const tv = Settings.get('tvMode'); document.body.classList.toggle('tv', tv === 'on' || (tv === 'auto' && isTV()));
  },

  /* ---------- welcome / add subscription ---------- */
  welcome() {
    document.body.innerHTML = ''; Player.el = null; Player.init();
    const card = h('div', { class: 'welcome' }, h('div', { class: 'logo big' }, h('span', { html: ic('play') }), 'DOOM'), h('h1', {}, t('welcome')), h('p', { class: 'muted' }, t('welcomeSub')), this.playlistForm(),
      h('div', { class: 'or' }, h('span', {}, LANG === 'ar' ? 'أو' : 'or')),
      h('button', { class: 'btn wide free-start', onclick: () => { LS.set('freeOnly', true); this.startFreeOnly(); } }, h('span', { html: ic('globe') }), t('freeNoSub')));
    document.body.appendChild(h('div', { class: 'welcome-wrap' }, card));
  },
  playlistForm(existing, done) {
    let type = existing ? existing.type : 'xtream';
    const f = h('form', { class: 'pl-form' });
    const tabs = h('div', { class: 'seg' }, ...['xtream', 'm3u', 'demo'].map(k => h('button', { type: 'button', class: 'seg-btn' + (k === type ? ' on' : ''), 'data-k': k, onclick: () => { type = k; draw(); } }, t(k))));
    const fields = h('div', { class: 'stack' }); const err = h('div', { class: 'err' });
    const val = (k, d = '') => existing && existing[k] != null ? existing[k] : d;
    const draw = () => {
      $$('.seg-btn', tabs).forEach(b => b.classList.toggle('on', b.dataset.k === type)); fields.innerHTML = ''; err.textContent = '';
      fields.appendChild(h('label', { class: 'lbl' }, t('name'))); fields.appendChild(h('input', { class: 'input', name: 'name', value: val('name', ''), placeholder: type === 'demo' ? 'Demo' : 'My IPTV' }));
      if (type === 'xtream') {
        fields.append(h('label', { class: 'lbl' }, t('server')), h('input', { class: 'input', name: 'server', value: val('server'), placeholder: 'http://example.com:8080', required: true, inputmode: 'url', autocapitalize: 'off' }),
          h('label', { class: 'lbl' }, t('username')), h('input', { class: 'input', name: 'username', value: val('username'), required: true, autocapitalize: 'off', autocomplete: 'off' }),
          h('label', { class: 'lbl' }, t('password')), h('input', { class: 'input', name: 'password', type: 'password', value: val('password'), required: true, autocomplete: 'off' }));
      } else if (type === 'm3u') {
        fields.append(h('label', { class: 'lbl' }, t('url')), h('input', { class: 'input', name: 'url', value: val('url'), placeholder: 'http://example.com/get.php?username=…&type=m3u_plus', required: true, inputmode: 'url', autocapitalize: 'off' }),
          h('label', { class: 'lbl' }, t('maxConn')), h('input', { class: 'input', name: 'maxConnections', type: 'number', min: 1, max: 10, value: val('maxConnections', 1) }));
      } else fields.appendChild(h('p', { class: 'muted small' }, t('demoNote')));
    };
    const btn = h('button', { class: 'btn primary wide' }, t('login'));
    f.append(tabs, fields, err, btn); draw();
    f.addEventListener('submit', async e => {
      e.preventDefault(); err.textContent = ''; btn.disabled = true; btn.textContent = t('loading');
      const fd = Object.fromEntries(new FormData(f).entries());
      const p = Object.assign({}, existing || {}, { type }, fd); if (!p.name) p.name = type === 'demo' ? 'Demo' : (p.username || 'IPTV');
      try {
        if (type === 'xtream') { const info = await new XtreamProvider(p).account(); if (!existing) p.id = uid(); Accounts.set(p.id, info); }
        if (existing) { Playlists.update(existing.id, p); await IDB.del('cache', 'cat:' + existing.id).catch(() => {}); }
        else { const np = Playlists.add(p); if (type !== 'xtream') Accounts.refresh(np.id).catch(() => {}); }
        if (done) done(); else { location.reload(); }
      } catch (ex) {
        console.warn(ex); err.textContent = ex.cors ? t('errCors') : t('errLogin');
      } finally { btn.disabled = false; btn.textContent = t('login'); }
    });
    return f;
  },

  /* ---------- shell ---------- */
  renderShell() {
    document.body.innerHTML = ''; Player.el = null; Player.init(); Player.v.volume = LS.get('volume', 1);
    const shell = h('div', { class: 'shell' });
    shell.innerHTML = `
      <aside class="sidebar">
        <div class="brand"><span class="logo">${ic('play')}</span><b>DOOM</b><button class="icon-btn only-mobile theme-btn side-theme" data-act="theme" aria-label="${t('themeMode')}">${ic(document.body.classList.contains('light') ? 'moon' : 'sun')}</button><button class="icon-btn only-mobile" data-act="closeSide" aria-label="close">${ic('close')}</button></div>
        <div class="seg main-seg">
          <button class="seg-btn" data-sec="movies">${t('movies')}</button><button class="seg-btn" data-sec="series">${t('series')}</button><button class="seg-btn" data-sec="live">${t('live')}</button>
        </div>
        <nav class="nav">
          <button class="nav-item" data-sec="continue">${ic('history')}<span>${t('continue')}</span></button>
          <button class="nav-item" data-sec="favorites">${ic('star')}<span>${t('favorites')}</span></button>
          <button class="nav-item" data-sec="free">${ic('globe')}<span>${t('free')}</span></button>
          <button class="nav-item" data-sec="downloads">${ic('download')}<span>${t('downloads')}</span><em class="dl-count"></em></button>
          <button class="nav-item" data-sec="recordings">${ic('rec')}<span>${t('recordings')}</span><em class="rec-count"></em></button>
          <button class="nav-item" data-sec="multiview">${ic('mv')}<span>${t('multiview')}</span></button>
          <button class="nav-item" data-sec="settings">${ic('settings')}<span>${t('settings')}</span></button>
        </nav>
        <div class="cats-label">${t('categories')}</div>
        <div class="cats"></div>
        <div class="side-foot"><div class="exp-banner"></div><label class="switch-row"><span>${t('showHidden')} (<span class="hid-n">0</span>)</span><input type="checkbox" class="switch hid-toggle"></label></div>
      </aside>
      <div class="scrim"></div>
      <main class="main">
        <header class="topbar">
          <button class="icon-btn side-toggle" aria-label="menu">${ic('menu')}</button>
          <h2 class="top-title"></h2>
          <div class="top-tools">
            <span class="upd hidden"><span class="spinner sm"></span></span>
            <button class="icon-btn theme-btn" data-act="theme" title="${t('themeMode')}">${ic(document.body.classList.contains('light') ? 'moon' : 'sun')}</button>
            <button class="icon-btn" data-act="refresh" title="${t('refresh')}">${ic('refresh')}</button>
            <label class="pill-select" title="Sort">${ic('sort')}<select class="sort-sel">
              <option value="default">${t('sortDefault')}</option><option value="added">${t('sortAdded')}</option><option value="az">${t('sortAZ')}</option><option value="za">${t('sortZA')}</option><option value="rating">${t('sortRating')}</option><option value="year">${t('sortYear')}</option></select></label>
            <label class="pill-select sub-pill" title="${t('subscriptions')}">${ic('user')}<select class="sub-sel"></select>${ic('chevUpDown')}</label>
            <div class="search">${ic('search')}<input type="search" class="search-in" placeholder="${t('search')}" autocomplete="off"></div>
          </div>
        </header>
        <section class="content" tabindex="-1"></section>
      </main>`;
    document.body.appendChild(shell);
    this.el = shell; this.content = $('.content', shell);
    shell.addEventListener('click', e => {
      const s = e.target.closest('[data-sec]'); if (s) { this.go(s.dataset.sec); return; }
      const a = e.target.closest('[data-act]'); if (!a) return;
      if (a.dataset.act === 'refresh') { if (this.section === 'free') FreeCat.load(true).then(() => this.render()); else this.loadCatalog(true); }
      if (a.dataset.act === 'theme') { Settings.set('theme', document.body.classList.contains('light') ? 'dark' : 'light'); this.applyTheme(); }
      if (a.dataset.act === 'closeSide') document.body.classList.remove('side-open');
    });
    $('.side-toggle', shell).addEventListener('click', () => { if (innerWidth < 900) document.body.classList.toggle('side-open'); else document.body.classList.toggle('side-collapsed'); });
    $('.scrim', shell).addEventListener('click', () => document.body.classList.remove('side-open'));
    const sortSel = $('.sort-sel', shell); sortSel.value = Settings.get('sort') || 'default';
    sortSel.addEventListener('change', () => { Settings.set('sort', sortSel.value); this.render(); });
    $('.hid-toggle', shell).addEventListener('change', e => { this.showHidden = e.target.checked; this.renderCats(); this.render(); });
    const si = $('.search-in', shell);
    const runSearch = () => { const q = si.value.trim().toLowerCase(); if (q === this.q) return; this.q = q; this.render(); this.content.scrollTop = 0; };
    const soon = debounce(runSearch, 250);
    ['input', 'compositionend', 'keyup', 'change', 'search'].forEach(ev => si.addEventListener(ev, e => { if (e.key === 'Enter') { si.blur(); runSearch(); } else soon(); }));
    $('.sub-sel', shell).addEventListener('change', e => {
      const v = e.target.value; if (v === '__add') { this.updateSubSelect(); return this.addSubscription(); }
      if (v === '__merged') Playlists.setMerged(); else Playlists.setActive(v);
      this.cat = 'all'; this.loadCatalog();
    });
    Downloads.listeners.add(() => { this.updateBadges(); if (this.section === 'downloads') this.renderDownloads(true); });
    Recorder.listeners.add(() => { this.updateBadges(); if (this.section === 'recordings') this.renderRecordings(true); });
    this.updateSubSelect();
  },
  updateSubSelect() {
    const sel = $('.sub-sel', this.el); if (!sel) return; const all = Playlists.all();
    sel.innerHTML = all.map(p => { const d = Accounts.daysLeft(p.id); return `<option value="${esc(p.id)}">${esc(p.name || p.username || p.type)}${d != null ? ' · ' + (d < 0 ? t('expired') : d + 'd') : ''}</option>`; }).join('')
      + (all.length > 1 ? `<option value="__merged">${t('allSubs')}</option>` : '') + `<option value="__add">${t('addSub')}</option>`;
    sel.value = !all.length ? '__add' : Playlists.mode() === 'merged' ? '__merged' : Playlists.activeId();
  },
  updateBadges() {
    if (!this.el) return;
    const n = Downloads.list.filter(d => d.status === 'running' || d.status === 'queued').length; $('.dl-count', this.el).textContent = n || '';
    const r = Recorder.list.filter(x => x.status === 'recording').length; $('.rec-count', this.el).textContent = r ? '●' : '';
  },
  renderExpiryBanner() {
    if (!this.el) return; this.updateSubSelect();
    const soon = Playlists.all().filter(p => { const d = Accounts.daysLeft(p.id); return d != null && d <= 7; });
    const b = $('.exp-banner', this.el);
    b.innerHTML = (navigator.onLine === false ? `<div class="banner warn">${ic('wifiOff')} ${t('offlineBadge')}</div>` : '')
      + soon.map(p => { const d = Accounts.daysLeft(p.id); return `<button class="banner ${d < 0 ? 'bad' : 'warn'}" data-sec="settings">${ic('calendar')} ${esc(p.name)} — ${d < 0 ? t('expired') : t('daysLeft', { n: d })}</button>`; }).join('');
  },

  /* ---------- catalog ---------- */
  async loadCatalog(force) {
    const scope = Playlists.inScope();
    if (!scope.length) { if (LS.get('freeOnly', false)) { if (this.section === 'free') this.render(); return; } return this.welcome(); }
    this.updateSubSelect();
    const first = !this.data;
    if (first || force) { $('.upd', this.el).classList.remove('hidden'); if (first) this.content.innerHTML = `<div class="center pad"><div class="spinner"></div><p class="muted">${t('loading')}</p></div>`; }
    const results = await Promise.all(scope.map(p => Catalog.load(p, force).then(r => ({ p, r })).catch(e => ({ p, e }))));
    const ok = results.filter(x => x.r);
    results.filter(x => x.e).forEach(x => UI.toast(x.p.name + ': ' + (x.e.cors ? t('errCors') : t('errLogin'))));
    this.setData(Catalog.merge(ok.map(x => x.r.data)), Math.min(...ok.map(x => x.r.ts), Date.now()));
    $('.upd', this.el).classList.add('hidden');
    this.renderCats(); this.render();
    const stale = ok.filter(x => x.r.stale);
    if (stale.length && !force) { // background refresh, keep browsing meanwhile
      $('.upd', this.el).classList.remove('hidden');
      const fresh = await Promise.all(scope.map(p => Catalog.load(p, stale.some(s => s.p.id === p.id)).then(r => r.data).catch(() => null)));
      const good = fresh.filter(Boolean); if (good.length) { this.setData(Catalog.merge(good), Date.now()); this.renderCats(); if (!Player.open_ && !UI.top()) this.render(); }
      $('.upd', this.el).classList.add('hidden');
    }
  },
  setData(data, ts) {
    for (const sec of ['movies', 'series', 'live']) { // adult content never reaches the interface
      const bad = new Set(data[sec].cats.filter(c => ADULT_RX.test(c.name || '')).map(c => c.id));
      data[sec] = { cats: data[sec].cats.filter(c => !bad.has(c.id)), items: data[sec].items.filter(it => !bad.has(it.cat) && !ADULT_RX.test(it.name || '')) };
    }
    this.data = data; this.dataTs = ts; this.idx = {}; this.catsBySec = {}; this._memo = new Map(); this.dataVer = (this.dataVer || 0) + 1;
    for (const sec of ['movies', 'series', 'live']) {
      const m = new Map(); const counts = {};
      for (const it of data[sec].items) { it._q = (it.name || '').toLowerCase(); it._n = it._q.replace(/^\s*(hq|4k|fhd|uhd|hd|sd|vip)\s*[|:-]\s*/, '').trim(); m.set((it.pl || '') + ':' + it.id, it); counts[it.cat] = (counts[it.cat] || 0) + 1; }
      this.idx[sec] = m; this.catsBySec[sec] = { map: new Map(data[sec].cats.map(c => [c.id, c])), counts };
    }
  },
  findItem(type, id, pl) { const sec = type === 'movie' ? 'movies' : type === 'series' ? 'series' : 'live'; return this.idx && this.idx[sec] && (this.idx[sec].get((pl || '') + ':' + id) || null); },
  secOf(type) { return type === 'movie' ? 'movies' : type === 'series' || type === 'episode' ? 'series' : 'live'; },
  itemAllowed(it) {
    if (!Parental.d.enabled) return true;
    const sec = this.secOf(it.type); const full = it.type === 'episode' ? this.findItem('series', it.seriesId, it.pl) : this.findItem(it.type, it.id, it.pl);
    const cat = full && this.catsBySec[sec] && this.catsBySec[sec].map.get(full.cat);
    return cat ? Parental.catAllowed(sec, cat) : true;
  },
  visibleCats(sec) {
    if (!this.data) return [];
    return this.data[sec].cats.filter(c => Parental.catAllowed(sec, c) && (this.showHidden || !Hidden.is(sec, c.id)));
  },

  /* ---------- navigation ---------- */
  go(sec) {
    if (this.section === 'multiview' && sec !== 'multiview') MultiView.stopAll();
    if (['movies', 'series', 'live'].includes(sec)) { if (sec !== this.section) this.cat = 'all'; Settings.set('lastSection', sec); }
    this.section = sec; document.body.classList.remove('side-open');
    if (sec === 'free') { this.q = ''; const si = $('.search-in', this.el); if (si) si.value = ''; }
    this.renderCats(); this.render(); this.content.scrollTop = 0;
  },
  browseSec() { return ['movies', 'series', 'live'].includes(this.section) ? this.section : (Settings.get('lastSection') || 'movies'); },
  renderCats() {
    if (!this.el || !this.data) return;
    const sec = this.browseSec();
    $$('[data-sec]', this.el).forEach(b => b.classList.toggle('on', b.dataset.sec === this.section));
    $$('.main-seg .seg-btn', this.el).forEach(b => b.classList.toggle('on', b.dataset.sec === sec && ['movies', 'series', 'live'].includes(this.section)));
    const box = $('.cats', this.el); box.innerHTML = '';
    const isBrowse = ['movies', 'series', 'live'].includes(this.section);
    const mk = (id, name, count, hidden) => {
      const b = h('button', { class: 'cat' + (isBrowse && this.cat === id ? ' on' : '') + (hidden ? ' is-hidden' : '') }, id === 'all' ? h('span', { html: ic('grid') }) : null, h('span', { class: 'cat-name' }, name), count != null ? h('small', {}, count) : null);
      b.addEventListener('click', () => { this.cat = id; if (!isBrowse) this.section = sec; this.q = ''; $('.search-in', this.el).value = ''; this.renderCats(); this.render(); this.content.scrollTop = 0; document.body.classList.remove('side-open'); });
      if (id !== 'all') b.addEventListener('contextmenu', e => { e.preventDefault(); UI.ctxMenu(b, [{ icon: hidden ? 'eye' : 'eyeOff', label: hidden ? t('unhideCat') : t('hideCat'), run: () => { Hidden.toggle(sec, id); if (this.cat === id) this.cat = 'all'; this.renderCats(); this.render(); } }]); });
      box.appendChild(b);
    };
    mk('all', t('all'), this.data[sec].items.length);
    const counts = this.catsBySec[sec].counts;
    for (const c of this.visibleCats(sec)) mk(c.id, c.name, counts[c.id] || 0, Hidden.is(sec, c.id));
    $('.hid-n', this.el).textContent = Hidden.count(sec);
    $('.hid-toggle', this.el).checked = this.showHidden;
  },
  setTitle(s) { $('.top-title', this.el).textContent = s; document.title = s + ' — DOOM'; },

  render() {
    if (!this.el || (!this.data && this.section !== 'free')) return;
    if (this.section === 'free') { this.el.dataset.section = 'free'; return FreePage.render(this); }
    if (this.q && this.q.length >= 2) return this.renderSearch();
    this.el.dataset.section = this.section;
    switch (this.section) {
      case 'movies': case 'series': case 'live': return this.renderBrowse();
      case 'continue': return this.renderContinue();
      case 'favorites': return this.renderFavorites();
      case 'downloads': return this.renderDownloads();
      case 'recordings': return this.renderRecordings();
      case 'multiview': return MultiView.render(this.content);
      case 'settings': return this.renderSettings();
    }
  },

  filterItems(sec, items) {
    const block = new Set(this.showHidden ? [] : Hidden.set(sec));
    if (Parental.d.enabled) for (const c of this.data[sec].cats) if (!Parental.catAllowed(sec, c)) block.add(c.id);
    return block.size ? items.filter(it => !block.has(it.cat)) : items.slice();
  },
  /* filtered + sorted list for a section/category, cached until something that affects it changes */
  listFor(sec, cat) {
    const key = [sec, cat, Settings.get('sort'), this.showHidden, Hidden.ver, Parental.ver || 0, Parental.d.enabled, this.dataVer].join('|');
    let v = this._memo.get(key);
    if (!v) { const base = cat === 'all' ? this.data[sec].items : this.data[sec].items.filter(it => it.cat === cat); v = this.sortItems(this.filterItems(sec, base), sec); if (this._memo.size > 40) this._memo.clear(); this._memo.set(key, v); }
    return v;
  },
  sortItems(items, sec) {
    const s = Settings.get('sort'); const a = items.slice();
    const cmp = (x, y) => (x._n < y._n ? -1 : x._n > y._n ? 1 : 0); // precomputed keys: much faster than localeCompare
    if (s === 'added') a.sort((x, y) => (y.added || 0) - (x.added || 0));
    else if (s === 'az') a.sort(cmp);
    else if (s === 'za') a.sort((x, y) => cmp(y, x));
    else if (s === 'rating') a.sort((x, y) => (y.rating || 0) - (x.rating || 0));
    else if (s === 'year') a.sort((x, y) => (y.year || 0) - (x.year || 0));
    else if ((sec || this.section) === 'live') a.sort((x, y) => (x.num || 0) - (y.num || 0));
    return a;
  },
  renderBrowse() {
    const sec = this.section; const items = this.listFor(sec, this.cat);
    const c = this.catsBySec[sec].map.get(this.cat);
    this.setTitle(this.cat === 'all' ? t(sec) : (c ? c.name : t(sec)));
    this.content.innerHTML = '';
    if (!items.length) { this.content.appendChild(this.empty()); return; }
    const grid = h('div', { class: sec === 'live' ? 'grid live' : 'grid' }); this.content.appendChild(grid);
    this.fillGrid(grid, items, it => sec === 'live' ? this.channelCard(it, items) : this.posterCard(it));
  },
  renderSearch() {
    this.setTitle(t('results') + ': “' + this.q + '”'); this.content.innerHTML = ''; let any = false;
    for (const sec of ['movies', 'series', 'live']) {
      const q = this.q; const items = this.listFor(sec, 'all').filter(it => it._q.includes(q));
      if (!items.length) continue; any = true;
      this.content.appendChild(h('h3', { class: 'sec-h' }, t(sec), h('small', { class: 'muted' }, ' ' + items.length)));
      const grid = h('div', { class: sec === 'live' ? 'grid live' : 'grid' }); this.content.appendChild(grid);
      this.fillGrid(grid, items, it => sec === 'live' ? this.channelCard(it, items) : this.posterCard(it), 30);
    }
    if (!any) this.content.appendChild(this.empty(t('nothingFound')));
  },
  empty(msg) { return h('div', { class: 'empty' }, h('div', { html: ic('film', 'xl') }), h('p', {}, msg || t('nothing'))); },

  /* progressive rendering keeps huge libraries fast */
  fillGrid(grid, items, make, firstBatch = 60) {
    let i = 0; const sentinel = h('div', { class: 'sentinel' });
    const more = n => { const frag = document.createDocumentFragment(); const end = Math.min(items.length, i + n); for (; i < end; i++) frag.appendChild(make(items[i], i)); grid.appendChild(frag); if (i < items.length) grid.after(sentinel); else { sentinel.remove(); io.disconnect(); } };
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) more(90); }, { root: this.content, rootMargin: '800px' });
    more(firstBatch); if (i < items.length) io.observe(sentinel);
  },
  thumb(src) { return typeof src === 'string' ? src.replace(/(image\.tmdb\.org\/t\/p\/)(original|w\d{3,4}(?:_and_h\d+_[a-z0-9]+)?)\//, '$1w342/') : src; },
  imgEl(src, name, cls) {
    src = this.thumb(src);
    const ph = () => { const d = h('div', { class: 'ph ' + (cls || '') }, (name || '?').replace(/^\s*(hq|4k|hd)\s*\|\s*/i, '').trim().slice(0, 2).toUpperCase()); return d; };
    if (!src) return ph();
    const img = h('img', { src, loading: 'lazy', decoding: 'async', alt: '', referrerpolicy: 'no-referrer', class: cls || '' });
    img.addEventListener('error', () => img.replaceWith(ph()), { once: true });
    return img;
  },
  posterCard(it, opts = {}) {
    const pr = opts.progress || Progress.get(it);
    const card = h('div', { class: 'card', tabindex: 0, role: 'button', 'aria-label': it.name },
      h('div', { class: 'poster' }, this.imgEl(it.img, it.name),
        h('button', { class: 'fav-btn' + (Lists.inAny(it) ? ' on' : ''), tabindex: -1, 'aria-label': t('favorites'), html: ic('star') }),
        Downloads.isDone(it) ? h('span', { class: 'badge' }, '⬇') : null,
        opts.sub ? h('span', { class: 'badge left' }, opts.sub) : null,
        pr && pr.pos && pr.dur ? h('div', { class: 'prog' }, h('i', { style: { width: Math.min(100, pr.pos / pr.dur * 100) + '%' } })) : null,
        pr && pr.done ? h('span', { class: 'badge ok', html: ic('check') }) : null),
      h('div', { class: 'c-title' }, opts.title || it.name),
      h('div', { class: 'c-meta' }, it.year ? h('span', {}, it.year) : null, it.rating ? h('span', { class: 'rate', html: ic('star') + ' ' + it.rating.toFixed(1) }) : null,
        Playlists.mode() === 'merged' && it.alts ? h('span', { class: 'chip sm' }, '×' + (it.alts.length + 1)) : null));
    const open = () => (opts.onOpen || (() => this.openItem(it)))();
    card.addEventListener('click', e => {
      if (e.target.closest('.fav-btn')) { e.stopPropagation(); const on = Lists.toggle('fav', it); e.target.closest('.fav-btn').classList.toggle('on', on); UI.toast((on ? t('addedTo') : t('removedFrom')) + ' ' + t('favDefault')); return; }
      open();
    });
    card.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); open(); } });
    card.addEventListener('contextmenu', e => { e.preventDefault(); this.itemMenu(card, it, opts); });
    return card;
  },
  channelCard(it, list, opts = {}) {
    const card = h('div', { class: 'ch-card', tabindex: 0, role: 'button', 'aria-label': it.name },
      h('div', { class: 'ch-logo' }, this.imgEl(it.img, it.name, 'contain')),
      h('div', { class: 'ch-info' }, h('div', { class: 'ch-name' }, (it.num ? it.num + '. ' : '') + it.name),
        h('div', { class: 'ch-meta' }, it.archive ? h('span', { class: 'chip sm' }, '⏪ ' + t('catchup')) : null, Recorder.isRecording(it) ? h('span', { class: 'chip sm red' }, '● REC') : null)),
      h('button', { class: 'fav-btn' + (Lists.inAny(it) ? ' on' : ''), tabindex: -1, html: ic('star') }));
    const open = () => opts.onOpen ? opts.onOpen() : this.playLive(it, list);
    card.addEventListener('click', e => {
      if (e.target.closest('.fav-btn')) { e.stopPropagation(); const on = Lists.toggle('fav', it); e.target.closest('.fav-btn').classList.toggle('on', on); return; }
      open();
    });
    card.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); open(); } });
    card.addEventListener('contextmenu', e => { e.preventDefault(); this.itemMenu(card, it, opts); });
    return card;
  },
  itemMenu(anchor, it, opts = {}) {
    const o = [
      { icon: 'play', label: t('play'), run: () => (opts.onOpen || (() => this.openItem(it)))() },
      { icon: 'list', label: t('addToList'), run: () => UI.listPicker(it, () => this.render()) },
      (it.type === 'movie' || it.type === 'episode') ? { icon: 'download', label: t('download'), run: () => Downloads.add(it) } : null,
      it.type === 'live' ? { icon: 'rec', label: Recorder.isRecording(it) ? t('stopRec') : t('record'), run: () => Recorder.toggle(it).then(() => this.render()) } : null,
      it.type === 'live' ? { icon: 'calendar', label: t('schedule'), run: () => this.scheduleDialog(it) } : null
    ];
    if (opts.extra) o.push(...opts.extra);
    UI.ctxMenu(anchor, o);
  },

  /* ---------- opening items ---------- */
  async openItem(it) {
    if (!this.itemAllowed(it) && !(await UI.pinPrompt(t('locked')))) return;
    if (it.type === 'movie') return this.movieModal(it);
    if (it.type === 'series') return this.seriesModal(it);
    if (it.type === 'live') return this.playLive(it, null);
    if (it.type === 'episode') return this.playEpisode(it);
  },
  playLive(it, list) {
    let ctxList = list;
    if (!ctxList && this.data) { ctxList = this.listFor('live', it.cat); if (!ctxList.length) ctxList = [it]; }
    let index = ctxList ? ctxList.findIndex(x => x.id === it.id && x.pl === it.pl) : 0; if (index < 0) { ctxList = [it]; index = 0; }
    const full = this.findItem('live', it.id, it.pl) || it;
    Player.open(full, { list: ctxList, index });
  },
  async playEpisode(ep) {
    const series = this.findItem('series', ep.seriesId, ep.pl) || { id: ep.seriesId, pl: ep.pl, name: ep.seriesName, img: ep.img };
    try {
      const info = await provOf(series).seriesInfo(series.id, series);
      const list = this.episodesFlat(info, series); const index = list.findIndex(x => x.id === ep.id);
      if (index >= 0) return Player.open(list[index], { list, index });
    } catch {}
    Player.open(ep, null);
  },
  episodesFlat(info, series) {
    const out = [];
    Object.keys(info.seasons || {}).sort((a, b) => +a - +b).forEach(sn => (info.seasons[sn] || []).forEach(e => out.push(Object.assign(e, { pl: series.pl, seriesName: series.name, seriesImg: series.img, img: e.img || series.img }))));
    return out;
  },
  detailHead(it, info) {
    const back = info.backdrop || it.img;
    return h('div', { class: 'detail' },
      back ? h('div', { class: 'detail-bg', style: { backgroundImage: `url("${String(back).replace(/"/g, '%22')}")` } }) : null,
      h('div', { class: 'detail-in' },
        h('div', { class: 'detail-poster' }, this.imgEl(info.img || it.img, it.name)),
        h('div', { class: 'detail-meta' },
          h('h2', {}, it.name),
          h('div', { class: 'chips' }, (info.year || it.year) ? h('span', { class: 'chip' }, info.year || it.year) : null, (info.rating || it.rating) ? h('span', { class: 'chip', html: ic('star') + ' ' + (info.rating || it.rating) }) : null,
            info.duration ? h('span', { class: 'chip' }, info.duration) : null, info.genre ? h('span', { class: 'chip' }, info.genre) : null,
            Playlists.mode() === 'merged' ? h('span', { class: 'chip' }, t('source') + ': ' + Playlists.label(it.pl) + (it.alts ? ' +' + it.alts.length : '')) : null),
          info.plot ? h('p', { class: 'plot' }, info.plot) : null,
          info.director ? h('p', { class: 'muted small' }, h('b', {}, t('director') + ': '), info.director) : null,
          info.cast ? h('p', { class: 'muted small' }, h('b', {}, t('cast') + ': '), info.cast) : null,
          h('div', { class: 'detail-actions' }))));
  },
  async movieModal(it) {
    const body = h('div', {}, h('div', { class: 'center pad' }, h('div', { class: 'spinner' })));
    const m = UI.modal('', body, { wide: true, cls: 'detail-modal' });
    let info = {}; try { info = await provOf(it).movieInfo(it.id, it); } catch {}
    if (info.ext) it.ext = info.ext;
    body.innerHTML = ''; body.appendChild(this.detailHead(it, info));
    const acts = $('.detail-actions', body); const pr = Progress.get(it);
    acts.append(...[
      h('button', { class: 'btn primary', onclick: () => { m.close(); Player.open(it, null, pr && pr.pos > 15 ? {} : { startAt: 0 }); } }, h('span', { html: ic('play') }), pr && pr.pos > 15 ? t('resume') + ' ' + fmtTime(pr.pos) : t('play')),
      pr && pr.pos > 15 ? h('button', { class: 'btn', onclick: () => { m.close(); Player.open(it, null, { startAt: 0 }); } }, t('play')) : null,
      h('button', { class: 'btn', onclick: () => UI.listPicker(it) }, h('span', { html: ic('star') }), t('addToList')),
      h('button', { class: 'btn', onclick: () => Downloads.add(it) }, h('span', { html: ic('download') }), Downloads.find(it) ? t('downloads') : t('download')),
      info.trailer ? h('a', { class: 'btn', href: 'https://www.youtube.com/watch?v=' + encodeURIComponent(info.trailer), target: '_blank', rel: 'noopener' }, '▶ ' + t('trailer')) : null].filter(Boolean));
    $('.btn.primary', acts).focus();
  },
  async seriesModal(series) {
    const body = h('div', {}, h('div', { class: 'center pad' }, h('div', { class: 'spinner' })));
    const m = UI.modal('', body, { wide: true, cls: 'detail-modal' });
    let info = { seasons: {} };
    try { info = await provOf(series).seriesInfo(series.id, series); } catch (e) { body.innerHTML = `<p class="pad">${t('errLogin')}</p>`; return; }
    const all = this.episodesFlat(info, series);
    const seasons = Object.keys(info.seasons || {}).sort((a, b) => +a - +b);
    body.innerHTML = ''; body.appendChild(this.detailHead(series, info));
    const acts = $('.detail-actions', body);
    const nextUp = all.find(e => { const p = Progress.get(e); return p && !p.done && p.pos > 15; }) || all.find(e => !(Progress.get(e) || {}).done) || all[0];
    if (nextUp) acts.appendChild(h('button', { class: 'btn primary', onclick: () => { m.close(); Player.open(nextUp, { list: all, index: all.indexOf(nextUp) }); } }, h('span', { html: ic('play') }), (Progress.get(nextUp) ? t('resume') : t('play')) + ` ${t('sShort')}${nextUp.season} ${t('epShort')}${nextUp.episode}`));
    acts.appendChild(h('button', { class: 'btn', onclick: () => UI.listPicker(series) }, h('span', { html: ic('star') }), t('addToList')));
    if (info.trailer) acts.appendChild(h('a', { class: 'btn', href: 'https://www.youtube.com/watch?v=' + encodeURIComponent(info.trailer), target: '_blank', rel: 'noopener' }, '▶ ' + t('trailer')));
    let curS = nextUp ? String(nextUp.season) : seasons[0];
    const tabs = h('div', { class: 'season-tabs' }); const eps = h('div', { class: 'eps' });
    const drawEps = () => {
      $$('.seg-btn', tabs).forEach(b => b.classList.toggle('on', b.dataset.s === curS)); eps.innerHTML = '';
      const list = all.filter(e => String(e.season) === curS);
      eps.appendChild(h('div', { class: 'row end' }, h('button', { class: 'btn sm', onclick: () => { list.forEach(e => Downloads.add(e)); } }, h('span', { html: ic('download') }), t('downloadSeason'))));
      for (const e of list) {
        const p = Progress.get(e); const dl = Downloads.find(e);
        const row = h('div', { class: 'ep-row', tabindex: 0 },
          h('div', { class: 'ep-thumb' }, this.imgEl(e.img, e.name), p && p.dur ? h('div', { class: 'prog' }, h('i', { style: { width: (p.done ? 100 : p.pos / p.dur * 100) + '%' } })) : null),
          h('div', { class: 'ep-txt' }, h('div', { class: 'ep-t' }, `${e.episode}. ${e.name}`, p && p.done ? h('span', { class: 'ok', html: ' ' + ic('check') }) : null), e.plot ? h('div', { class: 'muted small clamp2' }, e.plot) : null, e.duration ? h('div', { class: 'muted small' }, e.duration) : null),
          h('div', { class: 'ep-acts' },
            h('button', { class: 'icon-btn' + (Lists.inAny(e) ? ' on' : ''), title: t('addToList'), html: ic('star'), onclick: ev => { ev.stopPropagation(); UI.listPicker(e, () => drawEps()); } }),
            h('button', { class: 'icon-btn' + (dl ? ' on' : ''), title: t('download'), html: dl && dl.status === 'done' ? ic('check') : ic('download'), onclick: ev => { ev.stopPropagation(); Downloads.add(e); drawEps(); } })));
        const play = () => { m.close(); Player.open(e, { list: all, index: all.indexOf(e) }); };
        row.addEventListener('click', play); row.addEventListener('keydown', ev => { if (ev.key === 'Enter' && ev.target === row) play(); });
        eps.appendChild(row);
      }
    };
    seasons.forEach(s => tabs.appendChild(h('button', { class: 'seg-btn', 'data-s': s, onclick: () => { curS = s; drawEps(); } }, t('season') + ' ' + s)));
    body.append(tabs, eps); drawEps();
    $('.btn.primary', acts) && $('.btn.primary', acts).focus();
  },

  /* ---------- continue watching ---------- */
  renderContinue() {
    this.setTitle(t('continue')); this.content.innerHTML = '';
    const list = Progress.continueList().filter(p => this.itemAllowed(p.item));
    if (!list.length) return this.content.appendChild(this.empty());
    const grid = h('div', { class: 'grid' }); this.content.appendChild(grid);
    this.fillGrid(grid, list, p => {
      const it = p.item; const isEp = it.type === 'episode';
      return this.posterCard(Object.assign({}, it, { img: it.img || it.seriesImg }), { progress: p, title: isEp ? it.seriesName || it.name : it.name, sub: isEp ? `${t('sShort')}${it.season} ${t('epShort')}${it.episode}` : null,
        onOpen: () => isEp ? this.playEpisode(it) : Player.open(this.findItem('movie', it.id, it.pl) || it, null, {}) });
    });
  },
  refreshContinue() { if (this.section === 'continue') this.render(); },
  onPlayerClosed() { if (['continue', 'movies', 'series', 'favorites', 'live'].includes(this.section) && !this.q) { const st = this.content.scrollTop; this.render(); this.content.scrollTop = st; } },

  /* ---------- favorites & custom lists ---------- */
  renderFavorites() {
    this.setTitle(t('favorites')); this.content.innerHTML = '';
    if (!this.favList || !Lists.data.find(l => l.id === this.favList)) this.favList = 'fav';
    const bar = h('div', { class: 'chips-bar' });
    for (const l of Lists.data) bar.appendChild(h('button', { class: 'chip-btn' + (l.id === this.favList ? ' on' : ''), onclick: () => { this.favList = l.id; this.renderFavorites(); } }, Lists.name(l), h('small', {}, ' ' + l.items.length)));
    bar.appendChild(h('button', { class: 'chip-btn add', onclick: async () => { const n = await UI.prompt(t('newList'), t('listName')); if (n) { this.favList = Lists.create(n).id; this.renderFavorites(); } } }, '+ ' + t('newList')));
    const list = Lists.data.find(l => l.id === this.favList);
    if (list.id !== 'fav') bar.append(
      h('button', { class: 'icon-btn', title: t('rename'), html: ic('edit'), onclick: async () => { const n = await UI.prompt(t('rename'), t('listName'), list.name); if (n) { Lists.rename(list.id, n); this.renderFavorites(); } } }),
      h('button', { class: 'icon-btn', title: t('delete'), html: ic('trash'), onclick: async () => { if (await UI.confirm(t('delete'), Lists.name(list) + '?')) { Lists.remove(list.id); this.favList = 'fav'; this.renderFavorites(); } } }));
    this.content.appendChild(bar);
    const items = list.items.filter(it => this.itemAllowed(it));
    if (!items.length) return this.content.appendChild(this.empty());
    const groups = [['live', t('live')], ['movie', t('movies')], ['series', t('series')], ['episode', t('episodes')]];
    for (const [type, label] of groups) {
      const g = items.filter(i => i.type === type); if (!g.length) continue;
      this.content.appendChild(h('h3', { class: 'sec-h' }, label, h('small', { class: 'muted' }, ' ' + g.length)));
      const grid = h('div', { class: type === 'live' ? 'grid live' : 'grid' }); this.content.appendChild(grid);
      const removeOpt = it => ({ extra: [{ icon: 'trash', danger: true, label: t('remove'), run: () => { Lists.toggle(list.id, it); this.renderFavorites(); } }] });
      if (type === 'live') {
        const chans = g.map(it => this.findItem('live', it.id, it.pl) || it);
        this.fillGrid(grid, chans, it => this.channelCard(it, chans, removeOpt(it)));
      } else this.fillGrid(grid, g, it => {
        const full = type === 'episode' ? it : (this.findItem(it.type, it.id, it.pl) || it);
        return this.posterCard(full, Object.assign(removeOpt(it), type === 'episode' ? { title: it.seriesName || it.name, sub: `${t('sShort')}${it.season} ${t('epShort')}${it.episode}`, onOpen: () => this.playEpisode(it) } : {}));
      });
    }
  },

  /* ---------- downloads page ---------- */
  renderDownloads(update) {
    this.setTitle(t('downloads'));
    if (update && $('.dl-page', this.content)) { // light refresh of progress only
      for (const d of Downloads.list) { const row = $(`[data-dl="${d.id}"]`, this.content); if (!row) return this.renderDownloads(); this.dlRowState(row, d); }
      $('.dl-usage', this.content).textContent = t('storageUsed') + ': ' + fmtBytes(Downloads.usage()); return;
    }
    this.content.innerHTML = ''; const page = h('div', { class: 'dl-page' }); this.content.appendChild(page);
    page.appendChild(h('div', { class: 'row between' }, h('span', { class: 'muted dl-usage' }, t('storageUsed') + ': ' + fmtBytes(Downloads.usage()))));
    if (!Downloads.list.length) return page.appendChild(this.empty());
    for (const d of Downloads.list) {
      const it = d.item;
      const row = h('div', { class: 'dl-row', 'data-dl': d.id },
        h('div', { class: 'dl-thumb' }, this.imgEl(it.img, it.name)),
        h('div', { class: 'dl-txt' }, h('div', { class: 'ep-t' }, it.seriesName ? `${it.seriesName} · ${t('sShort')}${it.season} ${t('epShort')}${it.episode}` : it.name),
          Playlists.all().length > 1 ? h('div', { class: 'muted small' }, Playlists.label(d.pl)) : null,
          h('div', { class: 'bar' }, h('i')), h('div', { class: 'muted small dl-st' })),
        h('div', { class: 'dl-acts' }));
      this.dlRowState(row, d); page.appendChild(row);
    }
  },
  dlRowState(row, d) {
    const pct = d.total ? d.bytes / d.total * 100 : 0;
    $('.bar i', row).style.width = (d.status === 'done' ? 100 : pct) + '%';
    const st = { queued: t('dlQueued'), running: t('dlRunning'), paused: t('dlPaused'), done: t('dlDone'), error: t('dlError') }[d.status] || d.status;
    $('.dl-st', row).textContent = `${st} · ${fmtBytes(d.bytes)}${d.total ? ' / ' + fmtBytes(d.total) + ' (' + pct.toFixed(0) + '%)' : ''}${d.err ? ' · ' + d.err : ''}`;
    const acts = $('.dl-acts', row); const key = d.status; if (acts.dataset.k === key) return; acts.dataset.k = key; acts.innerHTML = '';
    if (d.status === 'done') acts.append(h('button', { class: 'btn sm primary', onclick: () => Downloads.play(d) }, h('span', { html: ic('play') }), t('playOffline')), h('button', { class: 'icon-btn', title: t('saveFile'), html: ic('save'), onclick: () => Downloads.saveToDevice(d) }));
    if (d.status === 'running' || d.status === 'queued') acts.appendChild(h('button', { class: 'icon-btn', title: t('pause'), html: ic('pause'), onclick: () => Downloads.pause(d) }));
    if (d.status === 'paused' || d.status === 'error') acts.appendChild(h('button', { class: 'icon-btn', title: t('resumeDl'), html: ic('download'), onclick: () => Downloads.resume(d) }));
    acts.appendChild(h('button', { class: 'icon-btn', title: t('delete'), html: ic('trash'), onclick: async () => { if (await UI.confirm(t('delete'), t('confirmDelete'))) { await Downloads.remove(d); this.renderDownloads(); } } }));
  },

  /* ---------- recordings page ---------- */
  renderRecordings(update) {
    this.setTitle(t('recordings'));
    if (update && $('.rec-page', this.content)) { for (const r of Recorder.list) { const row = $(`[data-rec="${r.id}"]`, this.content); if (!row) return this.renderRecordings(); $('.dl-st', row).textContent = this.recStatus(r); } return; }
    this.content.innerHTML = ''; const page = h('div', { class: 'rec-page dl-page' }); this.content.appendChild(page);
    page.appendChild(h('div', { class: 'row gap' }, h('button', { class: 'btn primary', onclick: () => this.scheduleDialog() }, h('span', { html: ic('calendar') }), t('schedule'))));
    if (!Recorder.list.length) return page.appendChild(this.empty());
    for (const r of Recorder.list) {
      const acts = h('div', { class: 'dl-acts' });
      if (r.status === 'recording') acts.appendChild(h('button', { class: 'btn sm danger', onclick: () => { Recorder.stop(r); this.renderRecordings(); } }, h('span', { html: ic('stop') }), t('stopRec')));
      if (r.status === 'done') acts.append(h('button', { class: 'btn sm primary', onclick: () => Recorder.play(r) }, h('span', { html: ic('play') }), t('play')), h('button', { class: 'icon-btn', title: t('saveFile'), html: ic('save'), onclick: () => Recorder.saveToDevice(r) }));
      acts.appendChild(h('button', { class: 'icon-btn', title: t('delete'), html: ic('trash'), onclick: async () => { if (await UI.confirm(t('delete'), t('confirmDelete'))) { await Recorder.remove(r); this.renderRecordings(); } } }));
      page.appendChild(h('div', { class: 'dl-row', 'data-rec': r.id }, h('div', { class: 'dl-thumb wide' }, this.imgEl(r.item.img, r.item.name, 'contain')),
        h('div', { class: 'dl-txt' }, h('div', { class: 'ep-t' }, (r.status === 'recording' ? '● ' : '') + r.item.name), h('div', { class: 'muted small dl-st' }, this.recStatus(r))), acts));
    }
  },
  recStatus(r) {
    const when = new Date(r.start || r.started || r.ts).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    const st = { scheduled: t('scheduled'), recording: t('recording'), done: t('dlDone'), error: t('dlError'), cancelled: t('cancel'), missed: t('dlError') }[r.status] || r.status;
    return `${st} · ${when}${r.minutes ? ' · ' + r.minutes + ' ' + t('minutes') : ''} · ${fmtBytes(r.bytes)}${r.err ? ' · ' + r.err : ''}`;
  },
  scheduleDialog(ch) {
    const chans = this.data ? this.filterItems('live', this.data.live.items) : [];
    let picked = ch || null;
    const now = new Date(Date.now() + 5 * 60000); const pad = n => String(n).padStart(2, '0');
    const dt = h('input', { class: 'input', type: 'datetime-local', value: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}` });
    const dur = h('input', { class: 'input', type: 'number', min: 1, max: 600, value: 60 });
    const q = h('input', { class: 'input', placeholder: t('search') }); const res = h('div', { class: 'pick-list' }); const lbl = h('div', { class: 'picked' }, picked ? picked.name : '—');
    const draw = () => { res.innerHTML = ''; const s = q.value.toLowerCase(); chans.filter(c => !s || c._q.includes(s)).slice(0, 80).forEach(c => res.appendChild(h('button', { class: 'ps-item' + (picked === c ? ' active' : ''), onclick: () => { picked = c; lbl.textContent = c.name; draw(); } }, c.name))); };
    q.addEventListener('input', draw); draw();
    const m = UI.modal(t('schedule'), h('div', { class: 'stack' }, h('label', { class: 'lbl' }, t('channel')), lbl, q, res, h('label', { class: 'lbl' }, t('start')), dt, h('label', { class: 'lbl' }, t('duration')), dur,
      h('div', { class: 'row end gap' }, h('button', { class: 'btn', onclick: () => m.close() }, t('cancel')),
        h('button', { class: 'btn primary', onclick: () => { if (!picked) return; Recorder.schedule(picked, new Date(dt.value).getTime(), +dur.value || 60); m.close(); if (this.section === 'recordings') this.renderRecordings(); } }, t('save')))));
  },

  /* ---------- settings ---------- */
  renderSettings() {
    this.setTitle(t('settings')); this.content.innerHTML = '';
    const page = h('div', { class: 'settings' }); this.content.appendChild(page);
    const section = (title, ...kids) => page.appendChild(h('section', { class: 'set-sec' }, h('h3', {}, title), ...kids));
    const row = (label, ctrl, hint) => h('label', { class: 'set-row' }, h('span', {}, label, hint ? h('small', { class: 'muted block' }, hint) : null), ctrl);
    const sel = (key, opts, after) => { const s = h('select', { class: 'input sm' }, ...opts.map(([v, l]) => h('option', { value: v }, l))); s.value = String(Settings.get(key)); s.addEventListener('change', () => { const v = isNaN(+s.value) || s.value === '' ? s.value : +s.value; Settings.set(key, v); after && after(v); }); return s; };
    const sw = (val, on) => { const c = h('input', { type: 'checkbox', class: 'switch' }); c.checked = !!val; c.addEventListener('change', () => on(c.checked)); return c; };

    /* subscriptions dashboard */
    const subs = h('div', { class: 'subs' });
    for (const p of Playlists.all()) subs.appendChild(this.subCard(p));
    const modeBox = Playlists.all().length > 1 ? h('div', { class: 'mode-pick' },
      ...[['single', t('separate'), t('separateDesc')], ['merged', t('merged'), t('mergedDesc')]].map(([k, l, d]) => h('button', { class: 'mode-opt' + (Playlists.mode() === k ? ' on' : ''), onclick: () => { if (k === 'merged') Playlists.setMerged(); else Playlists.setActive(Playlists.activeId()); this.cat = 'all'; this.loadCatalog().then(() => { this.section = 'settings'; this.render(); }); } }, h('b', {}, l), h('small', {}, d)))) : null;
    section(t('subscriptions'), modeBox ? h('div', { class: 'lbl' }, t('viewMode')) : null, modeBox, subs,
      h('div', { class: 'row gap' }, h('button', { class: 'btn primary', onclick: () => { const m = UI.modal(t('addPlaylist'), this.playlistForm(null, () => { m.close(); if (LS.get('freeOnly', false)) { LS.del('freeOnly'); return location.reload(); } this.loadCatalog(); this.renderSettings(); })); } }, '+ ' + t('addPlaylist')),
        h('button', { class: 'btn', onclick: async e => { e.target.disabled = true; await Accounts.refreshAll(); this.renderExpiryBanner(); this.renderSettings(); } }, h('span', { html: ic('refresh') }), t('checkAccounts'))));

    section(t('playerSettings'),
      row(t('liveFormat'), sel('liveFormat', [['m3u8', 'HLS (.m3u8)'], ['ts', 'MPEG-TS (.ts)']])),
      row(t('seekStep'), sel('seekStep', [[5, '5'], [10, '10'], [15, '15'], [30, '30'], [60, '60']])),
      row(t('defaultAspect'), sel('aspect', ASPECTS.map(a => [a, t(a) !== a ? t(a) : a]))),
      row(t('defaultSpeed'), sel('speed', SPEEDS.map(s => [s, s + 'x']))),
      row(t('autoNext'), sw(Settings.get('autoNext'), v => Settings.set('autoNext', v))));

    /* parental */
    const P = Parental.d;
    const parentalBody = h('div', { class: 'stack' });
    const drawParental = () => {
      parentalBody.innerHTML = '';
      parentalBody.append(
        row(t('parentalOn'), sw(P.enabled, async v => {
          if (v && !P.pin) { const pin = await UI.pinCreate(); if (!pin) return drawParental(); await Parental.setPin(pin); }
          if (!v && !(await UI.pinPrompt())) return drawParental();
          P.enabled = v; Parental.save(); drawParental(); this.renderCats();
        })),
        h('button', { class: 'btn sm', onclick: async () => { if (P.pin && !(await UI.pinPrompt())) return; const pin = await UI.pinCreate(); if (pin) { await Parental.setPin(pin); UI.toast(t('ok')); } } }, P.pin ? t('pinChange') : t('pinSet')));
      if (!P.enabled) return;
      const guard = fn => async (...a) => { if (await UI.pinPrompt()) fn(...a); else drawParental(); };
      const minIn = h('input', { class: 'input sm', type: 'number', min: 0, max: 1440, value: P.dailyMin || 0 });
      minIn.addEventListener('change', guard(() => { P.dailyMin = +minIn.value || 0; Parental.save(); }));
      const from = h('input', { class: 'input sm', type: 'time', value: P.from || '' }), to = h('input', { class: 'input sm', type: 'time', value: P.to || '' });
      [from, to].forEach(x => x.addEventListener('change', guard(() => { P.from = from.value; P.to = to.value; Parental.save(); })));
      parentalBody.append(
        row(t('dailyLimit'), minIn, t('usedToday') + ': ' + Math.round(Parental.usedToday() / 60) + ' ' + t('minutes')),
        row(t('allowedHours'), h('div', { class: 'row gap' }, from, to)),
        h('div', { class: 'row gap wrap' }, ...['movies', 'series', 'live'].map(sec => h('button', { class: 'btn sm', onclick: guard(() => this.allowedCatsDialog(sec)) }, h('span', { html: ic('lock') }), t('allowedCats') + ': ' + t(sec)))));
    };
    drawParental();
    section(t('parental'), parentalBody);

    section(t('appearance'),
      row(t('themeMode'), sel('theme', [['auto', t('auto')], ['light', '☀️ ' + t('day')], ['dark', '🌙 ' + t('night')]], () => this.applyTheme())),
      row(t('language'), sel('lang', [['auto', t('auto')], ['en', 'English'], ['ar', 'العربية']], () => { this.applyLang(); this.renderShell(); this.setData(this.data, this.dataTs); this.section = 'settings'; this.renderCats(); this.render(); })),
      row(t('theme'), h('div', { class: 'swatches' }, ...['#5b8cff', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#06b6d4', '#eab308'].map(c => h('button', { class: 'swatch' + (Settings.get('accent') === c ? ' on' : ''), style: { background: c }, 'aria-label': c, onclick: () => { Settings.set('accent', c); this.applyTheme(); this.renderSettings(); } })))),
      row(t('tvMode'), sel('tvMode', [['auto', t('auto')], ['on', t('yes')], ['off', t('no')]], () => this.applyTheme())));

    section(t('free'), h('p', { class: 'muted small' }, t('freeHint')),
      row(t('freeBase'), (() => { const i = h('input', { class: 'input sm', value: Settings.get('freeBase') || DEFAULT_FREE_BASE }); i.addEventListener('change', () => { Settings.set('freeBase', i.value.trim()); FreeCat.load(true); }); return i; })()),
      FreeCat.status && FreeCat.status.sources ? h('div', { class: 'free-sources' }, ...FreeCat.status.sources.map(s => h('div', { class: 'src-row' }, h('span', { class: s.ok ? 'ok' : 'bad-t' }, s.ok ? '●' : '○'), h('a', { href: s.home || '#', target: '_blank', rel: 'noopener' }, s.name), h('small', { class: 'muted' }, [s.live && s.live + ' live', s.movies && s.movies + ' movies', s.series && s.series + ' series'].filter(Boolean).join(' · '))))) : null);

    const fileIn = h('input', { type: 'file', accept: '.json', class: 'hidden' });
    fileIn.addEventListener('change', async () => { const f = fileIn.files[0]; if (!f) return; try { const j = JSON.parse(await f.text()); for (const k of ['playlists', 'lists', 'progress', 'settings', 'hiddenCats', 'recordings']) if (j[k] != null) LS.set(k, j[k]); location.reload(); } catch { UI.alert(t('import'), 'Invalid file'); } });
    section(t('advanced'),
      row(t('refreshEvery'), sel('refreshHours', [[1, '1'], [6, '6'], [12, '12'], [24, '24'], [48, '48'], [168, '168']]), t('hours') + (this.dataTs ? ' · ' + t('updated') + ': ' + new Date(this.dataTs).toLocaleString() : '')),
      row(t('proxy'), (() => { const i = h('input', { class: 'input sm', value: Settings.get('proxy') || '', placeholder: 'https://my-proxy.workers.dev/?url=' }); i.addEventListener('change', () => Settings.set('proxy', i.value.trim())); return i; })()),
      h('div', { class: 'row gap wrap' },
        h('button', { class: 'btn sm', onclick: async () => { await IDB.clear('cache'); UI.toast(t('clearCache') + ' ✓'); this.loadCatalog(true); } }, t('clearCache')),
        h('button', { class: 'btn sm', onclick: async () => { if (await UI.confirm(t('clearHistory'))) { Progress.clear(); UI.toast('✓'); } } }, t('clearHistory')),
        h('button', { class: 'btn sm', onclick: () => {
          const data = { app: 'doom', v: 1, playlists: LS.get('playlists', []), lists: Lists.data, progress: Progress.map, settings: Settings.data, hiddenCats: Hidden.data, recordings: Recorder.list.filter(r => r.status === 'scheduled') };
          const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' })), download: 'doom-backup.json' }); document.body.appendChild(a); a.click(); a.remove();
        } }, t('export')),
        h('button', { class: 'btn sm', onclick: () => fileIn.click() }, t('import')), fileIn),
      h('p', { class: 'muted small' }, t('backupHint')));

    section(t('about'), h('div', { class: 'about' }, h('div', { class: 'logo big' }, h('span', { html: ic('play') }), 'DOOM IPTV'),
      h('p', { class: 'muted' }, t('version') + ' ' + (window.DOOM_VERSION || 'dev')), h('p', {}, t('designedBy') + ': ', h('b', {}, LANG === 'ar' ? 'أسامة حسن دسوقي' : 'OSAMA HASAN DESOUKY'))));
  },
  subCard(p) {
    const a = Accounts.get(p.id) || {}; const d = Accounts.daysLeft(p.id);
    const inUse = Playlists.mode() === 'merged' ? p.merge !== false : p.id === Playlists.activeId();
    const expTxt = a.exp ? new Date(a.exp).toLocaleDateString([], { dateStyle: 'medium' }) : (p.type === 'xtream' ? '—' : t('unlimited'));
    const cls = d == null ? '' : d < 0 ? 'bad' : d <= 7 ? 'warn' : 'good';
    const pct = d == null ? 100 : clamp(d / 30 * 100, 0, 100);
    const card = h('div', { class: 'sub-card ' + cls + (inUse ? ' in-use' : '') },
      h('div', { class: 'sub-head' }, h('div', {}, h('b', {}, p.name || p.username), h('small', { class: 'muted' }, ' · ' + t(p.type))), inUse ? h('span', { class: 'chip sm accent' }, t('current')) : null),
      h('div', { class: 'sub-exp' }, h('div', { class: 'sub-days' }, d == null ? (a.exp === null && p.type !== 'xtream' ? t('unlimited') : '—') : d < 0 ? t('expired') : t('daysLeft', { n: d })), h('div', { class: 'bar' }, h('i', { style: { width: pct + '%' } }))),
      h('div', { class: 'sub-grid' },
        h('div', {}, h('small', { class: 'muted' }, t('status')), h('div', {}, a.error ? '⚠ ' + t('dlError') : a.status || '—')),
        h('div', {}, h('small', { class: 'muted' }, t('expires')), h('div', {}, expTxt)),
        h('div', {}, h('small', { class: 'muted' }, t('connections')), h('div', {}, (a.active != null ? a.active : '—') + ' / ' + (a.max || '—'))),
        h('div', {}, h('small', { class: 'muted' }, t('created')), h('div', {}, a.created ? new Date(a.created).toLocaleDateString() : '—')),
        p.type === 'xtream' ? h('div', { class: 'span2' }, h('small', { class: 'muted' }, t('server')), h('div', { class: 'ellip' }, p.server)) : null,
        a.trial ? h('div', {}, h('span', { class: 'chip sm' }, t('trial'))) : null,
        h('div', { class: 'span2' }, h('small', { class: 'muted' }, t('lastChecked') + ': ' + (a.ts ? new Date(a.ts).toLocaleString() : '—')))),
      h('div', { class: 'row gap wrap' },
        Playlists.mode() !== 'merged' && p.id !== Playlists.activeId() ? h('button', { class: 'btn sm primary', onclick: () => { Playlists.setActive(p.id); this.cat = 'all'; this.loadCatalog().then(() => { this.section = 'settings'; this.render(); }); } }, t('useThis')) : null,
        Playlists.all().length > 1 ? h('label', { class: 'switch-row sm' }, h('span', {}, t('includeMerged')), (() => { const c = h('input', { type: 'checkbox', class: 'switch' }); c.checked = p.merge !== false; c.addEventListener('change', () => { Playlists.update(p.id, { merge: c.checked }); if (Playlists.mode() === 'merged') this.loadCatalog().then(() => { this.section = 'settings'; this.render(); }); }); return c; })()) : null,
        h('button', { class: 'icon-btn', title: t('refresh'), html: ic('refresh'), onclick: async () => { try { await Accounts.refresh(p.id); } catch {} this.renderExpiryBanner(); this.renderSettings(); } }),
        h('button', { class: 'icon-btn', title: t('edit'), html: ic('edit'), onclick: () => { const m = UI.modal(t('edit'), this.playlistForm(p, () => { m.close(); this.loadCatalog(true); this.renderSettings(); })); } }),
        h('button', { class: 'icon-btn', title: t('delete'), html: ic('trash'), onclick: async () => { if (await UI.confirm(t('delete'), p.name + '?')) { Playlists.remove(p.id); if (!Playlists.all().length) return location.reload(); this.data = null; this.loadCatalog().then(() => { this.section = 'settings'; this.render(); }); } } })));
    return card;
  },
  allowedCatsDialog(sec) {
    const cats = this.data[sec].cats; const cur = Parental.getAllowed(sec); const map = {};
    cats.forEach(c => { map[c.id] = cur ? !!cur[c.id] : true; });
    const list = h('div', { class: 'cat-checks' });
    const draw = () => { list.innerHTML = ''; cats.forEach(c => { const cb = h('input', { type: 'checkbox' }); cb.checked = map[c.id]; cb.addEventListener('change', () => { map[c.id] = cb.checked; }); list.appendChild(h('label', { class: 'cat-check' }, cb, h('span', {}, c.name))); }); };
    draw();
    const m = UI.modal(t('allowedCats') + ' — ' + t(sec), h('div', { class: 'stack' }, h('p', { class: 'muted small' }, t('allowedCatsHint')),
      h('div', { class: 'row gap' }, h('button', { class: 'btn sm', onclick: () => { cats.forEach(c => { map[c.id] = true; }); draw(); } }, t('selectAll')), h('button', { class: 'btn sm', onclick: () => { cats.forEach(c => { map[c.id] = false; }); draw(); } }, t('selectNone'))),
      list, h('div', { class: 'row end gap' }, h('button', { class: 'btn', onclick: () => m.close() }, t('cancel')), h('button', { class: 'btn primary', onclick: () => { Parental.setAllowed(sec, map); m.close(); this.renderCats(); UI.toast('✓'); } }, t('save')))), { wide: true });
  },

  /* ---------- keyboard / remote ---------- */
  bindGlobalKeys() {
    document.addEventListener('keydown', e => {
      if (Player.open_ && !UI.top() && Player.onKey(e)) { e.preventDefault(); return; }
      const k = e.key, code = e.keyCode;
      const back = k === 'Escape' || k === 'GoBack' || k === 'BrowserBack' || code === 10009 || code === 461 || (k === 'Backspace' && !(e.target.matches && e.target.matches('input,textarea')));
      if (back) {
        const ctx = $('.ctx'); if (ctx) { ctx.remove(); e.preventDefault(); return; }
        const m = UI.top(); if (m) { m.close(); e.preventDefault(); return; }
        if (document.body.classList.contains('side-open')) { document.body.classList.remove('side-open'); e.preventDefault(); return; }
        return;
      }
      const dirs = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
      if (dirs[k] && (document.body.classList.contains('tv') || !e.target.matches || !e.target.matches('input,select,textarea') || /Up|Down/.test(k) && e.target.matches('input[type=search],input[type=text]'))) {
        if (e.target.matches && e.target.matches('input[type=range]') && /Left|Right/.test(k)) return;
        if (e.target.matches && e.target.matches('input:not([type=checkbox]):not([type=range]),textarea') && /Left|Right/.test(k)) return;
        let d = dirs[k]; if (document.documentElement.dir === 'rtl' && (d === 'left' || d === 'right') && false) d = d === 'left' ? 'right' : 'left';
        if (SpatialNav.move(d)) e.preventDefault();
      }
      if (k === '/' && !Player.open_ && !(e.target.matches && e.target.matches('input,textarea'))) { e.preventDefault(); const s = $('.search-in'); s && s.focus(); }
    });
  }
};

/* ====================== multi-view (within the subscription's connection limit) ====================== */
const MultiView = {
  tiles: [null, null, null, null], audio: 0, el: null,
  render(content) {
    App.setTitle(t('multiview')); content.innerHTML = '';
    const limits = Playlists.inScope().map(p => { const a = Accounts.get(p.id) || {}; return `${esc(p.name)}: ${a.max || '?'} ${t('connections')}`; }).join(' · ');
    this.el = h('div', { class: 'mv' }, h('p', { class: 'muted small' }, t('mvHint'), h('br'), limits), h('div', { class: 'mv-grid' }));
    content.appendChild(this.el);
    const grid = $('.mv-grid', this.el);
    this.tiles.forEach((tile, i) => {
      const box = h('div', { class: 'mv-tile' + (i === this.audio ? ' audio' : ''), tabindex: 0, 'data-i': i });
      if (tile) { box.append(tile.video, this.tileBar(i)); }
      else box.appendChild(h('button', { class: 'mv-add', onclick: () => this.pick(i) }, h('span', { html: ic('plus', 'xl') }), t('addChannel')));
      box.addEventListener('click', e => { if (e.target.closest('button')) return; if (tile) this.setAudio(i); else this.pick(i); });
      box.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target === box) { if (tile) this.setAudio(i); else this.pick(i); } });
      grid.appendChild(box);
    });
  },
  tileBar(i) {
    const tl = this.tiles[i];
    return h('div', { class: 'mv-bar' }, h('span', { class: 'ellip' }, tl.item.name),
      h('button', { class: 'icon-btn sm', title: t('volume'), html: ic(i === this.audio ? 'vol' : 'mute'), onclick: () => this.setAudio(i) }),
      h('button', { class: 'icon-btn sm', title: t('fullscreen'), html: ic('fs'), onclick: () => { MultiView.stopAll(); App.playLive(tl.item, null); } }),
      h('button', { class: 'icon-btn sm', title: t('close'), html: ic('close'), onclick: () => { this.stop(i); this.render(App.content); } }));
  },
  setAudio(i) { this.audio = i; this.tiles.forEach((tl, j) => { if (tl) tl.video.muted = j !== i; }); this.render(App.content); },
  pick(i) {
    const chans = App.filterItems('live', App.data.live.items).concat(FreeCat.live.filter(x => FreeCat.usable(x)));
    if (!FreeCat.ts) FreeCat.load();
    const q = h('input', { class: 'input', placeholder: t('search') }); const list = h('div', { class: 'pick-list tall' });
    const draw = () => { list.innerHTML = ''; const s = q.value.toLowerCase(); chans.filter(c => !s || c._q.includes(s)).slice(0, 150).forEach(c => list.appendChild(h('button', { class: 'ps-item', onclick: () => { m.close(); this.start(i, c); } }, App.imgEl(c.img, c.name, 'contain'), h('span', { class: 'ps-name' }, (c.num ? c.num + '. ' : '') + c.name)))); };
    q.addEventListener('input', debounce(draw, 150)); draw();
    const m = UI.modal(t('pickChannel'), h('div', { class: 'stack' }, q, list));
  },
  async start(i, item) {
    this.stop(i);
    const prov = provOf(item);
    const chk = await Conn.canOpenExtra(item.pl);
    if (!chk.ok) { UI.alert(t('connLimitTitle'), t('connLimit', { n: chk.max })); return; }
    const video = h('video', { playsinline: true, muted: true, autoplay: true }); video.muted = i !== this.audio;
    Conn.open('mv' + i, 'multiview', item.pl);
    const tile = { item, video, engine: null }; this.tiles[i] = tile; this.render(App.content);
    try { tile.engine = await attachStream(video, prov.streamUrl(item), { live: true, onFatal: () => { UI.toast(t('errPlay') + ': ' + item.name); } }); }
    catch { UI.toast(t('errPlay')); }
  },
  stop(i) { const tl = this.tiles[i]; if (!tl) return; try { tl.engine && tl.engine.destroy(); } catch {} try { tl.video.pause(); tl.video.srcObject = null; tl.video.removeAttribute('src'); } catch {} Conn.close('mv' + i); this.tiles[i] = null; },
  stopAll() { this.tiles.forEach((_, i) => this.stop(i)); }
};

window.addEventListener('DOMContentLoaded', () => App.start());
