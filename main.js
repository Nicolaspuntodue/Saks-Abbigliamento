/* Saks Cerimonia — scroll choreography (GSAP + ScrollTrigger, Lenis on desktop only) */
const root = document.documentElement;
// CDN libs missing (blocked network, old browser): drop the hidden states and leave the static page
if (!window.gsap || !window.ScrollTrigger || !window.Lenis) {
  root.classList.remove('js');
  throw new Error('animation libs unavailable');
}
gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = matchMedia('(pointer: coarse)').matches;
const nav = $('.nav');

if (reduce) throw new Error('reduced motion: static layout');

/* ---------- smooth scroll (desktop only — touch keeps native, cheaper scrolling) ---------- */
let lenis = null;
if (!touch) {
  lenis = new Lenis({ lerp: 0.1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
$$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const target = $(a.getAttribute('href'));
  if (!target) return;
  e.preventDefault();
  lenis ? lenis.scrollTo(target, { duration: 1.6 }) : target.scrollIntoView({ behavior: 'smooth' });
}));

/* ---------- nav: hide going down, back going up; white over full-bleed photos ---------- */
ScrollTrigger.create({
  start: 0, end: 'max',
  onUpdate: (self) => nav.classList.toggle('nav--hidden', self.direction === 1 && self.scroll() > 120),
});
const lightNav = (on) => nav.classList.toggle('nav--light', on);

/* ---------- load intro ---------- */
gsap.timeline({ defaults: { ease: 'expo.out' } })
  .to('.hero__title .line > span', { y: 0, yPercent: 0, duration: 1.6, stagger: 0.12 })
  .from('.hero__media', { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.6 }, 0.25)
  .from('.hero__media img', { scale: 1.4, duration: 2 }, 0.25);

/* grow a small framed photo into the full pinned viewport (geometry lives in CSS, see .grow) */
const fill = { '--p': 1, ease: 'power2.inOut' };

/* ---------- 1 · hero ---------- */
{
  const pin = $('.hero__pin');
  gsap.timeline({
    scrollTrigger: {
      trigger: pin, start: 'top top', end: '+=150%', pin: true, scrub: 0.8, invalidateOnRefresh: true,
      onUpdate: (s) => lightNav(s.progress > 0.45 && s.progress < 1),
      onLeave: () => lightNav(false),
    },
  })
    .to('.hero__title', { yPercent: -60, opacity: 0, duration: 0.6, ease: 'power1.in' }, 0)
    .to('.hero__media', { ...fill, duration: 1 }, 0)
    .fromTo('.hero__media img', { scale: 1.15 }, { scale: 1, duration: 1, ease: 'none' }, 0)
    .fromTo('.hero__l', { opacity: 0, x: -60 }, { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out' }, 0.8)
    .fromTo('.hero__r', { opacity: 0, x: 60 }, { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out' }, 0.95)
    .to({}, { duration: 0.35 });
}

/* ---------- headings: line masks; copy: soft rise; photos: slice reveal ---------- */
$$('[data-lines]').forEach((h) => gsap.to($$('.line > span', h), {
  y: 0, yPercent: 0, duration: 1.4, stagger: 0.1, ease: 'expo.out',
  scrollTrigger: { trigger: h, start: 'top 85%' },
}));
ScrollTrigger.batch('[data-reveal]', {
  start: 'top 88%',
  onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.2, stagger: 0.12, ease: 'expo.out' }),
});
$$('[data-slice]').forEach((f) => {
  gsap.timeline({ scrollTrigger: { trigger: f, start: 'top 88%' } })
    .to(f, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.out' })
    .from($('img', f), { scale: 1.3, duration: 2, ease: 'expo.out' }, 0);
});

/* ---------- 3 · essenza ---------- */
{
  const pin = $('.essenza__pin');
  gsap.timeline({
    scrollTrigger: {
      trigger: pin, start: 'top top', end: '+=150%', pin: true, scrub: 0.8, invalidateOnRefresh: true,
      onUpdate: (s) => lightNav(s.progress > 0.55 && s.progress < 1),
      onLeave: () => lightNav(false),
    },
  })
    .to('.essenza__pin > .eyebrow, .essenza__pin > .display', { yPercent: -30, opacity: 0, duration: 0.5, ease: 'power1.in' }, 0.25)
    .to('.essenza__media', { ...fill, duration: 1 }, 0)
    .fromTo('.essenza__media img', { scale: 1.2 }, { scale: 1, duration: 1, ease: 'none' }, 0)
    .to({}, { duration: 0.3 });
}

/* ---------- 4 · process — bands drift up, then the grey panel and its sliding line ---------- */
{
  const pin = $('.process__pin');
  const words = $$('.process__line .w');
  const dots = $$('.process__dots li');
  const shots = $$('.shot');
  const line = $('.process__line');
  const gut = () => parseFloat(getComputedStyle(root).getPropertyValue('--gut')) || 24;
  const xFor = (i) => () => gut() - words[i].offsetLeft;
  let step = -1;
  const setStep = (i) => {
    if (i === step) return;
    step = i;
    words.forEach((w, k) => w.classList.toggle('on', k === i));
    dots.forEach((d, k) => d.classList.toggle('on', k === i));
  };

  gsap.set(shots, { opacity: 0, scale: 1.08 });
  gsap.set('.process__panel', { clipPath: 'inset(100% 0% 0% 0%)' });

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: pin, start: 'top top', end: '+=320%', pin: true, scrub: 0.8, invalidateOnRefresh: true,
      onUpdate: (s) => setStep(s.progress < 0.62 ? 0 : s.progress < 0.82 ? 1 : 2),
    },
  });
  $$('.band').forEach((b, i) => tl.to(b, { y: () => -(pin.clientHeight + b.offsetHeight * 1.2), duration: 1.1 }, i * 0.28));
  tl.to('.process__panel', { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.5, ease: 'power2.inOut' }, 1.1)
    .fromTo(line, { x: () => pin.clientWidth * 0.5 }, { x: xFor(0), duration: 0.5, ease: 'power2.out' }, 1.3)
    .to(shots[0], { opacity: 1, scale: 1, duration: 0.4 }, 1.35)
    .to(line, { x: xFor(1), duration: 0.5, ease: 'power2.inOut' }, 2.1)
    .to(shots[0], { opacity: 0, duration: 0.3 }, 2.1)
    .to(shots[1], { opacity: 1, scale: 1, duration: 0.4 }, 2.2)
    .to(line, { x: xFor(2), duration: 0.5, ease: 'power2.inOut' }, 2.75)
    .to(shots[1], { opacity: 0, duration: 0.3 }, 2.75)
    .to(shots[2], { opacity: 1, scale: 1, duration: 0.4 }, 2.85)
    .to({}, { duration: 0.35 });
}

/* ---------- 6 · gallery ---------- */
gsap.set('.gallery li', { opacity: 0, y: 40 });
ScrollTrigger.batch('.gallery li', {
  start: 'top 92%',
  onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.1, stagger: 0.07, ease: 'expo.out' }),
});

/* ---------- 7 · poem — lines slide together, the medallion falls and spins into the gap ---------- */
{
  const poem = $('.poem');
  const coin = $('.coin');
  const splits = $$('.pl--split', poem);
  const coinY = () => {
    const a = splits[0], b = splits[1];
    return (a.offsetTop + b.offsetTop + b.offsetHeight) / 2 - coin.offsetHeight / 2;
  };
  $$('.pl', poem).forEach((l, i) => gsap.fromTo(l, { xPercent: i % 2 ? 14 : -14 }, {
    xPercent: 0, ease: 'none',
    scrollTrigger: { trigger: poem, start: 'top bottom', end: 'center 55%', scrub: 0.6 },
  }));
  gsap.timeline({ scrollTrigger: { trigger: poem, start: 'top 85%', end: 'center 55%', scrub: 0.6, invalidateOnRefresh: true } })
    .fromTo(coin, { y: 0, rotateY: 0, rotateX: 18 }, { y: coinY, rotateY: 900, rotateX: 0, ease: 'power2.out' })
    .fromTo(coin, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.15 }, 0);
  gsap.to(coin, { rotateY: '+=360', ease: 'none', scrollTrigger: { trigger: poem, start: 'center 55%', end: 'bottom top', scrub: 0.6 } });
}

/* fonts and lazy images change heights — re-measure once they settle */
document.fonts?.ready.then(() => ScrollTrigger.refresh());
addEventListener('load', () => ScrollTrigger.refresh());
