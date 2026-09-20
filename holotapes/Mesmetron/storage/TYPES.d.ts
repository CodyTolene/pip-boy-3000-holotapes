/**
 * Mesmetron shared types.
 *
 * Each screensaver file is an uninvoked factory returning a module with
 * init/draw/remove. The TITLE module also exposes menu helpers.
 */

/** One menu row naming a screensaver JS file. */
interface MesmetronMenuItem {
  name: string;
  file: string;
}

/** Contract every screensaver module returns to the launcher. */
interface MesmetronModule {
  id?: string;
  init: (variant: number) => void;
  draw: (g: Graphics) => void;
  remove: () => void;
}

/** TITLE.JS menu module (extra helpers used by APP.ts). */
interface MesmetronTitleModule extends MesmetronModule {
  move: (dir: number) => void;
  getSelected: () => number;
  items: MesmetronMenuItem[];
  repaint?: () => void;
}

/** One in-progress spiral generation (SPIRAL.ts). */
interface MesmetronSpiralGen {
  tick: number;
  phase: number;
  ch: number;
  started: boolean[];
  px: number[];
  py: number[];
}
