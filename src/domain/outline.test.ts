import { describe, expect, it } from 'vitest';
import { parseOutline, toOutline } from './outline';
import type { Node } from './types';

type Shape = { text: string; children: Shape[] };

// id は毎回変わるので、構造と文言だけを比べる
function shape(node: Node): Shape {
  return { text: node.text, children: node.children.map(shape) };
}

const SAMPLE = [
  '人権の三要素',
  '  固有性',
  '    人間であることにより当然に有する権利',
  '  不可侵性',
  '    公権力によっても侵されない',
].join('\n');

describe('parseOutline', () => {
  it('空の入力は null', () => {
    expect(parseOutline('')).toBeNull();
    expect(parseOutline('\n  \n　\n')).toBeNull();
  });

  it('1行目を根、字下げを深さとして木を作る', () => {
    const root = parseOutline(SAMPLE)!;
    expect(shape(root)).toEqual({
      text: '人権の三要素',
      children: [
        {
          text: '固有性',
          children: [{ text: '人間であることにより当然に有する権利', children: [] }],
        },
        { text: '不可侵性', children: [{ text: '公権力によっても侵されない', children: [] }] },
      ],
    });
  });

  it('新しい節は未展開の統計で始まる', () => {
    const root = parseOutline(SAMPLE)!;
    expect(root.missCount).toBe(0);
    expect(root.lastResult).toBeNull();
    expect(root.children[0].missCount).toBe(0);
    expect(root.children[0].lastResult).toBeNull();
  });

  it('節ごとに異なる id を振る', () => {
    const root = parseOutline(SAMPLE)!;
    const ids = new Set<string>();
    const walk = (n: Node) => {
      ids.add(n.id);
      n.children.forEach(walk);
    };
    walk(root);
    expect(ids.size).toBe(5);
  });

  it('空行は捨てる', () => {
    const root = parseOutline('根\n\n  枝\n   \n    葉\n')!;
    expect(shape(root)).toEqual({
      text: '根',
      children: [{ text: '枝', children: [{ text: '葉', children: [] }] }],
    });
  });

  it('タブと全角空白はそれぞれ1段', () => {
    const root = parseOutline('根\n\t枝A\n\t\t葉A\n　枝B\n　　葉B')!;
    expect(shape(root)).toEqual({
      text: '根',
      children: [
        { text: '枝A', children: [{ text: '葉A', children: [] }] },
        { text: '枝B', children: [{ text: '葉B', children: [] }] },
      ],
    });
  });

  it('奇数個の空白は切り捨てる', () => {
    const root = parseOutline('根\n   枝\n     葉')!;
    expect(shape(root)).toEqual({
      text: '根',
      children: [{ text: '枝', children: [{ text: '葉', children: [] }] }],
    });
  });

  it('2行目以降が深さ0で書かれても深さ1に丸める', () => {
    const root = parseOutline('根\n枝A\n枝B')!;
    expect(shape(root)).toEqual({
      text: '根',
      children: [
        { text: '枝A', children: [] },
        { text: '枝B', children: [] },
      ],
    });
  });

  it('1行目が字下げされていても根として扱う', () => {
    const root = parseOutline('    根\n  枝')!;
    expect(shape(root)).toEqual({ text: '根', children: [{ text: '枝', children: [] }] });
  });

  it('直前より2段以上深い行は直前の節の子にする', () => {
    const root = parseOutline('根\n  枝\n        葉\n    葉2')!;
    expect(shape(root)).toEqual({
      text: '根',
      children: [
        {
          text: '枝',
          children: [
            { text: '葉', children: [] },
            { text: '葉2', children: [] },
          ],
        },
      ],
    });
  });

  it('行末の空白は文言に含めない', () => {
    const root = parseOutline('根  \n  枝　 ')!;
    expect(root.text).toBe('根');
    expect(root.children[0].text).toBe('枝');
  });
});

describe('toOutline', () => {
  it('半角空白2つで1段のアウトラインに戻す', () => {
    expect(toOutline(parseOutline(SAMPLE)!)).toBe(SAMPLE);
  });

  it('parseOutline(toOutline(n)) が構造を保つ', () => {
    const original = parseOutline('根\n\t枝A\n　　葉A\n        深い葉\n枝B\n\n   枝C')!;
    const again = parseOutline(toOutline(original))!;
    expect(shape(again)).toEqual(shape(original));
  });
});
