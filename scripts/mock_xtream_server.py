"""Mock Xtream Codes server for testing DOOM. Usage: python3 mock_xtream.py PORT USER PASS MAXCONN NAME"""
import json, os, sys, time, re, base64
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

PORT, USER, PASS, MAXC, NAME = int(sys.argv[1]), sys.argv[2], sys.argv[3], int(sys.argv[4]), sys.argv[5]
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = f'http://127.0.0.1:{PORT}'
ACTIVE = {}

def b64(s): return base64.b64encode(s.encode()).decode()
VOD_CATS = [{'category_id': str(i + 1), 'category_name': n} for i, n in enumerate(['NEW RELEASES MOVIES', 'HQ Arabic Movies', 'HQ Moviesta Animation', 'English Movies 2020 - 2026', 'Kids'])]
SER_CATS = [{'category_id': str(i + 10), 'category_name': n} for i, n in enumerate(['Arabic Series', 'English Series'])]
LIVE_CATS = [{'category_id': str(i + 20), 'category_name': n} for i, n in enumerate(['News', 'Sports', 'Kids'])]
TITLES = ["Ron's Gone Wrong", 'Far from the Tree', 'Seal Team', 'The Family 2', 'Earwig', 'Wimpy Kid', "Pil's Adventures", 'Monster Family 2', 'Vivo', 'Moonbound', 'Jujutsu 0', 'Crazy Racing']
SHARED = {'Vivo', 'Moonbound', 'Seal Team'}  # titles that also exist on the other mock server
def vod():
    out = []
    for i in range(60):
        nm = TITLES[i % len(TITLES)] + ('' if i < 12 else f' {i}')
        if NAME == 'B' and i < 12 and nm not in SHARED: nm = 'B-' + nm
        out.append({'num': i + 1, 'name': f'HQ | {nm} (2021)', 'stream_id': 1000 + i, 'stream_icon': f'{BASE}/posters/p{i % 12}.jpg', 'rating': str(5 + i % 4), 'rating_5based': 3, 'added': str(1700000000 + i * 1000),
                    'category_id': str(i % 6 + 1), 'container_extension': 'mp4', 'year': '2021'})
    return out
def series(): return [{'num': i + 1, 'name': f'Series {NAME}{i}', 'series_id': 500 + i, 'cover': f'{BASE}/posters/p{i % 12}.jpg', 'plot': 'Plot', 'rating': '7.5', 'category_id': str(10 + i % 2), 'last_modified': str(1700000000 + i)} for i in range(8)]
def live(): return [{'num': i + 1, 'name': f'{NAME} Channel {i + 1}', 'stream_id': 2000 + i, 'stream_icon': '', 'epg_channel_id': f'ch{i}', 'category_id': str(20 + i % 3), 'tv_archive': 1 if i < 3 else 0, 'tv_archive_duration': 3, 'added': '1700000000'} for i in range(15)]

class H(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    def log_message(self, *a): pass
    def cors(self):
        self.send_header('Access-Control-Allow-Origin', '*'); self.send_header('Access-Control-Allow-Headers', '*'); self.send_header('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges')
    def do_OPTIONS(self): self.send_response(204); self.cors(); self.send_header('Content-Length', '0'); self.end_headers()
    def js(self, obj):
        b = json.dumps(obj).encode(); self.send_response(200); self.cors(); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
    def file(self, path, ctype):
        size = os.path.getsize(path); rng = self.headers.get('Range'); start, end = 0, size - 1
        if rng:
            m = re.match(r'bytes=(\d+)-(\d*)', rng); start = int(m.group(1)); end = int(m.group(2)) if m.group(2) else size - 1
            self.send_response(206); self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        else: self.send_response(200)
        self.cors(); self.send_header('Content-Type', ctype); self.send_header('Accept-Ranges', 'bytes'); self.send_header('Content-Length', str(end - start + 1)); self.end_headers()
        with open(path, 'rb') as f:
            f.seek(start); left = end - start + 1
            try:
                while left > 0:
                    chunk = f.read(min(65536, left));
                    if not chunk: break
                    self.wfile.write(chunk); left -= len(chunk)
            except (BrokenPipeError, ConnectionResetError): pass
    def do_GET(self):
        u = urlparse(self.path); q = {k: v[0] for k, v in parse_qs(u.query).items()}; p = u.path
        if p.endswith('player_api.php'):
            if q.get('username') != USER or q.get('password') != PASS: return self.js({'user_info': {'auth': 0}})
            a = q.get('action', '')
            if not a: return self.js({'user_info': {'auth': 1, 'status': 'Active', 'exp_date': str(int(time.time()) + (86400 * (5 if NAME == 'B' else 120))), 'max_connections': str(MAXC), 'active_cons': str(len(ACTIVE)), 'created_at': '1690000000', 'is_trial': '0', 'allowed_output_formats': ['m3u8', 'ts']}, 'server_info': {'timezone': 'Asia/Riyadh'}})
            if a == 'get_vod_categories': return self.js(VOD_CATS)
            if a == 'get_vod_streams': return self.js(vod())
            if a == 'get_series_categories': return self.js(SER_CATS)
            if a == 'get_series': return self.js(series())
            if a == 'get_live_categories': return self.js(LIVE_CATS)
            if a == 'get_live_streams': return self.js(live())
            if a == 'get_vod_info': return self.js({'info': {'plot': 'A movie plot from the mock server.', 'cast': 'Actor A, Actor B', 'director': 'Director X', 'genre': 'Animation', 'duration': '00:00:40', 'rating': '7.2', 'backdrop_path': [f'{BASE}/posters/p3.jpg'], 'youtube_trailer': 'abc'}, 'movie_data': {'container_extension': 'mp4'}})
            if a == 'get_series_info':
                eps = {str(s): [{'id': str(9000 + s * 100 + e), 'episode_num': e, 'title': f'Episode {e}', 'container_extension': 'mp4', 'info': {'plot': 'Episode plot', 'duration': '00:00:40'}} for e in range(1, 5)] for s in (1, 2)}
                return self.js({'info': {'plot': 'Series plot', 'cast': 'Cast', 'genre': 'Drama', 'rating': '8', 'cover': f'{BASE}/posters/p1.jpg'}, 'episodes': eps})
            if a in ('get_short_epg', 'get_simple_data_table'):
                now = int(time.time()); st = now - now % 1800 - (6 * 1800 if a == 'get_simple_data_table' else 0)
                n = 4 if a == 'get_short_epg' else 12
                return self.js({'epg_listings': [{'title': b64(f'Program {k}'), 'description': b64('About program'), 'start_timestamp': str(st + k * 1800), 'stop_timestamp': str(st + (k + 1) * 1800), 'has_archive': 1 if st + k * 1800 < now else 0} for k in range(n)]})
            return self.js([])
        if p.startswith('/posters/'): return self.file(os.path.join(HERE, p.lstrip('/')), 'image/jpeg')
        parts = p.strip('/').split('/')
        if parts[0] in ('movie', 'series') and len(parts) >= 4: return self.file(os.path.join(HERE, 'media/movie.mp4'), 'video/mp4')
        if parts[0] in ('live', 'timeshift'):
            name = parts[-1]
            if name.endswith('.m3u8'):
                txt = open(os.path.join(HERE, 'media/hls/index.m3u8')).read().replace('seg', f'{BASE}/hls/seg')
                b = txt.encode(); self.send_response(200); self.cors(); self.send_header('Content-Type', 'application/vnd.apple.mpegurl'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b); return
            ACTIVE[id(self)] = 1
            try: return self.file(os.path.join(HERE, 'media/live.ts'), 'video/mp2t')
            finally: ACTIVE.pop(id(self), None)
        if p.startswith('/hls/'): return self.file(os.path.join(HERE, 'media/hls', parts[-1]), 'video/mp2t')
        self.send_response(404); self.cors(); self.send_header('Content-Length', '0'); self.end_headers()

ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
