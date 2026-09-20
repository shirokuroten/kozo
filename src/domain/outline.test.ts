import { describe, expect, it } from 'vitest';
import { parseOutline, toOutline } from './outline';
import type { Node } from './types';

type Shape = { text: string; children: Shape[] };

// Ids change on every run, so only structure and text are compared
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
  it('returns null for empty input', () => {
    expect(parseOutline('')).toBeNull();
    expect(parseOutline('\n  \n　\n')).toBeNull();
  });

  it('builds a tree with the first line as the root and indentation as depth', () => {
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

  it('starts new nodes with never-reviewed stats', () => {
    const root = parseOutline(SAMPLE)!;
    expect(root.missCount).toBe(0);
    expect(root.lastResult).toBeNull();
    expect(root.children[0].missCount).toBe(0);
    expect(root.children[0].lastResult).toBeNull();
  });

  it('assigns a different id to each node', () => {
    const root = parseOutline(SAMPLE)!;
    const ids = new Set<string>();
    const walk = (n: Node) => {
      ids.add(n.id);
      n.children.forEach(walk);
    };
    walk(root);
    expect(ids.size).toBe(5);
  });

  it('drops blank lines', () => {
    const root = parseOutline('根\n\n  枝\n   \n    葉\n')!;
    expect(shape(root)).toEqual({
      text: '根',
      children: [{ text: '枝', children: [{ text: '葉', children: [] }] }],
    });
  });

  it('counts a tab and a full-width space as one level each', () => {
    const root = parseOutline('根\n\t枝A\n\t\t葉A\n　枝B\n　　葉B')!;
    expect(shape(root)).toEqual({
      text: '根',
      children: [
        { text: '枝A', children: [{ text: '葉A', children: [] }] },
        { text: '枝B', children: [{ text: '葉B', children: [] }] },
      ],
    });
  });

  it('rounds an odd number of spaces down', () => {
    const root = parseOutline('根\n   枝\n     葉')!;
    expect(shape(root)).toEqual({
      text: '根',
      children: [{ text: '枝', children: [{ text: '葉', children: [] }] }],
    });
  });

  it('puts lines after the first under the root even when they have no indentation', () => {
    const root = parseOutline('根\n枝A\n枝B')!;
    expect(shape(root)).toEqual({
      text: '根',
      children: [
        { text: '枝A', children: [] },
        { text: '枝B', children: [] },
      ],
    });
  });

  it('treats the first line as the root even when it is indented', () => {
    const root = parseOutline('    根\n  枝')!;
    expect(shape(root)).toEqual({ text: '根', children: [{ text: '枝', children: [] }] });
  });

  it('makes a line two or more levels deeper than the previous one a child of the previous node', () => {
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

  it('makes lines with the same indentation width siblings when going back from a deep line to a shallow one', () => {
    // The shape holds even when one level is written as four spaces
    const root = parseOutline('根\n    枝\n        葉A\n        葉B\n    枝2')!;
    expect(shape(root)).toEqual({
      text: '根',
      children: [
        {
          text: '枝',
          children: [
            { text: '葉A', children: [] },
            { text: '葉B', children: [] },
          ],
        },
        { text: '枝2', children: [] },
      ],
    });
  });

  it('leaves leading bullet markers out of the text', () => {
    // So that an outline pasted from a word processor or Markdown can be used as is
    const root = parseOutline('根\n- 枝A\n  - 葉A\n* 枝B\n   * 葉B\n・枝C\n● 枝D')!;
    expect(shape(root)).toEqual({
      text: '根',
      children: [
        { text: '枝A', children: [{ text: '葉A', children: [] }] },
        { text: '枝B', children: [{ text: '葉B', children: [] }] },
        { text: '枝C', children: [] },
        { text: '枝D', children: [] },
      ],
    });
  });

  it('drops marker-only lines as blank lines and keeps hyphens inside text', () => {
    const root = parseOutline('- 根\n  -\n  A-B 間の関係\n  -1 は負の数')!;
    expect(shape(root)).toEqual({
      text: '根',
      children: [
        { text: 'A-B 間の関係', children: [] },
        { text: '-1 は負の数', children: [] },
      ],
    });
  });

  it('leaves trailing whitespace out of the text', () => {
    const root = parseOutline('根  \n  枝　 ')!;
    expect(root.text).toBe('根');
    expect(root.children[0].text).toBe('枝');
  });
});

describe('toOutline', () => {
  it('turns a tree back into an outline with two half-width spaces per level', () => {
    expect(toOutline(parseOutline(SAMPLE)!)).toBe(SAMPLE);
  });

  it('preserves structure through parseOutline(toOutline(n))', () => {
    const original = parseOutline('根\n\t枝A\n　　葉A\n        深い葉\n枝B\n\n   枝C')!;
    const again = parseOutline(toOutline(original))!;
    expect(shape(again)).toEqual(shape(original));
  });
});
