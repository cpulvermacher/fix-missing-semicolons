# Fix Missing Semicolons

[![Latest Release](https://flat.badgen.net/github/release/cpulvermacher/fix-missing-semicolons)](https://github.com/cpulvermacher/fix-missing-semicolons/releases)
![Installs](https://vsmarketplacebadges.dev/installs-short/cpulvermacher.fix-missing-semicolons.svg)
[![Status](https://flat.badgen.net/github/checks/cpulvermacher/fix-missing-semicolons)](https://github.com/cpulvermacher/fix-missing-semicolons/actions/workflows/node.js.yml)
[![License](https://flat.badgen.net/github/license/cpulvermacher/fix-missing-semicolons)](./LICENSE)

Automatically fix Java syntax errors for missing semicolons.

## Features
- Saving a Java file automatically fixes any `Syntax error, insert ";"` errors found.
- Does not insert semicolons if there are any other language errors in the file.

## Limitations
- May not work for cases like where the Java language server produces less clear syntax errors (e.g. lambda expressions).

## Why?
Semicolon placement in Java is fairly unambiguous, to the point that the compiler or IDE integration will helpfully tell you exactly where you forgot to add it.
This extension goes one step further and adds the missing semicolon.

Compared to other extensions, this one does not require you to run any special commands, but directly detects and fixes the syntax errors.