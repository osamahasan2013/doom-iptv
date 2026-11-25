/* DOOM IPTV — on-screen keyboard for the TV remote.
   The TV's own keyboard does not always deliver text to the app, so on a TV the text fields use this one:
   letters you pick with the arrows + OK, Arabic / English / numbers & symbols, results update while you type. */
Object.assign(I18N.en, {
  kbSpace: 'Space', kbDel: 'Delete', kbClear: 'Clear', kbDone: 'Done', kbSystem: 'TV keyboard', kbTyping: 'Type with the remote', kbPressOk: 'Press OK to open the TV keyboard'
});
Object.assign(I18N.ar, {
  kbSpace: 'مسافة', kbDel: 'حذف', kbClear: 'مسح', kbDone: 'تم', kbSystem: 'كيبورد التلفزيون', kbTyping: 'اكتب بالريموت', kbPressOk: 'اضغط OK لفتح كيبورد التلفزيون'
});

const TvKeyboard = {
  LAYOUTS: {
    ar: ['ض ص ث ق ف غ ع ه خ ح ج د', 'ش س ي ب ل ا ت ن م ك ط ذ', 'ئ ء ؤ ر ى ة و ز ظ أ إ آ'],
    en: ['q w e r t y u i o p', 'a s d f g h j k l', 'z x c v b n m'],
    sym: ['1 2 3 4 5 6 7 8 9 0', '. : / - _ @ ? = & #', '% + ( ) \' ! , ; ~ *']
  },
  /* the app keyboard is used on TV unless "TV keyboard" is chosen in the settings */
  active() { return document.body.classList.contains('tv') && Settings.get('tvKeyboard') !== 'system'; },
  /* With the app keyboard, text boxes on TV are read-only: OK on an editable box is handled by the TV itself
     (it opens its own keyboard and the page never sees the key), on a read-only box the page gets OK / click
     and opens the app keyboard. The app keyboard writes the text itself. */
  guard(root) {
    const on = this.active();
    for (const el of (root || document).querySelectorAll('input,textarea')) {
      if (!el.matches(this.TEXT) || el.disabled) continue;
      if (on && !el.dataset.syskb) { if (!el.readOnly) { el.readOnly = true; el.dataset.kbro = '1'; } }
      else if (el.dataset.kbro) { el.readOnly = false; delete el.dataset.kbro; }
      if (el.getAttribute('inputmode') === 'none') el.removeAttribute('inputmode');   // left over from v1.0.26
      if (!el._kbClick) { el._kbClick = true; el.addEventListener('click', () => { if (this.active() && el.dataset.kbro) this.open(el); }); }
    }
  },
  watch() {
    if (this._mo) return; let q = false;
    const hasInput = ms => ms.some(m => Array.prototype.some.call(m.addedNodes, n => n.nodeType === 1 && (n.matches('input,textarea') || n.querySelector('input,textarea'))));
    this._mo = new MutationObserver(ms => { if (q || !hasInput(ms)) return; q = true; requestAnimationFrame(() => { q = false; this.guard(); }); });
    this._mo.observe(document.body, { childList: true, subtree: true }); this.guard();
  },
  useSystem(input) {   // this box only: hand it to the TV keyboard (press OK on it), back to the app keyboard afterwards
    input.dataset.syskb = '1'; if (input.dataset.kbro) { input.readOnly = false; delete input.dataset.kbro; }
    input.addEventListener('blur', () => { delete input.dataset.syskb; this.guard(); }, { once: true });
    setTimeout(() => { input.focus(); UI.toast(t('kbPressOk')); }, 60);
  },
  TEXT: 'input:not([type]),input[type=text],input[type=search],input[type=password],input[type=number],input[type=url],input[type=email],textarea',
  supports(el) { return !!(el && el.matches && el.matches(this.TEXT) && (!el.readOnly || el.dataset.kbro) && !el.disabled); },

  open(input) {
    if (this.m) this.m.close();
    const latin = input.type === 'password' || input.type === 'url' || input.type === 'email' || /server|user|url|pass|proxy/i.test(input.name || '');
    let layout = input.type === 'number' ? 'sym' : (latin || LANG !== 'ar' ? 'en' : 'ar'), shift = false, lastAlpha = layout === 'sym' ? (LANG === 'ar' && !latin ? 'ar' : 'en') : layout;
    const shown = h('div', { class: 'tvkb-val', dir: 'auto' });
    const keys = h('div', { class: 'tvkb-keys' });
    const set = v => {
      input.value = v;
      input.dispatchEvent(new Event('input', { bubbles: true }));   // live search / form validation
      shown.textContent = input.type === 'password' ? '•'.repeat(v.length) : v; shown.classList.toggle('empty', !v);
      if (!v) shown.textContent = input.placeholder || t('kbTyping');
    };
    const type = ch => set((input.value || '') + (shift ? ch.toUpperCase() : ch));
    const key = (label, run, cls = '') => h('button', { type: 'button', class: 'tvkb-k ' + cls, onclick: run }, label);
    const draw = keep => {
      const idx = keep ? [...keys.querySelectorAll('.tvkb-k')].indexOf(document.activeElement) : -1;
      keys.innerHTML = '';
      this.LAYOUTS[layout].forEach(row => keys.appendChild(h('div', { class: 'tvkb-row' }, row.split(' ').map(c => key(shift ? c.toUpperCase() : c, () => type(c))))));
      keys.appendChild(h('div', { class: 'tvkb-row tvkb-fn' },
        layout === 'sym' ? key(lastAlpha === 'ar' ? 'أ ب ت' : 'ABC', () => { layout = lastAlpha; draw(true); }, 'fn')
          : key(layout === 'ar' ? 'EN' : 'ع', () => { layout = lastAlpha = layout === 'ar' ? 'en' : 'ar'; shift = false; draw(true); }, 'fn'),
        layout !== 'sym' ? key('123', () => { layout = 'sym'; draw(true); }, 'fn') : null,
        layout === 'en' ? key('⇧', () => { shift = !shift; draw(true); }, 'fn' + (shift ? ' on' : '')) : null,
        key(t('kbSpace'), () => type(' '), 'space'),
        key('⌫ ' + t('kbDel'), () => set((input.value || '').slice(0, -1)), 'fn'),
        key(t('kbClear'), () => set(''), 'fn'),
        key('✓ ' + t('kbDone'), done, 'fn done')));
      const all = keys.querySelectorAll('.tvkb-k'); const f = all[Math.max(0, Math.min(idx, all.length - 1))] || all[0];
      if (keep && f) f.focus({ preventScroll: true });
    };
    const done = () => {
      m.close();
      input.dispatchEvent(new Event('change', { bubbles: true }));
      if (input.classList.contains('search-in')) { input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true })); setTimeout(() => { const c = $('.content .card, .content .ch-card'); c ? c.focus() : input.focus(); }, 60); }
      else { // jump to the next field of the form
        const form = input.closest('form'); const fields = form ? [...form.querySelectorAll('input:not([type=hidden]),select,button.primary')] : [];
        const nx = fields[fields.indexOf(input) + 1]; setTimeout(() => (nx || input).focus(), 60);
      }
    };
    const box = h('div', { class: 'tvkb' },
      h('div', { class: 'tvkb-top' }, shown, key('⌨ ' + t('kbSystem'), () => { m.close(); this.useSystem(input); }, 'fn sys')),
      keys);
    const back = h('div', { class: 'modal-back tvkb-back' }, box);
    back.addEventListener('mousedown', e => { if (e.target === back) close(); });
    document.body.appendChild(back);
    try { input.blur(); } catch {}                                     // keep the TV's own keyboard closed
    const close = () => { if (!back.isConnected) return; back.remove(); UI.stack = UI.stack.filter(x => x.back !== back); this.m = null; try { input.focus({ preventScroll: true }); } catch {} };
    const m = { back, box, close }; UI.stack.push(m); this.m = m;
    set(input.value || ''); draw(false);
    setTimeout(() => { const f = keys.querySelector('.tvkb-k'); f && f.focus({ preventScroll: true }); }, 30);
    return m;
  }
};
