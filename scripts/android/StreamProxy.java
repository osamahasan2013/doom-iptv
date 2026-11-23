package __PKG__;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URL;
import java.net.URLDecoder;
import java.util.HashMap;
import java.util.Map;

/**
 * Local video proxy for movies and episodes (DOOM IPTV).
 *
 * The WebView's video player opens a second connection when it jumps to another part of a file
 * (resume, seeking, reading the index at the end of the file) while the first one is still open.
 * IPTV servers that allow one connection per subscription refuse that second connection, so
 * resuming hangs or fails. This proxy sits in between and keeps exactly ONE connection per stream
 * open to the server: a new request first closes the previous one.
 *
 * GET http://127.0.0.1:PORT/v?u=<url-encoded stream url>   (Range header passed through)
 */
public class StreamProxy {
    private ServerSocket server;
    private volatile boolean running;
    private final Map<String, Session> current = new HashMap<>();

    private static class Session {
        HttpURLConnection up; Socket client; volatile boolean dead;
        void kill() {
            dead = true;
            try { if (up != null) up.disconnect(); } catch (Exception ignored) {}
            try { if (client != null) client.close(); } catch (Exception ignored) {}
        }
    }

    public int start() {
        try {
            server = new ServerSocket(0, 16, InetAddress.getByName("127.0.0.1"));
            running = true;
            Thread t = new Thread(() -> {
                while (running) {
                    try { final Socket s = server.accept(); new Thread(() -> handle(s)).start(); }
                    catch (IOException e) { if (!running) break; }
                }
            });
            t.setDaemon(true); t.start();
            return server.getLocalPort();
        } catch (IOException e) { return 0; }
    }

    public void stop() { running = false; try { server.close(); } catch (Exception ignored) {} synchronized (current) { for (Session s : current.values()) s.kill(); current.clear(); } }

    private void handle(Socket client) {
        Session me = new Session(); me.client = client; String key = null;
        try {
            client.setSoTimeout(30000);
            BufferedReader in = new BufferedReader(new InputStreamReader(client.getInputStream(), "ISO-8859-1"));
            String line = in.readLine(); if (line == null) { client.close(); return; }
            String[] parts = line.split(" "); String method = parts[0]; String path = parts.length > 1 ? parts[1] : "/";
            Map<String, String> hdr = new HashMap<>();
            while ((line = in.readLine()) != null && line.length() > 0) { int i = line.indexOf(':'); if (i > 0) hdr.put(line.substring(0, i).trim().toLowerCase(), line.substring(i + 1).trim()); }
            OutputStream out = client.getOutputStream();
            int q = path.indexOf("u="); if (q < 0) { reply(out, "400 Bad Request"); client.close(); return; }
            String target = URLDecoder.decode(path.substring(q + 2).split("&")[0], "UTF-8");
            key = target;
            // one connection per stream: close the previous one before opening the new one
            boolean replaced;
            synchronized (current) { Session old = current.get(key); replaced = old != null; if (old != null) old.kill(); current.put(key, me); }
            HttpURLConnection up = null; int code = 0; int tries = 0; final String first = target;
            for (int hop = 0; hop < 6; hop++) {   // follow redirects ourselves (also http <-> https)
                if (me.dead) return;
                up = (HttpURLConnection) new URL(target).openConnection(); me.up = up;
                up.setInstanceFollowRedirects(false); up.setConnectTimeout(15000); up.setReadTimeout(30000);
                up.setRequestMethod("HEAD".equals(method) ? "HEAD" : "GET");
                up.setRequestProperty("Connection", "close");
                if (hdr.containsKey("range")) up.setRequestProperty("Range", hdr.get("range"));
                if (hdr.containsKey("user-agent")) up.setRequestProperty("User-Agent", hdr.get("user-agent"));
                try { code = up.getResponseCode(); } catch (IOException e) { code = -1; }
                if (code >= 300 && code < 400 && up.getHeaderField("Location") != null) { target = new URL(new URL(target), up.getHeaderField("Location")).toString(); up.disconnect(); continue; }
                // the server may still count the connection we just closed: wait a moment and ask again
                if ((replaced || tries > 0) && tries < 10 && (code == -1 || code == 401 || code == 403 || code == 429 || code == 458 || code == 502 || code == 503 || code == 509)) {
                    up.disconnect(); tries++; Thread.sleep(200L * tries); target = first; hop = -1; continue;
                }
                if (code == -1) throw new IOException("no answer");
                break;
            }
            if (me.dead) return;
            StringBuilder sb = new StringBuilder();
            String msg = up.getResponseMessage();
            sb.append("HTTP/1.1 ").append(code).append(' ').append(msg == null ? "" : msg).append("\r\n");
            for (String h : new String[] { "Content-Type", "Content-Length", "Content-Range", "Accept-Ranges", "Last-Modified", "ETag" }) {
                String v = up.getHeaderField(h); if (v != null) sb.append(h).append(": ").append(v).append("\r\n");
            }
            if (up.getHeaderField("Accept-Ranges") == null && code == 206) sb.append("Accept-Ranges: bytes\r\n");
            sb.append("Access-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n");
            out.write(sb.toString().getBytes("ISO-8859-1")); out.flush();
            if ("HEAD".equals(method)) return;
            InputStream body = code >= 400 ? up.getErrorStream() : up.getInputStream();
            if (body == null) return;
            byte[] buf = new byte[64 * 1024]; int n;
            while (!me.dead && (n = body.read(buf)) > 0) out.write(buf, 0, n);
            out.flush();
        } catch (Exception ignored) {
        } finally {
            if (key != null) synchronized (current) { if (current.get(key) == me) current.remove(key); }
            me.kill();
        }
    }

    private static void reply(OutputStream out, String status) throws IOException {
        out.write(("HTTP/1.1 " + status + "\r\nContent-Length: 0\r\nConnection: close\r\n\r\n").getBytes("ISO-8859-1"));
    }
}
