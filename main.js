/* СТО SPOT — interactivity (parallax, horizontal scroll, counters, reveal) */
(() => {
  const isMobile = () => window.matchMedia('(max-width: 760px)').matches;

  /* ---------- Header on scroll ---------- */
  const header = document.getElementById('header');
  const onScrollHeader = () => header.classList.toggle('scrolled', window.scrollY > 20);
  window.addEventListener('scroll', onScrollHeader, { passive: true });
  onScrollHeader();

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

  /* ---------- Counter animation ---------- */
  const counters = document.querySelectorAll('[data-count]');
  const animateCounter = (el) => {
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
  counters.forEach(c => counterObs.observe(c));

  /* ---------- Reveal on scroll ---------- */
  const reveals = document.querySelectorAll('h2, .step, .promo-card, .station-list li, .hpanel-card');
  reveals.forEach(el => el.classList.add('reveal'));
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        revealObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  reveals.forEach(el => revealObs.observe(el));

  /* ---------- Smooth-scroll polish for in-page links ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length > 1) {
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' });
        }
      }
    });
  });

  /* ---------- Mobile burger (toggle CTAs visibility) ---------- */
  const burger = document.getElementById('burger');
  if (burger) {
    burger.addEventListener('click', () => {
      const cta = document.querySelector('.cta-group');
      if (cta) cta.style.display = cta.style.display === 'flex' ? '' : 'flex';
    });
  }
})();
