# rust_practice
Rustの技術書を読みながら、サンプルコードを実際に動かして理解するための学習用リポジトリ。

## 目的
- Rustの基礎〜応用までを実践的に習得する
- 技術書ごとのサンプルコードを整理・再現可能な形で管理する
- コードを写すだけでなく、動作確認・改造・検証まで行う

## 構成

```
rust_practice/
├── books/        # 技術書ごとの学習ディレクトリ
│   ├── python_rust/
│   ├── rust_book/
│   └── …
├── sandbox/      # 一時的な検証コード
└── Cargo.toml    # workspace（全体管理）
```

## 運用ルール

### 技術書ごと
- `books/` 配下にディレクトリを作成
- 各技術書は独立したworkspaceとして管理
### 章ごと
- `cargo new chXX_xxx` でcrateを作成
### サンプルコード
- `examples/` に配置
- 1トピック = 1ファイル

## 実行方法
### exampleの実行

```zsh
cargo run -p <crate名> –-example <example名>
```

例：

```zsh
cargo run -p ch01_hello -–example hello

```

## sandbox
一時的な検証や試行錯誤用のコードは `sandbox/` を使用する  
不要になったら削除してOK

## 今後の予定
- [ ] Rust公式本
- [ ] python_rust
- [ ] async Rust

## メモ
- 小さく試して、理解してから進む
- コンパイルエラーは学習のチャンスとして扱う
