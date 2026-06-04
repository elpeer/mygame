/* mygame CMS runtime loader.
   Applies saved content from Supabase to the live page.
   Data shape: { desktop:{key:{he,en}|{url}}, mobile:{...}, carousel:[{he,en,tags,tagsEn,img}] } */
(function () {
  var SUPA = 'https://xvlobuotrihngqvuwyka.supabase.co';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2bG9idW90cmlobmdxdnV3eWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1OTk5ODAsImV4cCI6MjA4NTE3NTk4MH0.i9VSgaEjzJDm9D64TqN7AY7kbBIL9F8bahs-dDp9B-g';
  var lang = (document.documentElement.getAttribute('lang') === 'en') ? 'en' : 'he';
  function norm(s) { return (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim(); }
  function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  function indexText(roots) {
    var map = {};
    roots.forEach(function (root) {
      if (!root) return;
      var els = root.querySelectorAll('*');
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        if (el.children.length === 0) {
          var t = norm(el.textContent);
          if (t) (map[t] = map[t] || []).push(el);
        }
      }
    });
    return map;
  }
  function applyText(fields, bucket, roots) {
    if (!bucket) return;
    var byText = indexText(roots);
    fields.forEach(function (f) {
      if (f.type !== 'text') return;
      var rec = bucket[f.k]; if (!rec) return;
      var val = rec[lang]; if (val == null || val === '') return;
      var def = norm(lang === 'he' ? f.he : f.en);
      (byText[def] || []).forEach(function (el) { el.textContent = val; });
    });
  }
  function applyImg(fields, bucket, roots) {
    if (!bucket) return;
    fields.forEach(function (f) {
      if (f.type !== 'img') return;
      var rec = bucket[f.k]; if (!rec || !rec.url) return;
      roots.forEach(function (root) {
        if (!root) return;
        var imgs = root.querySelectorAll('img');
        for (var i = 0; i < imgs.length; i++) {
          var s = imgs[i].getAttribute('src') || '';
          if (s.indexOf(f.k) > -1) imgs[i].setAttribute('src', rec.url);
        }
      });
    });
  }
  function cardHtml(c) {
    var title = lang === 'en' ? (c.en || c.he || '') : (c.he || '');
    var tags = lang === 'en' ? (c.tagsEn || c.tags || []) : (c.tags || []);
    var img = c.img || '';
    if (img && !/^https?:|^\//.test(img)) img = '/img/' + img;
    return '<div class="bg-white rounded-[40px] p-[26px] shrink-0 w-[340px] flex flex-col gap-[16px]" style="scroll-snap-align:start">'
      + '<h3 class="text-[26px] font-extrabold text-[#1e2330] leading-[1.12]">' + esc(title) + '</h3>'
      + '<div class="flex gap-[10px]">' + tags.map(function (t) { return '<span class="bg-[#f3f0e9] rounded-full px-[15px] py-[6px] text-[15px] font-medium text-[#1e2330]">' + esc(t) + '</span>'; }).join('') + '</div>'
      + '<div class="w-full aspect-square rounded-[26px] overflow-hidden"><img src="' + img + '" alt="" class="w-full h-full object-cover" /></div>'
      + '</div>';
  }
  function renderCarousel(cards) {
    if (!cards || !cards.length) return;
    var deck = document.getElementById('gcDeck'); if (!deck) return;
    deck.innerHTML = cards.map(cardHtml).join('');
  }

  function apply(fields, data) {
    var desk = data.desktop || {}, mob = data.mobile || {};
    var frame = document.getElementById('frame'), topnav = document.getElementById('topnav'), mobile = document.getElementById('mobile');
    try { applyText(fields, desk, [frame, topnav]); } catch (e) {}
    try { applyImg(fields, desk, [frame, topnav]); } catch (e) {}
    try { applyText(fields, mob, [mobile]); } catch (e) {}
    try { applyImg(fields, mob, [mobile]); } catch (e) {}
    try { renderCarousel(data.carousel); } catch (e) {}
  }

  function run() {
    Promise.all([
      fetch('/cms-fields.json').then(function (r) { return r.json(); }),
      fetch(SUPA + '/rest/v1/site_content?id=eq.1&select=data', { headers: { apikey: ANON, Authorization: 'Bearer ' + ANON } })
        .then(function (r) { return r.json(); }).then(function (rows) { return (rows && rows[0] && rows[0].data) || {}; }).catch(function () { return {}; })
    ]).then(function (res) { apply(res[0] || [], res[1] || {}); }).catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  setTimeout(run, 1500);
})();
