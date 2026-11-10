# Baikal サイト デザインテンプレート

Yukon 型ベンチマーク・プラットフォームを想定した、Baikal 湖インスパイアのウェブサイトデザインテンプレート。“The Dive” 構成（ページ自体が湖の潜降）。軽微なフォント CDN を除けば実質依存なしの静的 HTML/CSS。

## 構成

| ファイル | 内容 |
|---|---|
| `tokens.css` | デザイントークン（深度パレット・ verdict 色・Glass レイヤー・タイポ・間隔） |
| `style.css` | コンポーネント（topbar / hero / loop / program cards / Frontier table / roles / pills / CTA / 2カラム program 詳細） |
| `index.html` | ランディングページ（hero・研究ループ・Research Programs・検証済み改善テーブル・役割・原則・CTA） |
| `program.html` | Research Program 詳細ページ（検証契約カード・Frontier パネル・lineage・Research Events フィード・提出チェックリスト） |

## デザインの考え方 — “The Dive”

- **ページ＝潜降**: 上から霜白の水面 → −25 m（ループ）→ −400 m（Programs）→ −1,000 m（Roles）→ −1,642 m（深淵 = Frontier）へ沈む深度バンド構成。セクションは等深線（bathymetric contour）アノテーション付き
- **深度ゲージ**: 左端の `.gauge` 線が CSS scroll-driven animation（`animation-timeline: scroll()`）でスクロールに同期して下降（非対応環境・`prefers-reduced-motion` では無効）
- **深度＝確実性**: `--abyss-*` は深いほど暗く、検証で確定した地点を表す。verdict 色（`--verified/--refuted/--failed/--frozen`）だけが「真の色」として使える
- **画像ゼロ**: 全視覚表現は等深線リング・髪lineルール・スクロール同期ゲージ・feTurbulence ノイズ（インライン SVG data URI）など純 CSS/SVGのみ。バイナリアセットなし
- **モーション**: ヒーローの段階的 fade-rise、`view()` timeline のセクション reveal。`prefers-reduced-motion` で全停止

## タイポグラフィ

- **Instrument Serif**（ディスプレイ・イタリック）× **Space Grotesk**（UI）× **IBM Plex Mono**（計測値・アノテーション）の Google Fonts 読み込み
- オフライン時はフォールバックスタック（Georgia / 諏訪系ゴシック / ui-monospace）に縮退

## プレビュー

```sh
python3 -m http.server -d design 8000
# http://localhost:8000/index.html / program.html
```

## 注意

- HTML 内の数値・プログラム名・イベントはすべてサンプルデータ（README のユースケースから採ったプレースホルダ）
- フォントはシステムスタック（依存ゼロ）。本番ではブランドフォントへ差し替え可能
- レスポンシブ: 1020px / 720px ブレークポイント
