import { useState, useEffect, useMemo } from "react";

// ---------- helpers ----------
const uid = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d) => {
  const t = new Date();
  t.setDate(t.getDate() + d);
  return t.toISOString().slice(0, 10);
};
const STORAGE_KEY = "kozo:trees";

function parseOutline(text) {
  const lines = text.split("\n").filter((l) => l.trim() !== "");
  if (lines.length === 0) return null;
  const level = (line) => {
    let n = 0;
    for (const ch of line) {
      if (ch === "\t" || ch === "\u3000") n += 2;
      else if (ch === " ") n += 1;
      else break;
    }
    return Math.floor(n / 2);
  };
  const root = { id: uid(), text: lines[0].trim(), children: [] };
  const stack = [root];
  for (const line of lines.slice(1)) {
    const lv = Math.max(1, level(line));
    const node = { id: uid(), text: line.trim(), children: [] };
    while (stack.length > lv) stack.pop();
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  }
  return root;
}

function toOutline(node, depth = 0) {
  return [
    "  ".repeat(depth) + node.text,
    ...node.children.map((c) => toOutline(c, depth + 1)),
  ].join("\n");
}

function countNodes(node) {
  return node.children.reduce((s, c) => s + 1 + countNodes(c), 0);
}

function applyGrades(node, grades) {
  const g = grades[node.id];
  return {
    ...node,
    last: g === undefined ? node.last : g,
    miss: (node.miss || 0) + (g === false ? 1 : 0),
    children: node.children.map((c) => applyGrades(c, grades)),
  };
}

function schedule(srs, ratio) {
  const q = ratio === 1 ? 5 : ratio >= 0.8 ? 4 : ratio >= 0.5 ? 3 : 1;
  let { interval = 0, ease = 2.5, reps = 0 } = srs;
  if (q < 3) {
    reps = 0;
    interval = 1;
  } else {
    interval = reps === 0 ? 1 : reps === 1 ? 3 : Math.round(interval * ease);
    reps += 1;
  }
  ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  if (ratio < 1 && interval > 1) interval = Math.max(1, Math.round(interval * ratio));
  return { interval, ease, reps, due: addDays(interval), lastRatio: ratio };
}

// ---------- visual tokens ----------
const ink = "#22304A";
const inkSoft = "#6B7590";
const line = "#C9CFDA";
const vermilion = "#C8452B";
const moss = "#3E7C59";
const serif = '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif';
const sans = '"Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif';

const Btn = ({ children, onClick, kind = "ghost", disabled }) => {
  const base = "px-4 py-2 rounded-full text-sm transition-colors";
  const styles =
    kind === "solid"
      ? { background: ink, color: "#fff" }
      : { border: `1px solid ${line}`, color: ink, background: "#fff" };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={base}
      style={{ ...styles, fontFamily: sans, opacity: disabled ? 0.4 : 1 }}
    >
      {children}
    </button>
  );
};

const nodeColor = (n) =>
  n.last === false ? vermilion : (n.miss || 0) > 0 ? "#B08A2E" : ink;

// ---------- tree display (view mode) ----------
function TreeView({ node, depth = 0 }) {
  return (
    <div style={{ marginLeft: depth === 0 ? 0 : 14, borderLeft: depth === 0 ? "none" : `1px solid ${line}`, paddingLeft: depth === 0 ? 0 : 14 }}>
      <div
        className="py-1"
        style={{
          fontFamily: serif,
          fontSize: depth === 0 ? 20 : 16,
          color: nodeColor(node),
          lineHeight: 1.6,
        }}
      >
        {node.text}
        {(node.miss || 0) > 0 && (
          <span className="ml-2 text-xs" style={{ color: inkSoft, fontFamily: sans }}>
            落 {node.miss}
          </span>
        )}
      </div>
      {node.children.map((c) => (
        <TreeView key={c.id} node={c} depth={depth + 1} />
      ))}
    </div>
  );
}

// ---------- review mode ----------
function ReviewNode({ node, depth, opened, grades, onOpen, onGrade }) {
  const graded = grades[node.id];
  const hasKids = node.children.length > 0;
  const isOpen = opened.has(node.id);
  const canShowKids = depth === 0 || graded !== undefined;

  return (
    <div style={{ marginLeft: depth === 0 ? 0 : 14, borderLeft: depth === 0 ? "none" : `1px solid ${line}`, paddingLeft: depth === 0 ? 0 : 14 }}>
      <div className="flex items-start justify-between gap-3 py-1">
        <div
          style={{
            fontFamily: serif,
            fontSize: depth === 0 ? 20 : 16,
            color: graded === false ? vermilion : ink,
            lineHeight: 1.6,
          }}
        >
          {node.text}
        </div>
        {depth > 0 && graded === undefined && (
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => onGrade(node.id, true)}
              className="w-9 h-9 rounded-full text-base"
              style={{ border: `1.5px solid ${moss}`, color: moss, background: "#fff" }}
              aria-label="言えた"
            >
              ○
            </button>
            <button
              onClick={() => onGrade(node.id, false)}
              className="w-9 h-9 rounded-full text-base"
              style={{ border: `1.5px solid ${vermilion}`, color: vermilion, background: "#fff" }}
              aria-label="言えなかった"
            >
              ×
            </button>
          </div>
        )}
        {depth > 0 && graded !== undefined && (
          <span className="shrink-0 text-sm pt-1" style={{ color: graded ? moss : vermilion, fontFamily: sans }}>
            {graded ? "○" : "×"}
          </span>
        )}
      </div>

      {hasKids && canShowKids && !isOpen && (
        <button
          onClick={() => onOpen(node.id)}
          className="ml-4 my-1 px-3 py-2 rounded text-sm text-left"
          style={{
            border: `1px dashed ${line}`,
            color: inkSoft,
            fontFamily: sans,
            background: "#fff",
          }}
        >
          枝が {node.children.length} 本。思い出してから開く
        </button>
      )}

      {hasKids && isOpen &&
        node.children.map((c) => (
          <ReviewNode
            key={c.id}
            node={c}
            depth={depth + 1}
            opened={opened}
            grades={grades}
            onOpen={onOpen}
            onGrade={onGrade}
          />
        ))}
    </div>
  );
}

function Review({ tree, onDone, onCancel }) {
  const [opened, setOpened] = useState(new Set());
  const [grades, setGrades] = useState({});
  const total = countNodes(tree.root);
  const gradedCount = Object.keys(grades).length;
  const correct = Object.values(grades).filter(Boolean).length;
  const finished = gradedCount === total;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm" style={{ color: inkSoft, fontFamily: sans }}>
          {gradedCount} / {total}
        </span>
        <button onClick={onCancel} className="text-sm" style={{ color: inkSoft, fontFamily: sans }}>
          中断
        </button>
      </div>
      <ReviewNode
        node={tree.root}
        depth={0}
        opened={opened}
        grades={grades}
        onOpen={(id) => setOpened((s) => new Set([...s, id]))}
        onGrade={(id, v) => setGrades((g) => ({ ...g, [id]: v }))}
      />
      {finished && (
        <div className="mt-8 pt-4" style={{ borderTop: `1px solid ${line}` }}>
          <p style={{ fontFamily: serif, color: ink, fontSize: 16 }}>
            {correct} / {total} が言えた
            {correct < total ? "。落ちた枝は次回、木の上で朱色で表示される" : "。木が丸ごと再現できている"}
          </p>
          <div className="mt-3">
            <Btn kind="solid" onClick={() => onDone(grades, correct / total)}>
              結果を保存
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- editor ----------
const SAMPLE = `人権の三要素
  固有性
    人間であることにより当然に有する権利
  不可侵性
    公権力によっても侵されない
  普遍性
    人種、性別、身分等を問わず誰もが有する`;

function Editor({ initial, onSave, onCancel }) {
  const [text, setText] = useState(initial ?? SAMPLE);
  const preview = useMemo(() => parseOutline(text), [text]);
  return (
    <div>
      <p className="text-sm mb-2" style={{ color: inkSoft, fontFamily: sans }}>
        1行目が見出し。行頭の空白2つ（または全角空白）で1段深くなる
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        className="w-full p-3 rounded text-sm"
        style={{ border: `1px solid ${line}`, fontFamily: sans, color: ink, lineHeight: 1.7, outline: "none" }}
        spellCheck={false}
      />
      {preview && (
        <div className="mt-4 p-3 rounded" style={{ border: `1px solid ${line}` }}>
          <TreeView node={preview} />
        </div>
      )}
      <div className="flex gap-2 mt-4">
        <Btn kind="solid" onClick={() => preview && onSave(preview)} disabled={!preview}>
          この木を保存
        </Btn>
        <Btn onClick={onCancel}>戻る</Btn>
      </div>
    </div>
  );
}

// ---------- app ----------
export default function App() {
  const [trees, setTrees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState({ name: "home" });

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(STORAGE_KEY, false);
        if (r?.value) setTrees(JSON.parse(r.value));
      } catch (e) {
        // no data yet
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = async (next) => {
    setTrees(next);
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(next), false);
    } catch (e) {
      console.error("save failed", e);
    }
  };

  const t = today();
  const due = trees.filter((x) => !x.srs?.due || x.srs.due <= t);
  const later = trees.filter((x) => x.srs?.due && x.srs.due > t).sort((a, b) => a.srs.due.localeCompare(b.srs.due));

  const wrap = (children) => (
    <div className="min-h-screen px-5 py-6" style={{ background: "#FAFBF9", maxWidth: 520, margin: "0 auto" }}>
      {children}
    </div>
  );

  if (loading) return wrap(<p style={{ color: inkSoft, fontFamily: sans }}>読み込み中</p>);

  // --- edit ---
  if (screen.name === "edit") {
    const existing = trees.find((x) => x.id === screen.id);
    return wrap(
      <Editor
        initial={existing ? toOutline(existing.root) : undefined}
        onCancel={() => setScreen({ name: "home" })}
        onSave={(root) => {
          const next = existing
            ? trees.map((x) => (x.id === existing.id ? { ...x, root } : x))
            : [...trees, { id: uid(), root, srs: {} }];
          persist(next);
          setScreen({ name: "home" });
        }}
      />
    );
  }

  // --- review ---
  if (screen.name === "review") {
    const tree = trees.find((x) => x.id === screen.id);
    return wrap(
      <Review
        tree={tree}
        onCancel={() => setScreen({ name: "home" })}
        onDone={(grades, ratio) => {
          const updated = {
            ...tree,
            root: applyGrades(tree.root, grades),
            srs: schedule(tree.srs || {}, ratio),
          };
          persist(trees.map((x) => (x.id === tree.id ? updated : x)));
          setScreen({ name: "home" });
        }}
      />
    );
  }

  // --- view ---
  if (screen.name === "view") {
    const tree = trees.find((x) => x.id === screen.id);
    return wrap(
      <div>
        <button onClick={() => setScreen({ name: "home" })} className="text-sm mb-4" style={{ color: inkSoft, fontFamily: sans }}>
          戻る
        </button>
        <TreeView node={tree.root} />
        <p className="text-xs mt-4" style={{ color: inkSoft, fontFamily: sans }}>
          {tree.srs?.due ? `次の出番 ${tree.srs.due}（${tree.srs.interval}日間隔）` : "まだ一度も復習していない"}
        </p>
        <div className="flex gap-2 mt-4 flex-wrap">
          <Btn kind="solid" onClick={() => setScreen({ name: "review", id: tree.id })}>今すぐ展開する</Btn>
          <Btn onClick={() => setScreen({ name: "edit", id: tree.id })}>編集</Btn>
          <Btn
            onClick={() => {
              persist(trees.filter((x) => x.id !== tree.id));
              setScreen({ name: "home" });
            }}
          >
            削除
          </Btn>
        </div>
      </div>
    );
  }

  // --- home ---
  const Row = ({ tree }) => {
    const misses = (function walk(n) {
      return n.children.reduce((s, c) => s + (c.last === false ? 1 : 0) + walk(c), 0);
    })(tree.root);
    return (
      <div className="flex items-center justify-between py-3" style={{ borderBottom: `1px solid ${line}` }}>
        <button onClick={() => setScreen({ name: "view", id: tree.id })} className="text-left">
          <div style={{ fontFamily: serif, color: ink, fontSize: 17 }}>{tree.root.text}</div>
          <div className="text-xs mt-0.5" style={{ color: inkSoft, fontFamily: sans }}>
            {countNodes(tree.root)} 節
            {misses > 0 && <span style={{ color: vermilion }}>　前回 {misses} 節で落ちた</span>}
            {tree.srs?.due && tree.srs.due > t && `　${tree.srs.due}`}
          </div>
        </button>
        <Btn kind="solid" onClick={() => setScreen({ name: "review", id: tree.id })}>展開</Btn>
      </div>
    );
  };

  return wrap(
    <div>
      <h1 style={{ fontFamily: serif, color: ink, fontSize: 26, letterSpacing: 2 }}>構造</h1>
      <p className="text-sm mt-1 mb-6" style={{ color: inkSoft, fontFamily: sans }}>
        木を上から展開して、自分で再現する
      </p>

      {trees.length === 0 && (
        <p className="mb-4" style={{ fontFamily: serif, color: ink }}>
          まだ木がない。最初の1本を作る
        </p>
      )}

      {due.length > 0 && (
        <div className="mb-6">
          <p className="text-sm mb-1" style={{ color: ink, fontFamily: sans }}>今日展開する {due.length} 本</p>
          {due.map((x) => <Row key={x.id} tree={x} />)}
        </div>
      )}
      {later.length > 0 && (
        <div className="mb-6">
          <p className="text-sm mb-1" style={{ color: inkSoft, fontFamily: sans }}>この先</p>
          {later.map((x) => <Row key={x.id} tree={x} />)}
        </div>
      )}

      <Btn kind="solid" onClick={() => setScreen({ name: "edit" })}>新しい木を作る</Btn>
    </div>
  );
}
