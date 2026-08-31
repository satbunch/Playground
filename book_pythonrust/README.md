# book_pythonrust

Rustの技術書の写経プロジェクト。1プロジェクト = 1冊の本で、章ごとに `chXX_xxx` という crate を分けて管理する Cargo workspace です。

## 構成

```
book_pythonrust/
├── Cargo.toml        # workspace ルート
└── ch01_warm_up/      # 1章分の crate
    └── examples/      # 章内のサンプルコード（1トピック = 1ファイル）
```

## 実行方法

workspace全体のビルド確認:

```sh
cargo check --workspace
```

各章の example を実行:

```sh
cargo run -p ch01_warm_up --example caesar_enc
cargo run -p ch01_warm_up --example caesar_enc2
cargo run -p ch01_warm_up --example coin_type
```

## 章の追加方法

```sh
cd book_pythonrust
cargo new chXX_xxx
```

作成後、`Cargo.toml` の `members` に追加してください。
