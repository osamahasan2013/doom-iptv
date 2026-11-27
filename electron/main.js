// DOOM IPTV desktop shell (Windows / macOS / Linux)
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
function create() {
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 380, minHeight: 600, backgroundColor: '#0a0f1e', autoHideMenuBar: true, title: 'DOOM IPTV',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    // IPTV panels are usually plain http and don't send CORS headers; the desktop app talks to them directly.
    webPreferences: { webSecurity: false, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false }
  });
  Menu.setApplicationMenu(null);
  // YouTube refuses embedded players that send no Referer (error 153); a page loaded from a file sends none
  win.webContents.session.webRequest.onBeforeSendHeaders({ urls: ['https://www.youtube-nocookie.com/*', 'https://www.youtube.com/*'] }, (d, cb) => {
    if (!d.requestHeaders.Referer) d.requestHeaders.Referer = 'https://osamahasan2013.github.io/doom-iptv/';
    cb({ requestHeaders: d.requestHeaders });
  });
  win.loadFile(path.join(__dirname, '..', 'www', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    if (input.type === 'keyDown' && input.key === 'F12') win.webContents.toggleDevTools();
  });
}
app.whenReady().then(create);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) create(); });
