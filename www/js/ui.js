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
  SEL: 'button:not([disabled]):not([tabindex="-1"]),a[href],input:not([type=hidden]):not(.hidden),select,textarea,[tabindex]:not([tabindex="-1"])',
  /* what is on screen. Poster grids can hold thousands of cards, so only the visible rows are measured (binary search) */
  focusables(root) {
    const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
    const grids = $$('.grid', root), gs = new Set(grids), out = [];
    for (const el of $$(this.SEL, root)) { if (gs.has(el.parentElement) || el.closest('.hidden')) continue; if (vis(el)) out.push(el); }
    for (const g of grids) {
      const k = g.children; let lo = 0, hi = k.length;
      while (lo < hi) { const m = (lo + hi) >> 1; if (k[m].getBoundingClientRect().bottom <= 0) lo = m + 1; else hi = m; }
      for (let i = lo; i < k.length; i++) { const r = k[i].getBoundingClientRect(); if (r.top >= innerHeight) break; if (r.width && r.height && k[i].tabIndex >= 0) out.push(k[i]); }
    }
    return grids.length ? out.sort((a, b) => (a.compareDocumentPosition(b) & 4 ? -1 : 1)) : out;
  },
  /* number of columns of a grid: measured once, again only when its width changes */
  cols(g) {
    const w = g.clientWidth;
    if (g._cols && g._colsW === w) return g._cols;
    const k = g.children; let n = 1; const top = k[0] ? k[0].offsetTop : 0;
    while (n < k.length && k[n].offsetTop === top) n++;
    g._colsW = w; g._cols = Math.max(1, n); return g._cols;
  },
  /* the cards around the focused one in its grid (a few rows up and down) — enough to find the neighbour */
  nearby(cur) {
    const g = cur.parentElement; if (!g || !(g.classList.contains('grid') || g.classList.contains('th-row') || g.classList.contains('th-grid'))) return null;
    const k = g.children, i = Array.prototype.indexOf.call(k, cur); if (i < 0) return null;
    return Array.prototype.slice.call(k, Math.max(0, i - 40), i + 41);
  },
  root() {
    const m = UI.top(); if (m) return m.box;
    const ctx = $('.ctx'); if (ctx) return ctx;
    if (Player.open_) { for (const s of ['.p-menu', '.p-side', '.p-err', '.p-next']) { const x = $(s, Player.el); if (x && !x.classList.contains('hidden')) return x; } return Player.el; }
    if (window.TvHome && TvHome.open_ && TvHome.el) return TvHome.el;
    return document.body;
  },
  /* scroll areas that keep their own list (the grid, the categories, dialogs) */
  SCROLLERS: '.content, .cats, .modal-body, .ps-list, .p-side, .sidebar, .th-main',
  rect: el => el.getBoundingClientRect(),
  pick(dir, cur, items, r, sameRow) {
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2; let best = null, bestScore = Infinity; const cands = [];
    for (const el of items) {
      if (el === cur) continue; const q = this.rect(el); if (!q.width || !q.height) continue;
      const x = q.left + q.width / 2, y = q.top + q.height / 2, dx = x - cx, dy = y - cy; let main, cross;
      // judge direction from the centres (a focused item may be slightly enlarged and overlap its neighbours)
      if (dir === 'left') { if (!(dx < -8 && q.left < r.left + 2)) continue; main = -dx; cross = Math.abs(dy); }
      if (dir === 'right') { if (!(dx > 8 && q.right > r.right - 2)) continue; main = dx; cross = Math.abs(dy); }
      if (dir === 'up') { if (!(dy < -8 && q.top < r.top + 2)) continue; main = -dy; cross = Math.abs(dx); }
      if (dir === 'down') { if (!(dy > 8 && q.bottom > r.bottom - 2)) continue; main = dy; cross = Math.abs(dx); }
      const horiz = dir === 'left' || dir === 'right';
      if (horiz && Math.abs(dy) > Math.max(r.height, q.height) * 1.5 + 40 && main < cross) continue;
      // up/down must not jump sideways into another panel (e.g. from the movies grid into the side menu)
      if (!horiz && !sameRow && (q.right < r.left - 4 || q.left > r.right + 4) && cross > main) continue;
      if (!horiz) { cands.push([main, cross, el]); continue; }
      const score = main + cross * 2.2; if (score < bestScore) { bestScore = score; best = el; }
    }
    if (cands.length) {   // up/down: go to the nearest row first, then the closest item in that row
      const minMain = Math.min(...cands.map(c => c[0]));
      for (const [main, cross, el] of cands) if (main <= minMain + 24) { const sc = cross + main * .1; if (sc < bestScore) { bestScore = sc; best = el; } }
    }
    return best;
  },
  /* keep the focused item comfortably inside its scroll area — instant, no smooth-scroll lag on TV boxes */
  reveal(el) {
    this._rv = el; if (this._rvq) return; this._rvq = true;
    requestAnimationFrame(() => { this._rvq = false; const e = this._rv; if (e && e.isConnected) this.revealNow(e); });
  },
  revealNow(el) {
    const sc = el.closest(this.SCROLLERS); if (!sc || sc.scrollHeight <= sc.clientHeight + 2) return;
    const q = this.rect(el), s = this.rect(sc), pad = Math.min(90, s.height * .18);
    let d = 0; if (q.top < s.top + pad) d = q.top - s.top - pad; else if (q.bottom > s.bottom - pad) d = q.bottom - s.bottom + pad;
    if (d) { const b = sc.style.scrollBehavior; sc.style.scrollBehavior = 'auto'; sc.scrollTop += d; sc.style.scrollBehavior = b; }
  },
  move(dir) {
    const root = this.root(); const cur = document.activeElement && root.contains(document.activeElement) ? document.activeElement : null;
    if (!cur) { const f = this.focusables(root)[0]; f && f.focus(); return true; }
    const r = this.rect(cur);
    let best = null;
    // grid fast path: the next card is found by position in the list (columns are measured once per grid),
    // no measuring of every card on each press
    const g = cur.parentElement;
    if (g && (g.classList.contains('grid') || g.classList.contains('th-grid'))) {
      const k = g.children, i = Array.prototype.indexOf.call(k, cur), cols = this.cols(g), rtl = document.documentElement.dir === 'rtl';
      const start = rtl ? 'right' : 'left', end = rtl ? 'left' : 'right';
      let j = -1;
      if (dir === 'down' && i + cols < k.length) j = i + cols;
      else if (dir === 'down' && Math.floor(i / cols) < Math.floor((k.length - 1) / cols)) j = k.length - 1;   // short last row
      else if (dir === 'up' && i - cols >= 0) j = i - cols;
      else if (dir === end && i % cols < cols - 1 && i + 1 < k.length) j = i + 1;
      else if (dir === end) return true;                                   // end of a row: stay
      else if (dir === start && i % cols > 0) j = i - 1;
      if (j >= 0 && k[j] && k[j].tabIndex >= 0) { k[j].focus({ preventScroll: true }); this.reveal(k[j]); return true; }
    }
    // big-screen rows fast path: left/right = neighbour card; up/down = the card under the same spot in the next row
    if (g && g.classList.contains('th-row')) {
      const rtl = document.documentElement.dir === 'rtl', start = rtl ? 'right' : 'left', end = rtl ? 'left' : 'right';
      const go = el => { el.focus({ preventScroll: true }); this.reveal(el); return true; };
      if (dir === end) { const n = cur.nextElementSibling; return n ? go(n) : true; }
      if (dir === start) { const pv = cur.previousElementSibling; if (pv) return go(pv); }
      else {
        let sec = cur.closest('.th-sec'); const nx = x => dir === 'down' ? x.nextElementSibling : x.previousElementSibling;
        sec = sec && nx(sec); while (sec && !$('.th-row', sec)) sec = nx(sec);
        const row = sec && $('.th-row', sec);
        if (row && row.children.length) {
          const k = row.children, f = k[0].getBoundingClientRect(), c = cur.getBoundingClientRect();
          const step = row._step || (row._step = k.length > 1 ? Math.abs(k[1].getBoundingClientRect().left - f.left) || f.width : f.width);
          const j = Math.max(0, Math.min(k.length - 1, Math.round((rtl ? f.right - c.right : c.left - f.left) / step)));
          return go(k[j]);
        }
      }
    }
    // 0) inside a poster grid: look only at the neighbouring rows (fast on huge lists)
    const near = this.nearby(cur); if (near) best = this.pick(dir, cur, near, r, true);
    // big-screen rows: up/down only looks at the row just above/below (not every card of every row)
    if (!best && (dir === 'up' || dir === 'down') && cur.parentElement && cur.parentElement.classList.contains('th-row')) {
      let sec = cur.closest('.th-sec'); const nx = x => dir === 'down' ? x.nextElementSibling : x.previousElementSibling;
      sec = sec && nx(sec); while (sec && !$('.th-row', sec)) sec = nx(sec);
      if (sec) { best = this.pick(dir, cur, Array.from($('.th-row', sec).children), r, true); if (best) { best.focus({ preventScroll: true }); this.reveal(best); return true; } }
    }
    // end of a big-screen row: stay there (only the start side leads out, to the icon rail)
    if (!best && near && cur.parentElement.classList.contains('th-row') && dir === (document.documentElement.dir === 'rtl' ? 'left' : 'right')) return true;
    // 1) up/down: stay inside the same list first, including the rows that are below or above the screen
    const sc = cur.closest(this.SCROLLERS);
    if (!best && (dir === 'up' || dir === 'down') && sc && root.contains(sc)) {
      const own = $$('button:not([disabled]):not([tabindex="-1"]),a[href],input:not([type=hidden]),select,textarea,[tabindex]:not([tabindex="-1"])', sc).filter(el => !el.closest('.hidden'));
      best = this.pick(dir, cur, own, r, true);
      if (!best && sc.scrollHeight > sc.clientHeight + 2) {     // more items are still being loaded below → scroll to load them, then try again
        const before = sc.scrollTop; sc.style.scrollBehavior = 'auto'; sc.scrollTop += dir === 'down' ? 320 : -320; sc.style.scrollBehavior = '';
        if (sc.scrollTop !== before) { setTimeout(() => { const nb = this.pick(dir, cur, $$('[tabindex]:not([tabindex="-1"]),button:not([disabled])', sc), this.rect(cur), true); if (nb) { nb.focus({ preventScroll: true }); this.reveal(nb); } }, 120); return true; }
      }
    }
    // 2) everything visible on screen
    if (!best) best = this.pick(dir, cur, this.focusables(root), r, false);
    if (best) { best.focus({ preventScroll: true }); this.reveal(best); return true; }
    return false;
  }
};

/* ====================== the application ====================== */
const HEART = "<svg viewBox='0 0 24 24' class='ic'><path d='M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.1 5.3 3 1.7-1.9 3.2-3 5.3-3 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z'/></svg>";
/* classic layout on TV: one highlight frame on its own layer follows the focused poster/channel,
   so moving the focus doesn't restyle cards (no zoom/outline repaint, no forced layout while navigating) */
/* ---------- the remote's OK key: one physical press = one action ----------
   Holding OK makes the TV repeat key-down (~every 50 ms) until key-up. Everything from the first
   key-down to the key-up is ONE press: short → open the title, held ≥ 500 ms → the long-press action,
   exactly once. While the key is still held, the repeats are swallowed here (capture phase, before
   any other handler) so they can't re-trigger the card, nor "click" the menu / heart that opened under
   the finger; the key-up and any click the TV synthesises right after it are swallowed too.
   TVs that never send key-up: the press ends after 450 ms without repeats. */
const OkHold = {
  st: null, quiet: 0, LONG: 500,
  isOk(e) { return e.key === 'Enter' || e.keyCode === 23 || e.keyCode === 13 || e.key === 'Select' || e.key === 'Accept'; },
  eat(e) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); },
  init() {
    if (this._on) return; this._on = true;
    this.keyup = LS.get('okKeyup', false);
    window.addEventListener('keydown', e => this.down(e), true);
    window.addEventListener('keyup', e => this.up(e), true);
    const late = e => { if ((this.st && this.st.long) || Date.now() < this.quiet) this.eat(e); };
    window.addEventListener('click', late, true); window.addEventListener('contextmenu', e => { if (this.st || Date.now() < this.quiet) this.eat(e); }, true);
    window.addEventListener('blur', () => this.end(true));
  },
  card() { const a = document.activeElement; return a && a._press && !textField(a) ? a : null; },
  down(e) {
    if (!this.isOk(e) || e.altKey || e.ctrlKey || e.metaKey) return;
    const s = this.st, now = Date.now();
    if (s) {   // same press still held
      this.eat(e); s.reps++; s.last = now;
      if (!s.long && now - s.t0 >= this.LONG) this.fire();
      this.idle(); return;
    }
    if (now < this.quiet && e.repeat) { this.eat(e); return; }
    const c = this.card();
    if (!c) {
      // a repeat with no press of ours: the tail of a hold that began elsewhere → ignore it, don't click
      if (e.repeat && this._held) { this.eat(e); return; }
      return;
    }
    this.eat(e);
    if (e.repeat) { this.st = { c, t0: now - this.LONG, reps: 1, long: true, last: now }; this.idle(); return; }
    this.st = { c, t0: now, reps: 0, long: false, last: now };
    clearTimeout(this._t);
    this._t = setTimeout(() => {
      const s = this.st; if (!s || s.long) return;
      // still down after LONG: a hold — if this TV is known to send key-up, or repeats are arriving
      if (s.reps > 0 || this.keyup) { this.fire(); this.idle(); }
      else { this.st = null; s.c._press.open(); }   // TV that sends neither: treat as a normal OK
    }, this.LONG + 40);
  },
  fire() { const s = this.st; if (!s || s.long) return; s.long = true; this._held = true; s.c._press.long(); },
  idle() { clearTimeout(this._i); this._i = setTimeout(() => this.end(false), 450); },
  end(cancel) {
    const s = this.st; clearTimeout(this._t); clearTimeout(this._i); this.st = null; this._held = false;
    if (s && s.long) this.quiet = Date.now() + 350;
  },
  up(e) {
    if (!this.isOk(e)) return;
    if (!this.keyup) { this.keyup = true; LS.set('okKeyup', true); }
    const s = this.st;
    if (!s) { if (Date.now() < this.quiet) this.eat(e); return; }
    this.eat(e); this.end(false);
    if (!s.long && document.body.contains(s.c)) s.c._press.open();
  }
};
const textField = el => el && el.matches && el.matches('input:not([type=checkbox]):not([type=radio]):not([type=range]),textarea,select');

const FocusRing = {
  el: null, cur: null,
  init() {
    this.el = h('div', { class: 'fring' }); document.body.appendChild(this.el);
    document.addEventListener('focusin', e => { const c = e.target.closest && e.target.closest('.content .card, .content .ch-card'); this.to(document.body.classList.contains('tv') ? c : null); });
    document.addEventListener('focusout', e => { if (!e.relatedTarget) this.to(null); });
    let q = 0; const follow = () => { if (q) return; q = requestAnimationFrame(() => { q = 0; if (this.cur && this.cur === document.activeElement) this.place(); else this.to(null); }); };
    document.addEventListener('scroll', follow, true); addEventListener('resize', follow);
  },
  to(c) { this.cur = c; if (!c) { this.el.classList.remove('on'); return; } this.place(); this.el.classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => { if (this.cur === c) this.place(); })); },
  place() {
    const c = this.cur; if (!c || !c.isConnected) return this.to(null);
    const t = c.querySelector('.poster') || c, b = t.getBoundingClientRect(), pad = c.classList.contains('ch-card') ? 0 : 5;
    const w = Math.round(b.width + pad * 2), hh = Math.round(b.height + pad * 2);
    if (this._w !== w || this._h !== hh) { this.el.style.width = w + 'px'; this.el.style.height = hh + 'px'; this._w = w; this._h = hh; }
    this.el.style.transform = `translate3d(${Math.round(b.left - pad)}px, ${Math.round(b.top - pad)}px, 0)`;
  }
};
const App = {
  data: null, idx: null, section: 'movies', cat: 'all', q: '', showHidden: false, refreshing: false, catsBySec: {},
  account: null, provider: null,

  async start() {
    Recorder.init();
    const CapApp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (CapApp && CapApp.addListener) {
      let lastBack = 0;
      CapApp.addListener('backButton', () => {
        if (this.handleBack()) return;
        if (Date.now() - lastBack < 2000) CapApp.exitApp(); else { lastBack = Date.now(); UI.toast(t('exitHint')); }
      });
    }
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
    FocusRing.el || FocusRing.init(); OkHold.init();
    Clock.detect().catch(() => {});
    await this.loadCatalog();
    if (window.TvHome && TvHome.enabled()) TvHome.open();
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
    // the big-screen mode is always dark, also in the pages it opens (settings, player lists …)
    const light = Settings.get('homeView') !== 'tv' && (mode === 'light' || (mode === 'auto' && mq && mq.matches));
    document.body.classList.toggle('light', light);
    const meta = $('meta[name=theme-color]'); if (meta) meta.content = light ? '#f3f5fa' : '#0a0f1e';
    $$('.theme-btn').forEach(tb => { tb.innerHTML = ic(light ? 'moon' : 'sun'); });
    if (mq && !this._mqBound) { this._mqBound = true; (mq.addEventListener ? mq.addEventListener('change', () => this.applyTheme()) : mq.addListener(() => this.applyTheme())); }
    const tv = Settings.get('tvMode'); document.body.classList.toggle('tv', tv === 'on' || (tv === 'auto' && (isTV() || LS.get('tvSeen', false)))); document.body.classList.toggle('pst-overlay', Settings.get('posterStyle') === 'overlay'); document.body.classList.toggle('hv-tv', Settings.get('homeView') === 'tv'); this.applyScale(); if (document.body.classList.contains('tv')) TvKeyboard.watch(); TvKeyboard._mo && TvKeyboard.guard();
  },

  /* ---------- welcome / add subscription ---------- */
  welcome() {
    document.body.innerHTML = ''; Player.el = null; Player.init();
    const card = h('div', { class: 'welcome' }, h('img', { class: 'logo-hero', src: 'icons/icon-512.png', alt: 'DOOM' }), h('h1', {}, t('welcome')), h('p', { class: 'muted' }, t('welcomeSub')), this.playlistForm(),
      h('div', { class: 'or' }, h('span', {}, LANG === 'ar' ? 'أو' : 'or')),
      h('button', { class: 'btn wide free-start', onclick: () => { LS.set('freeOnly', true); this.startFreeOnly(); } }, h('span', { html: ic('globe') }), t('freeNoSub')));
    document.body.appendChild(h('div', { class: 'welcome-wrap' }, card));
    if (document.body.classList.contains('tv')) setTimeout(() => this.ensureFocus(), 60);
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
    const phone = existing ? null : h('button', { type: 'button', class: 'btn wide phone-btn', onclick: () => PhonePair.open() }, '📱 ' + t('fromPhone'));
    f.append(...[phone, tabs, fields, err, btn].filter(Boolean)); draw();
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
        <div class="brand"><img class="logo-img" src="icons/logo-128.png" alt=""><b>DOOM</b><button class="icon-btn only-mobile theme-btn side-theme" data-act="theme" aria-label="${t('themeMode')}">${ic(document.body.classList.contains('light') ? 'moon' : 'sun')}</button><button class="icon-btn only-mobile" data-act="closeSide" aria-label="close">${ic('close')}</button></div>
        <div class="seg main-seg">
          <button class="seg-btn" data-sec="movies">${t('movies')}</button><button class="seg-btn" data-sec="series">${t('series')}</button><button class="seg-btn" data-sec="live">${t('live')}</button>
        </div>
        <nav class="nav">
          <button class="nav-item" data-sec="continue">${ic('history')}<span>${t('continue')}</span></button>
          <button class="nav-item" data-sec="favorites"><span class="fav-ic">${HEART}</span><span>${t('favorites')}</span></button>
          <div class="nav-tools">
          <button class="nav-item tool" data-sec="free" title="${t('free')}">${ic('globe')}<span>${t('free')}</span></button>
          <button class="nav-item tool" data-sec="downloads" title="${t('downloads')}">${ic('download')}<span>${t('downloads')}</span><em class="dl-count"></em></button>
          <button class="nav-item tool" data-sec="recordings" title="${t('recordings')}">${ic('rec')}<span>${t('recordings')}</span><em class="rec-count"></em></button>
          <button class="nav-item tool" data-sec="multiview" title="${t('multiview')}">${ic('mv')}<span>${t('multiview')}</span></button>
          <button class="nav-item tool" data-sec="speed" title="${t('speedTest')}">${ic('speed')}<span>${t('speedTest')}</span></button>
          <button class="nav-item tool" data-sec="settings" title="${t('settings')}">${ic('settings')}<span>${t('settings')}</span></button>
          </div>
        </nav>
        <div class="cats-label">${t('categories')}</div>
        <div class="cats"></div>
        <div class="side-foot"><div class="exp-banner"></div><button class="lib-upd" data-act="refresh"><span class="lib-ic">${ic('refresh')}</span><span class="lib-txt"><b>${t('refreshLib')}</b><small class="lib-ago"></small></span></button><label class="switch-row"><span>${t('showHidden')} (<span class="hid-n">0</span>)</span><input type="checkbox" class="switch hid-toggle"></label></div>
      </aside>
      <div class="scrim"></div>
      <main class="main">
        <header class="topbar">
          <button class="icon-btn home-btn" data-act="home" aria-label="${t('home')}" title="${t('home')}">${ic('home')}</button>
          <button class="icon-btn back-btn hidden" data-act="back" aria-label="${t('back')}" title="${t('back')}">${ic('chevLeft')}</button>
          <button class="icon-btn side-toggle" aria-label="menu"><span class="desk-ic">${ic('menu')}</span><span class="mob-ic">${ic('burger')}</span></button>
          <h2 class="top-title"></h2>
          <div class="top-tools">
            <span class="upd hidden"><span class="spinner sm"></span></span>
            <button class="icon-btn theme-btn" data-act="theme" title="${t('themeMode')}">${ic(document.body.classList.contains('light') ? 'moon' : 'sun')}</button>
            <button class="icon-btn" data-act="refresh" title="${t('refresh')}">${ic('refresh')}</button>
            <label class="pill-select" title="Sort">${ic('sort')}<select class="sort-sel">
              <option value="default">${t('sortDefault')}</option><option value="added">${t('sortAdded')}</option><option value="az">${t('sortAZ')}</option><option value="za">${t('sortZA')}</option><option value="rating">${t('sortRating')}</option><option value="year">${t('sortYear')}</option></select></label>
            <button class="pill-select add-sub-btn hidden" data-act="addSub">${ic('plus')}<span>${t('addSub').replace('+ ', '')}</span></button>
            <label class="pill-select sub-pill" title="${t('subscriptions')}">${ic('user')}<select class="sub-sel"></select>${ic('chevUpDown')}</label>
            <div class="search">${ic('search')}<input type="search" class="search-in" placeholder="${t('search')}" autocomplete="off"><button class="sf-btn" data-act="sfilters" title="${t('searchFilters')}">${ic('funnel')}<i class="sf-dot hidden"></i></button></div>
          </div>
        </header>
        <section class="content" tabindex="-1"></section>
      </main>`;
    document.body.appendChild(shell);
    this.el = shell; this.content = $('.content', shell);
    shell.addEventListener('click', e => {
      const s = e.target.closest('[data-sec]'); if (s) { this.go(s.dataset.sec); return; }
      const a = e.target.closest('[data-act]'); if (!a) return;
      if (a.dataset.act === 'refresh') {
        if (this.section === 'free') { const u = $('.upd', this.el); u.classList.remove('hidden'); FreeCat.load(true).then(() => { u.classList.add('hidden'); this.render(); UI.toast(t('updatedOk')); }); }
        else this.refreshLibrary();
      }
      if (a.dataset.act === 'back') this.goBack();
      if (a.dataset.act === 'sfilters') this.searchFilters();
      if (a.dataset.act === 'home' && window.TvHome) TvHome.open();
      if (a.dataset.act === 'addSub') this.addSubscription();
      if (a.dataset.act === 'theme') { Settings.set('theme', document.body.classList.contains('light') ? 'dark' : 'light'); this.applyTheme(); }
      if (a.dataset.act === 'closeSide') document.body.classList.remove('side-open');
    });
    $('.side-toggle', shell).addEventListener('click', () => { if (innerWidth < 900) document.body.classList.toggle('side-open'); else document.body.classList.toggle('side-collapsed'); });
    $('.scrim', shell).addEventListener('click', () => document.body.classList.remove('side-open'));
    const sortSel = $('.sort-sel', shell); sortSel.value = Settings.get('sort') || 'default';
    sortSel.addEventListener('change', () => { Settings.set('sort', sortSel.value); this.render(); });
    $('.hid-toggle', shell).addEventListener('change', e => { this.showHidden = e.target.checked; this.renderCats(); this.render(); });
    const si = $('.search-in', shell);
    const runSearch = () => { const q = si.value.trim(); if (q === this.q) return; this.q = q; this.render(); this.content.scrollTop = 0; };
    const soon = debounce(runSearch, 180);
    ['input', 'compositionend', 'keyup', 'change', 'search'].forEach(ev => si.addEventListener(ev, e => { if (e.key === 'Enter') { si.blur(); runSearch(); } else soon(); }));
    $('.sub-sel', shell).addEventListener('change', e => {
      const v = e.target.value; if (v === '__add') { this.updateSubSelect(); return this.addSubscription(); }
      if (v === '__merged') Playlists.setMerged(); else Playlists.setActive(v);
      this.cat = 'all'; this.loadCatalog();
    });
    Downloads.listeners.add(() => { this.updateBadges(); if (this.section === 'downloads') this.renderDownloads(true); });
    Recorder.listeners.add(() => { this.updateBadges(); if (this.section === 'recordings') this.renderRecordings(true); });
    this.updateSubSelect();
    this.updSfDot();
  },
  updateSubSelect() {
    const sel = $('.sub-sel', this.el); if (!sel) return; const all = Playlists.all();
    // no subscription yet: a plain button (a list with a single choice can't be "changed")
    $('.sub-pill', this.el).classList.toggle('hidden', !all.length); $('.add-sub-btn', this.el).classList.toggle('hidden', !!all.length);
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
  /* manual "refresh library": fetch everything again, keep the saved copy of any subscription that fails, report what is new */
  async refreshLibrary() {
    if (this.refreshing || !Playlists.inScope().length) return;
    this.refreshing = true; this.updLib(); $('.upd', this.el) && $('.upd', this.el).classList.remove('hidden');
    const before = {}; for (const sec of ['movies', 'series', 'live']) before[sec] = new Set(this.idx && this.idx[sec] ? this.idx[sec].keys() : []);
    const res = await Promise.all(Playlists.inScope().map(p => Catalog.load(p, true).then(r => ({ p, r }))
      .catch(e => Catalog.load(p, false).then(r => ({ p, r, failed: e })).catch(() => ({ p, failed: e })))));
    const ok = res.filter(x => x.r);
    res.filter(x => x.failed).forEach(x => UI.toast(t('libFailed', { name: x.p.name })));
    if (ok.length) {
      this.setData(Catalog.merge(ok.map(x => x.r.data)), Math.min(...ok.map(x => x.failed ? x.r.ts : Date.now())));
      const nw = {}; for (const sec of ['movies', 'series', 'live']) { nw[sec] = 0; for (const k of this.idx[sec].keys()) if (!before[sec].has(k)) nw[sec]++; }
      const first = !before.movies.size && !before.series.size && !before.live.size;
      const parts = [nw.movies && this.count(nw.movies, 'nMovies'), nw.series && this.count(nw.series, 'nSeries'), nw.live && this.count(nw.live, 'nChannels')].filter(Boolean);
      if (res.some(x => !x.failed)) UI.toast('✓ ' + t('libUpdated') + (first ? '' : ' — ' + (parts.length ? t('libNew', { list: parts.join(' · ') }) : t('libNothingNew'))));
      this.renderCats(); if (!Player.open_ && !UI.top()) this.render();
    }
    this.refreshing = false; $('.upd', this.el) && $('.upd', this.el).classList.add('hidden'); this.updLib();
  },
  /* Arabic counts: 1 ساعة · 2 ساعتين · 3–10 ساعات · 11+ ساعة */
  count(n, key) {
    if (LANG !== 'ar') return t(key, { n });
    const w = { min: ['دقيقة', 'دقيقتين', 'دقائق'], hr: ['ساعة', 'ساعتين', 'ساعات'], day: ['يوم', 'يومين', 'أيام'], mov: ['فيلم', 'فيلمين', 'أفلام'], ser: ['مسلسل', 'مسلسلين', 'مسلسلات'], ch: ['قناة', 'قناتين', 'قنوات'] }[key.replace(/Ago$|^n/, '').toLowerCase().replace('movies', 'mov').replace('series', 'ser').replace('channels', 'ch')];
    if (!w) return t(key, { n });
    const s = n === 1 ? w[0] : n === 2 ? w[1] : n <= 10 ? n + ' ' + w[2] : n + ' ' + w[0];
    return /Ago$/.test(key) ? 'منذ ' + s : s;
  },
  ago(ts) {
    const m = Math.max(0, Math.round((Date.now() - ts) / 60000));
    return m < 1 ? t('justNow') : m < 60 ? this.count(m, 'minAgo') : m < 60 * 24 ? this.count(Math.round(m / 60), 'hrAgo') : this.count(Math.round(m / 1440), 'dayAgo');
  },
  updLib() {
    const b = this.el && $('.lib-upd', this.el); if (!b) return;
    b.classList.toggle('busy', !!this.refreshing);
    $('.lib-txt b', b).textContent = this.refreshing ? t('refreshingLib') : t('refreshLib');
    $('.lib-ago', b).textContent = this.dataTs && !this.refreshing ? t('libAgo', { t: this.ago(this.dataTs) }) : '';
    b.title = this.dataTs ? t('updated') + ': ' + new Date(this.dataTs).toLocaleString() : '';
    clearTimeout(this._libT); this._libT = setTimeout(() => this.updLib(), 60000);
  },
  setData(data, ts) {
    for (const sec of ['movies', 'series', 'live']) { // adult content never reaches the interface
      const bad = new Set(data[sec].cats.filter(c => ADULT_RX.test(c.name || '')).map(c => c.id));
      data[sec] = { cats: data[sec].cats.filter(c => !bad.has(c.id)), items: data[sec].items.filter(it => !bad.has(it.cat) && !ADULT_RX.test(it.name || '')) };
    }
    this.data = data; this.dataTs = ts; this._sm = null; setTimeout(() => { this.updLib(); window.TvHome && TvHome.refresh(); this.prepSearch(); }, 0); this.idx = {}; this.catsBySec = {}; this._memo = new Map(); this.dataVer = (this.dataVer || 0) + 1;
    for (const sec of ['movies', 'series', 'live']) {
      const m = new Map(); const counts = {};
      for (const it of data[sec].items) { it._q = null; it._n = (it.name || '').toLowerCase().replace(/^\s*(hq|4k|fhd|uhd|hd|sd|vip)\s*[|:-]\s*/, '').trim(); m.set((it.pl || '') + ':' + it.id, it); counts[it.cat] = (counts[it.cat] || 0) + 1; }
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
  isRoot() { return LS.get('freeOnly', false) ? false : ['movies', 'series', 'live'].includes(this.section); },
  updateBackBtn() { const b = this.el && $('.back-btn', this.el); if (b) b.classList.toggle('hidden', this.isRoot()); },
  /* one step back: other page -> main browse page; free-only mode -> back to the start screen. Returns false at the top level. */
  goBack() {
    if (this.q) { this.q = ''; const si = $('.search-in', this.el); if (si) si.value = ''; this.render(); return true; }
    if (LS.get('freeOnly', false) && !Playlists.all().length) {
      if (this.section !== 'free') { this.go('free'); return true; }
      LS.del('freeOnly'); document.body.classList.remove('free-only'); this.welcome(); return true;
    }
    if (window.TvHome && TvHome.open_) return TvHome.back();
    if (this.isRoot()) { if (window.TvHome && TvHome.enabled()) { TvHome.open(); return true; } return false; }
    this.go(Settings.get('lastSection') || 'movies'); return true;
  },
  /* Android back button / remote Back / Esc */
  handleBack() {
    const ctx = $('.ctx'); if (ctx) { ctx.remove(); return true; }
    const m = UI.top(); if (m) { m.close(); return true; }
    if (Player.open_) { Player.onKey({ key: 'Escape', keyCode: 27, target: document.body, preventDefault() {} }); return true; }
    if (document.body.classList.contains('side-open')) { document.body.classList.remove('side-open'); return true; }
    if (!this.el || !document.body.contains(this.el)) return false; // start screen
    return this.goBack();
  },
  go(sec) {
    if (this.section === 'multiview' && sec !== 'multiview') MultiView.stopAll();
    if (this.section === 'speed' && sec !== 'speed') SpeedTest.stop();
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
    if (Parental.d.enabled && this.showHidden) this.showHidden = false;
    document.body.classList.toggle('parental-on', !!Parental.d.enabled);
    $('.hid-toggle', this.el).checked = this.showHidden;
  },
  setTitle(s) { $('.top-title', this.el).textContent = s; document.title = s + ' — DOOM'; },

  render() {
    this.updateBackBtn && this.updateBackBtn();
    if (document.body.classList.contains('tv')) setTimeout(() => this.ensureFocus(), 60);
    if (!this.el || (!this.data && this.section !== 'free')) return;
    if (this.section === 'free') { this.el.dataset.section = 'free'; return FreePage.render(this); }
    if (this.q && fold(this.q).length >= 2) return this.renderSearch();
    this.el.dataset.section = this.section;
    switch (this.section) {
      case 'movies': case 'series': case 'live': return this.renderBrowse();
      case 'continue': return this.renderContinue();
      case 'favorites': return this.renderFavorites();
      case 'downloads': return this.renderDownloads();
      case 'recordings': return this.renderRecordings();
      case 'multiview': return MultiView.render(this.content);
      case 'settings': return this.renderSettings();
      case 'speed': return SpeedPage.render(this);
    }
  },

  filterItems(sec, items) {
    const block = new Set(this.showHidden ? [] : Hidden.set(sec));
    if (Parental.d.enabled) for (const c of this.data[sec].cats) if (!Parental.catAllowed(sec, c)) block.add(c.id);
    const hidItems = this.showHidden ? null : Hidden.itemSet(sec);
    if (hidItems && hidItems.size) return items.filter(it => !block.has(it.cat) && !hidItems.has(keyOf(it)));
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
  /* search key of a title: folded name first, then its tags (HQ | AR | 4K …) so the name decides "starts with" */
  skey(it) {
    if (it._q) return it._q;
    let n = it.name || '', tags = '';
    n = n.replace(/^\s*((\[[^\]]{1,12}\]|[A-Za-z0-9+]{1,6})\s*[|:\-–]\s*)+/, m => { tags = m; return ''; });
    return (it._q = ' ' + fold(n) + ' ' + fold(tags) + ' ');
  },
  /* Arabic & English search: whole phrase > start of title > start of a word (also after «ال») > anywhere >
     all words in any order > without spaces > one typo per word. Ties keep the chosen sort order. */
  search(items, q) {
    const fq = fold(q); if (!fq) return [];
    const toks = fq.split(' '), compact = fq.replace(/ /g, ''), res = [];
    // still typing the same word (fam → fami → famil): look only inside the previous matches
    const memo = this._sm || (this._sm = new WeakMap()), last = memo.get(items);
    const pool = last && last.fq.length >= 2 && fq.startsWith(last.fq) ? last.hit : items;
    for (const it of pool) {
      const s = this.skey(it); let sc = -1;
      if (s.startsWith(' ' + fq + ' ')) sc = s.trim() === fq ? 0 : 1;
      else if (s.startsWith(' ' + fq)) sc = 1.5;
      else if (s.includes(' ' + fq) || s.includes(' ال' + fq)) sc = 2;
      else if (s.includes(fq)) sc = 3;
      else if (toks.length > 1 && toks.every(tk => s.includes(tk))) sc = toks.every(tk => s.includes(' ' + tk) || s.includes(' ال' + tk)) ? 3.5 : 4;
      else if (compact.length > 3 && (it._qc || (it._qc = s.replace(/ /g, ''))).includes(compact)) sc = 5;
      if (sc >= 0) res.push([sc, it]);
    }
    memo.set(items, { fq, hit: res.map(r => r[1]) });
    if (res.length < 4 && fq.length >= 4) {   // typo-tolerant pass (one mistake per word, two for long words)
      const got = new Set(res.map(r => r[1]));
      const near = (a, b, max) => { if (Math.abs(a.length - b.length) > max) return false; let prev = Array.from({ length: b.length + 1 }, (_, j) => j); for (let i = 1; i <= a.length; i++) { const cur = [i]; let best = i; for (let j = 1; j <= b.length; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); best = Math.min(best, cur[j]); } if (best > max) return false; prev = cur; } return prev[b.length] <= max; };
      // cheap check first: a word within reach of the typed one shares its first or second letter
      const could = (tk, w) => w[0] === tk[0] || w[1] === tk[1] || w[0] === tk[1] || w[1] === tk[0];
      const wordOk = (tk, words) => tk.length < 4 ? words.some(w => w.startsWith(tk)) : words.some(w => {
        if (w.startsWith('ال') && w.length > 3 && could(tk, w.slice(2))) { const m = tk.length >= 8 ? 2 : 1; if (near(tk, w.slice(2), m) || (w.length - 2 > tk.length && near(tk, w.slice(2, 2 + tk.length), m))) return true; }
        if (!could(tk, w)) return false; const m = tk.length >= 8 ? 2 : 1;
        return near(tk, w, m) || (w.length > tk.length && near(tk, w.slice(0, tk.length), m));
      });
      for (const it of items) { if (got.has(it)) continue; const words = it._qw || (it._qw = this.skey(it).trim().split(' ')); if (toks.every(tk => wordOk(tk, words))) res.push([6, it]); }
    }
    return res.sort((a, b) => a[0] - b[0]).map(r => r[1]);   // Array.sort is stable: same score keeps the list order
  },
  /* prepare search text for the whole library in the background (small slices while the app is idle) */
  prepSearch() {
    if (!this.data) return; const all = [...(this.data.movies || { items: [] }).items, ...(this.data.series || { items: [] }).items, ...(this.data.live || { items: [] }).items];
    let i = 0; const idle = window.requestIdleCallback || (f => setTimeout(() => f({ timeRemaining: () => 8 }), 30));
    const step = dl => { const end = performance.now() + Math.min(12, dl.timeRemaining()); while (i < all.length && performance.now() < end) { const it = all[i++]; this.skey(it); } if (i < all.length) idle(step, { timeout: 500 }); };
    idle(step, { timeout: 500 });
  },

  /* search filters: where to search (this section / everything), content type, category, order of results */
  sf() { return this._sf || (this._sf = Object.assign({ scope: 'here', type: 'all', cat: 'all', sort: 'best' }, LS.get('searchFilters', {}))); },
  setSf(v) { this._sf = Object.assign(this.sf(), v); LS.set('searchFilters', this._sf); this.updSfDot(); },
  updSfDot() { const d = this.el && $('.sf-dot', this.el); if (d) { const f = this.sf(); d.classList.toggle('hidden', f.type === 'all' && f.cat === 'all' && f.sort === 'best'); } },
  /* which sections (and category) a search looks in */
  searchPlan() {
    const f = this.sf(), here = ['movies', 'series', 'live'].includes(this.section) ? this.section : null;
    if (f.scope === 'here' && here) return { secs: [here], cat: f.type === here ? f.cat : 'all', label: t(here) };
    if (f.type !== 'all') return { secs: [f.type], cat: f.cat, label: t(f.type) };
    return { secs: ['movies', 'series', 'live'], cat: 'all', label: t('everything') };
  },
  sortResults(items, how) {
    if (how === 'best') return items;
    const a = items.slice();
    if (how === 'added') a.sort((x, y) => (y.added || 0) - (x.added || 0));
    else if (how === 'az') a.sort((x, y) => (x._n < y._n ? -1 : x._n > y._n ? 1 : 0));
    else if (how === 'year') a.sort((x, y) => (+y.year || 0) - (+x.year || 0));
    else if (how === 'rating') a.sort((x, y) => (+y.rating || 0) - (+x.rating || 0));
    return a;
  },
  searchFilters() {
    const f = Object.assign({}, this.sf());
    const body = h('div', { class: 'stack sfm' });
    const selBox = (label, opts, val, on) => { const s = h('select', { class: 'input' }, opts.map(([v, l]) => h('option', { value: v, selected: v === val }, l))); s.addEventListener('change', () => on(s.value)); return h('label', { class: 'field' }, h('span', {}, label), s); };
    const draw = () => {
      body.innerHTML = '';
      body.appendChild(h('div', { class: 'seg sf-scope' },
        h('button', { class: 'seg-btn' + (f.scope === 'here' ? ' on' : ''), onclick: () => { f.scope = 'here'; draw(); } }, t('searchHere')),
        h('button', { class: 'seg-btn' + (f.scope === 'all' ? ' on' : ''), onclick: () => { f.scope = 'all'; draw(); } }, t('searchAll'))));
      body.appendChild(selBox(t('contentType'), [['all', t('all')], ['movies', t('movies')], ['series', t('series')], ['live', t('live')]], f.type, v => { f.type = v; f.cat = 'all'; if (v !== 'all') f.scope = 'all'; draw(); }));
      const cats = f.type !== 'all' && this.data ? this.visibleCats(f.type) : [];
      const cs = selBox(t('category'), [['all', t('allCats')], ...cats.map(c => [c.id, c.name])], f.cat, v => { f.cat = v; });
      if (f.type === 'all') { $('select', cs).disabled = true; }
      body.appendChild(cs);
      body.appendChild(selBox(t('sortResults'), [['best', t('sortBest')], ['added', t('sortAdded')], ['az', t('sortAZ')], ['year', t('sortYear')], ['rating', t('sortRating')]], f.sort, v => { f.sort = v; }));
      if (f.type === 'all') body.appendChild(h('p', { class: 'muted small' }, t('pickTypeForCat')));
      body.appendChild(h('div', { class: 'row gap sf-acts' },
        h('button', { class: 'btn', onclick: () => { Object.assign(f, { scope: 'here', type: 'all', cat: 'all', sort: 'best' }); draw(); } }, t('reset')),
        h('button', { class: 'btn primary', onclick: () => { this.setSf(f); m.close(); if (this.q) this.render(); else { const si = $('.search-in', this.el); si && si.focus(); } } }, t('apply')),
        h('button', { class: 'btn', onclick: () => m.close() }, t('back'))));
    };
    draw();
    const m = UI.modal(t('searchFilters'), body);
  },
  renderSearch() {
    const plan = this.searchPlan(), f = this.sf();
    this.setTitle(t('results') + ': “' + this.q + '”'); this.content.innerHTML = ''; let any = false;
    const here = ['movies', 'series', 'live'].includes(this.section) ? this.section : null;
    // quick switches above the results: this section / everything / filters
    this.content.appendChild(h('div', { class: 'sf-bar' },
      here ? h('button', { class: 'chip-btn' + (f.scope === 'here' ? ' on' : ''), onclick: () => { this.setSf({ scope: 'here' }); this.render(); } }, t('searchIn', { s: t(here) })) : null,
      h('button', { class: 'chip-btn' + (f.scope === 'all' || !here ? ' on' : ''), onclick: () => { this.setSf({ scope: 'all' }); this.render(); } }, t('searchAll')),
      h('button', { class: 'chip-btn', onclick: () => this.searchFilters() }, h('span', { html: ic('funnel') }), t('filters')),
      h('span', { class: 'muted small sf-where' }, plan.label + (plan.cat !== 'all' ? ' › ' + ((this.data[plan.secs[0]].cats.find(c => c.id === plan.cat) || {}).name || '') : ''))));
    for (const sec of plan.secs) {
      const q = this.q; const items = this.sortResults(this.search(this.listFor(sec, plan.cat), q), f.sort);
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
        h('button', { class: 'fav-btn' + (Lists.has('fav', it) ? ' on' : ''), tabindex: -1, 'aria-label': t('favorites'), html: HEART }),
        this.marks(it),
        Downloads.isDone(it) ? h('span', { class: 'badge' }, '⬇') : null,
        opts.sub ? h('span', { class: 'badge left' }, opts.sub) : null,
        pr && pr.pos && pr.dur ? h('div', { class: 'prog' }, h('i', { style: { width: Math.min(100, pr.pos / pr.dur * 100) + '%' } })) : null,
        pr && pr.done ? h('span', { class: 'badge ok', html: ic('check') }) : null),
      h('div', { class: 'c-title' }, opts.title || it.name),
      h('div', { class: 'c-meta' }, it.year ? h('span', {}, it.year) : null, it.rating ? h('span', { class: 'rate', html: ic('star') + ' ' + it.rating.toFixed(1) }) : null,
        Playlists.mode() === 'merged' && it.alts ? h('span', { class: 'chip sm' }, '×' + (it.alts.length + 1)) : null));
    const open = () => (opts.onOpen || (() => this.openItem(it)))();
    card.addEventListener('click', e => {
      if (e.target.closest('.fav-btn')) { e.stopPropagation(); this.toggleFav(it, card); return; }
      if (card._lp) { card._lp = false; return; }
      open();
    });
    this.bindPress(card, it, open, opts);
    return card;
  },
  /* red heart = main favourites, yellow star with its number = a custom list */
  marks(it) {
    const m = Lists.mark(it); const box = h('div', { class: 'marks' });
    if (m) {
      if (m.fav) box.appendChild(h('span', { class: 'mk heart', html: HEART }));
      m.nums.slice().sort((a, b) => a - b).slice(0, 4).forEach(n => box.appendChild(h('span', { class: 'mk star' }, h('b', {}, String(n)))));
    }
    if (Hidden.isItem(it)) box.appendChild(h('span', { class: 'mk hid', html: ic('eyeOff') }));
    return box;
  },
  refreshMarks(card, it) {
    if (!card) return; const old = $('.marks', card); if (old) old.replaceWith(this.marks(it));
    const f = $('.fav-btn', card); if (f) f.classList.toggle('on', Lists.has('fav', it));
  },
  toggleFav(it, card) {
    const on = Lists.toggle('fav', it); this.refreshMarks(card, it);
    UI.toast((on ? t('addedTo') : t('removedFrom')) + ' ' + Lists.name(Lists.data.find(l => l.id === 'fav')));
    if (this.section === 'favorites') this.renderFavorites();
  },
  /* long-press menu: every list (tick to add/remove) + hide/show this title */
  itemSheet(it, card) {
    const body = h('div', { class: 'stack sheet' });
    const draw = () => {
      body.innerHTML = '';
      for (const l of Lists.data) {
        const on = Lists.has(l.id, it);
        body.appendChild(h('button', { class: 'list-opt' + (on ? ' on' : ''), onclick: () => { const added = Lists.toggle(l.id, it); UI.toast((added ? t('addedTo') : t('removedFrom')) + ' ' + Lists.name(l)); this.refreshMarks(card, it); draw(); if (this.section === 'favorites') this.renderFavorites(); $$('.list-opt', body)[Lists.data.indexOf(l)]?.focus(); } },
          l.id === 'fav' ? h('span', { class: 'mk heart inl', html: HEART }) : h('span', { class: 'mk star inl' }, h('b', {}, String(l.num))),
          h('span', { class: 'grow' }, l.id === 'fav' ? (l.name || t('favDefault')) : l.name), h('span', { class: 'tick', html: on ? ic('check') : '' })));
      }
      body.appendChild(h('button', { class: 'list-opt ghost', onclick: async () => { const n = await UI.prompt(t('newList'), t('listName')); if (n) { const l = Lists.create(n); Lists.toggle(l.id, it); this.refreshMarks(card, it); UI.toast(t('addedTo') + ' ' + Lists.name(l)); draw(); } } }, h('span', { html: ic('plus') }), h('span', { class: 'grow' }, t('newList'))));
      const hid = Hidden.isItem(it);
      body.appendChild(h('div', { class: 'sheet-sep' }));
      body.appendChild(h('button', { class: 'list-opt', onclick: () => { const now = Hidden.toggleItem(it); UI.top() && UI.top().close(); UI.toast(now ? t('itemHidden') : t('itemShown')); this.renderCats(); this.render(); } },
        h('span', { html: ic(hid ? 'eye' : 'eyeOff') }), h('span', { class: 'grow' }, hid ? t('showItem') : t('hideItem'))));
    };
    draw();
    UI.modal(it.seriesName ? it.seriesName + ' ' + t('sShort') + it.season + t('epShort') + it.episode : it.name, body);
  },
  /* OK / tap opens; holding OK on the remote, or a long press on the screen, opens "add to list" straight away */
  bindPress(card, it, open, opts) {
    const lists = () => { card._lp = true; try { navigator.vibrate && navigator.vibrate(25); } catch {} if (Settings.get('longPress') === 'fav') this.toggleFav(it, card); else this.itemSheet(it, card); };
    // the remote's OK key is handled by OkHold (one physical press = one action, whatever gets focus meanwhile)
    card._press = { open, long: () => { try { navigator.vibrate && navigator.vibrate(25); } catch {} if (Settings.get('longPress') === 'fav') this.toggleFav(it, card); else this.itemSheet(it, card); } };
    let pt = null, sx = 0, sy = 0, touchAt = 0;
    card.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse') return; touchAt = Date.now(); sx = e.clientX; sy = e.clientY; card._lp = false;
      clearTimeout(pt); pt = setTimeout(lists, 520);
    });
    const cancel = () => clearTimeout(pt);
    card.addEventListener('pointermove', e => { if (Math.hypot(e.clientX - sx, e.clientY - sy) > 12) cancel(); });
    card.addEventListener('pointerup', cancel); card.addEventListener('pointercancel', cancel);
    card.addEventListener('touchend', e => { if (card._lp) e.preventDefault(); }, { passive: false });   // the lifted finger must not tap the list that just opened
    card.addEventListener('contextmenu', e => { e.preventDefault(); if (Date.now() - touchAt < 1500) return; this.itemMenu(card, it, opts); });  // right-click on PC keeps the full menu
  },
  channelCard(it, list, opts = {}) {
    const card = h('div', { class: 'ch-card', tabindex: 0, role: 'button', 'aria-label': it.name },
      h('div', { class: 'ch-logo' }, this.imgEl(it.img, it.name, 'contain')),
      h('div', { class: 'ch-info' }, h('div', { class: 'ch-name' }, (it.num ? it.num + '. ' : '') + it.name),
        h('div', { class: 'ch-meta' }, it.archive ? h('span', { class: 'chip sm' }, '⏪ ' + t('catchup')) : null, Recorder.isRecording(it) ? h('span', { class: 'chip sm red' }, '● REC') : null)),
      this.marks(it),
      h('button', { class: 'fav-btn' + (Lists.has('fav', it) ? ' on' : ''), tabindex: -1, html: HEART }));
    const open = () => opts.onOpen ? opts.onOpen() : this.playLive(it, list);
    card.addEventListener('click', e => {
      if (e.target.closest('.fav-btn')) { e.stopPropagation(); this.toggleFav(it, card); return; }
      if (card._lp) { card._lp = false; return; }
      open();
    });
    this.bindPress(card, it, open, opts);
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
    if ((it.type === 'movie' || it.type === 'series') && window.TvDetail && TvDetail.open(it)) return;
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
    // start the episode immediately (the season list can take a while on big servers) and attach next/previous when it arrives
    const series = this.findItem('series', ep.seriesId, ep.pl) || { id: ep.seriesId, pl: ep.pl, name: ep.seriesName, img: ep.img };
    Player.open(ep, null);
    try {
      const info = await provOf(series).seriesInfo(series.id, series);
      const list = this.episodesFlat(info, series); const index = list.findIndex(x => x.id === ep.id);
      if (index >= 0 && Player.open_ && Player.item && keyOf(Player.item) === keyOf(ep)) Player.setCtx({ list, index });
    } catch {}
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
  onPlayerClosed() { if (window.TvHome && TvHome.open_ && TvHome.view && TvHome.view.mode === 'detail') TvDetail.refresh(); if (['continue', 'movies', 'series', 'favorites', 'live'].includes(this.section) && !this.q) { const st = this.content.scrollTop; this.render(); this.content.scrollTop = st; } },

  /* ---------- favorites & custom lists ---------- */
  /* the playable version of a list entry (fresh data from the catalogue when available) */
  listPlayable(it) {
    if (it.type === 'episode') return Object.assign({}, it, { img: it.img || it.seriesImg });
    return this.findItem(it.type, it.id, it.pl) || (it.pl === FREE_ID ? FreeCat.live.find(x => x.id === it.id) || it : it);
  },
  playFromList(list, startIdx, shuffle) {
    const entries = list.items.filter(it => it.type !== 'series' && this.itemAllowed(it));
    let queue = entries.map(it => this.listPlayable(it));
    let index = Math.max(0, startIdx == null ? 0 : entries.findIndex(x => keyOf(x) === keyOf(list.items[startIdx])));
    if (shuffle) { for (let i = queue.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [queue[i], queue[j]] = [queue[j], queue[i]]; } index = 0; }
    if (!queue.length) return;
    const it = queue[index]; const pr = it.type !== 'live' ? Progress.get(it) : null;
    Player.open(it, { list: queue, index, kind: 'list', name: Lists.name(list) }, it.type === 'live' ? {} : { startAt: pr && !pr.done ? pr.pos || 0 : 0 });
  },
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
    const visible = list.items.map((it, i) => ({ it, i })).filter(x => this.itemAllowed(x.it));
    if (!visible.length) return this.content.appendChild(this.empty());
    this.content.appendChild(h('div', { class: 'pl-actions' },
      h('button', { class: 'btn primary', onclick: () => this.playFromList(list, 0) }, h('span', { html: ic('play') }), t('playAll')),
      h('button', { class: 'btn', onclick: () => this.playFromList(list, 0, true) }, h('span', { html: ic('shuffle') }), t('shuffle')),
      h('span', { class: 'muted small' }, t('reorderHint'))));
    const box = h('div', { class: 'pl-list' }); this.content.appendChild(box);
    const typeLabel = { movie: t('movies'), series: t('series'), episode: t('episode'), live: t('live') };
    const renumber = () => $$('.pl-row', box).forEach((r, n) => { $('.pl-num', r).textContent = n + 1; });
    for (const { it, i } of visible) {
      const full = this.listPlayable(it); const pr = it.type !== 'live' && it.type !== 'series' ? Progress.get(it) : null;
      const title = it.type === 'episode' ? (it.seriesName || it.name) : it.name;
      const sub = it.type === 'episode' ? `${t('sShort')}${it.season} ${t('epShort')}${it.episode} · ${it.name}` : (typeLabel[it.type] || '') + (it.year ? ' · ' + it.year : '');
      const row = h('div', { class: 'pl-row', tabindex: 0, 'data-k': keyOf(it) },
        h('span', { class: 'pl-num' }, String(i + 1)),
        h('div', { class: 'pl-thumb' + (it.type === 'live' ? ' wide' : '') }, this.imgEl(full.img || it.img, title, it.type === 'live' ? 'contain' : ''), pr && pr.dur ? h('div', { class: 'prog' }, h('i', { style: { width: (pr.done ? 100 : pr.pos / pr.dur * 100) + '%' } })) : null),
        h('div', { class: 'pl-txt' }, h('div', { class: 'pl-title' }, title), h('div', { class: 'muted small' }, sub)),
        h('button', { class: 'icon-btn pl-more', title: '⋯', html: ic('dots') }),
        h('button', { class: 'icon-btn pl-grip', title: t('reorderHint'), 'aria-label': t('reorderHint'), html: ic('grip') }));
      const idxNow = () => list.items.findIndex(x => keyOf(x) === keyOf(it));
      const open = () => { if (it.type === 'series') return this.openItem(full); this.playFromList(list, idxNow()); };
      row.addEventListener('click', e => { if (e.target.closest('.pl-grip, .pl-more')) return; open(); });
      row.addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.target === row) { e.preventDefault(); open(); }
        if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); Lists.move(list.id, idxNow(), idxNow() + (e.key === 'ArrowUp' ? -1 : 1)); this.renderFavorites(); }
      });
      const menu = () => UI.ctxMenu($('.pl-more', row), [
        { icon: 'play', label: it.type === 'series' ? t('openDetails') : t('play'), run: open },
        { icon: 'chevUpDown', label: t('moveTop'), run: () => { Lists.move(list.id, idxNow(), 0); this.renderFavorites(); } },
        { icon: 'chevUpDown', label: t('moveUp'), run: () => { Lists.move(list.id, idxNow(), idxNow() - 1); this.renderFavorites(); } },
        { icon: 'chevUpDown', label: t('moveDown'), run: () => { Lists.move(list.id, idxNow(), idxNow() + 1); this.renderFavorites(); } },
        { icon: 'chevUpDown', label: t('moveBottom'), run: () => { Lists.move(list.id, idxNow(), list.items.length - 1); this.renderFavorites(); } },
        (it.type === 'movie' || it.type === 'episode') ? { icon: 'download', label: t('download'), run: () => Downloads.add(full) } : null,
        { icon: 'trash', danger: true, label: t('remove'), run: () => { Lists.toggle(list.id, it); this.renderFavorites(); } }]);
      $('.pl-more', row).addEventListener('click', e => { e.stopPropagation(); menu(); });
      row.addEventListener('contextmenu', e => { e.preventDefault(); menu(); });
      this.dragSort($('.pl-grip', row), row, box, () => { Lists.setOrder(list.id, $$('.pl-row', box).map(r => r.dataset.k)); renumber(); });
      box.appendChild(row);
    }
  },
  /* drag a row by its handle (touch or mouse), like reordering a YouTube playlist */
  dragSort(handle, row, box, done) {
    handle.addEventListener('pointerdown', e => {
      if (e.button > 0) return; e.preventDefault(); e.stopPropagation();
      row.classList.add('dragging'); box.classList.add('sorting');
      const sc = this.content; let lastY = e.clientY, raf = 0;
      const scroll = () => { const r = sc.getBoundingClientRect(); const edge = 70; const v = lastY < r.top + edge ? -12 : lastY > r.bottom - edge ? 12 : 0; if (v) { sc.scrollTop += v; place(lastX, lastY); } raf = requestAnimationFrame(scroll); };
      let lastX = e.clientX;
      const place = (x, y) => {
        const over = document.elementFromPoint(x, y); const target = over && over.closest('.pl-row');
        if (!target || target === row || target.parentNode !== box) return;
        const r = target.getBoundingClientRect(); box.insertBefore(row, y < r.top + r.height / 2 ? target : target.nextSibling);
      };
      // listen on the whole page: moving the row in the list would otherwise drop the finger's tracking
      const id = e.pointerId;
      const move = ev => { if (ev.pointerId !== id) return; ev.preventDefault(); lastX = ev.clientX; lastY = ev.clientY; place(ev.clientX, ev.clientY); };
      const up = ev => {
        if (ev.pointerId !== id) return;
        cancelAnimationFrame(raf); row.classList.remove('dragging'); box.classList.remove('sorting');
        window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); done();
      };
      window.addEventListener('pointermove', move, { passive: false }); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
      raf = requestAnimationFrame(scroll);
    });
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
    const draw = () => { res.innerHTML = ''; const s = q.value.trim(); (s ? this.search(chans, s) : chans).slice(0, 80).forEach(c => res.appendChild(h('button', { class: 'ps-item' + (picked === c ? ' active' : ''), onclick: () => { picked = c; lbl.textContent = c.name; draw(); } }, c.name))); };
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
      window.Exo && Exo.available() ? row(t('playerEngine'), sel('playerEngine', [['web', t('peWeb')], ['exo', t('peExo')]]), t('playerEngineHint')) : null,
      row(t('defaultAspect'), sel('aspect', ASPECTS.map(a => [a, t(a) !== a ? t(a) : a]))),
      row(t('defaultSpeed'), sel('speed', SPEEDS.map(s => [s, s + 'x']))),
      row(t('autoNextAll'), sw(Settings.get('autoNext'), v => Settings.set('autoNext', v))),
      row(t('nextLead'), sel('nextLead', [['0', t('nextLead0')], ['5', '5 ' + t('secs')], ['10', '10 ' + t('secs')], ['15', '15 ' + t('secs')]]), t('nextLeadHint')));

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
      row(t('trailers'), sel('trailers', [['all', t('trAll')], ['detail', t('trDetail')], ['off', t('trOff')]], () => { if (Settings.get('trailers') === 'off') Trailer.stop(); }), t('trailersHint')),
      row(t('homeView'), sel('homeView', [['classic', t('hvClassic')], ['tv', t('hvTv')]], () => { const v = Settings.get('homeView'); document.body.classList.toggle('hv-tv', v === 'tv'); this.applyTheme(); if (v === 'tv') TvHome.open(); else TvHome.close(); }), t('homeViewHint')),
      row(t('tvKeyboard'), sel('tvKeyboard', [['system', t('kbSystem')], ['app', t('kbApp')]], () => TvKeyboard.guard()), t('tvKeyboardHint')),
      row(t('posterStyle'), sel('posterStyle', [['classic', t('pstClassic')], ['overlay', t('pstOverlay')]], () => { this.applyTheme(); this._memo && this._memo.clear(); }), t('posterStyleHint')),
      row(t('longPress'), sel('longPress', [['menu', t('lpMenu')], ['fav', t('lpFav')]]), t('longPressHint')),
      row(t('uiSize'), sel('uiSize', [['xs', t('sizeXs')], ['s', t('sizeS')], ['m', t('sizeM')], ['l', t('sizeL')], ['xl', t('sizeXl')]], () => this.applyScale()), t('uiSizeHint')),
      (() => {
        const hint = h('small', { class: 'muted block' });
        const draw = () => {
          const z = Clock.tz(), g = Clock.geo(), mode = Settings.get('clockTz') || 'auto';
          const where = mode === 'device' ? (Clock.deviceTz() || '—') : mode === 'auto' ? (g ? (g.city || Clock.label(z)) + ' · ' + t('clockFound') : Clock.label(z) + ' · ' + t('clockFallback')) : Clock.label(z);
          hint.textContent = t('clockHint').replace('{t}', Clock.time(Clock.now())).replace('{z}', where);
        };
        const s = sel('clockTz', [['auto', t('clockAuto')], ['device', t('clockDevice')], ...CLOCK_CITIES.map(c => [c[0], LANG === 'ar' ? c[2] : c[1]])], async v => {
          Clock.changed(); draw();
          if (v === 'auto') { hint.textContent = t('clockDetecting'); await Clock.detect(true); Clock.changed(); draw(); }
        });
        draw(); const r = h('label', { class: 'set-row' }, h('span', {}, t('clockTz'), hint), s); return r;
      })(),
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
        h('button', { class: 'btn sm', onclick: () => fileIn.click() }, t('import')), fileIn,
        h('button', { class: 'btn sm', onclick: async () => {
          const data = { app: 'doom', v: 1, playlists: LS.get('playlists', []), lists: Lists.data, progress: Progress.map, settings: Settings.data, hiddenCats: Hidden.data, recordings: Recorder.list.filter(r => r.status === 'scheduled') };
          const txt = JSON.stringify(data);
          try { await navigator.clipboard.writeText(txt); UI.toast(t('copiedBackup')); }
          catch { const ta = h('textarea', { class: 'input', rows: 6, readonly: true }); ta.value = txt; UI.modal(t('copyBackup'), h('div', { class: 'stack' }, h('p', { class: 'muted small' }, t('copyManual')), ta)); setTimeout(() => { ta.focus(); ta.select(); }, 50); }
        } }, '📋 ' + t('copyBackup')),
        h('button', { class: 'btn sm', onclick: () => {
          const ta = h('textarea', { class: 'input', rows: 6, placeholder: '{"app":"doom",…}' });
          const m = UI.modal(t('pasteBackup'), h('div', { class: 'stack' }, h('p', { class: 'muted small' }, t('pasteHint')), ta,
            h('div', { class: 'row end gap' }, h('button', { class: 'btn', onclick: () => m.close() }, t('cancel')), h('button', { class: 'btn primary', onclick: () => {
              try { const j = JSON.parse(ta.value.trim()); if (j.app !== 'doom') throw 0; for (const k of ['playlists', 'lists', 'progress', 'settings', 'hiddenCats', 'recordings']) if (j[k] != null) LS.set(k, j[k]); location.reload(); }
              catch { UI.toast(t('badBackup')); }
            } }, t('import')))));
        } }, '📥 ' + t('pasteBackup'))),
      h('p', { class: 'muted small' }, t('backupHint')));

    section(t('about'), h('div', { class: 'about' }, h('img', { class: 'logo-hero small', src: 'icons/icon-512.png', alt: 'DOOM IPTV' }),
      h('p', { class: 'about-name' }, t('designedBy') + ': ', h('b', {}, LANG === 'ar' ? 'أسامة حسن دسوقي' : 'OSAMA HASAN DESOUKY')),
      h('p', { class: 'about-ver' }, t('version') + ' ', h('bdi', {}, window.DOOM_VERSION || 'dev'))));
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
  /* put the remote's focus somewhere useful when nothing is focused */
  ensureFocus() {
    const a = document.activeElement;
    if (a && a !== document.body && document.body.contains(a) && a.offsetParent !== null) return;
    const root = SpatialNav.root();
    const pick = $('.content .card, .content .ch-card, .content .pl-row, .content button', root) || $('.modal button, .modal input', root) || $('.welcome .seg-btn', root) || $('.nav-item.on, .seg-btn.on, .cat.on', root);
    const f = pick || SpatialNav.focusables(root)[0]; if (f) f.focus();
  },
  enableTvMode() {
    if (Settings.get('tvMode') === 'off' || document.body.classList.contains('tv')) return;
    document.body.classList.add('tv'); LS.set('tvSeen', true); this.applyScale(); TvKeyboard.watch(); TvKeyboard.guard(); setTimeout(() => this.ensureFocus(), 50);
  },
  /* UI size. A TV WebView reports a small CSS screen (e.g. 960x540 for 1080p), which made everything look zoomed in.
     On TV the page is laid out on a wider virtual screen and scaled down to fit; elsewhere CSS zoom is used. */
  applyScale() {
    const size = Settings.get('uiSize') || 'm', html = document.documentElement, meta = $('meta[name=viewport]'), b = document.body;
    html.style.zoom = ''; b.classList.remove('zoomfix'); b.style.removeProperty('--z');
    const zoom = z => { if (Math.abs(z - 1) < .02) return; html.style.zoom = z; b.style.setProperty('--z', z); b.classList.add('zoomfix'); };
    if (b.classList.contains('tv')) {
      const W = Math.max({ xs: 1920, s: 1680, m: 1440, l: 1280, xl: 1120 }[size] || 1440, Math.round(screen.width || 0));
      if (meta) meta.content = 'width=' + W + ', user-scalable=no, viewport-fit=cover';
      clearTimeout(this._scaleT);
      this._scaleT = setTimeout(() => { if (innerWidth < W - 40) zoom(innerWidth / W); }, 350);   // viewport width not honoured → zoom instead
    } else {
      if (meta) meta.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
      zoom({ xs: .8, s: .9, m: 1, l: 1.1, xl: 1.2 }[size] || 1);
    }
  },
  bindGlobalKeys() {
    window.addEventListener('doom-tv', () => this.enableTvMode());
    window.addEventListener('resize', () => {   // TV: the wide layout may kick in late → measure again (drops the zoom fallback if not needed)
      if (!document.body.classList.contains('tv') || innerWidth === this._lastW || textInput(document.activeElement)) return; this._lastW = innerWidth;
      clearTimeout(this._rsT); this._rsT = setTimeout(() => this.applyScale(), 250);
    });
    window.addEventListener('touchstart', () => { this._touched = true; if (LS.get('tvSeen', false) && Settings.get('tvMode') === 'auto' && !isTV()) { LS.del('tvSeen'); document.body.classList.remove('tv'); this.applyScale(); } }, { passive: true, capture: true });
    const textInput = el => el && el.matches && el.matches('input:not([type]),input[type=text],input[type=search],input[type=password],input[type=number],input[type=url],input[type=email],input[type=time],input[type=datetime-local],textarea');
    document.addEventListener('keydown', e => {
      const k = e.key, code = e.keyCode, tgt = e.target;
      const dirs = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
      // remote keys before anything else: arrows switch on TV navigation, OK (DPAD_CENTER = 23) acts like Enter
      if ((dirs[k] || code === 23) && !this._touched) this.enableTvMode();
      const ok = code === 23 || k === 'Select' || k === 'Accept';
      if (Player.open_ && !UI.top() && Player.onKey(e)) { e.preventDefault(); return; }
      if (ok) {
        const a = document.activeElement;
        if (!a || a === document.body) { this.ensureFocus(); e.preventDefault(); return; }
        if (a.matches('select')) { try { a.showPicker ? a.showPicker() : a.click(); } catch { a.click(); } }
        else if (a.matches('input[type=checkbox]')) a.click();
        else if (!textInput(a)) a.click();
        else if (TvKeyboard.active() && TvKeyboard.supports(a) && !a.dataset.syskb) TvKeyboard.open(a);
        else { a.focus(); return; }   // let the system keyboard open normally
        e.preventDefault(); return;
      }
      const back = k === 'Escape' || k === 'GoBack' || k === 'BrowserBack' || code === 10009 || code === 461 || (k === 'Backspace' && !textInput(tgt));
      if (back) {
        const ctx = $('.ctx'); if (ctx) { ctx.remove(); e.preventDefault(); return; }
        const m = UI.top(); if (m) { m.close(); e.preventDefault(); return; }
        if (document.body.classList.contains('side-open')) { document.body.classList.remove('side-open'); e.preventDefault(); return; }
        if (!textInput(tgt) && this.el && document.body.contains(this.el) && this.goBack()) e.preventDefault();
        return;
      }
      if (k === 'Enter' && TvKeyboard.active() && TvKeyboard.supports(tgt) && !tgt.dataset.syskb) { e.preventDefault(); TvKeyboard.open(tgt); return; }
      if (k === 'Enter' && tgt && tgt.matches && tgt.matches('select')) { try { tgt.showPicker && tgt.showPicker(); } catch {} return; }
      if (dirs[k]) {
        const d = dirs[k]; const a = document.activeElement;
        if (!a || a === document.body) { this.ensureFocus(); e.preventDefault(); return; }
        if (tgt.matches && tgt.matches('input[type=range]') && (d === 'left' || d === 'right')) return; // adjust slider
        if (textInput(tgt) && (d === 'left' || d === 'right')) { // move the caret; leave the field at its edge
          const v = tgt.value || ''; let st = null; try { st = tgt.selectionStart; } catch {}
          const rtl = getComputedStyle(tgt).direction === 'rtl'; const towardStart = (d === 'left') !== rtl;
          if (st != null && !(towardStart ? st === 0 : st >= v.length)) return;
        }
        if (SpatialNav.move(d)) e.preventDefault(); // selects, text fields (up/down) and everything else move the focus
        else if (tgt.matches && tgt.matches('select,input')) e.preventDefault(); // never get stuck changing a list with the arrows
      }
      if (k === '/' && !Player.open_ && !textInput(tgt)) { e.preventDefault(); const s = $('.search-in'); s && s.focus(); }
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
    const draw = () => { list.innerHTML = ''; const s = q.value.trim(); (s ? App.search(chans, s) : chans).slice(0, 150).forEach(c => list.appendChild(h('button', { class: 'ps-item', onclick: () => { m.close(); this.start(i, c); } }, App.imgEl(c.img, c.name, 'contain'), h('span', { class: 'ps-name' }, (c.num ? c.num + '. ' : '') + c.name)))); };
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
