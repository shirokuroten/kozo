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

- The main view is the shelf. Trees are nested as "document > tab > heading > tree" and listed in the order they appear in the document. Each group can be opened and closed, and the open or closed state is remembered on the device. Trees made by hand are listed below the shelf
- Search. It looks through all text: roots, nodes and locations (document title, tab names, headings). Only trees that contain every whitespace-separated word are shown. Matching nodes are shown with the path leading to them
- For trees that are due, only the count is shown, and their list lives on a separate screen (Due). This keeps the user from being chased by accumulated due trees even when the app is not opened every day
- Each row shows the root text, the number of nodes, the number of nodes missed last time, and the next due date
- A review can be started directly from each row
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
- "Review now", "Edit", "Delete"

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
- The line right before a bullet list (a heading or an ordinary paragraph) is the root, and that bullet list is its nodes. Depth follows the nesting level of the bullet list in the document
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

## To consider in phase 2 and later (do not build now)

- Linking from a leaf of a chapter tree to a tree for a specific issue
- Viewing the review history on a calendar
- A graph of the miss history for each node
- "Review everything for today", which reviews several trees in a row
