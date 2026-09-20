import type { ReactNode } from 'react';
import { shelfPath } from '../domain/shelf';
import { nodeTone, type NodeTone } from '../domain/tree';
import type { Node, Tree } from '../domain/types';
import { useI18n } from './i18n';

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

export function TreeView({ node, depth = 0 }: { node: Node; depth?: number }) {
  const { t } = useI18n();
  return (
    <Indent depth={depth}>
      <div className={`py-1 ${nodeTextClass(depth)} ${TONE_CLASS[nodeTone(node)]}`}>
        {node.text}
        {node.missCount > 0 && (
          <span className="ml-2 font-gothic text-xs text-usuzumi">
            {t.view.missCount(node.missCount)}
          </span>
        )}
      </div>
      {node.children.map((child) => (
        <TreeView key={child.id} node={child} depth={depth + 1} />
      ))}
    </Indent>
  );
}
