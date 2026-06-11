/* 3D phone for the #how scrub story (scenes «Записаться» / «Кешбэк»).
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

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/* ---- screen states (each draws a full 512x1096 UI) ---- */

function drawBooking(ctx) {
  ctx.fillStyle = C.muted;
  ctx.font = FONT(600, 30);
  ctx.textAlign = 'center';
  ctx.fillText('Выберите время', TEX_W / 2, 200);

  const slots = ['9:00', '10:30', '11:00', '12:30', '14:00', '15:30', '17:00', '18:30', '20:00'];
  const gw = 124, gh = 96, gap = 18, x0 = (TEX_W - gw * 3 - gap * 2) / 2, y0 = 260;
  ctx.font = FONT(700, 30);
  slots.forEach((s, i) => {
    const x = x0 + (i % 3) * (gw + gap), y = y0 + ((i / 3) | 0) * (gh + gap);
    const sel = i === 4;
    ctx.fillStyle = sel ? C.green : C.soft;
    rr(ctx, x, y, gw, gh, 20); ctx.fill();
    ctx.fillStyle = sel ? '#fff' : C.ink;
    ctx.fillText(s, x + gw / 2, y + gh / 2 + 11);
  });

  ctx.fillStyle = C.green;
  rr(ctx, 76, 700, TEX_W - 152, 104, 52); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = FONT(700, 36);
  ctx.fillText('Записаться', TEX_W / 2, 765);
}

function drawCall(ctx) {
  ctx.fillStyle = C.green;
  ctx.beginPath(); ctx.arc(TEX_W / 2, 360, 110, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = FONT(800, 96);
  ctx.textAlign = 'center';
  ctx.fillText('S', TEX_W / 2, 394);

  ctx.fillStyle = C.ink;
  ctx.font = FONT(800, 52);
  ctx.fillText('SPOT', TEX_W / 2, 560);
  ctx.fillStyle = C.muted;
  ctx.font = FONT(600, 30);
  ctx.fillText('входящий звонок…', TEX_W / 2, 614);

  // accept / decline
  ctx.fillStyle = C.green;
  ctx.beginPath(); ctx.arc(TEX_W / 2 - 90, 800, 56, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(TEX_W / 2 - 110, 806); ctx.quadraticCurveTo(TEX_W / 2 - 90, 824, TEX_W / 2 - 70, 806); ctx.stroke();
  ctx.fillStyle = C.line;
  ctx.beginPath(); ctx.arc(TEX_W / 2 + 90, 800, 56, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(TEX_W / 2 + 72, 782); ctx.lineTo(TEX_W / 2 + 108, 818);
  ctx.moveTo(TEX_W / 2 + 108, 782); ctx.lineTo(TEX_W / 2 + 72, 818);
  ctx.stroke();
}

function drawPrice(ctx) {
  ctx.fillStyle = C.muted;
  ctx.font = FONT(600, 28);
  ctx.textAlign = 'center';
  ctx.fillText('Предварительная стоимость', TEX_W / 2, 230);

  ctx.fillStyle = C.yellowSoft;
  rr(ctx, 76, 290, TEX_W - 152, 150, 28); ctx.fill();
  ctx.fillStyle = C.ink;
  ctx.font = FONT(800, 60);
  ctx.fillText('≈ 3 500 ₽', TEX_W / 2, 388);

  ctx.fillStyle = C.soft;
  rr(ctx, 76, 520, TEX_W - 152, 30, 15); ctx.fill();
  rr(ctx, 76, 580, TEX_W - 220, 30, 15); ctx.fill();
  rr(ctx, 76, 640, TEX_W - 184, 30, 15); ctx.fill();
}

function drawConfirmed(ctx) {
  ctx.fillStyle = C.green;
  ctx.beginPath(); ctx.arc(TEX_W / 2, 420, 120, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 18; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(TEX_W / 2 - 50, 424);
  ctx.lineTo(TEX_W / 2 - 12, 466);
  ctx.lineTo(TEX_W / 2 + 56, 376);
  ctx.stroke();

  ctx.fillStyle = C.ink;
  ctx.font = FONT(800, 44);
  ctx.textAlign = 'center';
  ctx.fillText('Запись', TEX_W / 2, 630);
  ctx.fillText('подтверждена', TEX_W / 2, 686);
}

function drawBonuses(ctx, balance) {
  ctx.fillStyle = C.muted;
  ctx.font = FONT(600, 30);
  ctx.textAlign = 'center';
  ctx.fillText('Мои бонусы', TEX_W / 2, 220);

  ctx.fillStyle = C.ink;
  ctx.font = FONT(800, 76);
  ctx.fillText(new Intl.NumberFormat('ru-RU').format(balance) + ' ₽', TEX_W / 2, 320);

  ctx.fillStyle = C.green;
  rr(ctx, 76, 390, TEX_W - 152, 180, 32); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = FONT(800, 56);
  ctx.textAlign = 'left';
  ctx.fillText('10%', 110, 478);
  ctx.font = FONT(600, 26);
  ctx.globalAlpha = 0.85;
  ctx.fillText('кешбэк за замену', 110, 530);
  ctx.globalAlpha = 1;

  ctx.fillStyle = C.soft;
  rr(ctx, 76, 630, TEX_W - 152, 30, 15); ctx.fill();
  rr(ctx, 76, 690, TEX_W - 230, 30, 15); ctx.fill();
  rr(ctx, 76, 750, TEX_W - 190, 30, 15); ctx.fill();
}

const STATES = [drawBooking, drawCall, drawPrice, drawConfirmed, drawBonuses];

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

  /* phone group: BASE_QUAT inside `aligned`, choreography rotates `pivot` */
  const pivot = new THREE.Group();
  const aligned = new THREE.Group();
  aligned.quaternion.copy(BASE_QUAT);
  pivot.add(aligned);
  pivot.visible = false;
  scene.add(pivot);

  /* live screen */
  const tex2d = document.createElement('canvas');
  tex2d.width = TEX_W; tex2d.height = TEX_H;
  const ctx = tex2d.getContext('2d');
  const texture = new THREE.CanvasTexture(tex2d);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const screenMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN_W, SCREEN_H), screenMat);
  screen.position.z = SCREEN_Z;

  const ui = { a: 0, b: 0, mix: 0, balance: 0 };
  let uiKey = '';
  const drawUI = () => {
    const k = `${ui.a}|${ui.b}|${ui.mix.toFixed(3)}|${ui.balance}`;
    if (k === uiKey) return false;
    uiKey = k;
    ctx.clearRect(0, 0, TEX_W, TEX_H);
    ctx.save();
    rr(ctx, 0, 0, TEX_W, TEX_H, CORNER); ctx.clip();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, TEX_W, TEX_H);
    // status bar stub
    ctx.fillStyle = C.line;
    rr(ctx, TEX_W / 2 - 56, 40, 112, 14, 7); ctx.fill();
    const draw = (idx, alpha, dy) => {
      if (alpha <= 0.001) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(0, dy);
      STATES[idx](ctx, ui.balance);
      ctx.restore();
    };
    if (ui.mix < 1) draw(ui.a, 1 - ui.mix, ui.mix * -36);
    if (ui.mix > 0) draw(ui.b, ui.mix, (1 - ui.mix) * 36);
    ctx.restore();
    texture.needsUpdate = true;
    return true;
  };

  /* model */
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
  // center the ALIGNED model around the pivot origin (offset in aligned-local space)
  const box = new THREE.Box3().setFromObject(aligned);
  const center = box.getCenter(new THREE.Vector3());
  root.position.add(center.negate().applyQuaternion(BASE_QUAT.clone().invert()));
  // the UI plane lives in the UPRIGHT frame (screen bbox was measured there)
  pivot.add(screen);

  const view = { x: 0, y: 0, ry: 0, rz: 0, s: 1, visible: false };
  let viewKey = '';
  const applyView = () => {
    const k = `${view.x.toFixed(3)}|${view.y.toFixed(3)}|${view.ry.toFixed(3)}|${view.rz.toFixed(3)}|${view.s.toFixed(3)}|${view.visible}`;
    if (k === viewKey) return false;
    viewKey = k;
    pivot.position.set(view.x, view.y, 0);
    pivot.rotation.set(0, view.ry, view.rz);
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
    /* merge state; render only if something actually changed */
    update(viewPatch, uiPatch) {
      if (viewPatch) Object.assign(view, viewPatch);
      if (uiPatch) Object.assign(ui, uiPatch);
      const changed = drawUI() | applyView();
      if (changed || !this._first) {
        this._first = true;
        renderer.render(scene, camera);
      }
    },
    redraw() {
      uiKey = ''; viewKey = '';
      this.update();
    }
  };
}
