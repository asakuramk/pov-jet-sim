import * as THREE from 'three';

// 弾の生成・移動・当たり判定・撃墜爆散
export class Weapons {
  constructor(scene) {
    this.scene = scene;
    this.bullets = [];   // {mesh, vel, life, fromPlayer}
    this.debris = [];    // 爆散パーティクル {mesh, vel, life}
    this.playerCooldown = 0;
  }

  // 発射体を生成
  spawn(origin, direction, fromPlayer) {
    const color = fromPlayer ? 0xfff36b : 0xff5a5a;
    const geo = new THREE.SphereGeometry(fromPlayer ? 1.6 : 2.0, 6, 4);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, wireframe: true }));
    mesh.position.copy(origin);
    this.scene.add(mesh);
    const speed = fromPlayer ? 1400 : 900;
    const vel = direction.clone().normalize().multiplyScalar(speed);
    this.bullets.push({ mesh, vel, life: 2.2, fromPlayer });
  }

  // 実際に発射したら true(サウンドのトリガに使う)
  playerFire(aircraft) {
    if (this.playerCooldown > 0) return false;
    this.playerCooldown = 0.09;
    const q = aircraft.group.quaternion;
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    // 機体前方へ発射(自機速度を加算して自然に)
    const origin = aircraft.group.position.clone().addScaledVector(dir, 14);
    const vel = dir.clone().multiplyScalar(1400).addScaledVector(dir, aircraft.speed / 1400);
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 6, 4),
      new THREE.MeshBasicMaterial({ color: 0xfff36b, wireframe: true })
    );
    mesh.position.copy(origin);
    this.scene.add(mesh);
    this.bullets.push({ mesh, vel, life: 2.2, fromPlayer: true });
    return true;
  }

  // 爆散: ワイヤー破片を飛散
  explode(position, color = 0xff5a5a, count = 14) {
    for (let i = 0; i < count; i++) {
      const geo = new THREE.TetrahedronGeometry(3 + Math.random() * 4);
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, wireframe: true }));
      mesh.position.copy(position);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)
      ).normalize().multiplyScalar(120 + Math.random() * 180);
      this.scene.add(mesh);
      this.debris.push({ mesh, vel, life: 1.2, spin: new THREE.Vector3(Math.random(), Math.random(), Math.random()) });
    }
  }

  // enemies: Enemies インスタンス、player: Aircraft
  update(dt, enemies, player) {
    this.playerCooldown -= dt;

    // 弾の更新
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.mesh.position.addScaledVector(b.vel, dt);
      b.life -= dt;
      let hit = false;

      if (b.fromPlayer) {
        // 敵への命中判定(距離ベース)
        const e = enemies.hitTest(b.mesh.position, 24);
        if (e) {
          e.hp -= 34;
          if (e.hp <= 0) {
            this.explode(e.group.position, 0xff5a5a);
            enemies.kill(e);
          } else {
            this.explode(b.mesh.position, 0xffb060, 4);
          }
          hit = true;
        }
      } else {
        // 自機への命中判定
        if (player.alive && b.mesh.position.distanceTo(player.group.position) < 16) {
          player.damage(12);
          this.explode(b.mesh.position, 0xffb060, 4);
          hit = true;
        }
      }

      if (hit || b.life <= 0) {
        this.scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        this.bullets.splice(i, 1);
      }
    }

    // 破片の更新
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.mesh.position.addScaledVector(d.vel, dt);
      d.vel.multiplyScalar(0.96);
      d.mesh.rotation.x += d.spin.x * dt * 6;
      d.mesh.rotation.y += d.spin.y * dt * 6;
      d.life -= dt;
      d.mesh.material.opacity = Math.max(0, d.life / 1.2);
      d.mesh.material.transparent = true;
      if (d.life <= 0) {
        this.scene.remove(d.mesh);
        d.mesh.geometry.dispose();
        this.debris.splice(i, 1);
      }
    }
  }
}
