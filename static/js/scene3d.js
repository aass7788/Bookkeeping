// ── AI 自动记账 · 3D 房间背景 ──
// 限定在 .app 容器内 | 纯背景层 | 粒子氛围 | CatmullRomCurve3 相机
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const w = window;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#f5f0e8');
scene.fog = new THREE.Fog('#f5f0e8', 5, 20);

const cam = new THREE.PerspectiveCamera(55, 1, 0.5, 40);
cam.position.set(-1.3, 0.3, 5.5);
cam.lookAt(-1.3, -0.3, 1.8);

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(w.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// ── Mount inside .app container ──
function mount() {
  const app = document.querySelector('.app');
  if (!app) { setTimeout(mount, 100); return; }
  const el = document.createElement('div');
  el.id = 'scene3d';
  el.style.cssText = 'position:absolute;inset:0;z-index:0;pointer-events:none;border-radius:28px;overflow:hidden;';
  app.insertBefore(el, app.firstChild);
  el.appendChild(renderer.domElement);
  resize();
}
mount();

// ── Lighting ──
scene.add(new THREE.AmbientLight('#fff5eb', 1.4));
const sun = new THREE.DirectionalLight('#fff8f0', 2.8);
sun.position.set(5, 8, 3); sun.castShadow = true;
sun.shadow.mapSize.set(512, 512);
sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 30;
sun.shadow.camera.left = -6; sun.shadow.camera.right = 6;
sun.shadow.camera.top = 6; sun.shadow.camera.bottom = -6;
scene.add(sun);

const lampLight = new THREE.PointLight('#ffd89b', 1.5, 4);
lampLight.position.set(-1.3, -0.1, 1.2);
scene.add(lampLight);

const capyFill = new THREE.PointLight('#fff8e7', 0.8, 3);
capyFill.position.set(2.0, 0.0, 2.5);
scene.add(capyFill);

// ── Atmospheric particles (dets.top style) ──
const particlesGeo = new THREE.BufferGeometry();
const pCount = 200;
const pPos = new Float32Array(pCount * 3);
for (let i = 0; i < pCount; i++) {
  pPos[i * 3] = (Math.random() - 0.5) * 10;
  pPos[i * 3 + 1] = Math.random() * 5 - 1;
  pPos[i * 3 + 2] = (Math.random() - 0.5) * 6;
}
particlesGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const particlesMat = new THREE.PointsMaterial({
  size: 0.03, color: '#fff8e0', transparent: true, opacity: 0.5,
  blending: THREE.AdditiveBlending, depthWrite: false
});
const particles = new THREE.Points(particlesGeo, particlesMat);
scene.add(particles);

// ── Room ──
const roomMat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1 });
// Floor
const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), roomMat('#d4c4a8'));
floor.rotation.x = -Math.PI / 2; floor.position.y = -2.2; floor.receiveShadow = true;
scene.add(floor);
// Rug
const rug = new THREE.Mesh(new THREE.PlaneGeometry(3, 2), new THREE.MeshStandardMaterial({ color: '#c75b39', roughness: 0.9 }));
rug.rotation.x = -Math.PI / 2; rug.position.set(0.2, -2.19, 1.0); rug.receiveShadow = true;
scene.add(rug);

// Walls
const wall = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), roomMat('#f0e8d8'));
wall.position.set(0, 0.8, -4); wall.receiveShadow = true;
scene.add(wall);
const wallL = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), roomMat('#ece0d0'));
wallL.position.set(-5, 0.8, 0); wallL.rotation.y = Math.PI / 2; wallL.receiveShadow = true;
scene.add(wallL);
const wallR = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), roomMat('#ece0d0'));
wallR.position.set(5, 0.8, 0); wallR.rotation.y = -Math.PI / 2; wallR.receiveShadow = true;
scene.add(wallR);

// Wall posters
function poster(x, y, z, rotY, pw, ph, color) {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshStandardMaterial({ color, roughness: 0.7 }));
  p.position.set(x, y, z); p.rotation.y = rotY;
  scene.add(p);
}
poster(-4.9, 0.6, -1.5, Math.PI / 2, 0.4, 0.5, '#e8c8a0');
poster(-4.9, 0.6, 1.0, Math.PI / 2, 0.35, 0.45, '#c8d8c0');
poster(4.9, 0.5, -0.5, -Math.PI / 2, 0.4, 0.5, '#d8c8b8');

// Bookshelf
const shelfGroup = new THREE.Group();
for (let i = 0; i < 4; i++) {
  const board = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.06, 0.7), new THREE.MeshStandardMaterial({ color: '#b8956e', roughness: 0.4 }));
  board.position.set(2.5, -0.3 + i * 0.65, -3.0);
  board.castShadow = true; board.receiveShadow = true;
  shelfGroup.add(board);
}
for (let row = 0; row < 3; row++) {
  for (let i = 0; i < 6; i++) {
    const bh = 0.2 + Math.random() * 0.3, bw = 0.08 + Math.random() * 0.06;
    const book = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.1), new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(Math.random() * 0.3 + 0.05, 0.4, 0.3 + Math.random() * 0.4), roughness: 0.6 }));
    book.position.set(2.0 + i * 0.18, -0.3 + row * 0.65 + 0.03, -3.15);
    book.castShadow = true;
    shelfGroup.add(book);
  }
}
scene.add(shelfGroup);

// Desk
const desk = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 1.2), new THREE.MeshStandardMaterial({ color: '#c4a882', roughness: 0.4 }));
desk.position.set(-1.3, -0.6, 1.5); desk.castShadow = true; desk.receiveShadow = true;
scene.add(desk);
for (let [dx, dz] of [[-0.9, 1.8], [0.9, 1.8], [-0.9, 1.2], [0.9, 1.2]]) {
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8), new THREE.MeshStandardMaterial({ color: '#b8956e', roughness: 0.3 }));
  leg.position.set(-1.3 + dx, -1.26, dz); leg.castShadow = true;
  scene.add(leg);
}

// Chair
const chairGroup = new THREE.Group();
const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.7), new THREE.MeshStandardMaterial({ color: '#b8956e', roughness: 0.4 }));
chairSeat.position.y = -0.9; chairSeat.castShadow = true; chairSeat.receiveShadow = true;
chairGroup.add(chairSeat);
for (let [dx, dz] of [[-0.28, 0.28], [0.28, 0.28], [-0.28, -0.28], [0.28, -0.28]]) {
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8), new THREE.MeshStandardMaterial({ color: '#a08060', roughness: 0.4 }));
  leg.position.set(dx, -1.24, dz); leg.castShadow = true;
  chairGroup.add(leg);
}
chairGroup.position.set(-1.3, 0, 2.2);
scene.add(chairGroup);

// Notebook
const noteGroup = new THREE.Group();
noteGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.9), new THREE.MeshStandardMaterial({ color: '#8B4513', roughness: 0.6 })));
noteGroup.children[0].position.y = 0.02;
noteGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.01, 0.84), new THREE.MeshStandardMaterial({ color: '#faf8f0', roughness: 0.8 })));
noteGroup.children[1].position.y = 0.05;
noteGroup.position.set(-1.4, -0.48, 1.5);
noteGroup.rotation.x = -0.2;
scene.add(noteGroup);

// Pen
const penGroup = new THREE.Group();
const penBody = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8), new THREE.MeshStandardMaterial({ color: '#333' }));
penBody.rotation.z = Math.PI / 2;
penGroup.add(penBody);
const penTip = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08, 8), new THREE.MeshStandardMaterial({ color: '#555' }));
penTip.position.x = 0.28; penTip.rotation.z = Math.PI / 2;
penGroup.add(penTip);
penGroup.position.set(-1.15, -0.4, 1.55);
penGroup.rotation.set(0.3, 0, 0.4);
scene.add(penGroup);

// ── Canvas eye texture ──
function createEyeTexture(size) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  const s = size, h = s / 2;
  ctx.fillStyle = '#fcfcfc'; ctx.fillRect(0, 0, s, s);
  const irisGrad = ctx.createRadialGradient(h, h, h * 0.15, h, h, h * 0.55);
  irisGrad.addColorStop(0, '#3a2010'); irisGrad.addColorStop(0.6, '#5a3a1a'); irisGrad.addColorStop(1, '#8a6a4a');
  ctx.beginPath(); ctx.arc(h, h, h * 0.5, 0, Math.PI * 2); ctx.fillStyle = irisGrad; ctx.fill();
  ctx.beginPath(); ctx.arc(h, h, h * 0.18, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
  ctx.beginPath(); ctx.arc(h - h * 0.18, h - h * 0.18, h * 0.1, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.beginPath(); ctx.arc(h + h * 0.1, h + h * 0.12, h * 0.04, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fill();
  ctx.strokeStyle = '#111'; ctx.lineWidth = s * 0.06; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(h, h, h * 0.52, -0.2, Math.PI + 0.2, false); ctx.stroke();
  ctx.lineWidth = s * 0.04;
  ctx.beginPath(); ctx.arc(h, h, h * 0.48, -0.15, Math.PI + 0.15, false); ctx.stroke();
  ctx.lineWidth = s * 0.015;
  for (let a = -0.3; a <= Math.PI + 0.3; a += 0.35) {
    const lx = h + Math.cos(a) * h * 0.52, ly = h + Math.sin(a) * h * 0.52;
    ctx.beginPath(); ctx.moveTo(lx, ly);
    ctx.lineTo(lx + Math.cos(a) * s * 0.12, ly + Math.sin(a) * s * 0.12); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}
const eyeTex = createEyeTexture(256);

// ── BULL (草地牛) ──
const bullGroup = new THREE.Group();
const bodyGeo = new THREE.SphereGeometry(0.38, 16, 12);
bodyGeo.scale(1, 0.75, 0.85);
const bullBody = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color: '#fafaf8', roughness: 0.35 }));
bullBody.position.y = -0.05; bullBody.castShadow = true;
bullGroup.add(bullBody);

const headGeo = new THREE.SphereGeometry(0.3, 16, 14);
headGeo.scale(1, 1.05, 0.9);
const bullHead = new THREE.Mesh(headGeo, new THREE.MeshStandardMaterial({ color: '#fefefc', roughness: 0.3 }));
bullHead.position.set(0, 0.35, 0.15); bullHead.castShadow = true;
bullGroup.add(bullHead);

function addPatch(x, y, z, rx, ry, rz, sx, sy, sz) {
  const g = new THREE.SphereGeometry(0.1, 8, 6);
  g.scale(sx || 1, sy || 0.5, sz || 0.5);
  const p = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: '#2a1a10', roughness: 0.4 }));
  p.position.set(x, y, z); p.rotation.set(rx || 0, ry || 0, rz || 0);
  bullHead.add(p);
}
addPatch(-0.13, 0.18, 0.05, 0.3, -0.4, 0, 1.2, 0.6, 0.5);
addPatch(0.1, 0.2, 0.02, 0.2, 0.5, 0.1, 1.1, 0.55, 0.5);

for (let sx of [-1, 1]) {
  const earGeo = new THREE.SphereGeometry(0.08, 8, 6);
  earGeo.scale(0.6, 0.8, 0.4);
  const ear = new THREE.Mesh(earGeo, new THREE.MeshStandardMaterial({ color: '#2a1a10', roughness: 0.4 }));
  ear.position.set(sx * 0.22, 0.25, 0.0); ear.rotation.z = sx * 0.6;
  bullHead.add(ear);
}

for (let sx of [-1, 1]) {
  const blush = new THREE.Mesh(new THREE.CircleGeometry(0.06, 12), new THREE.MeshBasicMaterial({ color: '#f4c4c4', side: THREE.DoubleSide, transparent: true, opacity: 0.6 }));
  blush.position.set(sx * 0.16, 0.08, 0.22); blush.rotation.x = -0.2;
  bullHead.add(blush);
}

const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8).scale(0.8, 0.5, 0.6), new THREE.MeshStandardMaterial({ color: '#e8b8a0', roughness: 0.3 }));
muzzle.position.set(0, 0.03, 0.25);
bullHead.add(muzzle);

for (let sx of [-1, 1]) {
  const n = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), new THREE.MeshBasicMaterial({ color: '#111' }));
  n.position.set(sx * 0.03, 0.05, 0.3);
  bullHead.add(n);
}

for (let sx of [-1, 1]) {
  const ep = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.08), new THREE.MeshBasicMaterial({ map: eyeTex }));
  ep.position.set(sx * 0.1, 0.15, 0.23); ep.rotation.x = -0.15; ep.rotation.y = sx * 0.2;
  bullHead.add(ep);
}

for (let sx of [-1, 1]) {
  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.025, 0.02), new THREE.MeshBasicMaterial({ color: '#111' }));
  brow.position.set(sx * 0.1, 0.22, 0.22); brow.rotation.z = sx * 0.5; brow.rotation.x = -0.25;
  bullHead.add(brow);
}

const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.008, 0.005), new THREE.MeshBasicMaterial({ color: '#111' }));
mouth.position.set(0.02, -0.02, 0.28); mouth.rotation.z = -0.1;
bullHead.add(mouth);

// Arms
function makeArm(x, y, z, rx, ry, rz) {
  const g = new THREE.Group();
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.25, 8), new THREE.MeshStandardMaterial({ color: '#fafaf8', roughness: 0.35 }));
  arm.position.y = -0.12; g.add(arm);
  const hoof = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4).scale(1, 0.6, 1), new THREE.MeshStandardMaterial({ color: '#d4c8a8', roughness: 0.5 }));
  hoof.position.set(0, -0.24, 0.02); g.add(hoof);
  g.position.set(x, y, z); g.rotation.set(rx, ry, rz);
  return g;
}
bullGroup.add(makeArm(0.3, 0.08, 0.1, 0.6, 0, 0.3));
bullGroup.add(makeArm(-0.32, 0.05, 0.12, 0.4, 0, -0.2));

// Legs
for (let sx of [-1, 1]) {
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.3, 10), new THREE.MeshStandardMaterial({ color: '#fafaf8', roughness: 0.35 }));
  leg.position.set(sx * 0.13, -0.35, 0.05); leg.castShadow = true;
  bullGroup.add(leg);
}

// Tail
const tailGroup = new THREE.Group();
tailGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.3, 8), new THREE.MeshStandardMaterial({ color: '#fafaf8', roughness: 0.35 })));
tailGroup.children[0].position.y = -0.15;
tailGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), new THREE.MeshStandardMaterial({ color: '#2a1a10', roughness: 0.4 })));
tailGroup.children[1].position.y = -0.3;
tailGroup.position.set(0, -0.1, -0.3); tailGroup.rotation.x = 0.8;
bullGroup.add(tailGroup);

bullGroup.position.set(-0.8, -0.6, 1.8);
scene.add(bullGroup);

// Writing arm (animated)
const writeArmGroup = new THREE.Group();
const wa = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.35, 8), new THREE.MeshStandardMaterial({ color: '#fafaf8', roughness: 0.35 }));
wa.position.y = -0.17; writeArmGroup.add(wa);
const wh = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), new THREE.MeshStandardMaterial({ color: '#d4c8a8', roughness: 0.5 }));
wh.position.set(0, -0.35, 0.02); writeArmGroup.add(wh);
writeArmGroup.position.set(-0.5, -0.35, 1.7);
writeArmGroup.rotation.set(0.8, 0, 0.3);
scene.add(writeArmGroup);

// ── CAPYBARA (噜噜水豚) ──
const capyGroup = new THREE.Group();
const capyBodyGeo = new THREE.SphereGeometry(0.4, 12, 8);
capyBodyGeo.scale(1.25, 0.55, 0.7);
const capyBody = new THREE.Mesh(capyBodyGeo, new THREE.MeshStandardMaterial({ color: '#8B6914', roughness: 0.5 }));
capyBody.position.y = 0.05; capyBody.castShadow = true;
capyGroup.add(capyBody);

const capyHeadGeo = new THREE.SphereGeometry(0.22, 10, 8);
capyHeadGeo.scale(1, 0.9, 0.85);
const capyHead = new THREE.Mesh(capyHeadGeo, new THREE.MeshStandardMaterial({ color: '#9B7924', roughness: 0.45 }));
capyHead.position.set(0, 0.3, 0.35); capyHead.castShadow = true;
capyGroup.add(capyHead);

const capySnoutGeo = new THREE.SphereGeometry(0.12, 8, 6);
capySnoutGeo.scale(0.9, 0.6, 0.7);
const capySnout = new THREE.Mesh(capySnoutGeo, new THREE.MeshStandardMaterial({ color: '#b8956e', roughness: 0.4 }));
capySnout.position.set(0, 0.22, 0.52);
capyHead.add(capySnout);

for (let sx of [-1, 1]) {
  const lid = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), new THREE.MeshStandardMaterial({ color: '#9B7924', roughness: 0.4 }));
  lid.position.set(sx * 0.1, 0.35, 0.5); lid.scale.set(1, 0.4, 1);
  capyHead.add(lid);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), new THREE.MeshBasicMaterial({ color: '#111' }));
  eye.position.set(sx * 0.1, 0.34, 0.52);
  capyHead.add(eye);
}

for (let sx of [-1, 1]) {
  const ear = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), new THREE.MeshStandardMaterial({ color: '#7a5a10', roughness: 0.5 }));
  ear.position.set(sx * 0.16, 0.42, 0.2);
  capyHead.add(ear);
}

for (let sx of [-1, 1]) {
  for (let sz of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.2, 8), new THREE.MeshStandardMaterial({ color: '#7a5a10', roughness: 0.5 }));
    leg.position.set(sx * 0.3, -0.22, sz * 0.15); leg.castShadow = true;
    capyGroup.add(leg);
  }
}

// Ledger
const ledgerGroup = new THREE.Group();
ledgerGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, 0.55), new THREE.MeshStandardMaterial({ color: '#2e8b57', roughness: 0.5 })));
ledgerGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.01, 0.5), new THREE.MeshStandardMaterial({ color: '#faf8f0', roughness: 0.7 })));
ledgerGroup.children[1].position.y = 0.03;
ledgerGroup.position.set(0.4, 0.3, 0.35); ledgerGroup.rotation.set(0.2, 0, 0.3);
capyGroup.add(ledgerGroup);

capyGroup.position.set(2.2, -0.7, 1.8);
scene.add(capyGroup);

// ── Props ──
const cupGroup = new THREE.Group();
cupGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.12, 12), new THREE.MeshStandardMaterial({ color: '#fff', roughness: 0.25 })));
const ch = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 8), new THREE.MeshStandardMaterial({ color: '#fff', roughness: 0.25 }));
ch.position.set(0.07, 0, 0); ch.rotation.z = Math.PI / 2;
cupGroup.add(ch);
cupGroup.position.set(-0.7, -0.48, 1.2);
scene.add(cupGroup);

// Potted plant on shelf
const potGroup = new THREE.Group();
potGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.1, 8), new THREE.MeshStandardMaterial({ color: '#d4956b', roughness: 0.5 })));
potGroup.children[0].position.y = -0.05;
potGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), new THREE.MeshStandardMaterial({ color: '#6b8e5a', roughness: 0.6 })));
potGroup.children[1].position.y = 0.02;
potGroup.position.set(-2.3, 0.3, -3.2);
scene.add(potGroup);

// ── CatmullRomCurve3 camera path ──
const posPoints = [
  new THREE.Vector3(-1.3, 0.3, 5.5),   // log: cow close-up
  new THREE.Vector3(0.5, 0.8, 5.5),     // transition
  new THREE.Vector3(3.0, 0.5, 5.5),     // bills: capybara only, shifted right
  new THREE.Vector3(1.0, 2.5, 6.5),     // rising
  new THREE.Vector3(0, 6.5, 9.0),       // stats: higher and further, full room
  new THREE.Vector3(2.5, 0.8, 2.5),     // me: in front of bookshelf (x=2.5)
];
const lookPoints = [
  new THREE.Vector3(-1.3, -0.3, 1.8),   // cow's notebook
  new THREE.Vector3(0.5, -0.3, 1.8),
  new THREE.Vector3(2.2, -0.3, 1.8),    // capybara
  new THREE.Vector3(0.5, -0.5, 1.5),
  new THREE.Vector3(0, -1.0, 1.5),      // center of room floor
  new THREE.Vector3(2.5, 0.5, -2.8),    // bookshelf shelves
];

const posCurve = new THREE.CatmullRomCurve3(posPoints);
const lookCurve = new THREE.CatmullRomCurve3(lookPoints);

// ── State ──
const pageToT = { log: 0.0, bills: 0.40, stats: 0.75, me: 1.0 };
let targetT = pageToT.log;
let currentT = targetT;
let writingAmount = 0;
let targetWriting = 0;

w.__scene3d = {
  go(zone) { targetT = pageToT[zone] ?? pageToT.log; },
  type() { targetWriting = Math.min(targetWriting + 0.15, 1); },
  stopType() { targetWriting = Math.max(targetWriting - 0.03, 0); }
};

// ── Resize to .app container ──
function resize() {
  const app = document.querySelector('.app');
  if (!app) return;
  const rect = app.getBoundingClientRect();
  const ww = rect.width, wh = rect.height;
  if (ww <= 0 || wh <= 0) return;
  renderer.setSize(ww, wh);
  cam.aspect = ww / Math.max(wh, 1);
  cam.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ── Animate ──
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);
  const t = performance.now() * 0.001;

  // Smooth camera
  currentT += (targetT - currentT) * Math.min(dt * 4.5, 1);
  cam.position.copy(posCurve.getPointAt(Math.max(0, Math.min(1, currentT))));
  cam.lookAt(lookCurve.getPointAt(Math.max(0, Math.min(1, currentT))));

  // Writing amount
  writingAmount += (targetWriting - writingAmount) * Math.min(dt * 8, 1);

  // Bull idle sway
  bullGroup.position.x = -0.8 + Math.sin(t * 1.2) * 0.05;
  bullGroup.position.y = -0.6 + Math.sin(t * 0.8) * 0.03;
  bullGroup.rotation.z = Math.sin(t * 0.7) * 0.04;

  // Writing animation
  penGroup.position.y = -0.4 + Math.sin(t * 8) * writingAmount * 0.35;
  penGroup.position.x = -1.15 + Math.cos(t * 6) * writingAmount * 0.25;
  penGroup.rotation.z = 0.3 + Math.sin(t * 6) * writingAmount * 0.2;
  writeArmGroup.position.y = -0.35 + Math.sin(t * 8) * writingAmount * 0.06;
  writeArmGroup.rotation.z = 0.3 + Math.sin(t * 7) * writingAmount * 0.25;

  // Capybara idle
  capyGroup.position.x = 2.2 + Math.sin(t * 0.9) * 0.04;
  capyGroup.rotation.z = Math.sin(t * 0.6) * 0.025;

  // Cup steam
  cupGroup.position.y = -0.48 + Math.sin(t * 2.5) * 0.006;

  // Tail sway
  tailGroup.rotation.z = 0.1 + Math.sin(t * 1.1) * 0.15;

  // Floating particles drift
  particles.rotation.y += dt * 0.04;
  particles.rotation.x += dt * 0.02;
  particles.material.opacity = 0.35 + Math.sin(t * 0.5) * 0.1;

  renderer.render(scene, cam);
}
animate();
