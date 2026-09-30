import * as THREE from 'three';

/* ---------------------------------------------------------------
   單人計時賽
   賽道：tracks/<id>.js 的中心線與高程（跟賽道頁同一份資料）
   車輛：沿中心線座標的簡化模型（s＝里程、o＝離中心線的側向距離、ψ＝車頭與賽道切線的夾角）
   這是遊戲手感，不是真實車輛動力學。
--------------------------------------------------------------- */

const ALL = ['albert_park', 'americas', 'bahrain', 'baku', 'catalunya', 'hungaroring', 'interlagos',
  'losail', 'marina_bay', 'miami', 'monaco', 'monza', 'red_bull_ring', 'rodriguez', 'sepang',
  'shanghai', 'silverstone', 'spa', 'suzuka', 'vegas', 'villeneuve', 'yas_marina', 'zandvoort'];
const q = new URLSearchParams(location.search).get('t');
const ID = ALL.includes(q) ? q : 'suzuka';

const [{ TRACK }, { META }] = await Promise.all([
  import(`./tracks/${ID}.js`), import(`./tracks/${ID}_corners.js`)]);

const N = TRACK.x.length, STEP = TRACK.step, L = TRACK.length_m;
const $ = id => document.getElementById(id);
$('title').textContent = `${META.flag} ${META.title}`;
document.title = `賽道解剖 — ${META.title} 計時賽`;
$('back').href = `./${ID}.html`;
$('back').textContent = '賽道頁';

// ---- 賽道選單 -------------------------------------------------------
{
  const pick = $('pick');
  pick.innerHTML = ALL.map(t => `<option value="${t}">${t}</option>`).join('');
  pick.value = ID;
  pick.onchange = () => { location.search = `?t=${pick.value}`; };
  Promise.all(ALL.map(t => import(`./tracks/${t}_corners.js`).then(m => [t, m.META]).catch(() => [t, null])))
    .then(rs => {
      for (const [t, m] of rs) if (m) pick.querySelector(`[value="${t}"]`).textContent = `${m.flag} ${m.title}`;
    });
}

// ---- 中心線查詢（線性內插）------------------------------------------
const cross = META.crossover;
const clearance = d => cross ? cross.drop * Math.exp(-Math.pow((d - cross.at) / cross.span, 2)) : 0;
const halfAt = d => (d < 800 ? 15 : 12) / 2;

const K = new Float32Array(N);       // 有號曲率（左彎為正），自己由切線算，不依賴資料的符號約定
const TX = new Float32Array(N), TY = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const a = (i - 1 + N) % N, b = (i + 1) % N;
  const tx = TRACK.x[b] - TRACK.x[a], ty = TRACK.y[b] - TRACK.y[a], l = Math.hypot(tx, ty) || 1;
  TX[i] = tx / l; TY[i] = ty / l;
}
for (let i = 0; i < N; i++) {
  // 前後各 3 點（約 24 m）的切線夾角平滑，避免中心線雜訊造成抖動
  const a = (i - 3 + N) % N, b = (i + 3) % N;
  const cr = TX[a] * TY[b] - TY[a] * TX[b], dt = TX[a] * TX[b] + TY[a] * TY[b];
  K[i] = Math.atan2(cr, dt) / (6 * STEP);
}

const wrap = s => ((s % L) + L) % L;
function at(s) {
  s = wrap(s);
  const f = s / STEP, i = Math.floor(f) % N, j = (i + 1) % N, u = f - Math.floor(f);
  const m = (arr) => arr[i] + (arr[j] - arr[i]) * u;
  let tx = TX[i] + (TX[j] - TX[i]) * u, ty = TY[i] + (TY[j] - TY[i]) * u;
  const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
  return { x: m(TRACK.x), y: m(TRACK.y), z: m(TRACK.z) - clearance(s), tx, ty, k: m(K), half: halfAt(s) };
}
const world = (p, o, lift = 0) => new THREE.Vector3(p.x - p.ty * o, p.z + lift, -(p.y + p.tx * o));

// ---- 場景 -----------------------------------------------------------
const scene = new THREE.Scene();
// 夜賽天空：頂端維持黑舞台，地平線一圈暖色光暈，才分得出天和地
const HORIZON = 0x2B2238;
scene.fog = new THREE.Fog(HORIZON, 180, 1300);
{
  const c = document.createElement('canvas'); c.width = 2; c.height = 256;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#07070B'); gr.addColorStop(0.62, '#141221');
  gr.addColorStop(0.9, '#3A2A44'); gr.addColorStop(0.97, '#6B3A3A'); gr.addColorStop(1, '#2B2238');
  g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2 + 0.05),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -1;
  var skyMesh = sky;
}
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.3, 4000);
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
$('stage').appendChild(renderer.domElement);
scene.add(skyMesh);
scene.add(new THREE.HemisphereLight(0xB8B4D8, 0x2A2418, 1.1));
const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(-600, 1200, 500);
scene.add(sun);

const cx = TRACK.x.reduce((a, b) => a + b, 0) / N, cy = TRACK.y.reduce((a, b) => a + b, 0) / N;
const zMin = Math.min(...TRACK.z);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(20000, 20000), new THREE.MeshLambertMaterial({ color: 0x2A3A26 }));
ground.rotation.x = -Math.PI / 2;
ground.position.set(cx, zMin - 0.8, -cy);
scene.add(ground);

/** 沿中心線織一條帶：o1..o2 為側向範圍；colorFn 可讓每段有不同顏色。 */
function strip(o1, o2, lift, mat, opts = {}) {
  const pos = [], col = [], idx = [], uv = [];
  const ids = opts.ids || [...Array(N).keys()];
  ids.forEach((i, n) => {
    const p = at(i * STEP), h = opts.rel ? p.half : 0;
    world(p, o1 + (opts.rel ? Math.sign(o1) * h : 0), lift).toArray(pos, pos.length);
    world(p, o2 + (opts.rel ? Math.sign(o2) * h : 0), lift).toArray(pos, pos.length);
    if (opts.color) { const c = opts.color(i); col.push(c.r, c.g, c.b, c.r, c.g, c.b); }
    const v = (n * STEP) / (opts.uvLen || 20);
    uv.push(0, v, 1, v);
    if (n) { const a = (n - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (col.length) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  scene.add(m);
  return m;
}
const closed = [...Array(N + 1).keys()].map(i => i % N);
const poly = (c) => ({ polygonOffset: true, polygonOffsetFactor: -c, polygonOffsetUnits: -c });

// 柏油：程式產生的顆粒貼圖，沿著里程重複，速度感主要從這裡來
function noiseTex(base, spread, w = 128, h = 256, lines = false) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), im = g.createImageData(w, h);
  for (let p = 0; p < w * h; p++) {
    const v = base + (Math.random() - 0.5) * spread;
    im.data.set([v, v, v * 1.02, 255], p * 4);
  }
  g.putImageData(im, 0, 0);
  if (lines) {                                 // 輪胎痕：中間兩條略深
    g.fillStyle = 'rgba(0,0,0,0.10)';
    g.fillRect(w * 0.30, 0, w * 0.10, h); g.fillRect(w * 0.60, 0, w * 0.10, h);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
const roadMat = new THREE.MeshLambertMaterial({ map: noiseTex(78, 12, 256, 512, true), side: THREE.DoubleSide });
strip(-1, 1, 0.05, roadMat, { ids: closed, rel: true, uvLen: 24 });
// 兩側柏油緩衝區（比路面暗、較粗）
const runMat = new THREE.MeshLambertMaterial({ map: noiseTex(44, 14), side: THREE.DoubleSide, ...poly(1) });
strip(1.0, 7.5, 0.03, runMat, { ids: closed, rel: true, uvLen: 12 });
strip(-7.5, -1.0, 0.03, runMat, { ids: closed, rel: true, uvLen: 12 });
const edge = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, side: THREE.DoubleSide, ...poly(3) });
strip(0.7, 0.95, 0.06, edge, { ids: closed, rel: true });
strip(-0.95, -0.7, 0.06, edge, { ids: closed, rel: true });
// 路緣石：彎心內側，紅白相間
const kerbMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, ...poly(2) });
const RED = new THREE.Color(0xFF2B12), WHT = new THREE.Color(0xFFFFFF);
for (const side of [1, -1]) {
  const ids = closed.filter(i => Math.abs(K[i]) > 0.012 && Math.sign(K[i]) === side);
  // 只在連續的彎角段鋪，斷開處不連線
  let run = [];
  const flush = () => {
    if (run.length > 1) strip(side * 1.0, side * 1.0 + side * 1.4, 0.07, kerbMat,
      { ids: run, rel: true, color: i => (Math.floor(i / 2) % 2 ? RED : WHT) });
    run = [];
  };
  for (const i of ids) { if (run.length && i !== run[run.length - 1] + 1) flush(); run.push(i); }
  flush();
}

// 護牆：位置就是物理上的牆（halfAt + 9 m），紅白分段，看得出速度
const WALL_GAP = 9;
{
  const pos = [], col = [], idx = [];
  const A = new THREE.Color(0xE8E8E8), B = new THREE.Color(0xFF2B12);
  for (const side of [1, -1]) {
    closed.forEach((i, n) => {
      const p = at(i * STEP), o = side * (p.half + WALL_GAP);
      const base = pos.length / 3;
      world(p, o, -0.5).toArray(pos, pos.length);
      world(p, o, 1.1).toArray(pos, pos.length);
      const c = Math.floor(i / 3) % 2 ? A : B;
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
      if (n) idx.push(base - 2, base - 1, base, base - 1, base + 1, base);
    });
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  scene.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })));
}

// 燈柱：每 50 m 一對，夜賽的主要參照物
{
  const every = Math.round(50 / STEP), n = Math.floor(N / every) * 2;
  const pole = new THREE.InstancedMesh(new THREE.BoxGeometry(0.35, 14, 0.35),
    new THREE.MeshLambertMaterial({ color: 0x55555F }), n);
  const lamp = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 0.5, 2.4),
    new THREE.MeshBasicMaterial({ color: 0xFFF3C4 }), n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
  let k = 0;
  for (let i = 0; i < N && k < n; i += every) {
    const p = at(i * STEP);
    q.setFromAxisAngle(up, Math.atan2(p.ty, p.tx));
    for (const side of [1, -1]) {
      if (k >= n) break;
      m.compose(world(p, side * (p.half + WALL_GAP + 1.5), 6.5), q, one); pole.setMatrixAt(k, m);
      m.compose(world(p, side * (p.half + WALL_GAP + 0.3), 13.5), q, one); lamp.setMatrixAt(k, m);
      k++;
    }
  }
  pole.count = lamp.count = k;
  scene.add(pole, lamp);
}

// 煞車距離牌：模型判定的每個煞車區前 300／200／100 m，立在右側
{
  const tex = {};
  for (const n of [300, 200, 100]) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 160;
    const g = c.getContext('2d');
    g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, 128, 160);
    g.fillStyle = '#0D0D0D'; g.fillRect(8, 8, 112, 144);
    g.fillStyle = '#FFFFFF'; g.font = '900 64px Anton, Impact, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), 64, 82);
    tex[n] = new THREE.CanvasTexture(c); tex[n].colorSpace = THREE.SRGBColorSpace;
  }
  const geo = new THREE.PlaneGeometry(2.0, 2.5);
  for (let i = 0; i < N; i++) {
    const prev = (i - 1 + N) % N;
    if (TRACK.st[i] !== 2 || TRACK.st[prev] === 2) continue;       // 煞車區的起點
    // 前面至少要有 350 m 不是煞車，才值得立牌
    let clean = true;
    for (let a = 1; a * STEP <= 350; a++) if (TRACK.st[(i - a + N) % N] === 2) { clean = false; break; }
    if (!clean) continue;
    for (const n of [300, 200, 100]) {
      const p = at(i * STEP - n);
      const b = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex[n], side: THREE.DoubleSide }));
      b.position.copy(world(p, -(p.half + 4.5), 1.8));
      b.rotation.y = Math.atan2(p.ty, p.tx) - Math.PI / 2;
      scene.add(b);
    }
  }
}

const startLamps = [];
// 起跑線與龍門架
{
  const p = at(0), h = p.half;
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  for (let y = 0; y < 16; y++) for (let x = 0; x < 4; x++) {
    g.fillStyle = (x + y) % 2 ? '#0D0D0D' : '#FFFFFF'; g.fillRect(x * 16, y * 16, 16, 16);
  }
  const chk = new THREE.CanvasTexture(c); chk.colorSpace = THREE.SRGBColorSpace;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.06, h * 2),
    new THREE.MeshBasicMaterial({ map: chk }));
  bar.position.copy(world(p, 0, 0.12));
  bar.rotation.y = Math.atan2(p.ty, p.tx);
  scene.add(bar);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, h * 2 + 3), new THREE.MeshLambertMaterial({ color: 0xFFD60A }));
  beam.position.copy(world(p, 0, 9));
  beam.rotation.y = Math.atan2(p.ty, p.tx);
  scene.add(beam);
  // 起跑燈：面向起跑格的五盞，倒數時一盞一盞亮紅，全滅＝出發
  const lampGeo = new THREE.CircleGeometry(0.5, 20);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.5, 6.6), new THREE.MeshLambertMaterial({ color: 0x111111 }));
  back.position.copy(world(p, 0, 9)).add(new THREE.Vector3(-p.tx * 0.75, -1.1, p.ty * 0.75));
  back.rotation.y = Math.atan2(p.ty, p.tx);
  scene.add(back);
  for (let k = 0; k < 5; k++) {
    const m = new THREE.Mesh(lampGeo, new THREE.MeshBasicMaterial({ color: 0x2A0A08 }));
    m.position.copy(world(p, (k - 2) * 1.25, 7.9)).add(new THREE.Vector3(-p.tx * 0.95, 0, p.ty * 0.95));
    m.rotation.y = Math.atan2(p.ty, p.tx) - Math.PI / 2;
    scene.add(m);
    startLamps.push(m.material);
  }
  for (const s of [1, -1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(1, 9, 1), new THREE.MeshLambertMaterial({ color: 0xFF2B12 }));
    post.position.copy(world(p, s * (h + 1.5), 4.5));
    scene.add(post);
  }
}

// 前方引導線：依模型的加速／彎中／煞車狀態上色，看得到前面是不是要煞車、往哪邊彎
const AHEAD = 90, AH_STEP = 4;             // 360 m
const guideMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85,
  side: THREE.DoubleSide, depthWrite: false, ...poly(5) });
const guide = (() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(AHEAD * 6), 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(AHEAD * 6), 3));
  const idx = [];
  for (let n = 0; n < AHEAD - 1; n++) { const a = n * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  g.setIndex(idx);
  const m = new THREE.Mesh(g, guideMat);
  m.frustumCulled = false;
  scene.add(m);
  return m;
})();
const ST_COL = [new THREE.Color(0x3CE07A), new THREE.Color(0xFFD60A), new THREE.Color(0xFF2B12)];
// 輔助等級：2 新手（自動煞車＋轉向輔助＋提示）、1 進階（只有提示）、0 關
const LEVEL_NAME = ['關', '進階', '新手'];
let level = 2;
let assist = true;
function updateGuide() {
  guide.visible = assist;
  if (!assist) return;
  const pa = guide.geometry.attributes.position, ca = guide.geometry.attributes.color;
  for (let n = 0; n < AHEAD; n++) {
    const d = S + n * AH_STEP, p = at(d), i = Math.round(wrap(d) / STEP) % N;
    const c = ST_COL[TRACK.st[i]] || ST_COL[0];
    const w = 0.32;
    const a = world(p, -w, 0.22), b = world(p, w, 0.22);
    pa.setXYZ(n * 2, a.x, a.y, a.z); pa.setXYZ(n * 2 + 1, b.x, b.y, b.z);
    ca.setXYZ(n * 2, c.r, c.g, c.b); ca.setXYZ(n * 2 + 1, c.r, c.g, c.b);
  }
  pa.needsUpdate = true; ca.needsUpdate = true;
}

// 車
const car = new THREE.Group();
{
  const paint = new THREE.MeshLambertMaterial({ color: 0xFFD60A });
  const dark = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const add = (w, h, d, x, y, z, m) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z); car.add(b);
  };
  // 車頭朝 +X（與 heading 一致）
  add(3.2, 0.42, 0.75, 0.2, 0.42, 0, paint);      // 鼻錐到座艙
  add(1.8, 0.55, 1.35, -0.9, 0.5, 0, paint);      // 側箱
  add(1.3, 0.75, 0.55, -1.3, 0.85, 0, paint);     // 引擎蓋
  add(0.55, 0.28, 0.5, -0.1, 0.8, 0, dark);       // 座艙開口
  add(0.45, 0.07, 2.1, 2.1, 0.2, 0, dark);        // 前翼
  add(0.55, 0.12, 1.6, -2.45, 1.25, 0, paint);    // 尾翼主板
  add(0.55, 0.7, 0.08, -2.45, 0.9, 0.78, dark);   // 尾翼側板
  add(0.55, 0.7, 0.08, -2.45, 0.9, -0.78, dark);
  add(0.25, 0.25, 0.25, -2.55, 0.45, 0, new THREE.MeshBasicMaterial({ color: 0xFF2B12 }));  // 尾燈
  for (const [x, z, r] of [[1.35, 0.95, 0.34], [1.35, -0.95, 0.34], [-1.55, 0.98, 0.38], [-1.55, -0.98, 0.38]]) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.42, 16), dark);
    t.rotation.x = Math.PI / 2; t.position.set(x, r, z); car.add(t);
  }
}
scene.add(car);

// ---- 小地圖 ---------------------------------------------------------
const map = $('map');
{
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let i = 0; i < N; i++) {
    x0 = Math.min(x0, TRACK.x[i]); x1 = Math.max(x1, TRACK.x[i]);
    y0 = Math.min(y0, TRACK.y[i]); y1 = Math.max(y1, TRACK.y[i]);
  }
  const sc = 84 / Math.max(x1 - x0, y1 - y0);
  var mp = (x, y) => [8 + (x - x0) * sc + (84 - (x1 - x0) * sc) / 2, 92 - (y - y0) * sc - (84 - (y1 - y0) * sc) / 2];
  const pts = closed.map(i => mp(TRACK.x[i], TRACK.y[i]).map(v => v.toFixed(1)).join(',')).join(' ');
  map.innerHTML = `<polyline points="${pts}" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>
    <circle id="dot" r="3.6" fill="#FFD60A" stroke="#0D0D0D" stroke-width="1"/>`;
}
const dot = $('dot');

// ---- 操作 -----------------------------------------------------------
const key = { up: 0, down: 0, left: 0, right: 0 };
const KEYMAP = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down',
  ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
addEventListener('keydown', e => {
  if (KEYMAP[e.key]) { key[KEYMAP[e.key]] = 1; e.preventDefault(); }
  else if (e.key === 'c' || e.key === 'C') toggleCam();
  else if (e.key === 'r' || e.key === 'R') restart();
});
addEventListener('keyup', e => { if (KEYMAP[e.key]) key[KEYMAP[e.key]] = 0; });
addEventListener('blur', () => { for (const k in key) key[k] = 0; });
for (const [id, k] of [['tl', 'left'], ['tr', 'right'], ['brk', 'down'], ['gas', 'up']]) {
  const b = $(id);
  const on = v => e => { e.preventDefault(); key[k] = v; b.classList.toggle('on', !!v); };
  b.addEventListener('pointerdown', on(1));
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, on(0));
}

let chase = true;
function toggleCam() {
  chase = !chase;
  $('cam').textContent = `視角：${chase ? '車後' : '車載'}`;
  car.visible = chase;
}
$('cam').onclick = toggleCam;
$('restart').onclick = () => restart();
$('cam').textContent = '視角：車後';
$('assist').onclick = () => {
  level = (level + 2) % 3; assist = level > 0;
  $('assist').textContent = `輔助：${LEVEL_NAME[level]}`;
};

// ---- 車輛狀態與計時 -------------------------------------------------
const store = {
  get() { try { return JSON.parse(localStorage.getItem(`drive-best-${ID}`)); } catch { return null; } },
  set(v) { try { localStorage.setItem(`drive-best-${ID}`, JSON.stringify(v)); } catch { /* 無痕模式不存 */ } }
};
let best = store.get();          // { lap, splits:[t1,t2] }
const fmt = t => {
  if (t == null || !isFinite(t)) return '—';
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${m}:${s.toFixed(3).padStart(6, '0')}`;
};
const showBest = () => { $('best').textContent = fmt(best?.lap); };
showBest();

const GRID = 8;                   // 起跑格在起跑線後方幾公尺
let hitT = 0, msgT = 0, penalty = 0, jumped = false;
let S, O, PSI, V, prog, lapNo, lapT, splits, phase, phaseT, steer, camHead, lastLap, laps, raceT, holdT;
let LAPS = +(new URLSearchParams(location.search).get('laps')) || 3;
$('laps').value = String(LAPS);
$('laps').onchange = () => { LAPS = +$('laps').value; restart(); };

function restart() {
  S = wrap(L - GRID); O = 0; PSI = 0; V = 0; prog = -GRID;
  lapNo = 1; lapT = 0; splits = []; steer = 0; lastLap = null;
  phase = 'count'; phaseT = 0; camHead = null; laps = []; raceT = 0; penalty = 0; jumped = false;
  $('howto').hidden = false; $('pen').textContent = '';
  holdT = 0.4 + Math.random() * 0.9;       // 五燈全亮後的隨機等待，跟真的起跑一樣抓不準
  $('result').hidden = true;
  msgT = 0; $('msg').textContent = '';
  $('last').textContent = '—'; $('delta').textContent = ''; $('delta').className = '';
}
restart();

// ---- 物理 -----------------------------------------------------------
const P = {
  accel: 15,        // 起步加速度 m/s²
  vmax: 98,         // 約 350 km/h 上限；實際由空氣阻力壓低
  brake: 42,
  grip0: 26, gripDf: 0.0058,   // 側向抓地：基礎 + 下壓力（隨速度平方）
  wheelbase: 3.6, maxCurv: 0.16,
};

/** 前方 400 m 內，依模型彎速與煞車能力，現在最多能跑多快（新手自動煞車用）。 */
function safeSpeed(s) {
  let v = 1e9;
  for (let a = 0; a <= 400; a += 8) {
    const w = TRACK.v[Math.round(wrap(s + a) / STEP) % N] / 3.6 * 0.97;
    v = Math.min(v, Math.sqrt(w * w + 2 * 30 * a));
  }
  return v;
}

function step(dt) {
  const p = at(S);
  const half = p.half;
  const off = Math.abs(O) > half + 0.9;

  // 轉向輸入：按鍵平滑進出，速度越高可用的方向盤角度越小
  const target = key.right - key.left;
  const rate = target === 0 ? 8 : (Math.sign(target) !== Math.sign(steer) ? 6 : 2.6);
  steer += Math.max(-rate * dt, Math.min(rate * dt, target - steer));
  // 全鎖時要求的曲率＝抓地極限的 1.5 倍（再多打也只是推頭），低速則受轉向幾何限制
  const grip = (P.grip0 + P.gripDf * V * V) * (off ? 0.5 : 1);
  const kMax = grip / Math.max(V * V, 1);
  let req = -steer * Math.min(P.maxCurv, 1.1 * kMax);
  if (level === 2) {
    // 轉向輔助：車自己會順著賽道彎，玩家只需修正；並把車頭慢慢拉回與賽道平行
    req += p.k * 0.9 - PSI * 0.06 - O * 0.0025;
  }
  const kEff = Math.max(-kMax, Math.min(kMax, req));
  const over = Math.max(0, Math.abs(req) - kMax) / Math.max(Math.abs(req), 1e-6);

  // 縱向
  let a = 0;
  if (phase === 'done') a -= 8 * (V > 0.5 ? 1 : 0);
  if (phase === 'run') {
    if (key.up) a += P.accel * Math.max(0, 1 - Math.pow(V / P.vmax, 2)) * (V < 25 ? 1 : 0.8 + 0.2 * 25 / V);
    if (key.down) a -= P.brake * (V > 0.5 ? 1 : 0);
    else if (level === 2 && V > safeSpeed(S) * 1.02) a -= P.brake * 0.9;   // 自動煞車
  }
  a -= 0.0012 * V * V * 0.5;                  // 空氣阻力
  // 阻力都跟速度成正比：高速時罰得重，停下來以後油門一定推得動
  a -= Math.min(1.2, V * 0.1);                // 滾動阻力
  if (off) a -= Math.min(16, V * 0.35);       // 路面外
  a -= over * 9;                              // 推頭掉速
  V = Math.max(0, V + a * dt);

  // 姿態與位置（賽道座標）
  const kappa = p.k;
  const sDot = V * Math.cos(PSI) / Math.max(0.3, 1 - kappa * O);
  PSI += (V * kEff - kappa * sDot) * dt;
  if (PSI > Math.PI) PSI -= 2 * Math.PI; else if (PSI < -Math.PI) PSI += 2 * Math.PI;
  O += V * Math.sin(PSI) * dt;
  S = wrap(S + sDot * dt);
  if (phase === 'run') prog += sDot * dt;

  // 撞牆：離中心線太遠就擋住，並重扣速度
  const wall = half + 9;
  if (Math.abs(O) > wall) {
    O = Math.sign(O) * wall;
    if (Math.sign(Math.sin(PSI)) === Math.sign(O)) {
      PSI *= 0.35;
      V *= Math.exp(-4 * dt);
      hitT = 0.6;
    }
  }
  // 倒車拉回：車頭超過 100° 就提示
  return p;
}

// ---- 每幀 -----------------------------------------------------------
let last = performance.now();
const msg = $('msg');
const say = (t, small = false) => { msg.textContent = t; msg.className = small ? 'small' : ''; };

function checkTiming(dt) {
  if (phase !== 'run') return;
  lapT += dt; raceT += dt;
  // 分段（三等分）
  const sec = Math.floor(Math.max(0, prog) / (L / 3));
  if (sec >= 1 && sec <= 2 && splits.length < sec) {
    splits.push(lapT);
    if (best?.splits?.[sec - 1] != null) showDelta(lapT - best.splits[sec - 1]);
  }
  if (prog >= L) {
    const t = lapT;
    lastLap = t;
    $('last').textContent = fmt(t);
    const isBest = !best || t < best.lap;
    if (isBest) { best = { lap: t, splits: [...splits] }; store.set(best); showBest(); }
    showDelta(best && !isBest ? t - best.lap : null, isBest);
    laps.push(t);
    lapNo++; lapT = 0; splits = []; prog -= L;
    if (laps.length >= LAPS) finish();
  }
}
// ---- 集章與獎牌 ---------------------------------------------------
// 每條賽道完賽一次＝蓋一個章；存在這台裝置（沒有帳號系統）
const TIERS = [
  { n: 5, key: 'bronze', name: '銅牌', color: '#C77B3A' },
  { n: 12, key: 'silver', name: '銀牌', color: '#BFC4CC' },
  { n: ALL.length, key: 'gold', name: '金牌・全冠', color: '#FFD60A' },
];
const stamps = {
  get() { try { return JSON.parse(localStorage.getItem('drive-stamps')) || {}; } catch { return {}; } },
  set(v) { try { localStorage.setItem('drive-stamps', JSON.stringify(v)); } catch { /* 無痕模式不存 */ } },
};
const tierOf = n => TIERS.filter(t => n >= t.n).pop() || null;
function stamp(fast) {
  const st = stamps.get(), before = Object.keys(st).length;
  const isNew = !st[ID];
  if (isNew || fast < st[ID]) st[ID] = fast;
  stamps.set(st);
  const after = Object.keys(st).length;
  const tb = tierOf(before), ta = tierOf(after);
  return { isNew, count: after, newTier: ta && ta !== tb ? ta : null };
}
function renderStampLine(a) {
  const next = TIERS.find(t => a.count < t.n);
  const tier = tierOf(a.count);
  $('r-stamp').innerHTML = `<b>${a.isNew ? '新蓋章！' : '已蓋過章'}</b> 集章 ${a.count} / ${ALL.length}`
    + (tier ? `<span class="medal" style="background:${tier.color}">${tier.name}</span>` : '')
    + (next ? `<small>再完成 ${next.n - a.count} 條賽道拿${next.name}</small>` : '<small>全部完賽，恭喜！</small>');
}
function celebrate(t) {
  const el = $('celebrate');
  $('c-medal').style.background = t.color;
  $('c-medal').textContent = t.key === 'gold' ? '★' : t.n;
  $('c-title').textContent = `拿到${t.name}！`;
  $('c-sub').textContent = t.key === 'gold'
    ? `${ALL.length} 條賽道全部完賽。開香檳！`
    : `完成 ${t.n} 條賽道。繼續集章，下一面獎牌在等你。`;
  el.hidden = false;
  if (t.key === 'gold') champagne();
}
$('c-ok').onclick = () => { $('celebrate').hidden = true; };
function champagne() {
  const box = $('celebrate');
  for (let k = 0; k < 90; k++) {
    const b = document.createElement('i');
    b.className = 'bub';
    const x = 50 + (Math.random() - 0.5) * 30;
    b.style.left = x + '%';
    b.style.setProperty('--dx', (Math.random() - 0.5) * 70 + 'vw');
    b.style.setProperty('--dy', -(40 + Math.random() * 60) + 'vh');
    b.style.animationDelay = Math.random() * 1.2 + 's';
    b.style.background = ['#FFD60A', '#FFFFFF', '#FFE98A', '#FF2B12'][k % 4];
    box.appendChild(b);
    setTimeout(() => b.remove(), 4000);
  }
}

// 護照：23 條賽道的集章狀態
function openPassport() {
  const st = stamps.get(), n = Object.keys(st).length, tier = tierOf(n);
  const pick = $('pick');
  $('p-count').textContent = `${n} / ${ALL.length}`;
  $('p-tiers').innerHTML = TIERS.map(t =>
    `<span class="${n >= t.n ? 'got' : ''}" style="--c:${t.color}">${t.name}<small>${t.n} 條</small></span>`).join('');
  $('p-grid').innerHTML = ALL.map(t => {
    const label = pick.querySelector(`[value="${t}"]`)?.textContent || t;
    return `<a href="?t=${t}&laps=${LAPS}" class="${st[t] ? 'ok' : ''}"><em>${st[t] ? '✓' : ''}</em>`
      + `<span>${label}</span><b>${st[t] ? fmt(st[t]) : '未完賽'}</b></a>`;
  }).join('');
  $('passport').hidden = false;
}
$('pass').onclick = openPassport;
$('p-close').onclick = () => { $('passport').hidden = true; };
$('r-pass').onclick = () => { $('result').hidden = true; openPassport(); };
$('help-btn').onclick = () => { $('howto').hidden = !$('howto').hidden; };

function finish() {
  phase = 'done';
  lapNo = LAPS; lapT = laps[laps.length - 1];
  const total = laps.reduce((a, b) => a + b, 0) + penalty, fast = Math.min(...laps);
  const award = stamp(fast);
  const rec = best && Math.abs(best.lap - fast) < 1e-9;
  $('r-title').textContent = `${META.flag} ${META.title}・${LAPS} 圈`;
  $('r-total').textContent = fmt(total);
  $('total').textContent = fmt(total);
  $('r-laps').innerHTML = laps.map((t, i) =>
    `<li class="${t === fast ? 'f' : ''}"><span>LAP ${i + 1}</span><b>${fmt(t)}</b></li>`).join('');
  $('r-note').textContent = (penalty ? `含搶跑罰 ${penalty} 秒。` : '')
    + (rec ? '刷新這台裝置的最快圈！' : `這台裝置的最快圈：${fmt(best?.lap)}`);
  renderStampLine(award);
  say('FINISH'); msgT = 0;
  setTimeout(() => {
    if (phase !== 'done') return;
    say(''); $('result').hidden = false;
    if (award.newTier) celebrate(award.newTier);
  }, 1400);
}
$('r-again').onclick = () => restart();

function showDelta(d, isBest = false) {
  const el = $('delta');
  if (isBest) { el.textContent = '最快圈！'; el.className = 'down'; }
  else if (d == null) el.textContent = '';
  else { el.textContent = (d >= 0 ? '+' : '−') + Math.abs(d).toFixed(3); el.className = d >= 0 ? 'up' : 'down'; }
  clearTimeout(showDelta.t);
  showDelta.t = setTimeout(() => { el.textContent = ''; }, 3500);
}

const turns = (TRACK.turns || []).slice().sort((a, b) => a.from - b.from);
const turnDir = t => {                       // 彎的方向：區間內曲率總和的正負
  let sum = 0;
  for (let d = t.from; d <= t.to; d += STEP) sum += K[Math.round(d / STEP) % N];
  return sum >= 0 ? 'L' : 'R';
};
const turnEl = $('turn');
function updateTurn() {
  if (!assist) { turnEl.style.opacity = 0; return; }
  let best = null, bd = 1e9;
  for (const t of turns) {
    let ds = wrap(t.from - S);
    const inside = wrap(S - t.from) <= (t.to - t.from);
    if (inside) ds = 0;
    if (ds < bd) { bd = ds; best = t; }
  }
  // 前方煞車點
  let brake = null;
  for (let a = 0; a < 420; a += STEP) {
    if (TRACK.st[Math.round(wrap(S + a) / STEP) % N] === 2) { brake = a; break; }
  }
  if (!best || bd > 500) { turnEl.style.opacity = 0; return; }
  const dir = turnDir(best);
  turnEl.style.opacity = 1;
  turnEl.className = dir;
  turnEl.innerHTML = `<i>${dir === 'L' ? '◀' : '▶'}</i><b>${bd === 0 ? '彎中' : Math.round(bd / 10) * 10 + ' m'}</b>`
    + `<span>T${best.n} ${dir === 'L' ? '左彎' : '右彎'}${brake === null || bd === 0 ? '' : brake < 10 ? '<em>煞車！</em>' : `<em>煞車 ${Math.round(brake / 10) * 10} m</em>`}</span>`;
}

const hudLamps = [...document.querySelectorAll('#lights i')];
function setLights(n) {
  startLamps.forEach((m, k) => m.color.setHex(k < n ? 0xFF2B12 : 0x2A0A08));
  hudLamps.forEach((el, k) => el.classList.toggle('on', k < n));
  $('lights').style.opacity = phase === 'count' ? 1 : 0;
}

function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // 起跑倒數
  if (phase === 'count') {
    phaseT += dt;
    const on = Math.min(5, Math.floor(phaseT / 0.9));      // 每 0.9 秒亮一盞
    setLights(on);
    // 搶跑：第一盞燈亮之後、燈滅之前踩油門，罰 5 秒（只罰一次）
    if (on > 0 && key.up && !jumped) { jumped = true; penalty += 5; say('搶跑！罰 5 秒', true); msgT = 99; }
    if (on === 5 && phaseT >= 5 * 0.9 + holdT) {
      phase = 'run'; phaseT = 0; setLights(0); $('howto').hidden = true;
      if (jumped) { $('pen').textContent = '+5 秒 搶跑'; say('搶跑罰 5 秒', true); msgT = 1.6; }
      else { say('GO'); msgT = 0.8; }
    }
  } else if (msgT > 0) { msgT -= dt; if (msgT <= 0) say(''); }

  // 物理用固定小步長，高速時比較穩
  const n = Math.max(1, Math.ceil(dt / 0.008));
  let p;
  for (let i = 0; i < n; i++) p = step(dt / n);
  checkTiming(dt);
  if (hitT > 0) hitT -= dt;

  if (phase === 'run') {
    if (Math.abs(PSI) > 1.9 && V < 8) say('車頭反了：按 R 重新出發', true);
    else if (hitT > 0) say('撞牆！', true);
    else if (Math.abs(O) > p.half + 0.9) say('離開賽道，會被罰慢', true);
    else if (!msgT) say('');
  }

  // 車輛與相機
  const pos = world(p, O, 0.55);
  const theta = Math.atan2(p.ty, p.tx) + PSI;
  const dir = new THREE.Vector3(Math.cos(theta), 0, -Math.sin(theta));
  car.position.copy(pos);
  car.rotation.y = theta;
  if (camHead == null) camHead = theta;
  const dh = Math.atan2(Math.sin(theta - camHead), Math.cos(theta - camHead));
  camHead += dh * Math.min(1, dt * (chase ? 9 : 20));
  // 車後視角：鏡頭方向＝車頭 70%＋賽道走向 30%，打滑或修方向時畫面比較穩
  const trackHead = Math.atan2(p.ty, p.tx);
  const camDir = chase ? camHead + 0.3 * Math.atan2(Math.sin(trackHead - camHead), Math.cos(trackHead - camHead)) : camHead;
  const cd = new THREE.Vector3(Math.cos(camDir), 0, -Math.sin(camDir));
  const fovT = 66 + Math.min(14, V / 7);
  camera.fov += (fovT - camera.fov) * Math.min(1, dt * 4);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  const ahead = at(S + (chase ? 22 : 38));
  const aw = world(ahead, O * 0.5, 0);
  if (chase) {
    camera.position.copy(pos).addScaledVector(cd, -11).add(new THREE.Vector3(0, 5.2, 0));
    camera.lookAt(aw.addScaledVector(cd, 0).add(new THREE.Vector3(0, 0.6, 0)));
  } else {
    camera.position.copy(pos).addScaledVector(dir, 0.3).add(new THREE.Vector3(0, 1.6, 0));
    // 看向前方路面上的一點：上坡頂端、下坡都會自然抬頭／低頭
    camera.lookAt(aw.add(new THREE.Vector3(0, 0.4, 0)));
  }
  updateGuide();
  updateTurn();

  // HUD
  $('lapn').textContent = `${Math.min(lapNo, LAPS)}/${LAPS}`;
  $('cur').textContent = fmt(lapT);
  $('kmh').textContent = Math.round(V * 3.6);
  $('thr').style.width = (key.up && phase === 'run' ? 100 : 0) + '%';
  if (phase !== 'done') $('total').textContent = fmt(raceT);
  $('brkbar').style.width = (key.down ? 100 : 0) + '%';
  const [mx, my] = mp(p.x - p.ty * O, p.y + p.tx * O);
  dot.setAttribute('cx', mx); dot.setAttribute('cy', my);

  renderer.render(scene, camera);
}

addEventListener('resize', () => renderer.setSize(innerWidth, innerHeight));
requestAnimationFrame(tick);
// 除錯用：不經渲染快轉物理，bot(state) 每步回傳按鍵
window.__drive = { sim(sec, bot) { phase = 'run'; $('howto').hidden = true; setLights(0); let mx = 0; const dt = 0.008;
    let off = 0, wall = 0, stuck = 0;
    for (let t = 0; t < sec && phase === 'run'; t += dt) {
      bot(); hitT = 0; const p = step(dt); checkTiming(dt); mx = Math.max(mx, Math.abs(O));
      if (Math.abs(O) > p.half + 0.9) off += dt;
      if (hitT > 0) wall += dt;
      if (V < 3) stuck += dt;
    }
    this.last = { off, wall, stuck, laps: [...laps] };
    return mx; }, get state() { return { S, O, PSI, V, prog, lapNo, lapT, phase }; }, key };
