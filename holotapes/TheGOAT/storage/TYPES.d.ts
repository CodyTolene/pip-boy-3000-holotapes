/**
 * Types for The G.O.A.T., the Vault-Tec aptitude test.
 *
 * Each question is stored as `[prompt, answers, skills]`: the prompt, the
 * answer texts, and the skill each answer scores a point for. The result
 * screen maps the highest scoring skill to a job assignment.
 */

/**
 * A question's wrapped text, cached between frames.
 *
 * Wrapping is expensive on this hardware, so the current question is wrapped
 * once and reused until the player moves on.
 */
interface GoatWrapCache {
  /** Index of the question this cache belongs to. */
  i: number;
  /** The prompt, wrapped to the prompt column width. */
  q: string[];
  /** Each answer, wrapped to the answer column width. */
  a: string[][];
}
