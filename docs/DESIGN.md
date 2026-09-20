# Appearance and wording

## Policy

The tree is the main character. Add no decoration. Aim for the feel of opening, with a finger, an outline written in ink in a paper notebook.

A phone held vertically is the baseline. Up to a width of 520px the layout is a single column. On wider screens it is centered with margins on the left and right.

## Colors

The Japanese color names are kept because they are used as the CSS token names (`--color-sumi` and so on).

| Role | Token | Value |
|---|---|---|
| Background, paper | `paper` | `#FAFBF9` |
| Ink (墨, sumi): body text, root, ordinary nodes | `sumi` | `#22304A` |
| Pale ink (薄墨, usuzumi): notes, progress, due dates | `usuzumi` | `#6B7590` |
| Rule (罫線, rule): vertical lines of branches, dividers | `rule` | `#C9CFDA` |
| Vermilion (朱, shu): nodes missed last time, × | `shu` | `#C8452B` |
| Ochre (黄土, oudo): nodes that have been missed in the past | `oudo` | `#B08A2E` |
| Moss (苔, koke): ○ | `koke` | `#3E7C59` |

How the color of a node is decided: vermilion (shu) if `lastResult === false`, otherwise ochre (oudo) if `missCount > 0`, otherwise ink (sumi).

### Dark theme

The dark theme follows the system setting (`prefers-color-scheme: dark`). There is no switch in the app. The roles are the same, and the values are tuned so text on paper keeps roughly the same contrast as in the light theme.

| Token | Light | Dark |
|---|---|---|
| `paper` | `#FAFBF9` | `#14171C` |
| `sumi` | `#22304A` | `#E4E7EC` |
| `usuzumi` | `#6B7590` | `#9AA3B5` |
| `rule` | `#C9CFDA` | `#343A46` |
| `shu` | `#C8452B` | `#E0705A` |
| `oudo` | `#B08A2E` | `#CFA94A` |
| `koke` | `#3E7C59` | `#6FB58C` |
| `surface` (inputs, outlined buttons) | `#FFFFFF` | `#1C2027` |

Components use only the token classes. Never `white`, `black` or a hex value: text on a filled ink, moss or vermilion background uses `paper`, so it flips with the theme.

## Type

- Tree text (root, nodes) is set in a Mincho (serif) face. `"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif`
- Controls (buttons, progress, notes) are set in a Gothic (sans-serif) face. `"Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif`
- The root is 20px, nodes are 16px, notes are 12 to 13px
- Line height is 1.6 for tree text and 1.7 for the text area
- Do not emphasize words with bold or color

## How to draw a tree

- For each level of depth: 14px of left margin, a `1px` vertical rule, then another 14px of margin
- The vertical rule is the only structural expression of "whose child this node is". Do not use numbers, arrows or bullet dots
- The ○ and × next to a node are round buttons 36px in diameter. ○ has a thin moss (koke) outline and × has a thin vermilion (shu) outline

## Motion

- The response to a user action (a branch opens, a ○ or × is set) may be a short change within 150ms
- Do not add animations that move on their own, or fades between screens
- Respect `prefers-reduced-motion`

## Wording

The UI is available in Japanese and English. All strings for both languages live in `src/ui/i18n.tsx`. Error messages are always in English, regardless of the UI language.

### Japanese

Words used consistently:

- 木、根、節、枝 (tree, root, node, branch)
- 展開する (to review, literally "to expand"). Never say 復習する ("to study again")
- 言えた／言えなかった (recalled / not recalled, literally "could say it" / "could not say it")
- 落ちた (missed, literally "dropped"). Never say 間違えた ("got it wrong")
- 次の出番 (next due, literally "next turn"). On screen, never say 期日 ("deadline")

Fixed strings:

- Expand button: 「枝が N 本。思い出してから開く」
- All recalled: 「N / N が言えた。木が丸ごと再現できている」
- Some missed: 「a / b が言えた。落ちた節は次回、木の上で朱色で表示される」
- Never reviewed: 「まだ一度も展開していない」
- No trees: 「まだ木がない。最初の1本を作る」
- Editor hint: 「1行目が見出し。行頭の空白2つ（または全角空白）で1段深くなる」

Style:

- Put the sentence-ending 「。」 only when several sentences follow each other. A single sentence gets none
- Do not use polite forms (keigo). End on a verb or a noun, as in 「保存」 (save), 「戻る」 (back), 「中断」 (stop)
- Do not use the em dash (U+2014) or the en dash (U+2013)
- Do not use exclamation marks
- Do not write encouragement such as 「おめでとう」 (congratulations) or 「頑張ろう」 (keep it up). Show only the result, plainly

### English

Words used consistently:

- tree, root, node, branch
- review. Never say "study" or "quiz"
- recalled / missed. Never say "correct" / "wrong"
- due / next due

Fixed strings:

- Expand button: `N branches. Recall them, then open` (singular: `1 branch. Recall it, then open`)
- All recalled: `Recalled N / N. The whole tree is intact`
- Some missed: `Recalled a / b. Missed nodes will show in vermilion on the tree next time`
- Never reviewed: `Not reviewed yet`
- No trees: `No trees yet. Make the first one`
- Editor hint: `First line is the heading. Indent two spaces (or a tab) to go one level deeper`

Style:

- Terse. Sentence case
- A trailing period only when several sentences follow each other. A single sentence gets none
- Plain verbs or nouns for buttons, such as `Save`, `Back`, `Stop`
- Do not use the em dash (U+2014) or the en dash (U+2013)
- Do not use exclamation marks
- No encouragement or praise. Show only the result, plainly

### Everywhere

The em dash (U+2014) and the en dash (U+2013) are not used anywhere: not in UI strings, not in strings in code, not in comments, not in documentation. Use commas, parentheses, colons or separate sentences.
