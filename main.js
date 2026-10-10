const root = document.documentElement;
root.classList.add('js');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = innerWidth < 860;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const darkEls = $$('.statement, .atelier');

/* ------------------------------------------------------------------
   WebGL silk — one draped satin plane behind the page.
   Scroll moves the folds and tilts the cloth; dark sections turn it "vino".
------------------------------------------------------------------- */
const initSilk = (THREE) => {
const canvas = $('#silk');
let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'low-power' });
} catch {
  root.classList.add('no-webgl');
  return;
}

const LIGHT = {
  bg: new THREE.Color('#F3EEE6'), base: new THREE.Color('#F7F2EB'), shadow: new THREE.Color('#C8B49A'),
  tint: new THREE.Color('#EADBC4'), sheen: new THREE.Color('#FFFFFF'),
};
const DARK = {
  bg: new THREE.Color('#4A1822'), base: new THREE.Color('#62242F'), shadow: new THREE.Color('#22070D'),
  tint: new THREE.Color('#74303D'), sheen: new THREE.Color('#E8C9A8'),
};

{
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 50);
  camera.position.set(0, 0, 7);

  const uniforms = {
    uTime: { value: 0 }, uScroll: { value: 0 }, uMouse: { value: new THREE.Vector2(9, 9) },
    uBase: { value: LIGHT.base.clone() }, uShadow: { value: LIGHT.shadow.clone() },
    uTint: { value: LIGHT.tint.clone() }, uSheen: { value: LIGHT.sheen.clone() },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      uniform float uTime, uScroll;
      uniform vec2 uMouse;
      varying vec3 vN, vPos;
      varying float vH;
      float h(vec2 q) {
        float t = uTime * .22;
        float s = uScroll;
        vec2 p = q * 1.5;
        float z = sin(p.x * .9 + p.y * .35 + t + s * .6) * .45
                + sin(p.x * 1.7 - p.y * .6 + t * 1.3) * .18
                + sin(p.y * 1.2 + p.x * .2 - t * .8 - s * .4) * .22;
        float c = sin((p.x * .8 + p.y * .5) * 1.6 + t * .5 + s * .9);
        z -= sqrt(c * c + .05) * .22;   // soft creases (smooth abs, no faceting)
        z += sin((p.x + p.y * .6) * 2.6 + t * .6 + s * 1.4) * .05;
        vec2 m = q - uMouse;
        z += .3 * exp(-dot(m, m) * .7);   // soft pointer lift
        return z * (.5 + .1 * min(s, 3.));
      }
      void main() {
        vec2 p = position.xy;
        float e = .015;
        vec3 a = vec3(p, h(p));
        vec3 b = vec3(p + vec2(e, 0.), h(p + vec2(e, 0.)));
        vec3 c = vec3(p + vec2(0., e), h(p + vec2(0., e)));
        vN = normalize(normalMatrix * normalize(cross(b - a, c - a)));
        vec4 mv = modelViewMatrix * vec4(a, 1.);
        vPos = mv.xyz;
        vH = a.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uBase, uShadow, uTint, uSheen;
      varying vec3 vN, vPos;
      varying float vH;
      void main() {
        vec3 N = normalize(vN);
        if (!gl_FrontFacing) N = -N;
        vec3 V = normalize(-vPos);
        vec3 L = normalize(vec3(-.45, .75, .6));
        vec3 H = normalize(L + V);
        float diff = dot(N, L) * .5 + .5;
        float nh = max(dot(N, H), 0.);
        float spec = pow(nh, 70.) * .55 + pow(nh, 10.) * .12;   // satin: tight highlight + soft bloom
        float rim = pow(1. - max(dot(N, V), 0.), 4.) * .06;
        vec3 col = mix(uShadow, uBase, smoothstep(.05, .9, diff));
        col = mix(col, uTint, smoothstep(-.1, .4, vH) * .3);
        col += uSheen * (spec + rim);
        gl_FragColor = vec4(col, 1.);
      }`,
  });

  const seg = small ? [80, 60] : [160, 110];
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(20, 14, ...seg), material);
  cloth.rotation.set(-.45, 0, -.12);
  scene.add(cloth);

  const resize = () => {
    // the silk is soft: render it below screen resolution and let CSS upscale (big GPU saving)
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5) * (small ? .5 : .7));
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  };
  resize();
  addEventListener('resize', resize);

  const mouse = new THREE.Vector2(9, 9);
  if (matchMedia('(pointer: fine)').matches) {
    addEventListener('pointermove', (e) => {
      mouse.set((e.clientX / innerWidth - .5) * 6, -(e.clientY / innerHeight - .5) * 3.6);
    });
  }

  const openEls = $$('.hero, .essenza, .collage, .statement, .atelier'); // sections that show the canvas
  const darkness = () => {
    let d = 0;
    for (const el of darkEls) {
      const r = el.getBoundingClientRect();
      const inn = clamp01((innerHeight * .55 - r.top) / (innerHeight * .35)); // turn dark only once the section owns the screen
      const out = clamp01((r.bottom - innerHeight * .15) / (innerHeight * .5));
      d = Math.max(d, Math.min(inn, out));
    }
    return d;
  };
  const visible = () => openEls.some((el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight;
  });

  const clock = new THREE.Clock();
  let dark = 0;
  const bg = new THREE.Color();
  let frame = 0;
  gsap.ticker.add(() => {
    if (small && frame++ % 2) return; // ~30fps on phones is plenty for slow cloth
    const dt = Math.min(clock.getDelta(), .1);
    if (!visible()) return; // canvas fully covered by solid sections — skip the draw
    if (!reduce) uniforms.uTime.value += dt;
    const s = reduce ? 0 : scrollY / innerHeight;
    uniforms.uScroll.value += (s - uniforms.uScroll.value) * .08;
    uniforms.uMouse.value.lerp(mouse, .05);

    dark += (darkness() - dark) * .12;
    uniforms.uBase.value.lerpColors(LIGHT.base, DARK.base, dark);
    uniforms.uShadow.value.lerpColors(LIGHT.shadow, DARK.shadow, dark);
    uniforms.uTint.value.lerpColors(LIGHT.tint, DARK.tint, dark);
    uniforms.uSheen.value.lerpColors(LIGHT.sheen, DARK.sheen, dark);
    renderer.setClearColor(bg.lerpColors(LIGHT.bg, DARK.bg, dark));

    const p = uniforms.uScroll.value;
    cloth.rotation.x = -.45 + Math.min(p, 4) * .06;
    cloth.rotation.z = -.12 + Math.sin(p * .5) * .08;
    camera.position.y = -Math.min(p, 4) * .08;
    renderer.render(scene, camera);
    if (!canvas.classList.contains('is-on')) canvas.classList.add('is-on');
  });
}
};
// three.js is loaded off the critical path: the page and its animations start immediately,
// the silk fades in as soon as the library arrives
import('three').then(initSilk).catch(() => root.classList.add('no-webgl'));

/* ------------------------------------------------------------------
   Scroll choreography (GSAP + Lenis) — Vero-style pinned scenes
------------------------------------------------------------------- */
gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

// wrap every word of [data-split] headings in a mask (keeps <em> and <br>)
const split = (el) => {
  const wrap = (text, tag) => text.split(/(\s+)/).filter(Boolean).map((w) => (
    /^\s+$/.test(w) ? ' ' : `<span class="mask"><span>${tag ? `<${tag}>${w}</${tag}>` : w}</span></span>`
  )).join('');
  el.innerHTML = [...el.childNodes].map((n) => (
    n.nodeType === 3 ? wrap(n.textContent) : n.nodeName === 'BR' ? '<br>' : wrap(n.textContent, n.nodeName.toLowerCase())
  )).join('');
};
const words = (el) => {
  el.innerHTML = el.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(' ');
  return el.querySelectorAll('.w');
};

// marquee: duplicated row driven by GSAP so scroll speed can push it
const row = $('.marquee__row');
row.innerHTML += row.innerHTML;
row.style.animation = 'none';
const marquee = gsap.to(row, { xPercent: -50, duration: 40, ease: 'none', repeat: -1 });

// sequence state (shared by pinned and reduced-motion modes)
const seqSpans = $$('.seq__line span');
const seqNotes = $$('.seq__notes p');
const seqDots = $$('.seq__dots li');
const setStep = (i) => [seqSpans, seqNotes, seqDots].forEach((list) => list.forEach((el, j) => el.classList.toggle('is-on', j === i)));
setStep(0);

let heroST = null;
let essST = null;

if (reduce) {
  root.classList.add('no-pin');
  marquee.pause();
} else {
  const lenis = new Lenis({ lerp: .1 });
  window.lenis = lenis; // handy for QA from the console
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(() => {
    const target = 1 + Math.min(Math.abs(lenis.velocity) * .12, 5);
    marquee.timeScale(marquee.timeScale() + (target - marquee.timeScale()) * .1);
  });
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const target = $(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { duration: 1.6 });
  }));

  /* 1 · HERO — intro, then the photo folds into an atelier arch */
  lenis.stop();
  const intro = gsap.timeline();
  intro
    .from('.loader img', { opacity: 0, y: 12, duration: .6, ease: 'power3.out' })
    .to('.loader__bar', { scaleX: 1, duration: .7, ease: 'power2.inOut' }, '<.1')
    .to('.loader', { yPercent: -100, duration: 1, ease: 'expo.inOut' })
    .call(() => lenis.start(), null, '<.5') // scrolling unlocks as soon as the curtain lifts
    .from('.hero__frame img', { scale: 1.35, duration: 2.2, ease: 'expo.out' }, '<.25')
    .from('.hero__title .mask > span', { yPercent: 110, duration: 1.5, ease: 'expo.out', stagger: .14 }, '<.3')
    .from('.hero__meta', { opacity: 0, duration: 1 }, '<.5')
    .set('.loader', { display: 'none' });

  gsap.to('.progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });

  const arch = small
    ? 'inset(26% 16% 20% 16% round 999px 999px 0px 0px)'
    : 'inset(19% 37% 15% 37% round 999px 999px 0px 0px)';
  const heroTL = gsap.timeline({
    scrollTrigger: { trigger: '.hero', pin: true, start: 'top top', end: '+=130%', scrub: 1 },
  });
  heroTL
    .fromTo('.hero__frame', { clipPath: 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)' }, { clipPath: arch, ease: 'power2.inOut' }, 0)
    .to('.hero__frame img', { scale: 1, yPercent: small ? 16 : 9, ease: 'power2.inOut' }, 0) // slide the face into the arch
    .to('.hero__frame', { '--ov': 0, ease: 'none' }, 0)
    .to('.hero', { color: '#231A15', ease: 'none', duration: .5 }, .25)
    .to('.hero__l1', { scale: .5, transformOrigin: '0% 0%', ease: 'power2.inOut' }, 0)
    .to('.hero__l2', { scale: .5, transformOrigin: '100% 100%', ease: 'power2.inOut' }, 0);
  heroST = heroTL.scrollTrigger;

  /* 2 · ESSENZA — the tiny photo under the title grows to full screen */
  const essTL = gsap.timeline({
    scrollTrigger: { trigger: '.essenza', pin: true, start: 'top top', end: '+=160%', scrub: 1 },
  });
  essTL
    .fromTo('.essenza__media',
      { clipPath: small ? 'inset(62% 34% 10% 34%)' : 'inset(64% 45% 12% 45%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.inOut', duration: 1 }, .15)
    .fromTo('.essenza__media img', { scale: 1.35 }, { scale: 1, ease: 'power2.inOut', duration: 1 }, .15)
    .to('.essenza__media', { '--shade': 1, duration: .3 }, 1.2)
    .fromTo('.essenza__caption', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: .3 }, 1.25)
    .to({}, { duration: .2 });
  essST = essTL.scrollTrigger;

  /* 3 · SEQUENZA — images wipe in while the words light up */
  const seqImgs = $$('.seq__img');
  const seqTL = gsap.timeline({
    scrollTrigger: {
      trigger: '.seq', pin: true, start: 'top top', end: '+=300%', scrub: 1,
      onUpdate: ({ progress: p }) => setStep(p < .3 ? 0 : p < .7 ? 1 : 2),
    },
  });
  seqTL.to({}, { duration: .3 });
  [1, 2].forEach((i) => {
    seqTL
      .fromTo(seqImgs[i], { clipPath: 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power3.inOut', duration: 1 })
      .fromTo(seqImgs[i].firstElementChild, { scale: 1.25, xPercent: 8 }, { scale: 1, xPercent: 0, ease: 'power3.inOut', duration: 1 }, '<')
      .to(seqImgs[i - 1].firstElementChild, { xPercent: -12, ease: 'power3.inOut', duration: 1 }, '<')
      .to({}, { duration: .3 });
  });

  /* 4 · OCCASIONI — pinned horizontal travel */
  const track = $('.occasioni__track');
  const dist = () => Math.max(0, track.scrollWidth - innerWidth);
  gsap.to(track, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: { trigger: '.occasioni', pin: true, start: 'top top', end: () => '+=' + dist(), scrub: 1, invalidateOnRefresh: true },
  });
  gsap.from('.card', {
    y: 80, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: .08,
    scrollTrigger: { trigger: '.occasioni', start: 'top 70%' },
  });

  /* 5 · COLLAGE — pinned: the four photos drift in and settle around the headline */
  const colTL = gsap.timeline({
    scrollTrigger: { trigger: '.collage', pin: true, start: 'top top', end: '+=110%', scrub: 1 },
  });
  const drift = [[-30, 40, -6], [30, -35, 5], [-25, -40, 4], [25, 45, -5]];
  $$('.collage__f').forEach((f, i) => {
    const [x, y, r] = drift[i];
    colTL
      .fromTo(f, { xPercent: x, yPercent: y, rotate: r, clipPath: 'inset(100% 0% 0% 0%)' },
        { xPercent: 0, yPercent: 0, rotate: 0, clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'power3.out' }, i * .12)
      .fromTo(f.firstElementChild, { scale: 1.35 }, { scale: 1, duration: 1, ease: 'power3.out' }, '<');
  });
  colTL
    .to(words($('[data-words]')), { opacity: 1, stagger: .04, duration: .3, ease: 'none' }, .45)
    .to({}, { duration: .25 });

  /* 6 · 0 → 75 */
  const count = $('[data-count]');
  const n = { v: 0 };
  gsap.to(n, {
    v: 75, ease: 'none',
    onUpdate: () => { count.textContent = Math.round(n.v); },
    scrollTrigger: { trigger: '.statement', start: 'top 80%', end: 'center center', scrub: true },
  });
  gsap.fromTo('.statement__big', { scale: .7, opacity: 0 }, {
    scale: 1, opacity: 1, ease: 'none',
    scrollTrigger: { trigger: '.statement', start: 'top 85%', end: 'center center', scrub: true },
  });

  /* 7–8 · image reveals + parallax */
  $$('.maison__tile figure, .voice figure').forEach((fig) => {
    gsap.fromTo(fig, { clipPath: 'inset(100% 0% 0% 0%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.out',
      scrollTrigger: { trigger: fig, start: 'top 85%' },
    });
    gsap.from(fig.firstElementChild, { scale: 1.25, duration: 2, ease: 'expo.out', scrollTrigger: { trigger: fig, start: 'top 85%' } });
  });
  gsap.to('.voice img', {
    yPercent: -12, ease: 'none',
    scrollTrigger: { trigger: '.voice', start: 'top bottom', end: 'bottom top', scrub: true },
  });

  /* split headings rise word by word */
  $$('[data-split]').forEach((el) => {
    split(el);
    gsap.from(el.querySelectorAll('.mask > span'), {
      yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: .05,
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
  });
  gsap.from('.atelier .btn, .atelier__info > div', {
    y: 30, opacity: 0, duration: 1, ease: 'power3.out', stagger: .1,
    scrollTrigger: { trigger: '.atelier__info', start: 'top 92%' },
  });
}

/* nav: light over the hero photo, the sequence and the vino sections; veil once scrolled */
const nav = $('.nav');
const lightAtTop = $$('.statement, .atelier, .footer, .seq__pin');
const heroEl = $('.hero');
const seqPin = $('.seq__pin');
const updateNav = () => {
  const overHero = heroST ? heroST.progress < .45 && heroEl.getBoundingClientRect().bottom > 40 : heroEl.getBoundingClientRect().bottom > 40;
  const overEss = essST ? essST.isActive && essST.progress > .55 : false;
  const overDark = lightAtTop.some((el) => {
    const r = el.getBoundingClientRect();
    return r.top <= 40 && r.bottom >= 40;
  });
  const overSeq = seqPin.getBoundingClientRect().top <= 40 && seqPin.getBoundingClientRect().bottom >= 40;
  nav.classList.toggle('nav--light', overHero || overEss || overDark);
  nav.classList.toggle('nav--photo', overHero || overEss || overSeq); // no veil on top of full-bleed photos
  nav.classList.toggle('nav--scrolled', scrollY > 60);
};
addEventListener('scroll', updateNav, { passive: true });
addEventListener('resize', updateNav);
ScrollTrigger.addEventListener('refresh', updateNav);

// pins were created in page order, but re-sort so every trigger accounts for the pin spacing above it
ScrollTrigger.sort();
document.fonts.ready.then(() => ScrollTrigger.refresh());
