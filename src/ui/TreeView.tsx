import type { ReactNode } from 'react';
import { nodeHistory, type NodeMark } from '../domain/history';
import { isLabel, labelText } from '../domain/label';
import { parseLinks } from '../domain/links';
import { shelfPath } from '../domain/shelf';
import { nodeTone, type NodeTone } from '../domain/tree';
import type { Node, ReviewLog, Tree } from '../domain/types';
import { useI18n } from './i18n';
import { navigate } from './route';

export const TONE_CLASS: Record<NodeTone, string> = {
  shu: 'text-shu',
  oudo: 'text-oudo',
  sumi: 'text-sumi',
};

// Vertical rules alone show whose child a node is. No numbers or bullets are added
export function Indent({ depth, children }: { depth: number; children: ReactNode }) {
  if (depth === 0) return <div>{children}</div>;
  return <div className="ml-[14px] border-l border-rule pl-[14px]">{children}</div>;
}

// The location of a synced tree within its document. Shown above the root to tell apart trees with the same heading (such as "Requirements")
export function TreePath({ tree }: { tree: Tree }) {
  const path = shelfPath(tree);
  if (path.length === 0) return null;
  return <div className="font-gothic text-xs text-usuzumi">{path.join(' / ')}</div>;
}

export function nodeTextClass(depth: number): string {
  return `font-mincho leading-[1.6] ${depth === 0 ? 'text-[20px]' : 'text-base'}`;
}

// Returns the id of the tree a [[link]] points at, or undefined when no tree has that root
export type LinkResolver = (target: string) => string | undefined;

// A link is marked only by an underline in the rule color. Color and weight are reserved for review results
function NodeText({ text, linkTo }: { text: string; linkTo?: LinkResolver }) {
  return (
    <>
      {parseLinks(text).map((segment, index) => {
        const id = segment.target && linkTo?.(segment.target);
        if (!id) return <span key={index}>{segment.text}</span>;
        return (
          <button
            key={index}
            type="button"
            onClick={() => navigate({ name: 'view', id })}
            className="underline decoration-rule underline-offset-4"
          >
            {segment.text}
          </button>
        );
      })}
    </>
  );
}

// How many past reviews the marks next to a node cover
export const HISTORY_LIMIT = 10;

const MARK_CLASS: Record<NodeMark, string> = {
  recalled: 'border border-koke',
  missed: 'bg-shu',
  // An empty slot keeps the later marks in the same column as on the other nodes
  absent: '',
};

// One small circle per past review, oldest on the left. Outlined for recalled and filled for
// missed, so the two can be told apart without relying on color
function NodeMarks({ marks }: { marks: NodeMark[] }) {
  const { t } = useI18n();
  const known = marks.filter((mark) => mark !== 'absent');
  if (known.length === 0) return null;
  const missed = known.filter((mark) => mark === 'missed').length;
  return (
    <span
      role="img"
      aria-label={t.history.marksLabel(missed, known.length)}
      className="inline-flex items-center gap-[3px]"
    >
      {marks.map((mark, index) => (
        <span key={index} className={`h-[6px] w-[6px] rounded-full ${MARK_CLASS[mark]}`} />
      ))}
    </span>
  );
}

interface TreeViewProps {
  node: Node;
  depth?: number;
  linkTo?: LinkResolver;
  // The review logs of this tree, with its id. Passed only by the view screen: the editor
  // preview has no use for them, and a review must stay free of hints
  history?: { treeId: string; logs: ReviewLog[] };
}

export function TreeView({ node, depth = 0, linkTo, history }: TreeViewProps) {
  const { t } = useI18n();
  // The root is never graded, so it has no history of its own
  // A label is never graded either. It is set in pale ink so the nodes to recall stand out, and any
  // result left from before it became a label is not shown
  const label = depth > 0 && isLabel(node);
  const marks =
    history && depth > 0 && !label
      ? nodeHistory(history.logs, history.treeId, node.id, HISTORY_LIMIT)
      : [];
  const hasMarks = marks.some((mark) => mark !== 'absent');
  const missCount = label ? 0 : node.missCount;
  const tone = label ? 'text-usuzumi' : TONE_CLASS[nodeTone(node)];
  return (
    <Indent depth={depth}>
      <div className={`py-1 ${nodeTextClass(depth)} ${tone}`}>
        <NodeText text={label ? labelText(node.text) : node.text} linkTo={linkTo} />
        {(missCount > 0 || hasMarks) && (
          // An inline-flex box wraps as one unit, so on a narrow screen the counter and the marks
          // drop under the text together instead of squeezing it
          <span className="ml-2 inline-flex items-center gap-2 align-middle font-gothic text-xs text-usuzumi">
            {missCount > 0 && <span>{t.view.missCount(missCount)}</span>}
            <NodeMarks marks={marks} />
          </span>
        )}
      </div>
      {node.children.map((child) => (
        <TreeView key={child.id} node={child} depth={depth + 1} linkTo={linkTo} history={history} />
      ))}
    </Indent>
  );
}
