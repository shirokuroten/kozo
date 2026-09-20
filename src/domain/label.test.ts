import { describe, expect, it } from 'vitest';
import { gradedNodes, isLabelText, labelText } from './label';
import { parseOutline } from './outline';

describe('isLabelText', () => {
  it('treats a line ending with a half-width or full-width colon as a label', () => {
    expect(isLabelText('理由：')).toBe(true);
    expect(isLabelText('必要となるもの:')).toBe(true);
    expect(isLabelText('理由： ')).toBe(true);
  });

  it('does not treat a colon in the middle, or a lone colon, as a label', () => {
    expect(isLabelText('原則：自由')).toBe(false);
    expect(isLabelText('10:30 に開始')).toBe(false);
    expect(isLabelText('：')).toBe(false);
    expect(isLabelText('違憲審査基準')).toBe(false);
  });
});

describe('labelText', () => {
  it('drops the colon from a label and leaves other text alone', () => {
    expect(labelText('理由：')).toBe('理由');
    expect(labelText('必要となるもの: ')).toBe('必要となるもの');
    expect(labelText('原則：自由')).toBe('原則：自由');
  });
});

describe('gradedNodes', () => {
  it('skips labels but keeps the nodes under them', () => {
    const root = parseOutline(
      [
        '違憲審査権',
        '  形式的審査',
        '  実質的審査',
        '    内容を精査する',
        '    必要となるもの：',
        '      違憲審査基準',
        '        理由:',
        '          人権の制約だから',
      ].join('\n'),
    )!;
    expect(gradedNodes(root).map((n) => n.text)).toEqual([
      '形式的審査',
      '実質的審査',
      '内容を精査する',
      '違憲審査基準',
      '人権の制約だから',
    ]);
  });

  it('never counts the root, even when it ends with a colon', () => {
    const root = parseOutline('論点：\n  枝')!;
    expect(gradedNodes(root).map((n) => n.text)).toEqual(['枝']);
  });
});
