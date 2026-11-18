#!/usr/bin/env python3
"""
DOOM IPTV — Free IPTV catalogue builder.

Collects free channels, movies and series from the open sources in sources.json, classifies them
(sports, news, movies, series, kids, arabic, adult ...), checks every link and writes the result to
free/*.json (read by the app) and free/m3u/*.m3u (usable in any player).

Runs once a day in GitHub Actions (.github/workflows/free-iptv.yml). A link that fails on
`strikes_to_remove` consecutive daily checks is dropped automatically; new links are only
published after they pass a check. Standard library only.

Usage:  python3 scripts/free_iptv/build.py [--config path] [--out dir] [--no-check]
"""
import argparse, concurrent.futures as cf, datetime, html, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36'
ARAB = {'sa', 'ae', 'eg', 'qa', 'kw', 'bh', 'om', 'jo', 'lb', 'sy', 'iq', 'ye', 'ps', 'ly', 'tn', 'dz', 'ma', 'sd', 'so', 'mr', 'dj', 'km'}
CAT_NAMES = {
    'sports': 'Sports', 'news': 'News', 'movies': 'Movies', 'series': 'Series', 'kids': 'Kids', 'animation': 'Animation', 'documentary': 'Documentary',
    'music': 'Music', 'entertainment': 'Entertainment', 'religious': 'Religious', 'general': 'General', 'comedy': 'Comedy', 'family': 'Family',
    'education': 'Education', 'science': 'Science', 'business': 'Business', 'lifestyle': 'Lifestyle', 'cooking': 'Cooking', 'travel': 'Travel',
    'culture': 'Culture', 'classic': 'Classic', 'outdoor': 'Outdoor', 'auto': 'Auto', 'weather': 'Weather', 'legislative': 'Legislative',
    'public': 'Public', 'relax': 'Relax', 'shop': 'Shopping', 'woman': 'Woman', 'interactive': 'Interactive', 'adult': 'Adult', 'drama': 'Drama',
    'horror': 'Horror', 'western': 'Western', 'action': 'Action', 'crime': 'Crime', 'scifi': 'Sci-Fi', 'romance': 'Romance', 'war': 'War'
}
KEYWORDS = [  # name-based guess for channels without category data
    ('sports', r'sport|kora|koora|football|soccer|racing|fight|wwe|golf|tennis|nba|nfl|espn|bein|ssc|ad sports|dubai sports|رياض'),
    ('news', r'news|akhbar|خبار|jazeera|arabiya|cnn|bbc world|sky news|france ?24|euronews|dw|rt |trt world|cnbc|bloomberg|aljazeera|alhadath|asharq'),
    ('kids', r'kids|kid |junior|cartoon|toon|baby|nick|disney|spacetoon|majid|أطفال|براعم'),
    ('movies', r'movie|cinema|film|aflam|أفلام|سينما'),
    ('series', r'series|drama|مسلسل|دراما'),
    ('music', r'music|mtv|hits|radio|rotana clip|mazzika|أغاني'),
    ('documentary', r'docu|discovery|nat ?geo|history|nature|wild|وثائقي'),
    ('religious', r'quran|qur|sunnah|iqraa|islam|church|god|قرآن|القرآن|السنة'),
]
ADULT_RX = re.compile(r'\b(xxx|porn|erotic|nude|nudist|adult only|18\+|sex)\b', re.I)
GENRES = [('horror', r'horror|zombie|vampire|monster'), ('western', r'western|cowboy'), ('comedy', r'comedy|comedies'), ('crime', r'crime|noir|detective|gangster'),
          ('scifi', r'science fiction|sci-?fi'), ('romance', r'romance|romantic'), ('war', r'\bwar\b|military'), ('action', r'action|adventure'),
          ('documentary', r'documentary'), ('animation', r'animation|cartoon'), ('drama', r'drama')]


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def fetch(url, timeout=30, headers=None, limit=None):
    req = urllib.request.Request(url, headers=dict({'User-Agent': UA, 'Accept': '*/*'}, **(headers or {})))
    with urllib.request.urlopen(req, timeout=timeout) as r:
        data = r.read(limit) if limit else r.read()
        return r.status, r.headers, data


def fetch_json(url, timeout=60):
    return json.loads(fetch(url, timeout)[2].decode('utf-8', 'replace'))


def now_iso():
    return datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat()


def norm(s):
    return re.sub(r'[^\w]+', ' ', str(s or '').lower(), flags=re.U).strip()


def guess_cats(name):
    out = [c for c, rx in KEYWORDS if re.search(rx, name or '', re.I)]
    return out or ['general']


def playable(url, referrer=None, ua=None):
    """Links that need custom headers or DASH can't be played by a browser / WebView player."""
    if referrer or ua:
        return False
    u = url.lower().split('?')[0]
    if u.endswith('.mpd') or url.startswith(('rtmp', 'rtsp', 'udp', 'mms')) or 'youtube.com' in u or 'youtu.be' in u:
        return False
    return url.startswith(('http://', 'https://'))


# ---------------------------------------------------------------- sources
def src_iptv_org(src):
    base = src['base'].rstrip('/') + '/'
    channels = {c['id']: c for c in fetch_json(base + 'channels.json')}
    streams = fetch_json(base + 'streams.json')
    try:
        feeds = fetch_json(base + 'feeds.json')
    except Exception:
        feeds = []
    try:
        logos = fetch_json(base + 'logos.json')
    except Exception:
        logos = []
    feed_lang, main_lang = {}, {}
    for f in feeds:
        feed_lang[(f.get('channel'), f.get('id'))] = f.get('languages') or []
        if f.get('is_main'):
            main_lang[f.get('channel')] = f.get('languages') or []
    logo = {}
    for l in logos:
        ch = l.get('channel')
        if ch and (ch not in logo or not l.get('feed')):
            logo[ch] = l.get('url')
    out = {}
    skipped = 0
    for s in streams:
        url = s.get('url') or ''
        if not playable(url, s.get('referrer'), s.get('user_agent')):
            skipped += 1
            continue
        ch = channels.get(s.get('channel')) if s.get('channel') else None
        if ch and ch.get('closed'):
            continue
        name = (ch or {}).get('name') or s.get('title') or 'Channel'
        feed = s.get('feed')
        if feed and ch and feed_lang.get((ch['id'], feed)) is not None and s.get('title') and s.get('title') != name:
            name = s.get('title')
        cats = [c for c in ((ch or {}).get('categories') or []) if c != 'xxx'] or guess_cats(name)
        if (ch or {}).get('is_nsfw') or 'xxx' in ((ch or {}).get('categories') or []):
            cats = ['adult']
        cc = ((ch or {}).get('country') or '').lower()
        langs = feed_lang.get(((ch or {}).get('id'), feed)) or main_lang.get((ch or {}).get('id')) or []
        key = (ch['id'] + '@' + (feed or '')) if ch else 'iptv-org:' + norm(name)
        it = out.get(key)
        if not it:
            it = out[key] = {'id': 'io:' + key, 'n': name, 'l': logo.get((ch or {}).get('id'), '') or '', 'c': cats, 'cc': cc, 'lg': langs, 'u': [], 'q': s.get('quality') or '', 's': src['id']}
        if url not in it['u']:
            it['u'].append(url)
        if 'Geo-blocked' in (s.get('labels') or []):
            it['g'] = 1
    log(f'  iptv-org: {len(out)} channels ({skipped} links skipped: need custom headers / DASH / YouTube)')
    return {'live': list(out.values())}


def src_m3u(src, iptv_ids=None, countries=None):
    txt = fetch(src['url'], 60)[2].decode('utf-8', 'replace')
    out = {}
    cur = None
    attr = lambda line, k: (re.search(k + r'="([^"]*)"', line, re.I) or [None, ''])[1]
    for raw in txt.splitlines():
        line = raw.strip()
        if line.startswith('#EXTINF'):
            cur = {'name': line.rsplit(',', 1)[-1].strip(), 'logo': attr(line, 'tvg-logo'), 'group': attr(line, 'group-title'), 'tid': attr(line, 'tvg-id')}
        elif line and not line.startswith('#') and cur:
            if playable(line):
                name = re.sub(r'\s*[Ⓖ Ⓨ Ⓢ Ⓟ]\s*$', '', cur['name']).strip() or cur['name']
                ref = (iptv_ids or {}).get(cur['tid'].split('@')[0]) if cur['tid'] else None
                cats = [c for c in (ref or {}).get('categories', []) if c != 'xxx'] or guess_cats(name + ' ' + cur['group'])
                cc = ((ref or {}).get('country') or (countries or {}).get(norm(re.sub(r'[^\w\s]', '', cur['group'])), '') or '').lower()
                key = norm(name) + '|' + cc
                it = out.setdefault(key, {'id': 'ft:' + key, 'n': name, 'l': cur['logo'], 'c': cats, 'cc': cc, 'lg': ['ara'] if cc in ARAB else [], 'u': [], 's': src['id']})
                if line not in it['u']:
                    it['u'].append(line)
            cur = None
    log(f'  {src["id"]}: {len(out)} channels')
    return {'live': list(out.values())}


def ia_files(api, ident):
    """Best playable mp4 per original video in an Internet Archive item."""
    md = fetch_json(f'{api}/metadata/{urllib.parse.quote(ident)}', 40)
    files = md.get('files') or []
    rank = {'h.264': 3, 'h.264 ia': 3, 'mpeg4': 2, 'h.264 hd': 4, '512kb mpeg4': 1}
    best = {}
    for f in files:
        n = f.get('name', '')
        fmt = (f.get('format') or '').lower()
        if not n.lower().endswith('.mp4') or fmt not in rank:
            continue
        key = f.get('original') or n
        if key not in best or rank[fmt] > best[key][0]:
            best[key] = (rank[fmt], n, f.get('title') or '')
    host = f'{api}/download/{urllib.parse.quote(ident)}/'
    vids = [(t or os.path.splitext(os.path.basename(n))[0].replace('_', ' '), host + urllib.parse.quote(n)) for _, n, t in sorted(best.values(), key=lambda x: x[1])]
    return md.get('metadata') or {}, vids


def clean_desc(d):
    if isinstance(d, list):
        d = ' '.join(map(str, d))
    d = html.unescape(re.sub(r'<[^>]+>', ' ', str(d or '')))
    return re.sub(r'\s+', ' ', d).strip()[:500]


def src_archive(src, workers):
    api = src.get('api', 'https://archive.org').rstrip('/')
    q = urllib.parse.urlencode([('q', src['query']), ('fl[]', 'identifier'), ('fl[]', 'title'), ('fl[]', 'year'), ('fl[]', 'description'), ('fl[]', 'subject'),
                                ('sort[]', 'downloads desc'), ('rows', str(src.get('rows', 200))), ('page', '1'), ('output', 'json')])
    docs = fetch_json(f'{api}/advancedsearch.php?{q}')['response']['docs']

    def one(d):
        try:
            md, vids = ia_files(api, d['identifier'])
        except Exception:
            return None
        if not vids:
            return None
        title = str(d.get('title') or md.get('title') or d['identifier'])
        subj = d.get('subject') or md.get('subject') or ''
        subj = ' '.join(subj) if isinstance(subj, list) else str(subj)
        desc = clean_desc(d.get('description') or md.get('description'))
        yr = re.search(r'(18|19|20)\d\d', str(d.get('year') or md.get('year') or md.get('date') or title))
        cats = [src['category']] if src.get('category') else [g for g, rx in GENRES if re.search(rx, subj + ' ' + title, re.I)][:2] or ['classic']
        if ADULT_RX.search(title + ' ' + subj):
            cats = ['adult']
        return {'id': 'ia:' + d['identifier'], 'n': title, 'p': f'{api}/services/img/{urllib.parse.quote(d["identifier"])}', 'y': int(yr.group(0)) if yr else None,
                'd': desc, 'c': cats, 'vids': vids, 's': src['id']}

    with cf.ThreadPoolExecutor(max(4, workers // 3)) as ex:
        items = [x for x in ex.map(one, docs) if x]
    if src.get('section') == 'series':
        shows = {}
        for it in items:  # group single-episode items into shows by their title prefix
            m = re.match(r'^(.*?)(?:\s*[-:–|]\s+|\s+(?:s\d+\s*e\d+|season\s*\d+|episode\s*\d+|ep\.?\s*\d+)\b)', it['n'], re.I)
            show = (m.group(1) if m and len(m.group(1)) > 2 else it['n']).strip()
            sh = shows.setdefault(norm(show), {'id': 'ias:' + norm(show).replace(' ', '_')[:60], 'n': show, 'p': it['p'], 'y': it['y'], 'd': it['d'], 'c': it['c'], 'eps': [], 's': src['id']})
            for title, url in it['vids']:
                ep_title = it['n'] if len(it['vids']) == 1 else title
                sh['eps'].append({'n': ep_title, 'u': url})
        res = list(shows.values())
        log(f'  {src["id"]}: {len(res)} shows / {sum(len(s["eps"]) for s in res)} episodes')
        return {'series': res}
    res = [dict({k: v for k, v in it.items() if k != 'vids'}, u=it['vids'][0][1]) for it in items]
    log(f'  {src["id"]}: {len(res)} movies')
    return {'movies': res}


# ---------------------------------------------------------------- link checks
def check_live(url, timeout):
    try:
        st, hd, body = fetch(url, timeout, limit=65536)
    except urllib.error.HTTPError as e:
        return 'restricted' if e.code in (401, 403, 451) else 'fail'
    except Exception:
        return 'fail'
    if st >= 400:
        return 'fail'
    text = body[:65536].decode('utf-8', 'ignore')
    ctype = (hd.get('Content-Type') or '').lower()
    if '#EXTM3U' in text:
        if '#EXT-X-STREAM-INF' in text:  # master playlist: the first variant must work too
            for ln in text.splitlines():
                ln = ln.strip()
                if ln and not ln.startswith('#'):
                    sub = urllib.parse.urljoin(url, ln)
                    try:
                        st2, _, b2 = fetch(sub, timeout, limit=65536)
                        t2 = b2.decode('utf-8', 'ignore')
                        return 'ok' if st2 < 400 and ('#EXTINF' in t2 or '#EXT-X-' in t2) else 'fail'
                    except urllib.error.HTTPError as e:
                        return 'restricted' if e.code in (401, 403, 451) else 'fail'
                    except Exception:
                        return 'fail'
            return 'fail'
        return 'ok' if '#EXTINF' in text or '#EXT-X-TARGETDURATION' in text else 'fail'
    if body[:1] == b'\x47' or ctype.startswith(('video/', 'audio/')) or 'mp2t' in ctype or 'octet-stream' in ctype:
        return 'ok'
    return 'fail'


def check_vod(url, timeout):
    try:
        st, hd, _ = fetch(url, timeout * 2, headers={'Range': 'bytes=0-2047'}, limit=2048)
        ctype = (hd.get('Content-Type') or '').lower()
        return 'ok' if st in (200, 206) and ('video' in ctype or 'octet' in ctype or 'mp4' in ctype) else 'fail'
    except urllib.error.HTTPError as e:
        return 'restricted' if e.code in (401, 403, 451) else 'fail'
    except Exception:
        return 'fail'


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--config', default=os.path.join(HERE, 'sources.json'))
    ap.add_argument('--out', default=os.path.join(ROOT, 'free'))
    ap.add_argument('--no-check', action='store_true', help='skip link checks (debug only)')
    args = ap.parse_args()
    cfg = json.load(open(args.config, encoding='utf-8'))
    out_dir = args.out
    os.makedirs(os.path.join(out_dir, 'm3u'), exist_ok=True)
    timeout, workers, strikes_max = cfg.get('check_timeout', 10), cfg.get('workers', 48), cfg.get('strikes_to_remove', 2)
    state_path = os.path.join(out_dir, 'state.json')
    state = json.load(open(state_path)) if os.path.exists(state_path) else {'links': {}, 'sources': {}}
    state.pop('snapshots', None)
    prev = {}  # yesterday's published lists: reused for a source that is down today
    for sec in ('live', 'movies', 'series'):
        try:
            prev[sec] = json.load(open(os.path.join(out_dir, sec + '.json'), encoding='utf-8'))['items']
        except Exception:
            prev[sec] = []
    t0 = time.time()

    # 1) collect
    collected = {'live': [], 'movies': [], 'series': []}
    src_report = []
    iptv_ids, countries = {}, {}
    for src in cfg['sources']:
        if not src.get('enabled', True):
            continue
        log(f'source {src["id"]} ...')
        sstate = state['sources'].setdefault(src['id'], {'fail_days': 0})
        try:
            if src['kind'] == 'iptv-org-api':
                res = src_iptv_org(src)
                try:
                    iptv_ids = {c['id']: c for c in fetch_json(src['base'].rstrip('/') + '/channels.json')}
                    countries = {norm(c['name']): c['code'] for c in fetch_json(src['base'].rstrip('/') + '/countries.json')}
                except Exception:
                    pass
            elif src['kind'] == 'm3u':
                res = src_m3u(src, iptv_ids, countries)
            elif src['kind'] == 'archive':
                res = src_archive(src, workers)
            else:
                continue
            sstate.update(fail_days=0, last_ok=now_iso())
            ok = True
        except Exception as e:  # source unreachable today: reuse its last good list for a few days
            log(f'  !! {src["id"]} failed: {e}')
            sstate['fail_days'] = sstate.get('fail_days', 0) + 1
            res = {sec: [x for x in prev[sec] if x.get('s') == src['id']] for sec in prev} if sstate['fail_days'] <= cfg.get('source_grace_days', 3) else {}
            ok = False
        for k in collected:
            collected[k].extend(res.get(k, []))
        src_report.append({'id': src['id'], 'name': src['name'], 'home': src.get('home', ''), 'ok': ok, 'fail_days': sstate.get('fail_days', 0),
                           'live': len(res.get('live', [])), 'movies': len(res.get('movies', [])), 'series': len(res.get('series', []))})

    # merge the same channel listed by two sources
    merged = {}
    for it in collected['live']:
        k = norm(it['n']) + '|' + it.get('cc', '')
        if k in merged:
            for u in it['u']:
                if u not in merged[k]['u']:
                    merged[k]['u'].append(u)
        else:
            merged[k] = it
    live = list(merged.values())
    for sec in ('movies', 'series'):  # the same archive item listed by two collections
        seen = set(); collected[sec] = [x for x in collected[sec] if not (x['id'] in seen or seen.add(x['id']))]

    # 2) check every link
    links = state['links']
    jobs = {}
    for it in live:
        for u in it['u']:
            jobs[u] = 'live'
    for it in collected['movies']:
        jobs[it['u']] = 'vod'
    for it in collected['series']:
        jobs[it['eps'][0]['u']] = 'vod'  # one episode per show keeps the daily run short
    log(f'checking {len(jobs)} links with {workers} workers ...')
    results = {}
    if args.no_check:
        results = {u: 'ok' for u in jobs}
    else:
        with cf.ThreadPoolExecutor(workers) as ex:
            futs = {ex.submit(check_live if kind == 'live' else check_vod, u, timeout): u for u, kind in jobs.items()}
            for i, f in enumerate(cf.as_completed(futs), 1):
                results[futs[f]] = f.result()
                if i % 1000 == 0:
                    log(f'  {i}/{len(jobs)}')
    today = now_iso()[:10]
    removed = []

    def keep(u):
        r = results.get(u, 'fail')
        st = links.get(u)
        if isinstance(st, dict):  # older format
            st = [st.get('f', 0), st.get('r', 0)]
        if r in ('ok', 'restricted'):
            links[u] = [0, 1 if r == 'restricted' else 0]
            return True
        if st is None:  # never worked: not published
            return False
        fails = st[0] + 1  # it worked before: give it `strikes_max` chances
        if fails < strikes_max:
            links[u] = [fails, st[1]]
            return True
        removed.append(u)
        links.pop(u, None)
        return False

    out_live = []
    for it in live:
        urls = [u for u in it['u'] if keep(u)]
        if not urls:
            continue
        urls.sort(key=lambda u: tuple(links.get(u, [0, 0])))
        it['u'] = urls
        if all(links.get(u, [0, 0])[1] for u in urls):
            it['g'] = 1
        if it.get('cc') in ARAB or 'ara' in (it.get('lg') or []):
            it['ar'] = 1
        out_live.append(it)
    out_movies = [it for it in collected['movies'] if keep(it['u'])]
    out_series = [it for it in collected['series'] if keep(it['eps'][0]['u'])]
    # forget links that no source lists any more
    alive = set(jobs)
    for u in list(links):
        if u not in alive:
            links.pop(u)

    out_live.sort(key=lambda x: (not x.get('ar'), x['n'].lower()))
    cat_count = {}
    for it in out_live:
        for c in it['c']:
            cat_count[c] = cat_count.get(c, 0) + 1
    vcat = {}
    for it in out_movies + out_series:
        for c in it['c']:
            vcat[c] = vcat.get(c, 0) + 1
    cats = lambda cc: [{'id': k, 'name': CAT_NAMES.get(k, k.title()), 'count': v} for k, v in sorted(cc.items(), key=lambda kv: -kv[1])]

    meta = {'v': 1, 'updated': now_iso(), 'checked_links': len(jobs), 'strikes_to_remove': strikes_max}
    def dump(name, obj):
        with open(os.path.join(out_dir, name), 'w', encoding='utf-8') as f:
            json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
    dump('live.json', dict(meta, cats=cats(cat_count), items=out_live))
    dump('movies.json', dict(meta, cats=cats({k: v for k, v in vcat.items() if any(k in m['c'] for m in out_movies)}), items=out_movies))
    dump('series.json', dict(meta, items=out_series))
    status = dict(meta, duration_sec=int(time.time() - t0), sources=src_report,
                  counts={'live': len(out_live), 'arabic': sum(1 for x in out_live if x.get('ar')), 'movies': len(out_movies), 'series': len(out_series),
                          'episodes': sum(len(s['eps']) for s in out_series)},
                  removed_today=len(removed), results={k: sum(1 for r in results.values() if r == k) for k in ('ok', 'restricted', 'fail')})
    with open(os.path.join(out_dir, 'status.json'), 'w', encoding='utf-8') as f:
        json.dump(status, f, ensure_ascii=False, indent=1)
    state['links'] = dict(sorted(links.items()))
    with open(state_path, 'w', encoding='utf-8') as f:
        json.dump(state, f, ensure_ascii=False, separators=(',', ':'), sort_keys=False)

    # 3) M3U exports for other players
    def m3u(name, items):
        with open(os.path.join(out_dir, 'm3u', name), 'w', encoding='utf-8') as f:
            f.write('#EXTM3U\n')
            for it in items:
                grp = CAT_NAMES.get(it['c'][0], it['c'][0]) if it.get('c') else 'General'
                f.write(f'#EXTINF:-1 tvg-logo="{it.get("l", "")}" group-title="{grp}",{it["n"]}\n{it["u"][0]}\n')
    safe = [x for x in out_live if 'adult' not in x['c']]
    m3u('all.m3u', safe)
    m3u('arabic.m3u', [x for x in safe if x.get('ar')])
    for c in cat_count:
        if c != 'adult':
            m3u(f'{c}.m3u', [x for x in safe if c in x['c']])
    log(json.dumps(status['counts']), 'removed today:', len(removed), f'({int(time.time() - t0)}s)')


if __name__ == '__main__':
    main()
