# Fix Missing Semicolons

Fix syntax errors for missing semicolons in Java without user interaction.
- Automatically inserts semicolons in the correct position if `Syntax error, insert ";"` errors are found in the active editor.
- Does not insert semicolons if there are any other language errors in the file.

## Why?
Semicolon placement in Java is fairly unambiguous, to the point that the compiler or IDE integration will helpfully tell you exactly where you forgot to add it.
This extension goes one step further and adds the missing semicolon.

Compared to other extensions, this one does not require you to press any extra keys, but directly detects and fixes the syntax errors.