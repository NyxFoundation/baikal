# Baikal サイト デザインテンプレート

Yukon 型ベンチマーク・プラットフォームを想定した、Baikal 湖インスパイアのウェブサイトデザインテンプレート。ビルド・依存パッケージなしの静的 HTML/CSS。

## 構成

| ファイル | 内容 |
|---|---|
| `tokens.css` | デザイントークン（深度パレット・ verdict 色・Glass レイヤー・タイポ・間隔） |
| `style.css` | コンポーネント（topbar / hero / loop / program cards / Frontier table / roles / pills / CTA / 2カラム program 詳細） |
| `index.html` | ランディングページ（hero・研究ループ・Research Programs・検証済み改善テーブル・役割・原則・CTA） |
| `program.html` | Research Program 詳細ページ（検証契約カード・Frontier パネル・lineage・Research Events フィード・提出チェックリスト） |
| `assets/baikal-ice-hero.jpg` | ヒーロー背景（バイカル湖の氷・AI 生成） |

## デザインの考え方

- **深度＝確実性**: `--abyss-*` は深いほど暗く、検証で確定した地点を表す。verdict 色（`--verdict-*`）だけが「真の色」として使える
- **氷の透明性**: Glass カード（半透明＋blur）が public by default を表現
- **地層（strata）**: `.strata` 区切り線は積み重なる記録（累積的Frontier）のモチーフ

## プレビュー

```sh
python3 -m http.server -d design 8000
# http://localhost:8000/index.html / program.html
```

## 注意

- HTML 内の数値・プログラム名・イベントはすべてサンプルデータ（README のユースケースから採ったプレースホルダ）
- フォントはシステムスタック（依存ゼロ）。本番ではブランドフォントへ差し替え可能
- レスポンシブ: 1020px / 720px ブレークポイント
