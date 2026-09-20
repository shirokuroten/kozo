# Usage (how to add trees)

There are four ways to add trees. All of them end up as the same kind of outline.

Button names below are the English UI labels. The Japanese UI label is given in parentheses the first time each one appears.

## 1. Write directly in the app

"New tree" (新しい木を作る) on the home screen. The first line is the heading, and two leading spaces (or a full-width space, or a tab) go one level deeper. While you write, a preview of the tree appears below.

This is the quickest way when you write one tree at a time, as things come to mind.

## 2. Write trees up in Google Docs or elsewhere, then paste them in bulk

Paste into "Paste to import" (貼り付けて取り込む), found under "Import and backup" (取り込みとバックアップ) on the home screen.

How to write the document:

- Write a heading as an ordinary paragraph (a line with no indentation and no bullet marker). This becomes the root
- Write the branches under it as a bullet list. Press Tab to go one level deeper
- Writing the next heading starts the next tree. Blank lines may be present or absent

```
人権の三要素
- 固有性
  - 人間であることにより当然に有する権利
- 不可侵性
  - 公権力によっても侵されない

違憲審査基準
- 厳格審査
- 中間審査
```

(The example is Japanese study material. 人権の三要素 (the three elements of human rights): 固有性 (inherence), rights a person has by virtue of being human, and 不可侵性 (inviolability), not to be infringed even by public authority. 違憲審査基準 (standards of constitutional review): 厳格審査 (strict scrutiny) and 中間審査 (intermediate scrutiny).)

After pasting, a list shows the heading and node count of each tree that will be imported. Check it, then press "Import N trees" (N 本の木を取り込む).

Markers at the start of a line such as `-`, `*`, `・` and `●` are removed automatically. Indentation may be two spaces, four spaces, tabs or full-width spaces.

Note: bulk import adds "new trees" every time. Pasting the same document again gives you two copies of the same tree. When you want to fix a tree, use "Edit" on that tree inside the app (with editing, records such as the miss count are carried over).

## 3. Sync with Google Docs

This turns the pasting of method 2 into a single button. The way to write the document is the same. A one-time setup on the Google side is needed first. The procedure is in `GOOGLE.md`.

Unlike pasting, trees are never duplicated no matter how many times you sync. A tree with the same heading only has its content updated, and records such as the miss count are carried over. Just repeat: fix the document, press "Sync".

## 4. Bring trees over from another device

Make a single JSON file with "Export backup" (控えを書き出す) under "Import and backup", then use "Import backup" (控えを読み込む) on the other device. The data already on the device is not erased, and for identical trees the newer one remains.

Use this before changing phones, and for occasional backups. The data exists only on the device, so clearing the browser's data also erases the trees.

## Rough guide to tree size

A review opens the whole tree from the top. If a single tree is too large, each review becomes heavy and the result becomes coarse. Keep each tree to around 5 to 20 nodes, and split a large topic into several trees.
