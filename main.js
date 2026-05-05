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

  /* ---------- City picker ---------- */
  const CITIES = [
    { city: 'Санкт-Петербург',  address: '23 станции по городу',                              phone: '+7 (812) 603-44-80' },
    { city: 'Янино',            address: 'Шоссейная ул., 36',                                  phone: '+7 (812) 987-77-27' },
    { city: 'Шушары',           address: 'Вишерская, 11',                                      phone: '+7 (812) 988-21-66' },
    { city: 'Гатчина',          address: 'Ленинградское ш., 10',                               phone: '+7 (812) 317-15-16' },
    { city: 'Кировск',          address: 'Магистральная, 46',                                  phone: '+7 (812) 999-92-26' },
    { city: 'Тосно',            address: 'Московское ш., 33 лит А',                            phone: '+7 (812) 317-15-16' },
    { city: 'Кронштадт',        address: 'Зосимова, 1 лит Б',                                  phone: '+7 (812) 425-35-39' },
    { city: 'Ленсоветский',     address: 'Московское ш., 250 лит Б',                           phone: '+7 (812) 987-90-40' },
    { city: 'Горелово',         address: 'Красносельское ш., 43 лит А',                        phone: '+7 (812) 987-28-28' },
    { city: 'Песочный',         address: 'Ленинградская, 99 лит Д',                            phone: '+7 (812) 407-21-40' },
    { city: 'Агалатово',        address: 'Приозерское ш., уч. 31 лит А',                       phone: '+7 (812) 926-10-10' },
    { city: 'Новое Девяткино',  address: 'д. 118',                                             phone: '+7 (812) 385-57-01' },
    { city: 'пос. Тельмана',    address: 'ул. Тельмана, 2 лит В',                              phone: '+7 (812) 988-81-66' },
    { city: 'Всеволожск',       address: 'дер. Кальтино, Песочная, 30',                        phone: '+7 (812) 987-99-33' },
    { city: 'Новосаратовка',    address: 'д. 267 лит А',                                       phone: '+7 (921) 344-44-80' },
    { city: 'Разметелево',      address: 'Строителей, 2/3 лит Б',                              phone: '+7 (911) 242-80-98' },
    { city: 'Ломоносов',        address: 'Михайловская, 40/7',                                 phone: '+7 (930) 035-33-50' },
    { city: 'Сосновый Бор',     address: 'Ак. Александрова, 2',                                phone: '+7 (911) 922-17-77' },
    { city: 'Кингисепп',        address: 'Карла Маркса, 42',                                   phone: '+7 (981) 810-22-44' },
    { city: 'Выборг',           address: 'Железнодорожный тупик, 4',                           phone: '+7 (911) 980-37-77' },
    { city: 'Кириши',           address: 'Героев, 33',                                         phone: '+7 (911) 949-27-77' },
    { city: 'Красное Село',     address: 'Пушкинское ш., 1Б',                                  phone: '+7 (993) 981-21-21' },
    { city: 'Великий Новгород', address: 'Псковская, 33 (Лента)',                              phone: '+7 (911) 099-37-77' },
    { city: 'Псков',            address: 'Рижский пр-т, 96 лит Б',                             phone: '+7 (911) 902-17-77' },
    { city: 'Петрозаводск',     address: 'Шотмана, 25 лит Б',                                  phone: '+7 (814) 244-55-33' },
    { city: 'Рязань',           address: 'пр-д Шабулина, 31',                                  phone: '+7 (814) 244-55-33' },
    { city: 'Рязань',           address: 'ул. Военных автомобилистов, 11',                     phone: '+7 (900) 603-33-22' },
    { city: 'Рязань',           address: 'ул. Зубковой, 10 (р-н Песочня)',                     phone: '+7 (900) 603-44-33' },
    { city: 'Саратов',          address: 'Максима Горького, 81/1',                             phone: '+7 (845) 260-41-14' },
    { city: 'Ростов-на-Дону',   address: 'Таганрогская, 181/1',                                phone: '+7 (863) 333-26-99' },
    { city: 'Ростов-на-Дону',   address: 'Портовая, 251',                                      phone: '+7 (863) 333-24-88' },
    { city: 'Киров',            address: 'Нововятский р-н, Советская, 14',                     phone: '+7 (964) 250-69-00' },
    { city: 'Братск',           address: 'Иркутская обл., ул. Мира, 65/9',                     phone: '+7 (991) 434-22-10' },
    { city: 'Братск',           address: 'жилой район Энергетик, ул. Наймушина',               phone: '+7 (991) 435-10-22' },
    { city: 'Усть-Кут',         address: 'ул. Кирова, уч. №65Е',                               phone: '+7 (991) 542-42-42' },
    { city: 'Химки',            address: 'Новосходненское ш., квартал Филино, 143',            phone: '+7 (495) 215-17-16' }
  ];
  CITIES.forEach((c, i) => { c.id = i; c.tel = '+' + c.phone.replace(/\D/g, ''); });

  const STORAGE_KEY = 'spot:selectedCity';
  const cityNameEls = [document.getElementById('cityName'), document.getElementById('cityNameFooter')].filter(Boolean);
  const phoneTextEls = () => document.querySelectorAll('.js-phone');
  const phoneLinkEls = () => document.querySelectorAll('.js-phone-link');

  const applyCity = (c) => {
    cityNameEls.forEach(el => el.textContent = c.city);
    phoneTextEls().forEach(el => el.textContent = c.phone);
    phoneLinkEls().forEach(el => el.setAttribute('href', 'tel:' + c.tel));
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
})();
