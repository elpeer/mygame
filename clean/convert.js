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
    <div class="flex flex-row-reverse gap-[28px] items-start">
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
    <div class="flex flex-row-reverse gap-[28px] items-start">
      <div class="bg-[#780016] rounded-[44px] p-[40px] flex-1 text-white text-right flex flex-col gap-[18px]">
        <img src="img/gt-prizes.png" alt="" class="w-[94%] mx-auto" />
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

// Add the transparent falafel mockup to the maroon "no bullshit" section
// (the Figma HR-variant frame lacks it; PDF shows it on the left).
const nbR = sectionRange(body, 'בלי בולשיט');
if (nbR) {
  const openEnd = body.indexOf('>', nbR[0]) + 1;
  const tag = body.slice(nbR[0], openEnd).replace('class="', 'class="relative ');
  const falafel = '<img src="img/falafel.png" alt="FALAFEL MUSAVIAN" style="position:absolute;left:7%;top:50%;transform:translateY(-50%);width:33%;max-width:620px;z-index:5;pointer-events:none" />';
  body = body.slice(0, nbR[0]) + tag + falafel + body.slice(openEnd);
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
  // Mirror the RTL-physical layout to LTR by swapping directional utility classes.
  const pairs = [
    ['flex-row-reverse', 'flex-row'],
    ['text-right', 'text-left'],
    ['items-end', 'items-start'],
    ['justify-end', 'justify-start'],
    ['self-end', 'self-start'],
    ['rounded-tl', 'rounded-tr'],
    ['rounded-bl', 'rounded-br'],
    ['pr-[', 'pl-['],
    ['mr-[', 'ml-['],
    ['right-[', 'left-['],
  ];
  pairs.forEach(function (p, i) {
    const ph = ' ' + i + ' ';
    s = s.split(p[0]).join(ph).split(p[1]).join(p[0]).split(ph).join(p[1]);
  });
  s = s.replace(/dir="rtl"/g, 'dir="ltr"');
  return s;
}
function prefixPaths(s, p) { return p ? s.replace(/(["'(])(img\/|figma-assets\/|fonts\/)/g, '$1' + p + '$2') : s; }
function langSwitch(href, label) {
  return `<a href="${href}" style="position:fixed;bottom:16px;right:16px;z-index:9999;background:#fff;border:1px solid #e6e6e6;border-radius:999px;padding:9px 18px;font-weight:700;font-size:15px;color:#21307d;text-decoration:none;box-shadow:0 6px 18px rgba(0,0,0,.15);font-family:system-ui,sans-serif">${label}</a>`;
}

function buildPage(lang, frameBody, mobileBody, switcher) {
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
</style>
</head>
<body>
<div id="stage">
<div id="frame">
${frameBody}
</div>
</div>
<div id="mobile">
${mobileBody}
</div>
${switcher}
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
</body>
</html>`;

}

// Hebrew (default) + English (LTR)
const heHtml = buildPage('he', body, MOBILE, langSwitch('en/index.html', 'English'));
fs.writeFileSync(path.join(__dirname, 'index.html'), heHtml, 'utf8');

const enHtml = prefixPaths(buildPage('en', toLTR(translate(body)), toLTR(translate(MOBILE)), langSwitch('../index.html', 'עברית')), '../');
fs.mkdirSync(path.join(__dirname, 'en'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'en', 'index.html'), enHtml, 'utf8');

console.log('Wrote index.html (' + heHtml.length + ') + en/index.html (' + enHtml.length + ')');
