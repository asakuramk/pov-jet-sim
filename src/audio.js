// 手続き的サウンド(Web Audio API・外部ファイル不要)
// エンジン: スロットル/対気速度に追従する連続ドローン
// SFX: 機銃・爆発・被弾
export class Sound {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.muted = false;
    this._noiseBuf = null;
  }

  // ユーザー操作(開始クリック)から呼ぶ
  init() {
    if (this.ctx) { this.ctx.resume?.(); return; }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.6;
    this.master.connect(this.ctx.destination);
    this._noiseBuf = this._makeNoiseBuffer(2);
    this._buildEngine();
    this.enabled = true;
  }

  _makeNoiseBuffer(seconds) {
    const ctx = this.ctx;
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  _noiseSource(loop = true) {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuf;
    src.loop = loop;
    return src;
  }

  _buildEngine() {
    const ctx = this.ctx;
    // 低域のドローン(のこぎり波2本＋サブ正弦)
    this.engGain = ctx.createGain();
    this.engGain.gain.value = 0;
    this.engFilter = ctx.createBiquadFilter();
    this.engFilter.type = 'lowpass';
    this.engFilter.frequency.value = 700;

    this.osc1 = ctx.createOscillator(); this.osc1.type = 'sawtooth'; this.osc1.frequency.value = 60;
    this.osc2 = ctx.createOscillator(); this.osc2.type = 'sawtooth'; this.osc2.frequency.value = 61;
    this.sub = ctx.createOscillator(); this.sub.type = 'sine'; this.sub.frequency.value = 30;
    this.osc1.connect(this.engFilter);
    this.osc2.connect(this.engFilter);
    this.sub.connect(this.engFilter);
    this.engFilter.connect(this.engGain);
    this.engGain.connect(this.master);

    // ジェットの吹き抜け(バンドパスノイズ・速度で増加)
    this.noise = this._noiseSource(true);
    this.noiseFilter = ctx.createBiquadFilter();
    this.noiseFilter.type = 'bandpass';
    this.noiseFilter.frequency.value = 1200;
    this.noiseFilter.Q.value = 0.7;
    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.value = 0;
    this.noise.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.master);

    this.osc1.start(); this.osc2.start(); this.sub.start(); this.noise.start();
  }

  // 毎フレーム: throttle(0..1), speedNorm(0..1)
  updateEngine(throttle, speedNorm) {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    const base = 55 + throttle * 85 + speedNorm * 45; // 回転数(Hz)
    this.osc1.frequency.setTargetAtTime(base, t, 0.1);
    this.osc2.frequency.setTargetAtTime(base * 1.015, t, 0.1);
    this.sub.frequency.setTargetAtTime(base * 0.5, t, 0.1);
    this.engGain.gain.setTargetAtTime(0.13 + throttle * 0.17, t, 0.15);
    this.engFilter.frequency.setTargetAtTime(500 + speedNorm * 2600, t, 0.2);
    this.noiseGain.gain.setTargetAtTime(0.015 + speedNorm * 0.10, t, 0.2);
    this.noiseFilter.frequency.setTargetAtTime(900 + speedNorm * 3200, t, 0.2);
  }

  // 停止/一時停止/撃墜時: エンジンをフェードアウト
  engineOff() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    this.engGain.gain.setTargetAtTime(0, t, 0.25);
    this.noiseGain.gain.setTargetAtTime(0, t, 0.25);
  }

  // 短いエンベロープ付きノイズ/トーンを鳴らす汎用ヘルパ
  _env(node, gain, t0, attack, decay, peak) {
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
    node.start(t0);
    node.stop(t0 + attack + decay + 0.02);
  }

  gun() {
    if (!this.enabled) return;
    const ctx = this.ctx, t = ctx.currentTime;
    // 破裂音(ハイパスノイズの短パルス)
    const n = this._noiseSource(false);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
    const g = ctx.createGain();
    n.connect(hp); hp.connect(g); g.connect(this.master);
    this._env(n, g, t, 0.001, 0.05, 0.35);
    // 低いサンプ(発射の芯)
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.05);
    const og = ctx.createGain();
    o.connect(og); og.connect(this.master);
    this._env(o, og, t, 0.001, 0.05, 0.18);
  }

  explosion() {
    if (!this.enabled) return;
    const ctx = this.ctx, t = ctx.currentTime;
    // ローパスノイズが減衰(轟音)
    const n = this._noiseSource(false);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1800, t);
    lp.frequency.exponentialRampToValueAtTime(120, t + 0.6);
    const g = ctx.createGain();
    n.connect(lp); lp.connect(g); g.connect(this.master);
    this._env(n, g, t, 0.005, 0.6, 0.7);
    // 低域のドスン
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(35, t + 0.5);
    const og = ctx.createGain();
    o.connect(og); og.connect(this.master);
    this._env(o, og, t, 0.005, 0.5, 0.6);
  }

  hit() {
    if (!this.enabled) return;
    const ctx = this.ctx, t = ctx.currentTime;
    // 金属的なヒット(バンドパスノイズ＋高音ピング)
    const n = this._noiseSource(false);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = 1.2;
    const g = ctx.createGain();
    n.connect(bp); bp.connect(g); g.connect(this.master);
    this._env(n, g, t, 0.001, 0.12, 0.4);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.enabled) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.6, this.ctx.currentTime, 0.05);
    return this.muted;
  }
}
