// ── Dets.top 级 3D 房间场景 ──
// 牛记账 | 水豚查账 | 相机丝滑穿越
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const w = window;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#f5f0e8');
scene.fog = new THREE.Fog('#f5f0e8', 8, 25);

const cam = new THREE.PerspectiveCamera(40, w.innerWidth / w.innerHeight, 0.5, 40);
cam.position.set(0, 2.5, 10);
cam.lookAt(0, 1.2, 0);

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(w.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const el = document.createElement('div');
el.id = 'scene3d';
el.style.cssText = 'position:fixed;inset:0;z-index:1;pointer-events:none;';
document.body.prepend(el);
el.appendChild(renderer.domElement);

// ── Lighting ──
scene.add(new THREE.AmbientLight('#fff5eb', 1.4));
const sun = new THREE.DirectionalLight('#fff8f0', 2.8);
sun.position.set(5, 8, 3); sun.castShadow = true;
sun.shadow.mapSize.set(512, 512);
sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 30;
sun.shadow.camera.left = -8; sun.shadow.camera.right = 8;
sun.shadow.camera.top = 8; sun.shadow.camera.bottom = -8;
scene.add(sun);

// ── Room ──
const roomMat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1 });
// Floor
const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), roomMat('#e8dcc8'));
floor.rotation.x = -Math.PI / 2; floor.position.y = -2.2; floor.receiveShadow = true;
scene.add(floor);
// Back wall
const wall = new THREE.Mesh(new THREE.PlaneGeometry(16, 6), roomMat('#f0e8d8'));
wall.position.set(0, 0.8, -4); wall.receiveShadow = true;
scene.add(wall);
// Side wall L
const wallL = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), roomMat('#ece0d0'));
wallL.position.set(-8, 0.8, 0); wallL.rotation.y = Math.PI / 2; wallL.receiveShadow = true;
scene.add(wallL);
// Side wall R
const wallR = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), roomMat('#ece0d0'));
wallR.position.set(8, 0.8, 0); wallR.rotation.y = -Math.PI / 2; wallR.receiveShadow = true;
scene.add(wallR);

// ── Desk ──
const deskGeo = new THREE.BoxGeometry(2.4, 0.12, 1.2);
const desk = new THREE.Mesh(deskGeo, new THREE.MeshStandardMaterial({ color: '#c4a882', roughness: 0.4 }));
desk.position.set(0, -0.6, 1.5); desk.castShadow = true; desk.receiveShadow = true;
scene.add(desk);
// Desk legs
for (let [dx, dz] of [[-.9, 1.8], [.9, 1.8], [-.9, 1.2], [.9, 1.2]]) {
  const leg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8),
    new THREE.MeshStandardMaterial({ color: '#b8956e', roughness: 0.3 })
  );
  leg.position.set(dx, -1.26, dz); leg.castShadow = true;
  scene.add(leg);
}

// ── Notebook ──
const noteGroup = new THREE.Group();
const noteCover = new THREE.Mesh(
  new THREE.BoxGeometry(0.7, 0.05, 0.9),
  new THREE.MeshStandardMaterial({ color: '#8b4513', roughness: 0.6 })
);
noteCover.position.y = 0.02;
noteGroup.add(noteCover);
const notePage = new THREE.Mesh(
  new THREE.BoxGeometry(0.64, 0.01, 0.84),
  new THREE.MeshStandardMaterial({ color: '#faf8f0', roughness: 0.8 })
);
notePage.position.y = 0.05;
noteGroup.add(notePage);
noteGroup.position.set(-0.1, -0.48, 1.5);
noteGroup.rotation.x = -0.2;
scene.add(noteGroup);

// ── Pen ──
const penGroup = new THREE.Group();
const penBody = new THREE.Mesh(
  new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8),
  new THREE.MeshStandardMaterial({ color: '#333' })
);
penBody.rotation.z = Math.PI / 2;
penGroup.add(penBody);
const penTip = new THREE.Mesh(
  new THREE.ConeGeometry(0.02, 0.08, 8),
  new THREE.MeshStandardMaterial({ color: '#555' })
);
penTip.position.x = 0.28; penTip.rotation.z = Math.PI / 2;
penGroup.add(penTip);
penGroup.position.set(0.15, -0.4, 1.55);
penGroup.rotation.set(0.3, 0, 0.4);
scene.add(penGroup);

// ── BULL (牛记账) ──
const bullGroup = new THREE.Group();
// Body
const bullBody = new THREE.Mesh(
  new THREE.BoxGeometry(0.7, 0.55, 0.5, 2, 2, 2),
  new THREE.MeshStandardMaterial({ color: '#f5eed8', roughness: 0.5 })
);
bullBody.position.y = 0.3; bullBody.castShadow = true;
bullGroup.add(bullBody);
// Head
const bullHead = new THREE.Mesh(
  new THREE.BoxGeometry(0.35, 0.35, 0.35, 2, 2, 2),
  new THREE.MeshStandardMaterial({ color: '#faf5e8', roughness: 0.4 })
);
bullHead.position.set(0, 0.7, 0.2); bullHead.castShadow = true;
bullGroup.add(bullHead);
// Horns
for (let sx of [-1, 1]) {
  const horn = new THREE.Mesh(
    new THREE.ConeGeometry(0.06, 0.25, 8), new THREE.MeshStandardMaterial({ color: '#d4c090', roughness: 0.3 })
  );
  horn.position.set(sx * 0.1, 0.95, 0.18);
  horn.rotation.z = sx * 0.3;
  bullGroup.add(horn);
}
// Eyes
for (let sx of [-1, 1]) {
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), new THREE.MeshBasicMaterial({ color: '#111' }));
  eye.position.set(sx * 0.08, 0.72, 0.36);
  bullGroup.add(eye);
}
// Snout
const snout = new THREE.Mesh(
  new THREE.BoxGeometry(0.12, 0.08, 0.06), new THREE.MeshStandardMaterial({ color: '#ecc8a0' })
);
snout.position.set(0, 0.63, 0.38);
bullGroup.add(snout);
// Legs
for (let sx of [-1, 1]) {
  for (let sz of [-1, 1]) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.07, 0.35, 8),
      new THREE.MeshStandardMaterial({ color: '#ede0c8', roughness: 0.5 })
    );
    leg.position.set(sx * 0.2, -0.1, sz * 0.15);
    leg.castShadow = true;
    bullGroup.add(leg);
  }
}
bullGroup.position.set(-1.3, -0.8, 1.8);
scene.add(bullGroup);

// ── Bull's right arm (for writing) ──
const armGroup = new THREE.Group();
const arm = new THREE.Mesh(
  new THREE.CylinderGeometry(0.04, 0.05, 0.4, 8),
  new THREE.MeshStandardMaterial({ color: '#ede0c8', roughness: 0.5 })
);
arm.position.y = -0.2;
armGroup.add(arm);
armGroup.position.set(-0.8, -0.55, 1.7);
armGroup.rotation.set(0.6, 0, 0.3);
scene.add(armGroup);

// ── CAPYBARA (水豚查账) ──
const capyGroup = new THREE.Group();
// Body
const capyBody = new THREE.Mesh(
  new THREE.BoxGeometry(1.0, 0.4, 0.55, 3, 3, 3),
  new THREE.MeshStandardMaterial({ color: '#8B6914', roughness: 0.55 })
);
capyBody.position.y = 0.2; capyBody.castShadow = true;
capyGroup.add(capyBody);
// Head
const capyHead = new THREE.Mesh(
  new THREE.BoxGeometry(0.4, 0.35, 0.4, 3, 3, 3),
  new THREE.MeshStandardMaterial({ color: '#9B7924', roughness: 0.5 })
);
capyHead.position.set(0, 0.5, 0.5); capyHead.castShadow = true;
capyGroup.add(capyHead);
// Eyes (small, chill)
for (let sx of [-1, 1]) {
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), new THREE.MeshBasicMaterial({ color: '#111' }));
  eye.position.set(sx * 0.1, 0.52, 0.7);
  capyGroup.add(eye);
}
// Ears
for (let sx of [-1, 1]) {
  const ear = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshStandardMaterial({ color: '#7a5a10', roughness: 0.5 }));
  ear.position.set(sx * 0.15, 0.66, 0.4);
  capyGroup.add(ear);
}
// Legs
for (let sx of [-1, 1]) {
  for (let sz of [-1, 1]) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.25, 8),
      new THREE.MeshStandardMaterial({ color: '#7a5a10', roughness: 0.5 })
    );
    leg.position.set(sx * 0.3, -0.1, sz * 0.18);
    leg.castShadow = true;
    capyGroup.add(leg);
  }
}
// Ledger book
const ledger = new THREE.Mesh(
  new THREE.BoxGeometry(0.5, 0.06, 0.6),
  new THREE.MeshStandardMaterial({ color: '#2e8b57', roughness: 0.5 })
);
ledger.position.set(0.35, 0.35, 0.25);
ledger.rotation.z = 0.15;
capyGroup.add(ledger);

capyGroup.position.set(1.8, -0.8, 1.8);
scene.add(capyGroup);

// ── Small props ──
// Coffee cup on desk
const cupBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.14, 12), new THREE.MeshStandardMaterial({ color: '#fff', roughness: 0.3 }));
cupBase.position.set(-0.6, -0.46, 1.2);
scene.add(cupBase);

// ── Camera targets ──
const camPositions = {
  log: { pos: new THREE.Vector3(-1.3, 0.3, 4.8), look: new THREE.Vector3(-1.3, -0.3, 1.8) },
  bills: { pos: new THREE.Vector3(2.2, 0.3, 4.8), look: new THREE.Vector3(1.8, -0.3, 1.8) },
  stats: { pos: new THREE.Vector3(0, 4.5, 7), look: new THREE.Vector3(0, -1.5, 1.5) },
  me: { pos: new THREE.Vector3(0, 0.3, 6.5), look: new THREE.Vector3(0, -0.5, 1.5) },
};
let targetPos = camPositions.log.pos.clone();
let targetLook = camPositions.log.look.clone();
let currentPos = targetPos.clone();
let currentLook = targetLook.clone();
let writingAmount = 0;

// Exposed API
w.__scene3d = {
  go(zone) {
    const t = camPositions[zone] || camPositions.log;
    targetPos.copy(t.pos);
    targetLook.copy(t.look);
  },
  type() { writingAmount = Math.min(writingAmount + 0.15, 1); },
  stopType() { writingAmount = Math.max(writingAmount - 0.03, 0); }
};

// ── Resize ──
function resize() {
  const ww = window.innerWidth, wh = window.innerHeight;
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
  currentPos.lerp(targetPos, dt * 3.5);
  currentLook.lerp(targetLook, dt * 4);
  cam.position.copy(currentPos);
  cam.lookAt(currentLook);

  // Bull idle sway
  bullGroup.position.x = -1.3 + Math.sin(t * 1.2) * 0.06;
  bullGroup.position.y = -0.8 + Math.sin(t * 0.8) * 0.04;
  bullGroup.rotation.z = Math.sin(t * 0.7) * 0.05;

  // Writing animation (pen & arm)
  penGroup.position.y = -0.4 + Math.sin(t * 8) * writingAmount * 0.04;
  penGroup.position.x = 0.15 + Math.cos(t * 6) * writingAmount * 0.03;
  armGroup.rotation.z = 0.3 + Math.sin(t * 6) * writingAmount * 0.15;

  // Capybara idle
  capyGroup.position.x = 1.8 + Math.sin(t * 0.9) * 0.05;
  capyGroup.rotation.z = Math.sin(t * 0.6) * 0.03;

  // Cup steam
  cupBase.position.y = -0.46 + Math.sin(t * 2.5) * 0.008;

  renderer.render(scene, cam);
}
animate();
