// Download the images + Rubik fonts the clean rebuild needs, with friendly names.
const fs = require('fs');
const path = require('path');
const https = require('https');

const IMG = path.join(__dirname, 'img');
const FONTS = path.join(__dirname, 'fonts');
fs.mkdirSync(IMG, { recursive: true });
fs.mkdirSync(FONTS, { recursive: true });

function get(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 6) return reject(new Error('too many redirects'));
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume(); return resolve(get(new URL(res.headers.location, url).href, redirects + 1));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      const c = []; res.on('data', d => c.push(d)); res.on('end', () => resolve(Buffer.concat(c)));
    }).on('error', reject);
  });
}

const B = 'https://framerusercontent.com/images/';
// name -> [framer id + ext, width]
const IMAGES = {
  'logo':            ['UwoPgkF5DwG7NL07EgERLdui8ig.png', 936],
  'hero-deco':       ['v77FKv3zBrSCYIbwVgGgjAGIU4.png', 841],
  'hero-main':       ['pq5XGciMUyp20jkmOIIwnmlmtM.png', 980],
  'step-1':          ['3KMTkSm5Ti6OkyEdzYfdptBC4.png', 1400],
  'step-2':          ['eCCHUFUccwaBhivkqNSYBAjJgY.png', 1412],
  'step-3':          ['HO9UmiMM9QjfZdng1QG4S5BArg.png', 1412],
  'why-deco':        ['3qL4fKDrEmvaXTOuzUz2vgU8.png', 1600],
  'forwho-deco':     ['6YmSHLwvTNkEOeplQfF0NNT5qfk.png', 1600],
  'occ-birthday':    ['TXuxvWWkVu4oon1fSjSAwHcGbo.png', 216],
  'occ-proposal':    ['gc7hzS87Zk26MJKv3LM663hem7g.png', 216],
  'occ-family':      ['a54ai1BYZ7NxCJcJSXvV1GHbtbU.png', 216],
  'occ-wedding':     ['1Ai3Fis5liK8HlW4yWW3tILKRIQ.png', 128],
  'occ-mitzvah':     ['uAx7utQpZQfka9lc8PUmo40foFQ.png', 128],
  'occ-special':     ['vTRvtVkf5OdO0tjIfiuUkUjMA.png', 128],
  'type-speed':      ['s7cGi6r7O8tE8kgjbRvqLWmXD64.png', 654],
  'type-twist':      ['9WNH8Xe1qUDVxpvLRe78MzKqb4c.png', 1520],
  'type-twist2':     ['ZsNUz3JvwNIBVyvWfD7yITjh9Mg.png', 888],
  'leaderboard':     ['IlHunMMc7Pw1eovLPaarzobdJc.png', 848],
  'medal-1':         ['0ViekMkR6EuetqIKRNKRwc7s0pg.png', 344],
  'medal-2':         ['O8iXT5TPb5YzqYuFxsWYUELBqE.png', 344],
  'medal-3':         ['aqEiAS8zNnydj01v3eAZJjxbpfQ.png', 344],
  'medal-4':         ['oBZKpGL5OLhTitamaDhcic4U9s.png', 344],
  'medal-5':         ['x6xvvo2OiZ1b4R6ftffQcUABcnc.png', 344],
  'medal-6':         ['AkrG3zuxxyO1AMNE3KgL2m6zo8.png', 344],
  'medal-7':         ['5pLPr16gS1KzlkGcwbXwJNxsBJ0.png', 344],
  'medal-8':         ['LmaCz67IIy4yCRnM3Zy2okJpzrI.png', 344],
  'medal-9':         ['v0PFBnql34KfmWocug9FfbXA4.png', 344],
  'medal-10':        ['f3ajA8lBduYFxDFQSCrjvK8MfQ.png', 344],
  'game-family':     ['x4SsbjisELTz8ujpaqhTMklyHZo.jpg', 1200],
  'game-basket':     ['yaLBFL3i6oOAR7kz6QeaL0I4qA.png', 1024],
  'game-falafel':    ['m01lgOTGCKtYv9V0LWYwaSwZss.png', 1300],
  'game-summary':    ['ahLyFLThqXwOe18MAV8WsDVQ.png', 1300],
  'arrow-back':      ['f6KSJSZRClD6m1hWBse7ggjbBc.png', 40],
  'arrow-next':      ['RgghWQuuUAVLAybL9xoTfuK0.png', 40],
  'social-1':        ['sf9im48yxXbIAedLtyYwq01njY.png', 2000],
  'social-2':        ['jdR1ji1sIZoHFO0Rf63G73hfPic.png', 640],
  'social-3':        ['ygCdSLDcLY7uB5rtpMmmz1tSlfg.png', 372],
  'cta-1':           ['uMGGvmwIdG2KeLI95yEwQZaoko4.png', 736],
  'cta-2':           ['kSWpXV7sRRx9LsF2ZHbxoCbSDQ.png', 1400],
  'cta-banner':      ['AHBx3tfEmNDTpA2qrHmI8OIL5wk.png', 1584],
  'cta-bg':          ['NtfdGHUFcwsuwmv9HchDryzUfA.png', 2400],
};

const FONT_URLS = {
  'rubik-400': 'https://fonts.gstatic.com/s/rubik/v31/iJWKBXyIfDnIV7nBrXyi0A.woff2',
  'rubik-500': 'https://fonts.gstatic.com/s/rubik/v31/iJWKBXyIfDnIV7nDrXyi0A.woff2',
  'rubik-700': 'https://fonts.gstatic.com/s/rubik/v31/iJWKBXyIfDnIV7nErXyi0A.woff2',
  'rubik-800': 'https://fonts.gstatic.com/s/rubik/v31/iJWKBXyIfDnIV7nMrXyi0A.woff2',
  'rubik-900': 'https://fonts.gstatic.com/s/rubik/v31/iJWKBXyIfDnIV7nFrXyi0A.woff2',
};

(async () => {
  let ok = 0, fail = 0;
  for (const [name, [id, w]] of Object.entries(IMAGES)) {
    const ext = path.extname(id);
    const url = `${B}${id}?width=${w}`;
    try { const buf = await get(url); fs.writeFileSync(path.join(IMG, name + ext), buf); ok++; console.log(`img ok  ${name}${ext} (${buf.length}b)`); }
    catch (e) { fail++; console.log(`img ERR ${name} -> ${e.message}`); }
  }
  for (const [name, url] of Object.entries(FONT_URLS)) {
    try { const buf = await get(url); fs.writeFileSync(path.join(FONTS, name + '.woff2'), buf); ok++; console.log(`font ok ${name} (${buf.length}b)`); }
    catch (e) { fail++; console.log(`font ERR ${name} -> ${e.message}`); }
  }
  console.log(`\nDONE  ok=${ok} fail=${fail}`);
  // Write a manifest of image natural sizes (ext) for reference
})();
