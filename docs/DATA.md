# データ構造と間隔反復

## 用語表（日本語 → 識別子）

| 日本語 | 識別子 |
|---|---|
| 木 | `Tree` |
| 根 | `root` |
| 節 | `Node` |
| 展開 | `Review` |
| 落ちた回数 | `missCount` |
| 前回の結果 | `lastResult` |
| 次の期日 | `due` |
| 間隔 | `interval` |
| 難易度係数 | `ease` |

## 型

```ts
type NodeId = string;

interface Node {
  id: NodeId;
  text: string;
  children: Node[];
  missCount: number;            // 累計で落ちた回数
  lastResult: boolean | null;   // 前回の展開で言えたか。未展開は null
}

interface Srs {
  interval: number;   // 日数。未展開は 0
  ease: number;       // 初期値 2.5、下限 1.3
  reps: number;       // 連続で q >= 3 だった回数
  due: string | null; // "YYYY-MM-DD"。未展開は null
  lastRatio: number | null;
}

interface Tree {
  id: string;
  root: Node;
  srs: Srs;
  createdAt: string;
  updatedAt: string;
}

interface ReviewLog {
  id: string;
  treeId: string;
  date: string;
  ratio: number;
  missedNodeIds: NodeId[];
}
```

## 永続化

- IndexedDB。テーブルは `trees` と `reviewLogs`。ほかに、サンプルの木を入れ済みかを覚える `meta`（エクスポートには含めない）
- `trees` は木を丸ごと1レコードで持つ。節をテーブルに分解しない（木は数十節までで小さく、丸ごと読み書きするほうが単純）
- `reviewLogs` は追記のみ。フェーズ2の履歴表示のために最初から記録しておく

## アウトライン形式

```
人権の三要素
  固有性
    人間であることにより当然に有する権利
  不可侵性
    公権力によっても侵されない
```

解析ルール:

- 空行は捨てる
- 深さ = 行頭の空白量 ÷ 2 を切り捨て。タブと全角空白は空白2つ分
- 1行目が根。2行目以降は、字下げがなくても根の下に入る
- 親は「自分より字下げが浅い、直近の行」。字下げが同じ行は兄弟になる。このため1段を空白4つで書いても、直前より2段以上深く書いても形が崩れない（例外にしない）
- 字下げなしの行の下に空白2つの行が続いたら、その行の子になる（見出しの下に字下げなしの箇条書きが続く貼り付けを受けるため）
- 行頭の箇条書きの記号（`- `、`* `、`+ `、`・`、`•`、`●` など）は文言に含めない。Google ドキュメントや Markdown からの貼り付けをそのまま受ける
- 解析は純粋関数 `parseOutline(text: string): Node | null`
- 逆変換 `toOutline(root: Node): string` も用意し、`parseOutline(toOutline(n))` が構造を保つことをテストする

編集時の統計引き継ぎ: 新旧の木で「根からのパス上の文言の並び」が一致する節は同一とみなし、`id`、`missCount`、`lastResult` を引き継ぐ。

## 間隔反復（木単位）

入力: 展開の結果 `ratio = 言えた節数 / 全節数`

### 品質値への変換

| ratio | q |
|---|---|
| 1.0 | 5 |
| 0.8 以上 | 4 |
| 0.5 以上 | 3 |
| それ未満 | 1 |

### 更新（SM-2 系）

```
if q < 3:
  reps = 0
  interval = 1
else:
  interval = reps == 0 ? 1 : reps == 1 ? 3 : round(interval * ease)
  reps += 1

ease = max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))

// 落ちた節がある木は前倒し
if ratio < 1 and interval > 1:
  interval = max(1, round(interval * ratio))

due = today + interval 日
```

この計算は純粋関数 `schedule(srs: Srs, ratio: number, today: string): Srs` とし、テストで以下を確認する。

- 初回全問正解で interval 1、二回目で 3
- q < 3 で reps が 0 に戻る
- ease が 1.3 を下回らない
- ratio 0.5 のとき interval が半分に縮む

### 節の統計の更新

展開保存時に全節を走査し、

- `lastResult` を今回の ○× で上書き
- × だった節の `missCount` を +1

## エクスポート形式

```json
{
  "app": "kozo",
  "version": 1,
  "exportedAt": "2026-09-19",
  "trees": [ ... ],
  "reviewLogs": [ ... ]
}
```

`version` を見て将来の移行に備える。
