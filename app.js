import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ---------------------------------------------------------------
   賽道解剖
   中心線：OpenStreetMap way 串接（build_track.py）
   高程：國土地理院 DEM／open-meteo（fetch_elev.py）
   速度：由曲率推算的模型（prepare_web.py），不是實測遙測
   每條賽道的資料放在 tracks/<id>.js 與 tracks/<id>_corners.js
--------------------------------------------------------------- */

const ID = document.body.dataset.track || 'suzuka';
const { TRACK } = await import(`./tracks/${ID}.js`);
const { CORNERS, META } = await import(`./tracks/${ID}_corners.js`);

const N = TRACK.x.length;
const SPEED_MODE = TRACK.profile === 'speed';   // 用速度／煞車當視覺語言
const WIDTH_DEFAULT = 12;
const WIDTH_STRAIGHT = 15;
const KERB_K = 0.012;          // 曲率門檻，超過才畫路緣石

// ---- 中心線幾何 ----------------------------------------------------
const cross = META.crossover;
const clearance = i => cross
  ? cross.drop * Math.exp(-Math.pow((TRACK.d[i] - cross.at) / cross.span, 2))
  : 0;
const widthAt = i => (TRACK.d[i] < 800 ? WIDTH_STRAIGHT : WIDTH_DEFAULT);

/** 第 i 個取樣點的切線方向（單位向量，平面上）。 */
function tangent(i) {
  const a = (i - 1 + N) % N, b = (i + 1) % N;
  const tx = TRACK.x[b] - TRACK.x[a], ty = TRACK.y[b] - TRACK.y[a];
  const l = Math.hypot(tx, ty) || 1;
  return [tx / l, ty / l];
}

/** 把中心線點換算成 three.js 座標（X=東, Y=高度, Z=南）。 */
function pointAt(i, exag, offset = 0, lift = 0) {
  const [tx, ty] = tangent(i);
  const x = TRACK.x[i] + -ty * offset;
  const y = TRACK.y[i] + tx * offset;
  return new THREE.Vector3(x, (TRACK.z[i] - clearance(i)) * exag + lift, -y);
}

/** 用兩條偏移線織成一條帶狀面。indices 為 null 時是封閉迴圈。 */
function ribbon(exag, lift, indices = null) {
  const idx = indices || [...Array(N).keys()];
  const closed = indices === null;
  const pos = [], tri = [];
  for (const i of idx) {
    pointAt(i, exag, 0, lift).toArray(pos, pos.length);
    pointAt(i, exag, 0, lift).toArray(pos, pos.length);
  }
  const m = idx.length;
  for (let s = 0; s < (closed ? m : m - 1); s++) {
    const a = (s * 2) % (m * 2), b = a + 1;
    const c = ((s + 1) % m) * 2, d = c + 1;
    tri.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(tri);
  return g;
}

/** 把帶狀面的兩條邊設到指定的偏移量。 */
function setEdges(g, idx, exag, offA, offB, lift) {
  const p = g.attributes.position;
  idx.forEach((i, j) => {
    pointAt(i, exag, offA(i), lift).toArray(p.array, j * 6);
    pointAt(i, exag, offB(i), lift).toArray(p.array, j * 6 + 3);
  });
  p.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

const allIdx = [...Array(N).keys()];
const rangeIdx = (from, to) => allIdx.filter(i => TRACK.d[i] >= from && TRACK.d[i] <= to);

/** 曲率夠大的連續區段（畫路緣石用）。 */
function corneringRuns() {
  const runs = [];
  let cur = null;
  for (let i = 0; i < N; i++) {
    if (Math.abs(TRACK.k[i]) > KERB_K) (cur ??= []).push(i);
    else if (cur) { if (cur.length > 4) runs.push(cur); cur = null; }
  }
  if (cur && cur.length > 4) runs.push(cur);
  return runs;
}

// ---- 場景 ----------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0D0D0D);        // 黑舞台，跟首頁賽程區同色
scene.fog = new THREE.Fog(0x0D0D0D, 3200, 9000);

const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.4, 16000);
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.getElementById('stage').appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.49;

scene.add(new THREE.AmbientLight(0xffffff, 0.78));
const sun = new THREE.DirectionalLight(0xffffff, 1.1);
sun.position.set(-900, 1400, 700);
scene.add(sun);

const centre = new THREE.Vector3(
  TRACK.x.reduce((a, b) => a + b, 0) / N, 0,
  -TRACK.y.reduce((a, b) => a + b, 0) / N);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(12000, 12000),
  new THREE.MeshBasicMaterial({ color: 0x141414 }));
ground.rotation.x = -Math.PI / 2;
ground.position.set(centre.x, -0.6, centre.z);
scene.add(ground);

// ---- 材質 -----------------------------------------------------------
// 速度模式的三種狀態：0 加速、1 彎中、2 煞車
const STATE_COLOR = [0xF5F5F5, 0x8C8C8C, 0xFF2B12];   // 黑底上：白＝加速、灰＝彎中、紅＝煞車
const STATE_DIM = [0x333333, 0x262626, 0x4A1C16];
const STATE_LABEL = ['加速區', '彎中', '煞車區'];

const MAT = {
  road:  new THREE.MeshLambertMaterial({ color: 0x4A4A4A }),      // 車載視角的柏油色：要比黑地面亮一階，路才浮得出來
  roadLight: new THREE.MeshLambertMaterial({ color: 0xEDEDED }), // 全景：黑底上的白色賽道
  roadV: new THREE.MeshBasicMaterial({ vertexColors: true }),
  bandV: new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.62 }),
  line:  new THREE.MeshBasicMaterial({ color: 0xFFFFFF, polygonOffset: true,
                                       polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
  kerbA: new THREE.MeshBasicMaterial({ color: 0xFF2B12, polygonOffset: true,
                                       polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
  kerbB: new THREE.MeshBasicMaterial({ color: 0xFFD60A, polygonOffset: true,
                                       polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
  skirt: new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true,
                                       opacity: 0.12, side: THREE.DoubleSide }),
  shade: new THREE.MeshBasicMaterial({ color: 0x262626, transparent: true, opacity: 0.9 }),
  hot:   new THREE.MeshBasicMaterial({ color: 0xFFD60A }),       // 選取＝黃，全站一致
};

const trackGroup = new THREE.Group();
scene.add(trackGroup);
let hotMesh = null, bandMesh = null, roadMesh = null;
// 全景才需要的圖解層（側裙、地面投影、狀態色帶），車載時全部收起來
const diagramMeshes = [];

function buildTrack(exag) {
  trackGroup.clear();
  diagramMeshes.length = 0;
  hotMesh = null;
  const half = i => widthAt(i) / 2;

  // 路面
  const road = ribbon(exag, 0.15);
  setEdges(road, allIdx, exag, half, i => -half(i), 0.15);
  if (SPEED_MODE) {
    // 依「誰在限制車速」上色；選了彎角時，其他段落淡出
    const col = [];
    for (const i of allIdx) {
      const inRange = !activeCorner ||
        (TRACK.d[i] >= activeCorner.from && TRACK.d[i] <= activeCorner.to);
      const c = new THREE.Color((inRange ? STATE_COLOR : STATE_DIM)[TRACK.st[i]]);
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    }
    road.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    // 從駕駛座看，整條路面塗成狀態色會太搶；車載時換回柏油色
    roadMesh = new THREE.Mesh(road, onboard ? MAT.road : MAT.roadV);
  } else {
    roadMesh = new THREE.Mesh(road, onboard ? MAT.road : MAT.roadLight);
  }
  trackGroup.add(roadMesh);

  // 速度模式：在路面下方鋪一條加寬的示意色帶，讓狀態在全景也看得出來
  if (SPEED_MODE) {
    const BAND = 22;                       // 半寬（公尺），純視覺，不是真實路寬
    const band = ribbon(exag, 0.02);
    setEdges(band, allIdx, exag, () => BAND, () => -BAND, 0.02);
    const col = [];
    for (const i of allIdx) {
      const inRange = !activeCorner ||
        (TRACK.d[i] >= activeCorner.from && TRACK.d[i] <= activeCorner.to);
      const c = new THREE.Color((inRange ? STATE_COLOR : STATE_DIM)[TRACK.st[i]]);
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    }
    band.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    bandMesh = new THREE.Mesh(band, MAT.bandV);
    diagramMeshes.push(bandMesh);
    trackGroup.add(bandMesh);
  }

  // 白色邊線
  for (const s of [1, -1]) {
    const g = ribbon(exag, 0.4);
    setEdges(g, allIdx, exag, i => s * half(i), i => s * (half(i) - 0.35), 0.4);
    trackGroup.add(new THREE.Mesh(g, MAT.line));
  }

  // 路緣石：只出現在彎中，紅白相間
  for (const run of corneringRuns()) {
    const side = TRACK.k[run[Math.floor(run.length / 2)]] > 0 ? 1 : -1;
    for (let s = 0; s < run.length - 1; s += 3) {
      const chunk = run.slice(s, Math.min(s + 4, run.length));
      const g = ribbon(exag, 0.32, chunk);
      setEdges(g, chunk, exag, i => side * half(i), i => side * (half(i) + 1.3), 0.32);
      trackGroup.add(new THREE.Mesh(g, (s / 3) % 2 ? MAT.kerbA : MAT.kerbB));
    }
  }

  // 有高低差才畫地面投影與側裙，平的賽道畫了只是雜訊
  if (!TRACK.flat) {
    const shade = ribbon(exag, 0);
    setEdges(shade, allIdx, exag, half, i => -half(i), 0);
    const sp = shade.attributes.position;
    for (let i = 0; i < N; i++) { sp.array[i * 6 + 1] = -0.5; sp.array[i * 6 + 4] = -0.5; }
    sp.needsUpdate = true;
    const shadeMesh = new THREE.Mesh(shade, MAT.shade);
    diagramMeshes.push(shadeMesh);
    trackGroup.add(shadeMesh);

    for (const s of [1, -1]) {
      const g = ribbon(exag, 0);
      setEdges(g, allIdx, exag, i => s * half(i), i => s * half(i), 0);
      const p = g.attributes.position;
      for (let i = 0; i < N; i++) p.array[i * 6 + 4] = -0.5;
      p.needsUpdate = true;
      const skirtMesh = new THREE.Mesh(g, MAT.skirt);
      diagramMeshes.push(skirtMesh);
      trackGroup.add(skirtMesh);
    }
  }

  for (const m of diagramMeshes) m.visible = !onboard;
  if (activeCorner && !SPEED_MODE) highlight(activeCorner, exag);
}

/** 有高程的賽道用一條朱紅色的帶子標出選取的彎角。 */
function highlight(c, exag) {
  if (hotMesh) trackGroup.remove(hotMesh);
  hotMesh = null;
  if (!c) return;
  const idx = rangeIdx(c.from, c.to);
  const g = ribbon(exag, 0.7, idx);
  setEdges(g, idx, exag, i => widthAt(i) / 2 - 0.5, i => -widthAt(i) / 2 + 0.5, 0.7);
  hotMesh = new THREE.Mesh(g, MAT.hot);
  trackGroup.add(hotMesh);
}

// ---- 頁首與彎角卡 ---------------------------------------------------
document.getElementById('eyebrow').textContent = `Circuit Anatomy — ${META.index}`;
document.getElementById('title').textContent = META.title;
document.getElementById('subtitle').innerHTML =
  `<span class="flag">${META.flag}</span>${META.place}`
  + `<em>${META.tagline}</em>`;
document.getElementById('facts').innerHTML = META.facts
  .map(f => `<div class="fact"><b>${f.v}</b><span>${f.k}</span></div>`).join('');
document.getElementById('hint').textContent =
  '拖曳旋轉、滾輪縮放。' + META.hint + ' 非官方資訊，與任何賽事主辦單位無關。';
document.getElementById('other').outerHTML = META.others
  .map(o => `<a class="btn link" href="${o.href}">${o.label}</a>`).join('');

// 速度模式加一條圖例
if (SPEED_MODE) {
  document.getElementById('legend').innerHTML = STATE_LABEL
    .map((l, i) => `<span><i style="background:#${STATE_COLOR[i].toString(16)
      .padStart(6, '0')}"></i>${l}</span>`).join('');
}

const cardsEl = document.getElementById('cards');
let activeCorner = null;

for (const c of CORNERS) {
  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <div class="k"><b>${c.label}</b><i>${c.sub}</i></div>
    <div class="lead">${c.lead}</div>
    <div class="body">
      <ul>${c.why.map(w => `<li>${w}</li>`).join('')}</ul>
      <div class="view">觀戰視角：${c.view}</div>
      <button class="btn" data-view="${c.id}">移到看台視角</button>
    </div>`;
  el.addEventListener('click', e => {
    if (e.target.dataset.view) { grandstand(c); return; }
    selectCorner(activeCorner === c ? null : c);
  });
  c.el = el;
  cardsEl.appendChild(el);
}

function selectCorner(c) {
  activeCorner = c;
  for (const k of CORNERS) k.el.classList.toggle('on', k === c);
  if (SPEED_MODE) buildTrack(exag);      // 重上色：選取段落之外淡出
  else highlight(c, exag);
  drawProfile();
  if (c) flyTo(c);
}

/** 拉高俯視該彎，看整體形狀。 */
function flyTo(c) {
  stopOnboard();
  const idx = rangeIdx(c.from, c.to);
  const mid = idx[Math.floor(idx.length / 2)];
  const t = pointAt(mid, exag);
  const span = Math.max(340, (c.to - c.from) * 1.4);
  animateCam(t.clone().add(new THREE.Vector3(span * 0.7, span * 0.75, span * 0.7)), t);
}

/** 移到彎外側的看台高度，模擬觀眾實際看到的角度。 */
function grandstand(c) {
  stopOnboard();
  if (!TRACK.flat) setExag(1.5);          // 看台視角要接近真實比例
  const idx = rangeIdx(c.from, c.to);
  const mid = idx[Math.floor(idx.length / 2)];
  const outside = TRACK.k[mid] > 0 ? -1 : 1;
  const len = c.to - c.from;
  const back = Math.min(280, Math.max(130, len * 0.55));
  animateCam(pointAt(mid, exag, outside * back, 24 + len * 0.05),
             pointAt(mid, exag, outside * 10, 2));
}

let camAnim = null;
function animateCam(pos, target) {
  camAnim = { from: camera.position.clone(), to: pos,
              t0: controls.target.clone(), t1: target, s: performance.now() };
}

// ---- 車載視角 -------------------------------------------------------
const scrub = document.getElementById('scrub');
const playBtn = document.getElementById('play');
const hudA = document.getElementById('hud-a');
const hudB = document.getElementById('hud-b');
let onboard = false, lapD = 0, lastT = performance.now();

playBtn.addEventListener('click', () => onboard ? stopOnboard() : startOnboard());
scrub.addEventListener('input', () => {
  lapD = TRACK.length_m * scrub.value / 1000;
  if (!onboard) startOnboard();
});

let exagBeforeOnboard = null;

function startOnboard() {
  onboard = true;
  camera.fov = 64;                        // 廣角一點，速度感才出得來
  camera.updateProjectionMatrix();
  camAnim = null;
  lookInit = false;
  // 車載視角一定要真實比例：高程放大 5 倍時，S 字彎會變成一面牆
  if (!TRACK.flat && exag !== 1) { exagBeforeOnboard = exag; setExag(1); }
  for (const m of diagramMeshes) m.visible = false;
  if (roadMesh) roadMesh.material = MAT.road;
  controls.enabled = false;
  playBtn.textContent = '結束車載';
  playBtn.classList.add('on');
}
function stopOnboard() {
  if (!onboard) return;
  onboard = false;
  camera.fov = 48;
  camera.updateProjectionMatrix();
  for (const m of diagramMeshes) m.visible = true;
  if (roadMesh) roadMesh.material = SPEED_MODE ? MAT.roadV : MAT.roadLight;
  if (exagBeforeOnboard !== null) { setExag(exagBeforeOnboard); exagBeforeOnboard = null; }
  controls.enabled = true;
  playBtn.textContent = '車載視角';
  playBtn.classList.remove('on');
}

const idxAt = d => Math.round((((d % TRACK.length_m) + TRACK.length_m) % TRACK.length_m)
  / TRACK.step) % N;

// 視線目標要自己平滑：直接看前方 55 m 的中心線，在減速彎會左右甩
const lookAt = new THREE.Vector3();
let lookInit = false;

/** 前方一段距離內的平均位置，當作看的方向——比單一點穩得多。 */
function aheadPoint(d, span, out) {
  out.set(0, 0, 0);
  const p = new THREE.Vector3();
  for (let m = 1; m <= 4; m++) {
    out.add(p.copy(pointAt(idxAt(d + span * m / 4), exag, 0, 2.0)));
  }
  return out.multiplyScalar(0.25);
}

const eyeTmp = new THREE.Vector3();
const aheadTmp = new THREE.Vector3();

function driveFrame(dt) {
  // 依模型速度前進，一圈的節奏就會接近真實
  lapD = (lapD + TRACK.v[idxAt(lapD)] / 3.6 * dt) % TRACK.length_m;
  scrub.value = Math.round(lapD / TRACK.length_m * 1000);

  // 位置直接放上去，不做 lerp——lerp 會在高速時落後，看起來就是抖
  camera.position.copy(pointAt(idxAt(lapD), exag, 0, 2.2));
  aheadPoint(lapD, 70, aheadTmp);
  if (!lookInit) { lookAt.copy(aheadTmp); lookInit = true; }
  lookAt.lerp(aheadTmp, Math.min(1, dt * 6));     // 視線再平滑一次
  camera.lookAt(lookAt);
  controls.target.copy(lookAt);
}

// ---- 下方剖面圖 -----------------------------------------------------
const svg = document.getElementById('prof-svg');
document.getElementById('prof-cap').textContent = SPEED_MODE ? '速度剖面（模型推算）' : '高程剖面';

function drawProfile() {
  const W = svg.clientWidth || 800, H = svg.clientHeight || 78;
  const series = SPEED_MODE ? TRACK.v : TRACK.z;
  const top = Math.max(...series);
  const px = i => TRACK.d[i] / TRACK.length_m * W;
  const py = i => H - 6 - series[i] / top * (H - 18);

  let d = `M0,${H} L${px(0)},${py(0)}`;
  for (let i = 1; i < N; i += 2) d += ` L${px(i).toFixed(1)},${py(i).toFixed(1)}`;
  d += ` L${W},${py(N - 1).toFixed(1)} L${W},${H} Z`;

  // 速度模式：把煞車區塗出來，一眼看得到這條賽道在哪裡減速
  let zones = '';
  if (SPEED_MODE) {
    let s = null;
    for (let i = 0; i <= N; i++) {
      const on = i < N && TRACK.st[i] === 2;
      if (on && s === null) s = i;
      if (!on && s !== null) {
        zones += `<rect x="${px(s).toFixed(1)}" y="0" width="${(px(i - 1) - px(s)).toFixed(1)}"
                   height="${H}" fill="#FF2B12" opacity=".2"/>`;
        s = null;
      }
    }
  }

  let band = '';
  if (activeCorner) {
    const x0 = activeCorner.from / TRACK.length_m * W;
    const x1 = activeCorner.to / TRACK.length_m * W;
    band = `<rect x="${x0}" y="0" width="${x1 - x0}" height="${H}"
             fill="#FFD60A" opacity=".35" stroke="#0D0D0D" stroke-width="1.2"/>`;
  }

  const right = SPEED_MODE
    ? `極速 ${TRACK.v_max_kmh} km/h`
    : `一圈 ${(TRACK.length_m / 1000).toFixed(3)} km`;
  const left = SPEED_MODE
    ? `最慢 ${TRACK.v_min_kmh} km/h`
    : `最高 ${TRACK.elev_max} m`;

  svg.innerHTML = `
    ${zones}${band}
    <path d="${d}" fill="#0D0D0D" opacity=".08"/>
    <path d="${d}" fill="none" stroke="#0D0D0D" stroke-width="2"/>
    <circle id="prof-dot" r="5" fill="#FFD60A" stroke="#0D0D0D" stroke-width="1.5" cx="0" cy="${py(0)}"/>
    <text x="2" y="10" font-size="10" font-weight="700" fill="#555">${left}</text>
    <text x="${W - 2}" y="10" font-size="10" font-weight="700" fill="#555" text-anchor="end">${right}</text>`;
}

function updateDot() {
  const dot = document.getElementById('prof-dot');
  if (!dot) return;
  const W = svg.clientWidth || 800, H = svg.clientHeight || 78;
  const series = SPEED_MODE ? TRACK.v : TRACK.z;
  const top = Math.max(...series);
  const i = idxAt(lapD);
  dot.setAttribute('cx', lapD / TRACK.length_m * W);
  dot.setAttribute('cy', H - 6 - series[i] / top * (H - 18));
}

// ---- 右上角小地圖 ---------------------------------------------------
/* 車載視角只看得到眼前幾十公尺，沒有地圖就不知道自己跑到哪。
   這裡畫一張俯視的賽道輪廓，標出目前位置、已跑過的部分，以及所在的彎號與路段名。 */
const mapSvg = document.getElementById('map');
const whereN = document.getElementById('where-n');
const whereS = document.getElementById('where-s');

const MAP = (() => {
  const pad = 7;
  const xs = TRACK.x, ys = TRACK.y;
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const y0 = Math.min(...ys), y1 = Math.max(...ys);
  const k = (100 - pad * 2) / Math.max(x1 - x0, y1 - y0);
  const ox = pad + ((100 - pad * 2) - (x1 - x0) * k) / 2;
  const oy = pad + ((100 - pad * 2) - (y1 - y0) * k) / 2;
  // 螢幕的 y 往下，所以緯度方向要翻過來
  const px = i => ox + (xs[i] - x0) * k;
  const py = i => 100 - (oy + (ys[i] - y0) * k);
  const d = i => `${px(i).toFixed(2)},${py(i).toFixed(2)}`;
  let base = 'M' + d(0);
  for (let i = 2; i < N; i += 2) base += 'L' + d(i);
  return { px, py, d, base: base + 'Z' };
})();

mapSvg.innerHTML = `
  <path class="base" d="${MAP.base}"/>
  <path class="turn" id="map-turn" d=""/>
  <path class="done" id="map-done" d=""/>
  <line class="start" x1="${MAP.px(0) - 3}" y1="${MAP.py(0)}"
        x2="${MAP.px(0) + 3}" y2="${MAP.py(0)}"/>
  <circle class="dot" id="map-dot" r="3" cx="${MAP.px(0)}" cy="${MAP.py(0)}"/>`;

const mapDone = document.getElementById('map-done');
const mapTurn = document.getElementById('map-turn');
const mapDot = document.getElementById('map-dot');

/** 目前所在的彎（沒有就回 null）。 */
const turnAt = i => TRACK.tn[i] ? TRACK.turns.find(t => t.n === TRACK.tn[i]) : null;

let lastTurnN = -1;
function updateMap() {
  const i = idxAt(lapD);
  mapDot.setAttribute('cx', MAP.px(i));
  mapDot.setAttribute('cy', MAP.py(i));

  let done = 'M' + MAP.d(0);
  for (let j = 2; j <= i; j += 2) done += 'L' + MAP.d(j);
  mapDone.setAttribute('d', done);

  const t = turnAt(i);
  if ((t ? t.n : 0) !== lastTurnN) {
    lastTurnN = t ? t.n : 0;
    if (t) {
      const idx = rangeIdx(t.from, t.to);
      mapTurn.setAttribute('d', 'M' + idx.map(MAP.d).join('L'));
    } else {
      mapTurn.setAttribute('d', '');
    }
    whereN.textContent = t ? 'T' + t.n : '';
    whereS.textContent = sectionName(i, t);
  }
  updateNextTurn(i);
}

/** 目前路段的名稱。OSM 有彎名就用（鈴鹿、Monza）；沒有的賽道（巴林）用 META 裡人工補的。 */
function sectionName(i, t) {
  if (t) return (META.turnNames || {})[t.n] || META.names[t.seg] || '彎道';
  const d = TRACK.d[i];
  const st = (META.straights || []).find(([a, b]) => a <= b ? d >= a && d <= b : d >= a || d <= b);
  return st ? st[2] : META.names[TRACK.seg[i]] || '直線';
}

const nextEl = document.getElementById('next-turn');

/** 下一個彎是哪一個、還有多遠——車載視角最需要的一條資訊。 */
function updateNextTurn(i) {
  const d = TRACK.d[i];
  let best = null, gap = Infinity;
  for (const t of TRACK.turns) {
    let g = t.from - d;
    if (g < 0) g += TRACK.length_m;            // 跨過起跑線繼續算
    if (g > 0 && g < gap) { gap = g; best = t; }
  }
  if (!best || TRACK.tn[i] === best.n) { nextEl.textContent = ''; return; }
  const name = (META.turnNames || {})[best.n] || META.names[best.seg] || '彎道';
  nextEl.textContent = `下一個　T${best.n} ${name}　${Math.round(gap)} m`;
}

// ---- 彎名標籤 -------------------------------------------------------
const tags = [];
(function buildTags() {
  let cur = null, start = 0;
  const push = (name, a, b) => {
    const zh = META.names[name];
    if (!zh) return;
    const prev = tags[tags.length - 1];
    if (prev && prev.text === zh) { prev.b = b; return; }
    tags.push({ text: zh, a, b });
  };
  for (let i = 0; i <= N; i++) {
    const s = i < N ? TRACK.seg[i] : null;
    if (s !== cur) {
      if (cur) push(cur, start, i - 1);
      cur = s; start = i;
    }
  }
  if (META.tagTurns) {
    tags.length = 0;
    for (const t of TRACK.turns) {
      const i = Math.round(t.apex / TRACK.step) % N;
      tags.push({ text: 'T' + t.n, a: i, b: i });
    }
  }
  for (const t of tags) {
    t.i = Math.floor((t.a + t.b) / 2);
    t.el = document.createElement('div');
    t.el.className = 'tag';
    t.el.textContent = t.text;
    document.body.appendChild(t.el);
  }
})();

// ---- 控制項 ---------------------------------------------------------
let exag = TRACK.flat ? 1 : 5;
const exagEl = document.getElementById('exag');
const exagRow = document.getElementById('exag-row');
if (TRACK.flat) exagRow.style.display = 'none';     // 平的賽道不需要高程滑桿

function setExag(v) {
  exag = v;
  exagEl.value = v;
  document.getElementById('exag-v').textContent = '×' + v;
  buildTrack(exag);
}
exagEl.addEventListener('input', () => setExag(parseFloat(exagEl.value)));

const OV_DIR = new THREE.Vector3(900, 620, 1450).normalize();   // 固定的四分之三俯視角

function frameOverview() {
  const view = OV_DIR.clone().negate();
  const right = view.clone().cross(camera.up).normalize();
  const up = right.clone().cross(view).normalize();

  let rx = 0, ry = 0;
  const p = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    p.copy(pointAt(i, exag)).sub(centre);
    rx = Math.max(rx, Math.abs(p.dot(right)));
    ry = Math.max(ry, Math.abs(p.dot(up)));
  }
  const tanV = Math.tan(camera.fov / 2 * Math.PI / 180);
  const tanH = tanV * (innerWidth / innerHeight);
  const wide = innerWidth > 860;

  // 面板與剖面圖擋掉的部分不算數，只把賽道塞進剩下的視窗矩形
  const box = wide
    ? { x0: 356 / innerWidth, x1: 1, y0: 0, y1: (innerHeight - 132) / innerHeight }
    : { x0: 0, x1: 1, y0: 0.47, y1: (innerHeight - 108) / innerHeight };
  const bw = box.x1 - box.x0, bh = box.y1 - box.y0;
  const fx = (box.x0 + box.x1) / 2, fy = (box.y0 + box.y1) / 2;
  let dist = Math.max(rx / (tanH * bw), ry / (tanV * bh)) * 1.08;

  const place = d => {
    const shift = right.clone().multiplyScalar(-(fx - 0.5) * 2 * d * tanH)
      .add(up.clone().multiplyScalar((fy - 0.5) * 2 * d * tanV));
    return { pos: centre.clone().add(OV_DIR.clone().multiplyScalar(d)).add(shift),
             target: centre.clone().add(shift) };
  };

  // 透視會讓靠近相機的那一端放大，所以用真的投影再收斂幾次
  const probe = new THREE.PerspectiveCamera(camera.fov, innerWidth / innerHeight, 1, 1e5);
  const v3 = new THREE.Vector3();
  let out = place(dist);
  for (let pass = 0; pass < 5; pass++) {
    probe.position.copy(out.pos);
    probe.lookAt(out.target);
    probe.updateMatrixWorld();
    probe.updateProjectionMatrix();
    let over = 0;
    for (let i = 0; i < N; i += 2) {
      v3.copy(pointAt(i, exag)).project(probe);
      over = Math.max(over, Math.abs(v3.x - (2 * fx - 1)) / bw,
                            Math.abs(v3.y - (1 - 2 * fy)) / bh);
    }
    if (over < 0.94 && over > 0.86) break;      // 目標：填滿矩形的九成
    dist *= over / 0.90;
    out = place(dist);
  }
  return out;
}

document.getElementById('reset').addEventListener('click', () => {
  stopOnboard();
  selectCorner(null);
  setExag(TRACK.flat ? 1 : 5);
  const o = frameOverview();
  animateCam(o.pos, o.target);
});

// ---- 主迴圈 ---------------------------------------------------------
const v = new THREE.Vector3();
function project(p) {
  v.copy(p).project(camera);
  return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight, z: v.z };
}

let needFrame = true;

function tick(now) {
  requestAnimationFrame(tick);

  // 模組載入時視窗可能還沒有尺寸（top-level await 跑得比版面早），
  // 等到量得到尺寸的第一幀才取景。
  if (needFrame && innerWidth > 0 && innerHeight > 0) {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    const o = frameOverview();
    camera.position.copy(o.pos);
    controls.target.copy(o.target);
    drawProfile();
    needFrame = false;
  }

  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;

  // OrbitControls.update() 會用 target + 球座標重算相機位置，
  // 車載時跟我們自己設的位置互相打架，那就是抖動的來源，所以車載時不呼叫它。
  if (onboard) driveFrame(dt);
  else if (camAnim) {
    const k = Math.min(1, (now - camAnim.s) / 900);
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    camera.position.lerpVectors(camAnim.from, camAnim.to, e);
    controls.target.lerpVectors(camAnim.t0, camAnim.t1, e);
    if (k === 1) camAnim = null;
  }
  if (!onboard) controls.update();

  for (const t of tags) {
    const s = project(pointAt(t.i, exag, 0, 6));
    const clear = innerWidth > 860 ? s.x > 356 : s.y > innerHeight * 0.58;
    const on = s.z < 1 && !onboard && clear;
    t.el.style.opacity = on ? 1 : 0;
    if (on) { t.el.style.left = s.x + 'px'; t.el.style.top = s.y + 'px'; }
    t.el.classList.toggle('hot', !!activeCorner &&
      TRACK.d[t.i] >= activeCorner.from && TRACK.d[t.i] <= activeCorner.to);
  }

  const i = idxAt(lapD);
  hudA.textContent = SPEED_MODE ? TRACK.v[i].toLocaleString() : Math.round(lapD).toLocaleString();
  hudB.textContent = SPEED_MODE ? 'KM/H' : '公尺';
  updateMap();
  updateDot();
  renderer.render(scene, camera);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  drawProfile();
});

buildTrack(exag);
drawProfile();
tick(performance.now());
