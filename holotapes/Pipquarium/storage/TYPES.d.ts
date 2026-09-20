/**
 * Types for Pipquarium aquarium screensaver.
 */

/** One swimming fish with left/right sprite files. */
interface PipquariumFish {
  pathL: string;
  pathR: string;
  frameLen: number;
  frameCount: number;
  w: number;
  h: number;
  minSpd: number;
  maxSpd: number;
  animEvery: number;
  /** Vertical drift: -1 up bias, 0 none, 1 down bias. */
  vdir: number;
  dir: number;
  x: number;
  y: number;
  spd: number;
  frame: number;
  anim: number;
  file: EspruinoFile | undefined;
}

/** Seahorse that hops along a fixed path then waits. */
interface PipquariumSeahorse {
  file: EspruinoFile;
  frameLen: number;
  frameCount: number;
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  /** Path index, or -1 while waiting. */
  phase: number;
  stepTicks: number;
  waitTimer: number;
  frame: number;
  anim: number;
}
