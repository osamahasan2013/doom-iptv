// Lets the iOS app reach http IPTV servers, keep audio in background / PiP, and rotate freely.
const fs = require('fs'); const path = require('path');
const plist = path.join(__dirname, '..', 'ios', 'App', 'App', 'Info.plist');
let x = fs.readFileSync(plist, 'utf8');
const add = (key, xml) => { if (!x.includes('<key>' + key + '</key>')) x = x.replace(/<\/dict>\s*<\/plist>\s*$/, `\t<key>${key}</key>\n\t${xml}\n</dict>\n</plist>\n`); };
add('NSAppTransportSecurity', '<dict>\n\t\t<key>NSAllowsArbitraryLoads</key>\n\t\t<true/>\n\t\t<key>NSAllowsArbitraryLoadsInWebContent</key>\n\t\t<true/>\n\t</dict>');
add('UIBackgroundModes', '<array>\n\t\t<string>audio</string>\n\t</array>');
add('UIFileSharingEnabled', '<true/>');
add('UIStatusBarHidden', '<true/>');
add('UIViewControllerBasedStatusBarAppearance', '<false/>');
add('LSSupportsOpeningDocumentsInPlace', '<true/>');
fs.writeFileSync(plist, x);
console.log('iOS Info.plist patched (http servers, background audio, file sharing)');
