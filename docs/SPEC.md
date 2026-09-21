# Functional spec

## Background

In legal study, you need to be able to reproduce two things in a written answer: an enumeration such as "the three elements of human rights are inherence, inviolability and universality", and the content of each item, such as "inherence means the rights are held from birth". Existing memorization apps chop this into fill-in-the-blank questions, and the structure of the knowledge is no longer visible.

This app treats knowledge as a tree. Branches grow from a heading, and content hangs under the branches. In a review, the user expands the tree from the top in order and records whether each node was recalled.

## Principles

1. The knowledge can be grasped as a structure. A tree is always displayed in the shape of a tree
2. The user can build the structure themselves. The user writes each tree as an outline
3. The user can review in the best way. Trees are cycled with spaced repetition per tree, and a tree with missed nodes comes due sooner

## Terms

- Tree: one unit of knowledge. It has exactly one root
- Root: the heading of a tree. Example: 人権の三要素 (the three elements of human rights)
- Node: every element other than the root. Branches and leaves are both nodes
- Branch: a node that has children
- Leaf: a node that has no children
- Review (expand): expanding a tree from the top to recall it. The action of opening the tree downward
- Miss: failing to recall a node during a review

## Screens

### List (home)

- The main view is the shelf. Trees are nested as "document > tab > heading > tree" and listed in the order they appear in the document. Within one level, groups and trees are interleaved in that order: a chapter whose heading has bullets right under it is a tree, a chapter with sub-headings is a group, and the shelf must still read chapter 1, 2, 3. Each group can be opened and closed, and the open or closed state is remembered on the device. Trees made by hand are listed below the shelf
- Search. It looks through all text: roots, nodes and locations (document title, tab names, headings). Only trees that contain every whitespace-separated word are shown. Matching nodes are shown with the path leading to them
- For trees that are due, only the count is shown, and their list lives on a separate screen (Due). This keeps the user from being chased by accumulated due trees even when the app is not opened every day
- Each row shows the root text, the number of nodes, the number of nodes missed last time, and the next due date
- Pressing a row starts a review of that tree. Reviewing is what the user does most, so it gets the whole row
- Each row has a three-dot menu for the rarer actions: "View tree" and "Edit"
- Search results are the exception: pressing a result opens the whole tree, because someone who searches wants to read the answer, not be asked for it. "Review now" moves into the menu there
- "New tree"
- If a Google document is registered, "Sync with Google Docs". It rereads all registered documents

### Due

- A list of trees that are due: trees whose due date is today or earlier, and trees that have never been reviewed
- A list of upcoming trees, ordered by due date
- It does not ask the user to do everything. It is a screen for deciding which tree to open first when the user feels like reviewing

### View a tree

- Shows the tree fully opened
- The color of each node reflects the last result (see `DESIGN.md`)
- A node with a miss count shows that number in small type next to it
- "Review now" is the only visible action. "Edit", "Copy as Markdown" and "Delete" sit behind a three-dot menu at the top right, so the screen reads as a page of the book rather than a management screen

### Edit

- The user writes in outline format in a text area
- While writing, a preview of the tree appears to the right or below
- The first line is the root. Leading whitespace expresses depth (two half-width spaces, one tab, or one full-width space each count as one level)
- The second and later lines are treated as depth 1 or deeper. Even if written at depth 0, they are rounded to 1
- Blank lines are ignored
- When an existing tree is edited and saved, node statistics (miss count, last result) are carried over for nodes whose text is identical. A node whose text changed is treated as a new node
- If the user tries to leave before saving, ask for confirmation

### Review

This is the core of the product. It moves as follows.

1. Only the root is displayed
2. Under the root, a button appears that says "N branches. Recall them, then open"
3. The user lists the N branches in their head, then presses the button
4. All child nodes are displayed at once. Next to each node are a ○ button and a × button
5. The user marks each node with ○ or ×
6. If a node marked ○ or × has children of its own, an "M branches" button appears under that node, and the flow returns to step 2
7. When every node has a ○ or ×, the result is displayed, and "Save result" ends the review

Constraints:

- Children are never shown under a node that has not been marked yet. This keeps the motion of expanding from the top in order
- A ○ or × can be changed during the review once given (to guard against mistaps)
- "Stop" ends the review partway. Partial results are not saved
- Progress is always displayed as "marked / total nodes"

Result display:

- "Recalled a / b"
- The remark differs between when everything was recalled and when some nodes were missed (`DESIGN.md`)

### Export and import

- Writes out all data as a single JSON file
- Reading a file adds to the existing data (it does not overwrite). For trees with the same id, the newer one replaces the older
- An individual tree can be copied as Markdown (outline format)

### Bulk import

- Several trees written up in a document can be pasted and added at once
- A line with no indentation and no bullet marker is a heading (root), and everything up to the next heading becomes one tree
- Before importing, show a list of the tree headings and their node counts

### Sync with Google Docs

- Reads the registered documents and reflects them in the trees. One way, from the document to the app. Nothing is written to the document
- The line right before a bullet list (a heading or an ordinary paragraph) is the root, and that bullet list is its nodes. Depth follows the visible indentation of the bullets, not the list-internal nesting level, so a list that was restarted and indented under an earlier item still hangs where it looks
- All tabs are read. Headings that have no bullet list under them, and tab names, do not become trees. They are shown in small type above the root as the tree's "location"
- A tree in the same document, at the same location, with the same heading is considered the same tree, and its content is replaced. A tree whose location was merely renamed is not duplicated. Node statistics are carried over by the same rule as editing, and the spaced repetition state is left as is
- The document is the source of truth and the app is its copy. A tree whose heading disappeared from the document is also deleted from the app by sync. However, when not a single tree could be read from the document, nothing is deleted
- No server. The user stores a client ID they created themselves on the device, and the browser reads Google directly. The only permission is reading documents. The token is not stored
- The procedure, and what is and is not made public, are in `GOOGLE.md`

## Spaced repetition

Details are in `DATA.md`. Key points:

- The schedule is per tree
- The result of a review is converted into a single quality value from the ratio of recalled nodes, and the interval and ease are updated with an SM-2 style algorithm
- When the ratio is below 1, the interval is multiplied by the ratio to shorten it. The more nodes a tree missed, the sooner it comes back
- Node statistics (miss count, last result) are for display. They are not used to decide what is asked

## Labels

Some lines in an outline are not knowledge to recall. They are scaffolding for what hangs under them: a connector such as 必要となるもの ("what is needed"), or a category to answer such as 理由 ("reason"). Being asked to recall them only costs thought.

- A node whose text ends with a colon (`:` or `：`) is a label. Plain text, so it works the same in the editor, in pasted text and in Google Docs. Nothing is stored: a node is a label exactly when its text says so. The root is never a label
- In a review, a label appears together with its sibling branches, when the user opens that level. Shown any earlier, it would hint at what the level holds. It has no ○ × and is set in pale ink. What hangs under it is available at once, behind its own "N branches" button
- The "N branches" count leaves labels out, because they are not something to recall
- A level made only of labels holds nothing to recall, so it is shown at once, without a button that would stand for no thought
- Labels are outside everything that is counted: the progress and the result (a / b), the ratio that drives the schedule, miss counts, last results, the node count on the list, and the history marks
- A label without children works as an ungraded note. It is visible during a review, so what is written there is the user's responsibility
- This does not break the principle of reviewing the whole tree from the top. Nothing is asked in isolation. Labels only remove questions that were never real questions
- The colon is dropped wherever a label is displayed

## Links between trees

- A node can point at another tree by writing that tree's root text in double brackets: `[[root text]]`. Plain text, so a link survives the editor, paste import and Google Docs sync
- On the tree view the linked words are underlined in the rule color and open the target tree. A target that matches no root is shown as plain text
- When several roots share the text, a tree from the same document wins. Matching ignores full-width and half-width differences and letter case
- During a review, and in lists, the brackets are dropped and nothing is clickable. A review must not be interrupted or hinted at

## Reviewing several trees in a row

- From an open shelf group (document, tab or heading): review every tree under it, in shelf order. From the due screen: review every due tree, in the listed order. Trees without nodes are left out. The entry is hidden when it would cover fewer than two trees
- Each tree is reviewed exactly as a single review. The seven steps and their constraints do not change
- The review screen shows the position ("Tree 2 of 3"). Saving a result goes straight to the next tree, and after the last one back to the list
- "Skip this tree" moves on without saving anything for that tree. "Stop" ends the whole run. Results already saved for earlier trees stay saved
- The queue is kept for the browser session, so a reload continues it. It is cleared whenever the user leaves the review flow, so it never takes over later navigation

## Review history

- A calendar, one month at a time, reached from a quiet entry on the list (shown once at least one review exists). A day with reviews shows how many: in moss when everything was recalled that day, in vermilion when something was missed. Today's number is underlined. No heat map, no streaks, nothing that rewards or scolds
- Tapping a day lists that day's reviews with their results and opens the tree from a row. Going past the current month, or back past the oldest review, is not possible
- The tree view lists the last 10 reviews of that tree, newest first
- The tree view also shows, next to each node, a row of small marks for the last 10 reviews, oldest on the left: an outlined moss circle for recalled, a filled vermilion circle for missed, and an empty slot when the node did not exist yet. The marks appear only on the tree view, never in the editor preview or during a review

## Later ideas

Nothing is planned. Consult the user before adding anything here.
