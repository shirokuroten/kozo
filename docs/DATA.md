# Data structures and spaced repetition

## Glossary (English term, Japanese UI term, identifier)

| English term | Japanese UI term | Identifier |
|---|---|---|
| tree | 木 | `Tree` |
| root | 根 | `root` |
| node | 節 | `Node` |
| review | 展開 | `Review` |
| miss count | 落ちた回数 | `missCount` |
| last result | 前回の結果 | `lastResult` |
| due (next due date) | 次の期日 | `due` |
| interval | 間隔 | `interval` |
| ease factor | 難易度係数 | `ease` |

## Types

```ts
type NodeId = string;

interface Node {
  id: NodeId;
  text: string;
  children: Node[];
  missCount: number;            // cumulative number of misses
  lastResult: boolean | null;   // whether it was recalled in the last review. null if never reviewed
}

interface Srs {
  interval: number;   // in days. 0 if never reviewed
  ease: number;       // initial value 2.5, lower bound 1.3
  reps: number;       // number of consecutive reviews with q >= 3
  due: string | null; // "YYYY-MM-DD". null if never reviewed
  lastRatio: number | null;
}

// Where a tree synced from an outside document came from. Trees made by hand do not have this
interface TreeSource {
  kind: 'gdoc';
  docId: string;
  path?: string[]; // location within the document (tab name, chapter headings). Used for display and for identity matching in sync
  docTitle?: string; // document title. Becomes the top level of the shelf
  order?: number; // position within the document. Lets the shelf follow the document order
}

interface Tree {
  id: string;
  root: Node;
  srs: Srs;
  source?: TreeSource;
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

## Persistence

- IndexedDB. The tables are `trees` and `reviewLogs`. In addition there is `meta`, which holds per-device settings (whether the sample tree has been inserted, the Google client ID, the list of documents registered for sync. Not included in the export)
- `trees` holds each whole tree as one record. Nodes are not broken out into a table (a tree is small, up to a few dozen nodes, and reading and writing it whole is simpler)
- `reviewLogs` is append only. It is recorded from the start for the history display in phase 2

## Outline format

```
人権の三要素
  固有性
    人間であることにより当然に有する権利
  不可侵性
    公権力によっても侵されない
```

(The example content is Japanese study material: 人権の三要素 (the three elements of human rights), 固有性 (inherence): rights a person has by virtue of being human, 不可侵性 (inviolability): not to be infringed even by public authority.)

Parsing rules:

- Blank lines are discarded
- Depth = amount of leading whitespace ÷ 2, rounded down. A tab and a full-width space each count as two spaces
- The first line is the root. The second and later lines go under the root even without indentation
- The parent is "the nearest preceding line with shallower indentation than this one". Lines with the same indentation become siblings. Because of this, the shape does not break when one level is written with four spaces, or when a line is two or more levels deeper than the one before it (these are not treated as errors)
- When a line with no indentation is followed by lines indented with two spaces, those lines become its children (to accept pasted text where a heading is followed by unindented bullets)
- Bullet markers at the start of a line (`- `, `* `, `+ `, `・`, `•`, `●` and so on) are not included in the text. This accepts pastes from Google Docs and Markdown as they are
- Parsing is the pure function `parseOutline(text: string): Node | null`
- The inverse `toOutline(root: Node): string` is also provided, and a test confirms that `parseOutline(toOutline(n))` preserves the structure

Carrying over statistics on edit: between the old and new trees, nodes whose "sequence of texts along the path from the root" matches are considered the same node, and `id`, `missCount` and `lastResult` are carried over.

## Spaced repetition (per tree)

Input: the review result `ratio = recalled nodes / total nodes`

### Conversion to a quality value

| ratio | q |
|---|---|
| 1.0 | 5 |
| 0.8 or more | 4 |
| 0.5 or more | 3 |
| below that | 1 |

### Update (SM-2 style)

```
if q < 3:
  reps = 0
  interval = 1
else:
  interval = reps == 0 ? 1 : reps == 1 ? 3 : round(interval * ease)
  reps += 1

ease = max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))

// a tree with missed nodes is pulled forward
if ratio < 1 and interval > 1:
  interval = max(1, round(interval * ratio))

due = today + interval days
```

This calculation is the pure function `schedule(srs: Srs, ratio: number, today: string): Srs`, and tests confirm the following.

- A first review with everything recalled gives interval 1, and the second gives 3
- With q < 3, reps goes back to 0
- ease never goes below 1.3
- With ratio 0.5, the interval shrinks to half

### Updating node statistics

When a review is saved, all nodes are traversed, and

- `lastResult` is overwritten with this review's ○ or ×
- `missCount` is incremented by 1 for nodes marked ×

## Export format

```json
{
  "app": "kozo",
  "version": 1,
  "exportedAt": "2026-09-19",
  "trees": [ ... ],
  "reviewLogs": [ ... ]
}
```

`version` is checked to prepare for future migrations.

The `app` value and the database name `kozo` keep the former name (the app used to be called 構造, kozo) and must not be changed. Changing them would make the trees already on a device invisible, and backups taken earlier would no longer be readable.
