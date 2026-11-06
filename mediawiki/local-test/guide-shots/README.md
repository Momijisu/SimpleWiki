# Screenshots for the editing guides

Scripts that take the pictures in `../../files/guides/` from the local test wiki
(Playwright, VisualEditor). Start the test wiki, then run each in order:

    node shots1.cjs   # Your first edit
    node shots2.cjs   # VisualEditor basics
    node shots3.cjs   # VisualEditor advanced, source mode, redirect
    node shots4.cjs   # table rows, references list, citations, uploading

They write straight into `files/guides/`. The test wiki's `Tony Ramirez` page is
reset before each script; shots1 saves an edit to it.
