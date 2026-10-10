import * as THREE from 'three';

const root = document.documentElement;
root.classList.add('js');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/* ------------------------------------------------------------------
   WebGL silk — one draped satin plane behind the page.
   Scroll moves the folds and tilts the cloth; dark sections turn it "notte".
------------------------------------------------------------------- */
const canvas = document.getElementById('silk');
let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
} catch {
  root.classList.add('no-webgl');
}

const LIGHT = {
  bg: new THREE.Color('#F2EEE8'), base: new THREE.Color('#F5F1EB'), shadow: new THREE.Color('#C9BCAE'),
  tint: new THREE.Color('#E8CDD0'), sheen: new THREE.Color('#FFFFFF'),
};
const DARK = {
  bg: new THREE.Color('#1B2440'), base: new THREE.Color('#2A3557'), shadow: new THREE.Color('#10152A'),
  tint: new THREE.Color('#2B3963'), sheen: new THREE.Color('#C9D2E6'),
};

if (renderer) {
  const small = innerWidth < 860;
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
      float h(vec2 p) {
        float t = uTime * .22;
        p *= 1.5;
        float s = uScroll;
        float z = sin(p.x * .9 + p.y * .35 + t + s * .6) * .45
                + sin(p.x * 1.7 - p.y * .6 + t * 1.3) * .18
                + sin(p.y * 1.2 + p.x * .2 - t * .8 - s * .4) * .22
                + sin((p.x + p.y * .6) * 2.6 + t * .6 + s * 1.4) * .07;
        vec2 m = p / 1.5 - uMouse;
        z += .3 * exp(-dot(m, m) * .7);   // soft pointer lift
        return z * (.5 + .1 * min(s, 3.));
      }
      void main() {
        vec2 p = position.xy;
        float e = .02;
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
        float diff = dot(N, L) * .5 + .5;
        float spec = pow(max(dot(N, normalize(L + V)), 0.), 38.);
        float rim = pow(1. - max(dot(N, V), 0.), 3.);
        vec3 col = mix(uShadow, uBase, smoothstep(.12, .95, diff));
        col = mix(col, uTint, smoothstep(-.2, .5, vH) * .28);
        col += uSheen * (spec * .32 + rim * .12);
        gl_FragColor = vec4(col, 1.);
      }`,
  });

  const seg = small ? [90, 70] : [170, 120];
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(20, 14, ...seg), material);
  cloth.rotation.set(-.45, 0, -.12);
  scene.add(cloth);

  const resize = () => {
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  };
  resize();
  addEventListener('resize', resize);

  // pointer → plane-space target (desktop only)
  const mouse = new THREE.Vector2(9, 9);
  if (matchMedia('(pointer: fine)').matches) {
    addEventListener('pointermove', (e) => {
      mouse.set((e.clientX / innerWidth - .5) * 6, -(e.clientY / innerHeight - .5) * 3.6);
    });
  }

  const darkEls = [...document.querySelectorAll('.statement, .atelier')];
  const openEls = [...document.querySelectorAll('.hero, .manifesto, .statement, .atelier')]; // sections that show the canvas
  const darkness = () => {
    let d = 0;
    for (const el of darkEls) {
      const r = el.getBoundingClientRect();
      const inn = clamp01((innerHeight - r.top) / (innerHeight * .45));
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
  const tick = () => {
    const dt = Math.min(clock.getDelta(), .05);
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
  };
  gsap.ticker.add(tick);
}

/* ------------------------------------------------------------------
   Scroll choreography (GSAP + Lenis)
------------------------------------------------------------------- */
gsap.registerPlugin(ScrollTrigger);

// marquee: duplicate once for a seamless loop
const row = document.querySelector('.marquee__row');
row.innerHTML += row.innerHTML;

// process: active step swaps the arch image
const steps = [...document.querySelectorAll('.process__steps li')];
const shots = [...document.querySelectorAll('.process__media img')];
steps.forEach((li, i) => {
  ScrollTrigger.create({
    trigger: li, start: 'top 60%', end: 'bottom 60%',
    onToggle: ({ isActive }) => {
      if (!isActive) return;
      steps.forEach((s, j) => s.classList.toggle('is-active', j === i));
      shots.forEach((s, j) => s.classList.toggle('is-active', j === i));
    },
  });
});
steps[0].classList.add('is-active');

if (reduce) {
  root.classList.add('no-pin');
} else {
  const lenis = new Lenis({ lerp: .1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { duration: 1.6 });
  }));

  // hero intro + parallax out
  gsap.from('.hero__title .line > span', { yPercent: 110, duration: 1.5, ease: 'expo.out', stagger: .12, delay: .15 });
  gsap.from('.hero__eyebrow, .hero__foot', { opacity: 0, y: 16, duration: 1.2, ease: 'power3.out', delay: .7 });
  gsap.to('.hero__title', {
    yPercent: -18, opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });

  // manifesto: words light up as you read
  const text = document.querySelector('[data-words]');
  text.innerHTML = text.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(' ');
  gsap.to(text.querySelectorAll('.w'), {
    opacity: 1, stagger: .1, ease: 'none',
    scrollTrigger: { trigger: '.manifesto', start: 'top 65%', end: 'bottom 75%', scrub: true },
  });

  // occasioni: pinned horizontal travel
  const track = document.querySelector('.occasioni__track');
  const dist = () => Math.max(0, track.scrollWidth - innerWidth);
  gsap.to(track, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: {
      trigger: '.occasioni', pin: true, start: 'top top',
      end: () => '+=' + dist(), scrub: 1, invalidateOnRefresh: true,
    },
  });

  // 0 → 75
  const count = document.querySelector('[data-count]');
  const n = { v: 0 };
  gsap.to(n, {
    v: 75, ease: 'none',
    onUpdate: () => { count.textContent = Math.round(n.v); },
    scrollTrigger: { trigger: '.statement', start: 'top 80%', end: 'center center', scrub: true },
  });

  // image reveals
  gsap.utils.toArray('.maison__tile figure, .voice figure').forEach((fig) => {
    gsap.fromTo(fig, { clipPath: 'inset(100% 0 0 0)' }, {
      clipPath: 'inset(0% 0 0 0)', duration: 1.4, ease: 'expo.out',
      scrollTrigger: { trigger: fig, start: 'top 85%' },
    });
  });
  gsap.to('.voice img', {
    yPercent: -12, ease: 'none',
    scrollTrigger: { trigger: '.voice', start: 'top bottom', end: 'bottom top', scrub: true },
  });

  // headings rise in
  gsap.utils.toArray('.h2, .atelier__title, .statement__text').forEach((h) => {
    gsap.from(h, { y: 40, opacity: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 88%' } });
  });
}

// nav veil after the hero starts moving
ScrollTrigger.create({ start: 60, end: 'max', toggleClass: { targets: '.nav', className: 'nav--scrolled' } });

// nav turns light over dark sections
document.querySelectorAll('.statement, .atelier, .footer').forEach((el) => {
  ScrollTrigger.create({ trigger: el, start: 'top 40px', end: 'bottom 40px', toggleClass: { targets: '.nav', className: 'nav--light' } });
});

// triggers above the pin were created first — re-sort so their positions include the pin spacing
ScrollTrigger.sort();
document.fonts.ready.then(() => ScrollTrigger.refresh());
