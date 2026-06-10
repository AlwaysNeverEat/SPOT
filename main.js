/* СТО SPOT — interactivity (parallax, horizontal scroll, counters, reveal) */
(() => {
  const isMobile = () => window.matchMedia('(max-width: 768px)').matches;
  // Section-reveal gate runs on desktop pointers only and never under
  // reduced-motion — touch devices keep plain scroll + light reveals.
  const GATE_ON = window.matchMedia('(min-width: 1024px) and (pointer: fine)').matches
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Gate scroll-ownership flags, shared with the tree so its runway never folds
  // mid-lock: `locking` = a section reveal is playing (squash momentum under the
  // white curtain); `navHold` = an anchor smooth-scroll is in flight (stand aside).
  let locking = false, navHold = false;

  /* ---------- Header on scroll ---------- */
  const header = document.getElementById('header');
  const onScrollHeader = () => header.classList.toggle('scrolled', window.scrollY > 20);
  window.addEventListener('scroll', onScrollHeader, { passive: true });
  onScrollHeader();

  /* ---------- Scroll-spy: подсветка активного пункта + «жидкая» пилюля ---------- */
  const navEl = document.getElementById('nav');
  const navPill = document.getElementById('navPill');
  const spyLinks = Array.from(document.querySelectorAll('.nav a[href^="#"]'))
    .filter(a => a.getAttribute('href').length > 1);
  const spySections = [];
  const spyLinkFor = new Map();
  spyLinks.forEach(a => {
    const sec = document.querySelector(a.getAttribute('href'));
    if (sec) { spyLinkFor.set(sec, a); spySections.push(sec); }
  });
  // Секция «Рассчитать стоимость работ» (#signup) не имеет своего пункта меню —
  // относим её к «Контактам», иначе на ней зависает подсветка FAQ.
  const contactsLink = spyLinks.find(a => a.getAttribute('href') === '#contacts');
  const signupSec = document.getElementById('signup');
  if (contactsLink && signupSec && !spyLinkFor.has(signupSec)) {
    spyLinkFor.set(signupSec, contactsLink);
    spySections.push(signupSec);
  }
  spySections.sort((a, b) => a.offsetTop - b.offsetTop);
  let spyTicking = false;
  let activeLink = null;
  const movePill = (link) => {
    if (!navPill) return;
    if (!link) { navPill.style.opacity = '0'; return; }
    // offsetLeft/Width — layout-координаты, не зависят от transform:scale пилюли
    navPill.style.width = link.offsetWidth + 'px';
    navPill.style.transform = `translate(${link.offsetLeft}px, -50%)`;
    navPill.style.opacity = '1';
  };
  const updateSpy = () => {
    spyTicking = false;
    const line = window.innerHeight * 0.35; // секция активна, когда её верх ушёл выше трети экрана
    let current = null;
    for (const sec of spySections) {
      if (sec.getBoundingClientRect().top - line <= 0) current = sec;
    }
    // У низа страницы короткий футер не доходит до линии — форсим последнюю секцию
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
      current = spySections[spySections.length - 1];
    }
    const link = current ? spyLinkFor.get(current) : null;
    if (link === activeLink) return;
    if (activeLink) activeLink.classList.remove('is-active');
    if (link) link.classList.add('is-active');
    activeLink = link;
    movePill(link);
  };
  if (spySections.length) {
    window.addEventListener('scroll', () => {
      if (!spyTicking) { requestAnimationFrame(updateSpy); spyTicking = true; }
    }, { passive: true });
    window.addEventListener('resize', () => { activeLink = null; updateSpy(); });
    updateSpy();
  }

  /* ---------- Parallax ---------- */
  const parallaxItems = Array.from(document.querySelectorAll('[data-parallax]'));
  let ticking = false;
  const updateParallax = () => {
    if (isMobile()) return;
    const vh = window.innerHeight;
    parallaxItems.forEach(el => {
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2 - vh / 2;
      const speed = parseFloat(el.dataset.parallax) || 0.2;
      const offset = -center * speed;
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    });
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(updateParallax); ticking = true; }
  }, { passive: true });
  window.addEventListener('resize', updateParallax);
  updateParallax();

  /* ---------- Horizontal scroll services ---------- */
  const wrap = document.querySelector('.hscroll-wrap');
  const track = document.getElementById('hscrollTrack');
  if (wrap && track) {
    const updateHScroll = () => {
      if (isMobile()) { track.style.transform = 'none'; return; }
      const wrapRect = wrap.getBoundingClientRect();
      const wrapTop = window.scrollY + wrapRect.top;
      const wrapHeight = wrap.offsetHeight - window.innerHeight;
      const trackWidth = track.scrollWidth - window.innerWidth;
      const progress = Math.min(Math.max((window.scrollY - wrapTop) / wrapHeight, 0), 1);
      track.style.transform = `translate3d(${(-progress * trackWidth).toFixed(1)}px, 0, 0)`;
    };
    window.addEventListener('scroll', updateHScroll, { passive: true });
    window.addEventListener('resize', updateHScroll);
    updateHScroll();
  }

  /* ---------- Hero video fade-in ---------- */
  const heroVideo = document.getElementById('heroVideo');
  if (heroVideo) {
    const showVideo = () => heroVideo.classList.add('is-loaded');
    heroVideo.addEventListener('loadeddata', showVideo, { once: true });
    heroVideo.addEventListener('canplay', showVideo, { once: true });
  }

  /* ---------- Counter animation ---------- */
  const counters = document.querySelectorAll('[data-count]');
  const animateCounter = (el) => {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    const target = parseInt(el.dataset.count, 10);
    const duration = 2000;
    const start = performance.now();
    const fmt = new Intl.NumberFormat('ru-RU');
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = fmt.format(Math.floor(target * eased));
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = fmt.format(target);
    };
    requestAnimationFrame(tick);
  };
  const counterObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        animateCounter(e.target);
        counterObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.4 });
  // Under the gate, counters inside a curtained section would tick while hidden;
  // let the gate fire them on reveal instead.
  counters.forEach(c => {
    if (GATE_ON && c.closest('[data-gate="lock"], [data-gate="fade"]')) return;
    counterObs.observe(c);
  });

  /* ---------- Reveal on scroll ---------- */
  // Run after applyCity so dynamic spans (stationsCount etc.) already have final text
  setTimeout(() => {
    // Recursively walk nodes: text → individual .char spans, elements → preserved wrapper with chars inside
    const processNodes = (container, nodes, ref) => {
      nodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          // Split on spaces but keep them: chars of a word go inside a .word
          // wrapper (inline-block, nowrap) so a word never breaks mid-letter;
          // the space between words stays a real text node = breakable.
          const tokens = node.textContent.split(/(\s+)/);
          tokens.forEach(token => {
            if (token === '') return;
            if (/^\s+$/.test(token)) {
              container.appendChild(document.createTextNode(token));
              return;
            }
            const word = document.createElement('span');
            word.className = 'word';
            [...token].forEach(ch => {
              const s = document.createElement('span');
              s.className = 'char';
              s.textContent = ch;
              s.style.transitionDelay = `${ref.i * 30}ms`;
              word.appendChild(s);
              ref.i++;
            });
            container.appendChild(word);
          });
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const el = document.createElement(node.tagName);
          for (const attr of node.attributes) el.setAttribute(attr.name, attr.value);
          processNodes(el, Array.from(node.childNodes), ref);
          container.appendChild(el);
        }
      });
    };

    document.querySelectorAll('h2').forEach(h2 => {
      const nodes = Array.from(h2.childNodes);
      const lines = [];
      let cur = [];
      nodes.forEach(n => {
        if (n.nodeName === 'BR') { lines.push(cur); cur = []; }
        else cur.push(n);
      });
      if (cur.length) lines.push(cur);

      h2.innerHTML = '';
      const ref = { i: 0 };

      lines.forEach(line => {
        const wrap = document.createElement('span');
        wrap.className = 'line-wrap';
        processNodes(wrap, line, ref);
        h2.appendChild(wrap);
      });

      h2.classList.add('line-reveal');
    });

    const blockReveals = document.querySelectorAll('.step, .promo-card, .hpanel-card');
    blockReveals.forEach(el => {
      // Inside lock/fade gates these cards enter via the section's own
      // choreography (g-* staggers) — a .reveal here would double-animate.
      if (GATE_ON && el.closest('[data-gate="lock"], [data-gate="fade"]')) return;
      el.classList.add('reveal');
    });

    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          revealObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.15 });
    document.querySelectorAll('.line-reveal, .reveal').forEach(el => {
      // Gated sections start under a white curtain; defer their inner reveals so
      // the heading/cards animate fresh the moment the curtain lifts.
      if (GATE_ON && el.closest('[data-gate="lock"], [data-gate="fade"]')) return;
      revealObs.observe(el);
    });

    setupMarkerCircle();

    setupRevealGate(revealObs);
  }, 0);

  /* ---------- Hand-drawn red marker circle (draw-in + idle "boil") ---------- */
  function setupMarkerCircle() {
    const host = document.querySelector('.mark-circle');
    if (!host || host.querySelector('.mark-circle__svg')) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // "Stadium" loop: nearly-flat top/bottom edges (uniform clearance above and
    // below the word across its whole width) with rounded ends that sit beyond
    // the word, plus a top-right lead-in that overshoots/crosses. Flat
    // horizontal edges don't flatten further when the SVG is stretched wide.
    const BASE = [360, 22, 250, 14, 150, 14, 44, 22, 10, 27, 8, 73, 42, 80,
                  150, 88, 250, 88, 356, 80, 392, 74, 392, 30, 312, 22];
    const toD = (p) =>
      `M ${p[0]},${p[1]} C ${p[2]},${p[3]} ${p[4]},${p[5]} ${p[6]},${p[7]} ` +
      `C ${p[8]},${p[9]} ${p[10]},${p[11]} ${p[12]},${p[13]} ` +
      `C ${p[14]},${p[15]} ${p[16]},${p[17]} ${p[18]},${p[19]} ` +
      `C ${p[20]},${p[21]} ${p[22]},${p[23]} ${p[24]},${p[25]}`;

    // Build a slightly different whole-oval variant: a small global stretch
    // about the centre plus a tiny per-point wobble. Cycling between a few of
    // these gives a hand-drawn "line boil" where the WHOLE line breathes /
    // stretches, instead of each segment jittering on its own.
    const CX = 198, CY = 51;
    const rnd = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; };
    const variant = (amp, sx, sy) => BASE.map((v, i) => {
      const isX = i % 2 === 0;
      const c = isX ? CX : CY;
      const s = isX ? sx : sy;
      return c + (v - c) * s + rnd(i + amp * 100) * amp;
    });
    const variants = [
      BASE.slice(),
      variant(2.6, 1.020, 0.975),
      variant(3.0, 0.984, 1.028),
      variant(2.2, 1.012, 0.992)
    ];

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'mark-circle__svg');
    svg.setAttribute('viewBox', '12 11 372 80');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');

    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('class', 'mark-circle__path');
    path.setAttribute('d', toD(BASE));

    svg.appendChild(path);
    host.appendChild(svg);

    // Set dash length from the actual geometry so the draw-in is exact.
    const len = Math.ceil(path.getTotalLength());
    host.style.setProperty('--len', len);

    // Measure the real word box (resolution-independent) and size the oval to
    // the word width plus a font-relative clearance, so the stroke never
    // touches the glyphs. Recompute on resize and once webfonts have loaded.
    const fitOval = () => {
      const fs = parseFloat(getComputedStyle(host).fontSize) || 16;
      const w = host.getBoundingClientRect().width;
      svg.style.width = (w + fs * 3.2) + 'px'; // rounded ends sit ~1.6em beyond
                                               // the word on each side
    };
    fitOval();
    window.addEventListener('resize', fitOval, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitOval);

    if (reduce) { host.classList.add('is-drawn'); return; }

    let boilRaf = 0;
    const startBoil = () => {
      if (boilRaf) return;
      // Discrete frame-by-frame "boil": hard-swap the WHOLE oval to a random
      // variant at a slow rate (~3fps) so the line just twitches now and then,
      // alive but not cinematic. No tweening = no smooth, lifeless morph.
      const INTERVAL = 320;
      let cur = 0, last = -1e9;
      const tick = (ts) => {
        if (ts - last >= INTERVAL) {
          last = ts;
          let n; do { n = Math.floor(Math.random() * variants.length); } while (n === cur);
          cur = n;
          path.setAttribute('d', toD(variants[cur]));
        }
        boilRaf = requestAnimationFrame(tick);
      };
      boilRaf = requestAnimationFrame(tick);
    };

    const drawIn = () => {
      host.classList.add('is-drawn');
      startBoil();   // twitch from the very first stroke, not after it
      // Go solid once fully drawn so swaps never leave a dash gap.
      path.addEventListener('transitionend', () => { path.style.strokeDasharray = 'none'; }, { once: true });
    };

    // Inside a gated section the word is hidden behind the curtain, so the
    // central-band observer would draw it unseen — let the gate trigger it on
    // reveal instead (host._gateDraw is called from setupRevealGate).
    if (GATE_ON && host.closest('[data-gate="lock"], [data-gate="fade"]')) {
      host._gateDraw = drawIn;
      return;
    }

    // Trigger draw-in only when the word sits in the central band of the screen.
    const centerObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { drawIn(); centerObs.disconnect(); }
      });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    centerObs.observe(host);
  }

  /* ---------- Section reveal gate (desktop only) ----------
     Each [data-gate] section gets an opaque white curtain. As the user scrolls
     a section into the trigger band we briefly lock input, glide the section to
     a consistent landing spot, lift the curtain (direction per data-reveal) and
     fire that section's inner animations — then unlock. Soft gate: native scroll
     resumes between sections, anchor jumps and deep links are never trapped. */
  function setupRevealGate(revealObs) {
    if (!GATE_ON) return;
    try {
      const lockSecs = Array.from(document.querySelectorAll('[data-gate="lock"]'));
      const fadeSecs = Array.from(document.querySelectorAll('[data-gate="fade"]'));

      /* ---- content-entrance choreography (per section) ---- */
      // Stagger a set of elements in with a motion class, then strip the classes
      // once done so any hover/transition on those elements returns to normal.
      const staggerIn = (els, cls, step) => {
        els.filter(Boolean).forEach((el, i) => {
          el.classList.add(cls);
          void el.offsetWidth;                 // commit the hidden state
          setTimeout(() => {
            el.classList.add('g-in');
            const done = () => { el.classList.remove(cls, 'g-in'); el.removeEventListener('transitionend', done); };
            el.addEventListener('transitionend', done);
          }, 40 + i * step);
        });
      };
      const noH2 = (list) => list.filter(el => el && el.tagName !== 'H2');
      const contentFor = (sec) => {
        const q = (s) => sec.querySelector(s);
        const qa = (s) => Array.from(sec.querySelectorAll(s));
        switch (sec.id) {
          case 'services':return { rise: [q('.hpanel-intro')], right: qa('.hpanel-card').slice(0, 3) };
          case 'brands':  return { rise: [q('.brands-sub'), q('.brand-marquee'), q('.cars-feed')] };
          case 'stations':return { left: [q('.stations-left')], right: [q('.stations-right')] };
          case 'promo':   return { pop: qa('.promo-card') };
          case 'about':   return { rise: [q('.trust-sub'), ...qa('.trust-card')] };
          case 'reviews': return { rise: [q('.reviews-controls')], pop: [q('.reviews-deck')] };
          case 'faq':     return { rise: [q('.faq-sub'), ...qa('.faq-item')] };
          case 'signup':  return { pop: noH2(qa('.cta-inner > *')) };
          case 'prices':  return { rise: [q('.price-eyebrow'), q('.price-cta-inner > p')], pop: [q('.price-cta-actions')] };
          default:        return {};
        }
      };
      const activateInner = (sec) => {
        sec.querySelectorAll('[data-count]').forEach(c => animateCounter(c));
        sec.querySelectorAll('.line-reveal, .reveal').forEach(el => revealObs.observe(el));
        const mc = sec.querySelector('.mark-circle');
        if (mc && mc._gateDraw) { mc._gateDraw(); mc._gateDraw = null; }
        if (sec._drawTree) sec._drawTree();           // "4 steps" branch draws itself
        const c = contentFor(sec);
        if (c.rise)  staggerIn(c.rise,  'g-rise',  80);
        if (c.left)  staggerIn(c.left,  'g-left',  0);
        if (c.right) staggerIn(c.right, 'g-right', 110);
        if (c.pop)   staggerIn(c.pop,   'g-pop',   80);
      };
      const reveal = (sec) => {
        if (!sec || sec.classList.contains('is-revealed')) return;
        sec.classList.add('is-revealed');
        activateInner(sec);
      };
      // Instant reveal (anchor jumps / load): drop curtain immediately, no lock.
      const revealNow = (sec) => {
        if (sec.classList.contains('is-revealed')) return;
        const cur = sec.querySelector('.gate-curtain');
        if (cur) cur.remove();
        reveal(sec);
      };

      /* ---- lock sections: white curtain, freeze in place, reveal, release ---- */
      lockSecs.forEach(sec => {
        if (getComputedStyle(sec).position === 'static') sec.style.position = 'relative';
        const curtain = document.createElement('div');
        curtain.className = 'gate-curtain';
        sec.appendChild(curtain);
      });

      const prevent = (e) => e.preventDefault();
      const KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ', 'Spacebar']);
      const preventKey = (e) => { if (KEYS.has(e.key)) e.preventDefault(); };
      const lock = () => {
        window.addEventListener('wheel', prevent, { passive: false });
        window.addEventListener('touchmove', prevent, { passive: false });
        window.addEventListener('keydown', preventKey);
      };
      const unlock = () => {
        window.removeEventListener('wheel', prevent, { passive: false });
        window.removeEventListener('touchmove', prevent, { passive: false });
        window.removeEventListener('keydown', preventKey);
      };

      // Roughly when a section's content finishes its entrance, so we can hold
      // the lock through the whole animation (plus a beat) before releasing.
      const RELEASE_DELAY = 600;
      const holdFor = (sec) => {
        if (sec.dataset.revealMs) return parseInt(sec.dataset.revealMs, 10);
        const c = contentFor(sec);
        const n = [].concat(c.rise || [], c.left || [], c.right || [], c.pop || []).filter(Boolean).length;
        const animEnd = 40 + Math.max(0, n - 1) * 90 + 800;    // last item + its transition
        return Math.min(2400, Math.max(1300, animEnd + RELEASE_DELAY));
      };
      const lockReveal = (sec) => {
        locking = true;
        lock();                                       // take scroll away — in place
        const curtain = sec.querySelector('.gate-curtain');
        if (curtain) curtain.classList.add('is-fixed'); // guarantee a full-white frame
        requestAnimationFrame(() => {
          reveal(sec);                                // curtain leaves, content enters
          setTimeout(() => {
            unlock();                                 // hand scroll back, with a beat
            locking = false;
            if (curtain) curtain.remove();
          }, holdFor(sec));
        });
      };

      /* ---- hard walls: the page can't scroll past an unrevealed section ----
         Fast scrolling used to overshoot the trigger, so the reveal played
         half off-screen. Now the first unrevealed section is a dead end. The
         white curtain is pinned full-screen FIRST, then the scroll snaps to the
         wall behind it — so the correction is invisible (seamless), not a
         visible jerk back. Residual momentum keeps getting squashed under the
         same white curtain until the reveal hands scroll back.
         Snaps are `behavior:'instant'`; html{scroll-behavior:smooth} would
         otherwise turn the correction into a visible glide. */
      const snapTo = (y) => window.scrollTo({ top: y, behavior: 'instant' });
      let lockY = 0;
      const engage = () => {
        if (locking) {
          if (Math.abs(window.scrollY - lockY) > 1) snapTo(lockY);  // hidden under white
          return;
        }
        if (navHold) return;                          // let anchor glides through
        // fade sections: IO can miss them during violent scrolling — this
        // position check guarantees they never end up passed-but-blank
        fadeSecs.forEach(s => {
          if (!s.classList.contains('is-revealed') &&
              s.getBoundingClientRect().top < window.innerHeight * 0.7) reveal(s);
        });
        const sec = lockSecs.find(s => !s.classList.contains('is-revealed'));
        if (!sec) return;
        const wallY = sec.offsetTop;
        if (window.scrollY >= wallY - 2) {
          const curtain = sec.querySelector('.gate-curtain');
          if (curtain) curtain.classList.add('is-fixed');  // white covers the overshoot
          lockY = wallY;
          snapTo(wallY);                              // …then snap behind it, unseen
          lockReveal(sec);
        }
      };
      window.addEventListener('scroll', engage, { passive: true });
      window.addEventListener('resize', engage, { passive: true });

      /* ---- fade sections: no lock, content just eases in on approach ---- */
      fadeSecs.forEach(sec => {
        const c = contentFor(sec);
        const blocks = [].concat(c.rise || [], c.left || [], c.right || [], c.pop || []).filter(Boolean);
        blocks.forEach(el => el.classList.add('g-rise'));   // pre-hide (JS-only)
        const probe = blocks[0] || sec;
        const io = new IntersectionObserver((entries) => {
          entries.forEach(e => {
            if (e.isIntersecting) { reveal(sec); io.disconnect(); }
          });
        }, { threshold: 0.35 });
        io.observe(probe);
      });

      /* ---- anchor jumps & deep links: reveal target up-front, never lock ---- */
      const allGated = lockSecs.concat(fadeSecs);
      const revealForTarget = (sel) => {
        const t = sel && document.querySelector(sel);
        if (!t) return;
        const ty = t.getBoundingClientRect().top + window.scrollY;
        allGated.forEach(s => { if (s.offsetTop <= ty + 4) revealNow(s); });
      };
      document.addEventListener('click', (e) => {
        const a = e.target.closest && e.target.closest('a[href^="#"]');
        if (!a || a.getAttribute('href').length < 2) return;
        revealForTarget(a.getAttribute('href'));
        navHold = true;                               // sit out the smooth-scroll
        setTimeout(() => { navHold = false; }, 800);
      }, true);

      if (location.hash && location.hash.length > 1) revealForTarget(location.hash);
      // reveal anything already on screen at load (no lock)
      lockSecs.forEach(sec => {
        if (sec.getBoundingClientRect().top <= window.innerHeight * 0.06) revealNow(sec);
      });

      setupHowTree();
    } catch (err) {
      // Any failure: strip curtains / hidden states so nothing is stranded blank.
      document.querySelectorAll('.gate-curtain').forEach(c => c.remove());
      document.querySelectorAll('.g-rise, .g-left, .g-right, .g-pop')
        .forEach(el => el.classList.remove('g-rise', 'g-left', 'g-right', 'g-pop'));
      document.querySelectorAll('[data-gate="lock"], [data-gate="fade"]')
        .forEach(s => s.classList.add('is-revealed'));
      console.error('reveal gate disabled:', err);
    }
  }

  /* ---------- "4 steps" tree: winding branch drawn on a timer at reveal ----------
     The tree is now a normal full-screen lock section. When it reveals, the
     branch draws itself once over ~1.7s (firefly riding the tip, nodes popping
     in sequence). It's a one-shot — re-scrolling the section never re-pins or
     re-draws it, so the page is never "held" on later passes. Mobile keeps the
     plain stacked layout (the draw never runs there). */
  function setupHowTree() {
    const how = document.getElementById('how');
    if (!how) return;
    const fill = how.querySelector('.how-path-fill');
    const steps = Array.from(how.querySelectorAll('.how-step'));
    if (!fill || !steps.length) return;
    const tree = how.querySelector('.how-tree');
    const dot = how.querySelector('.how-dot');
    const realLen = fill.getTotalLength();    // viewBox units; coords map to CSS %
    const TH = steps.map((_, i) => Math.max(0, (i + 0.55) / steps.length - 0.12));
    let played = false;
    how._drawTree = (duration = 1700) => {
      if (played) return;
      played = true;
      const ease = (t) => 1 - Math.pow(1 - t, 2);   // easeOutQuad
      const t0 = performance.now();
      const frame = (now) => {
        const t = Math.min((now - t0) / duration, 1);
        const e = ease(t);
        fill.style.strokeDashoffset = (1 - e).toFixed(4);
        if (dot) {
          const pt = fill.getPointAtLength(e * realLen);
          dot.style.left = pt.x + '%';
          dot.style.top = pt.y + '%';
          dot.classList.toggle('on', e > 0.01 && e < 0.985);
        }
        steps.forEach((s, i) => { if (e >= TH[i]) s.classList.add('in'); });
        if (t < 1) requestAnimationFrame(frame);
        else { if (dot) dot.classList.remove('on'); if (tree) tree.classList.add('done'); }
      };
      requestAnimationFrame(frame);
    };
  }

  /* ---------- Smooth-scroll polish for in-page links ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length > 1) {
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' });
        }
      }
    });
  });

  /* ---------- Mobile menu ---------- */
  const burger = document.getElementById('burger');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileMenuBackdrop = document.getElementById('mobileMenuBackdrop');
  const mobileMenuClose = document.getElementById('mobileMenuClose');

  const openMobileMenu = () => {
    if (!mobileMenu) return;
    mobileMenu.classList.add('is-open');
    mobileMenu.setAttribute('aria-hidden', 'false');
    burger && burger.classList.add('is-open');
    burger && burger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
  };

  const closeMobileMenu = () => {
    if (!mobileMenu) return;
    mobileMenu.classList.remove('is-open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    burger && burger.classList.remove('is-open');
    burger && burger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
  };

  if (burger) burger.addEventListener('click', () => {
    mobileMenu && mobileMenu.classList.contains('is-open') ? closeMobileMenu() : openMobileMenu();
  });
  if (mobileMenuBackdrop) mobileMenuBackdrop.addEventListener('click', closeMobileMenu);
  if (mobileMenuClose) mobileMenuClose.addEventListener('click', closeMobileMenu);

  if (mobileMenu) {
    mobileMenu.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', closeMobileMenu);
    });
    mobileMenu.addEventListener('click', (e) => {
      const actionable = e.target.closest('[data-open-booking],[data-open-history],[data-open-city],[data-open-map],[data-open-info],[data-open-oilpicker]');
      if (actionable) closeMobileMenu();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenu && mobileMenu.classList.contains('is-open')) closeMobileMenu();
  });

  /* ---------- City picker ---------- */
  const CITIES = [
    { city: 'Санкт-Петербург',  loc: 'Санкт-Петербурге',   address: '23 станции по городу',                              phone: '+7 (812) 603-44-80' },
    { city: 'Янино',            loc: 'Янино',              address: 'Шоссейная ул., 36',                                  phone: '+7 (812) 987-77-27' },
    { city: 'Шушары',           loc: 'Шушарах',            address: 'Вишерская, 11',                                      phone: '+7 (812) 988-21-66' },
    { city: 'Гатчина',          loc: 'Гатчине',            address: 'Ленинградское ш., 10',                               phone: '+7 (812) 317-15-16' },
    { city: 'Кировск',          loc: 'Кировске',           address: 'Магистральная, 46',                                  phone: '+7 (812) 999-92-26' },
    { city: 'Тосно',            loc: 'Тосно',              address: 'Московское ш., 33 лит А',                            phone: '+7 (812) 317-15-16' },
    { city: 'Кронштадт',        loc: 'Кронштадте',         address: 'Зосимова, 1 лит Б',                                  phone: '+7 (812) 425-35-39' },
    { city: 'Ленсоветский',     loc: 'Ленсоветском',       address: 'Московское ш., 250 лит Б',                           phone: '+7 (812) 987-90-40' },
    { city: 'Горелово',         loc: 'Горелово',           address: 'Красносельское ш., 43 лит А',                        phone: '+7 (812) 987-28-28' },
    { city: 'Песочный',         loc: 'Песочном',           address: 'Ленинградская, 99 лит Д',                            phone: '+7 (812) 407-21-40' },
    { city: 'Агалатово',        loc: 'Агалатово',          address: 'Приозерское ш., уч. 31 лит А',                       phone: '+7 (812) 926-10-10' },
    { city: 'Новое Девяткино',  loc: 'Новом Девяткино',    address: 'д. 118',                                             phone: '+7 (812) 385-57-01' },
    { city: 'пос. Тельмана',    loc: 'пос. Тельмана',      address: 'ул. Тельмана, 2 лит В',                              phone: '+7 (812) 988-81-66' },
    { city: 'Всеволожск',       loc: 'Всеволожске',        address: 'дер. Кальтино, Песочная, 30',                        phone: '+7 (812) 987-99-33' },
    { city: 'Новосаратовка',    loc: 'Новосаратовке',      address: 'д. 267 лит А',                                       phone: '+7 (921) 344-44-80' },
    { city: 'Разметелево',      loc: 'Разметелево',        address: 'Строителей, 2/3 лит Б',                              phone: '+7 (911) 242-80-98' },
    { city: 'Ломоносов',        loc: 'Ломоносове',         address: 'Михайловская, 40/7',                                 phone: '+7 (930) 035-33-50' },
    { city: 'Сосновый Бор',     loc: 'Сосновом Бору',      address: 'Ак. Александрова, 2',                                phone: '+7 (911) 922-17-77' },
    { city: 'Кингисепп',        loc: 'Кингисеппе',         address: 'Карла Маркса, 42',                                   phone: '+7 (981) 810-22-44' },
    { city: 'Выборг',           loc: 'Выборге',            address: 'Железнодорожный тупик, 4',                           phone: '+7 (911) 980-37-77' },
    { city: 'Кириши',           loc: 'Киришах',            address: 'Героев, 33',                                         phone: '+7 (911) 949-27-77' },
    { city: 'Красное Село',     loc: 'Красном Селе',       address: 'Пушкинское ш., 1Б',                                  phone: '+7 (993) 981-21-21' },
    { city: 'Великий Новгород', loc: 'Великом Новгороде',  address: 'Псковская, 33 (Лента)',                              phone: '+7 (911) 099-37-77' },
    { city: 'Псков',            loc: 'Пскове',             address: 'Рижский пр-т, 96 лит Б',                             phone: '+7 (911) 902-17-77' },
    { city: 'Петрозаводск',     loc: 'Петрозаводске',      address: 'Шотмана, 25 лит Б',                                  phone: '+7 (814) 244-55-33' },
    { city: 'Рязань',           loc: 'Рязани',             address: 'пр-д Шабулина, 31',                                  phone: '+7 (814) 244-55-33' },
    { city: 'Рязань',           loc: 'Рязани',             address: 'ул. Военных автомобилистов, 11',                     phone: '+7 (900) 603-33-22' },
    { city: 'Рязань',           loc: 'Рязани',             address: 'ул. Зубковой, 10 (р-н Песочня)',                     phone: '+7 (900) 603-44-33' },
    { city: 'Саратов',          loc: 'Саратове',           address: 'Максима Горького, 81/1',                             phone: '+7 (845) 260-41-14' },
    { city: 'Ростов-на-Дону',   loc: 'Ростове-на-Дону',    address: 'Таганрогская, 181/1',                                phone: '+7 (863) 333-26-99' },
    { city: 'Ростов-на-Дону',   loc: 'Ростове-на-Дону',    address: 'Портовая, 251',                                      phone: '+7 (863) 333-24-88' },
    { city: 'Киров',            loc: 'Кирове',             address: 'Нововятский р-н, Советская, 14',                     phone: '+7 (964) 250-69-00' },
    { city: 'Братск',           loc: 'Братске',            address: 'Иркутская обл., ул. Мира, 65/9',                     phone: '+7 (991) 434-22-10' },
    { city: 'Братск',           loc: 'Братске',            address: 'жилой район Энергетик, ул. Наймушина',               phone: '+7 (991) 435-10-22' },
    { city: 'Усть-Кут',         loc: 'Усть-Куте',          address: 'ул. Кирова, уч. №65Е',                               phone: '+7 (991) 542-42-42' },
    { city: 'Химки',            loc: 'Химках',             address: 'Новосходненское ш., квартал Филино, 143',            phone: '+7 (495) 215-17-16' }
  ];
  CITIES.forEach((c, i) => { c.id = i; c.tel = '+' + c.phone.replace(/\D/g, ''); });

  const LINE_COLORS = { 1: '#E8112D', 2: '#0B53A5', 3: '#009E60', 4: '#F26522', 5: '#9B59B6' };
  const LINE_NAMES  = { 1: 'Кировско-Выборгская', 2: 'Московско-Петроградская', 3: 'Невско-Василеостровская', 4: 'Правобережная', 5: 'Фрунзенско-Приморская' };

  /* Full SPb station list — coordinates from zamena-masla-spot.ru Yandex Maps links. */
  const SPB_STATIONS = [
    // Линия 1 — Кировско-Выборгская (Красная)
    { short: 'Выборгское ш., 212',  station: 'Парнас',            line: 1, box: '#19', layout: '1 бокс / 1 яма',                height: '2 м',       lat: 60.068668, lng: 30.293284 },
    { short: 'Полюстровский пр.',   station: 'Площадь Ленина',    line: 1, box: '#24', layout: '1 бокс / 1 яма',                height: '2.2 м',     lat: 59.972947, lng: 30.380196 },
    { short: 'Руставели 69',        station: 'Академическая',     line: 1, box: '#33', layout: '2 бокса / 2 ямы',               height: '2.6 м',     lat: 60.037149, lng: 30.433234 },
    { short: 'Охтинская / Мурино',  station: 'Девяткино',         line: 1, box: '#34', layout: '1 бокс / 1 яма',                height: '2.5 м',     lat: 60.047551, lng: 30.427322 },
    { short: 'Кубинская 82',        station: 'Ленинский пр.',     line: 1, box: '#15', layout: '1 бокс / 1 подъёмник',          height: '2.6 м',     lat: 59.837636, lng: 30.303902 },
    { short: 'Казакова 29',         station: 'Пр. Ветеранов',     line: 1, box: '#28', layout: '2 бокса / 1 подъёмник',         height: '3 / 2.6 м', lat: 59.860364, lng: 30.213586 },
    { short: 'Жукова 21',           station: 'Автово',            line: 1, box: '#05', layout: '1 бокс / 1 подъёмник',          height: '2.5 м',     lat: 59.862877, lng: 30.233586 },
    // Линия 2 — Московско-Петроградская (Синяя)
    { short: 'Придорожная',         station: 'Просвещения',       line: 2, box: '#02', layout: '2 бокса / 2 подъёмника',        height: '2.2 м',     lat: 60.056333, lng: 30.357981 },
    { short: 'Выборгское ш., 2',    station: 'Озерки',            line: 2, box: '#09', layout: '2 бокса / 2 подъёмника',        height: '2.4 м',     lat: 60.033674, lng: 30.319866 },
    { short: 'Кузнецовская 60',     station: 'Парк Победы',       line: 2, box: '#35', layout: '2 бокса / 2 подъёмника',        height: '2.6 м',     lat: 59.873365, lng: 30.352412 },
    { short: 'Типанова 20',         station: 'Московская',        line: 2, box: '#22', layout: '2 бокса / 2 ямы',               height: '2 м',       lat: 59.851919, lng: 30.339988 },
    { short: 'М. Балканская 35',    station: 'Купчино',           line: 2, box: '#20', layout: '1 бокс / 1 яма',                height: '2.2 м',     lat: 59.824276, lng: 30.396365 },
    // Линия 3 — Невско-Василеостровская (Зелёная)
    { short: 'Уральская 7',         station: 'Василеостровская',  line: 3, box: '#30', layout: '2 бокса / 2 ямы',               height: '2.3 м',     lat: 59.952524, lng: 30.262814 },
    { short: 'Карваевская 15',      station: 'Рыбацкое',          line: 3, box: '#21', layout: '1 бокс / 1 яма',                height: '2.2 м',     lat: 59.835876, lng: 30.495576 },
    { short: 'Советский 55',        station: 'Рыбацкое',          line: 3, box: '#11', layout: '1 бокс / 1 подъёмник',          height: '2.9 м',     lat: 59.825058, lng: 30.552574 },
    // Линия 4 — Правобережная (Оранжевая)
    { short: 'Индустриальный пр.',  station: 'Ладожская',         line: 4, box: '#27', layout: '1 бокс / 1 яма',                height: '2.7 м',     lat: 59.959278, lng: 30.464728 },
    { short: 'Дальневосточный пр.', station: 'Пр. Большевиков',   line: 4, box: '#07', layout: '2 бокса / 1 подъёмник / 1 яма', height: '2.5 м',     lat: 59.916306, lng: 30.429029 },
    { short: 'Солидарности 22',     station: 'Пр. Большевиков',   line: 4, box: '#06', layout: '2 бокса / 2 подъёмника',        height: '2.3 м',     lat: 59.913645, lng: 30.500104 },
    { short: 'Кудрово',             station: 'Ул. Дыбенко',       line: 4, box: '#08', layout: '2 бокса / 2 подъёмника',        height: '2.6 м',     lat: 59.905967, lng: 30.505727 },
    // Линия 5 — Фрунзенско-Приморская (Фиолетовая)
    { short: 'Планерная 16',        station: 'Комендантский пр.', line: 5, box: '#18', layout: '2 бокса / 1 подъёмник / 1 яма', height: '2.8 м',     lat: 59.999687, lng: 30.233421 },
    { short: 'Оптиков 2',           station: 'Комендантский пр.', line: 5, box: '#04', layout: '3 бокса / 1 подъёмник / 2 ямы', height: '2.4 м',     lat: 59.995075, lng: 30.254630 },
    { short: 'Фучика 23',           station: 'Бухарестская',      line: 5, box: '#01', layout: '1 бокс / 1 яма',                height: '2.6 м',     lat: 59.883381, lng: 30.386512, note: 'Во дворе' },
    { short: 'Фучика 14',           station: 'Международная',     line: 5, box: '#03', layout: '2 бокса / 2 подъёмника',        height: '2.2 м',     lat: 59.884379, lng: 30.386548, note: 'На улице' },
    { short: 'Дунайский 21',        station: 'Дунайская',         line: 5, box: '#12', layout: '1 бокс / 1 подъёмник',          height: '2.2 м',     lat: 59.851,    lng: 30.387    },
  ];
  const SPB_TOTAL_COUNT = 28;

  /* ---------- Station employees (parsed from zamena-masla-spot.ru/contacts) ---------- */
  const STATION_EMPLOYEES = {
    'Фучика 23':           [{ name: 'Александр', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/68be8233567197.05474015.png' }, { name: 'Егор', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/68f20a8d0af3f8.25060800.png' }],
    'Придорожная':         [{ name: 'Борис', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/69d90b9fb4a587.66647630.png' }, { name: 'Максим', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/69e086733d1ba9.06682022.png' }],
    'Фучика 14':           [{ name: 'Олег', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/68f2099802e764.56557934.png' }, { name: 'Дмитрий', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/68f20978217972.01412270.png' }, { name: 'Денис', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/690314978d0ae6.74276015.png' }],
    'Оптиков 2':           [{ name: 'Андрей', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/5f4dff56418366.26828154.png' }, { name: 'Антон', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/69cbc397ad1d98.78264386.png' }, { name: 'Никита', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/68d65709b6f6d5.83557149.png' }],
    'Жукова 21':           [{ name: 'Дмитрий', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/68f0fb33a7e029.65438681.png' }, { name: 'Александр', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/68f1e45b8d5795.50308788.png' }],
    'Солидарности 22':     [{ name: 'Кирилл', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/657d4a313e8571.95447206.png' }, { name: 'Александр', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/66335097741789.28056728.png' }, { name: 'Михаил', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/5ffc62a03d7128.46946284.png' }],
    'Дальневосточный пр.': [{ name: 'Даниил', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/62020b1b6e0011.07624590.png' }, { name: 'Павел', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/650afc0cd2e7d7.17895503.png' }, { name: 'Кирилл', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/657d4a313e8571.95447206.png' }],
    'Кудрово':             [{ name: 'Кирилл', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/657d4a313e8571.95447206.png' }, { name: 'Антон', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/688862c9b5e972.17785232.png' }, { name: 'Андрей', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/64d6021d11bd83.24775563.png' }],
    'Выборгское ш., 2':    [{ name: 'Илья', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/67d1237d56d277.04186190.png' }, { name: 'Евгений', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/67cef261492e52.25128304.png' }, { name: 'Никита', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/692c556b008da9.81412809.png' }],
    'Советский 55':        [{ name: 'Денис', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/6422a34b666dc9.71850780.png' }, { name: 'Михаил', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/5ffc62a03d7128.46946284.png' }, { name: 'Сергей', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/60b72c17f0ffa7.38273221.png' }],
    'Кубинская 82':        [{ name: 'Денис', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/62416953551b25.56618425.png' }, { name: 'Вячеслав', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/68f0d7310dad91.63343740.png' }, { name: 'Сергей', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/60b72c17f0ffa7.38273221.png' }],
    'Планерная 16':        [{ name: 'Егор', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/63354928e02524.90147040.png' }, { name: 'Антон', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/69cbc397ad1d98.78264386.png' }],
    'Выборгское ш., 212':  [{ name: 'Сергей', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/62a98e17de5130.33386455.png' }, { name: 'Александр', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/69cbc55584e065.39037656.png' }],
    'М. Балканская 35':    [{ name: 'Константин', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/68f0eeba7c02d6.92635769.png' }, { name: 'Александр', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/68be8233567197.05474015.png' }],
    'Карваевская 15':      [{ name: 'Алексей', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/65094bf382f878.20723038.png' }, { name: 'Кирилл', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/6817782edd9d09.23369102.png' }],
    'Типанова 20':         [{ name: 'Артемий', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/68f255fa0ee2b5.55079347.png' }, { name: 'Руслан', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/68f0e7d3020a96.37839175.png' }, { name: 'Дмитрий', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/6903140c440742.24481610.png' }],
    'Полюстровский пр.':   [{ name: 'Максим', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/69e086733d1ba9.06682022.png' }, { name: 'Артем', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/699848e1129cb1.63503761.png' }],
    'Индустриальный пр.':  [{ name: 'Даниил', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/62020b1b6e0011.07624590.png' }, { name: 'Кирилл', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/657d4a313e8571.95447206.png' }, { name: 'Антон', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/69cbc397ad1d98.78264386.png' }],
    'Казакова 29':         [{ name: 'Максим', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/690453c2eafaa9.95793955.png' }, { name: 'Денис', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/68f1e43d27daf8.30755146.png' }, { name: 'Максим', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/69f322f9102894.64004066.png' }],
    'Руставели 69':        [{ name: 'Владимир', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/690328de42b926.13569556.png' }, { name: 'Сергей', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/68f0d75cd7d679.59409444.png' }, { name: 'Андрей', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/690328bf185ce4.79711170.png' }],
    'Охтинская / Мурино':  [{ name: 'Максим', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/69157d5a627157.92869160.png' }],
    'Кузнецовская 60':     [{ name: 'Денис', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/690c76d0620526.66085211.png' }, { name: 'Вячеслав', photo: 'https://zamena-masla-spot.ru/crmFiles/files/images/68f0d7310dad91.63343740.png' }],
  };
  const getEmployees = (short) => STATION_EMPLOYEES[short] || [];

  const stationsForCity = (cityName) => {
    if (cityName === 'Санкт-Петербург') {
      return SPB_STATIONS.map(s => ({ ...s, label: s.short }));
    }
    return CITIES
      .filter(c => c.city === cityName)
      .map(c => ({ label: c.address, sub: c.city }));
  };

  const stationsCountForCity = (cityName) => {
    if (cityName === 'Санкт-Петербург') return SPB_TOTAL_COUNT;
    return CITIES.filter(c => c.city === cityName).length;
  };

  /* Russian plural for «станция» (1 → станция, 2-4 → станции, else → станций) */
  const stationWord = (n) => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 14) return 'станций';
    if (mod10 === 1) return 'станция';
    if (mod10 >= 2 && mod10 <= 4) return 'станции';
    return 'станций';
  };

  const STORAGE_KEY = 'spot:selectedCity';
  const cityNameEls = [document.getElementById('cityName'), document.getElementById('cityNameFooter'), document.getElementById('mobileMenuCityName')].filter(Boolean);
  const phoneTextEls = () => document.querySelectorAll('.js-phone');
  const phoneLinkEls = () => document.querySelectorAll('.js-phone-link');
  const cityLocEls = () => document.querySelectorAll('.js-city-loc');
  const cityLocPrefixedEls = () => document.querySelectorAll('.js-city-loc-prefixed');
  const stationListEl = document.getElementById('stationList');
  const stationsCountEl = document.getElementById('stationsCount');
  const stationsWordEl = document.getElementById('stationsWord');
  const statStationCountEl = document.getElementById('statStationCount');
  const stationsCopyEl = document.getElementById('stationsCopy');

  const stationImgSrc = (s) => {
    if (s.photo) return s.photo;
    if (s.lat) return `https://static-maps.yandex.ru/1.x/?ll=${s.lng},${s.lat}&z=17&l=sat&size=300,200`;
    return null;
  };

  const makeCard = (s) => {
    const color = LINE_COLORS[s.line] || '#999';
    const src = stationImgSrc(s);
    const emps = s.short ? getEmployees(s.short) : [];
    const teamHtml = emps.length
      ? `<div class="stn-card-team">${emps.slice(0, 4).map(e =>
          `<img class="stn-card-avatar" src="${e.photo}" alt="${e.name}" title="${e.name}" loading="lazy" onerror="this.style.display='none'">`
        ).join('')}<span class="stn-card-team-names">${emps.map(e => e.name).join(', ')}</span></div>`
      : '';
    return `<div class="stn-card">
      <div class="stn-card-photo" style="--c:${color}">
        ${src ? `<img src="${src}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}
      </div>
      <div class="stn-card-stripe" style="background:${color}"></div>
      <div class="stn-card-body">
        <strong>${s.short || s.label}</strong>
        <span>${s.station ? 'м. ' + s.station : (s.sub || '')}</span>
        ${s.layout ? `<span class="stn-card-detail">${s.layout}</span>` : ''}
        ${teamHtml}
      </div>
    </div>`;
  };

  const renderStations = (cityName) => {
    if (!stationListEl) return;
    const list = stationsForCity(cityName);
    if (!list.length) {
      stationListEl.innerHTML = '<ul class="station-list"><li><strong>Станций пока нет</strong><span>Свяжитесь с нами по телефону</span></li></ul>';
      return;
    }
    if (cityName === 'Санкт-Петербург') {
      const ROWS = 3;
      const SPEEDS = [110, 90, 125];
      const DIRS   = ['left','right','left'];
      let rows = '';
      for (let i = 0; i < ROWS; i++) {
        const offset = Math.floor((i / ROWS) * list.length);
        const rotated = [...list.slice(offset), ...list.slice(0, offset)];
        const cards = rotated.map(makeCard).join('');
        rows += `<div class="stn-track" data-dir="${DIRS[i]}" style="animation-duration:${SPEEDS[i]}s">${cards}${cards}</div>`;
      }
      stationListEl.innerHTML = `<div class="stn-ticker-wrap">${rows}</div>`;
      return;
    }
    stationListEl.innerHTML = '<ul class="station-list">' + list.map(s => {
      const color = LINE_COLORS[s.line];
      const metro = s.station
        ? `<span class="stn-metro"><span class="stn-dot" style="background:${color}"></span>м. ${s.station}</span>`
        : `<span>${s.sub || ''}</span>`;
      return `<li><strong>${s.label}</strong>${metro}</li>`;
    }).join('') + '</ul>';
  };

  const applyCity = (c) => {
    cityNameEls.forEach(el => el.textContent = c.city);
    phoneTextEls().forEach(el => el.textContent = c.phone);
    phoneLinkEls().forEach(el => el.setAttribute('href', 'tel:' + c.tel));
    cityLocEls().forEach(el => el.textContent = c.loc);
    cityLocPrefixedEls().forEach(el => el.textContent = 'в ' + c.loc);

    const count = stationsCountForCity(c.city);
    if (stationsCountEl) stationsCountEl.textContent = count;
    if (stationsWordEl) stationsWordEl.textContent = stationWord(count);
    if (statStationCountEl) {
      statStationCountEl.dataset.count = String(count);
      statStationCountEl.textContent = count;
    }
    if (stationsCopyEl) {
      stationsCopyEl.textContent = c.city === 'Санкт-Петербург'
        ? 'А также филиалы в городах: Янино, Петрозаводск, Рязань, Гатчина, Кировск, Саратов, Шушары, Ростов-на-Дону и других.'
        : `Сеть СТО SPOT: 28 станций в Санкт-Петербурге и филиалы в более чем 20 городах России.`;
    }
    renderStations(c.city);

    try { localStorage.setItem(STORAGE_KEY, String(c.id)); } catch(_) {}
  };

  let savedId = 0;
  try { savedId = parseInt(localStorage.getItem(STORAGE_KEY), 10) || 0; } catch(_) {}
  if (savedId < 0 || savedId >= CITIES.length) savedId = 0;
  applyCity(CITIES[savedId]);

  const modal = document.getElementById('cityModal');
  const list = document.getElementById('cityList');
  const search = document.getElementById('citySearch');
  const picker = document.getElementById('cityPicker');

  const renderList = (filter = '') => {
    if (!list) return;
    const q = filter.trim().toLowerCase();
    const items = CITIES.filter(c =>
      !q || c.city.toLowerCase().includes(q) || c.address.toLowerCase().includes(q)
    );
    if (!items.length) {
      list.innerHTML = '<div class="city-empty">Ничего не нашли. Попробуйте другой запрос.</div>';
      return;
    }
    list.innerHTML = items.map(c => `
      <button type="button" class="city-option${c.id === savedId ? ' is-active' : ''}" data-id="${c.id}">
        <div>
          <strong>${c.city}</strong>
          <div class="city-addr">${c.address}</div>
        </div>
        <div class="city-phone">${c.phone}</div>
      </button>
    `).join('');
  };

  const openModal = () => {
    if (!modal) return;
    renderList();
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => search && search.focus(), 50);
  };
  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (search) search.value = '';
  };

  if (picker) picker.addEventListener('click', openModal);

  /* ---------- City hint («вы из этого города») ---------- */
  const cityHint = document.getElementById('cityHint');
  const cityHintClose = document.getElementById('cityHintClose');
  if (cityHint) {
    let hintVisible = false;
    const hideHint = () => {
      if (!hintVisible) return;
      hintVisible = false;
      cityHint.classList.add('hiding');
      setTimeout(() => { cityHint.hidden = true; cityHint.classList.remove('hiding'); }, 300);
    };
    // Показываем при каждой загрузке, если пользователь в начале страницы
    // (закрытие действует только на текущий просмотр — после перезагрузки снова появится).
    setTimeout(() => {
      if (window.scrollY < 30) { cityHint.hidden = false; hintVisible = true; }
    }, 1300);
    cityHintClose && cityHintClose.addEventListener('click', (e) => { e.stopPropagation(); hideHint(); });
    picker && picker.addEventListener('click', hideHint);
    window.addEventListener('scroll', () => {
      if (hintVisible && window.scrollY > 40) hideHint();
    }, { passive: true });
  }

  document.querySelectorAll('[data-open-city]').forEach(b => b.addEventListener('click', openModal));
  document.querySelectorAll('[data-close-city]').forEach(b => b.addEventListener('click', closeModal));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal && modal.classList.contains('is-open')) closeModal(); });

  if (search) search.addEventListener('input', () => renderList(search.value));
  if (list) list.addEventListener('click', (e) => {
    const btn = e.target.closest('.city-option');
    if (!btn) return;
    const id = parseInt(btn.dataset.id, 10);
    const city = CITIES.find(c => c.id === id);
    if (city) {
      savedId = id;
      applyCity(city);
      closeModal();
    }
  });

  /* ---------- Price modal ---------- */
  const priceModal = document.getElementById('priceModal');
  const openPricesBtn = document.getElementById('openPrices');
  const priceSearch = document.getElementById('priceSearch');
  const priceEmpty = document.getElementById('priceEmpty');

  const openPriceModal = () => {
    if (!priceModal) return;
    priceModal.classList.add('is-open');
    priceModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => priceSearch && priceSearch.focus(), 60);
  };
  const closePriceModal = () => {
    if (!priceModal) return;
    priceModal.classList.remove('is-open');
    priceModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (priceSearch) {
      priceSearch.value = '';
      filterPrices('');
    }
  };

  const filterPrices = (raw) => {
    if (!priceModal) return;
    const q = raw.trim().toLowerCase();
    let anyVisible = false;
    priceModal.querySelectorAll('[data-group]').forEach(group => {
      let groupVisible = 0;
      group.querySelectorAll('li').forEach(row => {
        const text = row.textContent.toLowerCase();
        const match = !q || text.includes(q);
        row.style.display = match ? '' : 'none';
        if (match) { groupVisible++; anyVisible = true; }
      });
      group.style.display = groupVisible ? '' : 'none';
    });
    if (priceEmpty) priceEmpty.hidden = anyVisible;
  };

  if (openPricesBtn) openPricesBtn.addEventListener('click', openPriceModal);
  document.querySelectorAll('[data-close-price]').forEach(b => b.addEventListener('click', closePriceModal));
  if (priceSearch) priceSearch.addEventListener('input', () => filterPrices(priceSearch.value));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && priceModal && priceModal.classList.contains('is-open')) closePriceModal();
  });

  /* ---------- Generic modal helpers ---------- */
  const lockBody = () => { document.body.style.overflow = 'hidden'; };
  const unlockBody = () => { document.body.style.overflow = ''; };
  const openModalEl = (el) => {
    if (!el) return;
    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
    lockBody();
  };
  const closeModalEl = (el) => {
    if (!el) return;
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.is-open')) unlockBody();
  };

  /* ---------- Catalog modal (масла) ---------- */
  const catalogModal = document.getElementById('catalogModal');
  if (catalogModal) {
    const cGrid = document.getElementById('catalogGrid');
    const cSearch = document.getElementById('catalogSearch');
    const cSort = document.getElementById('catalogSort');
    const cEmpty = document.getElementById('catalogEmpty');
    const cLoading = document.getElementById('catalogLoading');
    const cCount = document.getElementById('catalogCount');
    const cFound = document.getElementById('catalogFound');
    const cReset = document.getElementById('catalogReset');
    const cFilters = document.getElementById('catalogFilters');
    const cFiltersToggle = document.getElementById('catalogFiltersToggle');
    const cFiltersBadge = document.getElementById('catalogFiltersBadge');
    const cDetail = document.getElementById('catalogDetail');
    const cDetailBody = document.getElementById('catalogDetailBody');
    const cDetailClose = document.getElementById('catalogDetailClose');
    const cApprovalsSearch = document.getElementById('catalogApprovalsSearch');

    let CATALOG = null;
    let catalogLoaded = false;
    let shown = [];
    // Скалярные фасеты (одно значение у товара) + approvals (массив допусков).
    const SCALAR_KEYS = ['brand', 'viscosity', 'volume', 'type'];
    const ALL_KEYS = [...SCALAR_KEYS, 'approvals'];
    const active = { brand: new Set(), viscosity: new Set(), volume: new Set(), type: new Set(), approvals: new Set() };

    const escHtml = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const escAttr = (s) => escHtml(s).replace(/"/g, '&quot;');
    const norm = (s) => String(s || '').toLowerCase().replace(/[\s-]/g, '');

    const phoneNow = () => {
      try {
        const c = CITIES[savedId];
        if (c) return { phone: c.phone, tel: c.tel };
      } catch (_) {}
      return { phone: '+7 (812) 603-44-80', tel: '+78126034480' };
    };

    const uniqueSorted = (key) => {
      const vals = [...new Set(CATALOG.map((i) => i[key]).filter(Boolean))];
      if (key === 'volume') return vals.sort((a, b) => parseFloat(a) - parseFloat(b));
      if (key === 'viscosity') return vals.sort();
      return vals.sort((a, b) => a.localeCompare(b, 'ru'));
    };

    // Допуски — массив у товара: собираем уникальные и сортируем по частоте (частые сверху).
    const approvalsByFreq = () => {
      const freq = new Map();
      CATALOG.forEach((i) => (i.approvals || []).forEach((a) => freq.set(a, (freq.get(a) || 0) + 1)));
      return [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru')).map((e) => e[0]);
    };

    const chipHtml = (key, v) =>
      `<button type="button" class="catalog-chip" data-key="${key}" data-val="${escAttr(v)}">${escHtml(v)}</button>`;

    const buildFilters = () => {
      SCALAR_KEYS.forEach((key) => {
        const box = catalogModal.querySelector(`[data-chips="${key}"]`);
        if (!box) return;
        const vals = uniqueSorted(key);
        const group = box.closest('.catalog-filter-group');
        if (!vals.length) { if (group) group.hidden = true; return; }
        box.innerHTML = vals.map((v) => chipHtml(key, v)).join('');
      });
      // Допуски
      const aBox = catalogModal.querySelector('[data-chips="approvals"]');
      if (aBox) {
        const vals = approvalsByFreq();
        const group = aBox.closest('.catalog-filter-group');
        if (!vals.length) { if (group) group.hidden = true; }
        else {
          aBox.innerHTML = vals.map((v) => chipHtml('approvals', v)).join('');
          const badge = catalogModal.querySelector('[data-approvals-count]');
          if (badge) badge.textContent = vals.length;
        }
      }
    };

    const itemMatches = (item) => {
      for (const key of SCALAR_KEYS) {
        if (active[key].size && !active[key].has(item[key])) return false;
      }
      if (active.approvals.size) {
        const aps = item.approvals || [];
        if (!aps.some((a) => active.approvals.has(a))) return false;
      }
      const q = norm(cSearch.value);
      if (q) {
        const hay = norm(`${item.title} ${item.brand} ${item.viscosity} ${item.volume} ${item.type} ${(item.approvals || []).join(' ')}`);
        if (!hay.includes(q)) return false;
      }
      return true;
    };

    const sortItems = (arr) => {
      const v = cSort.value;
      const a = arr.slice();
      if (v === 'price_asc') a.sort((x, y) => (x.price || 1e9) - (y.price || 1e9));
      else if (v === 'price_desc') a.sort((x, y) => (y.price || 0) - (x.price || 0));
      else if (v === 'title') a.sort((x, y) => x.title.localeCompare(y.title, 'ru'));
      return a;
    };

    const perLitre = (item) => /литр/i.test(item.priceText || '');

    const cardHtml = (item, idx) => {
      const badges = [];
      if (item.brand) badges.push(`<span class="catalog-badge brand">${escHtml(item.brand)}</span>`);
      if (item.viscosity) badges.push(`<span class="catalog-badge">${escHtml(item.viscosity)}</span>`);
      if (item.volume) badges.push(`<span class="catalog-badge">${escHtml(item.volume)}</span>`);
      return `<div class="catalog-card" role="button" tabindex="0" data-idx="${idx}">
        <span class="catalog-card-img"><img src="${escAttr(item.image)}" alt="${escAttr(item.title)}" loading="lazy" /></span>
        <span class="catalog-card-body">
          <span class="catalog-card-badges">${badges.join('')}</span>
          <span class="catalog-card-title">${escHtml(item.title)}</span>
          <span class="catalog-card-foot">
            <span class="catalog-card-price">${item.price ? `${item.price} ₽` : 'Уточняйте'}${item.price && perLitre(item) ? '<small> /литр</small>' : ''}</span>
            <span class="catalog-card-go" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>
          </span>
        </span>
      </div>`;
    };

    const render = () => {
      if (!CATALOG) return;
      shown = sortItems(CATALOG.filter(itemMatches));
      cGrid.innerHTML = shown.map((it, i) => cardHtml(it, i)).join('');
      cEmpty.hidden = shown.length > 0;
      cGrid.hidden = shown.length === 0;
      cCount.textContent = `${shown.length} из ${CATALOG.length}`;
      if (cFound) cFound.innerHTML = `Найдено <b>${shown.length}</b> ${plural(shown.length, 'масло', 'масла', 'масел')}`;
      const activeCount = ALL_KEYS.reduce((n, k) => n + active[k].size, 0);
      const anyFilter = activeCount > 0 || cSearch.value.trim();
      cReset.hidden = !anyFilter;
      if (cFiltersBadge) { cFiltersBadge.hidden = activeCount === 0; cFiltersBadge.textContent = activeCount; }
      if (cFiltersToggle) cFiltersToggle.classList.toggle('is-active', activeCount > 0);
    };

    const plural = (n, one, few, many) => {
      const m10 = n % 10, m100 = n % 100;
      if (m10 === 1 && m100 !== 11) return one;
      if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
      return many;
    };

    const openDetail = (item) => {
      const ph = phoneNow();
      const specs = [
        ['Бренд', item.brand],
        ['Вязкость', item.viscosity],
        ['Объём', item.volume],
        ['Тип', item.type],
      ].filter(([, v]) => v);
      const approvals = item.approvals || [];
      cDetailBody.innerHTML = `
        <div class="catalog-detail-img"><img src="${escAttr(item.image)}" alt="${escAttr(item.title)}" /></div>
        <div class="catalog-detail-info">
          <h3>${escHtml(item.title)}</h3>
          <div class="catalog-detail-badges">
            ${item.brand ? `<span class="catalog-badge brand">${escHtml(item.brand)}</span>` : ''}
            ${item.viscosity ? `<span class="catalog-badge">${escHtml(item.viscosity)}</span>` : ''}
            ${item.volume ? `<span class="catalog-badge">${escHtml(item.volume)}</span>` : ''}
          </div>
          ${item.price ? `<div class="catalog-detail-price">${item.price} ₽${perLitre(item) ? '<small> / литр</small>' : ''}</div>` : ''}
          <div class="catalog-detail-note">При покупке масла у нас — замена масла и фильтра бесплатно.</div>
          <div class="catalog-detail-section">
            <h4>Характеристики</h4>
            <dl>${specs.map(([k, v]) => `<div class="catalog-spec"><dt>${k}</dt><dd>${escHtml(v)}</dd></div>`).join('')}</dl>
          </div>
          ${approvals.length ? `<div class="catalog-detail-section">
            <h4>Допуски и спецификации</h4>
            <div class="catalog-approval-tags">${approvals.map((a) => `<span class="catalog-approval-tag">${escHtml(a)}</span>`).join('')}</div>
          </div>` : ''}
          ${item.description ? `<div class="catalog-detail-section"><h4>Описание</h4><p class="catalog-detail-desc">${escHtml(item.description)}</p></div>` : ''}
          <div class="catalog-detail-actions">
            <button type="button" class="btn btn-primary" data-open-booking>Записаться на замену</button>
            <a href="tel:${escAttr(ph.tel)}" class="btn btn-outline">${escHtml(ph.phone)}</a>
          </div>
        </div>`;
      cDetailBody.scrollTop = 0;
      cDetail.hidden = false;
      cDetail.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(() => cDetail.classList.add('is-open'));
    };

    const closeDetail = () => {
      cDetail.classList.remove('is-open');
      cDetail.setAttribute('aria-hidden', 'true');
      cGrid.querySelectorAll('.catalog-card.is-selected').forEach((c) => c.classList.remove('is-selected'));
      setTimeout(() => { if (!cDetail.classList.contains('is-open')) cDetail.hidden = true; }, 360);
    };

    const loadCatalog = async () => {
      if (catalogLoaded) return;
      catalogLoaded = true;
      const apply = (data) => {
        CATALOG = (data && data.items) || [];
        buildFilters();
        cLoading.hidden = true;
        render();
      };
      // Данные подключаем тегом <script> (data/oils.js → window.__SPOT_OILS__),
      // чтобы каталог работал и при открытии index.html напрямую по file://,
      // где fetch() локального JSON блокируется браузером.
      if (window.__SPOT_OILS__) { apply(window.__SPOT_OILS__); return; }
      const script = document.createElement('script');
      script.src = 'data/oils.js';
      script.onload = () => {
        if (window.__SPOT_OILS__) apply(window.__SPOT_OILS__);
        else { catalogLoaded = false; cLoading.textContent = 'Не удалось загрузить каталог. Попробуйте обновить страницу.'; }
      };
      script.onerror = () => {
        catalogLoaded = false;
        cLoading.textContent = 'Не удалось загрузить каталог. Попробуйте обновить страницу.';
      };
      document.head.appendChild(script);
    };

    const openCatalog = () => {
      // мгновенно прячем боковую панель товара (без анимации) при открытии
      cDetail.classList.remove('is-open');
      cDetail.hidden = true;
      cDetail.setAttribute('aria-hidden', 'true');
      openModalEl(catalogModal);
      loadCatalog();
      setTimeout(() => cSearch && cSearch.focus(), 80);
    };
    const closeCatalog = () => {
      closeModalEl(catalogModal);
      cFilters.classList.remove('is-open');
      if (cFiltersToggle) cFiltersToggle.setAttribute('aria-expanded', 'false');
    };

    // debounce поиска
    let searchTimer = null;
    cSearch.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(render, 120);
    });
    cSort.addEventListener('change', render);

    // фильтры-чипсы
    cFilters.addEventListener('click', (e) => {
      const chip = e.target.closest('.catalog-chip');
      if (!chip) return;
      const { key, val } = chip.dataset;
      if (active[key].has(val)) { active[key].delete(val); chip.classList.remove('is-active'); }
      else { active[key].add(val); chip.classList.add('is-active'); }
      render();
    });

    // мини-поиск по чипсам допусков (просто прячет нерелевантные чипсы)
    if (cApprovalsSearch) {
      cApprovalsSearch.addEventListener('input', () => {
        const q = norm(cApprovalsSearch.value);
        catalogModal.querySelectorAll('[data-chips="approvals"] .catalog-chip').forEach((c) => {
          c.classList.toggle('is-hidden', q && !norm(c.dataset.val).includes(q));
        });
      });
    }

    cReset.addEventListener('click', () => {
      ALL_KEYS.forEach((k) => active[k].clear());
      catalogModal.querySelectorAll('.catalog-chip.is-active').forEach((c) => c.classList.remove('is-active'));
      cSearch.value = '';
      if (cApprovalsSearch) {
        cApprovalsSearch.value = '';
        catalogModal.querySelectorAll('.catalog-chip.is-hidden').forEach((c) => c.classList.remove('is-hidden'));
      }
      render();
    });

    if (cFiltersToggle) {
      cFiltersToggle.addEventListener('click', () => {
        const open = cFilters.classList.toggle('is-open');
        cFiltersToggle.setAttribute('aria-expanded', String(open));
      });
    }

    // клик по карточке → деталь
    const selectCard = (card) => {
      const item = shown[+card.dataset.idx];
      if (!item) return;
      cGrid.querySelectorAll('.catalog-card.is-selected').forEach((c) => c.classList.remove('is-selected'));
      card.classList.add('is-selected');
      openDetail(item);
    };
    cGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.catalog-card');
      if (card) selectCard(card);
    });
    cGrid.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.catalog-card');
      if (!card) return;
      e.preventDefault();
      selectCard(card);
    });
    cDetailClose.addEventListener('click', closeDetail);

    // открытие / закрытие
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-open-catalog]')) {
        e.preventDefault();
        openCatalog();
      } else if (e.target.closest('[data-close-catalog]')) {
        closeCatalog();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !catalogModal.classList.contains('is-open')) return;
      if (!cDetail.hidden) closeDetail();
      else closeCatalog();
    });
  }

  /* ---------- Info modal (promo/warranty/photos/franchise/work) ---------- */
  const infoModal = document.getElementById('infoModal');
  const infoBody = document.getElementById('infoModalBody');

  const PHOTOS = [
    { src: 'photos/Engine oil change.jpg',                  caption: 'Замена моторного масла' },
    { src: 'photos/Gearbox oil change.jpg',                 caption: 'Замена масла в АКПП и МКПП' },
    { src: 'photos/Air and cabin filter replacement.jpg',   caption: 'Замена фильтров' },
    { src: 'photos/Air conditioning refill.jpg',            caption: 'Заправка кондиционера' },
    { src: 'photos/oil change in the axles.jpg',            caption: 'Замена масла в редукторах' },
    { src: 'photos/hero.jpg',                               caption: 'Зона выдачи и приёма' }
  ];

  const phoneRow = `
    <div class="info-cta">
      <button type="button" class="btn btn-primary" data-open-booking>Записаться</button>
      <a href="tel:+78126034480" class="btn btn-outline js-phone-link"><span class="js-phone">+7 (812) 603-44-80</span></a>
    </div>`;

  const INFO = {
    filters: () => `
      <div class="info-eyebrow">Акция «1 + 1»</div>
      <h3>−20% на воздушные и салонные фильтры</h3>
      <p>Скидка 20% на воздушный и салонный фильтры при покупке моторного масла в СТО SPOT.</p>
      <ul class="info-bullets">
        <li>Действует во всех СТО SPOT и SPOT Express.</li>
        <li>Скидка считается от розничной цены.</li>
        <li>Не суммируется с другими акциями.</li>
        <li>Замена фильтра при замене масла — за 10 минут.</li>
      </ul>
      ${phoneRow}`,
    happy: () => `
      <div class="info-eyebrow">Happy Hours</div>
      <h3>−10% на все услуги с 9:00 до 11:00</h3>
      <p>Заезжайте утром — мы вернём 10% от стоимости работ и материалов прямо в чек, без купонов и регистрации.</p>
      <ul class="info-bullets">
        <li>Время определяется временем заезда на пост.</li>
        <li>Действует ежедневно, в т. ч. в выходные и праздники.</li>
        <li>Не суммируется со скидкой в день рождения.</li>
        <li>Можно записаться заранее или приехать без записи.</li>
      </ul>
      ${phoneRow}`,
    cashback: () => `
      <div class="info-eyebrow">Программа лояльности</div>
      <h3>10% кешбэк за своевременную замену масла</h3>
      <p>Приехали на следующую замену в рекомендованный интервал — возвращаем 10% от чека бонусами на ваш счёт.</p>
      <ul class="info-bullets">
        <li>1 бонус = 1 рубль.</li>
        <li>Срок действия бонусов — 12 месяцев.</li>
        <li>Бонусы начисляются после визита в течение суток.</li>
        <li>Можно оплатить до 100% следующего визита.</li>
      </ul>
      ${phoneRow}`,
    birthday: () => `
      <div class="info-eyebrow">Подарок ко дню рождения</div>
      <h3>−10% в день рождения и три дня вокруг</h3>
      <p>Дарим скидку 10% на все услуги в день рождения, а также за 3 дня до и 3 дня после.</p>
      <ul class="info-bullets">
        <li>Покажите паспорт или водительское удостоверение.</li>
        <li>Действует на одного человека и один автомобиль.</li>
        <li>Не суммируется с Happy Hours.</li>
        <li>Действует во всех СТО SPOT.</li>
      </ul>
      ${phoneRow}`,
    bonuses: () => `
      <div class="info-eyebrow">Программа лояльности</div>
      <h3>Оплата бонусами до 100%</h3>
      <p>Накопленные бонусы можно потратить на следующие визиты — частично или полностью.</p>
      <ul class="info-bullets">
        <li>1 бонус = 1 рубль.</li>
        <li>Накопленные бонусы суммируются с другими акциями.</li>
        <li>Управляйте бонусами в личном кабинете или у мастера.</li>
        <li>Вступление в программу — автоматически при первом визите.</li>
      </ul>
      ${phoneRow}`,
    warranty: () => `
      <div class="info-eyebrow">Гарантии</div>
      <h3>Гарантия на работы и материалы</h3>
      <p>Гарантия — это показатель нашей работы. Все масла и фильтры имеют сертификаты соответствия, оригинал доступен в любом СТО или по запросу.</p>
      <ul class="info-bullets">
        <li>Сертификаты на моторные, трансмиссионные масла, присадки и очистители.</li>
        <li>Сертификаты на воздушные, салонные, масляные и топливные фильтры.</li>
        <li>Гарантия на работы — до следующей замены масла.</li>
        <li>Чек и акт выполненных работ выдаём при каждом визите.</li>
      </ul>
      <div class="info-stats">
        <div class="info-stats-item"><strong>13 лет</strong><span>на рынке</span></div>
        <div class="info-stats-item"><strong>896 000+</strong><span>замен масла</span></div>
        <div class="info-stats-item"><strong>28+</strong><span>станций в СПб</span></div>
        <div class="info-stats-item"><strong>4.8 / 5</strong><span>средняя оценка</span></div>
      </div>
      ${phoneRow}`,
    photos: () => `
      <div class="info-eyebrow">Галерея</div>
      <h3>Как проходит работа в СТО SPOT</h3>
      <p>Реальные фотографии станций, постов, оборудования и моментов работы. Нажмите на любое фото — откроется в крупном размере.</p>
      <div class="info-gallery">
        ${PHOTOS.map((p, i) => `
          <button type="button" data-lightbox="${i}" aria-label="${p.caption}">
            <img src="${p.src}" alt="${p.caption}" loading="lazy" />
          </button>
        `).join('')}
      </div>
      <p class="muted small">Хотите посмотреть конкретную станцию вживую — приходите без записи: достаточно прозвонить и удостовериться в свободном посту.</p>`,
    franchise: () => `
      <div class="info-eyebrow">Франшиза</div>
      <h3>Откройте свой СТО SPOT</h3>
      <p>Сеть из 35+ станций в России. Помогаем партнёрам с подбором помещения, обучением, поставками масел и маркетингом.</p>
      <ul class="info-bullets">
        <li>Готовая бизнес-модель и проверенные техпроцессы.</li>
        <li>Обучение мастеров и администраторов в учебном центре.</li>
        <li>Закупочные цены на масла и расходники сети SPOT.</li>
        <li>Запуск под ключ — от 90 дней.</li>
      </ul>
      <div class="info-stats">
        <div class="info-stats-item"><strong>от 90 дн.</strong><span>срок запуска</span></div>
        <div class="info-stats-item"><strong>35+</strong><span>станций сети</span></div>
        <div class="info-stats-item"><strong>10+</strong><span>городов России</span></div>
        <div class="info-stats-item"><strong>200+</strong><span>обученных мастеров</span></div>
      </div>
      <div class="info-cta">
        <a href="tel:+78126034480" class="btn btn-primary js-phone-link"><span class="js-phone">+7 (812) 603-44-80</span></a>
        <button type="button" class="btn btn-outline" data-open-booking>Оставить заявку</button>
      </div>`,
    work: () => `
      <div class="info-eyebrow">Работа в SPOT</div>
      <h3>Команда из 200+ специалистов</h3>
      <p>Ищем мастеров по замене масла, администраторов и менеджеров клиентского сервиса. Стабильная нагрузка, обучение, рост по сетке.</p>
      <ul class="info-bullets">
        <li>Белая зарплата и оформление по ТК РФ.</li>
        <li>Обучение в собственном учебном центре.</li>
        <li>Гибкие графики: 2/2, 5/2, сменные.</li>
        <li>Карьерный рост: мастер → старший мастер → управляющий.</li>
      </ul>
      <div class="info-cta">
        <a href="tel:+78126034480" class="btn btn-primary js-phone-link"><span class="js-phone">+7 (812) 603-44-80</span></a>
        <button type="button" class="btn btn-outline" data-open-booking>Оставить контакты</button>
      </div>`
  };

  const openInfo = (key) => {
    if (!infoModal || !infoBody || !INFO[key]) return;
    infoBody.innerHTML = INFO[key]();
    // re-apply current city to fresh phones
    const c = CITIES[savedId];
    if (c) {
      infoBody.querySelectorAll('.js-phone').forEach(el => el.textContent = c.phone);
      infoBody.querySelectorAll('.js-phone-link').forEach(el => el.setAttribute('href', 'tel:' + c.tel));
    }
    openModalEl(infoModal);
    infoBody.scrollTop = 0;
  };
  const closeInfo = () => closeModalEl(infoModal);

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open-info]');
    if (opener) {
      e.preventDefault();
      openInfo(opener.dataset.openInfo);
      return;
    }
    if (e.target.closest('[data-close-info]')) {
      closeInfo();
      return;
    }
  });

  /* Promo cards open the info modal */
  document.querySelectorAll('.promo-card[data-promo]').forEach(card => {
    card.addEventListener('click', () => openInfo(card.dataset.promo));
  });

  /* ---------- Booking modal ---------- */
  const bookModal = document.getElementById('bookModal');
  const bookForm = document.getElementById('bookForm');
  const bookStation = document.getElementById('bookStation');

  const buildStationOptions = () => {
    if (!bookStation) return;
    const groups = {};
    CITIES.forEach(c => {
      const key = c.city === 'Санкт-Петербург' ? 'Санкт-Петербург (любая станция)' : c.city;
      (groups[key] ||= []).push(c);
    });
    bookStation.innerHTML = Object.entries(groups).map(([cityKey, list]) => {
      if (list.length === 1) {
        const c = list[0];
        const label = c.city === 'Санкт-Петербург'
          ? cityKey
          : `${c.city} — ${c.address}`;
        return `<option value="${c.id}">${label}</option>`;
      }
      return `<optgroup label="${cityKey}">${list.map(c => `<option value="${c.id}">${c.address}</option>`).join('')}</optgroup>`;
    }).join('');
    bookStation.value = String(savedId);
  };
  buildStationOptions();

  const openBooking = () => {
    if (!bookModal) return;
    if (bookStation) bookStation.value = String(savedId);
    // reset to form step
    bookModal.querySelectorAll('[data-step]').forEach(s => {
      s.hidden = s.dataset.step !== 'form';
    });
    if (bookForm) bookForm.reset();
    if (bookStation) bookStation.value = String(savedId);
    openModalEl(bookModal);
  };
  const closeBooking = () => closeModalEl(bookModal);

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-open-booking]')) {
      e.preventDefault();
      openBooking();
    } else if (e.target.closest('[data-close-book]')) {
      closeBooking();
    }
  });

  if (bookForm) {
    bookForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(bookForm);
      if (!data.get('name') || !data.get('phone')) {
        bookForm.querySelector('input[name="name"]').focus();
        return;
      }
      // No backend yet — show confirmation step.
      bookModal.querySelectorAll('[data-step]').forEach(s => {
        s.hidden = s.dataset.step !== 'done';
      });
    });
  }

  /* ---------- History modal ---------- */
  const historyModal = document.getElementById('historyModal');
  const historyForm = document.getElementById('historyForm');
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-open-history]')) {
      e.preventDefault();
      openModalEl(historyModal);
    } else if (e.target.closest('[data-close-history]')) {
      closeModalEl(historyModal);
    }
  });
  if (historyForm) {
    historyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const phone = historyForm.querySelector('input[name="phone"]').value.trim();
      if (!phone) return;
      historyForm.innerHTML = `
        <div class="book-done">
          <div class="book-done-ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 10 18 20 6"/></svg>
          </div>
          <h4>SMS отправлено</h4>
          <p>Мы выслали историю обслуживания на номер <strong>${phone}</strong>. Если SMS не пришла в течение 5 минут — позвоните нам.</p>
        </div>`;
    });
  }

  /* ---------- Oil picker modal ---------- */
  const oilModal = document.getElementById('oilModal');
  const oilForm = document.getElementById('oilForm');
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-open-oilpicker]')) {
      e.preventDefault();
      openModalEl(oilModal);
    } else if (e.target.closest('[data-close-oil]')) {
      closeModalEl(oilModal);
    }
  });
  if (oilForm) {
    oilForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(oilForm);
      if (!data.get('phone')) return;
      oilForm.innerHTML = `
        <div class="book-done">
          <div class="book-done-ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 10 18 20 6"/></svg>
          </div>
          <h4>Заявка принята</h4>
          <p>Мастер подберёт масло по вашей машине и перезвонит на указанный номер в ближайший час.</p>
          <button type="button" class="btn btn-outline" data-close-oil>Закрыть</button>
        </div>`;
    });
  }

  /* ---------- Lightbox ---------- */
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  let lbIndex = 0;
  const showLightbox = (i) => {
    if (!lightbox || !lightboxImg) return;
    lbIndex = ((i % PHOTOS.length) + PHOTOS.length) % PHOTOS.length;
    lightboxImg.src = PHOTOS[lbIndex].src;
    lightboxImg.alt = PHOTOS[lbIndex].caption || '';
    openModalEl(lightbox);
  };
  document.addEventListener('click', (e) => {
    const lb = e.target.closest('[data-lightbox]');
    if (lb) {
      e.preventDefault();
      showLightbox(parseInt(lb.dataset.lightbox, 10) || 0);
      return;
    }
    if (e.target.closest('[data-close-lightbox]')) { closeModalEl(lightbox); return; }
    if (e.target.closest('[data-lb-prev]')) { showLightbox(lbIndex - 1); return; }
    if (e.target.closest('[data-lb-next]')) { showLightbox(lbIndex + 1); return; }
  });

  /* ---------- Reviews deck ---------- */
  const reviewsDeck = document.querySelector('.reviews-deck');
  if (reviewsDeck) {
    const cards = Array.from(reviewsDeck.querySelectorAll('.review'));
    const counter = document.getElementById('revCounter');
    const n = cards.length;
    let current = 0;
    let busy = false;

    function applyDeck() {
      cards.forEach(c => c.classList.remove('is-active', 'is-deck-2', 'is-deck-3'));
      cards[current].classList.add('is-active');
      cards[(current + 1) % n].classList.add('is-deck-2');
      cards[(current + 2) % n].classList.add('is-deck-3');
      if (counter) counter.textContent = `${current + 1} / ${n}`;
    }

    applyDeck();

    document.querySelectorAll('[data-rev]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (busy) return;
        busy = true;
        const dir = btn.dataset.rev === 'next' ? 1 : -1;
        const outgoing = cards[current];
        outgoing.classList.add(dir > 0 ? 'exit-left' : 'exit-right');
        current = ((current + dir) % n + n) % n;
        applyDeck();
        setTimeout(() => {
          outgoing.classList.remove('exit-left', 'exit-right');
          busy = false;
        }, 480);
      });
    });
  }

  /* ---------- Map modal ---------- */
  const mapModal = document.getElementById('mapModal');
  const mapStationListEl = document.getElementById('mapStationList');
  let leafletMap = null;
  let mapReady = false;
  const stationMarkers = new Map(); // box → { marker, color }

  const renderMapList = () => {
    if (!mapStationListEl) return;
    const byLine = {};
    SPB_STATIONS.forEach(s => { (byLine[s.line] ||= []).push(s); });
    mapStationListEl.innerHTML = Object.keys(byLine).sort((a, b) => a - b).map(line => {
      const color = LINE_COLORS[line] || '#999';
      const name = LINE_NAMES[line] || 'Линия ' + line;
      return `<div class="map-line-group">
        <div class="map-line-head">
          <span class="map-line-badge" style="background:${color}">Л${line}</span>
          <span>${name}</span>
        </div>
        <ul class="map-stn-list">
          ${byLine[line].map(s => {
            const src = stationImgSrc(s);
            const emps = getEmployees(s.short);
            const teamRow = emps.length
              ? `<div class="map-stn-team">
                  ${emps.slice(0, 3).map(e => `<img class="map-stn-avatar" src="${e.photo}" alt="${e.name}" title="${e.name}" loading="lazy" onerror="this.style.display='none'">`).join('')}
                  <span>${emps.map(e => e.name).join(', ')}</span>
                </div>`
              : '';
            return `<li data-box="${s.box}">
              <div class="map-stn-thumb" style="--c:${color}">
                ${src ? `<img src="${src}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}
              </div>
              <div class="map-stn-info">
                <strong>${s.short}</strong>
                <span>м. ${s.station}</span>
                ${s.layout ? `<span class="map-stn-detail">${s.layout}${s.height ? ' · ' + s.height : ''}</span>` : ''}
                ${teamRow}
              </div>
            </li>`;
          }).join('')}
        </ul>
      </div>`;
    }).join('');
  };

  const setSidebarActive = (box, on) => {
    if (!mapStationListEl) return;
    const li = mapStationListEl.querySelector(`[data-box="${box}"]`);
    if (!li) return;
    li.classList.toggle('is-active', on);
    if (on) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  const setMarkerActive = (box, on) => {
    const entry = stationMarkers.get(box);
    if (!entry) return;
    const el = entry.marker.getElement();
    if (el) el.classList.toggle('spot-pin-active', on);
  };

  const createPinIcon = (color) => L.divIcon({
    className: 'spot-pin',
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="24" height="32"><path d="M12 0C5.373 0 0 5.373 0 12c0 8.5 12 20 12 20S24 20.5 24 12C24 5.373 18.627 0 12 0z" fill="${color}" stroke="#fff" stroke-width="1.5"/><circle cx="12" cy="12" r="5" fill="#fff" fill-opacity="0.9"/></svg>`,
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -34]
  });

  const initMap = () => {
    const mapEl = document.getElementById('spotMap');
    if (!mapEl || typeof L === 'undefined') return;
    if (mapReady) { leafletMap && leafletMap.invalidateSize(); return; }
    leafletMap = L.map('spotMap', { zoomControl: true, attributionControl: false }).setView([59.940, 30.315], 11);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '', subdomains: 'abcd', maxZoom: 19
    }).addTo(leafletMap);
    SPB_STATIONS.forEach(s => {
      if (!s.lat) return;
      const color = LINE_COLORS[s.line] || '#999';
      const marker = L.marker([s.lat, s.lng], { icon: createPinIcon(color) })
        .bindPopup(
          (() => {
            const popupEmps = getEmployees(s.short);
            const teamBlock = popupEmps.length
              ? `<div class="spp-team">
                  <div class="spp-team-avatars">${popupEmps.slice(0, 4).map(e => `<img class="spp-avatar" src="${e.photo}" alt="${e.name}" title="${e.name}" loading="lazy" onerror="this.style.display='none'">`).join('')}</div>
                  <div class="spp-team-names">${popupEmps.map(e => e.name).join(' · ')}</div>
                </div>`
              : '';
            return `<div class="spp">
              ${stationImgSrc(s) ? `<div class="spp-photo"><img src="${stationImgSrc(s)}" alt="" loading="lazy" onerror="this.parentElement.style.display='none'"></div>` : ''}
              <div class="spp-addr">${s.short}</div>
              <div class="spp-metro"><span class="spp-dot" style="background:${color}"></span>м. ${s.station}</div>
              ${s.layout ? `<div class="spp-detail">${s.layout} · ${s.height}</div>` : ''}
              ${s.note ? `<div class="spp-note">${s.note}</div>` : ''}
              ${teamBlock}
              <a href="https://yandex.ru/maps/?rtext=~${s.lat},${s.lng}&rtt=auto" target="_blank" rel="noopener" class="spp-btn">Маршрут</a>
            </div>`;
          })(),
          { maxWidth: 220, className: 'spot-popup-wrap' }
        ).addTo(leafletMap);
      stationMarkers.set(s.box, { marker, color });
      marker.on('mouseover', () => { setMarkerActive(s.box, true);  setSidebarActive(s.box, true); });
      marker.on('mouseout',  () => { setMarkerActive(s.box, false); setSidebarActive(s.box, false); });
    });
    mapReady = true;
  };

  const openMapModal = () => {
    if (!mapModal) return;
    renderMapList();
    openModalEl(mapModal);
    setTimeout(() => {
      initMap();
      if (mapReady && leafletMap) leafletMap.invalidateSize();
    }, 120);
  };

  window.addEventListener('resize', () => {
    if (mapReady && leafletMap && mapModal && mapModal.classList.contains('is-open')) {
      leafletMap.invalidateSize();
    }
  });
  const closeMapModal = () => closeModalEl(mapModal);

  if (mapStationListEl) {
    mapStationListEl.addEventListener('mouseover', (e) => {
      const li = e.target.closest('[data-box]');
      if (li) { setMarkerActive(li.dataset.box, true);  li.classList.add('is-active'); }
    });
    mapStationListEl.addEventListener('mouseout', (e) => {
      const li = e.target.closest('[data-box]');
      if (li) { setMarkerActive(li.dataset.box, false); li.classList.remove('is-active'); }
    });
    mapStationListEl.addEventListener('click', (e) => {
      const li = e.target.closest('[data-box]');
      if (!li) return;
      const entry = stationMarkers.get(li.dataset.box);
      if (entry && leafletMap) {
        leafletMap.setView(entry.marker.getLatLng(), 14, { animate: true });
        entry.marker.openPopup();
      }
    });
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-open-map]')) { e.preventDefault(); openMapModal(); return; }
    if (e.target.closest('[data-close-map]')) { closeMapModal(); return; }
    if (e.target.closest('[data-map-to-booking]')) { closeMapModal(); openBooking(); return; }
  });

  /* ---------- Global Esc closes any open modal ---------- */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.is-open').forEach(closeModalEl);
  });
})();
