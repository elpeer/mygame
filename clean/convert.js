// Convert the Figma codegen (figma_code.jsx) into a pixel-faithful static HTML page
// using Tailwind (CDN) + local assets. Deterministic 1:1 reproduction of the design.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');               // "My game"
const JSX = fs.readFileSync(path.join(ROOT, 'figma_code.jsx'), 'utf8');
const ASSETDIR = path.join(__dirname, 'figma-assets');

// const name -> local filename (with ext)
const fileFor = {};
for (const f of fs.readdirSync(ASSETDIR)) fileFor[f.replace(/\.[^.]+$/, '')] = 'figma-assets/' + f;

// 1) slice the JSX body: from first `return (` to last `);`
let body = JSX.slice(JSX.indexOf('return (') + 'return ('.length, JSX.lastIndexOf(');'));

// 2) React style objects -> inline CSS string
//    style={{ maskImage: `url("${imgX}")` }}  and  style={{ containerType: "size" }}
body = body.replace(/style=\{\{\s*maskImage:\s*`url\("?\$\{(\w+)\}"?\)`\s*\}\}/g, (m, c) => {
  const url = fileFor[c] || (c + '.png');
  return `style="-webkit-mask-image:url('${url}');mask-image:url('${url}');-webkit-mask-size:contain;mask-size:contain;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat"`;
});
body = body.replace(/style=\{\{\s*containerType:\s*"size"\s*\}\}/g, 'style="container-type:size"');

// 3) image refs: src={imgX} -> local path
body = body.replace(/src=\{(\w+)\}/g, (m, c) => `src="${fileFor[c] || (c + '.png')}"`);

// 4) font-['Family:Weight'] -> tailwind font-weight utility (family handled globally)
const W = { UltraBold: 'font-extrabold', Bold: 'font-bold', DemiBold: 'font-semibold', SemiBold: 'font-semibold', Medium: 'font-medium', Regular: 'font-normal', Light: 'font-light' };
body = body.replace(/font-\['[^':]+:(\w+)'\]/g, (m, w) => W[w] || 'font-normal');
body = body.replace(/font-\['[^']+'\]/g, ''); // any leftover family-only arbitrary

// 5) className -> class ; strip data-node-id / data-name noise
body = body.replace(/className=/g, 'class=');
body = body.replace(/\sdata-node-id="[^"]*"/g, '');
body = body.replace(/\sdata-name="[^"]*"/g, '');

// 6) JSX text expressions: {`...`} and {" "} -> plain text
//    Preserve leading/trailing spaces as nbsp (flex items collapse edge whitespace,
//    which would merge words like "מושלם"+"לחבר").
const NB = String.fromCharCode(160); // nbsp
body = body.replace(/\{`([\s\S]*?)`\}/g, (m, t) =>
  t.replace(/^ +/, s => NB.repeat(s.length)).replace(/ +$/, s => NB.repeat(s.length)));
body = body.replace(/\{"\s*"\}/g, ' ');
body = body.replace(/\{'\s*'\}/g, ' ');

// 7) self-closing NON-void elements -> explicit close (HTML can't self-close <div> etc.)
const VOID = new Set(['img', 'br', 'hr', 'input', 'meta', 'link', 'source', 'area', 'col']);
body = body.replace(/<([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*?)\/>/g, (m, tag, attrs) => {
  if (VOID.has(tag.toLowerCase())) return `<${tag}${attrs}/>`;
  return `<${tag}${attrs}></${tag}>`;
});

// 8) tidy aria-hidden boolean
body = body.replace(/aria-hidden(?=[\s>])/g, 'aria-hidden="true"');

// 8b) PDF reconciliation — the linked Figma frame is an older "HR/B2B" variant.
// The PDF (current design) uses the "events" content. Swap text to match the PDF.
const PDF_TEXT = [
  ['צוותי עבודה', 'יום הולדת מיוחד'],
  ['מנהלי HR', 'הצעת נישואים'],
  ['כל מי שאומר “בא לי משהו אחר”', 'מפגש משפחתי'],
  ['חברים שרוצים מתנה מקורית', 'הכנה לחתונה'],
  ['בני זוג שרוצים להפתיע באמת', 'בר / בת מצווה'],
  ['משפחות', 'אירוע מיוחד'],
  ['פתרון מושלם ל-HR', 'פתרון מושלם לאנשים שאוהבים'],
  ['כל אחד מקבל משחק אישי משלו', 'מתנה מקורית במיוחד,'],
  ['או משחק מחלקתי / ארגוני עם דירוגים ופרסים.', 'שתהפוך כל אירוע לבלתי'],
  ['בלי לוגיסטיקה.', 'נשכח, שיגרור חיוכים, צחוק'],
  ['בלי משלוחים.', 'מתגלגל ואפילו דמעות של'],
  ['בלי “עוד פעם אותו דבר”.', 'התרגשות'],
];
for (const [from, to] of PDF_TEXT) body = body.split(from).join(to);

// 8c) "who is it for" pill icons: the HR sprite (imgImage88) -> clean event icons, in DOM order.
const PILL_ICONS = ['occ-birthday', 'occ-proposal', 'occ-family', 'occ-wedding', 'occ-mitzvah', 'occ-special'];
let _pi = 0;
body = body.replace(/<img[^>]*src="(?:figma-assets\/)?imgImage88\.png"\s*\/>/g,
  () => `<img alt="" class="absolute inset-0 size-full object-contain" src="img/${PILL_ICONS[_pi++] || 'occ-special'}.png" />`);

// 8d) Rebuild the "game types" bento to match the PDF (the Figma frame's version is an
// older layout with an extra orange "משחקי ניקוד" card). Replace the whole section.
function sectionRange(html, marker) {
  const mi = html.indexOf(marker);
  if (mi < 0) return null;
  const re = /<div\b|<\/div>/g; let m, depth = 0, secStart = -1;
  while ((m = re.exec(html))) {
    if (m[0] === '</div>') { depth--; if (depth === 1 && mi >= secStart && mi < re.lastIndex) return [secStart, re.lastIndex]; }
    else { if (depth === 1) secStart = m.index; depth++; }
  }
  return null;
}
const medals = Array.from({ length: 10 }, (_, i) =>
  `<img src="img/medal-${i + 1}.png" alt="" class="w-[64px] h-[64px] object-contain" />`).join('');
const GAME_TYPES = `<div dir="rtl" class="bg-[#f3f0e9] w-full flex flex-col items-center py-[96px] px-[60px]">
  <h2 class="text-[64px] font-extrabold text-[#1e2330] text-center leading-[1.05] mb-[56px]">סוגי משחקים <span class="text-[#9a9a86]">(קלילים, ממכרים, כיפיים)</span></h2>
  <div class="w-full max-w-[1500px] flex flex-col gap-[28px]">
    <div class="flex flex-row-reverse gap-[28px] items-stretch">
      <div class="bg-[#F5CCF5] rounded-[44px] p-[40px] w-[37%] flex flex-col gap-[20px] text-right">
        <h3 class="text-[40px] font-extrabold text-[#1e2330]">משחקי זריזות</h3>
        <img src="img/gt-speed.png" alt="משחקי זריזות" class="w-full" />
        <p class="text-[21px] leading-[1.5] text-[#1e2330]">משחקים קצרים, מהירים וממכרים. כאלה שמדליקים את כולם תוך שניות, שוברים את הקרח וגורמים לידיים לעבוד לפני שהמוח מספיק לחשוב.</p>
      </div>
      <div class="flex-1 flex flex-col gap-[28px]">
        <div class="bg-[#EF5D9E] rounded-[44px] p-[40px] flex gap-[28px] items-center">
          <div class="flex-1 text-right flex flex-col gap-[14px]">
            <h3 class="text-[36px] font-extrabold text-[#1e2330]">משחקים עם טוויסט אישי</h3>
            <p class="text-[21px] leading-[1.5] text-[#1e2330]">הדמויות, הסיפור והבדיחות – הכול מבוסס על מי שחוגג. משחק שמרגיש כאילו נוצר במיוחד בשבילכם, כי הוא באמת נוצר ככה.</p>
          </div>
          <img src="img/gt-twist.png" alt="משחקים עם טוויסט אישי" class="w-[40%]" />
        </div>
        <div class="bg-[#CDE84A] rounded-[44px] p-[40px] flex gap-[28px] items-center">
          <div class="flex-1 text-right flex flex-col gap-[14px]">
            <h3 class="text-[36px] font-extrabold text-[#1e2330]">משחקי ספורט</h3>
            <p class="text-[21px] leading-[1.5] text-[#1e2330]">הדמות שלכם הופכת להיות שחקן מרכזי בענף הספורט האהוב עליכם.</p>
          </div>
          <img src="img/gt-sport.png" alt="משחקי ספורט" class="w-[44%]" />
        </div>
      </div>
    </div>
    <div class="flex flex-row-reverse gap-[28px] items-stretch">
      <div class="bg-[#780016] rounded-[44px] p-[40px] flex-1 text-white text-right flex flex-col justify-center gap-[18px]">
        <img src="img/gt-prizes.png" alt="" class="w-[50%] mx-auto" />
        <h3 class="text-[40px] font-extrabold">פרסים בהתאמה אישית</h3>
        <p class="text-[21px] leading-[1.5]">פרסים שנראים כמו אתם. מעוצבים, מצחיקים ומדויקים לאופי של הקבוצה או החוגג. לא עוד גביע גנרי שאוסף אבק.</p>
      </div>
      <div class="bg-[#2665d6] rounded-[44px] p-[40px] w-[35%] text-white text-right flex flex-col gap-[18px]">
        <h3 class="text-[40px] font-extrabold">טבלאות דירוג</h3>
        <img src="img/leaderboard.png" alt="טבלאות דירוג" class="w-[78%] mx-auto" />
      </div>
    </div>
  </div>
  <p class="text-[34px] font-bold text-[#1e2330] text-center mt-[56px]">לא צריך להיות גיימר. צריך רק אצבע, חיוך וקצת תחרותיות.</p>
  <div class="text-center mt-[36px]"><a href="#" class="bg-[#F5CCF5] text-[#1e2330] font-bold rounded-full inline-flex items-center gap-[10px] px-[34px] py-[18px] text-[20px]"><img src="img/ic-spark.svg" class="w-[20px] h-[20px]" alt="" />בנו משחק עכשיו</a></div>
</div>`;
const gtRange = sectionRange(body, 'סוגי משחקים');
if (gtRange) body = body.slice(0, gtRange[0]) + GAME_TYPES + body.slice(gtRange[1]);

// 8e) Let long text wrap — Figma hard-codes `whitespace-nowrap` sized for the exact
// Hebrew strings, so English (and some Hebrew) overflow / overlap. Strip it.
body = body.replace(/ whitespace-nowrap/g, '');

// 8f) Remove the "Gifts for individuals / Companies & organizations" toggle (not wanted).
function enclosingDivRange(html, anchor) {
  const ai = html.indexOf(anchor);
  if (ai < 0) return null;
  const start = html.lastIndexOf('<div', ai);
  const re = /<div\b|<\/div>/g; re.lastIndex = start;
  let depth = 0, m;
  while ((m = re.exec(html))) {
    if (m[0] === '</div>') { depth--; if (depth === 0) return [start, re.lastIndex]; }
    else depth++;
  }
  return null;
}
const togR = enclosingDivRange(body, 'w-[464px]');
if (togR) body = body.slice(0, togR[0]) + body.slice(togR[1]);

// Maroon "no bullshit" section: the Figma frame's image slot is empty and it carries
// broken, mis-cropped maroon sprite duplicates (the "grid" blocks). Strip those and drop
// in a clean phone mockup (cropped from the busy composite) on the left — per the PDF.
const nbR = sectionRange(body, 'בלי בולשיט');
if (nbR) {
  let sec = body.slice(nbR[0], nbR[1]);
  sec = sec.replace(/<img[^>]*src="(?:figma-assets\/)?img417513[^"]*"[^>]*\/>/g, '');
  const openEnd = sec.indexOf('>') + 1;
  const tag = sec.slice(0, openEnd).replace('class="', 'class="relative ');
  const phone = '<img src="img/falafel-phone.png" alt="FALAFEL MUSAVIAN" style="position:absolute;left:7%;top:50%;transform:translateY(-50%);width:17%;max-width:260px;z-index:5;pointer-events:none" />';
  sec = tag + phone + sec.slice(openEnd);
  body = body.slice(0, nbR[0]) + sec + body.slice(nbR[1]);
}

// Final CTA: swap the licensed Framer stock photo for the supplied image and keep the
// headline on a single line (it wraps awkwardly in English otherwise).
body = body.replace(/src="[^"]*imgImage1441\.png"/g, 'src="img/cta-ice.png"');
body = body.replace(/(<p\b[^>]*?)(>\s*מוכנים לשבור את הקרח)/, '$1 style="white-space:nowrap"$2');

// Carousel cleanup: remove the black avatar placeholder circles, replace the broken
// zoomed/offset image crops with a clean object-cover fit, and rebuild the nav arrows.
let _bz = 0;
while (_bz < 8) {
  const r = enclosingDivRange(body, 'bg-black');
  if (!r) break;
  body = body.slice(0, r[0]) + body.slice(r[1]);
  _bz++;
}
body = body.replace(
  /(<div class="aspect-\[277\/277\][^]*?<img alt="" class=")absolute h-\[[^\]]+\] left-\[[^\]]+\] max-w-none top-\[[^\]]+\] w-\[[^\]]+\]("[^>]*\/>)/g,
  '$1absolute inset-0 w-full h-full object-cover$2');
// rebuild the two carousel nav arrow buttons (broken chevron transforms)
(function () {
  const hi = body.indexOf('ששוברים את השגרה');
  if (hi < 0) return;
  const jb = body.lastIndexOf('justify-between', hi);
  if (jb < 0) return;
  const rowDiv = body.lastIndexOf('<div', jb);
  const gt = body.indexOf('>', rowDiv) + 1;
  const navStart = body.indexOf('<div', gt);
  if (navStart < 0 || navStart > hi) return;
  const re = /<div\b|<\/div>/g; re.lastIndex = navStart;
  let depth = 0, m, navEnd = -1;
  while ((m = re.exec(body))) { if (m[0] === '</div>') { depth--; if (depth === 0) { navEnd = re.lastIndex; break; } } else depth++; }
  if (navEnd < 0) return;
  const chev = (pts) => `<button class="bg-white rounded-full size-[56px] flex items-center justify-center" style="box-shadow:0 4px 14px rgba(0,0,0,.1)"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1e2330" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="${pts}"/></svg></button>`;
  const NAV = `<div class="flex gap-[12px] items-center shrink-0">${chev('15 18 9 12 15 6')}${chev('9 18 15 12 9 6')}</div>`;
  body = body.slice(0, navStart) + NAV + body.slice(navEnd);
})();

// Hero badge: keep "מקום הראשון" on a single line.
body = body.replace(/<span class="leading-\[normal\]">(\s*<br[^>]*\/>\s*מקום הראשון)/, '<span class="leading-[normal]" style="white-space:nowrap;display:inline-block">$1');
// "Who is it for" splat + a few spots: Figma uses leading-[0] on text wrappers, which makes
// wrapped lines overlap once the inner line-height utility is stripped. Use a real line-height.
body = body.split('leading-[0]').join('leading-[1.35]');

// Desktop FAQ: the Figma frame only exported the first answer. Add the other two so the
// accordion actually has content to reveal.
const FAQ_ANS = [
  ['אפשר לקבוע פרסים?', 'בהחלט. אפשר להוסיף פרסים אמיתיים או דיגיטליים, מותאמים אישית לחוגג ולקבוצה.'],
  ['זה מתאים גם למי שלא אוהב משחקים?', 'כן! המשחקים קלילים ואינטואיטיביים – צריך רק אצבע, חיוך וקצת תחרותיות.'],
];
for (const [q, a] of FAQ_ANS) {
  const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*</p>)');
  body = body.replace(re, '$1<p class="font-normal leading-[1.5] relative shrink-0 text-[18px] text-[rgba(0,0,0,0.68)] w-full" dir="auto">' + a + '</p>');
}

// Remove the Figma top-nav pill (an absolute element inside the scaled canvas, so it
// can't be sticky and its labels wrap). We render a real fixed sticky header instead.
{
  const r = enclosingDivRange(body, 'top-[15px] w-[1454px]');
  if (r) body = body.slice(0, r[0]) + body.slice(r[1]);
}

// Mobile layout (hand-built to match Mobile.pdf)
const MOBILE = fs.readFileSync(path.join(__dirname, 'mobile.html'), 'utf8');

// ---- i18n: build Hebrew (default) + English (LTR) ----
const EN = require('./translations.js');
function translate(s) {
  for (const he of Object.keys(EN).sort((a, b) => b.length - a.length)) s = s.split(he).join(EN[he]);
  return s;
}
function toLTR(s) {
  // True horizontal mirror of the RTL layout, processed per element by flex direction.
  function swap(c, a, b) { return c.split(a).join('@@_@@').split(b).join(a).split('@@_@@').join(b); }
  s = s.replace(/class="([^"]*)"/g, function (m, cls) {
    let c = cls;
    const isFlex = /(^|\s)(inline-)?flex($|\s)/.test(c);
    const isCol = /\bflex-col\b/.test(c);
    c = swap(c, 'text-right', 'text-left');
    c = swap(c, 'pr-[', 'pl-[');
    c = swap(c, 'mr-[', 'ml-[');
    c = swap(c, 'right-[', 'left-[');
    c = swap(c, 'rounded-tl', 'rounded-tr');
    c = swap(c, 'rounded-bl', 'rounded-br');
    if (isFlex && !isCol) {
      if (/\bflex-row-reverse\b/.test(c)) c = c.replace(/\s*\bflex-row-reverse\b/, '');
      else c = c + ' flex-row-reverse';
    } else if (isCol) {
      c = swap(c, 'items-end', 'items-start');
    }
    return 'class="' + c.replace(/\s+/g, ' ').trim() + '"';
  });
  s = s.replace(/dir="rtl"/g, 'dir="ltr"');
  return s;
}
// Find the range of the first child <div> of the element whose opening tag contains `parentAnchor`.
function divFirstChildRange(html, parentAnchor) {
  const ai = html.indexOf(parentAnchor);
  if (ai < 0) return null;
  const parentGt = html.indexOf('>', ai) + 1;
  const childStart = html.indexOf('<div', parentGt);
  if (childStart < 0) return null;
  const re = /<div\b|<\/div>/g; re.lastIndex = childStart;
  let depth = 0, m;
  while ((m = re.exec(html))) {
    if (m[0] === '</div>') { depth--; if (depth === 0) return [childStart, re.lastIndex]; }
    else depth++;
  }
  return null;
}
// Translate + mirror the desktop body, but protect the hero phone-mockup composition
// (its floating chips break under mirroring) so it renders like the Hebrew version.
function mirrorBody(b) {
  let t = translate(b);
  const mr = divFirstChildRange(t, 'bg-[#2665d6]');
  if (mr) {
    const mock = t.slice(mr[0], mr[1]);
    t = t.slice(0, mr[0]) + '@@MOCK@@' + t.slice(mr[1]);
    t = toLTR(t).replace('@@MOCK@@', mock);
  } else { t = toLTR(t); }
  return t;
}
function prefixPaths(s, p) { return p ? s.replace(/(["'(])(img\/|figma-assets\/|fonts\/)/g, '$1' + p + '$2') : s; }

// Real, sticky top navigation rendered OUTSIDE the scaled canvas (so it can be fixed and
// crisp). Holds the logo, one-line menu, an integrated language toggle, and the CTA.
function siteHeader(lang) {
  const he = lang === 'he';
  const links = he
    ? [['#how', 'איך זה עובד'], ['#games', 'כל המשחקים'], ['#faq', 'שאלות ותשובות']]
    : [['#how', 'How it works'], ['#games', 'All games'], ['#faq', 'FAQ']];
  const cta = he ? 'בנו משחק עכשיו' : 'Build a game now';
  const navLinks = links.map(([h, t]) => `<a href="${h}">${t}</a>`).join('');
  const toggle = `<div class="lang"><a href="/"${he ? ' class="on"' : ''}>עב</a><a href="/en/"${he ? '' : ' class="on"'}>EN</a></div>`;
  return `<header id="topnav" dir="${he ? 'rtl' : 'ltr'}">
  <div class="nav-inner">
    <a class="brand" href="${he ? '/' : '/en/'}"><img src="img/logo.png" alt="mygame" /></a>
    <nav class="nav-links">${navLinks}</nav>
    <div class="nav-right">${toggle}<a class="nav-cta" href="#build">${cta}</a></div>
  </div>
</header>`;
}
// Compact language link for the mobile menu (replaces the old floating button).
function mobileLang(lang) {
  return lang === 'he'
    ? '<a href="/en/" class="border border-[#e3e3e3] rounded-full px-[14px] py-[8px] text-center font-bold text-[14px] text-[#2665d6]">🌐 English</a>'
    : '<a href="/" class="border border-[#e3e3e3] rounded-full px-[14px] py-[8px] text-center font-bold text-[14px] text-[#2665d6]">🌐 עברית</a>';
}

function buildPage(lang, frameBody, mobileBody, header) {
  const title = lang === 'en' ? 'The gift that turns any event unforgettable' : 'המתנה שהופכת כל אירוע לבלתי נשכח';
  return `<!DOCTYPE html>
<html lang="${lang}" dir="ltr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<script src="https://cdn.tailwindcss.com"></script>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Varela+Round&family=Rubik:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
<style>
  /* Exact design font is "Ploni Round AAA" (licensed). Drop files in fonts/ to activate. */
  @font-face{font-family:'Ploni Round AAA';font-weight:400;src:url('fonts/PloniRoundAAA-Regular.woff2') format('woff2'),url('fonts/PloniRoundAAA-Regular.ttf') format('truetype');font-display:swap}
  @font-face{font-family:'Ploni Round AAA';font-weight:500;src:url('fonts/PloniRoundAAA-Medium.woff2') format('woff2'),url('fonts/PloniRoundAAA-Medium.ttf') format('truetype');font-display:swap}
  @font-face{font-family:'Ploni Round AAA';font-weight:600;src:url('fonts/PloniRoundAAA-DemiBold.woff2') format('woff2'),url('fonts/PloniRoundAAA-DemiBold.ttf') format('truetype');font-display:swap}
  @font-face{font-family:'Ploni Round AAA';font-weight:700;src:url('fonts/PloniRoundAAA-Bold.woff2') format('woff2'),url('fonts/PloniRoundAAA-Bold.ttf') format('truetype');font-display:swap}
  @font-face{font-family:'Ploni Round AAA';font-weight:800;src:url('fonts/PloniRoundAAA-UltraBold.woff2') format('woff2'),url('fonts/PloniRoundAAA-UltraBold.ttf') format('truetype');font-display:swap}
  html,body{margin:0;background:#fff}
  #frame,#frame *{font-family:'Ploni Round AAA','Varela Round','Rubik',system-ui,sans-serif}
  #stage{position:relative;width:100%;overflow:hidden}
  #frame{width:1920px;transform-origin:top left}
  /* Mobile layout (hand-built to match Mobile.pdf), desktop canvas hidden below 768px */
  #mobile{display:none}
  #mobile,#mobile *{font-family:'Ploni Round AAA','Varela Round','Rubik',system-ui,sans-serif}
  @media (max-width:767px){#stage{display:none}#mobile{display:block}}
  /* Sticky top navigation (lives outside the scaled canvas) */
  #topnav{position:fixed;top:0;left:0;right:0;z-index:1000;display:flex;justify-content:center;padding:14px 22px;box-sizing:border-box;font-family:'Ploni Round AAA','Varela Round','Rubik',system-ui,sans-serif}
  #topnav .nav-inner{width:100%;max-width:1280px;background:#fff;border-radius:22px;box-shadow:0 6px 20px rgba(0,0,0,.10);display:flex;align-items:center;justify-content:space-between;gap:24px;padding:9px 14px 9px 22px;transition:box-shadow .2s ease,padding .2s ease}
  #topnav[dir="rtl"] .nav-inner{padding:9px 22px 9px 14px}
  #topnav.scrolled .nav-inner{box-shadow:0 10px 30px rgba(0,0,0,.16)}
  #topnav .brand img{height:34px;display:block}
  #topnav .nav-links{display:flex;align-items:center;gap:30px;flex:1;justify-content:center}
  #topnav .nav-links a{color:#1e2330;font-weight:600;font-size:16px;text-decoration:none;white-space:nowrap}
  #topnav .nav-links a:hover{color:#2665d6}
  #topnav .nav-right{display:flex;align-items:center;gap:14px}
  #topnav .lang{display:inline-flex;border:1px solid #e4e4e4;border-radius:999px;overflow:hidden;font-weight:700;font-size:13px;line-height:1}
  #topnav .lang a{padding:7px 12px;color:#666;text-decoration:none}
  #topnav .lang a.on{background:#2665d6;color:#fff}
  #topnav .nav-cta{background:#111317;color:#fff;font-weight:700;font-size:15px;border-radius:999px;padding:12px 22px;text-decoration:none;white-space:nowrap}
  #topnav .nav-cta:hover{background:#2665d6}
  @media (max-width:767px){#topnav{display:none}}
</style>
</head>
<body>
${header}
<div id="stage">
<div id="frame">
${frameBody}
</div>
</div>
<div id="mobile">
${mobileBody}
</div>
<script>
  (function(){var hn=document.getElementById('topnav');if(hn)window.addEventListener('scroll',function(){hn.classList.toggle('scrolled',window.scrollY>14);},{passive:true});})();
  // Desktop FAQ accordion (open/close)
  function initFaq(){
    var fh=[].slice.call(document.querySelectorAll('#frame *')).find(function(e){return e.children.length===0&&/^(שאלות נפוצות|FAQ)$/.test(e.textContent.trim());});
    if(!fh)return;
    var sec=fh.parentElement;
    var cont=[].slice.call(sec.querySelectorAll('div')).filter(function(d){return [].slice.call(d.children).filter(function(c){return c.textContent.indexOf('?')>-1;}).length>=2;}).sort(function(a,b){return b.children.length-a.children.length;})[0];
    if(!cont)return;
    [].slice.call(cont.children).forEach(function(item,idx){
      var ps=item.querySelectorAll('p'); if(ps.length<2||item.textContent.indexOf('?')<0)return;
      var ans=ps[ps.length-1];
      ans.style.overflow='hidden'; ans.style.transition='max-height .28s ease,opacity .2s ease';
      function set(open){ans.style.maxHeight=open?(ans.scrollHeight+'px'):'0px';ans.style.opacity=open?'1':'0';item.setAttribute('data-open',open?'1':'0');}
      set(idx===0); item.style.cursor='pointer';
      item.addEventListener('click',function(){set(item.getAttribute('data-open')!=='1');});
    });
  }
  setTimeout(initFaq,400); setTimeout(initFaq,1400);
</script>
<script>
  function fit(){var f=document.getElementById('frame'),st=document.getElementById('stage');
    var s=window.innerWidth/1920;f.style.transform='scale('+s+')';
    st.style.height=(f.offsetHeight*s)+'px';}
  window.addEventListener('resize',fit);window.addEventListener('load',fit);
  if(document.readyState!=='loading')fit();
  // refit after Tailwind CDN applies styles and fonts load
  setTimeout(fit,300);setTimeout(fit,1200);

  // ---- Mobile interactions ----
  (function(){
    var nb=document.getElementById('mNavBtn'),nv=document.getElementById('mNav');
    if(nb&&nv)nb.addEventListener('click',function(){nv.classList.toggle('hidden');nv.classList.toggle('flex');});
    document.querySelectorAll('#mAcc .m-acc').forEach(function(it){
      var q=it.querySelector('.m-q'),a=it.querySelector('.m-a'),ic=it.querySelector('.m-q i');
      q.addEventListener('click',function(){
        var open=a.style.maxHeight&&a.style.maxHeight!=='0px';
        document.querySelectorAll('#mAcc .m-a').forEach(function(x){x.style.maxHeight='0px';});
        document.querySelectorAll('#mAcc .m-q i').forEach(function(x){x.textContent='+';});
        if(!open){a.style.maxHeight=a.scrollHeight+'px';ic.textContent='–';}
      });
    });
    var vp=document.getElementById('mCarVP');
    if(vp){var idx=0,cards=vp.children;
      function go(){cards[idx].scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'});}
      var nx=document.getElementById('mCarNext'),pv=document.getElementById('mCarPrev');
      nx&&nx.addEventListener('click',function(){idx=Math.min(idx+1,cards.length-1);go();});
      pv&&pv.addEventListener('click',function(){idx=Math.max(idx-1,0);go();});
    }
  })();
</script>
<script src="/cms.js" defer></script>
</body>
</html>`;

}

// ---- CMS field manifest (consumed by /cms.js and /admin) ----
// Every translatable string becomes an editable text field (HE + EN). Plus key images.
const CMS_FIELDS = [];
for (const he of Object.keys(EN)) {
  if (!he.trim()) continue;
  CMS_FIELDS.push({ k: he, type: 'text', he: he, en: EN[he], section: 'טקסטים' });
}
[['logo.png', 'לוגו'], ['cta-ice.png', 'תמונת CTA (האישה)'], ['falafel-phone.png', 'טלפון פלאפל'],
 ['hero-mockup.png', 'תמונת גיבור (מובייל)'], ['gt-prizes.png', 'תמונת פרסים'], ['leaderboard.png', 'טבלת דירוג']
].forEach(([k, label]) => CMS_FIELDS.push({ k, type: 'img', label, section: 'תמונות' }));
fs.writeFileSync(path.join(__dirname, 'cms-fields.json'), JSON.stringify(CMS_FIELDS));

// Hebrew (default) + English (LTR)
const heHtml = buildPage('he', body, MOBILE.replace('<!--LANGSWITCH-->', mobileLang('he')), siteHeader('he'));
fs.writeFileSync(path.join(__dirname, 'index.html'), heHtml, 'utf8');

const enHtml = prefixPaths(buildPage('en', mirrorBody(body), toLTR(translate(MOBILE)).replace('<!--LANGSWITCH-->', mobileLang('en')), siteHeader('en')), '../');
fs.mkdirSync(path.join(__dirname, 'en'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'en', 'index.html'), enHtml, 'utf8');

console.log('Wrote index.html (' + heHtml.length + ') + en/index.html (' + enHtml.length + ')');
