import * as THREE from 'three';
import { Input } from './input.js';
import { Terrain } from './terrain.js';
import { Aircraft } from './flight.js';
import { Enemies } from './enemies.js';
import { Weapons } from './weapons.js';
import { HUD } from './hud.js';

// --- レンダラ / シーン ---
const appEl = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x04060a, 1);
appEl.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x04060a, 900, 4200);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.5, 12000);

// 星空(遠景の点)
addStars(scene);

// --- ゲーム要素 ---
const terrain = new Terrain(scene);
const player = new Aircraft();
scene.add(player.group);
const weapons = new Weapons(scene);
const enemies = new Enemies(scene, weapons);

const input = new Input(renderer.domElement);
const hudCanvas = document.getElementById('hud');
const hud = new HUD(hudCanvas, camera);

let cockpitView = true; // true=コックピット内, false=HUD のみ(機首後方)
let started = false;    // 開始したか(ポインタロックとは独立)

// --- 開始オーバーレイ / ポインタロック ---
const overlay = document.getElementById('overlay');
overlay.addEventListener('click', () => {
  started = true;
  overlay.classList.add('hidden');
  input.requestLock(); // マウスエイム用。失敗してもゲームは進行する
});
// Esc で一時停止(ポインタロック解除時)。ゲーム状態は保持
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') { started = false; overlay.classList.remove('hidden'); }
});

// --- リサイズ ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- カメラ配置 ---
function updateCamera(dt) {
  const q = player.group.quaternion;
  const pos = player.group.position;
  if (cockpitView) {
    // コックピット内: 機体のわずか後方・上のパイロット目線
    const eye = new THREE.Vector3(0, 2.2, 2).applyQuaternion(q).add(pos);
    camera.position.copy(eye);
    const look = new THREE.Vector3(0, 1.5, -100).applyQuaternion(q).add(pos);
    camera.up.copy(new THREE.Vector3(0, 1, 0).applyQuaternion(q));
    camera.lookAt(look);
    player.mesh.visible = false;
  } else {
    // 機首後方チェイス(機体が少し見える没入 HUD)
    const behind = new THREE.Vector3(0, 6, 34).applyQuaternion(q).add(pos);
    camera.position.lerp(behind, Math.min(1, dt * 6));
    const look = new THREE.Vector3(0, 2, -60).applyQuaternion(q).add(pos);
    camera.up.copy(new THREE.Vector3(0, 1, 0).applyQuaternion(q));
    camera.lookAt(look);
    player.mesh.visible = player.alive;
  }
}

// --- メインループ ---
const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  const active = started && player.alive;

  // 視点切替
  if (input.pressed('KeyC')) cockpitView = !cockpitView;
  // リスポーン
  if (input.pressed('KeyR') && !player.alive) {
    player.reset();
    started = true;
    overlay.classList.add('hidden');
    input.requestLock();
  }

  if (active) {
    player.update(dt, input, terrain);
    if (input.down('Space') || input.firing) weapons.playerFire(player);
  }

  enemies.update(dt, player);
  weapons.update(dt, enemies, player);
  terrain.follow(player.group.position.x, player.group.position.z);

  updateCamera(dt);
  input.decay(dt);

  renderer.render(scene, camera);
  hud.draw(player, enemies, cockpitView);
}
loop();

function addStars(scene) {
  const geo = new THREE.BufferGeometry();
  const n = 900;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    // 上半球にランダム配置
    const r = 8000;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.5;
    arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    arr[i * 3 + 1] = r * Math.cos(phi) + 400;
    arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const mat = new THREE.PointsMaterial({ color: 0x8fd8ff, size: 6, sizeAttenuation: false, transparent: true, opacity: 0.7 });
  const stars = new THREE.Points(geo, mat);
  stars.frustumCulled = false;
  scene.add(stars);
}
