// ===== Mobile nav =====
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');
burger.addEventListener('click', () => nav.classList.toggle('open'));
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));

// ===== FAQ accordion =====
document.querySelectorAll('.acc__item').forEach(item => {
  const q = item.querySelector('.acc__q');
  const a = item.querySelector('.acc__a');
  q.addEventListener('click', () => {
    const open = item.classList.contains('open');
    document.querySelectorAll('.acc__item').forEach(o => { o.classList.remove('open'); o.querySelector('.acc__a').style.maxHeight = null; });
    if (!open) { item.classList.add('open'); a.style.maxHeight = a.scrollHeight + 'px'; }
  });
});

// ===== Games carousel =====
(function () {
  const track = document.getElementById('carTrack');
  const prev = document.getElementById('carPrev');
  const next = document.getElementById('carNext');
  if (!track) return;
  const cards = Array.from(track.children);
  let index = 0;

  function perView() {
    const w = window.innerWidth;
    if (w <= 640) return 1;
    if (w <= 980) return 2;
    return 3;
  }
  function maxIndex() { return Math.max(0, cards.length - perView()); }
  function step() {
    const style = getComputedStyle(track);
    const gap = parseFloat(style.columnGap || style.gap) || 24;
    return cards[0].getBoundingClientRect().width + gap;
  }
  function update() {
    index = Math.min(index, maxIndex());
    // RTL: move track to the right by translating positive X
    track.style.transform = `translateX(${index * step()}px)`;
  }
  // In RTL, "next" (›, on the left) advances forward
  next.addEventListener('click', () => { index = Math.min(index + 1, maxIndex()); update(); });
  prev.addEventListener('click', () => { index = Math.max(index - 1, 0); update(); });
  window.addEventListener('resize', update);
  update();
})();

// ===== Reveal on scroll =====
const revealEls = document.querySelectorAll('.step,.reason,.occ,.tcard,.gcard,.nobs__item,.acc__item,.section__title');
revealEls.forEach(el => el.classList.add('reveal'));
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.12 });
revealEls.forEach(el => io.observe(el));
