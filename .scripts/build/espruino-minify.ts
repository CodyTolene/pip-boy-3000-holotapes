import { type MinifyOptions, minify } from 'terser';

/**
 * Terser options used for Pip-Boy 3000 holotape scripts. These mirror the
 * Pip-Boy.com "create holotape" tooling exactly so that minified output here
 * is byte-identical with files produced on the website:
 *
 * - `directives: false` keeps Espruino's `"ram"` / `"jit"` performance
 *   directive strings intact (terser would otherwise drop them as unknown
 *   directives).
 * - `side_effects: false` prevents dead-code elimination from removing calls
 *   that matter on-device (`Pip.on`, `setWatch`, and so on).
 * - `unused: false` keeps declared-but-unused bindings, since holotape files
 *   are evaluated as standalone function expressions by the firmware.
 * - The `reserved` list protects every global the Pip-Boy OS injects so
 *   mangling never renames them.
 */
const ESPRUINO_MINIFY_OPTIONS: MinifyOptions = {
  compress: {
    defaults: true,
    directives: false,
    side_effects: false,
    toplevel: false,
    unused: false,
  },
  ecma: 5,
  format: {
    ascii_only: true,
    comments: false,
    semicolons: true,
  },
  mangle: {
    eval: false,
    keep_fnames: false,
    reserved: [
      'BTN_POWER',
      'BTN_PLAY',
      'ENC1_PRESS',
      'E',
      'Graphics',
      'MODEINFO',
      'Pip',
      'Storage',
      'console',
      'exports',
      'fs',
      'g',
      'h',
      'module',
      'process',
      'require',
    ],
    toplevel: false,
  },
  module: false,
  sourceMap: false,
  toplevel: false,
};

/** Minifies Espruino JavaScript source for the Pip-Boy 3000. */
export async function minifyEspruino(input: string): Promise<string> {
  const result = await minify(input, ESPRUINO_MINIFY_OPTIONS);

  if (!result.code) {
    throw new Error('Unable to minify JavaScript source.');
  }

  return result.code;
}
