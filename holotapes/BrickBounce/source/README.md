# Brick Bounce Source

The Pip-Boy version is intentionally split into small pages because the Espruino
runtime has a very small heap. Each readable source file here mirrors one
runtime file in `../assets/`:

- `APP.JS` is the small deferred launcher also published as `../app.js`.
- `MAIN.JS` is the full title screen and main-menu module. It loads only after
  the Pip-Boy's MISC menu has been released and memory has been defragmented.
- The remaining `.JS` files are dynamically loaded game pages and helpers.
- `LEVELS.TXT` is the editable 50-level layout data.

The deployed JavaScript in `../app.min.js` and `../assets/*.JS` is runtime data,
with the main pages pretokenized for Espruino. It must be copied as binary data;
opening and re-saving it as text can corrupt the holotape.

The main entry and every runtime page return a Pip-Boy app object with a cleanup
function. Page transitions are deliberately deferred and defragment memory
before loading the next page so Brick Bounce can run within the Pip-Boy's
constrained memory budget.
