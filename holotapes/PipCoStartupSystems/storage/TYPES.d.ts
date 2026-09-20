/**
 * Types for PipCo Startup Systems.
 *
 * The holotape replaces the boot animation, which means hooking
 * `Pip.bootAnimation` and `Pip.audioStart` and keeping the firmware's own
 * versions somewhere it can find them again.
 *
 * Several generations of this holotape saved the originals under different
 * names. The current version reads all of them so it can recover a clean
 * firmware function no matter which older release installed the hook it is
 * replacing, which is why every one of those names appears below.
 */

/** The firmware's own boot animation, which returns when it finishes. */
type PipCoBootAnimation = () => Promise<void>;

/** The firmware's own audio start function. */
type PipCoAudioStart = PipController['audioStart'];

interface PipController {
  /** The clean `Pip.bootAnimation`, saved by the current version. */
  __SA22CleanBoot?: PipCoBootAnimation;
  /** The clean `Pip.audioStart`, saved by the current version. */
  __SA22CleanAudio?: PipCoAudioStart;
  /** The audio function in use, recorded for the running animation. */
  __SA18A?: PipCoAudioStart;
  /** The clean audio function as saved by release 5. */
  __startupAnimationsOriginalAudioStartV5?: PipCoAudioStart;
  /** The clean audio function as saved by release 6. */
  __startupAnimationsOriginalAudioStartV6?: PipCoAudioStart;
  /** The clean audio function as saved by release 7. */
  __startupAnimationsOriginalAudioStartV7?: PipCoAudioStart;
  /** The clean audio function as saved by release 8. */
  __startupAnimationsOriginalAudioStartV8?: PipCoAudioStart;
  /** The clean audio function as saved by release 9. */
  __startupAnimationsStockAudioStartV9?: PipCoAudioStart;
  /** The clean audio function as saved by release 12. */
  __startupAnimationsStockAudioStartV12?: PipCoAudioStart;
  /** The clean audio function as saved by release 14. */
  __startupAnimationsStockAudioV14?: PipCoAudioStart;
}

/** The title artwork, loaded from `TITLE_IMG.JS`. */
interface PipCoTitleImage {
  /** The PIP-CO wordmark. */
  title: GraphicsImageObject;
}
