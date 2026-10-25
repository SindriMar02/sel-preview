/* SEL by ÓX v2. Mechanics ported from the Tastavents bundle (app-33d544c6.js); numbers in DESIGN.md. */
(() => {
  const d = document, h = d.documentElement;
  const motion = h.classList.contains('motion');
  const W = () => innerWidth;
  const isMobile = matchMedia('(pointer: coarse)').matches || W() <= 1025;
  const isSafariDesktop = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) && !isMobile;
  let smoother = null;

  /* ---------- menu (focus-guard: tap opens onto the panel, keyboard onto the first link) ---------- */
  const btn = d.getElementById('menu-btn'), nav = d.getElementById('nav');
  const content = d.getElementById('smooth-wrapper');
  let menuScroll = null;
  const setOpen = (open, e) => {
    if (open === nav.classList.contains('is-open')) return;
    // Overflow on html alone does not hold the document still in iOS Safari.
    if (!smoother) {
      if (open) {
        menuScroll = { y: scrollY, style: d.body.getAttribute('style') };
        Object.assign(d.body.style, { position: 'fixed', top: `-${menuScroll.y}px`, width: '100%' });
      } else if (menuScroll) {
        const { y, style } = menuScroll;
        style === null ? d.body.removeAttribute('style') : d.body.setAttribute('style', style);
        menuScroll = null;
        scrollTo(0, y);
      }
    }
    btn.setAttribute('aria-expanded', open);
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    nav.classList.toggle('is-open', open);
    nav.inert = !open;
    content.inert = open;
    h.classList.toggle('menu-open', open);
    if (smoother) smoother.paused(open);
    if (window.gsap) gsap.to('.hd', { '--lm': open ? 0 : 1, duration: open ? .7 : .8, ease: 'power3.inOut', overwrite: 'auto' });
    else d.querySelector('.hd').style.setProperty('--lm', open ? 0 : 1);
    if (open) {
      nav.scrollTop = 0;
      (e && e.detail === 0 ? nav.querySelector('a') : nav).focus({ preventScroll: true });
    } else btn.focus({ preventScroll: true });
  };
  btn.addEventListener('click', e => setOpen(btn.getAttribute('aria-expanded') !== 'true', e));
  d.addEventListener('keydown', e => {
    if (!nav.classList.contains('is-open')) return;
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
    if (e.key === 'Tab') {
      const items = [...d.querySelectorAll('.hd a, #menu-btn, #nav a')].filter(el => el.getClientRects().length);
      const i = items.indexOf(d.activeElement);
      if (i < 0 || (!e.shiftKey && i === items.length - 1) || (e.shiftKey && i === 0)) {
        e.preventDefault(); items[e.shiftKey ? items.length - 1 : 0].focus();
      }
    }
  });

  /* in-page anchors go through the smoother when it runs */
  d.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const t = d.querySelector(a.getAttribute('href'));
    if (!t) return;
    e.preventDefault();
    if (nav.classList.contains('is-open')) setOpen(false);
    if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
    t.focus({ preventScroll: true });
    if (smoother) smoother.scrollTo(t, true, 'top top');
    else t.scrollIntoView({ behavior: motion ? 'smooth' : 'auto' });
  });

  /* ---------- fade sliders (Swiper fade: hero 1650 ms no crossfade, autoplay 5000; gallery 1200 ms crossfade) ---------- */
  const sliders = [...d.querySelectorAll('[data-fade-slider]')].map(root => {
    const slides = [...root.children];
    const speed = +root.dataset.ms || 1200, cross = 'cross' in root.dataset;
    let i = 0, busy = false;
    slides.forEach(s => { s.style.transition = `opacity ${speed}ms cubic-bezier(.645,.045,.355,1)`; });
    const go = n => {
      if (busy) return;
      const prev = slides[i];
      i = (n + slides.length) % slides.length;
      const next = slides[i];
      busy = true;
      next.style.zIndex = 2; next.style.visibility = 'visible'; next.style.opacity = 0;
      requestAnimationFrame(() => {
        next.style.opacity = 1;
        if (cross) prev.style.opacity = 0;
        setTimeout(() => {
          prev.classList.remove('is-on'); prev.style.cssText = `transition:${next.style.transition}`;
          next.classList.add('is-on'); next.style.zIndex = '';
          busy = false;
        }, speed);
      });
    };
    return { root, go, next: () => go(i + 1), prev: () => go(i - 1) };
  });
  const auto = sliders.filter(s => s.root.dataset.delay);
  if (motion && auto.length) setInterval(() => auto.forEach(s => s.next()), +auto[0].root.dataset.delay);
  const gal = sliders.find(s => s.root.classList.contains('galeria__slider'));
  d.querySelector('[data-next]')?.addEventListener('click', () => gal.next());
  d.querySelector('[data-prev]')?.addEventListener('click', () => gal.prev());

  /* ---------- Splitting: words for .split, chars for the hero ---------- */
  d.querySelectorAll('.split').forEach(el => {
    el.innerHTML = el.textContent.trim().split(/\s+/)
      .map((w, n) => `<span class="word" style="--word-index:${n}"><span>${w}</span></span>`).join(' ');
  });
  let ci = 0;
  d.querySelectorAll('.banner__title .letters').forEach(el => {
    el.innerHTML = el.textContent.trim().split(/\s+/).map(w =>
      `<span class="cword">${[...w].map(c => `<span class="char" style="--char-index:${ci++}">${c}</span>`).join('')}</span>`).join(' ');
  });
  /* ---------- loader: progress from real loading (fonts + first hero photos), min 1.1 s, max 4 s, one wipe ---------- */
  const heroIn = () => d.querySelectorAll('.banner__title, .banner__card').forEach(el => el.classList.add('is-in'));
  const loader = d.querySelector('.loader');
  if (!motion || !loader) { heroIn(); loader && loader.remove(); }
  else {
    h.classList.add('is-loading');
    const bar = loader.querySelector('.loader__bar');
    const waits = [d.fonts ? d.fonts.ready.catch(() => {}) : Promise.resolve(),
      ...[...d.querySelectorAll('.banner__slide.is-on img')].map(img => img.decode ? img.decode().catch(() => {}) : Promise.resolve())];
    let done = 0;
    waits.forEach(w => w.then(() => bar.style.setProperty('--p', ++done / waits.length)));
    const t0 = performance.now();
    let finished = false;
    const finish = () => {
      if (finished) return; finished = true;
      bar.style.setProperty('--p', 1);
      setTimeout(() => {
        loader.classList.add('is-out');
        h.classList.remove('is-loading');
        if (smoother) smoother.paused(false);
        // Reveal only once the 1 s wipe + .1 s delay has cleared the hero.
        setTimeout(() => { loader.remove(); heroIn(); }, 1200);
      }, 350);
    };
    Promise.all(waits).then(() => setTimeout(finish, Math.max(0, 1100 - (performance.now() - t0))));
    setTimeout(finish, 4000);
  }

  /* ---------- booking card: Wed to Sat only, opens Dineout with g + dt ---------- */
  const bw = d.querySelector('.bookw');
  if (bw) {
    const date = bw.elements.date, note = bw.querySelector('.bookw__note');
    const iso = dt => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    const open = dt => [3, 4, 5, 6].includes(dt.getDay());
    const first = new Date(); while (!open(first)) first.setDate(first.getDate() + 1);
    date.min = iso(new Date()); date.value = iso(first);
    const okDay = () => {
      const v = date.value && new Date(date.value + 'T12:00');
      const ok = !!v && open(v);
      note.textContent = ok ? 'Open Wednesday to Saturday, 17:30 to 22:00.' : 'SEL is open Wednesday to Saturday. Please pick one of those days.';
      note.classList.toggle('is-warn', !ok);
      return ok;
    };
    date.addEventListener('change', okDay);
    bw.addEventListener('submit', e => {
      e.preventDefault();
      if (!okDay()) { date.focus(); return; }
      const u = new URL('https://www.dineout.is/is/selbyox');
      u.search = new URLSearchParams({ g: bw.elements.g.value, dt: `${date.value}T${bw.elements.time.value}`, type: 'bookings', isolation: 'true' });
      // A noopener open may return null even on success. Open a blank tab first
      // so a genuine popup block can fall back without opening Dineout twice.
      const tab = window.open('about:blank', '_blank');
      if (tab) { tab.opener = null; tab.location.replace(u.href); }
      else location.href = u.href;
    });
  }

  /* ---------- AOS with d:loop: animate on enter, re-arm when it leaves below the fold ---------- */
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) en.target.classList.add('aos-animate');
    else if (en.boundingClientRect.top > 0) en.target.classList.remove('aos-animate');
  }), { threshold: .1 });
  d.querySelectorAll('[data-aos]').forEach(el => io.observe(el));

  if (!motion) return;
  addEventListener('DOMContentLoaded', () => {
    const { gsap, ScrollTrigger, ScrollSmoother } = window;
    if (!gsap || !ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

    /* ScrollSmoother exactly as Tastavents: smooth 1.8, off on mobile and desktop Safari */
    if (ScrollSmoother && !isSafariDesktop && !isMobile) {
      smoother = ScrollSmoother.create({ wrapper: '#smooth-wrapper', content: '#smooth-content', smooth: 1.8, normalizeScroll: true, ignoreMobileResize: true, effects: true });
      if (h.classList.contains('is-loading')) smoother.paused(true);
    }

    /* header: large logo scales down with the scroll, then the bar and its hairline fade in (both scrubbed, so reversible) */
    gsap.timeline({ scrollTrigger: { start: 0, end: () => innerHeight * .25, scrub: .6, invalidateOnRefresh: true } })
      .fromTo('.hd', { '--ls': 1.75 }, { '--ls': 1, ease: 'power2.inOut', duration: .7 }, 0)
      .fromTo('.hd', { '--hb': 0 }, { '--hb': 1, ease: 'power1.out', duration: .45 }, .1);

    /* parallax via CSS vars, circInOut, scrub, desktop and tablet only (>767px) */
    if (W() > 1025) {
      const px = v => v;
      const run = (el, top) => gsap.fromTo(el,
        { '--translateY': '0rem', '--scale': el.dataset.scaleFrom || 1 },
        { '--translateY': px(el.dataset.translateY || '0rem'), '--scale': el.dataset.scale || 1, ease: 'circ.inOut',
          scrollTrigger: { trigger: el, start: top ? 'top top' : 'top bottom', end: 'bottom top', scrub: true } });
      d.querySelectorAll('[data-parallax-top]').forEach(el => run(el, true));
      d.querySelectorAll('[data-parallax]').forEach(el => run(el, false));
    }

    /* marquee: clones to 1.5 × viewport, rAF drift, direction follows scroll, hover slows to .5 */
    d.querySelectorAll('.marquee-trigger').forEach(t => {
      const m = t.querySelector('.marquee'), item = m.querySelector('.marquee-item');
      const w = () => item.getBoundingClientRect().width;
      for (let k = 0, n = Math.ceil(W() * 1.5 / w()); k < n; k++) m.appendChild(item.cloneNode(true));
      const base = parseFloat(m.dataset.marqueeSpeed) || 2, o = { speed: base };
      let x = 0, dir = 1, raf = 0;
      ScrollTrigger.create({ onUpdate: s => { dir = s.direction; } });
      const tick = () => {
        x -= o.speed * dir;
        if (x <= -w()) x = 0;
        if (dir === -1 && x >= 0) x = -w();
        m.style.transform = `translate3d(${x}px,0,0)`;
        raf = requestAnimationFrame(tick);
      };
      new IntersectionObserver(([en]) => { cancelAnimationFrame(raf); if (en.isIntersecting) tick(); }, { threshold: .1 }).observe(t);
      m.addEventListener('mouseenter', () => gsap.to(o, { speed: .5, ease: 'power1.out', duration: .3 }));
      m.addEventListener('mouseleave', () => gsap.to(o, { speed: base, ease: 'power1.out', duration: .3 }));
    });

    /* phone: the evening cards scroll sideways while the strip is pinned */
    const mm = gsap.matchMedia();
    mm.add('(max-width: 1025px)', () => {
      const list = d.querySelector('.cards'), pin = d.querySelector('.hscroll__pin');
      const dist = () => list.scrollWidth - W();
      gsap.to(list, { x: () => -dist(), ease: 'none', force3D: true,
        scrollTrigger: { trigger: pin, start: () => {
          const headerHeight = d.querySelector('.hd').offsetHeight;
          return pin.offsetHeight > innerHeight - headerHeight ? `top ${headerHeight}px` : 'center center';
        }, end: () => '+=' + dist(), pin: true, scrub: true, anticipatePin: 1, invalidateOnRefresh: true } });
    });

    /* menu gallery (desktop): pin the stage, fan the five photos in, slide the carta over */
    mm.add('(min-width: 1025.1px)', () => {
      const parent = d.querySelector('.container-parent'), stage = d.querySelector('.container-sticky');
      ScrollTrigger.create({ trigger: parent, start: 'top top', end: () => `bottom-=${stage.offsetHeight} top`, pin: stage, pinSpacing: false, scrub: true, invalidateOnRefresh: true });
      const tl = gsap.timeline({ scrollTrigger: { trigger: parent, start: '45% bottom', end: '85% bottom', scrub: true, anticipatePin: true, invalidateOnRefresh: true } });
      tl.fromTo('.gallery-wrapper .g5', { x: '400%' }, { x: '53%', ease: 'none' })
        .fromTo('.gallery-wrapper .g4', { x: '300%' }, { x: '40%', ease: 'none' }, '<')
        .fromTo('.gallery-wrapper .g3', { x: '200%' }, { x: '27%', ease: 'none' }, '<')
        .fromTo('.gallery-wrapper .g2', { x: '100%' }, { x: '14%', ease: 'none' }, '<')
        .fromTo('.container-carta', { x: '290%' }, { x: 0, ease: 'none' }, '<')
        .fromTo('.container-carta .inner-content', { autoAlpha: 0 }, { autoAlpha: 1, ease: 'none' }, '<');
    });

    /* footer image settles: scale 1.5 → 1, y -15rem → 0 (desktop) */
    mm.add('(min-width: 1025.1px)', () => {
      gsap.fromTo('.footer-img', { scale: 1.5, y: '-15rem' }, { scale: 1, y: 0, ease: 'none',
        scrollTrigger: { trigger: '#footer', start: 'top bottom', end: '80% bottom', scrub: true } });
    });

    addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
  });
})();
