# SPOT — заметки для Claude

Статический лендинг СТО SPOT (Питер). **Чистый HTML/CSS/JS, без сборки и фреймворков.**

## Структура
- `index.html` — вся разметка
- `styles.css` — все стили (один файл, есть `:root` токены: `--green #1f9d3f`, `--yellow #f5d22a`, `--ink`, `--bg` и т.д.)
- `main.js` — вся интерактивность (IIFE; parallax, счётчики, reveal заголовков, анимации)
- `scripts/` — ноды-утилиты (скрапер каталога, скриншоты)
- `data/`, `photos/`, `video/`, `cars-slider/` — ассеты и данные

## ⚠️ Визуальная проверка — ОБЯЗАТЕЛЬНО смотри свои скриншоты

В облачных/web-сессиях **браузера по умолчанию НЕТ**, поэтому скилл/команда
`design-reviewer` (через `mcp__playwright`) не запускается. Не гадай по картинкам
пользователя — рендерь сам через локальный Playwright:

```bash
# 1) поставить один раз на свежий контейнер (node_modules в .gitignore)
npm i -D playwright
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers npx playwright install chromium

# 2) поднять локальный сервер
(python3 -m http.server 8099 >/tmp/srv.log 2>&1 &)

# 3) сделать скриншот нужного места
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scripts/screenshot.mjs \
  --url http://localhost:8099/index.html \
  --selector ".brands h2" --center ".mark-circle" \
  --out /tmp/shot.png --wait 2200
```

Затем **`Read /tmp/shot.png`** — изображение видно прямо в чате. Так и проверяй,
а после визуальных правок переснимай. `--center <selector>` скроллит элемент в
центр экрана (нужно для анимаций на IntersectionObserver). Подробности флагов —
в шапке `scripts/screenshot.mjs`.

Сеть до npm в этих сессиях есть (проверено), Chromium качается с playwright CDN.

## Грабли проекта
- Глобальный ресет `img, svg { display: block; max-width: 100% }` (styles.css)
  **клампит ширину любых svg** до ширины контейнера. Если задаёшь svg ширину
  больше родителя — добавляй `max-width: none`, иначе «ширина не растёт».
- `main.js` переразбивает все `<h2>` посимвольно для reveal-анимации
  (`.line-wrap` > `.word` > `.char`). Если оборачиваешь слово в заголовке
  своим `<span class="...">`, класс сохраняется — это стабильный хук.
- **Секция `#how`** — скролл-скраб (700vh + sticky stage), таймлайн в `setupHowScrub()`
  (main.js). CSS-медиазапрос у `.how.is-scrub` и `SCRUB_ON` в JS должны совпадать
  дословно. Скриншоты битов таймлайна — флаг `--progress "#how:0.42"` у
  `scripts/screenshot.mjs`; URL открывать с хэшем `#how`, чтобы гейт-секции выше
  раскрылись по deep-link и не отщёлкивали скролл назад.
- **React-слайдер машин** (`cars-slider/`, Vite → `assets/cars-slider/spot-cars-slider.js`).
  Правишь `.tsx` → обязательно `cd cars-slider && npm run build` и подними `?v=N`
  у `<script>` в `index.html`, иначе изменений не видно. Autoplay паузится вне
  экрана (IntersectionObserver) и пока открыт оверлей сайта — он смотрит
  `body.menu-open` / `body{overflow:hidden}` через MutationObserver. Полоску
  прогресса двигаем DOM-ref'ом, НЕ через React-стейт — иначе ререндер 60fps
  забивал главный поток на телефоне и анимации меню/модалок дёргались.

## Гит
- Разработка на ветке `claude/epic-galileo-m12Ty`, пуш туда же. PR создаётся из UI.
- Не коммить `node_modules/`, `package-lock.json`, временные скрипты (в `.gitignore`).
- **Коммиты и PR — всегда на английском и максимально кратко** (одна строка,
  imperative: `Fix...`, `Add...`, `Pause...`). Без длинных русских описаний.
