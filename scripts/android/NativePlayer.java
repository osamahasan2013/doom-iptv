package com.osamahasan.doom;

import android.content.Context;
import android.graphics.Color;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import androidx.annotation.NonNull;
import androidx.annotation.OptIn;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.Format;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.PlaybackParameters;
import androidx.media3.common.Player;
import androidx.media3.common.TrackSelectionOverride;
import androidx.media3.common.TrackSelectionParameters;
import androidx.media3.common.Tracks;
import androidx.media3.common.VideoSize;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.DefaultLoadControl;
import androidx.media3.exoplayer.DefaultRenderersFactory;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import androidx.media3.extractor.DefaultExtractorsFactory;
import androidx.media3.extractor.ts.DefaultTsPayloadReaderFactory;
import androidx.media3.ui.AspectRatioFrameLayout;
import androidx.media3.ui.PlayerView;
import androidx.media3.ui.SubtitleView;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.List;

/**
 * DOOM IPTV — Android's own video player (Media3 / ExoPlayer) for the app.
 * The picture is drawn by the system decoder in a view BEHIND the (then transparent) web page, so the
 * app's own controls, menus and remote handling stay exactly as they are. The page drives it like a
 * <video> element (see www/js/exo.js) and gets its state back as events.
 */
@OptIn(markerClass = UnstableApi.class)
@CapacitorPlugin(name = "NativePlayer")
public class NativePlayer extends Plugin {
    private ExoPlayer player;
    private PlayerView view;
    private final Handler main = new Handler(Looper.getMainLooper());
    private boolean ticking;
    private final Runnable tick = new Runnable() {
        @Override public void run() {
            if (player == null) { ticking = false; return; }
            sendTime();
            main.postDelayed(this, 400);
        }
    };

    private final Player.Listener listener = new Player.Listener() {
        @Override public void onPlaybackStateChanged(int s) { sendState(); if (s == Player.STATE_ENDED) notifyListeners("ended", new JSObject()); }
        @Override public void onIsPlayingChanged(boolean playing) { sendState(); }
        @Override public void onPlayWhenReadyChanged(boolean pwr, int reason) { sendState(); }
        @Override public void onPlayerError(@NonNull PlaybackException e) {
            JSObject o = new JSObject();
            o.put("code", e.getErrorCodeName());
            o.put("message", String.valueOf(e.getMessage()));
            notifyListeners("error", o);
        }
        @Override public void onVideoSizeChanged(@NonNull VideoSize v) {
            JSObject o = new JSObject(); o.put("w", v.width); o.put("h", v.height); notifyListeners("size", o);
        }
        @Override public void onTracksChanged(@NonNull Tracks t) { notifyListeners("tracks", tracksJson()); }
        @Override public void onPositionDiscontinuity(@NonNull Player.PositionInfo a, @NonNull Player.PositionInfo b, int reason) {
            if (reason == Player.DISCONTINUITY_REASON_SEEK) { sendTime(); notifyListeners("seeked", new JSObject()); }
        }
    };

    @PluginMethod public void available(PluginCall call) { JSObject r = new JSObject(); r.put("ok", true); call.resolve(r); }

    /** load({ url, start (s), live, mime, ua, aspect, sub }) */
    @PluginMethod public void load(PluginCall call) {
        final String url = call.getString("url");
        if (url == null || url.isEmpty()) { call.reject("no url"); return; }
        final long startMs = (long) (call.getDouble("start", 0.0) * 1000);
        final String mime = call.getString("mime", "");
        final String ua = call.getString("ua", "DOOM-IPTV");
        final boolean live = Boolean.TRUE.equals(call.getBoolean("live", false));
        final String aspect = call.getString("aspect", "fit");
        final double sub = call.getDouble("sub", 1.0);
        main.post(() -> {
            try {
                ensure();
                DefaultHttpDataSource.Factory http = new DefaultHttpDataSource.Factory()
                    .setUserAgent(ua).setAllowCrossProtocolRedirects(true)
                    .setConnectTimeoutMs(15000).setReadTimeoutMs(30000);
                // IPTV .ts streams often start between key frames and have no access-unit markers
                DefaultExtractorsFactory ex = new DefaultExtractorsFactory()
                    .setTsExtractorFlags(DefaultTsPayloadReaderFactory.FLAG_ALLOW_NON_IDR_KEYFRAMES | DefaultTsPayloadReaderFactory.FLAG_DETECT_ACCESS_UNITS)
                    .setConstantBitrateSeekingEnabled(true);
                DefaultMediaSourceFactory msf = new DefaultMediaSourceFactory(http, ex);
                MediaItem.Builder b = new MediaItem.Builder().setUri(Uri.parse(url));
                String m = mimeOf(url, mime); if (m != null) b.setMimeType(m);
                player.setMediaSource(msf.createMediaSource(b.build()), live ? C.TIME_UNSET : Math.max(0, startMs));
                player.setPlaybackParameters(PlaybackParameters.DEFAULT);
                player.prepare();
                player.setPlayWhenReady(true);
                applyAspect(aspect);
                applySub((float) sub);
                if (!ticking) { ticking = true; main.post(tick); }
                call.resolve();
            } catch (Exception e) { call.reject(String.valueOf(e.getMessage())); }
        });
    }

    @PluginMethod public void play(PluginCall call) { main.post(() -> { if (player != null) player.setPlayWhenReady(true); call.resolve(); }); }
    @PluginMethod public void pause(PluginCall call) { main.post(() -> { if (player != null) player.setPlayWhenReady(false); call.resolve(); }); }
    /** seek({ t: seconds }) */
    @PluginMethod public void seek(PluginCall call) {
        final long ms = (long) (call.getDouble("t", 0.0) * 1000);
        main.post(() -> { if (player != null) player.seekTo(Math.max(0, ms)); call.resolve(); });
    }
    @PluginMethod public void volume(PluginCall call) {
        final float v = (float) (double) call.getDouble("v", 1.0);
        main.post(() -> { if (player != null) player.setVolume(Math.max(0f, Math.min(1f, v))); call.resolve(); });
    }
    @PluginMethod public void speed(PluginCall call) {
        final float r = (float) (double) call.getDouble("r", 1.0);
        main.post(() -> { if (player != null) player.setPlaybackParameters(new PlaybackParameters(r)); call.resolve(); });
    }
    /** aspect({ mode: fit | fill | stretch | original | 16:9 | 4:3 | 21:9 }) */
    @PluginMethod public void aspect(PluginCall call) { final String mode = call.getString("mode", "fit"); main.post(() -> { applyAspect(mode); call.resolve(); }); }
    /** subStyle({ scale }) — 1 = normal size */
    @PluginMethod public void subStyle(PluginCall call) { final double s = call.getDouble("scale", 1.0); main.post(() -> { applySub((float) s); call.resolve(); }); }
    @PluginMethod public void tracks(PluginCall call) { main.post(() -> call.resolve(tracksJson())); }
    /** select({ type: 'audio' | 'text', id: 'group:index' | 'off' }) */
    @PluginMethod public void select(PluginCall call) {
        final String type = call.getString("type", "audio"), id = call.getString("id", "off");
        main.post(() -> {
            if (player == null) { call.resolve(); return; }
            int tt = "text".equals(type) ? C.TRACK_TYPE_TEXT : C.TRACK_TYPE_AUDIO;
            TrackSelectionParameters.Builder p = player.getTrackSelectionParameters().buildUpon();
            if ("off".equals(id)) p.clearOverridesOfType(tt).setTrackTypeDisabled(tt, true);
            else {
                try {
                    String[] ab = id.split(":"); int g = Integer.parseInt(ab[0]), i = Integer.parseInt(ab[1]);
                    List<Tracks.Group> groups = player.getCurrentTracks().getGroups();
                    if (g < groups.size()) p.setTrackTypeDisabled(tt, false).setOverrideForType(new TrackSelectionOverride(groups.get(g).getMediaTrackGroup(), i));
                } catch (Exception ignored) { }
            }
            player.setTrackSelectionParameters(p.build());
            call.resolve();
        });
    }
    /** stop: between two videos (keeps the player and its view) */
    @PluginMethod public void stop(PluginCall call) { main.post(() -> { if (player != null) { player.stop(); player.clearMediaItems(); } call.resolve(); }); }
    /** release: the player screen was closed */
    @PluginMethod public void release(PluginCall call) { main.post(() -> { releaseAll(); call.resolve(); }); }

    @Override protected void handleOnPause() { main.post(() -> { if (player != null) player.setPlayWhenReady(false); }); }
    @Override protected void handleOnDestroy() { main.post(this::releaseAll); }

    // ---------------------------------------------------------------------------------------------

    private void ensure() {
        Context ctx = getContext();
        if (player == null) {
            DefaultRenderersFactory rf = new DefaultRenderersFactory(ctx)
                .setEnableDecoderFallback(true)
                .setExtensionRendererMode(DefaultRenderersFactory.EXTENSION_RENDERER_MODE_ON);
            DefaultLoadControl lc = new DefaultLoadControl.Builder().setBufferDurationsMs(15000, 50000, 1500, 3000).build();
            player = new ExoPlayer.Builder(ctx, rf).setLoadControl(lc).build();
            player.setAudioAttributes(new AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_MOVIE).build(), true);
            player.setHandleAudioBecomingNoisy(true);
            player.addListener(listener);
        }
        WebView wv = getBridge().getWebView();
        if (view == null) {
            view = new PlayerView(ctx);
            view.setUseController(false);
            view.setShutterBackgroundColor(Color.BLACK);
            view.setKeepContentOnPlayerReset(false);
            view.setFocusable(false);
            view.setFocusableInTouchMode(false);
            view.setClickable(false);
            view.setDescendantFocusability(ViewGroup.FOCUS_BLOCK_DESCENDANTS);
            view.setBackgroundColor(Color.BLACK);
        }
        view.setPlayer(player);
        if (view.getParent() == null && wv != null && wv.getParent() instanceof ViewGroup) {
            ViewGroup parent = (ViewGroup) wv.getParent();
            parent.addView(view, parent.indexOfChild(wv), new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        }
        if (view != null) view.setVisibility(View.VISIBLE);
        if (wv != null) { wv.setBackgroundColor(Color.TRANSPARENT); wv.requestFocus(); }   // the remote keeps talking to the page
    }

    private void releaseAll() {
        ticking = false; main.removeCallbacks(tick);
        if (player != null) { player.removeListener(listener); player.release(); player = null; }
        if (view != null) {
            view.setPlayer(null);
            if (view.getParent() instanceof ViewGroup) ((ViewGroup) view.getParent()).removeView(view);
            view = null;
        }
        WebView wv = getBridge() != null ? getBridge().getWebView() : null;
        if (wv != null) wv.setBackgroundColor(Color.BLACK);
    }

    private static String mimeOf(String url, String mime) {
        String u = url.toLowerCase();
        if ("m3u8".equals(mime) || u.contains(".m3u8")) return MimeTypes.APPLICATION_M3U8;
        if ("ts".equals(mime) || u.matches(".*\\.ts(\\?.*)?$")) return MimeTypes.VIDEO_MP2T;
        if (u.contains(".mpd")) return MimeTypes.APPLICATION_MPD;
        return null;   // mp4, mkv, avi…: worked out from the file itself
    }

    private void applyAspect(String mode) {
        if (view == null) return;
        int m = AspectRatioFrameLayout.RESIZE_MODE_FIT;
        if ("fill".equals(mode)) m = AspectRatioFrameLayout.RESIZE_MODE_ZOOM;
        else if ("stretch".equals(mode)) m = AspectRatioFrameLayout.RESIZE_MODE_FILL;
        view.setResizeMode(m);
        // fixed shapes: fit the picture into that shape
        float r = 0f;
        if ("16:9".equals(mode)) r = 16f / 9f; else if ("4:3".equals(mode)) r = 4f / 3f; else if ("21:9".equals(mode)) r = 21f / 9f;
        View content = view.findViewById(androidx.media3.ui.R.id.exo_content_frame);
        if (content instanceof AspectRatioFrameLayout) {
            AspectRatioFrameLayout f = (AspectRatioFrameLayout) content;
            if (r > 0) { f.setResizeMode(AspectRatioFrameLayout.RESIZE_MODE_FIT); f.setAspectRatio(r); }
        }
    }

    private void applySub(float scale) {
        if (view == null) return;
        SubtitleView sv = view.getSubtitleView();
        if (sv != null) { sv.setApplyEmbeddedStyles(true); sv.setFractionalTextSize(SubtitleView.DEFAULT_TEXT_SIZE_FRACTION * scale); }
    }

    private void sendState() {
        if (player == null) return;
        JSObject o = new JSObject();
        int s = player.getPlaybackState();
        o.put("state", s == Player.STATE_BUFFERING ? "buffering" : s == Player.STATE_READY ? "ready" : s == Player.STATE_ENDED ? "ended" : "idle");
        o.put("playing", player.isPlaying());
        o.put("pwr", player.getPlayWhenReady());
        notifyListeners("state", o);
    }

    private void sendTime() {
        if (player == null) return;
        JSObject o = new JSObject();
        long d = player.getDuration();
        o.put("pos", player.getCurrentPosition());
        o.put("dur", d == C.TIME_UNSET ? -1 : d);
        o.put("buf", player.getBufferedPosition());
        o.put("live", player.isCurrentMediaItemLive());
        o.put("playing", player.isPlaying());
        notifyListeners("time", o);
    }

    private JSObject tracksJson() {
        JSObject o = new JSObject(); JSArray audio = new JSArray(), text = new JSArray();
        if (player != null) {
            List<Tracks.Group> groups = player.getCurrentTracks().getGroups();
            for (int g = 0; g < groups.size(); g++) {
                Tracks.Group grp = groups.get(g); int type = grp.getType();
                if (type != C.TRACK_TYPE_AUDIO && type != C.TRACK_TYPE_TEXT) continue;
                for (int i = 0; i < grp.length; i++) {
                    if (!grp.isTrackSupported(i)) continue;
                    Format f = grp.getTrackFormat(i);
                    JSObject t = new JSObject();
                    t.put("id", g + ":" + i);
                    t.put("label", f.label != null ? f.label : "");
                    t.put("lang", f.language != null ? f.language : "");
                    t.put("ch", f.channelCount);
                    t.put("codec", f.sampleMimeType != null ? f.sampleMimeType : "");
                    t.put("on", grp.isTrackSelected(i));
                    (type == C.TRACK_TYPE_AUDIO ? audio : text).put(t);
                }
            }
        }
        o.put("audio", audio); o.put("text", text);
        return o;
    }
}
