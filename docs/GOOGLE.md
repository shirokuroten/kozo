# Sync with Google Docs

Trees written up in Google Docs are imported into the app with a single button. It is one way, from the document to the app, and nothing is ever written to the document.

Button names below are the English UI labels. The Japanese UI label is given in parentheses the first time each one appears.

## What is made public and what is not

| Thing | Where it lives | Is it public? |
|---|---|---|
| The app's code (this framework) | The GitHub repository and GitHub Pages | Yes |
| Tree content, review records | Inside the browser on the device (IndexedDB) | No |
| The original Google document | Your own Google Drive | No (the sharing settings do not need to change) |
| Client ID | Inside the browser on the device | No. But it is a value that does no harm if leaked (see below) |
| Sign-in token | In memory only. Expires in one hour | No. It is not stored either |

This app has no server. Communication happens only between "your browser" and "Google", and nobody sits in between.

### The client ID is not a secret

The sign-in method that works in the browser alone (the token flow) uses neither a secret key (client secret) nor an API key. It uses only the client ID, which is a value Google designed on the assumption that it is public. Protection does not come from hiding the ID. It comes from the following two things.

- Authorized JavaScript origins: a site at any URL other than the registered ones cannot start a sign-in with that ID
- Test users: while the publishing status is "Testing", nobody other than the registered Google accounts (you) can sign in

Even so, the app is built so that the ID never goes into the repository. You paste the ID into the app's screen, and it is stored on the device.

### Permission requested

Only `documents.readonly` (read Google Docs documents). It cannot write, delete, or access other files in Drive.

## What you do once at the start (about 10 minutes)

You operate the Google Cloud console with your own account. The names of the screens change from time to time, so if you cannot find one, look for it with the search box at the top.

1. Open https://console.cloud.google.com/ and create a new project (any name will do. Example: outline-recall)
2. Under "APIs & Services", in "Library", find **Google Docs API** and press "Enable"
3. Configure the "OAuth consent screen" (Google Auth Platform)
   - User type: External
   - App name: anything. The support email and contact are your own address
   - Leave the publishing status at **Testing**
   - Add your own Google account under "Test users"
4. Under "Credentials" (Clients), choose "Create OAuth client ID"
   - Application type: **Web application**
   - In Authorized JavaScript origins, enter the origin of the URL where you open the app
     - When trying it locally: `http://localhost:5173`
     - When hosted on GitHub Pages: `https://<your GitHub user name>.github.io` (do not add a path)
   - Redirect URIs may be left empty
5. Copy the **client ID** that is displayed (`....apps.googleusercontent.com`). The client secret is not used
6. Open "Import and backup" (取り込みとバックアップ) in the app, paste the client ID under "Import from Google Docs" (Google ドキュメントから取り込む), and save it

If you use both a phone and a computer, do step 6 once on each device.

## Everyday use

1. Write in Google Docs (for how, see "How to write a document" below)
2. In "Import and backup" in the app, paste the document's URL and press "Add this document and sync" (この文書を登録して同期)
3. From then on, just press "Sync with Google Docs" (Google ドキュメントと同期), which appears at the very top of the home screen. It rereads all registered documents

The first time, Google's sign-in screen appears. If it says "Google hasn't verified this app", continue from "Advanced" (this is fine, because it is an app you made yourself).

## How to write a document

There is only one rule. **The line right above a bullet list becomes the root, and that bullet list becomes one tree.**

- The line that becomes the root may be a heading (Heading 1, Heading 2 and so on) or an ordinary line
- A heading with no bullet list under it does not become a tree. It is shown in small type above the root, as the "location" of the trees below it
- Nesting follows what you see. A bullet belongs to the nearest bullet above it that is indented less, judged by the visible indentation. So if you press Enter twice and start a new list, then indent it under an earlier item, it still hangs under that item (Docs itself numbers the new list from level 0 again, which is why a copy and paste of the text can look flatter than the document)
- All tabs are read. In a document with two or more tabs, the tab name is put at the front of the location
- Press Tab to nest a bullet deeper. The nesting depth becomes the depth in the tree as is
- Paragraphs in the "Title" style, blank lines, and ordinary text that is not followed by a bullet list are ignored. You can write free-form notes

An example with one tab per book, chapters as Heading 1 and topics as Heading 2:

```
(Tab: 民法)
第2章 物権            <- Heading 1. No bullet list under it, so it does not become a tree (it becomes a location)
即時取得              <- Heading 2. Same as above
要件                  <- Heading 3. A bullet list comes right below, so this is a root
  ・動産であること
  ・有効な取引行為
  ・平穏、公然、善意、無過失
効果                  <- The next root
  ・原始取得
```

(The example is Japanese study material. 民法 (Civil Code), 第2章 物権 (Chapter 2: Property rights), 即時取得 (good-faith acquisition of movables), 要件 (requirements): it is a movable, a valid transaction, and peaceful, open, in good faith and without negligence. 効果 (effect): original acquisition.)

In the app, a tree called 要件 appears under "民法 / 第2章 物権 / 即時取得". Even if the same heading 要件 exists in another chapter, the location differs, so it is treated as a separate tree.

If you write a bullet list right below a chapter heading, the chapter itself becomes one tree. However, a review opens the whole tree, so split long chapters with a heading for each topic so that each tree stays at around 5 to 20 nodes.

## Sync rules

- A tree in the same document, at the same location, with the same heading is considered the same tree, and only its content is replaced. Nodes whose text has not changed keep their miss count and last result. The next due date also stays as is
- A heading added to the document is added as a new tree
- Renaming a tab or a chapter heading does not duplicate trees (as long as the root text is the same and there is no way to mix it up with another). Only the displayed location changes
- The document is the source of truth and the app is its copy. A tree whose heading was removed from the document is also deleted from the app at the next sync. Its review records go away together with the tree
- If you change the root text and the content at the same time, the old tree is deleted and it comes back in as a new tree (the records are not carried over). When you want to keep the records, change the heading and the content in separate syncs
- When not a single tree could be read from the document, nothing is deleted. This is so that you do not lose everything when you empty the document by mistake
- Only trees imported from that document are deleted. Trees made by hand, trees added by pasting, and trees from other documents are not touched
- You may edit a synced tree inside the app, but the next sync puts it back to the content of the document. When fixing something, fix the document

## When it does not work

- "Could not open the sign-in window": allow pop-ups in the browser for this site only
- `origin_mismatch` or `redirect_uri_mismatch`: the origin of the URL you currently have open is not in "Authorized JavaScript origins" from step 4
- `access_denied`: the account you signed in with is not among the test users from step 3
- "No permission to read this document": check that the account you signed in with can open that document
