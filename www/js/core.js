/* DOOM IPTV — core: utilities, i18n, storage, providers (Xtream / M3U / Demo) */
'use strict';

/* ---------------- utilities ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fmtTime = s => {
  if (!isFinite(s) || s < 0) s = 0;
  s = Math.floor(s);
  const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
  return (hh ? hh + ':' + String(mm).padStart(2, '0') : mm) + ':' + String(ss).padStart(2, '0');
};
const fmtBytes = b => {
  if (!b) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0;
  while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
  return b.toFixed(i ? 1 : 0) + ' ' + u[i];
};
const b64 = s => { try { return decodeURIComponent(escape(atob(s || ''))); } catch { return s || ''; } };
const isNative = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const isElectron = () => /Electron/i.test(navigator.userAgent);
const isTV = () => !!window.__DOOM_TV || /SMART-TV|SmartTV|Tizen|Web0S|webOS|AFT|BRAVIA|Android ?TV|GoogleTV|CrKey|HbbTV|NetCast|\bTV\b|Projector/i.test(navigator.userAgent) || new URLSearchParams(location.search).has('tv')
  || (isNative() && navigator.maxTouchPoints === 0 && !('ontouchstart' in window)); // Android app without a touchscreen = TV box / projector

async function sha256(text) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    let x = 5381; for (const c of text) x = ((x << 5) + x + c.charCodeAt(0)) | 0;
    return 'h' + (x >>> 0).toString(16);
  }
}

/* ---------------- i18n ---------------- */
const I18N = {
  en: {
    movies: 'Movies', series: 'Series', live: 'Live', continue: 'Continue Watching', favorites: 'Favorites',
    categories: 'Categories', all: 'All', search: 'Search movies, series, channels', showHidden: 'Show hidden',
    downloads: 'Downloads', recordings: 'Recordings', multiview: 'Multi-View', settings: 'Settings',
    sortDefault: 'Default order', sortAdded: 'Recently added', sortAZ: 'Name A–Z', sortZA: 'Name Z–A', sortRating: 'Top rated', sortYear: 'Newest year',
    play: 'Play', resume: 'Resume', addToList: 'Add to list', download: 'Download', trailer: 'Trailer', season: 'Season', episodes: 'Episodes',
    downloadSeason: 'Download season', record: 'Record', stopRec: 'Stop recording', cast: 'Cast', director: 'Director', genre: 'Genre',
    nothing: 'Nothing here yet', loading: 'Loading…', refresh: 'Refresh content', updated: 'Updated', newList: 'New list', listName: 'List name',
    create: 'Create', cancel: 'Cancel', save: 'Save', delete: 'Delete', rename: 'Rename', close: 'Close', ok: 'OK', yes: 'Yes', no: 'No',
    addPlaylist: 'Add playlist', xtream: 'Xtream Codes', m3u: 'M3U URL', demo: 'Demo content', server: 'Server URL', username: 'Username',
    password: 'Password', name: 'Name', url: 'Playlist URL', login: 'Connect', welcome: 'Welcome to DOOM', welcomeSub: 'Add your IPTV subscription to start watching',
    playlists: 'Playlists', account: 'Account', expires: 'Expires', connections: 'Connections', status: 'Status', active: 'active',
    player: 'Player', parental: 'Parental controls', language: 'Language', appearance: 'Appearance', about: 'About', advanced: 'Advanced',
    liveFormat: 'Live stream format', seekStep: 'Seek step (seconds)', defaultAspect: 'Default aspect', defaultSpeed: 'Default speed', autoNext: 'Auto-play next episode',
    refreshEvery: 'Auto-refresh content every', hours: 'hours', proxy: 'API proxy (web only, optional)', clearCache: 'Clear cache',
    pinSet: 'Set PIN', pinChange: 'Change PIN', pinEnter: 'Enter PIN', pinWrong: 'Wrong PIN', pinNew: 'New 4-digit PIN', parentalOn: 'Enable parental controls',
    allowedCats: 'Allowed categories', allowedCatsHint: 'Only checked categories are visible while parental controls are on.',
    dailyLimit: 'Daily watch limit (minutes, 0 = unlimited)', allowedHours: 'Allowed viewing hours', from: 'From', to: 'To', usedToday: 'Watched today',
    timeUp: 'Viewing time is over', timeUpSub: 'Enter the PIN to keep watching.', outsideHours: 'Viewing is not allowed at this hour',
    locked: 'Locked', hideCat: 'Hide category', unhideCat: 'Show category',
    speed: 'Speed', aspect: 'Aspect', brightness: 'Brightness', volume: 'Volume', audio: 'Audio', subtitles: 'Subtitles', off: 'Off', loadSub: 'Load subtitle file…',
    fit: 'Fit', fill: 'Fill / Zoom', stretch: 'Stretch', original: 'Original', sleep: 'Sleep timer', minutes: 'min', nextEp: 'Next episode', channels: 'Channels',
    nowPlaying: 'Now', next: 'Next', noEpg: 'No guide data', catchup: 'Catch-up', pip: 'Picture in picture', fullscreen: 'Full screen', info: 'Info',
    dlQueued: 'Queued', dlRunning: 'Downloading', dlPaused: 'Paused', dlDone: 'Ready offline', dlError: 'Failed', pause: 'Pause', resumeDl: 'Resume', playOffline: 'Play offline',
    storageUsed: 'Storage used', saveFile: 'Save file', schedule: 'Schedule recording', start: 'Start', duration: 'Duration (minutes)', scheduled: 'Scheduled', recording: 'Recording',
    channel: 'Channel', mvHint: 'Tap a tile to pick a channel. Tiles available follow your subscription connection limit.', addChannel: 'Add channel', pickChannel: 'Pick a channel',
    connLimit: 'Your subscription allows {n} simultaneous connection(s). Close another stream first.', connLimitTitle: 'Connection limit reached',
    errPlay: 'Could not play this stream', retry: 'Retry', errLogin: 'Could not connect. Check the server, username and password.',
    errCors: 'The server blocked the request from the browser (CORS / mixed content). Use the Android/Windows app, or set an API proxy in Settings.',
    addedTo: 'Added to', removedFrom: 'Removed from', inLists: 'In lists', favDefault: 'Favorites', items: 'items', watched: 'Watched', episode: 'Episode',
    epShort: 'E', sShort: 'S', designedBy: 'Designed by', version: 'Version', theme: 'Accent color', tvMode: 'TV mode (remote navigation)', auto: 'Auto',
    clearHistory: 'Clear watch history', remove: 'Remove', openDetails: 'Details', list: 'List', copyInfo: 'Copied', liveTv: 'Live TV', recent: 'Recently added',
    demoNote: 'Demo mode: sample titles and a generated test video.', selectAll: 'Select all', selectNone: 'Select none', confirmDelete: 'Delete this?', export: 'Export', import: 'Import',
    backupHint: 'Backup or restore your lists, history and settings.', offlineBadge: 'Offline', live_now: 'LIVE', timeshift: 'Timeshift', stats: 'Stream info'
  },
  ar: {
    movies: 'أفلام', series: 'مسلسلات', live: 'مباشر', continue: 'متابعة المشاهدة', favorites: 'المفضلة',
    categories: 'الفئات', all: 'الكل', search: 'ابحث عن فيلم أو مسلسل أو قناة', showHidden: 'إظهار المخفي',
    downloads: 'التنزيلات', recordings: 'التسجيلات', multiview: 'مشاهدة متعددة', settings: 'الإعدادات',
    sortDefault: 'الترتيب الافتراضي', sortAdded: 'المضاف حديثاً', sortAZ: 'الاسم أ–ي', sortZA: 'الاسم ي–أ', sortRating: 'الأعلى تقييماً', sortYear: 'الأحدث سنة',
    play: 'تشغيل', resume: 'استكمال', addToList: 'أضف لقائمة', download: 'تنزيل', trailer: 'الإعلان', season: 'الموسم', episodes: 'الحلقات',
    downloadSeason: 'تنزيل الموسم', record: 'تسجيل', stopRec: 'إيقاف التسجيل', cast: 'الممثلون', director: 'المخرج', genre: 'النوع',
    nothing: 'لا يوجد شيء هنا بعد', loading: 'جارِ التحميل…', refresh: 'تحديث المحتوى', updated: 'آخر تحديث', newList: 'قائمة جديدة', listName: 'اسم القائمة',
    create: 'إنشاء', cancel: 'إلغاء', save: 'حفظ', delete: 'حذف', rename: 'إعادة تسمية', close: 'إغلاق', ok: 'تم', yes: 'نعم', no: 'لا',
    addPlaylist: 'إضافة اشتراك', xtream: 'Xtream Codes', m3u: 'رابط M3U', demo: 'محتوى تجريبي', server: 'رابط السيرفر', username: 'اسم المستخدم',
    password: 'كلمة المرور', name: 'الاسم', url: 'رابط القائمة', login: 'اتصال', welcome: 'أهلاً بك في DOOM', welcomeSub: 'أضف اشتراك الـ IPTV لتبدأ المشاهدة',
    playlists: 'الاشتراكات', account: 'الحساب', expires: 'ينتهي في', connections: 'الاتصالات', status: 'الحالة', active: 'نشط',
    player: 'المشغل', parental: 'الرقابة الأبوية', language: 'اللغة', appearance: 'المظهر', about: 'حول', advanced: 'متقدم',
    liveFormat: 'صيغة البث المباشر', seekStep: 'خطوة التقديم/التأخير (ثانية)', defaultAspect: 'الأبعاد الافتراضية', defaultSpeed: 'السرعة الافتراضية', autoNext: 'تشغيل الحلقة التالية تلقائياً',
    refreshEvery: 'تحديث المحتوى تلقائياً كل', hours: 'ساعة', proxy: 'بروكسي للـ API (للويب فقط، اختياري)', clearCache: 'مسح الكاش',
    pinSet: 'تعيين رمز PIN', pinChange: 'تغيير رمز PIN', pinEnter: 'أدخل رمز PIN', pinWrong: 'رمز خاطئ', pinNew: 'رمز جديد من 4 أرقام', parentalOn: 'تفعيل الرقابة الأبوية',
    allowedCats: 'الفئات المسموحة', allowedCatsHint: 'عند تفعيل الرقابة تظهر الفئات المحددة فقط.',
    dailyLimit: 'حد المشاهدة اليومي (دقائق، 0 = بلا حد)', allowedHours: 'ساعات المشاهدة المسموحة', from: 'من', to: 'إلى', usedToday: 'المشاهدة اليوم',
    timeUp: 'انتهى وقت المشاهدة', timeUpSub: 'أدخل رمز PIN للاستمرار.', outsideHours: 'المشاهدة غير مسموحة في هذا الوقت',
    locked: 'مقفل', hideCat: 'إخفاء الفئة', unhideCat: 'إظهار الفئة',
    speed: 'السرعة', aspect: 'الأبعاد', brightness: 'الإضاءة', volume: 'الصوت', audio: 'الصوت', subtitles: 'الترجمة', off: 'إيقاف', loadSub: 'تحميل ملف ترجمة…',
    fit: 'ملائمة', fill: 'ملء / تكبير', stretch: 'تمديد', original: 'الأصلي', sleep: 'مؤقت النوم', minutes: 'د', nextEp: 'الحلقة التالية', channels: 'القنوات',
    nowPlaying: 'الآن', next: 'التالي', noEpg: 'لا يوجد دليل برامج', catchup: 'إعادة البث', pip: 'صورة داخل صورة', fullscreen: 'ملء الشاشة', info: 'معلومات',
    dlQueued: 'في الانتظار', dlRunning: 'جارِ التنزيل', dlPaused: 'متوقف مؤقتاً', dlDone: 'جاهز بدون إنترنت', dlError: 'فشل', pause: 'إيقاف مؤقت', resumeDl: 'استئناف', playOffline: 'تشغيل بدون إنترنت',
    storageUsed: 'المساحة المستخدمة', saveFile: 'حفظ الملف', schedule: 'جدولة تسجيل', start: 'البداية', duration: 'المدة (دقائق)', scheduled: 'مجدول', recording: 'جارِ التسجيل',
    channel: 'القناة', mvHint: 'اضغط على أي مربع لاختيار قناة. عدد المربعات حسب عدد الاتصالات المسموح بها في اشتراكك.', addChannel: 'إضافة قناة', pickChannel: 'اختر قناة',
    connLimit: 'اشتراكك يسمح بـ {n} اتصال في نفس الوقت. أغلق بثاً آخر أولاً.', connLimitTitle: 'تم الوصول لحد الاتصالات',
    errPlay: 'تعذر تشغيل هذا البث', retry: 'إعادة المحاولة', errLogin: 'تعذر الاتصال. تأكد من رابط السيرفر واسم المستخدم وكلمة المرور.',
    errCors: 'السيرفر رفض الطلب من المتصفح (CORS / محتوى غير آمن). استخدم تطبيق أندرويد/ويندوز، أو أضف بروكسي API من الإعدادات.',
    addedTo: 'أُضيف إلى', removedFrom: 'أُزيل من', inLists: 'في القوائم', favDefault: 'المفضلة', items: 'عنصر', watched: 'تمت المشاهدة', episode: 'الحلقة',
    epShort: 'ح', sShort: 'م', designedBy: 'تصميم', version: 'الإصدار', theme: 'اللون المميز', tvMode: 'وضع التلفزيون (التنقل بالريموت)', auto: 'تلقائي',
    clearHistory: 'مسح سجل المشاهدة', remove: 'إزالة', openDetails: 'التفاصيل', list: 'قائمة', copyInfo: 'تم النسخ', liveTv: 'البث المباشر', recent: 'أضيف حديثاً',
    demoNote: 'وضع تجريبي: عناوين وهمية وفيديو اختبار مُولَّد.', selectAll: 'تحديد الكل', selectNone: 'إلغاء التحديد', confirmDelete: 'حذف هذا العنصر؟', export: 'تصدير', import: 'استيراد',
    backupHint: 'نسخ احتياطي واستعادة للقوائم والسجل والإعدادات.', offlineBadge: 'بدون إنترنت', live_now: 'مباشر', timeshift: 'إزاحة زمنية', stats: 'معلومات البث'
  }
};
let LANG = 'en';
const t = (k, vars) => {
  let s = (I18N[LANG] && I18N[LANG][k]) || I18N.en[k] || k;
  if (vars) for (const [a, b] of Object.entries(vars)) s = s.replace('{' + a + '}', b);
  return s;
};

/* ---------------- local storage (small state) ---------------- */
const LS = {
  get(k, d) { try { const v = localStorage.getItem('doom.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('doom.' + k, JSON.stringify(v)); } catch (e) { console.warn('storage', e); } },
  del(k) { try { localStorage.removeItem('doom.' + k); } catch {} }
};

const DEFAULT_SETTINGS = {
  lang: 'auto', liveFormat: 'm3u8', seekStep: 10, aspect: 'fit', speed: 1, autoNext: true, refreshHours: 12,
  proxy: '', accent: '#5b8cff', tvMode: 'auto', uiSize: 'm', theme: 'auto', freeBase: '', sort: 'default', lastSection: 'movies'
};
const Settings = {
  data: Object.assign({}, DEFAULT_SETTINGS, LS.get('settings', {})),
  get(k) { return this.data[k]; },
  set(k, v) { this.data[k] = v; LS.set('settings', this.data); }
};

/* ---------------- IndexedDB (catalog cache + media chunks) ---------------- */
const IDB = {
  _db: null,
  open() {
    if (this._db) return Promise.resolve(this._db);
    return new Promise((res, rej) => {
      let req;
      try { req = indexedDB.open('doom', 1); } catch (e) { return rej(e); }
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('cache')) db.createObjectStore('cache');
        if (!db.objectStoreNames.contains('chunks')) db.createObjectStore('chunks');
      };
      req.onsuccess = () => { this._db = req.result; res(this._db); };
      req.onerror = () => rej(req.error);
    });
  },
  async tx(store, mode, fn) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const tx = db.transaction(store, mode); const st = tx.objectStore(store);
      let out; Promise.resolve(fn(st)).then(v => { out = v; });
      tx.oncomplete = () => res(out instanceof IDBRequest ? out.result : out);
      tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error);
    });
  },
  get(store, key) { return this.tx(store, 'readonly', st => st.get(key)); },
  put(store, key, val) { return this.tx(store, 'readwrite', st => { st.put(val, key); }); },
  del(store, key) { return this.tx(store, 'readwrite', st => { st.delete(key); }); },
  async delRange(store, lo, hi) { return this.tx(store, 'readwrite', st => { st.delete(IDBKeyRange.bound(lo, hi)); }); },
  async getRange(store, lo, hi) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const out = []; const req = db.transaction(store).objectStore(store).openCursor(IDBKeyRange.bound(lo, hi));
      req.onsuccess = () => { const c = req.result; if (c) { out.push(c.value); c.continue(); } else res(out); };
      req.onerror = () => rej(req.error);
    });
  },
  async clear(store) { return this.tx(store, 'readwrite', st => { st.clear(); }); }
};

/* ---------------- networking ---------------- */
async function netFetch(url, opts = {}) {
  const proxy = Settings.get('proxy');
  const useProxy = proxy && !isNative() && !isElectron() && !opts.direct;
  const target = useProxy ? proxy + encodeURIComponent(url) : url;
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), opts.timeout || 45000);
  try {
    const r = await fetch(target, { signal: opts.signal || ctrl.signal, cache: 'no-store' });
    if (!r.ok) throw Object.assign(new Error('HTTP ' + r.status), { status: r.status });
    return r;
  } catch (e) {
    if (e.name === 'TypeError' && !useProxy && location.protocol !== 'file:' && !isNative() && !isElectron()) e.cors = true;
    throw e;
  } finally { clearTimeout(to); }
}
const fetchJSON = async (url, opts) => {
  const r = await netFetch(url, opts); const txt = await r.text();
  try { return JSON.parse(txt); } catch { throw new Error('Bad JSON'); }
};

/* ---------------- normalisation helpers ---------------- */
const yearOf = (o, name) => {
  const y = parseInt(o.year || (o.releaseDate || o.release_date || o.releasedate || '').slice(0, 4), 10);
  if (y > 1900 && y < 2100) return y;
  const m = /\((\d{4})\)|\b(19\d{2}|20\d{2})\b/.exec(name || ''); return m ? +(m[1] || m[2]) : null;
};
const ratingOf = o => {
  let r = parseFloat(o.rating); if (!(r > 0) && o.rating_5based) r = parseFloat(o.rating_5based) * 2;
  return r > 0 ? Math.round(r * 10) / 10 : null;
};
/* adult content is removed from the whole app: categories / channels whose names match are dropped */
const ADULT_RX = /(\b(adults?|xxx|porn\w*|erotic\w*|nsfw|sexy?|playboy|hustler|brazzers)\b|18\s*\+|\+\s*18|للكبار|بالغين|إباحي|اباحي|سكس)/i;

/* ---------------- providers ---------------- */
class XtreamProvider {
  constructor(p) {
    this.p = p;
    let s = (p.server || '').trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(s)) s = 'http://' + s;
    this.base = s.replace(/\/(player_api\.php|get\.php).*$/i, '');
    this.u = encodeURIComponent(p.username); this.pw = encodeURIComponent(p.password);
  }
  api(action, extra = '') { return `${this.base}/player_api.php?username=${this.u}&password=${this.pw}${action ? '&action=' + action : ''}${extra}`; }
  async account() {
    const j = await fetchJSON(this.api(''), { timeout: 20000 });
    if (!j || !j.user_info || +j.user_info.auth === 0) throw new Error('auth');
    const u = j.user_info;
    return { status: u.status, exp: u.exp_date ? +u.exp_date * 1000 : null, max: +u.max_connections || 1, active: +u.active_cons || 0,
      created: u.created_at ? +u.created_at * 1000 : null, trial: u.is_trial === '1', formats: u.allowed_output_formats || [], tz: j.server_info && j.server_info.timezone };
  }
  async catalog() {
    const [vc, vs, sc, ss, lc, ls] = await Promise.all([
      fetchJSON(this.api('get_vod_categories')), fetchJSON(this.api('get_vod_streams'), { timeout: 120000 }),
      fetchJSON(this.api('get_series_categories')), fetchJSON(this.api('get_series'), { timeout: 120000 }),
      fetchJSON(this.api('get_live_categories')), fetchJSON(this.api('get_live_streams'), { timeout: 120000 })
    ]);
    const cats = (arr, type) => (Array.isArray(arr) ? arr : []).map(c => ({ id: String(c.category_id), name: c.category_name || '—', type }));
    const arr = a => Array.isArray(a) ? a : Object.values(a || {});
    return {
      movies: { cats: cats(vc, 'movies'), items: arr(vs).map(o => ({ type: 'movie', id: String(o.stream_id), name: o.name || o.title || '', cat: String(o.category_id), img: o.stream_icon || '', year: yearOf(o, o.name), rating: ratingOf(o), added: +o.added || 0, ext: o.container_extension || 'mp4' })) },
      series: { cats: cats(sc, 'series'), items: arr(ss).map(o => ({ type: 'series', id: String(o.series_id), name: o.name || '', cat: String(o.category_id), img: o.cover || '', year: yearOf(o, o.name), rating: ratingOf(o), added: +(o.last_modified || 0), plot: o.plot || '', genre: o.genre || '' })) },
      live: { cats: cats(lc, 'live'), items: arr(ls).map(o => ({ type: 'live', id: String(o.stream_id), name: o.name || '', cat: String(o.category_id), img: o.stream_icon || '', num: +o.num || 0, epgId: o.epg_channel_id || '', archive: +o.tv_archive === 1, archiveDays: +o.tv_archive_duration || 0, added: +o.added || 0 })) }
    };
  }
  async movieInfo(id) {
    const j = await fetchJSON(this.api('get_vod_info', '&vod_id=' + id));
    const i = (j && j.info) || {};
    return { plot: i.plot || i.description || '', cast: i.cast || i.actors || '', director: i.director || '', genre: i.genre || '', duration: i.duration || '', rating: ratingOf(i),
      backdrop: (Array.isArray(i.backdrop_path) ? i.backdrop_path[0] : i.backdrop_path) || '', img: i.movie_image || i.cover_big || '', trailer: i.youtube_trailer || '', year: yearOf(i, ''),
      ext: (j && j.movie_data && j.movie_data.container_extension) || null };
  }
  async seriesInfo(id) {
    const j = await fetchJSON(this.api('get_series_info', '&series_id=' + id));
    const i = (j && j.info) || {};
    const seasons = {};
    for (const [sn, eps] of Object.entries((j && j.episodes) || {})) {
      seasons[sn] = (eps || []).map(e => ({ type: 'episode', id: String(e.id), seriesId: String(id), season: +sn || +e.season || 1, episode: +e.episode_num || 0,
        name: e.title || '', ext: e.container_extension || 'mp4', img: (e.info && (e.info.movie_image || e.info.cover_big)) || '', plot: (e.info && e.info.plot) || '',
        duration: (e.info && (e.info.duration_secs || e.info.duration)) || '' }));
    }
    return { plot: i.plot || '', cast: i.cast || '', director: i.director || '', genre: i.genre || '', rating: ratingOf(i), img: i.cover || '',
      backdrop: (Array.isArray(i.backdrop_path) ? i.backdrop_path[0] : i.backdrop_path) || '', trailer: i.youtube_trailer || '', year: yearOf(i, i.name), seasons };
  }
  async shortEpg(streamId, limit = 4) {
    const j = await fetchJSON(this.api('get_short_epg', `&stream_id=${streamId}&limit=${limit}`), { timeout: 15000 });
    return ((j && j.epg_listings) || []).map(e => ({ title: b64(e.title), desc: b64(e.description), start: (+e.start_timestamp || Date.parse(e.start) / 1000) * 1000, end: (+e.stop_timestamp || Date.parse(e.end) / 1000) * 1000 }));
  }
  async epgTable(streamId) {
    const j = await fetchJSON(this.api('get_simple_data_table', '&stream_id=' + streamId), { timeout: 20000 });
    return ((j && j.epg_listings) || []).map(e => ({ title: b64(e.title), desc: b64(e.description), start: +e.start_timestamp * 1000, end: +e.stop_timestamp * 1000, archive: +e.has_archive === 1 }))
      .filter(e => e.start).sort((a, b) => a.start - b.start);
  }
  streamUrl(item, opts = {}) {
    const fmt = opts.format || (isNative() ? 'm3u8' : Settings.get('liveFormat')) || 'm3u8';
    if (item.type === 'live') return `${this.base}/live/${this.u}/${this.pw}/${item.id}.${fmt}`;
    if (item.type === 'movie') return `${this.base}/movie/${this.u}/${this.pw}/${item.id}.${item.ext || 'mp4'}`;
    if (item.type === 'episode') return `${this.base}/series/${this.u}/${this.pw}/${item.id}.${item.ext || 'mp4'}`;
    return item.url;
  }
  catchupUrl(item, startMs, minutes) {
    const d = new Date(startMs); const p = n => String(n).padStart(2, '0');
    const s = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}:${p(d.getHours())}-${p(d.getMinutes())}`;
    return `${this.base}/timeshift/${this.u}/${this.pw}/${minutes}/${s}/${item.id}.ts`;
  }
}

class M3UProvider {
  constructor(p) { this.p = p; }
  async account() { return { status: 'Active', exp: null, max: +this.p.maxConnections || 1, active: 0 }; }
  async catalog() {
    const r = await netFetch(this.p.url, { timeout: 120000 }); const txt = await r.text();
    return M3UProvider.parse(txt);
  }
  static parse(txt) {
    const out = { movies: { cats: [], items: [] }, series: { cats: [], items: [] }, live: { cats: [], items: [] } };
    const catMap = { movies: new Map(), series: new Map(), live: new Map() };
    const seriesMap = new Map();
    const lines = txt.split(/\r?\n/); let cur = null; let n = 0;
    const attr = (s, k) => { const m = new RegExp(k + '="([^"]*)"', 'i').exec(s); return m ? m[1] : ''; };
    const catId = (sec, name) => {
      const m = catMap[sec]; if (!m.has(name)) { const id = sec[0] + m.size; m.set(name, id); out[sec].cats.push({ id, name, type: sec }); }
      return m.get(name);
    };
    for (const raw of lines) {
      const line = raw.trim(); if (!line) continue;
      if (line.startsWith('#EXTINF')) {
        const comma = line.lastIndexOf(',');
        cur = { name: line.slice(comma + 1).trim(), logo: attr(line, 'tvg-logo'), group: attr(line, 'group-title') || 'Uncategorized', epgId: attr(line, 'tvg-id'), catchup: attr(line, 'catchup') || attr(line, 'tvg-rec') };
      } else if (!line.startsWith('#') && cur) {
        const url = line; n++;
        const sec = /\/movie\//i.test(url) || /\.(mp4|mkv|avi|mov)(\?|$)/i.test(url) && !/\/series\//i.test(url) ? 'movies' : /\/series\//i.test(url) || /S\d{1,2}\s?E\d{1,3}/i.test(cur.name) ? 'series' : 'live';
        const cat = catId(sec, cur.group);
        const ext = (/\.(\w{2,4})(\?|$)/.exec(url) || [])[1] || '';
        if (sec === 'series') {
          const m = /^(.*?)[\s._-]*S(\d{1,2})\s?E(\d{1,3})/i.exec(cur.name);
          const show = (m ? m[1] : cur.name).trim() || cur.name;
          const key = cat + '|' + show;
          if (!seriesMap.has(key)) {
            const s = { type: 'series', id: 'm' + seriesMap.size, name: show, cat, img: cur.logo, year: yearOf({}, show), rating: null, added: n, _eps: {} };
            seriesMap.set(key, s); out.series.items.push(s);
          }
          const s = seriesMap.get(key); const sn = m ? +m[2] : 1;
          (s._eps[sn] = s._eps[sn] || []).push({ type: 'episode', id: 'e' + n, seriesId: s.id, season: sn, episode: m ? +m[3] : s._eps[sn].length + 1, name: cur.name, url, ext, img: cur.logo });
        } else if (sec === 'movies') {
          out.movies.items.push({ type: 'movie', id: 'v' + n, name: cur.name, cat, img: cur.logo, year: yearOf({}, cur.name), rating: null, added: n, url, ext });
        } else {
          out.live.items.push({ type: 'live', id: 'l' + n, name: cur.name, cat, img: cur.logo, num: out.live.items.length + 1, epgId: cur.epgId, url, added: n });
        }
        cur = null;
      }
    }
    return out;
  }
  async movieInfo() { return {}; }
  async seriesInfo(id, item) {
    const s = item || {}; const seasons = {};
    for (const [k, v] of Object.entries((s && s._eps) || {})) seasons[k] = v.slice().sort((a, b) => a.episode - b.episode);
    return { seasons };
  }
  async shortEpg() { return []; }
  async epgTable() { return []; }
  streamUrl(item) { return item.url; }
}

/* Demo provider: invented titles, generated posters, generated test video (no network) */
class DemoProvider {
  constructor(p) { this.p = p; }
  async account() { return { status: 'Active', exp: Date.now() + 86400000 * 180, max: 2, active: 0, demo: true }; }
  static poster(title, seed, wide) {
    const hues = [210, 260, 330, 15, 40, 140, 180, 290];
    const a = hues[seed % hues.length], b = (a + 60 + (seed * 37) % 90) % 360;
    const w = wide ? 640 : 400, ht = wide ? 360 : 600;
    const words = title.replace(/^HQ \| /, '').replace(/\(\d{4}\)/, '').trim().toUpperCase().split(' ');
    const linesOut = []; let ln = '';
    for (const wd of words) { if ((ln + ' ' + wd).trim().length > 11) { if (ln) linesOut.push(ln); ln = wd; } else ln = (ln + ' ' + wd).trim(); }
    if (ln) linesOut.push(ln);
    const shapes = Array.from({ length: 5 }, (_, i) => `<circle cx="${(seed * 53 + i * 97) % w}" cy="${(seed * 31 + i * 151) % ht}" r="${40 + (seed * 7 + i * 23) % 120}" fill="hsla(${(a + i * 40) % 360},80%,70%,.18)"/>`).join('');
    const txt = linesOut.slice(0, 4).map((l, i) => `<text x="50%" y="${ht * 0.18 + i * 54}" text-anchor="middle" font-family="Impact,Arial Black,sans-serif" font-size="46" fill="#fff" stroke="rgba(0,0,0,.35)" stroke-width="2">${esc(l)}</text>`).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${ht}" viewBox="0 0 ${w} ${ht}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${a},70%,45%)"/><stop offset="1" stop-color="hsl(${b},65%,18%)"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/>${shapes}<circle cx="${w / 2}" cy="${ht * 0.68}" r="${ht * 0.17}" fill="hsla(${b},90%,85%,.85)"/><circle cx="${w / 2 - 22}" cy="${ht * 0.66}" r="9" fill="#123"/><circle cx="${w / 2 + 22}" cy="${ht * 0.66}" r="9" fill="#123"/><path d="M${w / 2 - 24} ${ht * 0.72} q24 18 48 0" stroke="#123" stroke-width="6" fill="none" stroke-linecap="round"/>${txt}</svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  async catalog() {
    const adj = ['Brave', 'Lost', 'Silent', 'Crimson', 'Hidden', 'Golden', 'Midnight', 'Wild', 'Little', 'Last', 'Frozen', 'Flying', 'Secret', 'Starlit', 'Iron', 'Paper'];
    const noun = ['Robot', 'Island', 'Garden', 'Kingdom', 'Comet', 'Lantern', 'Voyage', 'Forest', 'Harbor', 'Dragon', 'Desert', 'Orbit', 'Rider', 'Village', 'Engine', 'Owl'];
    const mcats = ['New Releases', 'Arabic Movies', 'Animation', 'Action', 'Drama', 'Comedy', 'Kids', 'Documentary'];
    const scats = ['Arabic Series', 'English Series', 'Kids Series', 'Turkish Series'];
    const lcats = ['News', 'Sports', 'Kids', 'Documentary', 'Movies 24/7'];
    const cat = (arr, type) => arr.map((name, i) => ({ id: type[0] + i, name, type }));
    const movies = [], series = [], live = [];
    let k = 0;
    for (let i = 0; i < 140; i++) {
      const name = `HQ | ${adj[i % 16]} ${noun[(i * 7) % 16]}${i > 40 ? ' ' + (i % 5 + 1) : ''} (${2026 - (i % 9)})`;
      movies.push({ type: 'movie', id: 'dm' + i, name, cat: 'm' + (i % mcats.length), img: DemoProvider.poster(name, i), year: 2026 - (i % 9), rating: 5 + (i * 13 % 40) / 10, added: 1e9 - i, ext: 'demo' });
    }
    for (let i = 0; i < 40; i++) {
      const name = `${adj[(i * 3) % 16]} ${noun[(i * 5 + 3) % 16]} Chronicles`;
      series.push({ type: 'series', id: 'ds' + i, name, cat: 's' + (i % scats.length), img: DemoProvider.poster(name, i + 200), year: 2026 - (i % 6), rating: 6 + (i * 7 % 30) / 10, added: 1e9 - i });
    }
    const chNames = ['DOOM News', 'Planet Docs', 'Kids Fun', 'Sports One', 'Sports Two', 'Cinema 24', 'World Report', 'Nature HD', 'Cartoon Land', 'Arena Live', 'Classic Movies', 'Science Now'];
    for (let i = 0; i < 36; i++) {
      const name = chNames[i % chNames.length] + (i >= chNames.length ? ' ' + (Math.floor(i / chNames.length) + 1) : '');
      live.push({ type: 'live', id: 'dl' + i, name, cat: 'l' + (i % lcats.length), img: DemoProvider.poster(name, i + 400, true), num: i + 1, archive: i % 3 === 0, archiveDays: 3, added: 1e9 - i });
    }
    k++;
    return { movies: { cats: cat(mcats, 'movies'), items: movies }, series: { cats: cat(scats, 'series'), items: series }, live: { cats: cat(lcats, 'live'), items: live } };
  }
  async movieInfo(id) {
    const n = +String(id).replace(/\D/g, '');
    return { plot: 'A sample story generated for demo mode. Connect a real subscription to see actual movie information, cast and trailers.', cast: 'Demo Actor, Sample Star', director: 'Demo Director', genre: ['Adventure', 'Family', 'Drama', 'Comedy'][n % 4], duration: '01:3' + (n % 10) + ':00', rating: 5 + (n * 13 % 40) / 10 };
  }
  async seriesInfo(id) {
    const n = +String(id).replace(/\D/g, ''); const seasons = {};
    for (let s = 1; s <= 2 + (n % 3); s++) {
      seasons[s] = Array.from({ length: 6 + (n + s) % 5 }, (_, e) => ({ type: 'episode', id: `de${n}_${s}_${e + 1}`, seriesId: String(id), season: s, episode: e + 1, name: `Episode ${e + 1}`, ext: 'demo', plot: 'Sample episode description.', duration: '45:00' }));
    }
    return { plot: 'A sample series for demo mode.', cast: 'Demo Cast', genre: 'Drama', rating: 7.5, seasons };
  }
  async shortEpg() {
    const now = Date.now(); const st = now - (now % 1800000);
    return ['Morning Show', 'World Today', 'Documentary Hour', 'Evening Talk'].map((title, i) => ({ title, desc: 'Demo program', start: st + i * 1800000, end: st + (i + 1) * 1800000 }));
  }
  async epgTable(id) {
    const now = Date.now(); const st = now - (now % 1800000) - 12 * 1800000;
    const titles = ['Morning Show', 'World Today', 'Documentary Hour', 'Evening Talk', 'Kids Corner', 'Sports Desk', 'Cinema Classics', 'Science Now'];
    return Array.from({ length: 20 }, (_, i) => ({ title: titles[i % titles.length], desc: 'Demo program', start: st + i * 1800000, end: st + (i + 1) * 1800000, archive: true }));
  }
  catchupUrl(item, startMs, minutes) { return 'demo:catchup:' + item.id + ':' + encodeURIComponent(item.name + ' (catch-up)'); }
  streamUrl(item) { return 'demo:' + item.type + ':' + item.id + ':' + encodeURIComponent(item.name || ''); }
}

const Providers = { xtream: XtreamProvider, m3u: M3UProvider, demo: DemoProvider };

/* ---------------- playlists (multiple subscriptions: separate or merged) ---------------- */
const Playlists = {
  _all: null,
  all() { return this._all || (this._all = LS.get('playlists', [])); }, // cached: read once, not per item
  save(list) { this._all = list; LS.set('playlists', list); this._c = {}; },
  get(id) { return this.all().find(p => p.id === id) || null; },
  activeId() { const id = LS.get('activePlaylist', null); return this.get(id) ? id : (this.all()[0] && this.all()[0].id) || null; },
  active() { return this.get(this.activeId()); },
  setActive(id) { LS.set('activePlaylist', id); LS.set('viewMode', 'single'); },
  /* view mode: 'single' = one subscription at a time, 'merged' = all included subscriptions combined */
  mode() { return this.all().length > 1 ? LS.get('viewMode', 'single') : 'single'; },
  setMerged() { LS.set('viewMode', 'merged'); },
  scopeId() { return this.mode() === 'merged' ? 'merged' : this.activeId(); },
  inScope() { return this.mode() === 'merged' ? this.all().filter(p => p.merge !== false) : [this.active()].filter(Boolean); },
  update(id, patch) { const l = this.all(); const p = l.find(x => x.id === id); if (p) Object.assign(p, patch); this.save(l); return p; },
  add(p) { p.id = p.id || uid(); p.merge = true; const l = this.all(); l.push(p); this.save(l); this.setActive(p.id); return p; },
  remove(id) { this.save(this.all().filter(p => p.id !== id)); if (LS.get('activePlaylist') === id) LS.del('activePlaylist'); IDB.del('cache', 'cat:' + id).catch(() => {}); Accounts.drop(id); },
  provider(p) { if (p === '__free' || (p && p.id === '__free')) return FREE_PROVIDER; if (typeof p === 'string') p = this.get(p); p = p || this.active(); if (!p) return null; this._c = this._c || {}; const k = p.id + JSON.stringify(p); return this._c[k] || (this._c[k] = new Providers[p.type](p)); },
  label(id) { if (id === '__free') return t('free'); const p = this.get(id); return p ? p.name || p.username || p.type : '?'; }
};
const provOf = it => Playlists.provider((it && it.pl) || Playlists.activeId());

/* account info (status, expiry, connections) per subscription */
const Accounts = {
  map: LS.get('accounts', {}),
  get(id) { return this.map[id] || null; },
  set(id, info) { this.map[id] = Object.assign({ ts: Date.now() }, info); LS.set('accounts', this.map); },
  drop(id) { delete this.map[id]; LS.set('accounts', this.map); },
  async refresh(id) {
    try { const info = await Playlists.provider(id).account(); this.set(id, info); return info; }
    catch (e) { this.set(id, Object.assign({}, this.get(id) || {}, { error: true })); throw e; }
  },
  async refreshAll() { await Promise.allSettled(Playlists.all().map(p => this.refresh(p.id))); },
  daysLeft(id) { const a = this.get(id); return a && a.exp ? Math.ceil((a.exp - Date.now()) / 86400000) : null; }
};

/* catalog loading, caching and merging */
const normName = s => String(s || '').toLowerCase().replace(/^\s*(hq|4k|fhd|hd|sd|vip)\s*[|:-]\s*/i, '').replace(/\(\d{4}\)/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const Catalog = {
  async load(p, force) {
    const key = 'cat:' + p.id;
    let cached = null; try { cached = await IDB.get('cache', key); } catch {}
    const maxAge = (Settings.get('refreshHours') || 12) * 3600000;
    if (cached && !force) return { data: cached.data, ts: cached.ts, stale: Date.now() - cached.ts > maxAge };
    const data = await Playlists.provider(p).catalog();
    for (const sec of ['movies', 'series', 'live']) for (const it of data[sec].items) it.pl = p.id;
    const ts = Date.now();
    try { await IDB.put('cache', key, { ts, data }); } catch (e) { console.warn('cache write', e); }
    return { data, ts, stale: false };
  },
  merge(parts) {
    if (parts.length === 1) return parts[0];
    const out = { movies: { cats: [], items: [] }, series: { cats: [], items: [] }, live: { cats: [], items: [] } };
    for (const sec of ['movies', 'series', 'live']) {
      const catByName = new Map(); const seen = new Map();
      for (const part of parts) {
        const local = new Map(part[sec].cats.map(c => [c.id, c]));
        for (const c of part[sec].cats) {
          const k = normName(c.name) || c.name;
          if (!catByName.has(k)) { const nc = { id: 'x' + catByName.size, name: c.name, type: sec }; catByName.set(k, nc); out[sec].cats.push(nc); }
        }
        for (const it of part[sec].items) {
          const c = local.get(it.cat); const nc = c ? catByName.get(normName(c.name) || c.name) : null;
          const dk = normName(it.name) + '|' + (it.year || '');
          const ex = seen.get(dk);
          if (ex && ex.pl !== it.pl) { (ex.alts = ex.alts || []).push({ pl: it.pl, id: it.id, ext: it.ext, url: it.url, _eps: it._eps }); continue; }
          const copy = Object.assign({}, it, { cat: nc ? nc.id : it.cat });
          seen.set(dk, copy); out[sec].items.push(copy);
        }
      }
    }
    return out;
  }
};

/* ---------------- user data: progress, lists, hidden cats ---------------- */
const keyOf = it => it.type + ':' + (it.pl || '') + ':' + it.id;
const Progress = {
  map: LS.get('progress', {}),
  get(it) { return this.map[keyOf(it)] || null; },
  set(it, pos, dur) {
    const k = keyOf(it);
    if (!dur || !isFinite(dur)) return;
    const done = pos / dur > 0.93;
    this.map[k] = { pos: done ? 0 : pos, dur, done: done || (this.map[k] && this.map[k].done) || false, ts: Date.now(),
      item: { type: it.type, id: it.id, pl: it.pl, name: it.name, img: it.img, seriesId: it.seriesId, season: it.season, episode: it.episode, ext: it.ext, url: it.url, seriesName: it.seriesName, seriesImg: it.seriesImg } };
    this.saveSoon();
  },
  saveSoon: debounce(function () { LS.set('progress', Progress.map); }, 800),
  continueList() {
    const v = Object.values(this.map).filter(p => !p.done && p.pos > 15 && p.item).sort((a, b) => b.ts - a.ts);
    const seen = new Set(); const out = [];
    for (const p of v) { const k = p.item.seriesId ? 'S' + p.item.seriesId : keyOf(p.item); if (seen.has(k)) continue; seen.add(k); out.push(p); }
    return out.slice(0, 60);
  },
  clear() { this.map = {}; LS.set('progress', {}); }
};

const Lists = {
  data: LS.get('lists', null) || [{ id: 'fav', name: null, items: [] }],
  save() { LS.set('lists', this.data); },
  name(l) { return l.name || t('favDefault'); },
  create(name) { const l = { id: uid(), name, items: [] }; this.data.push(l); this.save(); return l; },
  rename(id, name) { const l = this.data.find(x => x.id === id); if (l) { l.name = name; this.save(); } },
  remove(id) { if (id === 'fav') return; this.data = this.data.filter(l => l.id !== id); this.save(); },
  has(listId, it) { const l = this.data.find(x => x.id === listId); return !!(l && l.items.some(x => keyOf(x) === keyOf(it))); },
  inAny(it) { return this.data.some(l => l.items.some(x => keyOf(x) === keyOf(it))); },
  toggle(listId, it) {
    const l = this.data.find(x => x.id === listId); if (!l) return false;
    const k = keyOf(it); const i = l.items.findIndex(x => keyOf(x) === k);
    if (i >= 0) { l.items.splice(i, 1); this.save(); return false; }
    l.items.push({ type: it.type, id: it.id, pl: it.pl || Playlists.activeId(), name: it.name, img: it.img || it.seriesImg || '', cat: it.cat, ext: it.ext, url: it.url, seriesId: it.seriesId, season: it.season, episode: it.episode, seriesName: it.seriesName, year: it.year, rating: it.rating, num: it.num, ts: Date.now() });
    this.save(); return true;
  },
  move(listId, from, to) {
    const l = this.data.find(x => x.id === listId); if (!l) return;
    to = Math.max(0, Math.min(l.items.length - 1, to)); if (from === to) return;
    const [x] = l.items.splice(from, 1); l.items.splice(to, 0, x); this.save();
  },
  setOrder(listId, keys) {
    const l = this.data.find(x => x.id === listId); if (!l) return;
    const map = new Map(l.items.map(x => [keyOf(x), x]));
    const ordered = keys.map(k => map.get(k)).filter(Boolean);
    l.items = ordered.concat(l.items.filter(x => !keys.includes(keyOf(x)))); this.save();
  }
};

const Hidden = {
  data: LS.get('hiddenCats', {}),
  key(sec, id) { return Playlists.scopeId() + ':' + sec + ':' + id; },
  is(sec, id) { return !!this.data[this.key(sec, id)]; },
  ver: 0,
  toggle(sec, id) { const k = this.key(sec, id); if (this.data[k]) delete this.data[k]; else this.data[k] = 1; this.ver++; LS.set('hiddenCats', this.data); },
  set(sec) { const p = Playlists.scopeId() + ':' + sec + ':'; const s = new Set(); for (const k in this.data) if (k.startsWith(p)) s.add(k.slice(p.length)); return s; },
  count(sec) { const p = Playlists.scopeId() + ':' + sec + ':'; return Object.keys(this.data).filter(k => k.startsWith(p)).length; }
};

/* ---------------- parental controls ---------------- */
const Parental = {
  d: Object.assign({ enabled: false, pin: null, allowed: {}, dailyMin: 0, from: '', to: '', used: {} }, LS.get('parental', {})),
  save() { this.ver = (this.ver || 0) + 1; LS.set('parental', this.d); },
  today() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); },
  overrideUntil: 0,
  catAllowed(sec, cat) {
    if (!this.d.enabled) return true;
    const k = Playlists.scopeId() + ':' + sec;
    const set = this.d.allowed[k];
    if (!set) return true; // nothing configured = all allowed
    return !!set[cat.id];
  },
  ver: 0,
  setAllowed(sec, map) { this.d.allowed[Playlists.scopeId() + ':' + sec] = map; this.ver++; this.save(); },
  getAllowed(sec) { return this.d.allowed[Playlists.scopeId() + ':' + sec] || null; },
  async checkPin(pin) { return !!this.d.pin && (await sha256('doom:' + pin)) === this.d.pin; },
  async setPin(pin) { this.d.pin = await sha256('doom:' + pin); this.save(); },
  addUsage(sec) { const k = this.today(); this.d.used = { [k]: (this.d.used[k] || 0) + sec }; this.saveSoon(); },
  saveSoon: debounce(function () { Parental.save(); }, 3000),
  usedToday() { return (this.d.used[this.today()] || 0); },
  blockReason() {
    if (!this.d.enabled || Date.now() < this.overrideUntil) return null;
    if (this.d.dailyMin > 0 && this.usedToday() >= this.d.dailyMin * 60) return 'timeUp';
    if (this.d.from && this.d.to) {
      const now = new Date(); const m = now.getHours() * 60 + now.getMinutes();
      const [fh, fm] = this.d.from.split(':').map(Number), [th, tm] = this.d.to.split(':').map(Number);
      const a = fh * 60 + fm, b = th * 60 + tm;
      const ok = a <= b ? (m >= a && m < b) : (m >= a || m < b);
      if (!ok) return 'outsideHours';
    }
    return null;
  }
};

/* ---------------- connection accounting (respects each subscription's limit) ---------------- */
const Conn = {
  streams: new Map(), // id -> {kind, pl}
  open(id, kind, pl) { this.streams.set(id, { kind, pl }); },
  close(id) { this.streams.delete(id); },
  count(pl) { let n = 0; for (const [, v] of this.streams) if (v.pl === pl) n++; return n; },
  /* true if one more concurrent stream on subscription `pl` stays within its allowed connections */
  async canOpenExtra(pl) {
    const prov = Playlists.provider(pl); if (!prov) return { ok: false, max: 0 };
    let acc = Accounts.get(pl) || {}; let max = acc.max || 1, serverActive = 0;
    try { acc = await prov.account(); Accounts.set(pl, acc); max = acc.max || max; serverActive = acc.active || 0; } catch {}
    const local = this.count(pl);
    const others = Math.max(0, serverActive - local);
    return { ok: local + others + 1 <= max, max };
  }
};
