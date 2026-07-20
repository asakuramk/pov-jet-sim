// 入力の集約: キーボード + マウス(ポインタロック)
export class Input {
  constructor(domElement) {
    this.dom = domElement;
    this.keys = new Set();
    this.mouseX = 0; // -1..1 に正規化した機首エイム微調整
    this.mouseY = 0;
    this.firing = false;
    this.locked = false;
    // エッジ検出用(押した瞬間だけ true にしたいキー)
    this._pressed = new Set();

    window.addEventListener('keydown', (e) => {
      const c = e.code;
      if (!this.keys.has(c)) this._pressed.add(c);
      this.keys.add(c);
      // ゲーム用キーはスクロール等を抑止
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(c)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    this.dom.addEventListener('mousedown', () => { if (this.locked) this.firing = true; });
    window.addEventListener('mouseup', () => { this.firing = false; });

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.dom;
      if (!this.locked) { this.mouseX = 0; this.mouseY = 0; }
    });

    this.dom.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      // 相対移動を蓄積し、中央へ緩やかに戻す(main 側で decay)
      this.mouseX = clamp(this.mouseX + e.movementX * 0.0016, -1, 1);
      this.mouseY = clamp(this.mouseY + e.movementY * 0.0016, -1, 1);
    });
  }

  requestLock() {
    if (!this.locked && this.dom.requestPointerLock) this.dom.requestPointerLock();
  }

  down(code) { return this.keys.has(code); }

  // 押した瞬間だけ true(トグル系に使用)
  pressed(code) {
    if (this._pressed.has(code)) { this._pressed.delete(code); return true; }
    return false;
  }

  // フレーム終わりに呼ぶ: マウスエイムを中央へ減衰
  decay(dt) {
    const k = Math.exp(-dt * 3.5);
    this.mouseX *= k;
    this.mouseY *= k;
  }
}

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
