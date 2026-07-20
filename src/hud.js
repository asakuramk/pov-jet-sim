import * as THREE from 'three';

// HUD / 計器を Canvas 2D オーバーレイで描画
export class HUD {
  constructor(canvas, camera) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = camera;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  draw(player, enemies, cockpitView) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const cx = W / 2, cy = H / 2;
    ctx.clearRect(0, 0, W, H);

    const cyan = '#29f0e0';
    ctx.strokeStyle = cyan;
    ctx.fillStyle = cyan;
    ctx.font = '14px "Courier New", monospace';
    ctx.lineWidth = 1.4;
    ctx.shadowColor = cyan;
    ctx.shadowBlur = 6;

    // --- 中央照準 ---
    ctx.beginPath();
    ctx.moveTo(cx - 22, cy); ctx.lineTo(cx - 8, cy);
    ctx.moveTo(cx + 8, cy); ctx.lineTo(cx + 22, cy);
    ctx.moveTo(cx, cy - 22); ctx.lineTo(cx, cy - 8);
    ctx.moveTo(cx, cy + 8); ctx.lineTo(cx, cy + 22);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.globalAlpha = 0.4; ctx.stroke(); ctx.globalAlpha = 1;

    // --- 速度(左) ---
    this.gauge(cx - Math.min(360, W * 0.32), cy, 'SPD', Math.round(player.speed), 'kt', 'right');
    // --- 高度(右) ---
    this.gauge(cx + Math.min(360, W * 0.32), cy, 'ALT', Math.round(player.altitude), 'm', 'left');

    // --- スロットルバー(左下) ---
    const bx = 40, by = H - 60, bw = 160, bh = 12;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillRect(bx, by, bw * player.throttle, bh);
    ctx.fillText(`THR ${Math.round(player.throttle * 100)}%`, bx, by - 8);

    // --- HP(左下・スロットル上) ---
    const hy = by - 34;
    ctx.strokeRect(bx, hy, bw, bh);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = player.hp > 30 ? cyan : '#ff5a5a';
    ctx.shadowColor = ctx.fillStyle;
    ctx.fillRect(bx, hy, bw * (player.hp / 100), bh);
    ctx.fillStyle = cyan; ctx.shadowColor = cyan; ctx.globalAlpha = 1;
    ctx.fillText(`HULL ${Math.round(player.hp)}%`, bx, hy - 8);

    // --- 方位テープ(上部) ---
    this.compass(cx, 44, player.heading);

    // --- レーダー(右下) ---
    this.radar(W - 130, H - 130, 100, player, enemies);

    // --- キル数(右上) ---
    ctx.textAlign = 'right';
    ctx.fillText(`KILLS ${enemies.kills}`, W - 24, 32);
    ctx.fillText(`BOGEYS ${enemies.list.length}`, W - 24, 52);
    ctx.textAlign = 'left';

    // --- オフスクリーン敵の方向マーカー ---
    this.offscreenMarkers(player, enemies, cx, cy, W, H);

    // --- コックピット枠 ---
    if (cockpitView) this.cockpitFrame(W, H);

    // --- 撃墜されたとき ---
    if (!player.alive) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff5a5a'; ctx.shadowColor = '#ff5a5a';
      ctx.font = 'bold 40px "Courier New", monospace';
      ctx.fillText('DESTROYED', cx, cy - 60);
      ctx.font = '16px "Courier New", monospace';
      ctx.fillText('R キーでリスポーン', cx, cy - 26);
      ctx.restore();
    }

    ctx.shadowBlur = 0;
  }

  gauge(x, y, label, value, unit, align) {
    const ctx = this.ctx;
    ctx.save();
    ctx.textAlign = align;
    ctx.font = '12px "Courier New", monospace';
    ctx.globalAlpha = 0.7;
    ctx.fillText(label, x, y - 20);
    ctx.globalAlpha = 1;
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.fillText(String(value), x, y + 4);
    ctx.font = '11px "Courier New", monospace';
    ctx.globalAlpha = 0.7;
    ctx.fillText(unit, x, y + 22);
    // 枠の縦線
    ctx.globalAlpha = 0.5;
    const dx = align === 'right' ? 14 : -14;
    ctx.beginPath();
    ctx.moveTo(x + dx, y - 30); ctx.lineTo(x + dx, y + 30);
    ctx.stroke();
    ctx.restore();
  }

  compass(cx, y, heading) {
    const ctx = this.ctx;
    const width = 320;
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx - width / 2, y - 16, width, 32);
    ctx.clip();
    ctx.textAlign = 'center';
    ctx.font = '12px "Courier New", monospace';
    const dirs = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
    const pxPerDeg = 4;
    for (let d = -60; d <= 60; d += 15) {
      let ang = Math.round(heading + d);
      const disp = ((ang % 360) + 360) % 360;
      const px = cx + d * pxPerDeg;
      const tall = disp % 45 === 0;
      ctx.globalAlpha = tall ? 1 : 0.5;
      ctx.beginPath();
      ctx.moveTo(px, y - 10); ctx.lineTo(px, y - (tall ? 2 : 6));
      ctx.stroke();
      if (tall) ctx.fillText(dirs[disp] || String(disp), px, y + 12);
    }
    ctx.restore();
    // 中央インジケータ
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(cx, y - 20); ctx.lineTo(cx - 5, y - 26); ctx.lineTo(cx + 5, y - 26); ctx.closePath();
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(heading).toString().padStart(3, '0')}°`, cx, y - 32);
    ctx.textAlign = 'left';
  }

  radar(x, y, r, player, enemies) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.3;
    ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - r, y); ctx.lineTo(x + r, y);
    ctx.moveTo(x, y - r); ctx.lineTo(x, y + r);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // 自機の向きを上に合わせるため heading 分だけ回転
    const hRad = -player.heading * Math.PI / 180;
    const range = 2600;
    for (const e of enemies.list) {
      const dx = e.group.position.x - player.group.position.x;
      const dz = e.group.position.z - player.group.position.z;
      // ワールド XZ → レーダー座標(北=上)
      let rx = dx, rz = dz;
      // heading 回転
      const rrx = rx * Math.cos(hRad) - rz * Math.sin(hRad);
      const rrz = rx * Math.sin(hRad) + rz * Math.cos(hRad);
      let px = x + (rrx / range) * r;
      let py = y + (rrz / range) * r; // 北(-Z)が上
      const d = Math.hypot(px - x, py - y);
      if (d > r) { px = x + (px - x) / d * r; py = y + (py - y) / d * r; }
      ctx.fillStyle = '#ff5a5a'; ctx.shadowColor = '#ff5a5a';
      ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
    }
    // 自機
    ctx.fillStyle = '#29f0e0'; ctx.shadowColor = '#29f0e0';
    ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x - 4, y + 4); ctx.lineTo(x + 4, y + 4); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  offscreenMarkers(player, enemies, cx, cy, W, H) {
    const ctx = this.ctx;
    for (const e of enemies.list) {
      const v = e.group.position.clone().project(this.camera);
      const inFront = v.z < 1;
      const onScreen = inFront && Math.abs(v.x) < 1 && Math.abs(v.y) < 1;
      if (onScreen) {
        // ロック枠
        const sx = (v.x * 0.5 + 0.5) * W;
        const sy = (-v.y * 0.5 + 0.5) * H;
        ctx.save();
        ctx.strokeStyle = '#ff5a5a'; ctx.shadowColor = '#ff5a5a';
        ctx.globalAlpha = 0.8;
        ctx.strokeRect(sx - 14, sy - 14, 28, 28);
        ctx.restore();
      } else {
        // 画面端の方向矢印
        let dir = new THREE.Vector3(v.x, v.y, 0);
        if (!inFront) dir.multiplyScalar(-1);
        if (dir.lengthSq() < 1e-4) continue;
        dir.normalize();
        const edge = Math.min(W, H) * 0.42;
        const ax = cx + dir.x * edge;
        const ay = cy - dir.y * edge;
        ctx.save();
        ctx.translate(ax, ay);
        ctx.rotate(Math.atan2(-dir.y, dir.x));
        ctx.fillStyle = '#ff5a5a'; ctx.shadowColor = '#ff5a5a';
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.moveTo(10, 0); ctx.lineTo(-6, -6); ctx.lineTo(-6, 6); ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  }

  cockpitFrame(W, H) {
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowBlur = 0;
    const dash = H * 0.18;

    // 下部ダッシュボード(塗り)
    ctx.fillStyle = 'rgba(4,16,18,0.92)';
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, H - dash);
    ctx.quadraticCurveTo(W * 0.5, H - dash * 0.45, W, H - dash);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    // ダッシュボード上縁の発光ライン
    ctx.strokeStyle = '#29f0e0';
    ctx.shadowColor = '#29f0e0';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 1.6;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, H - dash);
    ctx.quadraticCurveTo(W * 0.5, H - dash * 0.45, W, H - dash);
    ctx.stroke();

    // キャノピー枠(左右の斜め支柱 + 中央フレーム)
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#0a2d2e';
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(-30, -30); ctx.lineTo(W * 0.30, H - dash);
    ctx.moveTo(W + 30, -30); ctx.lineTo(W * 0.70, H - dash);
    ctx.moveTo(W * 0.5, -10); ctx.lineTo(W * 0.5, 40);
    ctx.stroke();
    // 支柱の縁取り(発光)
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = '#1c6f70';
    ctx.shadowColor = '#29f0e0';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.moveTo(-30, -30); ctx.lineTo(W * 0.30, H - dash);
    ctx.moveTo(W + 30, -30); ctx.lineTo(W * 0.70, H - dash);
    ctx.stroke();

    ctx.restore();
  }
}
