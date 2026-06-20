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

/* ---- map geometry (texture coords), shared by overview + nav ----
   Roads are a grid; the route runs ALONG road centrelines and only turns at
   intersections, so it reads like a real navigation route. */
const VX = [120, 256, 392], HY = [300, 470, 624, 800];   // road centrelines
const ROUTE_PTS = [[256, 1040], [256, 624], [392, 624], [392, 300], [256, 300]];
const ROUTE = (() => {
  const segs = []; let total = 0;
  for (let i = 0; i < ROUTE_PTS.length - 1; i++) {
    const [x1, y1] = ROUTE_PTS[i], [x2, y2] = ROUTE_PTS[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    segs.push({ x1, y1, x2, y2, len, acc: total }); total += len;
  }
  return { segs, total, end: ROUTE_PTS[ROUTE_PTS.length - 1], start: ROUTE_PTS[0] };
})();
const SEG_M = [1200, 200, 600, 200];        // real distance (m) of each leg
const TOTAL_M = SEG_M.reduce((a, b) => a + b, 0);
const fmtDist = (m) => m >= 1000 ? (m / 1000).toFixed(1).replace('.', ',') + ' км' : Math.max(0, Math.round(m / 10) * 10) + ' м';
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
// next manoeuvre + remaining trip, using the real per-leg distances above
function maneuverAt(t) {
  const segs = ROUTE.segs, d = clamp01(t) * ROUTE.total;
  let k = 0; for (; k < segs.length; k++) if (d <= segs[k].acc + segs[k].len) break;
  k = Math.min(k, segs.length - 1);
  const frac = clamp01((d - segs[k].acc) / segs[k].len);
  const toTurn = (1 - frac) * SEG_M[k];
  let remain = toTurn; for (let i = k + 1; i < SEG_M.length; i++) remain += SEG_M[i];
  const mins = Math.max(1, Math.round(remain / (TOTAL_M / 8)));
  if (k >= segs.length - 1) return { arrive: true, dist: toTurn, mins };
  const a = segs[k], b = segs[k + 1];
  const cross = (a.x2 - a.x1) * (b.y2 - b.y1) - (a.y2 - a.y1) * (b.x2 - b.x1);
  return { arrive: false, dist: toTurn, right: cross > 0, mins };
}

function drawStreets(ctx) {
  ctx.fillStyle = '#e7eae5'; ctx.fillRect(-600, -600, TEX_W + 1200, TEX_H + 1200);
  // building blocks fill the space between roads
  ctx.fillStyle = '#dfe3dc';
  [[150, 330, 76, 110], [286, 330, 76, 110], [30, 500, 60, 94], [150, 500, 76, 94],
   [286, 500, 76, 94], [422, 500, 60, 94], [30, 654, 60, 116], [150, 654, 76, 116],
   [422, 654, 60, 116], [150, 830, 76, 130], [286, 830, 76, 130]]
    .forEach(([x, y, w, h]) => { rr(ctx, x, y, w, h, 12); ctx.fill(); });
  ctx.fillStyle = '#d4e7cf'; rr(ctx, 30, 330, 60, 110, 14); ctx.fill();   // parks
  rr(ctx, 286, 654, 76, 116, 14); ctx.fill();
  // roads: grey casing then white fill, so the green route sits inside the road
  ctx.lineCap = 'butt';
  ctx.strokeStyle = '#d4d8d1'; ctx.lineWidth = 38;
  VX.forEach(x => { ctx.beginPath(); ctx.moveTo(x, -300); ctx.lineTo(x, 1400); ctx.stroke(); });
  HY.forEach(y => { ctx.beginPath(); ctx.moveTo(-300, y); ctx.lineTo(820, y); ctx.stroke(); });
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 28;
  VX.forEach(x => { ctx.beginPath(); ctx.moveTo(x, -300); ctx.lineTo(x, 1400); ctx.stroke(); });
  HY.forEach(y => { ctx.beginPath(); ctx.moveTo(-300, y); ctx.lineTo(820, y); ctx.stroke(); });
}
function drawRouteLine(ctx) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(ROUTE.segs[0].x1, ROUTE.segs[0].y1);
  ROUTE.segs.forEach(s => ctx.lineTo(s.x2, s.y2));
  ctx.strokeStyle = 'rgba(23,128,49,0.20)'; ctx.lineWidth = 22; ctx.stroke();
  ctx.strokeStyle = C.green; ctx.lineWidth = 13; ctx.stroke();
}
// only the part of the route AHEAD of the cursor — the travelled bit vanishes
function drawRouteAhead(ctx, t) {
  const segs = ROUTE.segs, d = clamp01(t) * ROUTE.total, p = routeAt(t);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(p.x, p.y);
  segs.forEach(s => { if (s.acc + s.len > d) ctx.lineTo(s.x2, s.y2); });
  ctx.strokeStyle = 'rgba(23,128,49,0.20)'; ctx.lineWidth = 22; ctx.stroke();
  ctx.strokeStyle = C.green; ctx.lineWidth = 13; ctx.stroke();
}
// destination marker — the SPOT pin silhouette (green teardrop + white hole)
function drawPin(ctx, x, y) {
  ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.beginPath(); ctx.ellipse(x, y + 2, 16, 6, 0, 0, 7); ctx.fill();
  ctx.fillStyle = C.green;
  ctx.beginPath(); ctx.arc(x, y - 46, 27, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 18, y - 32); ctx.lineTo(x + 18, y - 32); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y - 48, 11, 0, 7); ctx.fill();
}
function drawYou(ctx, x, y) {
  ctx.fillStyle = 'rgba(31,157,63,0.16)'; ctx.beginPath(); ctx.arc(x, y, 30, 0, 7); ctx.fill();
  ctx.fillStyle = C.green; ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.stroke();
}
// the «you are driving» cursor — clean chevron, deliberately bigger than the route
function drawArrow(ctx, x, y, ang) {
  const path = (c) => { c.beginPath(); c.moveTo(0, -42); c.lineTo(32, 38); c.lineTo(0, 18); c.lineTo(-32, 38); c.closePath(); };
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang + Math.PI / 2);
  ctx.save();                                        // soft blurred shadow (no hard ellipse)
  ctx.shadowColor = 'rgba(0,0,0,0.30)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
  ctx.fillStyle = C.yellow; path(ctx); ctx.fill();
  ctx.restore();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = 7; ctx.strokeStyle = '#fff';
  path(ctx); ctx.stroke();
  ctx.restore();
}
// SPOT location-pin logo (24×24 viewBox), stroked white inside the UI chips
const PIN_LOGO = new Path2D('M12 21C15.5 17.4 19 14.1764 19 10.2C19 6.22355 15.866 3 12 3C8.13401 3 5 6.22355 5 10.2C5 14.1764 8.5 17.4 12 21Z M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z');
function drawPinLogo(ctx, cx, cy, size, color) {
  const s = size / 24;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-12, -12.5);
  ctx.strokeStyle = color; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.stroke(PIN_LOGO);
  ctx.restore();
}
// white bent turn-arrow (or arrival flag) inside the manoeuvre chip
function drawTurnArrow(ctx, cx, cy, mv) {
  ctx.save(); ctx.translate(cx, cy); ctx.strokeStyle = '#fff'; ctx.fillStyle = '#fff';
  ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (mv.arrive) {
    ctx.beginPath(); ctx.arc(0, -10, 13, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -10, 4, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 3); ctx.lineTo(0, 24); ctx.stroke();
  } else {
    const d = mv.right ? 1 : -1;
    ctx.beginPath(); ctx.moveTo(0, 26); ctx.lineTo(0, -4); ctx.lineTo(d * 16, -4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(d * 14, -22); ctx.lineTo(d * 40, -4); ctx.lineTo(d * 14, 14); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function infoCard(ctx, y, title, sub) {
  const x = 40, w = TEX_W - 80, h = 116;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.16)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 7;
  ctx.fillStyle = '#fff'; rr(ctx, x, y, w, h, 26); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = C.green; rr(ctx, x + 24, y + 28, 60, 60, 16); ctx.fill();
  drawPinLogo(ctx, x + 54, y + 58, 44, '#fff');
  ctx.textAlign = 'left';
  ctx.fillStyle = C.ink; ctx.font = FONT(800, 33); ctx.fillText(title, x + 104, y + 54);
  ctx.fillStyle = C.muted; ctx.font = FONT(600, 25); ctx.fillText(sub, x + 104, y + 88);
  ctx.restore();
}
// classic phone-handset glyph (Material 24×24), filled at the knob centre
const HANDSET = new Path2D('M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z');

/* ---- screen states (each draws a full 512x1096 UI, reads from `ui`) ---- */

function drawBooking(ctx, ui) {
  // staggered pop-in of the whole booking UI, driven by the scrub:
  //   slotsT 0→1 reveals header + 9 time slots one after another,
  //   btnT   0→1 pops the «Записаться» button, and the press progresses
  //   (slotPressT on the centre slot, btnPressT on the button) read as taps.
  const slotsT = clamp01(ui && ui.slotsT || 0);
  const btnT = clamp01(ui && ui.btnT || 0);
  const slotPress = clamp01(ui && ui.slotPressT || 0);
  const btnPress = clamp01(ui && ui.btnPressT || 0);
  const selectT = clamp01(ui && ui.selectT || 0);    // centre slot colours in only on tap

  ctx.textAlign = 'center';
  ctx.globalAlpha = clamp01(slotsT * 4);
  ctx.fillStyle = C.muted; ctx.font = FONT(600, 30);
  ctx.fillText('Выберите время', TEX_W / 2, 200);
  ctx.globalAlpha = 1;

  const slots = ['9:00', '10:30', '11:00', '12:30', '14:00', '15:30', '17:00', '18:30', '20:00'];
  const gw = 124, gh = 96, gap = 18, x0 = (TEX_W - gw * 3 - gap * 2) / 2, y0 = 260;
  ctx.font = FONT(700, 30);
  const STAG = 0.07, DUR = 0.42, span = STAG * (slots.length - 1) + DUR;
  slots.forEach((s, i) => {
    const local = clamp01((slotsT * span - i * STAG) / DUR);
    if (local <= 0.001) return;
    const pop = easeOutBack(local), sel = i === 4;
    const cx = x0 + (i % 3) * (gw + gap) + gw / 2;
    const cy = y0 + ((i / 3) | 0) * (gh + gap) + gh / 2;
    const press = sel ? 1 - 0.10 * slotPress : 1;
    ctx.save();
    ctx.globalAlpha = clamp01(local * 1.6);
    ctx.translate(cx, cy); ctx.scale(pop * press, pop * press); ctx.translate(-cx, -cy);
    // base chip: every slot (incl. 14:00) starts neutral
    ctx.fillStyle = C.soft; rr(ctx, cx - gw / 2, cy - gh / 2, gw, gh, 20); ctx.fill();
    ctx.fillStyle = C.ink; ctx.fillText(s, cx, cy + 11);
    // 14:00 crossfades to green once tapped
    if (sel && selectT > 0.001) {
      ctx.globalAlpha = clamp01(local * 1.6) * selectT;
      ctx.fillStyle = C.green; rr(ctx, cx - gw / 2, cy - gh / 2, gw, gh, 20); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillText(s, cx, cy + 11);
    }
    ctx.restore();
  });

  if (btnT > 0.001) {
    const pop = easeOutBack(btnT), bx = 76, by = 700, bw = TEX_W - 152, bh = 104;
    const press = 1 - 0.05 * btnPress;
    ctx.save();
    ctx.globalAlpha = clamp01(btnT * 1.6);
    ctx.translate(TEX_W / 2, by + bh / 2); ctx.scale(pop * press, pop * press); ctx.translate(-TEX_W / 2, -(by + bh / 2));
    ctx.fillStyle = btnPress > 0.45 ? C.greenDark : C.green; rr(ctx, bx, by, bw, bh, 52); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = FONT(700, 36); ctx.fillText('Записаться', TEX_W / 2, 765);
    ctx.restore();
  }
}
function drawCall(ctx, ui) {
  ctx.fillStyle = C.green; ctx.beginPath(); ctx.arc(TEX_W / 2, 300, 106, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = FONT(800, 92); ctx.textAlign = 'center'; ctx.fillText('S', TEX_W / 2, 334);
  ctx.fillStyle = C.ink; ctx.font = FONT(800, 52); ctx.fillText('SPOT', TEX_W / 2, 500);
  ctx.fillStyle = C.muted; ctx.font = FONT(600, 30); ctx.fillText('входящий звонок…', TEX_W / 2, 552);

  // slide-to-answer: «ответить» sits on the track and is swallowed by the
  // green layer as the knob auto-slides across on scroll
  const tx = 54, tw = TEX_W - 108, ty = 800, th = 124, r = th / 2, at = clamp01(ui.answerT || 0);
  ctx.fillStyle = '#edf0ec'; rr(ctx, tx, ty, tw, th, r); ctx.fill();
  const knobR = r - 6, x0 = tx + r, travel = tw - 2 * r, kx = x0 + travel * at;
  ctx.save(); rr(ctx, tx, ty, tw, th, r); ctx.clip();
  ctx.fillStyle = C.muted; ctx.font = FONT(700, 30); ctx.textAlign = 'center';
  ctx.fillText('ответить', tx + tw * 0.56, ty + th / 2 + 11);
  // green pill wraps right up to (and around) the knob with a full rounded cap
  ctx.fillStyle = C.green; rr(ctx, tx, ty, (kx - tx) + knobR, th, r); ctx.fill();
  ctx.restore();
  // white knob with the green handset
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(kx, ty + th / 2, knobR, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(kx, ty + th / 2); const hs = knobR * 1.5 / 24; ctx.scale(hs, hs); ctx.translate(-12, -12);
  ctx.fillStyle = C.green; ctx.fill(HANDSET); ctx.restore();
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
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, TEX_W, TEX_H);   // occludes the booking UI as it crossfades in
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
  infoCard(ctx, 44, 'СТО SPOT', '8 мин · 3,2 км');
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
  drawStreets(ctx); drawRouteAhead(ctx, t); drawPin(ctx, ROUTE.end[0], ROUTE.end[1]);
  ctx.restore();
  drawArrow(ctx, cx, cy, p.ang);

  // top header: [turn icon] distance-to-turn ............ time remaining
  const mv = maneuverAt(t), x = 36, y = 40, w = TEX_W - 72, h = 150;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.13)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 6;
  ctx.fillStyle = '#fff'; rr(ctx, x, y, w, h, 28); ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.fillStyle = C.green; rr(ctx, x + 22, y + 25, 100, 100, 24); ctx.fill();
  drawTurnArrow(ctx, x + 72, y + 75, mv);
  ctx.textAlign = 'left'; ctx.fillStyle = C.ink;
  if (mv.arrive) {                                   // no time on arrival — avoids a clash
    ctx.font = FONT(800, 40); ctx.fillText('Прибытие', x + 146, y + 72);
    ctx.fillStyle = C.muted; ctx.font = FONT(600, 25); ctx.fillText('вы на месте', x + 146, y + 106);
  } else {
    ctx.font = FONT(800, 42); ctx.fillText(fmtDist(mv.dist), x + 146, y + 92);
    ctx.textAlign = 'right'; ctx.fillStyle = C.ink; ctx.font = FONT(800, 38);
    ctx.fillText(mv.mins + ' мин', x + w - 28, y + 70);
    ctx.fillStyle = C.muted; ctx.font = FONT(600, 24); ctx.fillText('осталось', x + w - 28, y + 104);
  }
  ctx.restore();

  // «Скидка до 11:00» push notification rises from the bottom during the drive
  const nf = clamp01(ui.notifT || 0);
  if (nf > 0.001) {
    const bx = 40, bw = TEX_W - 80, bh = 120, yb = TEX_H + 12 - 196 * easeOutBack(nf);
    ctx.save(); ctx.globalAlpha = clamp01(nf * 1.6);
    ctx.shadowColor = 'rgba(0,0,0,0.22)'; ctx.shadowBlur = 28; ctx.shadowOffsetY = 10;
    ctx.fillStyle = '#fff'; rr(ctx, bx, yb, bw, bh, 28); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.fillStyle = C.yellow; rr(ctx, bx + 22, yb + 26, 68, 68, 20); ctx.fill();
    ctx.fillStyle = C.ink; ctx.font = FONT(800, 40); ctx.textAlign = 'center'; ctx.fillText('%', bx + 56, yb + 71);
    ctx.textAlign = 'left';
    ctx.fillStyle = C.ink; ctx.font = FONT(800, 31); ctx.fillText('Скидка до 11:00', bx + 110, yb + 52);
    ctx.fillStyle = C.muted; ctx.font = FONT(600, 25); ctx.fillText('−10% · Счастливые часы', bx + 110, yb + 88);
    ctx.restore();
  }
}
// shrink a line until it fits maxW, then draw it centred
function fitText(ctx, text, cx, y, maxW, weight, size, fam) {
  let s = size;
  do { ctx.font = `${weight} ${s}px ${fam}`; if (ctx.measureText(text).width <= maxW) break; s -= 2; } while (s > 12);
  ctx.fillText(text, cx, y);
}
// full-screen «Счастливые часы» promo — opens as the phone turns to face us.
// Only the title uses Climate Crisis; everything else stays in the UI face.
function drawPromo(ctx, ui) {
  const e = clamp01(ui.promoT != null ? ui.promoT : 1), cx = TEX_W / 2, maxW = TEX_W - 96;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, TEX_W, TEX_H);
  ctx.save();
  ctx.globalAlpha = e;
  ctx.translate(cx, TEX_H / 2); ctx.scale(0.94 + 0.06 * e, 0.94 + 0.06 * e); ctx.translate(-cx, -TEX_H / 2);
  ctx.textAlign = 'center';
  // yellow % badge
  ctx.fillStyle = C.yellow; ctx.beginPath(); ctx.arc(cx, 244, 116, 0, 7); ctx.fill();
  ctx.fillStyle = C.ink; ctx.font = FONT(800, 132); ctx.fillText('%', cx, 292);
  // title — Climate Crisis
  ctx.fillStyle = C.ink;
  fitText(ctx, 'СЧАСТЛИВЫЕ', cx, 446, maxW, 400, 62, "'Climate Crisis', Inter, sans-serif");
  fitText(ctx, 'ЧАСЫ', cx, 512, maxW, 400, 62, "'Climate Crisis', Inter, sans-serif");
  // headline discount
  ctx.fillStyle = C.green; ctx.font = FONT(800, 108); ctx.fillText('−10%', cx, 664);
  ctx.fillStyle = C.muted; ctx.font = FONT(600, 36); ctx.fillText('на весь чек', cx, 716);
  // schedule pill (text fit to the pill)
  const pw = TEX_W - 132, px = (TEX_W - pw) / 2, py = 800, ph = 98;
  ctx.fillStyle = C.soft; rr(ctx, px, py, pw, ph, 49); ctx.fill();
  ctx.fillStyle = C.ink;
  fitText(ctx, 'каждый день · 9:00–11:00', cx, py + 62, pw - 64, 700, 34, 'Inter, sans-serif');
  ctx.restore();
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

const STATES = [drawBooking, drawCall, drawPrice, drawConfirmed, drawMap, drawNav, drawBonuses, drawPromo];

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

  const ui = { a: 0, b: 0, mix: 0, balance: 0, navT: 0, pressT: 0, notifT: 0, answerT: 0, promoT: 0,
    slotsT: 0, btnT: 0, slotPressT: 0, btnPressT: 0, selectT: 0 };
  let uiKey = '';
  const drawUI = () => {
    const k = `${ui.a}|${ui.b}|${ui.mix.toFixed(3)}|${ui.balance}|${ui.navT.toFixed(3)}|${ui.pressT.toFixed(3)}|${ui.notifT.toFixed(3)}|${ui.answerT.toFixed(3)}|${ui.promoT.toFixed(3)}|${ui.slotsT.toFixed(3)}|${ui.btnT.toFixed(3)}|${ui.slotPressT.toFixed(3)}|${ui.btnPressT.toFixed(3)}|${ui.selectT.toFixed(3)}`;
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

  /* ---- hand cursor (scene 1) ----
     A real model in the SAME scene, parented to the phone frame so it shares
     the lighting/perspective and presses INTO the screen along Z. Position is
     given in screen fractions (tx,ty ∈ 0..1); poke 0..1 drives the press. */
  const HOVER = 0.20, POKE = 0.15, CAM_Z = camera.position.z;
  const cursorPivot = new THREE.Group();
  cursorPivot.visible = false;
  pivot.add(cursorPivot);
  let cursorLoaded = false;
  const cstate = { visible: false, tx: 0.5, ty: 0.5, poke: 0, dirX: 0, dirY: 0 };
  let cursorKey = '';
  /* The cursor doesn't idle on its own — it's parented to the phone, so the
     phone's idle float carries it. It DOES tilt: the finger leans toward the
     point it's travelling to (dirX/dirY) and bows down into the screen when it
     presses (poke), which sells the 3D-ness. */
  const applyCursor = () => {
    const k = `${cstate.visible}|${cursorLoaded}|${cstate.tx.toFixed(3)}|${cstate.ty.toFixed(3)}|${cstate.poke.toFixed(3)}|${cstate.dirX.toFixed(2)}|${cstate.dirY.toFixed(2)}`;
    if (k === cursorKey) return false;
    cursorKey = k;
    const vis = cstate.visible && cursorLoaded;
    cursorPivot.visible = vis;
    if (vis) {
      const localZ = SCREEN_Z + HOVER - cstate.poke * POKE;
      // the hand floats in FRONT of the screen, so perspective shifts it away
      // from centre — pull its in-plane target back toward centre to land the
      // fingertip on the right pixel (parallax compensation; s = phone scale)
      const s = view.s || 1, par = (CAM_Z - s * localZ) / (CAM_Z - s * SCREEN_Z);
      cursorPivot.position.set(
        (cstate.tx - 0.5) * SCREEN_W * par,
        (0.5 - cstate.ty) * SCREEN_H * par,
        localZ
      );
      cursorPivot.rotation.set(
        -0.14 + cstate.dirY * 0.52 + cstate.poke * 0.28,   // pitch: lean toward vertical heading / bow in on press
        0.14 + cstate.dirX * 0.38,                         // yaw: turn toward horizontal heading
        -cstate.dirX * 0.48                                // roll: lean toward horizontal heading
      );
    }
    return true;
  };
  new GLTFLoader().load(new URL('./models/cursor.glb', import.meta.url).href, (cg) => {
    const grp = new THREE.Group();
    grp.add(cg.scene);
    grp.updateMatrixWorld(true);
    const cbox = new THREE.Box3().setFromObject(grp);
    const csize = cbox.getSize(new THREE.Vector3());
    const ccenter = cbox.getCenter(new THREE.Vector3());
    cg.scene.position.sub(ccenter);                    // centre the model on the group origin
    cg.scene.position.y -= csize.y * 0.62;             // drop it so the FINGERTIP sits at origin
    const maxDim = Math.max(csize.x, csize.y, csize.z) || 1;
    grp.scale.setScalar((SCREEN_H * 0.235) / maxDim);  // sized against screen height
    cursorPivot.add(grp);
    cursorLoaded = true;
    cursorKey = '';                                    // force re-apply now that it exists
  }, undefined, (e) => console.warn('cursor model failed:', e));

  const view = { x: 0, y: 0, rx: 0, ry: 0, rz: 0, s: 1, visible: false };
  let viewKey = '';
  /* phone idle: a gentle continuous float/sway so the phone feels alive even
     when the scroll is still. The scroll sets the base pose; the idle adds a
     small sine on top, and a scoped rAF re-renders while the phone is visible.
     The cursor is a child of the pivot, so it floats along with the phone. */
  const composeView = () => {
    const t = performance.now() / 1000;
    pivot.position.set(view.x, view.y + Math.sin(t * 1.05) * 0.030, 0);
    pivot.rotation.set(
      view.rx + Math.sin(t * 0.9 + 0.6) * 0.018,
      view.ry + Math.sin(t * 0.75) * 0.022,
      view.rz + Math.sin(t * 1.2 + 1.4) * 0.010
    );
    pivot.scale.setScalar(view.s);
    pivot.visible = view.visible;
  };
  let idleRAF = 0;
  const idleLoop = () => {
    idleRAF = 0;
    if (!view.visible) return;
    composeView();
    renderer.render(scene, camera);
    idleRAF = requestAnimationFrame(idleLoop);
  };
  const applyView = () => {
    const k = `${view.x.toFixed(3)}|${view.y.toFixed(3)}|${view.rx.toFixed(3)}|${view.ry.toFixed(3)}|${view.rz.toFixed(3)}|${view.s.toFixed(3)}|${view.visible}`;
    if (k === viewKey) return false;
    viewKey = k;
    composeView();
    if (view.visible && !idleRAF) idleRAF = requestAnimationFrame(idleLoop);
    else if (!view.visible && idleRAF) { cancelAnimationFrame(idleRAF); idleRAF = 0; }
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
    update(viewPatch, uiPatch, cursorPatch) {
      if (viewPatch) Object.assign(view, viewPatch);
      if (uiPatch) Object.assign(ui, uiPatch);
      if (cursorPatch) Object.assign(cstate, cursorPatch);
      const changed = drawUI() | applyView() | applyCursor();
      if (changed || !this._first) { this._first = true; renderer.render(scene, camera); }
    },
    redraw() { uiKey = ''; viewKey = ''; cursorKey = ''; this.update(); }
  };
}
