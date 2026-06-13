/* 3D phone for the #how scrub story (scenes «Записаться» / «Приехать» / «Кешбэк»).
 *
 * Renders assets/models/phone.glb (draco) into a transparent canvas that
 * setupHowScrub() (main.js) appends to the sticky stage and drives by scroll
 * progress. Render-on-demand only — no rAF loop of its own.
 *
 * The model ships from Sketchfab tilted; BASE_QUAT below was solved offline
 * (screen normal → +Z, long edge → +Y). The GLB's own screen mesh ("Pantalla")
 * is buried under an opaque dark-glass mesh and has atlas-fragment UVs, so the
 * live UI is drawn on a 2D canvas and shown on a rounded-corner plane placed a
 * hair above the front glass (SCREEN_*, in aligned model units).
 *
 * Screen states (drawn on the CanvasTexture, crossfaded by main.js):
 *   0 booking · 1 call · 2 price · 3 confirmed · 4 map · 5 nav · 6 bonuses
 */
import * as THREE from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { DRACOLoader } from './vendor/DRACOLoader.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const BASE_QUAT = new THREE.Quaternion(-0.04932, -0.94765, 0.18554, 0.25516);
const SCREEN_W = 0.8763, SCREEN_H = 1.8751, SCREEN_Z = 0.0585;
const TEX_W = 512, TEX_H = 1096;          // same aspect as SCREEN_W:SCREEN_H
const CORNER = 46;                        // screen corner radius, texture px

const FONT = (w, px) => `${w} ${px}px Inter, system-ui, sans-serif`;
const C = {
  ink: '#1a1a1a', muted: '#6b6b6b', line: '#e7e7e3', soft: '#f3f4f1',
  green: '#1f9d3f', greenDark: '#178031', yellow: '#f5d22a', yellowSoft: '#fff4c2'
};
const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
const easeOutBack = (t) => { const c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

/* ---- map geometry (texture coords), shared by overview + nav ---- */
const ROUTE_PTS = [[256, 884], [256, 770], [170, 700], [170, 556], [318, 484], [318, 356], [262, 280]];
const ROUTE = (() => {
  const segs = []; let total = 0;
  for (let i = 0; i < ROUTE_PTS.length - 1; i++) {
    const [x1, y1] = ROUTE_PTS[i], [x2, y2] = ROUTE_PTS[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    segs.push({ x1, y1, x2, y2, len, acc: total }); total += len;
  }
  return { segs, total, end: ROUTE_PTS[ROUTE_PTS.length - 1], start: ROUTE_PTS[0] };
})();
function routeAt(t) {
  const d = clamp01(t) * ROUTE.total;
  for (const s of ROUTE.segs) {
    if (d <= s.acc + s.len || s === ROUTE.segs[ROUTE.segs.length - 1]) {
      const u = clamp01((d - s.acc) / s.len);
      return { x: s.x1 + (s.x2 - s.x1) * u, y: s.y1 + (s.y2 - s.y1) * u, ang: Math.atan2(s.y2 - s.y1, s.x2 - s.x1) };
    }
  }
  return { x: ROUTE.start[0], y: ROUTE.start[1], ang: -Math.PI / 2 };
}

function drawStreets(ctx) {
  ctx.fillStyle = '#e9ece9';
  ctx.fillRect(-500, -500, TEX_W + 1000, TEX_H + 1000);
  ctx.fillStyle = '#e0e5df';                       // city blocks
  [[28, 300, 150, 120], [336, 380, 150, 130], [56, 560, 120, 150], [300, 650, 170, 120], [120, 120, 150, 100]]
    .forEach(([x, y, w, h]) => { rr(ctx, x, y, w, h, 16); ctx.fill(); });
  ctx.fillStyle = '#d2e6cf'; rr(ctx, 330, 150, 175, 150, 20); ctx.fill();   // a park
  const roads = [[-80, 470, 600, 470], [-80, 250, 600, 250], [-80, 760, 600, 760],
                 [150, -80, 150, 1180], [402, -80, 402, 1180]];
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#d6dad5'; ctx.lineWidth = 32;
  roads.forEach(r => { ctx.beginPath(); ctx.moveTo(r[0], r[1]); ctx.lineTo(r[2], r[3]); ctx.stroke(); });
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 23;
  roads.forEach(r => { ctx.beginPath(); ctx.moveTo(r[0], r[1]); ctx.lineTo(r[2], r[3]); ctx.stroke(); });
}
function drawRouteLine(ctx) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(ROUTE.segs[0].x1, ROUTE.segs[0].y1);
  ROUTE.segs.forEach(s => ctx.lineTo(s.x2, s.y2));
  ctx.strokeStyle = 'rgba(23,128,49,0.22)'; ctx.lineWidth = 24; ctx.stroke();
  ctx.strokeStyle = C.green; ctx.lineWidth = 14; ctx.stroke();
}
function drawPin(ctx, x, y) {
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.ellipse(x, y + 2, 15, 6, 0, 0, 7); ctx.fill();
  ctx.fillStyle = C.green;
  ctx.beginPath(); ctx.arc(x, y - 44, 25, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 17, y - 31); ctx.lineTo(x + 17, y - 31); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y - 44, 10, 0, 7); ctx.fill();
}
function drawYou(ctx, x, y) {
  ctx.fillStyle = 'rgba(31,157,63,0.16)'; ctx.beginPath(); ctx.arc(x, y, 30, 0, 7); ctx.fill();
  ctx.fillStyle = C.green; ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.stroke();
}
function drawArrow(ctx, x, y, ang) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang + Math.PI / 2);
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(0, 7, 20, 9, 0, 0, 7); ctx.fill();
  ctx.fillStyle = C.yellow; ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(22, 22); ctx.lineTo(0, 9); ctx.lineTo(-22, 22); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}
function infoCard(ctx, y, title, sub, accent, glyph) {
  const x = 40, w = TEX_W - 80, h = 116;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.16)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 7;
  ctx.fillStyle = '#fff'; rr(ctx, x, y, w, h, 26); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = accent || C.green; rr(ctx, x + 24, y + 28, 60, 60, 16); ctx.fill();
  if (glyph) { ctx.fillStyle = '#fff'; ctx.font = FONT(800, 38); ctx.textAlign = 'center'; ctx.fillText(glyph, x + 54, y + 70); }
  ctx.textAlign = 'left';
  ctx.fillStyle = C.ink; ctx.font = FONT(800, 30); ctx.fillText(title, x + 104, y + 52);
  ctx.fillStyle = C.muted; ctx.font = FONT(600, 25); ctx.fillText(sub, x + 104, y + 86);
  ctx.restore();
}

/* ---- screen states (each draws a full 512x1096 UI, reads from `ui`) ---- */

function drawBooking(ctx) {
  ctx.fillStyle = C.muted; ctx.font = FONT(600, 30); ctx.textAlign = 'center';
  ctx.fillText('Выберите время', TEX_W / 2, 200);
  const slots = ['9:00', '10:30', '11:00', '12:30', '14:00', '15:30', '17:00', '18:30', '20:00'];
  const gw = 124, gh = 96, gap = 18, x0 = (TEX_W - gw * 3 - gap * 2) / 2, y0 = 260;
  ctx.font = FONT(700, 30);
  slots.forEach((s, i) => {
    const x = x0 + (i % 3) * (gw + gap), y = y0 + ((i / 3) | 0) * (gh + gap), sel = i === 4;
    ctx.fillStyle = sel ? C.green : C.soft; rr(ctx, x, y, gw, gh, 20); ctx.fill();
    ctx.fillStyle = sel ? '#fff' : C.ink; ctx.fillText(s, x + gw / 2, y + gh / 2 + 11);
  });
  ctx.fillStyle = C.green; rr(ctx, 76, 700, TEX_W - 152, 104, 52); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = FONT(700, 36); ctx.fillText('Записаться', TEX_W / 2, 765);
}
function drawCall(ctx) {
  ctx.fillStyle = C.green; ctx.beginPath(); ctx.arc(TEX_W / 2, 360, 110, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = FONT(800, 96); ctx.textAlign = 'center'; ctx.fillText('S', TEX_W / 2, 394);
  ctx.fillStyle = C.ink; ctx.font = FONT(800, 52); ctx.fillText('SPOT', TEX_W / 2, 560);
  ctx.fillStyle = C.muted; ctx.font = FONT(600, 30); ctx.fillText('входящий звонок…', TEX_W / 2, 614);
  ctx.fillStyle = C.green; ctx.beginPath(); ctx.arc(TEX_W / 2 - 90, 800, 56, 0, 7); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(TEX_W / 2 - 110, 806); ctx.quadraticCurveTo(TEX_W / 2 - 90, 824, TEX_W / 2 - 70, 806); ctx.stroke();
  ctx.fillStyle = C.line; ctx.beginPath(); ctx.arc(TEX_W / 2 + 90, 800, 56, 0, 7); ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.beginPath(); ctx.moveTo(TEX_W / 2 + 72, 782); ctx.lineTo(TEX_W / 2 + 108, 818);
  ctx.moveTo(TEX_W / 2 + 108, 782); ctx.lineTo(TEX_W / 2 + 72, 818); ctx.stroke();
}
function drawPrice(ctx) {
  ctx.fillStyle = C.muted; ctx.font = FONT(600, 28); ctx.textAlign = 'center';
  ctx.fillText('Предварительная стоимость', TEX_W / 2, 230);
  ctx.fillStyle = C.yellowSoft; rr(ctx, 76, 290, TEX_W - 152, 150, 28); ctx.fill();
  ctx.fillStyle = C.ink; ctx.font = FONT(800, 60); ctx.fillText('≈ 3 500 ₽', TEX_W / 2, 388);
  ctx.fillStyle = C.soft;
  rr(ctx, 76, 520, TEX_W - 152, 30, 15); ctx.fill();
  rr(ctx, 76, 580, TEX_W - 220, 30, 15); ctx.fill();
  rr(ctx, 76, 640, TEX_W - 184, 30, 15); ctx.fill();
}
function drawConfirmed(ctx) {
  ctx.fillStyle = C.green; ctx.beginPath(); ctx.arc(TEX_W / 2, 420, 120, 0, 7); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 18; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(TEX_W / 2 - 50, 424); ctx.lineTo(TEX_W / 2 - 12, 466); ctx.lineTo(TEX_W / 2 + 56, 376); ctx.stroke();
  ctx.fillStyle = C.ink; ctx.font = FONT(800, 44); ctx.textAlign = 'center';
  ctx.fillText('Запись', TEX_W / 2, 630); ctx.fillText('подтверждена', TEX_W / 2, 686);
}
function drawMap(ctx, ui) {
  drawStreets(ctx);
  drawRouteLine(ctx);
  drawYou(ctx, ROUTE.start[0], ROUTE.start[1]);
  drawPin(ctx, ROUTE.end[0], ROUTE.end[1]);
  infoCard(ctx, 44, 'Ближайшая точка SPOT', '8 мин · 3,2 км', C.green, '◎');
  const pr = ui.pressT || 0, bx = 76, by = 936, bw = TEX_W - 152, bh = 104;
  ctx.save();
  ctx.translate(TEX_W / 2, by + bh / 2); ctx.scale(1 - 0.05 * pr, 1 - 0.05 * pr); ctx.translate(-TEX_W / 2, -(by + bh / 2));
  ctx.fillStyle = pr > 0.45 ? C.greenDark : C.green; rr(ctx, bx, by, bw, bh, 52); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = FONT(800, 40); ctx.textAlign = 'center'; ctx.fillText('Поехали', TEX_W / 2, by + bh / 2 + 14);
  ctx.restore();
}
function drawNav(ctx, ui) {
  const t = ui.navT || 0, p = routeAt(t), ZOOM = 2.05, cx = TEX_W / 2, cy = TEX_H * 0.56;
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(ZOOM, ZOOM); ctx.translate(-p.x, -p.y);
  drawStreets(ctx); drawRouteLine(ctx); drawPin(ctx, ROUTE.end[0], ROUTE.end[1]);
  ctx.restore();
  drawArrow(ctx, cx, cy, p.ang);
  const mins = Math.max(0, Math.round((1 - t) * 8));
  infoCard(ctx, 928, 'СТО SPOT · ул. Примерная, 12', mins + ' мин до прибытия', C.ink, '↑');
  const nf = ui.notifT || 0;
  if (nf > 0.001) {
    const y = -134 + 174 * easeOutBack(clamp01(nf)), x = 40, w = TEX_W - 80, h = 120;
    ctx.save(); ctx.globalAlpha = clamp01(nf * 1.6);
    ctx.shadowColor = 'rgba(0,0,0,0.20)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 9;
    ctx.fillStyle = '#fff'; rr(ctx, x, y, w, h, 28); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.fillStyle = C.yellow; rr(ctx, x + 22, y + 26, 68, 68, 20); ctx.fill();
    ctx.fillStyle = C.ink; ctx.font = FONT(800, 40); ctx.textAlign = 'center'; ctx.fillText('%', x + 56, y + 71);
    ctx.textAlign = 'left';
    ctx.fillStyle = C.ink; ctx.font = FONT(800, 31); ctx.fillText('Скидка до 11:00', x + 110, y + 52);
    ctx.fillStyle = C.muted; ctx.font = FONT(600, 25); ctx.fillText('−10% · Счастливые часы', x + 110, y + 88);
    ctx.restore();
  }
}
function drawBonuses(ctx, ui) {
  ctx.fillStyle = C.muted; ctx.font = FONT(600, 30); ctx.textAlign = 'center';
  ctx.fillText('Мои бонусы', TEX_W / 2, 220);
  ctx.fillStyle = C.ink; ctx.font = FONT(800, 76);
  ctx.fillText(new Intl.NumberFormat('ru-RU').format(ui.balance | 0) + ' ₽', TEX_W / 2, 320);
  ctx.fillStyle = C.green; rr(ctx, 76, 390, TEX_W - 152, 180, 32); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = FONT(800, 56); ctx.textAlign = 'left'; ctx.fillText('10%', 110, 478);
  ctx.font = FONT(600, 26); ctx.globalAlpha = 0.85; ctx.fillText('кешбэк за замену', 110, 530); ctx.globalAlpha = 1;
  ctx.fillStyle = C.soft;
  rr(ctx, 76, 630, TEX_W - 152, 30, 15); ctx.fill();
  rr(ctx, 76, 690, TEX_W - 230, 30, 15); ctx.fill();
  rr(ctx, 76, 750, TEX_W - 190, 30, 15); ctx.fill();
}

const STATES = [drawBooking, drawCall, drawPrice, drawConfirmed, drawMap, drawNav, drawBonuses];

export async function createPhoneScene(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const canvas = renderer.domElement;
  canvas.className = 'how-3d';
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 8);

  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(-3, 4, 6);
  scene.add(key, new THREE.AmbientLight(0xffffff, 0.35));

  const pivot = new THREE.Group();
  const aligned = new THREE.Group();
  aligned.quaternion.copy(BASE_QUAT);
  pivot.add(aligned);
  pivot.visible = false;
  scene.add(pivot);

  const tex2d = document.createElement('canvas');
  tex2d.width = TEX_W; tex2d.height = TEX_H;
  const ctx = tex2d.getContext('2d');
  const texture = new THREE.CanvasTexture(tex2d);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const screenMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN_W, SCREEN_H), screenMat);
  screen.position.z = SCREEN_Z;

  const ui = { a: 0, b: 0, mix: 0, balance: 0, navT: 0, pressT: 0, notifT: 0 };
  let uiKey = '';
  const drawUI = () => {
    const k = `${ui.a}|${ui.b}|${ui.mix.toFixed(3)}|${ui.balance}|${ui.navT.toFixed(3)}|${ui.pressT.toFixed(3)}|${ui.notifT.toFixed(3)}`;
    if (k === uiKey) return false;
    uiKey = k;
    ctx.clearRect(0, 0, TEX_W, TEX_H);
    ctx.save();
    rr(ctx, 0, 0, TEX_W, TEX_H, CORNER); ctx.clip();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, TEX_W, TEX_H);
    ctx.fillStyle = C.line; rr(ctx, TEX_W / 2 - 56, 40, 112, 14, 7); ctx.fill();   // status bar stub
    const draw = (idx, alpha, dy) => {
      if (alpha <= 0.001) return;
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(0, dy);
      STATES[idx](ctx, ui); ctx.restore();
    };
    if (ui.mix < 1) draw(ui.a, 1 - ui.mix, ui.mix * -36);
    if (ui.mix > 0) draw(ui.b, ui.mix, (1 - ui.mix) * 36);
    ctx.restore();
    texture.needsUpdate = true;
    return true;
  };

  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath(new URL('./vendor/draco/', import.meta.url).href);
  loader.setDRACOLoader(draco);
  const gltf = await new Promise((res, rej) =>
    loader.load(new URL('./models/phone.glb', import.meta.url).href, res, undefined, rej));
  draco.dispose();

  const root = gltf.scene;
  aligned.add(root);
  aligned.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(aligned);
  const center = box.getCenter(new THREE.Vector3());
  root.position.add(center.negate().applyQuaternion(BASE_QUAT.clone().invert()));
  pivot.add(screen);                       // UI plane lives in the UPRIGHT frame

  const view = { x: 0, y: 0, rx: 0, ry: 0, rz: 0, s: 1, visible: false };
  let viewKey = '';
  const applyView = () => {
    const k = `${view.x.toFixed(3)}|${view.y.toFixed(3)}|${view.rx.toFixed(3)}|${view.ry.toFixed(3)}|${view.rz.toFixed(3)}|${view.s.toFixed(3)}|${view.visible}`;
    if (k === viewKey) return false;
    viewKey = k;
    pivot.position.set(view.x, view.y, 0);
    pivot.rotation.set(view.rx, view.ry, view.rz);
    pivot.scale.setScalar(view.s);
    pivot.visible = view.visible;
    return true;
  };

  const setSize = (w, h) => {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  return {
    canvas,
    setSize,
    update(viewPatch, uiPatch) {
      if (viewPatch) Object.assign(view, viewPatch);
      if (uiPatch) Object.assign(ui, uiPatch);
      const changed = drawUI() | applyView();
      if (changed || !this._first) { this._first = true; renderer.render(scene, camera); }
    },
    redraw() { uiKey = ''; viewKey = ''; this.update(); }
  };
}
