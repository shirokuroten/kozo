# Order of implementation

Proceed one phase at a time. At the end of each phase, build and test must pass.

## Phase 0: Foundation

- [x] Create the project with Vite + React + TypeScript
- [x] Set up Tailwind, vitest, eslint and prettier
- [x] Put the types (`DATA.md`) in `src/domain/`
- [x] Implement `parseOutline` and `toOutline` and write tests
- [x] Implement `schedule` and write tests
- [x] Implement `mergeStats(old, new)`, which carries over statistics on edit, and write tests

Done when: the domain logic is verified by tests alone, without any UI

## Phase 1: Storage and list

- [x] `trees` and `reviewLogs` tables with Dexie
- [x] Create the repository layer `src/data/` so that the UI never touches IndexedDB directly
- [x] Home screen. Two sections: "review today" and "upcoming"
- [x] Insert exactly one sample tree on first launch (人権の三要素, the three elements of human rights)

## Phase 2: Editing

- [x] Outline text area and preview
- [x] Create new, edit existing, delete
- [x] Carry over statistics on edit
- [x] Confirmation when leaving with unsaved changes

## Phase 3: Review

This is the core. Reproduce the seven steps of "Review" in `SPEC.md` exactly.

- [x] Starts with only the root displayed
- [x] The "N branches. Recall them, then open" button
- [x] Show the children all at once, with ○ and × on each node
- [x] The next expand button appears only under nodes that have been marked
- [x] Progress display, stop
- [x] Result screen and save. Saving updates `schedule` and the node statistics, and appends to `reviewLogs`
- [x] Color coding and miss count display on the tree view screen

Done when: a review feels the same as in `reference/prototype.jsx`. Confirm by running through 人権の三要素 from start to finish

## Phase 4: Portability

- [x] Make it a PWA (manifest, service worker, offline operation)
- [x] JSON export and import
- [x] Copy a tree as Markdown

## Phase 5: Finishing

- [x] Check every screen against `DESIGN.md`
- [x] Visible keyboard focus
- [x] `prefers-reduced-motion`
- [ ] Check thumb operation of the review screen on a real phone (how easy ○ and × are to press)

## Phase 6: Import from documents (added at the user's request)

- [x] Make pasted bullet lists (with markers, with four-space indentation) parseable
- [x] Bulk import
- [x] Implement `docToOutlines`, which parses a Google document, and `planSync`, which plans a sync, and write tests
- [x] Store the client ID and the registered documents on the device
- [x] Sign-in (token flow), fetching documents, and the sync screen
- [x] Sync a real document with the user's client ID and confirm it works (2026-09-20, confirmed by the user on the published version)
- [x] Put a sync button on the list (shown only when a document is registered)
- [x] Workflow for hosting on GitHub Pages

## Phase 7: Shelf and search (added at the user's request)

Prioritize the use of summarizing books one has read and looking things up now and then, over daily memorization.

- [x] Give synced trees a document title and an order
- [x] Implement `buildShelf`, which assembles the shelf, and `searchTrees`, which searches, and write tests
- [x] Turn the list into the shelf. Move the list of due trees to a separate screen
- [x] Search

## Phase 8: English for the public repository

The repository is public on GitHub, so everything a visitor reads is in English, and the app can be used in English.

- [x] English docs and README
- [x] Comments and test titles in English
- [x] Selectable UI language (Japanese or English) with English error messages

## Phase 9: The ideas that had been put off

Everything that the first spec listed as "later", plus the dark theme.

- [x] Dark theme that follows the system setting
- [x] Links between trees with `[[root text]]`
- [x] Reviewing several trees in a row from a shelf group or the due list
- [x] Review history calendar
- [x] Past reviews and per-node history marks on the tree view

## After that

Nothing is planned. See "Later ideas" at the end of `SPEC.md`, and consult the user before starting anything new.
