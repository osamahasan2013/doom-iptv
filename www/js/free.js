/* DOOM IPTV — Free IPTV: open, legal sources checked daily (see scripts/free_iptv/build.py) */
'use strict';

const FREE_ID = '__free';
const DEFAULT_FREE_BASE = 'https://raw.githubusercontent.com/osamahasan2013/doom-iptv/main/free/';
const IPTV_ORG_FALLBACK = 'https://iptv-org.github.io/iptv/index.category.m3u';
const ARAB_CC = new Set(['sa', 'ae', 'eg', 'qa', 'kw', 'bh', 'om', 'jo', 'lb', 'sy', 'iq', 'ye', 'ps', 'ly', 'tn', 'dz', 'ma', 'sd', 'so', 'mr', 'dj', 'km']);

Object.assign(I18N.en, {
  free: 'Free IPTV', freeLive: 'Live', freeArabic: 'Arabic', freeIntl: 'International', allCountries: 'All countries', allCats: 'All',
  freeChecked: 'Checked daily · updated {d}', freeWorking: '{n} working links', freeSources: 'Sources', freeAdult: 'Show adult category',
  freeNotReady: 'The daily-checked list isn’t published yet, so channels come straight from iptv-org (not checked yet).',
  freeBase: 'Checked list address', freeHint: 'Only open, maintained sources of free live channels. Links that stop working are removed automatically.',
  geo: 'May be region-locked', deadHidden: 'This link stopped working — hidden for 24 hours', adult: 'Adult',
  freeNoSub: 'Watch Free IPTV without a subscription', addSub: '+ Add subscription',
  themeMode: 'Day / Night', day: 'Day', night: 'Night', freeEmptyAdult: 'The trusted sources don’t carry adult channels.'
});
Object.assign(I18N.ar, {
  free: 'IPTV مجاني', freeLive: 'مباشر', freeArabic: 'عربي', freeIntl: 'عالمي', allCountries: 'كل الدول', allCats: 'الكل',
  freeChecked: 'فحص يومي · آخر تحديث {d}', freeWorking: '{n} رابط شغال', freeSources: 'المصادر', freeAdult: 'إظهار فئة البالغين',
  freeNotReady: 'القائمة المفحوصة يومياً لم تُنشر بعد، لذلك القنوات معروضة مباشرة من iptv-org (بدون فحص).',
  freeBase: 'عنوان القائمة المفحوصة', freeHint: 'مصادر مفتوحة ومُحدَّثة لقنوات مباشرة مجانية فقط. أي رابط يتوقف يُحذف تلقائياً.',
  geo: 'قد يكون مقيداً جغرافياً', deadHidden: 'الرابط توقف عن العمل — تم إخفاؤه لمدة 24 ساعة', adult: 'للبالغين',
  freeNoSub: 'شاهد IPTV المجاني بدون اشتراك', addSub: '+ إضافة اشتراك',
  themeMode: 'نهاري / ليلي', day: 'نهاري', night: 'ليلي', freeEmptyAdult: 'المصادر الموثوقة لا تحتوي على قنوات للبالغين.'
});

class FreeProvider {
  constructor() { this.p = { id: FREE_ID, type: 'free', name: 'Free IPTV' }; }
  async account() { return { status: 'Active', exp: null, max: 8, active: 0 }; }
  async catalog() { return { movies: { cats: [], items: [] }, series: { cats: [], items: [] }, live: { cats: [], items: [] } }; }
  async movieInfo(id, it) { it = it || {}; return { plot: it.plot || '', year: it.year, genre: (it.fcats || []).map(c => FreeCat.catName(c)).join(', ') }; }
  async seriesInfo(id, it) {
    const eps = ((it && it._eps) || []).map((e, i) => ({ type: 'episode', id: it.id + '#' + (i + 1), seriesId: it.id, pl: FREE_ID, season: 1, episode: i + 1, name: e.n, url: e.u, ext: 'mp4', img: it.img }));
    return { plot: (it && it.plot) || '', year: it && it.year, genre: ((it && it.fcats) || []).map(c => FreeCat.catName(c)).join(', '), seasons: { 1: eps } };
  }
  async shortEpg() { return []; }
  async epgTable() { return []; }
  streamUrl(item) { return item.url; }
}
const FREE_PROVIDER = new FreeProvider();

const FreeCat = {
  live: [], movies: [], series: [], status: null, ts: 0, loading: null, fallback: false,
  dead: LS.get('freeDead', {}),
  base() { let b = (Settings.get('freeBase') || DEFAULT_FREE_BASE).trim(); return b.endsWith('/') ? b : b + '/'; },
  catName(id) { const k = 'fc_' + id; const v = t(k); return v !== k ? v : (id === 'adult' ? t('adult') : id.charAt(0).toUpperCase() + id.slice(1)); },
  showAdult() { return !!Settings.get('freeAdult') && !(Parental.d.enabled && Parental.d.lockAdult); },
  isDead(u) { const ts = this.dead[u]; return !!ts && Date.now() - ts < 86400000; },
  markDead(urls) { urls.forEach(u => { this.dead[u] = Date.now(); }); for (const [u, ts] of Object.entries(this.dead)) if (Date.now() - ts > 86400000) delete this.dead[u]; LS.set('freeDead', this.dead); },
  usable(it) {
    if (!this.showAdult() && (it.fcats || []).includes('adult')) return false;
    if (it.type === 'live') { const urls = [it.url, ...(it.alts || []).map(a => a.url)]; return urls.some(u => !this.isDead(u)); }
    return !this.isDead(it.url || '');
  },
  async load(force) {
    if (this.loading) return this.loading;
    this.loading = (async () => {
      let cached = null; try { cached = await IDB.get('cache', 'free:live'); } catch {}
      if (cached && !force && Date.now() - cached.ts < 6 * 3600000) { this.apply(cached); return; }
      try {
        const get = async n => { const r = await fetch(this.base() + n + '?t=' + Math.floor(Date.now() / 3600000), { cache: 'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); };
        const [live, status] = await Promise.all([get('live.json'), get('status.json').catch(() => null)]); const movies = { items: [] }, series = { items: [] };
        const d = { ts: Date.now(), live, movies, series, status, fallback: false };
        try { await IDB.put('cache', 'free:live', d); } catch {}
        this.apply(d);
      } catch (e) {
        console.warn('free list', e);
        if (cached) { this.apply(cached); return; }
        try { // published list not reachable: read iptv-org's own category playlist directly
          const r = await fetch(IPTV_ORG_FALLBACK, { cache: 'no-store' }); const txt = await r.text();
          const d = { ts: Date.now(), live: { items: this.parseM3U(txt), updated: null }, movies: { items: [] }, series: { items: [] }, status: null, fallback: true };
          this.apply(d);
        } catch (e2) { console.warn('iptv-org fallback', e2); this.apply({ ts: 0, live: { items: [] }, movies: { items: [] }, series: { items: [] }, status: null, fallback: true, error: true }); }
      }
    })().finally(() => { this.loading = null; });
    return this.loading;
  },
  parseM3U(txt) {
    const out = new Map(); let cur = null;
    const attr = (s, k) => { const m = new RegExp(k + '="([^"]*)"', 'i').exec(s); return m ? m[1] : ''; };
    for (const raw of txt.split(/\r?\n/)) {
      const line = raw.trim();
      if (line.startsWith('#EXTINF')) cur = { n: line.slice(line.lastIndexOf(',') + 1).trim(), l: attr(line, 'tvg-logo'), id: attr(line, 'tvg-id'), g: attr(line, 'group-title') };
      else if (line && !line.startsWith('#') && cur) {
        if (/^https?:/.test(line) && !/\.mpd(\?|$)/i.test(line)) {
          const cc = ((/\.([a-z]{2})(@|$)/i.exec(cur.id) || [])[1] || '').toLowerCase();
          const key = cur.id || cur.n;
          const it = out.get(key) || { id: 'io:' + key, n: cur.n.replace(/\s*\(\d{3,4}p\)|\s*\[[^\]]*\]/g, '').trim(), l: cur.l, c: (cur.g || 'General').toLowerCase().split(';').map(s => s.trim()).filter(c => c && c !== 'undefined' && c !== 'xxx'), cc, u: [] };
          if (!it.c.length) it.c = ['general'];
          it.u.push(line); if (ARAB_CC.has(cc)) it.ar = 1; out.set(key, it);
        }
        cur = null;
      }
    }
    return Array.from(out.values());
  },
  apply(d) {
    this.ts = d.ts; this.status = d.status; this.fallback = !!d.fallback; this.error = !!d.error;
    this.updated = (d.live && d.live.updated) || null;
    this.live = ((d.live && d.live.items) || []).map((x, i) => ({ type: 'live', id: x.id, pl: FREE_ID, name: x.n, img: x.l || '', url: x.u[0], alts: x.u.slice(1).map(u => ({ pl: FREE_ID, id: x.id, url: u })),
      fcats: x.c || ['general'], cc: x.cc || '', ar: !!x.ar, geo: !!x.g, num: i + 1, _q: (x.n || '').toLowerCase() }));
    this.movies = ((d.movies && d.movies.items) || []).map(x => ({ type: 'movie', id: x.id, pl: FREE_ID, name: x.n, img: x.p || '', year: x.y || null, plot: x.d || '', url: x.u, ext: 'mp4', fcats: x.c || [], _q: (x.n || '').toLowerCase() }));
    this.series = ((d.series && d.series.items) || []).map(x => ({ type: 'series', id: x.id, pl: FREE_ID, name: x.n, img: x.p || '', year: x.y || null, plot: x.d || '', fcats: x.c || [], _eps: x.eps || [], _q: (x.n || '').toLowerCase() }));
  }
};

/* ---------- the Free IPTV page ---------- */
const FreePage = {
  tab: 'live', region: 'all', country: '', cat: 'all',
  async render(app) {
    app.setTitle(t('free'));
    const c = app.content; c.innerHTML = '';
    if (!FreeCat.ts && !FreeCat.error) { c.innerHTML = `<div class="center pad"><div class="spinner"></div><p class="muted">${t('loading')}</p></div>`; await FreeCat.load(); if (app.section !== 'free') return; c.innerHTML = ''; }
    const wrap = h('div', { class: 'free-page' }); c.appendChild(wrap);
    // header: tabs + status
    this.tab = 'live';
    const tabs = h('div', { class: 'free-count' }, h('b', {}, t('freeLive')), h('small', { class: 'muted' }, ' ' + this.pool('live').length));
    const st = FreeCat.status;
    const info = h('div', { class: 'free-info muted small' },
      FreeCat.fallback ? h('span', { class: 'chip sm warn-chip' }, t('freeNotReady')) : h('span', {}, '✓ ' + t('freeChecked', { d: FreeCat.updated ? new Date(FreeCat.updated).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—' }) + (st && st.results ? ' · ' + t('freeWorking', { n: (st.results.ok || 0) + (st.results.restricted || 0) }) : '')),
      h('button', { class: 'icon-btn sm', title: t('refresh'), html: ic('refresh'), onclick: async () => { c.innerHTML = `<div class="center pad"><div class="spinner"></div></div>`; await FreeCat.load(true); this.render(app); } }));
    wrap.append(h('div', { class: 'free-head' }, tabs, info));
    // filters
    let items = this.pool(this.tab);
    if (this.tab === 'live') {
      const countries = Array.from(new Set(items.map(x => x.cc).filter(Boolean))).sort();
      const sel = h('select', { class: 'input sm' }, h('option', { value: '' }, t('allCountries')), ...countries.map(cc => h('option', { value: cc }, this.countryName(cc))));
      sel.value = this.country; sel.addEventListener('change', () => { this.country = sel.value; this.region = 'all'; this.render(app); });
      wrap.appendChild(h('div', { class: 'chips-bar' }, ...[['all', t('all')], ['ar', '🌙 ' + t('freeArabic')], ['intl', '🌍 ' + t('freeIntl')]].map(([k, l]) =>
        h('button', { class: 'chip-btn' + (this.region === k && !this.country ? ' on' : ''), onclick: () => { this.region = k; this.country = ''; this.render(app); } }, l)), sel));
      if (this.country) items = items.filter(x => x.cc === this.country);
      else if (this.region === 'ar') items = items.filter(x => x.ar);
      else if (this.region === 'intl') items = items.filter(x => !x.ar);
    }
    const counts = {}; items.forEach(x => x.fcats.forEach(k => { counts[k] = (counts[k] || 0) + 1; }));
    const order = ['sports', 'news', 'movies', 'series', 'kids', 'animation', 'documentary', 'music', 'religious', 'entertainment', 'general'];
    const catIds = Object.keys(counts).sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99) || counts[b] - counts[a]);
    wrap.appendChild(h('div', { class: 'chips-bar cats-bar' }, h('button', { class: 'chip-btn' + (this.cat === 'all' ? ' on' : ''), onclick: () => { this.cat = 'all'; this.render(app); } }, t('allCats'), h('small', {}, ' ' + items.length)),
      ...catIds.map(k => h('button', { class: 'chip-btn' + (this.cat === k ? ' on' : '') + (k === 'adult' ? ' adult' : ''), onclick: () => { this.cat = k; this.render(app); } }, this.catLabel(k), h('small', {}, ' ' + counts[k])))));
    if (this.cat !== 'all') items = items.filter(x => x.fcats.includes(this.cat));
    if (app.q) items = items.filter(x => x._q.includes(app.q));
    if (!items.length) { wrap.appendChild(app.empty(FreeCat.error ? t('errLogin') : null)); return; }
    const grid = h('div', { class: this.tab === 'live' ? 'grid live' : 'grid' }); wrap.appendChild(grid);
    if (this.tab === 'live') app.fillGrid(grid, items, it => { const card = app.channelCard(it, items); if (it.geo) $('.ch-meta', card).appendChild(h('span', { class: 'chip sm', title: t('geo') }, '🌐')); if (it.cc) $('.ch-meta', card).prepend(h('span', { class: 'chip sm' }, it.cc.toUpperCase())); return card; });
    else app.fillGrid(grid, items, it => app.posterCard(it));
  },
  pool(tab) { return (tab === 'live' ? FreeCat.live : tab === 'movies' ? FreeCat.movies : FreeCat.series).filter(x => FreeCat.usable(x)); },
  catLabel(k) {
    const ar = { sports: 'رياضة', news: 'أخبار', movies: 'أفلام', series: 'مسلسلات', kids: 'أطفال', animation: 'رسوم متحركة', documentary: 'وثائقي', music: 'موسيقى', religious: 'ديني', entertainment: 'ترفيه', general: 'عام',
      comedy: 'كوميديا', family: 'عائلي', education: 'تعليمي', science: 'علوم', business: 'اقتصاد', lifestyle: 'لايف ستايل', cooking: 'طبخ', travel: 'سفر', culture: 'ثقافة', classic: 'كلاسيكي', outdoor: 'مغامرات',
      auto: 'سيارات', weather: 'طقس', legislative: 'برلماني', public: 'عام/حكومي', relax: 'استرخاء', shop: 'تسوق', woman: 'المرأة', adult: 'للبالغين', drama: 'دراما', horror: 'رعب', western: 'ويسترن', action: 'أكشن',
      crime: 'جريمة', scifi: 'خيال علمي', romance: 'رومانسي', war: 'حرب', interactive: 'تفاعلي' };
    const en = { scifi: 'Sci-Fi', shop: 'Shopping', adult: 'Adult' };
    return LANG === 'ar' ? (ar[k] || k) : (en[k] || k.charAt(0).toUpperCase() + k.slice(1));
  },
  countryName(cc) { try { return new Intl.DisplayNames([LANG], { type: 'region' }).of(cc.toUpperCase()) + ' (' + cc.toUpperCase() + ')'; } catch { return cc.toUpperCase(); } }
};
