/* ===========================================================
   VOCCA EXPERIENCE — interactive layer
   - Smooth scroll (native + scroll-behavior)
   - Reveal-on-scroll (IntersectionObserver)
   - Word-by-word splitting for headlines
   - Counters (animated count-up)
   - Parallax (RAF + transform)
   - Particles canvas (subtle network lights)
   - Nav scroll state + section progress
   - Inbound bubble cascade on enter
   - Animated bar fills (ROI)
   - Persisted notes (enjeux)
   =========================================================== */

(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ===========================================================
  // 1) Word splitting (for [data-words] + [data-reveal-words])
  // ===========================================================
  function splitWords(el) {
    if (el.dataset.split) return;
    el.dataset.split = '1';
    // We need to preserve HTML (em tags etc). Walk text nodes.
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const text = node.nodeValue;
      if (!text || !text.trim()) return;
      const frag = document.createDocumentFragment();
      const parts = text.split(/(\s+)/); // keep whitespace
      parts.forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          frag.appendChild(document.createTextNode(part));
        } else {
          const span = document.createElement('span');
          span.className = 'split-word';
          span.textContent = part;
          frag.appendChild(span);
        }
      });
      node.parentNode.replaceChild(frag, node);
    });
  }

  // Apply to anything tagged [data-words] inside an explicit reveal-words headline
  $$('[data-reveal-words]').forEach(h => splitWords(h));
  $$('[data-words]').forEach(span => splitWords(span));

  // ===========================================================
  // 2) IntersectionObserver reveals (generic)
  // ===========================================================
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const delay = parseInt(el.dataset.revealDelay || el.dataset.fadeDelay || '0', 10);

      if (el.matches('[data-reveal-words]')) {
        // stagger each word
        const words = $$('.split-word', el);
        words.forEach((w, i) => {
          w.style.transitionDelay = `${delay + i * 55}ms`;
          requestAnimationFrame(() => w.classList.add('in'));
        });
        // also mark the host so opacity matches
        el.classList.add('in');
      } else {
        if (delay) el.style.transitionDelay = `${delay}ms`;
        el.classList.add('in');
      }

      // Counter trigger
      const counter = el.querySelector('[data-counter]');
      if (counter) startCounter(counter);
      if (el.matches('[data-counter]')) startCounter(el);

      // Bar fill trigger
      const bar = el.querySelector('[data-bar-fill]');
      if (bar) startBar(bar);

      // Inbound transcript cascade
      if (el.matches('[data-transcript]') || el.querySelector('[data-transcript]')) {
        const t = el.matches('[data-transcript]') ? el : el.querySelector('[data-transcript]');
        cascadeBubbles(t);
      }

      revealObserver.unobserve(el);
    });
  }, {
    rootMargin: '0px 0px -8% 0px',
    threshold: 0.08,
  });

  // Hero fade-ins fire on load not on intersection (they're at top of page)
  // Generic [data-reveal] + [data-reveal-words]
  $$('[data-reveal], [data-reveal-words], [data-fade-in], [data-transcript]').forEach(el => {
    revealObserver.observe(el);
  });

  // Hero words: fire immediately on load (already in view)
  window.addEventListener('load', () => {
    // hero word reveal
    const heroWords = $$('.hero-title [data-words]');
    heroWords.forEach((host, idx) => {
      const words = $$('.split-word', host);
      words.forEach((w, i) => {
        w.style.transitionDelay = `${200 + idx * 300 + i * 70}ms`;
        requestAnimationFrame(() => w.classList.add('in'));
      });
    });
    // hero fades
    $$('.hero [data-fade-in]').forEach(el => {
      const d = parseInt(el.dataset.fadeDelay || '0', 10);
      el.style.transitionDelay = `${d}ms`;
      requestAnimationFrame(() => el.classList.add('in'));
      revealObserver.unobserve(el);
    });
  });

  // ===========================================================
  // 3) Counters
  // ===========================================================
  function startCounter(el) {
    if (el.dataset.counterDone) return;
    el.dataset.counterDone = '1';
    const target = parseFloat(el.dataset.counter);
    if (isNaN(target)) return;
    const format = el.dataset.counterFormat || '';
    const duration = 1400;
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    function tick(now) {
      const p = Math.min(1, (now - start) / duration);
      const val = target * ease(p);
      let txt;
      if (format === 'space' && target >= 1000) {
        txt = Math.round(val).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
      } else if (target % 1 !== 0) {
        txt = val.toFixed(1);
      } else {
        txt = Math.round(val).toString();
      }
      el.textContent = txt;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ===========================================================
  // 4) Bar fills
  // ===========================================================
  function startBar(el) {
    if (el.dataset.barDone) return;
    el.dataset.barDone = '1';
    const target = parseFloat(el.dataset.barFill) || 100;
    requestAnimationFrame(() => {
      el.style.right = `${100 - target}%`;
    });
  }

  // ===========================================================
  // 5) Bubble cascade (inbound transcript)
  // ===========================================================
  function cascadeBubbles(container) {
    if (container.dataset.cascaded) return;
    container.dataset.cascaded = '1';
    const bubbles = $$('[data-bubble]', container);
    bubbles.forEach((b, i) => {
      setTimeout(() => b.classList.add('in'), 250 + i * 350);
    });
    // Animated timer for the call duration
    const timer = container.parentElement.querySelector('[data-call-timer]');
    if (timer) {
      let s = 0;
      const fmt = () => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
      timer.textContent = fmt();
      const id = setInterval(() => {
        s++;
        timer.textContent = fmt();
        if (s > 240) clearInterval(id);
      }, 1000);
    }
  }

  // ===========================================================
  // 6) Parallax (RAF)
  // ===========================================================
  const parallaxEls = $$('[data-parallax]').map(el => ({
    el,
    factor: parseFloat(el.dataset.parallax) || 0.1,
    base: 0,
  }));
  // Initial measure
  parallaxEls.forEach(p => {
    const rect = p.el.getBoundingClientRect();
    p.base = rect.top + window.scrollY + rect.height / 2;
  });

  let ticking = false;
  function applyParallax() {
    const viewport = window.innerHeight;
    const scroll = window.scrollY;
    parallaxEls.forEach(p => {
      const rect = p.el.getBoundingClientRect();
      // distance of element center from viewport center, normalized
      const center = rect.top + rect.height / 2 - viewport / 2;
      const offset = -center * p.factor;
      p.el.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
    });
    ticking = false;
  }

  function onScrollParallax() {
    if (!ticking) {
      requestAnimationFrame(applyParallax);
      ticking = true;
    }
  }

  if (!prefersReduced) {
    window.addEventListener('scroll', onScrollParallax, { passive: true });
    window.addEventListener('resize', onScrollParallax);
    applyParallax();
  }

  // ===========================================================
  // 7) Scroll progress bar
  // ===========================================================
  const progressEl = document.querySelector('[data-progress]');
  function updateProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = Math.max(0, Math.min(1, scrollTop / docHeight));
    if (progressEl) progressEl.style.width = (pct * 100) + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();

  // ===========================================================
  // 8) Particles canvas (subtle network of lights)
  // ===========================================================
  function initParticles(canvas, opts = {}) {
    const ctx = canvas.getContext('2d');
    const config = Object.assign({
      density: 0.00009, // particles per px²
      maxConnect: 140,
      speed: 0.18,
      pointColor: 'rgba(53,104,246,0.55)',
      lineColor: 'rgba(53,104,246,0.18)',
      dark: false,
    }, opts);

    let particles = [];
    let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 1.6);

    function resize() {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width  = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      const count = Math.max(20, Math.min(80, Math.floor(w * h * config.density)));
      particles = new Array(count).fill(0).map(() => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * config.speed,
        vy: (Math.random() - 0.5) * config.speed,
        r: 0.6 + Math.random() * 1.4,
        twinkle: Math.random() * Math.PI * 2,
      }));
    }
    resize();

    let visible = true;
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    }, { rootMargin: '20% 0px 20% 0px' });
    io.observe(canvas);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let lastT = performance.now();
    function frame(t) {
      const dt = Math.min(40, t - lastT);
      lastT = t;
      requestAnimationFrame(frame);
      if (!visible) return;

      ctx.clearRect(0, 0, w, h);

      // update
      for (let p of particles) {
        p.x += p.vx * (dt / 16);
        p.y += p.vy * (dt / 16);
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        if (p.y > h + 20) p.y = -20;
        p.twinkle += 0.03;
      }

      // lines
      ctx.lineWidth = 0.8;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < config.maxConnect * config.maxConnect) {
            const alpha = (1 - Math.sqrt(d2) / config.maxConnect);
            ctx.strokeStyle = config.lineColor.replace(/[\d.]+\)$/, (alpha * 0.55).toFixed(3) + ')');
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // points
      for (let p of particles) {
        const tw = 0.6 + 0.4 * Math.sin(p.twinkle);
        ctx.fillStyle = config.pointColor.replace(/[\d.]+\)$/, (tw * 0.85).toFixed(3) + ')');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    requestAnimationFrame(frame);
  }

  if (!prefersReduced) {
    const heroCanvas = $('.hero-particles');
    if (heroCanvas) initParticles(heroCanvas, {
      density: 0.000075,
      maxConnect: 130,
      pointColor: 'rgba(53,104,246,0.7)',
      lineColor: 'rgba(53,104,246,0.18)',
    });

    const visionCanvas = $('.vision-particles');
    if (visionCanvas) initParticles(visionCanvas, {
      density: 0.00010,
      maxConnect: 140,
      speed: 0.20,
      pointColor: 'rgba(53,104,246,0.8)',
      lineColor: 'rgba(53,104,246,0.22)',
    });

    const demoCanvas = $('.demo-particles');
    if (demoCanvas) initParticles(demoCanvas, {
      density: 0.00008,
      maxConnect: 130,
      pointColor: 'rgba(53,104,246,0.7)',
      lineColor: 'rgba(53,104,246,0.18)',
    });
  }

  // ===========================================================
  // 9) Persisted notes (enjeux)
  // ===========================================================
  $$('.enjeux-notes').forEach(el => {
    const key = 'vocca-note-' + (el.closest('[data-theme]')?.id || '') + '-' + ($$('.enjeux-notes').indexOf(el));
    const saved = localStorage.getItem(key);
    if (saved) el.innerHTML = saved;
    el.addEventListener('input', () => {
      try { localStorage.setItem(key, el.innerHTML); } catch (e) {}
    });
  });

  // ===========================================================
  // 10) Smooth in-page anchor clicks (account for sticky nav)
  // ===========================================================
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    const y = target.getBoundingClientRect().top + window.scrollY - 64;
    window.scrollTo({ top: y, behavior: 'smooth' });
  });

  // ===========================================================
  // 11) PDF download button — uses browser native print to PDF
  // ===========================================================
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-pdf-btn]');
    if (!btn) return;
    // Make sure every reveal is shown before print (otherwise content is hidden)
    document.body.classList.add('printing');
    $$('[data-reveal], [data-fade-in], .split-word, [data-bubble]').forEach(el => el.classList.add('in'));
    // Trigger bars
    $$('[data-bar-fill]').forEach(el => { el.style.right = '0%'; });
    setTimeout(() => {
      window.print();
      document.body.classList.remove('printing');
    }, 250);
  });

})();
