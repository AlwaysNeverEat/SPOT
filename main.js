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

  /* ---------- Services indicator (native scroll-snap inside .services-scroll) ---------- */
  const servicesScroll = document.getElementById('servicesScroll');
  const slides = servicesScroll ? servicesScroll.querySelectorAll('.slide') : [];
  const indicators = document.querySelectorAll('.indicator .indicator-index');
  if (servicesScroll && slides.length && indicators.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const i = entry.target.dataset.index;
        if (indicators[i]) indicators[i].classList.toggle('expand', entry.isIntersecting);
      });
    }, { root: servicesScroll, threshold: 0.5 });
    slides.forEach((s) => io.observe(s));
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
  const reveals = document.querySelectorAll('h2, .step, .promo-card, .station-list li');
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
          if (id === '#services' && servicesScroll) servicesScroll.scrollTop = 0;
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

  /* SPb keeps a curated list of district stations (network total = 23). */
  const SPB_STATIONS = [
    { addr: 'ул. Фучика, 23А',         area: 'Фрунзенский район' },
    { addr: 'ул. Фучика, 14к4',        area: 'Фрунзенский район' },
    { addr: 'ул. Оптиков, 2',          area: 'Приморский район' },
    { addr: 'пр. Солидарности, 22А',   area: 'Невский район' },
    { addr: 'Выборгское ш., 2',        area: 'Выборгский район' },
    { addr: 'ул. Казакова, 29',        area: 'Кировский район' },
    { addr: 'Полюстровский пр., 59к1', area: 'Калининский район' },
    { addr: 'пос. Мурино / Кудрово',   area: 'Лен. область' }
  ];
  const SPB_TOTAL_COUNT = 23;

  const stationsForCity = (cityName) => {
    if (cityName === 'Санкт-Петербург') {
      return SPB_STATIONS.map(s => ({ ...s, label: s.addr, sub: s.area }));
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
  const cityNameEls = [document.getElementById('cityName'), document.getElementById('cityNameFooter')].filter(Boolean);
  const phoneTextEls = () => document.querySelectorAll('.js-phone');
  const phoneLinkEls = () => document.querySelectorAll('.js-phone-link');
  const cityLocEls = () => document.querySelectorAll('.js-city-loc');
  const cityLocPrefixedEls = () => document.querySelectorAll('.js-city-loc-prefixed');
  const stationListEl = document.getElementById('stationList');
  const stationsCountEl = document.getElementById('stationsCount');
  const stationsWordEl = document.getElementById('stationsWord');
  const statStationCountEl = document.getElementById('statStationCount');
  const stationsCopyEl = document.getElementById('stationsCopy');

  const renderStations = (cityName) => {
    if (!stationListEl) return;
    const list = stationsForCity(cityName);
    if (!list.length) {
      stationListEl.innerHTML = `<li><strong>Станций пока нет</strong><span>Свяжитесь с нами по телефону</span></li>`;
      return;
    }
    stationListEl.innerHTML = list.map(s => `
      <li><strong>${s.label}</strong><span>${s.sub || ''}</span></li>
    `).join('');
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
        : `Сеть СТО SPOT: 23 станции в Санкт-Петербурге и филиалы в более чем 20 городах России.`;
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
        <div class="info-stats-item"><strong>23</strong><span>станции в СПб</span></div>
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

  /* ---------- Reviews carousel arrows ---------- */
  const reviewsTrack = document.getElementById('reviewsTrack');
  if (reviewsTrack) {
    document.querySelectorAll('[data-rev]').forEach(btn => {
      btn.addEventListener('click', () => {
        const dir = btn.dataset.rev === 'next' ? 1 : -1;
        const card = reviewsTrack.querySelector('.review');
        const step = card ? card.offsetWidth + 16 : 320;
        reviewsTrack.scrollBy({ left: dir * step, behavior: 'smooth' });
      });
    });
  }

  /* ---------- Global Esc closes any open modal ---------- */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.is-open').forEach(closeModalEl);
  });
})();
