/**
 * Poker shared types.
 *
 * Cards are ints 0-51: rank = c % 13 (0=A..12=K), suit = (c/13)|0.
 */

/** Packed card id 0-51. */
type PokerCard = number;

/** Hand category rank (index into CATS). */
type PokerCategory = number;

/** Frequency map rank/suit -> count. */
type PokerCountMap = Record<number, number>;
