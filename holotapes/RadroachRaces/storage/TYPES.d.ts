/**
 * Radroach Races shared types.
 *
 * Scene files are uninvoked function expressions loaded with eval. Keep every
 * annotation erasable so the emitted JavaScript matches the device-tested
 * sources.
 */

/** Shell that swaps TITLE / RACE scenes. */
interface RadroachApp {
  scenes: { RACE: string; TITLE: string };
  go: (file: string, params?: PipValue) => void;
  gc: () => void;
}

/** Queued scene load request. */
interface RadroachPendingScene {
  file: string;
  params?: PipValue;
}

/** Arguments TITLE passes into RACE. */
interface RadroachRaceParams {
  /** 0 = random map, 1-20 = specific map (1-based). */
  mapId?: number;
}

/** One racing roach. */
interface Radroach {
  id: number;
  cx: number;
  cy: number;
  vx: number;
  vy: number;
}

/**
 * Packed map blob from MAPS.ts: Int16-style numeric array of goal/start/walls.
 * Indexed as a number array after eval.
 */
type RadroachMapData = ArrayLike<number> & {
  [index: number]: number;
  length: number;
};
