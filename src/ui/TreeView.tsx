import type { ReactNode } from 'react';
import { shelfPath } from '../domain/shelf';
import { nodeTone, type NodeTone } from '../domain/tree';
import type { Node, Tree } from '../domain/types';

export const TONE_CLASS: Record<NodeTone, string> = {
  shu: 'text-shu',
  oudo: 'text-oudo',
  sumi: 'text-sumi',
};

// 縦罫線だけで「誰の子か」を示す。番号や点は付けない
export function Indent({ depth, children }: { depth: number; children: ReactNode }) {
  if (depth === 0) return <div>{children}</div>;
  return <div className="ml-[14px] border-l border-rule pl-[14px]">{children}</div>;
}

// 同期した木の、文書の中での場所。同じ見出し（「要件」など）の木を見分けるために根の上に添える
export function TreePath({ tree }: { tree: Tree }) {
  const path = shelfPath(tree);
  if (path.length === 0) return null;
  return <div className="font-gothic text-xs text-usuzumi">{path.join(' / ')}</div>;
}

export function nodeTextClass(depth: number): string {
  return `font-mincho leading-[1.6] ${depth === 0 ? 'text-[20px]' : 'text-base'}`;
}

export function TreeView({ node, depth = 0 }: { node: Node; depth?: number }) {
  return (
    <Indent depth={depth}>
      <div className={`py-1 ${nodeTextClass(depth)} ${TONE_CLASS[nodeTone(node)]}`}>
        {node.text}
        {node.missCount > 0 && (
          <span className="ml-2 font-gothic text-xs text-usuzumi">落 {node.missCount}</span>
        )}
      </div>
      {node.children.map((child) => (
        <TreeView key={child.id} node={child} depth={depth + 1} />
      ))}
    </Indent>
  );
}
