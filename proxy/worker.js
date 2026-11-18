/**
 * Optional Cloudflare Worker: lets the WEB version (served over https) read your IPTV panel's
 * player_api.php / M3U / EPG data when the panel is http-only or sends no CORS headers.
 * It forwards catalogue/API requests only — video streams are refused and always go device → server directly,
 * so the subscription's own connection rules are unchanged.
 * Usage in the app: Settings → Advanced → API proxy = https://<your-worker>.workers.dev/?url=
 */
const ALLOWED = /\/(player_api\.php|get\.php|xmltv\.php|panel_api\.php)(\?|$)|\.m3u(\?|$)/i;
export default {
  async fetch(req) {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const target = new URL(req.url).searchParams.get('url');
    if (!target || !/^https?:\/\//i.test(target)) return new Response('missing ?url=', { status: 400, headers: cors });
    const u = new URL(target);
    if (!ALLOWED.test(u.pathname + u.search) || /\/(live|movie|series|timeshift)\//i.test(u.pathname)) return new Response('Only API / playlist requests are proxied', { status: 403, headers: cors });
    const r = await fetch(target, { headers: { 'User-Agent': 'DOOM-IPTV/1.0' }, cf: { cacheTtl: 300 } });
    const h = new Headers(r.headers); Object.entries(cors).forEach(([k, v]) => h.set(k, v)); h.delete('set-cookie');
    return new Response(r.body, { status: r.status, headers: h });
  }
};
