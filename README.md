# POV 戦闘機フライトシミュレーター

ブラウザで動く、一人称視点(POV)のワイヤーフレーム戦闘機フライトシミュレーター。
Three.js 製・ビルド不要。自由飛行に加えて敵機との空戦ができる。

## 起動

ES モジュール + importmap を使うため、`file://` ではなくローカルサーバー経由で開く:

```bash
cd pov-jet-sim
python3 -m http.server 5177
# ブラウザで http://localhost:5177 を開く
```

Three.js は CDN(unpkg)から読み込むため、初回はネット接続が必要。

## 操作

| キー | 動作 |
| --- | --- |
| W / S ・ ↑ / ↓ | ピッチ(機首上下) |
| A / D ・ ← / → | ロール(左右傾き) |
| Q / E | ヨー(機首左右) |
| Shift / Ctrl | スロットル 増 / 減 |
| Space ・ クリック | 機銃 発射 |
| マウス | 機首エイム(微調整・要ポインタロック) |
| C | 視点切替(コックピット内 / HUD のみ) |
| R | リスポーン |
| M | サウンド ミュート切替 |
| Esc | 一時停止 |

## 特徴

- ワイヤーフレーム(ベクター/レトロ調)ビジュアル
- アーケード寄りの飛行モデル(スロットル・簡易空力・重力)
- 2 種の POV(コックピット内視点 / 没入 HUD)
- HUD: 速度・高度・方位テープ・スロットル・耐久・照準・レーダー・敵ロック/方向マーカー
- 敵機 AI(追尾・回避・射撃)と撃墜爆散エフェクト
- 手続き的サウンド(Web Audio・外部ファイル不要): スロットル/速度追従のエンジン音、機銃・爆発・被弾 SFX

## 構成

- `index.html` — エントリ、タイトル画面、スタイル
- `src/main.js` — シーン初期化・メインループ・カメラ切替
- `src/flight.js` — 自機の物理・姿勢
- `src/terrain.js` — ワイヤー地形と高度取得
- `src/enemies.js` — 敵機生成・AI
- `src/weapons.js` — 射撃・当たり判定・爆散
- `src/hud.js` — HUD/計器描画(Canvas 2D)
- `src/audio.js` — 手続き的サウンド(Web Audio)
- `src/input.js` — キーボード/マウス入力

設計メモ: [docs/superpowers/specs/2026-07-21-pov-jet-sim-design.md](docs/superpowers/specs/2026-07-21-pov-jet-sim-design.md)
