// Copies the player libraries into www/lib so the app works offline (no CDN needed).
const fs = require('fs'); const path = require('path');
const out = path.join(__dirname, '..', 'www', 'lib'); fs.mkdirSync(out, { recursive: true });
const files = [['hls.js/dist/hls.min.js', 'hls.min.js'], ['mpegts.js/dist/mpegts.js', 'mpegts.js']];
for (const [src, dst] of files) {
  try { fs.copyFileSync(require.resolve(src), path.join(out, dst)); console.log('copied', dst); }
  catch (e) { console.warn('skip', src, '-', e.message); }
}
