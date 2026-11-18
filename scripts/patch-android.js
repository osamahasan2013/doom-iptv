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
