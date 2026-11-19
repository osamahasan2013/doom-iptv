// Makes the Capacitor Android project work on Android TV / Google TV / Fire TV and allows http IPTV servers.
const fs = require('fs'); const path = require('path');
const root = path.join(__dirname, '..', 'android', 'app', 'src', 'main');
const mf = path.join(root, 'AndroidManifest.xml');
let x = fs.readFileSync(mf, 'utf8');
if (!x.includes('android.software.leanback')) {
  x = x.replace('<application', '<uses-feature android:name="android.software.leanback" android:required="false" />\n    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />\n    <application');
}
if (!x.includes('usesCleartextTraffic')) x = x.replace('<application', '<application android:usesCleartextTraffic="true" android:banner="@drawable/banner"');
if (!x.includes('LEANBACK_LAUNCHER')) x = x.replace('<category android:name="android.intent.category.LAUNCHER" />', '<category android:name="android.intent.category.LAUNCHER" />\n                <category android:name="android.intent.category.LEANBACK_LAUNCHER" />');
x = x.replace(/android:screenOrientation="[^"]*"/g, '');
fs.writeFileSync(mf, x);
const draw = path.join(root, 'res', 'drawable'); fs.mkdirSync(draw, { recursive: true });
fs.copyFileSync(path.join(__dirname, '..', 'assets', 'banner.png'), path.join(draw, 'banner.png'));
console.log('Android manifest patched for TV + cleartext');

// Full screen: hide the status bar, navigation bar and the large-screen taskbar (projectors, tablets, TV boxes).
// A swipe from the screen edge shows them for a moment, then they hide again.
const javaRoot = path.join(root, 'java');
const findMain = dir => { for (const f of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, f.name); if (f.isDirectory()) { const r = findMain(p); if (r) return r; } else if (f.name === 'MainActivity.java') return p; } return null; };
const mainJava = findMain(javaRoot);
if (mainJava) {
  const pkg = (fs.readFileSync(mainJava, 'utf8').match(/^package\s+([\w.]+);/m) || [])[1];
  fs.writeFileSync(mainJava, `package ${pkg};

import android.app.UiModeManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        goFullScreen();
        focusWebView();
        if (isTv()) { // tell the page it is on a TV so remote-control navigation is on from the start
            Handler h = new Handler(Looper.getMainLooper());
            for (int ms : new int[] { 300, 1000, 2500, 5000 }) h.postDelayed(this::markTv, ms);
        }
    }

    private boolean isTv() {
        UiModeManager ui = (UiModeManager) getSystemService(Context.UI_MODE_SERVICE);
        PackageManager pm = getPackageManager();
        return (ui != null && ui.getCurrentModeType() == Configuration.UI_MODE_TYPE_TELEVISION)
            || pm.hasSystemFeature(PackageManager.FEATURE_LEANBACK)
            || !pm.hasSystemFeature(PackageManager.FEATURE_TOUCHSCREEN);
    }

    private void markTv() {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        getBridge().getWebView().evaluateJavascript("window.__DOOM_TV=true;window.dispatchEvent(new Event('doom-tv'));", null);
    }

    private void focusWebView() {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        WebView w = getBridge().getWebView();
        w.setFocusable(true);
        w.setFocusableInTouchMode(true);
        w.requestFocus(View.FOCUS_DOWN);
    }

    @Override
    public void onResume() {
        super.onResume();
        goFullScreen();
        focusWebView();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) { goFullScreen(); focusWebView(); }
    }

    private void goFullScreen() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.hide(WindowInsetsCompat.Type.systemBars());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }
}
`);
  console.log('MainActivity: full screen (system bars hidden)');
} else console.warn('MainActivity.java not found — full screen not applied');

// Version number from the build, and one fixed signing key so a new APK installs over the old one (keeps your data).
const gradle = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
if (fs.existsSync(gradle)) {
  let g = fs.readFileSync(gradle, 'utf8');
  const n = parseInt(process.env.DOOM_BUILD || '1', 10) || 1;
  g = g.replace(/versionCode\s+\d+/, `versionCode ${n}`).replace(/versionName\s+"[^"]*"/, `versionName "1.0.${n}"`);
  const ks = path.join(__dirname, '..', 'android', 'app', 'doom-release.jks');
  if (process.env.DOOM_KEY_PASSWORD && fs.existsSync(ks) && !g.includes('signingConfigs.doom')) {
    g = g.replace(/android\s*\{/, `android {
    signingConfigs {
        doom {
            storeFile file("doom-release.jks")
            storePassword System.getenv("DOOM_KEY_PASSWORD")
            keyAlias "doom"
            keyPassword System.getenv("DOOM_KEY_PASSWORD")
        }
    }`);
    g = g.replace(/buildTypes\s*\{/, `buildTypes {
        debug {
            signingConfig signingConfigs.doom
        }`);
    g = g.replace(/(release\s*\{)/, `$1
            signingConfig signingConfigs.doom`);
    console.log('Signing with the fixed DOOM key');
  } else console.log('No signing key password: using a temporary debug key');
  fs.writeFileSync(gradle, g);
  console.log('Version', n);
}
