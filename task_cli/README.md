# task_cli

シンプルなTodo管理CLI。`db.json` にタスクの状態（完了/未完了）を保存します。

## 実行方法

タスクを追加:

```sh
cargo run -- add "牛乳を買う"
```

タスクを完了にする:

```sh
cargo run -- complete "牛乳を買う"
```

## データ保存先

実行したディレクトリの `db.json` に `{ "タスク名": true/false }` の形式で保存されます（`true` = 未完了、`false` = 完了）。
