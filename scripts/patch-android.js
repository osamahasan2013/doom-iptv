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

import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        goFullScreen();
    }

    @Override
    public void onResume() {
        super.onResume();
        goFullScreen();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) goFullScreen();
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
