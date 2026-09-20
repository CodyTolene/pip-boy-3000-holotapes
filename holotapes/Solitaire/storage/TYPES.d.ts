/**
 * Types for Solitaire.
 *
 * Cards are ints 0-51: rank = card % 13, suit = (card / 13) | 0.
 */

/** Packed card id 0-51. */
type SolitaireCard = number;

/** The stack of cards the player has picked up and is moving. */
interface SolitaireHeld {
  /** Index of the pile the cards were taken from. */
  from: number;
  /** How many cards are being moved. */
  count: number;
}

/** A card bouncing down the screen during the win animation. */
interface SolitaireBouncer {
  /** The card being animated. */
  card: number;
  /** Current X position. */
  x: number;
  /** Current Y position. */
  y: number;
  /** Horizontal velocity. */
  vx: number;
  /** Vertical velocity. */
  vy: number;
  /** Bounces so far; the card is retired after five. */
  b: number;
}

/** One entry in the custom deck picker. */
interface SolitaireDeckOpt {
  name: string;
  /** JSON filename under HOLO/SOLITAIRE/, or null for Random. */
  file: string | null;
}
