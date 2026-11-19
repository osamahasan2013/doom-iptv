package com.osamahasan.doom;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

/**
 * "Add from your phone": a tiny web page served by the TV app on the home Wi-Fi.
 * The TV shows a QR code with this page's address; the phone opens it, the user types the
 * subscription details on the phone keyboard, and they are handed straight to the app.
 * Nothing leaves the local network. A random key in the address stops other devices from posting.
 */
public class PairServer {
    public interface Listener { void onSubmit(String json); }

    private final Listener listener;
    private final String token;
    private ServerSocket server;
    private volatile boolean running;

    public PairServer(Listener listener) {
        this.listener = listener;
        String abc = "abcdefghijkmnpqrstuvwxyz23456789";
        SecureRandom r = new SecureRandom();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 8; i++) sb.append(abc.charAt(r.nextInt(abc.length())));
        token = sb.toString();
    }

    /** Starts on the first free port from 8765; returns the address to show, or null when there is no Wi-Fi / LAN. */
    public String start() {
        String ip = lanIp();
        for (int port = 8765; port < 8785 && server == null; port++) {
            try { server = new ServerSocket(port); } catch (Exception ignored) { }
        }
        if (server == null) return null;
        running = true;
        Thread t = new Thread(this::loop, "doom-pair");
        t.setDaemon(true);
        t.start();
        return ip == null ? null : "http://" + ip + ":" + server.getLocalPort() + "/?k=" + token;
    }

    public int port() { return server == null ? -1 : server.getLocalPort(); }

    public String path() { return "/?k=" + token; }

    public void stop() {
        running = false;
        try { if (server != null) server.close(); } catch (Exception ignored) { }
    }

    private void loop() {
        while (running) {
            try {
                final Socket s = server.accept();
                Thread h = new Thread(() -> handle(s), "doom-pair-req");
                h.setDaemon(true);
                h.start();
            } catch (Exception e) {
                if (!running) return;
            }
        }
    }

    private void handle(Socket s) {
        try {
            s.setSoTimeout(15000);
            BufferedReader in = new BufferedReader(new InputStreamReader(s.getInputStream(), StandardCharsets.UTF_8));
            String first = in.readLine();
            if (first == null) { s.close(); return; }
            String[] parts = first.split(" ");
            String method = parts.length > 0 ? parts[0] : "GET";
            String target = parts.length > 1 ? parts[1] : "/";
            int len = 0;
            String line;
            while ((line = in.readLine()) != null && !line.isEmpty()) {
                int c = line.indexOf(':');
                if (c > 0 && line.substring(0, c).trim().equalsIgnoreCase("content-length")) {
                    try { len = Integer.parseInt(line.substring(c + 1).trim()); } catch (Exception ignored) { }
                }
            }
            String path = target;
            String query = "";
            int q = target.indexOf('?');
            if (q >= 0) { path = target.substring(0, q); query = target.substring(q + 1); }
            Map<String, String> params = parse(query);

            if ("POST".equals(method) && path.equals("/submit")) {
                char[] buf = new char[Math.min(Math.max(len, 0), 16384)];
                int read = 0;
                while (read < buf.length) { int n = in.read(buf, read, buf.length - read); if (n < 0) break; read += n; }
                Map<String, String> form = parse(new String(buf, 0, read));
                if (!token.equals(form.get("k"))) { send(s, 403, page("Expired link / انتهت صلاحية الرابط", "<p>Scan the QR code on the TV again.<br>امسح كود QR الظاهر على التلفزيون مرة أخرى.</p>")); return; }
                StringBuilder json = new StringBuilder("{");
                String[] keys = { "type", "name", "server", "username", "password", "url" };
                for (int i = 0; i < keys.length; i++) {
                    if (i > 0) json.append(',');
                    json.append('"').append(keys[i]).append("\":\"").append(esc(form.getOrDefault(keys[i], "").trim())).append('"');
                }
                json.append('}');
                if (listener != null) listener.onSubmit(json.toString());
                send(s, 200, page("Sent to the TV ✓ / تم الإرسال ✓", "<p>Look at your TV — the subscription is being added.<br>انظر إلى التلفزيون — جاري إضافة الاشتراك.</p>"));
                return;
            }
            if (!token.equals(params.get("k"))) { send(s, 403, page("Expired link / انتهت صلاحية الرابط", "<p>Scan the QR code on the TV again.<br>امسح كود QR الظاهر على التلفزيون مرة أخرى.</p>")); return; }
            send(s, 200, form());
        } catch (Exception e) {
            try { s.close(); } catch (Exception ignored) { }
        }
    }

    private static Map<String, String> parse(String qs) {
        Map<String, String> m = new HashMap<>();
        if (qs == null || qs.isEmpty()) return m;
        for (String kv : qs.split("&")) {
            int e = kv.indexOf('=');
            try {
                if (e < 0) m.put(URLDecoder.decode(kv, "UTF-8"), "");
                else m.put(URLDecoder.decode(kv.substring(0, e), "UTF-8"), URLDecoder.decode(kv.substring(e + 1), "UTF-8"));
            } catch (Exception ignored) { }
        }
        return m;
    }

    private static String esc(String v) {
        StringBuilder sb = new StringBuilder();
        for (char c : v.toCharArray()) {
            if (c == '"' || c == '\\') sb.append('\\').append(c);
            else if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
            else if (c == '<' || c == '>' || c == '&' || c == '\'' || c == ' ' || c == ' ') sb.append(String.format("\\u%04x", (int) c));
            else sb.append(c);
        }
        return sb.toString();
    }

    private void send(Socket s, int code, String html) throws Exception {
        byte[] body = html.getBytes(StandardCharsets.UTF_8);
        String head = "HTTP/1.1 " + code + (code == 200 ? " OK" : " Forbidden") + "\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: " + body.length
            + "\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n";
        OutputStream out = s.getOutputStream();
        out.write(head.getBytes(StandardCharsets.UTF_8));
        out.write(body);
        out.flush();
        s.close();
    }

    private static final String CSS = "<meta name=viewport content='width=device-width,initial-scale=1'><style>"
        + "*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Tahoma,sans-serif;background:#0a0f1e;color:#eef1f8;padding:22px}"
        + ".c{max-width:460px;margin:auto}h1{font-size:22px;margin:6px 0 4px}p{color:#9aa3b8;line-height:1.6}"
        + ".logo{display:inline-block;background:linear-gradient(135deg,#5b8cff,#a855f7);border-radius:12px;padding:8px 16px;font-weight:900;letter-spacing:2px}"
        + "label{display:block;font-size:13px;color:#9aa3b8;margin:14px 0 6px}input{width:100%;padding:14px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#fff;font-size:17px}"
        + ".seg{display:flex;gap:6px;margin-top:16px}.seg label{flex:1;margin:0;text-align:center;padding:11px;border-radius:10px;background:rgba(255,255,255,.07);color:#eef1f8;font-size:15px}"
        + ".seg input{display:none}.seg input:checked+span{color:#fff;font-weight:700}.seg label:has(input:checked){background:#5b8cff}"
        + "button{width:100%;margin-top:22px;padding:15px;border:0;border-radius:12px;background:#5b8cff;color:#fff;font-size:18px;font-weight:700}"
        + ".m3u{display:none}form:has(#t2:checked) .xt{display:none}form:has(#t2:checked) .m3u{display:block}</style>";

    private static String page(String title, String body) {
        return "<!doctype html><html><head><meta charset=utf-8>" + CSS + "<title>DOOM IPTV</title></head><body><div class=c><span class=logo>DOOM</span><h1>" + title + "</h1>" + body + "</div></body></html>";
    }

    private String form() {
        return "<!doctype html><html><head><meta charset=utf-8>" + CSS + "<title>DOOM IPTV — Add subscription</title></head><body><div class=c>"
            + "<span class=logo>DOOM</span><h1>Add subscription · إضافة اشتراك</h1><p>Type it here — it goes straight to your TV.<br>اكتب البيانات هنا وستصل للتلفزيون مباشرة.</p>"
            + "<form method=post action='/submit'><input type=hidden name=k value='" + token + "'>"
            + "<div class=seg><label><input type=radio name=type id=t1 value=xtream checked><span>Xtream Codes</span></label><label><input type=radio name=type id=t2 value=m3u><span>M3U</span></label></div>"
            + "<label>Name · الاسم</label><input name=name placeholder='My IPTV' autocomplete=off>"
            + "<div class=xt><label>Server URL · رابط السيرفر</label><input name=server inputmode=url autocapitalize=off autocomplete=off placeholder='http://example.com:8080'>"
            + "<label>Username · اسم المستخدم</label><input name=username autocapitalize=off autocomplete=off>"
            + "<label>Password · كلمة المرور</label><input name=password type=password autocomplete=off></div>"
            + "<div class=m3u><label>Playlist URL · رابط القائمة</label><input name=url inputmode=url autocapitalize=off autocomplete=off placeholder='http://example.com/get.php?...'></div>"
            + "<button>Send to TV · إرسال للتلفزيون</button></form></div></body></html>";
    }

    /** The phone needs the TV's address on the home network (Wi-Fi or Ethernet). */
    public static String lanIp() {
        try {
            String fallback = null;
            for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                if (!ni.isUp() || ni.isLoopback()) continue;
                for (InetAddress a : Collections.list(ni.getInetAddresses())) {
                    if (!(a instanceof Inet4Address) || a.isLoopbackAddress()) continue;
                    String ip = a.getHostAddress();
                    if (a.isSiteLocalAddress()) {
                        String n = ni.getName().toLowerCase();
                        if (n.startsWith("wlan") || n.startsWith("eth") || n.startsWith("en")) return ip;
                        if (fallback == null) fallback = ip;
                    }
                }
            }
            return fallback;
        } catch (Exception e) {
            return null;
        }
    }
}
