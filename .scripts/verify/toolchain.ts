import assert from 'node:assert/strict';

import { minifyEspruino } from '../build/espruino-minify.ts';
import { tokenizeEspruino } from '../build/espruino-tokenize.ts';

async function main(): Promise<void> {
  const minified = await minifyEspruino(`
    (function () {
      function frame() { "ram"; return 42; }
      function pixels() { "jit"; return 1; }
      return { id: "TEST", remove: function () {}, frame: frame, pixels: pixels };
    });
  `);

  assert.match(minified, /\{["']ram["'];/);
  assert.match(minified, /\{["']jit["'];/);
  assert.deepEqual(
    tokenizeEspruino('function f(){return 42;}'),
    Uint8Array.of(170, 102, 40, 41, 123, 171, 212, 42, 59, 125),
  );
  assert.deepEqual(tokenizeEspruino('atob("QQ==")'), Uint8Array.of(209, 1, 65));

  process.stdout.write(
    'Validated Espruino minification directives and token bytes.\n',
  );
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
