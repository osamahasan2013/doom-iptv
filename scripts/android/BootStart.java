package com.osamahasan.doom;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * DOOM IPTV — "Start the app when the device turns on".
 * The choice is kept in the app's own preferences (the receiver runs before the page exists).
 * Android 10 and newer only let an app open itself at start-up when it may "display over other apps",
 * so the page asks for that permission when the option is switched on.
 */
@CapacitorPlugin(name = "BootStart")
public class BootStart extends Plugin {
    static final String PREFS = "doom", KEY = "bootStart";

    public static class Receiver extends BroadcastReceiver {
        @Override public void onReceive(Context ctx, Intent intent) {
            String a = intent != null ? intent.getAction() : null;
            if (a == null) return;
            if (!a.equals(Intent.ACTION_BOOT_COMPLETED) && !a.equals("android.intent.action.QUICKBOOT_POWERON") && !a.equals("com.htc.intent.action.QUICKBOOT_POWERON") && !a.equals(Intent.ACTION_MY_PACKAGE_REPLACED)) return;
            if (a.equals(Intent.ACTION_MY_PACKAGE_REPLACED)) return;   // an update is not a start-up
            if (!ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY, false)) return;
            Intent open = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
            if (open == null) return;
            open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
            try { ctx.startActivity(open); } catch (Exception ignored) { }
        }
    }

    private boolean overlayOk() { return Build.VERSION.SDK_INT < 29 || Settings.canDrawOverlays(getContext()); }

    private JSObject status() {
        JSObject o = new JSObject();
        o.put("on", getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY, false));
        o.put("overlayOk", overlayOk());
        o.put("sdk", Build.VERSION.SDK_INT);
        return o;
    }

    @PluginMethod public void get(PluginCall call) { call.resolve(status()); }

    /** set({ on }) */
    @PluginMethod public void set(PluginCall call) {
        boolean on = Boolean.TRUE.equals(call.getBoolean("on", false));
        SharedPreferences.Editor e = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit();
        e.putBoolean(KEY, on).apply();
        call.resolve(status());
    }

    /** opens the "display over other apps" screen for this app (or the closest one the device has) */
    @PluginMethod public void askOverlay(PluginCall call) {
        Context ctx = getContext(); String pkg = ctx.getPackageName(); boolean opened = false;
        Intent[] tries = new Intent[] {
            new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + pkg)),
            new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION),
            new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + pkg))
        };
        for (Intent i : tries) {
            try { i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); if (i.resolveActivity(ctx.getPackageManager()) == null) continue; ctx.startActivity(i); opened = true; break; } catch (Exception ignored) { }
        }
        JSObject o = status(); o.put("opened", opened); call.resolve(o);
    }
}
