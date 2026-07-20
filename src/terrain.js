import * as THREE from 'three';

// ワイヤーグリッドの起伏地形。決定論的な高さ関数で、任意座標の高度を取得できる。
export class Terrain {
  constructor(scene, { size = 6000, segments = 120 } = {}) {
    this.size = size;
    this.segments = segments;
    this.amp = 220;      // 起伏の高さ
    this.freq = 0.0016;  // 起伏の細かさ

    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2); // XZ 平面に寝かせる
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, this.heightAt(x, z));
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshBasicMaterial({
      color: 0x1f6f3a, wireframe: true, transparent: true, opacity: 0.55,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    scene.add(this.mesh);

    // 地平線を強調する薄いディスク(地面の塗り)
    const floorGeo = new THREE.PlaneGeometry(size, size);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshBasicMaterial({ color: 0x030d08, transparent: true, opacity: 0.85 });
    this.floor = new THREE.Mesh(floorGeo, floorMat);
    this.floor.position.y = -4;
    scene.add(this.floor);
  }

  // 滑らかな合成正弦波による高さ場
  heightAt(x, z) {
    const f = this.freq;
    let h = 0;
    h += Math.sin(x * f) * Math.cos(z * f);
    h += 0.5 * Math.sin(x * f * 2.3 + 1.7) * Math.cos(z * f * 1.9);
    h += 0.25 * Math.sin(x * f * 4.1 + 4.2) * Math.cos(z * f * 3.7 + 2.1);
    return h * this.amp;
  }

  // プレイヤー位置に地形を追従させ、無限に広がって見せる
  follow(x, z) {
    // グリッド 1 マスにスナップして揺れを防ぐ
    const step = this.size / this.segments;
    const gx = Math.round(x / step) * step;
    const gz = Math.round(z / step) * step;
    this.mesh.position.set(gx, 0, gz);
    this.floor.position.set(gx, -4, gz);
    // 追従に合わせて頂点の高さを再計算(ワールド座標基準)
    const pos = this.mesh.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const wx = pos.getX(i) + gx;
      const wz = pos.getZ(i) + gz;
      pos.setY(i, this.heightAt(wx, wz));
    }
    pos.needsUpdate = true;
  }
}
