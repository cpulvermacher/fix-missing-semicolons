# Fix Missing Semicolons

[![Latest Release](https://flat.badgen.net/github/release/cpulvermacher/fix-missing-semicolons)](https://github.com/cpulvermacher/fix-missing-semicolons/releases)
![Installs](https://vsmarketplacebadges.dev/installs-short/cpulvermacher.fix-missing-semicolons.svg)
[![Status](https://flat.badgen.net/github/checks/cpulvermacher/fix-missing-semicolons)](https://github.com/cpulvermacher/fix-missing-semicolons/actions/workflows/node.js.yml)
[![License](https://flat.badgen.net/github/license/cpulvermacher/fix-missing-semicolons)](./LICENSE)

Fix syntax errors for missing semicolons in Java automatically.

## Features

### Fix on Save
- Fixes any `Syntax error, insert ";"` errors found when saving the current document.
- Does not insert semicolons if there are any other language errors in the file.


### Fix on Error (experimental)
Can be enabled in settings. (Fix Missing Semicolons > Fix on Error)
- Automatically inserts semicolons in the correct position if `Syntax error, insert ";"` errors are found in the active editor.
- Does not insert semicolons if cursor position is in the same line or the next.
- Does not insert semicolons if there are any other language errors in the file.


## Why?
Semicolon placement in Java is fairly unambiguous, to the point that the compiler or IDE integration will helpfully tell you exactly where you forgot to add it.
This extension goes one step further and adds the missing semicolon.

Compared to other extensions, this one does not require you to press any extra keys, but directly detects and fixes the syntax errors.