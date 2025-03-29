# Fix Missing Semicolons

[![Latest Release](https://flat.badgen.net/github/release/cpulvermacher/fix-missing-semicolons)](https://github.com/cpulvermacher/fix-missing-semicolons/releases)
![Installs](https://vsmarketplacebadges.dev/installs-short/cpulvermacher.fix-missing-semicolons.svg)
[![Status](https://flat.badgen.net/github/checks/cpulvermacher/fix-missing-semicolons)](https://github.com/cpulvermacher/fix-missing-semicolons/actions/workflows/node.js.yml)
[![License](https://flat.badgen.net/github/license/cpulvermacher/fix-missing-semicolons)](./LICENSE)

Fix syntax errors for missing semicolons in Java automatically.

## Features
- Fixes any `Syntax error, insert ";"` errors found when saving the current Java file.
- Does not insert semicolons if there are any other language errors in the file.
- (Experimental) "Fix on Error" setting to fix missing semicolons directly when errors are detected. Possibly buggy and disabled by default.

## Why?
Semicolon placement in Java is fairly unambiguous, to the point that the compiler or IDE integration will helpfully tell you exactly where you forgot to add it.
This extension goes one step further and adds the missing semicolon.

Compared to other extensions, this one does not require you to run any special commands, but directly detects and fixes the syntax errors.