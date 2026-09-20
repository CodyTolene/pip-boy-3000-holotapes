/**
 * Types for RADRUNNER, an endless runner drawn in false perspective.
 *
 * Sprites are 2bpp bitmaps stored base64 in the source and decoded once at
 * startup. Everything on the road carries a `z` in the range 0 (at the
 * player) to 1 (at the horizon), which the projection turns into a screen
 * position and a scale.
 */

/** A sprite as stored in the source, before decoding. */
interface RadrunnerRawSprite {
  /** Width in pixels. */
  w: number;
  /** Height in pixels. */
  h: number;
  /** Base64 encoded 2bpp pixel data. */
  b: string;
}

/** The decoded sprite set, keyed by the names used in the source. */
type RadrunnerSprites = Record<string, GraphicsImageObject | null>;

/** Something on the road: an obstacle or an enemy. */
interface RadrunnerEntity {
  /** Distance ahead, 1 at the horizon down to 0 at the player. */
  z: number;
  /** Which of the three lanes it occupies. */
  lane: number;
  /** Kind of entity, which picks its sprite and what hitting it does. */
  type: string;
  /** Set once the entity has passed the hit line, so it only scores once. */
  hit?: boolean;
}

/** Scenery beside the road, which is drawn but never collides. */
interface RadrunnerProp {
  /** Distance ahead, 1 at the horizon down to 0 at the player. */
  z: number;
  /** Which side of the road it sits on: -1 left, 1 right. */
  side: number;
  /** How far out from the road edge it stands. */
  off: number;
  /** Which piece of scenery to draw. */
  kind: string;
}
