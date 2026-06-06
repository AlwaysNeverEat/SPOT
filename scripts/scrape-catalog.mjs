#!/usr/bin/env node
/**
 * Скрапер каталога масел с оригинального сайта zamena-masla-spot.ru.
 *
 * Снимает данные моторных масел (MVP) в статический снапшот data/oils.json,
 * который наш лендинг читает на клиенте (живой fetch к оригиналу невозможен —
 * у него нет CORS-заголовков). Запуск: `node scripts/scrape-catalog.mjs`.
 *
 * Зависимостей нет: Node 18+ (встроенный fetch) + извлечение регэкспами.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ORIGIN = 'https://zamena-masla-spot.ru';
const CATEGORY = 'motornye';
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'oils.json');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const decode = (s) =>
  (s || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/\s+/g, ' ')
    .trim();

async function get(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ru' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(800 * (i + 1));
    }
  }
}

/** Сколько страниц в категории — по числам из ссылок пагинации `?page=N`. */
function lastPage(html) {
  const nums = [...html.matchAll(/[?&]page=(\d+)/g)].map((m) => +m[1]);
  return nums.length ? Math.max(...nums) : 1;
}

/** Карточки со страницы списка: slug, id, title, image. */
function parseList(html) {
  const items = [];
  const re = /<div class="card-item main-content__card-item">([\s\S]*?)<\/article>\s*<\/div>/g;
  let m;
  while ((m = re.exec(html))) {
    const block = m[1];
    const link = block.match(/card-item__content-link"\s+href="\/catalog\/product\/([^"]+)"/);
    const img = block.match(/card-item__img"\s+src="([^"]+)"/);
    const title = block.match(/card-item__title">([^<]+)</);
    const id = block.match(/data-id="(\d+)"/);
    if (!link) continue;
    items.push({
      slug: link[1],
      id: id ? id[1] : null,
      title: decode(title ? title[1] : ''),
      image: img ? (img[1].startsWith('http') ? img[1] : ORIGIN + img[1]) : '',
    });
  }
  return items;
}

/** Детальная страница товара: цена, цены по объёмам, короткое описание. */
function parseProduct(html) {
  const priceMain = html.match(/card-content__price">([^<]+)</);
  const prices = [...html.matchAll(/card-item__price">([^<]+)</g)].map((x) => decode(x[1]));
  const priceText = priceMain ? decode(priceMain[1]) : prices[0] || '';
  const priceNum = (priceText.match(/[\d\s]{2,}/) || [''])[0].replace(/\s/g, '');

  // Описание ищем только в зоне между заголовком товара и общим SEO-блоком
  // `info__title` — иначе цепляем навигацию/список городов/общий текст про масла.
  const start = html.indexOf('card-content__title');
  // Регион описания обрываем на первом из блоков, которые идут после товара:
  // общий SEO-текст, промо-карусель, мини-промо, список похожих товаров.
  const stops = ['class="info__title"', 'promo-carousel', 'mini-promo-title', 'card-item__title']
    .map((s) => html.indexOf(s, start))
    .filter((i) => i !== -1);
  const end = stops.length ? Math.min(...stops) : start + 6000;
  const region = start !== -1 ? html.slice(start, end) : '';
  const goodP = (chunk) =>
    [...chunk.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)]
      .map((x) => decode(x[1].replace(/<[^>]+>/g, '')))
      .find(
        (t) =>
          t.length > 50 &&
          !/cookie|санкт-петербург|выберите|розничной цены|спот express|spot express/i.test(t)
      ) || '';

  const productDesc = goodP(region);
  // Запасной вариант — первый абзац общего блока (чистый, но не уникальный).
  const generic = (html.match(/info__text--first[^>]*>([\s\S]*?)<\/p>/) || [, ''])[1];
  const description = productDesc || decode(generic.replace(/<[^>]+>/g, ''));

  // Постоянная картинка со страницы товара (в списке — временный /tmp_images,
  // который может быть очищен; /static/upload/catalog — постоянный).
  const imgMatch = html.match(/card-content__img[^>]*\ssrc="([^"]+)"/);
  const image = imgMatch ? (imgMatch[1].startsWith('http') ? imgMatch[1] : ORIGIN + imgMatch[1]) : '';

  return {
    priceText,
    price: priceNum ? +priceNum : null,
    prices: [...new Set(prices)],
    description,
    productDesc, // только продуктовый текст — для определения типа
    image,
  };
}

const BRANDS = [
  'ROLF', 'Gazpromneft', 'Газпромнефть', 'SPOT', 'ZIC', 'Mobil', 'Castrol', 'Lukoil', 'Лукойл',
  'Motul', 'Total', 'Shell', 'Liqui Moly', 'Liqui Moli', 'Mannol', 'Idemitsu', 'Eneos', 'Ravenol',
  'Elf', 'Kixx', 'Wolf', 'Comma', 'G-Energy', 'Роснефть', 'Rosneft', 'TNK', 'ТНК', 'Sintec',
  'Fanfaro', 'ZEPRO', 'Zepro', 'GM', 'Nissan', 'Toyota', 'Hyundai', 'Kia', 'Mazda', 'Honda',
  'Niagara', 'Лукойл',
];

function deriveBrand(title) {
  const t = title.toLowerCase();
  for (const b of BRANDS) if (t.includes(b.toLowerCase())) return b;
  return '';
}

function deriveViscosity(title) {
  const m = title.match(/(\d+)\s*[wW]\s*-?\s*(\d+)/);
  if (m) return `${m[1]}W-${m[2]}`;
  const m2 = title.match(/\b(\d+)\s*[wW]\b/);
  return m2 ? `${m2[1]}W` : '';
}

function deriveVolume(title) {
  const m = title.match(/(\d+(?:[.,]\d+)?)\s*[lLлЛ]\b/);
  return m ? `${m[1].replace(',', '.')} л` : '';
}

function deriveType(text) {
  const t = text.toLowerCase();
  if (/полусинтет/.test(t)) return 'Полусинтетическое';
  if (/синтет/.test(t)) return 'Синтетическое';
  if (/минерал/.test(t)) return 'Минеральное';
  return '';
}

async function main() {
  console.log(`Скрапинг категории /catalog/${CATEGORY} …`);
  const first = await get(`${ORIGIN}/catalog/${CATEGORY}`);
  const pages = lastPage(first);
  console.log(`Страниц: ${pages}`);

  const cards = [];
  for (let p = 1; p <= pages; p++) {
    const html = p === 1 ? first : await get(`${ORIGIN}/catalog/${CATEGORY}?page=${p}`);
    const list = parseList(html);
    console.log(`  стр. ${p}: ${list.length} карточек`);
    cards.push(...list);
    if (p < pages) await sleep(200);
  }

  // Дедуп по slug
  const bySlug = new Map();
  for (const c of cards) if (!bySlug.has(c.slug)) bySlug.set(c.slug, c);
  const unique = [...bySlug.values()];
  console.log(`Уникальных товаров: ${unique.length}. Тащу детали…`);

  const items = [];
  for (let i = 0; i < unique.length; i++) {
    const c = unique[i];
    let det = { priceText: '', price: null, prices: [], description: '', image: '' };
    try {
      det = parseProduct(await get(`${ORIGIN}/catalog/product/${c.slug}`));
    } catch (e) {
      console.warn(`  ! деталь ${c.slug}: ${e.message}`);
    }
    items.push({
      slug: c.slug,
      id: c.id,
      title: c.title,
      brand: deriveBrand(c.title),
      viscosity: deriveViscosity(c.title),
      volume: deriveVolume(c.title),
      type: deriveType(`${c.title} ${det.productDesc || ''}`),
      price: det.price,
      priceText: det.priceText,
      prices: det.prices,
      image: det.image || c.image,
      url: `${ORIGIN}/catalog/product/${c.slug}`,
      description: det.description,
    });
    process.stdout.write(`\r  детали: ${i + 1}/${unique.length}`);
    if (i < unique.length - 1) await sleep(220);
  }
  process.stdout.write('\n');

  const payload = {
    generatedAt: new Date().toISOString(),
    source: `${ORIGIN}/catalog/${CATEGORY}`,
    category: CATEGORY,
    count: items.length,
    items,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(payload, null, 2), 'utf8');
  // JS-обёртка: грузится через <script>, работает при открытии index.html по file://
  // (fetch JSON браузер блокирует на file://). Сайт читает window.__SPOT_OILS__.
  const OUT_JS = OUT.replace(/\.json$/, '.js');
  await writeFile(OUT_JS, `window.__SPOT_OILS__ = ${JSON.stringify(payload)};\n`, 'utf8');
  console.log(`Готово: ${items.length} товаров → ${OUT}`);
  console.log(`  + JS-обёртка → ${OUT_JS}`);
  const withPrice = items.filter((i) => i.price).length;
  const withVisc = items.filter((i) => i.viscosity).length;
  console.log(`  с ценой: ${withPrice}, с вязкостью: ${withVisc}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
