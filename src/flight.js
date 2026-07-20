import * as THREE from 'three';

// 自機の物理・姿勢・入力反映(アーケード寄り)
export class Aircraft {
  constructor() {
    this.group = new THREE.Object3D();      // 位置と姿勢(quaternion)を保持
    this.velocity = new THREE.Vector3();
    this.speed = 260;                        // 前進速度(スロットル制御)
    this.minSpeed = 90;
    this.maxSpeed = 700;
    this.throttle = 0.45;                    // 0..1
    this.hp = 100;
    this.alive = true;

    // 機体ワイヤーフレーム(外部視点で見えるように用意)
    this.mesh = buildJetMesh(0x29f0e0);
    this.group.add(this.mesh);

    this.reset();
  }

  reset() {
    this.group.position.set(0, 900, 0);
    this.group.quaternion.identity();
    this.throttle = 0.45;
    this.speed = 260;
    this.hp = 100;
    this.alive = true;
    this.mesh.visible = true;
  }

  // 入力に応じた姿勢変化と前進
  update(dt, input, terrain) {
    if (!this.alive) return;

    // --- スロットル ---
    if (input.down('ShiftLeft') || input.down('ShiftRight')) this.throttle += dt * 0.6;
    if (input.down('ControlLeft') || input.down('ControlRight')) this.throttle -= dt * 0.6;
    this.throttle = clamp(this.throttle, 0, 1);
    const targetSpeed = this.minSpeed + (this.maxSpeed - this.minSpeed) * this.throttle;
    this.speed += (targetSpeed - this.speed) * Math.min(1, dt * 0.8);

    // --- 姿勢入力(ローカル軸まわりの角速度) ---
    const pitchRate = 1.25, rollRate = 2.0, yawRate = 0.8;
    let pitch = 0, roll = 0, yaw = 0;

    if (input.down('KeyW') || input.down('ArrowUp')) pitch += 1;    // 機首下げ
    if (input.down('KeyS') || input.down('ArrowDown')) pitch -= 1;  // 機首上げ
    if (input.down('KeyA') || input.down('ArrowLeft')) roll += 1;
    if (input.down('KeyD') || input.down('ArrowRight')) roll -= 1;
    if (input.down('KeyQ')) yaw += 1;
    if (input.down('KeyE')) yaw -= 1;

    // マウスエイム微調整を加える
    pitch += input.mouseY * 1.4;
    yaw -= input.mouseX * 1.2;

    const q = this.group.quaternion;
    q.multiply(qFromAxis(1, 0, 0, pitch * pitchRate * dt));
    q.multiply(qFromAxis(0, 0, 1, roll * rollRate * dt));
    q.multiply(qFromAxis(0, 1, 0, yaw * yawRate * dt));

    // --- 擬似空力: 機首方向へ進む + 軽い重力/揚力 ---
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    this.velocity.copy(forward).multiplyScalar(this.speed);
    // 速度が高いほど重力の影響が小さく感じる簡易揚力
    const gravity = 130 * clamp(1 - this.speed / this.maxSpeed, 0.15, 1);
    this.velocity.y -= gravity;

    this.group.position.addScaledVector(this.velocity, dt);

    // --- 地面衝突 ---
    const ground = terrain.heightAt(this.group.position.x, this.group.position.z);
    if (this.group.position.y < ground + 8) {
      this.damage(999); // 墜落
    }
  }

  damage(amount) {
    if (!this.alive) return;
    this.hp -= amount;
    if (this.hp <= 0) { this.hp = 0; this.alive = false; this.mesh.visible = false; }
  }

  get heading() {
    const f = new THREE.Vector3(0, 0, -1).applyQuaternion(this.group.quaternion);
    let deg = Math.atan2(f.x, -f.z) * 180 / Math.PI; // 北=-Z 基準
    if (deg < 0) deg += 360;
    return deg;
  }

  get altitude() { return this.group.position.y; }
}

function buildJetMesh(color) {
  const g = new THREE.Object3D();
  const mat = new THREE.MeshBasicMaterial({ color, wireframe: true });
  // 胴体(細長い八面体)
  const body = new THREE.Mesh(new THREE.ConeGeometry(3.2, 20, 6), mat);
  body.rotation.x = -Math.PI / 2;
  body.position.z = -2;
  g.add(body);
  // 主翼
  const wing = new THREE.Mesh(new THREE.BoxGeometry(24, 0.6, 5), mat);
  wing.position.z = 1;
  g.add(wing);
  // 尾翼(垂直)
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5, 4), mat);
  tail.position.set(0, 2, 8);
  g.add(tail);
  return g;
}

function qFromAxis(x, y, z, angle) {
  return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(x, y, z), angle);
}
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
