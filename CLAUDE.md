# Outline Recall

A study app for the Japanese bar exam and its preliminary exam. The name comes from two things: law students call the self-made notes that summarize the system of a subject an outline, and the core of this app is to recall first, then open. The former name was 構造 (kozo, "structure"). For compatibility, `kozo` remains as the on-device database name and as the identifier in the export file.

The user builds knowledge as "trees", practices reproducing each tree by expanding it from the top, and cycles through them with spaced repetition.

## How it is used

The user summarizes the books they read in Google Docs (tabs are parts, headings are chapters, the bullet lists under them are trees) and brings them in by sync. It is not used for daily memorization. The user looks things up now and then, and reviews a tree from time to time.

For this reason, the main view of the home screen is the shelf (document > tab > heading > tree) and search. Spaced repetition keeps running in the background, but the app never presents accumulated due trees in a way that pressures the user.

## Read these first

Before starting any work, always read these in this order.

1. `docs/SPEC.md` Functional spec. Everything about what to build is written here
2. `docs/DATA.md` Data structures and the spaced repetition algorithm
3. `docs/DESIGN.md` Policy for appearance and wording
4. `docs/TASKS.md` Order of implementation. Proceed along this

Explanations for the user are in `docs/USAGE.md` (how to add trees) and `docs/GOOGLE.md` (sync with Google Docs, and the line between what is public and what is private).

`reference/prototype.jsx` is a prototype whose behavior has been verified. You may refer to it as the correct example of how a review moves, but there is no need to reuse its code as is.

## The core of this product

Do not make changes that break the following three points. When in doubt, go back to "Principles" in `docs/SPEC.md`.

- Knowledge is displayed as a tree. It is never turned into fill-in-the-blank text
- The user writes each tree themselves, as an outline
- A review expands the whole tree from the top. No partial quizzing. Weak spots take effect through the review interval

## Tech stack

- Vite + React + TypeScript
- Tailwind CSS
- Persistence is IndexedDB (Dexie may be used)
- Runs as a PWA. It must work offline. The assumed use is from the home screen of a phone
- No server. All data stays on the device. It is moved by export and import
- Keep state management within what the standard features of React can handle. Do not add libraries until they become necessary

## Commands

```
npm install
npm run dev       # development server
npm run build     # production build
npm run test      # vitest
npm run lint
```

## How to work

- Proceed through the phases in `docs/TASKS.md` one at a time. Do not reach ahead across phases
- At the end of each phase, confirm that `npm run build` and `npm run test` pass
- Always write tests for pure functions (outline parsing, spaced repetition calculation, review result aggregation)
- When changing the appearance of the UI, follow `docs/DESIGN.md`. Do not bring in your own design judgments
- Keep commits small. One purpose per commit

## Writing conventions

- The UI language is selectable: Japanese or English. The default follows the browser language (Japanese if it starts with `ja`, otherwise English). The choice is stored on the device (localStorage) and is switched from the bottom of the home screen
- All UI strings for both languages live in `src/ui/i18n.tsx`. Components must not hardcode user-visible text. Wording in both languages follows the wording policy in `docs/DESIGN.md`
- Error messages are always in English, regardless of the UI language
- Commit messages, code comments, test titles (`describe`, `it`) and documentation (`docs/`, `CLAUDE.md`, `README.md`) are written in English, because the repository is public on GitHub
- Japanese remains only in two places: the Japanese UI strings in `src/ui/i18n.tsx`, and Japanese tree content used as test data (such as 人権の三要素, "the three elements of human rights")
- Never use the em dash (U+2014) or the en dash (U+2013) anywhere, including strings in code, comments and documentation. Use commas, parentheses, colons, line breaks or separate sentences as separators
- Variable and function names are in English. The mapping of domain terms follows the glossary in `docs/DATA.md`
- Comments explain "why". "What it does" is shown by the code

## What not to do

- Login, accounts, or sync between devices for this app itself (exception: one-way import from Google Docs, see `docs/GOOGLE.md`. It only reads Google directly from the browser with the user's own client ID, and has no server and no secret key)
- Putting secret values (keys, tokens, client IDs, the user's data) into the repository
- Bundling study material content (there is only one sample tree, on the premise that the user rewrites it themselves)
- Compatibility with other apps, such as the Anki format
- Partial quizzing modes, cloze display, multiple-choice questions
- Hardcoding user-visible text in components, or adding a UI string in only one of the two languages
- Showing error messages in Japanese, or writing commit messages, comments, test titles or documentation in Japanese
- Renaming the `kozo` database name or the `"app": "kozo"` export identifier
