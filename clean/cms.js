/* mygame CMS runtime loader.
   Fetches saved content overrides from Supabase and applies them to the live page.
   Safe to expose: the anon key only allows reading published content + calling the
   password-guarded cms_login / cms_save RPCs. */
(function () {
  var SUPA = 'https://xvlobuotrihngqvuwyka.supabase.co';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2bG9idW90cmlobmdxdnV3eWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1OTk5ODAsImV4cCI6MjA4NTE3NTk4MH0.i9VSgaEjzJDm9D64TqN7AY7kbBIL9F8bahs-dDp9B-g';
  var lang = (document.documentElement.getAttribute('lang') === 'en') ? 'en' : 'he';
  function norm(s) { return (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim(); }

  function applyText(fields, ov) {
    var els = document.querySelectorAll('#frame *,#mobile *,#topnav *');
    var byText = {};
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.children.length === 0) {
        var t = norm(el.textContent);
        if (t) { (byText[t] = byText[t] || []).push(el); }
      }
    }
    fields.forEach(function (f) {
      if (f.type !== 'text') return;
      var rec = ov[f.k]; if (!rec) return;
      var val = rec[lang]; if (val == null || val === '') return;
      var def = norm(lang === 'he' ? f.he : f.en);
      (byText[def] || []).forEach(function (el) { el.textContent = val; });
    });
  }
  function applyImg(fields, ov) {
    fields.forEach(function (f) {
      if (f.type !== 'img') return;
      var rec = ov[f.k]; if (!rec || !rec.url) return;
      var imgs = document.querySelectorAll('img');
      for (var i = 0; i < imgs.length; i++) {
        var s = imgs[i].getAttribute('src') || '';
        if (s.indexOf(f.k) > -1) imgs[i].setAttribute('src', rec.url);
      }
    });
  }
  function applyColor(fields, ov) {
    fields.forEach(function (f) {
      if (f.type !== 'color') return;
      var rec = ov[f.k]; if (!rec || !rec.value) return;
      document.querySelectorAll('[data-cms-color="' + f.k + '"]').forEach(function (el) {
        el.style.backgroundColor = rec.value;
      });
    });
  }

  function run() {
    var fieldsP = fetch('/cms-fields.json').then(function (r) { return r.json(); });
    var dataP = fetch(SUPA + '/rest/v1/site_content?id=eq.1&select=data', {
      headers: { apikey: ANON, Authorization: 'Bearer ' + ANON }
    }).then(function (r) { return r.json(); }).then(function (rows) {
      return (rows && rows[0] && rows[0].data) || {};
    }).catch(function () { return {}; });
    Promise.all([fieldsP, dataP]).then(function (res) {
      var fields = res[0], data = res[1] || {};
      var ov = data || {};
      try { applyText(fields, ov); } catch (e) {}
      try { applyImg(fields, ov); } catch (e) {}
      try { applyColor(fields, ov); } catch (e) {}
    }).catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
  setTimeout(run, 1500);
})();
