/* DOOM IPTV — speed test (internet + your IPTV server) and "add from phone" */
'use strict';

Object.assign(I18N.en, {
  speedTest: 'Speed test', stStart: 'Start test', stAgain: 'Test again', stStop: 'Stop', stPing: 'Ping', stJitter: 'Jitter', stDown: 'Download', stUp: 'Upload',
  stServer: 'Your IPTV server', stServerSpeed: 'Server speed', stServerPing: 'Server response', stNoServer: 'Add an Xtream subscription to test your IPTV server',
  stServerFail: 'Could not test the server from here', stInternet: 'Internet', stRunning: 'Testing…', stVerdict: 'Good for', stUsage: 'Uses about 40 MB of data.',
  q4k: '4K', qFhd: 'Full HD', qHd: 'HD', qSd: 'SD only', qBad: 'Too slow for smooth playback', stWhy: 'Live TV needs about: SD 3 · HD 5 · Full HD 10 · 4K 25 Mbps',
  fromPhone: 'Enter details from your phone', fromPhoneTitle: 'Add from your phone', fromPhoneSteps: 'Scan this code with your phone camera, type the subscription details on your phone and press “Send to TV”.',
  fromPhoneWifi: 'Your phone and TV must be on the same Wi-Fi.', fromPhoneNoLan: 'This TV is not connected to a home network (Wi-Fi or cable).',
  fromPhoneOnlyApp: 'This works in the Android / Android TV app.', fromPhoneGot: 'Received from your phone — checking…', fromPhoneOk: 'Subscription added ✓'
});
Object.assign(I18N.ar, {
  speedTest: 'اختبار السرعة', stStart: 'ابدأ الاختبار', stAgain: 'اختبار مرة أخرى', stStop: 'إيقاف', stPing: 'زمن الاستجابة', stJitter: 'التذبذب', stDown: 'التحميل', stUp: 'الرفع',
  stServer: 'سيرفر الـ IPTV', stServerSpeed: 'سرعة السيرفر', stServerPing: 'استجابة السيرفر', stNoServer: 'أضف اشتراك Xtream لاختبار سيرفر الـ IPTV',
  stServerFail: 'تعذر اختبار السيرفر من هنا', stInternet: 'الإنترنت', stRunning: 'جارِ الاختبار…', stVerdict: 'مناسب لـ', stUsage: 'يستهلك حوالي 40 ميجا من الباقة.',
  q4k: '4K', qFhd: 'Full HD', qHd: 'HD', qSd: 'SD فقط', qBad: 'بطيء جداً للتشغيل بدون تقطيع', stWhy: 'البث يحتاج تقريباً: SD 3 · HD 5 · Full HD 10 · 4K 25 ميجابت',
  fromPhone: 'إدخال البيانات من الموبايل', fromPhoneTitle: 'الإضافة من الموبايل', fromPhoneSteps: 'امسح الكود بكاميرا الموبايل، واكتب بيانات الاشتراك على الموبايل ثم اضغط «إرسال للتلفزيون».',
  fromPhoneWifi: 'لازم الموبايل والتلفزيون يكونوا على نفس شبكة الواي فاي.', fromPhoneNoLan: 'التلفزيون غير متصل بشبكة منزلية (واي فاي أو كابل).',
  fromPhoneOnlyApp: 'هذه الخاصية تعمل في تطبيق أندرويد / أندرويد TV.', fromPhoneGot: 'وصلت البيانات من الموبايل — جاري التحقق…', fromPhoneOk: 'تمت إضافة الاشتراك ✓'
});

const SpeedTest = {
  base: 'https://speed.cloudflare.com', running: false, ctrl: null,
  mbps: (bytes, ms) => (bytes * 8) / (ms / 1000) / 1e6,
  async ping(url, n = 8) {
    const t = [];
    for (let i = 0; i < n && this.running; i++) {
      const t0 = performance.now();
      try { await (await fetch(url + (url.includes('?') ? '&' : '?') + 'r=' + Math.random(), { cache: 'no-store', signal: this.ctrl.signal })).arrayBuffer(); t.push(performance.now() - t0); } catch (e) { if (!this.running) break; }
    }
    if (!t.length) return null;
    t.sort((a, b) => a - b); const med = t[Math.floor(t.length / 2)];
    const jit = t.length > 1 ? t.slice(1).reduce((s, v, i) => s + Math.abs(v - t[i]), 0) / (t.length - 1) : 0;
    return { ping: med, jitter: jit };
  },
  /* download with live progress when the platform streams the body */
  /* download for at most maxMs; measures what actually arrived (a server may stall or send less than promised) */
  async download(url, onRate, headers, maxMs = 10000) {
    const t0 = performance.now(); let got = 0;
    const r = await fetch(url, { cache: 'no-store', signal: this.ctrl.signal, headers });
    if (!r.ok && r.status !== 206) throw new Error('HTTP ' + r.status);
    if (r.body && r.body.getReader) {
      const rd = r.body.getReader(); let timer; const stop = new Promise(res => { timer = setTimeout(() => res({ done: true, timeout: true }), maxMs); });
      try {
        for (;;) {
          const x = await Promise.race([rd.read(), stop]); if (x.done) break;
          got += x.value.byteLength; const ms = performance.now() - t0; if (ms > 200) onRate && onRate(this.mbps(got, ms));
          if (!this.running) break;
        }
      } finally { clearTimeout(timer); try { rd.cancel(); } catch {} }
    } else got = (await r.arrayBuffer()).byteLength;
    return { bytes: got, ms: performance.now() - t0 };
  },
  async run(ui) {
    this.running = true; this.ctrl = new AbortController(); const res = {};
    try {
      ui.phase(t('stPing')); res.net = await this.ping(this.base + '/__down?bytes=0'); ui.update(res);
      ui.phase(t('stDown'));
      let best = 0;
      for (const size of [1e6, 5e6, 15e6, 25e6]) { // grow until a transfer takes long enough to be meaningful
        if (!this.running) break;
        const r = await this.download(this.base + '/__down?bytes=' + size, v => ui.live(v));
        const v = this.mbps(r.bytes, r.ms); best = Math.max(best, v); res.down = best; ui.update(res);
        if (r.ms > 4000) break;
      }
      if (this.running) {
        ui.phase(t('stUp'));
        const body = new Uint8Array(4e6); const t0 = performance.now();
        try { await (await fetch(this.base + '/__up', { method: 'POST', body, cache: 'no-store', signal: this.ctrl.signal })).text(); res.up = this.mbps(body.byteLength, performance.now() - t0); } catch {}
        ui.update(res);
      }
      // the IPTV server itself: response time + real download speed of a movie file
      const p = Playlists.active();
      if (this.running && p && p.type === 'xtream') {
        ui.phase(t('stServer')); res.server = {};
        const prov = Playlists.provider(p);
        try { const t0 = performance.now(); await prov.account(); res.server.ping = performance.now() - t0; } catch {}
        ui.update(res);
        const movie = App.data && App.data.movies.items.find(x => x.pl === p.id && x.ext);
        const live = App.data && App.data.live.items.find(x => x.pl === p.id);
        try {
          if (movie) { const r = await this.download(prov.streamUrl(movie), v => ui.live(v), { Range: 'bytes=0-' + (isNative() ? 7999999 : 24999999) }); if (r.bytes > 0) res.server.down = this.mbps(r.bytes, r.ms); }
          else if (live) { // live stream: read for 6 seconds
            const stop = setTimeout(() => this.ctrl.abort(), 6000); const t0 = performance.now(); let got = 0;
            try { const r = await fetch(prov.streamUrl(live, { format: 'ts' }), { cache: 'no-store', signal: this.ctrl.signal }); const rd = r.body.getReader(); for (;;) { const { done, value } = await rd.read(); if (done) break; got += value.byteLength; } } catch {}
            clearTimeout(stop); res.server.down = this.mbps(got, performance.now() - t0);
          }
        } catch (e) { res.server.error = true; }
        ui.update(res);
      } else res.noServer = true;
    } catch (e) { console.warn('speed test', e); res.error = true; }
    this.running = false; ui.done(res); return res;
  },
  stop() { this.running = false; try { this.ctrl && this.ctrl.abort(); } catch {} },
  verdict(m) { return m >= 25 ? t('q4k') : m >= 10 ? t('qFhd') : m >= 5 ? t('qHd') : m >= 3 ? t('qSd') : t('qBad'); }
};

const SpeedPage = {
  render(app) {
    app.setTitle(t('speedTest')); const c = app.content; c.innerHTML = '';
    const fmt = v => v == null ? '—' : v >= 100 ? Math.round(v) : v.toFixed(1);
    const page = h('div', { class: 'st-page' });
    page.innerHTML = `<div class="st-gauge"><div class="st-num">—</div><div class="st-unit">Mbps</div><div class="st-phase muted"></div></div>
      <button class="btn primary st-go">${ic('speed')} ${t('stStart')}</button><p class="muted small center">${t('stUsage')}</p>
      <div class="st-grid"><div class="st-card"><small>${t('stInternet')} · ${t('stDown')}</small><b data-k="down">—</b></div><div class="st-card"><small>${t('stUp')}</small><b data-k="up">—</b></div>
      <div class="st-card"><small>${t('stPing')}</small><b data-k="ping">—</b></div><div class="st-card"><small>${t('stJitter')}</small><b data-k="jitter">—</b></div>
      <div class="st-card wide"><small>${t('stServer')}${Playlists.active() ? ' · ' + esc(Playlists.active().name || '') : ''}</small><div class="st-row"><span>${t('stServerSpeed')}: <b data-k="sdown">—</b></span><span>${t('stServerPing')}: <b data-k="sping">—</b></span></div><div class="st-note muted small"></div></div></div>
      <div class="st-verdict"></div><p class="muted small center">${t('stWhy')}</p>`;
    c.appendChild(page);
    const $k = k => $(`[data-k="${k}"]`, page), num = $('.st-num', page), go = $('.st-go', page);
    const ui = {
      phase: p => { $('.st-phase', page).textContent = p; },
      live: v => { num.textContent = fmt(v); },
      update: r => {
        if (r.down != null) $k('down').textContent = fmt(r.down) + ' Mbps';
        if (r.up != null) $k('up').textContent = fmt(r.up) + ' Mbps';
        if (r.net) { $k('ping').textContent = Math.round(r.net.ping) + ' ms'; $k('jitter').textContent = Math.round(r.net.jitter) + ' ms'; }
        if (r.server) { if (r.server.down != null) $k('sdown').textContent = fmt(r.server.down) + ' Mbps'; if (r.server.ping != null) $k('sping').textContent = Math.round(r.server.ping) + ' ms'; }
      },
      done: r => {
        go.innerHTML = ic('speed') + ' ' + t('stAgain'); ui.phase('');
        const main = r.server && r.server.down != null ? Math.min(r.server.down, r.down || Infinity) : r.down;
        num.textContent = fmt(main);
        if (r.noServer) $('.st-note', page).textContent = t('stNoServer');
        else if (r.server && r.server.down == null) $('.st-note', page).textContent = t('stServerFail');
        if (main != null) { const v = $('.st-verdict', page); v.className = 'st-verdict ' + (main >= 10 ? 'good' : main >= 5 ? 'ok' : 'bad'); v.textContent = t('stVerdict') + ': ' + SpeedTest.verdict(main); }
        else if (r.error) $('.st-verdict', page).textContent = t('errLogin');
      }
    };
    go.addEventListener('click', () => {
      if (SpeedTest.running) { SpeedTest.stop(); return; }
      ['down', 'up', 'ping', 'jitter', 'sdown', 'sping'].forEach(k => { $k(k).textContent = '—'; }); $('.st-verdict', page).textContent = ''; $('.st-note', page).textContent = '';
      go.innerHTML = ic('stop') + ' ' + t('stStop'); SpeedTest.run(ui);
    });
    if (document.body.classList.contains('tv')) setTimeout(() => go.focus(), 60);
  }
};

/* ---------- "Add from your phone" (Android app: the TV serves a small form on the home Wi-Fi) ---------- */
const PhonePair = {
  modal: null,
  open() {
    const lan = window.DOOM_LAN;
    const body = h('div', { class: 'pair' });
    if (!lan) body.append(h('p', {}, t('fromPhoneOnlyApp')));
    else if (!lan.url) body.append(h('p', {}, t('fromPhoneNoLan')));
    else {
      let svg = ''; try { svg = QR.svg(lan.url, 260); } catch {}
      body.append(h('div', { class: 'pair-qr', html: svg }), h('p', {}, t('fromPhoneSteps')), h('p', { class: 'muted small' }, '📶 ' + t('fromPhoneWifi')), h('div', { class: 'pair-url' }, lan.url));
    }
    this.modal = UI.modal(t('fromPhoneTitle'), body, { onClose: () => { this.modal = null; } });
  },
  async receive(d) {
    if (!d || (d.type !== 'xtream' && d.type !== 'm3u')) return;
    UI.toast('📱 ' + t('fromPhoneGot'));
    const p = { type: d.type, name: d.name || (d.type === 'xtream' ? d.username : 'IPTV') || 'IPTV' };
    if (d.type === 'xtream') Object.assign(p, { server: d.server, username: d.username, password: d.password }); else Object.assign(p, { url: d.url, maxConnections: 1 });
    try {
      if (p.type === 'xtream') { const info = await new XtreamProvider(p).account(); p.id = uid(); Accounts.set(p.id, info); }
      Playlists.add(p); LS.del('freeOnly');
      if (this.modal) this.modal.close();
      UI.toast(t('fromPhoneOk')); setTimeout(() => location.reload(), 900);
    } catch (e) {
      UI.alert(t('fromPhoneTitle'), (e && e.cors ? t('errCors') : t('errLogin')) + '\n' + (p.server || p.url || ''));
    }
  }
};
window.DOOM_REMOTE_ADD = d => PhonePair.receive(d);
window.addEventListener('doom-lan', () => { if (PhonePair.modal && window.DOOM_LAN && window.DOOM_LAN.url && !$('.pair-qr', PhonePair.modal.box)) { PhonePair.modal.close(); PhonePair.open(); } });
