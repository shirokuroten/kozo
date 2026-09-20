# Outline Recall

A study tool for the Japanese bar exam, and for any knowledge that has a structure. You write what you know as outline trees, and you review a tree by opening it from the top: recall the branches in your head, open them, and mark each node as recalled or missed.

Live app: https://shirokuroten.github.io/outline-recall/

## Why a tree instead of flashcards

Legal knowledge comes in structures. You need to reproduce both the enumeration ("the three elements of human rights are inherence, inviolability and universality") and what hangs under each item. Flashcard apps chop such a structure into fill-in-the-blank fragments, and the structure itself disappears from view.

Here the structure is what you rehearse. A tree is always shown as a tree, you write it yourself as an outline, and a review always opens the whole tree from the root down. Nothing is asked in isolation.

The name: law students call their self-made summaries of a subject outlines, and recall is the core action of the app. You recall first, then open.

## Features

- Shelf view: trees are arranged as document > tab > heading > tree, in the order of the source document
- Search across all text: roots, nodes and locations
- Whole-tree review with spaced repetition per tree (SM-2 based). Trees with missed nodes come back sooner
- One-way sync from Google Docs. The app never writes to your documents
- Paste import for outlines written anywhere else
- JSON backup (export and import) for moving between devices
- Offline PWA. Put it on your phone's home screen
- Japanese / English UI. The default follows the browser language, and you can switch at the bottom of the home screen

The app does not push you to clear a daily queue. Due trees are counted quietly and listed on a separate screen. Open one when you feel like reviewing.

## Privacy model

- No server and no account. Trees and review history stay in the browser's IndexedDB on your device
- Google sync runs entirely in your browser with your own OAuth client ID. The scope is read-only (`documents.readonly`), and the access token is kept in memory only
- Nothing secret is in this repository: no keys, no tokens, no client IDs, no study content

Details, including what is public and what is not, are in [docs/GOOGLE.md](docs/GOOGLE.md).

## Writing a document for sync

There is one rule: the line right above a bullet list becomes the root of a tree, and the bullet list becomes its nodes. Headings that have no bullets under them do not become trees. Together with the tab name, they become the location shown above the tree and the levels of the shelf.

```
Chapter 2 Property            <- heading with no bullets: location
Good-faith acquisition        <- heading with no bullets: location
Requirements                  <- line right above a bullet list: root
  - It is a movable
  - A valid transaction
Effect                        <- next root
  - Original acquisition
```

Setup and sync rules are in [docs/GOOGLE.md](docs/GOOGLE.md). Other ways to add trees (writing in the app, pasting, restoring a backup) are in [docs/USAGE.md](docs/USAGE.md).

## Development

Requires Node 24.

```
npm install
npm run dev       # development server
npm run test      # vitest
npm run lint
npm run build     # production build
```

Stack: Vite, React, TypeScript, Tailwind CSS, Dexie (IndexedDB), vite-plugin-pwa, vitest.

Deployment: GitHub Actions runs lint, tests and the build, then deploys to GitHub Pages on every push to `main`.

## Docs

- [docs/SPEC.md](docs/SPEC.md): functional spec. Principles, screens, and the exact steps of a review
- [docs/DATA.md](docs/DATA.md): glossary, data types, outline format, and the spaced repetition algorithm
- [docs/DESIGN.md](docs/DESIGN.md): appearance and wording policy, including the fixed UI strings in both languages
- [docs/TASKS.md](docs/TASKS.md): implementation phases and their status
- [docs/USAGE.md](docs/USAGE.md): the four ways to add trees
- [docs/GOOGLE.md](docs/GOOGLE.md): Google Docs sync. Setup, how to write a document, sync rules, and the line between public and private
- [CLAUDE.md](CLAUDE.md): working rules for contributors and coding agents
