import * as THREE from 'three';

// 敵機の生成・AI・撃墜処理
export class Enemies {
  constructor(scene, weapons) {
    this.scene = scene;
    this.weapons = weapons;
    this.list = [];
    this.spawnTimer = 0;
    this.maxCount = 5;
    this.kills = 0;
  }

  spawn(nearPos) {
    const group = new THREE.Object3D();
    group.add(buildEnemyMesh());
    // プレイヤーの周囲、やや遠方・上空に配置
    const ang = Math.random() * Math.PI * 2;
    const dist = 1400 + Math.random() * 1200;
    group.position.set(
      nearPos.x + Math.cos(ang) * dist,
      nearPos.y + (Math.random() - 0.3) * 500,
      nearPos.z + Math.sin(ang) * dist
    );
    this.scene.add(group);
    this.list.push({
      group,
      hp: 100,
      speed: 200 + Math.random() * 80,
      fireCooldown: 1 + Math.random() * 2,
      state: 'chase',
      stateTimer: 0,
    });
  }

  update(dt, player) {
    // 補充
    this.spawnTimer -= dt;
    if (this.list.length < this.maxCount && this.spawnTimer <= 0 && player.alive) {
      this.spawn(player.group.position);
      this.spawnTimer = 2.5;
    }

    for (const e of this.list) {
      const toPlayer = new THREE.Vector3().subVectors(player.group.position, e.group.position);
      const dist = toPlayer.length();
      toPlayer.normalize();

      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        // 近すぎたら離脱旋回、遠ければ追尾
        if (dist < 500) { e.state = 'evade'; e.stateTimer = 1.5 + Math.random(); }
        else { e.state = 'chase'; e.stateTimer = 2 + Math.random() * 2; }
      }

      // 目標方向を決める
      let desiredDir;
      if (e.state === 'evade') {
        // プレイヤーの側方へ抜ける
        const side = new THREE.Vector3().crossVectors(toPlayer, new THREE.Vector3(0, 1, 0)).normalize();
        desiredDir = side.multiplyScalar(Math.sign(Math.random() - 0.5) || 1).add(toPlayer.clone().multiplyScalar(-0.3)).normalize();
      } else {
        desiredDir = toPlayer;
      }

      // 現在向きを目標へ滑らかに回頭
      const curQ = e.group.quaternion;
      const targetQ = new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().lookAt(new THREE.Vector3(0, 0, 0), desiredDir.clone().negate(), new THREE.Vector3(0, 1, 0))
      );
      curQ.slerp(targetQ, Math.min(1, dt * 1.6));

      // 前進
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(curQ);
      e.group.position.addScaledVector(forward, e.speed * dt);

      // 射撃(自機を概ね向いていて射程内)
      e.fireCooldown -= dt;
      if (e.fireCooldown <= 0 && player.alive && dist < 1400) {
        const aim = new THREE.Vector3().subVectors(player.group.position, e.group.position).normalize();
        if (forward.dot(aim) > 0.9) {
          const origin = e.group.position.clone().addScaledVector(forward, 14);
          this.weapons.spawn(origin, aim, false);
          e.fireCooldown = 1.4 + Math.random();
        } else {
          e.fireCooldown = 0.3;
        }
      }
    }
  }

  // position 付近の敵を返す(命中判定)
  hitTest(position, radius) {
    for (const e of this.list) {
      if (position.distanceTo(e.group.position) < radius) return e;
    }
    return null;
  }

  kill(e) {
    const idx = this.list.indexOf(e);
    if (idx >= 0) {
      this.scene.remove(e.group);
      this.list.splice(idx, 1);
      this.kills++;
    }
  }
}

function buildEnemyMesh() {
  const g = new THREE.Object3D();
  const mat = new THREE.MeshBasicMaterial({ color: 0xff5a5a, wireframe: true });
  const body = new THREE.Mesh(new THREE.ConeGeometry(3.6, 18, 5), mat);
  body.rotation.x = -Math.PI / 2;
  g.add(body);
  // デルタ翼
  const wing = new THREE.Mesh(new THREE.BoxGeometry(20, 0.6, 7), mat);
  wing.position.z = 3;
  g.add(wing);
  return g;
}
