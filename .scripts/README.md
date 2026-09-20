# `.scripts`

Build and verification tooling for this repo.

| Entry       | Role                                                         |
| ----------- | ------------------------------------------------------------ |
| `build.ts`  | Production build into `dist/` (includes registry generation) |
| `build/`    | Build helpers (minify, tokenize, paths, registry)            |
| `verify.ts` | Full verification used by `npm run verify`, husky, and CI    |
| `verify/`   | Individual verify steps (layout, lint, typecheck, ...)       |

# AI-Assisted Changes

Some files in this directory were written with AI assistance so please review
them carefully before you use or change them.

| Date       | Description                                                                                                            | Notes                                                                                        |
| ---------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 08/29/2026 | Built out `types/` directory with initial type definitions generated from code.                                        | Fully reviewed and tested, but could use more notes from official API documenation I'm sure. |
| 09/05/2026 | Worked with AI to convert the JavaScript files to TypeScript.                                                          | This needs FULL testing by the developers.                                                   |
| 09/13/2026 | Continued with work on converting Holotape JS files to TS.                                                             | Reviewed and tested.                                                                         |
| 09/19/2026 | Used AI to help me write the build and verification scripts in `.scripts/`.                                            | Reviewed and tested.                                                                         |
| 09/19/2026 | Had AI help me update the `README.md` and `agents.md` files with all of my own personal notes and new project updates. | Reviewed and tested.                                                                         |

Personally reviewed and tested all AI-assisted changes, which were mostly
converting JS to TS files, and building scripts that test the code thoroughly.
Cody Tolene - 9/19/2026
