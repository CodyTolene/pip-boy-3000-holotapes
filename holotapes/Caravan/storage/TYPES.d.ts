/**
 * Caravan local types for the PR #113 TypeScript repository layout.
 *
 * These declarations describe the arrays and lazy module contracts that the
 * existing hardware-tested JavaScript already uses. They are type-only and
 * erase completely during the repository build.
 */

/** Match outcomes used by Caravan's game, win-audio, and Results flow. */
type CaravanOutcome = 'PLAYER' | 'CPU' | 'DRAW' | '';

/** One caravan stack: number cards followed by any attached face cards. */
type CaravanCards = number[];

/** Three caravan lanes plus the runtime-only opening-complete marker. */
interface CaravanCaravans extends Array<CaravanCards> {
  /** Set after all three opening lanes contain a number card. */
  openingComplete?: number;
}

/** Menu/game state passed between the main app and Play/Bet screens. */
interface CaravanSessionState {
  /** Current wager. */
  ante: number;
  /** Player bottle caps. */
  funds: number;
  /** Opponent bottle caps. */
  opponentFunds: number;
  /** Current opponent display name. */
  opponent: string;
}

/** Shared options used by the initial full Caravan menu. */
interface CaravanMenuApi extends CaravanSessionState {
  /** SD-card filesystem object. */
  fs: typeof fs;
  /** Caravan device directory, normally HOLO/CARAVAN/. */
  basePath: string;
  /** Initial menu screen index. */
  screen?: number;
  /** Initial highlighted menu row. */
  menuSelection?: number;
  /** Result outcome retained by legacy menu fields. */
  resultOutcome?: CaravanOutcome;
  /** Result bottle-cap delta retained by legacy menu fields. */
  resultDelta?: number;
  /** Starts gameplay with the supplied session state. */
  onStartGame?: ((state: CaravanSessionState) => void) | 0;
  /** Opens compact Volume (0) or Tutorial (1). */
  onOpenTool?: ((kind: number) => void) | 0;
}

/** Options used by the post-game Play/Bet child menu. */
interface CaravanPlayMenuApi extends CaravanSessionState {
  /** Starts gameplay with the supplied session state. */
  onStartGame?: ((state: CaravanSessionState) => void) | 0;
  /** Returns to the parent menu with updated session state. */
  onBack?: ((state: CaravanSessionState) => void) | 0;
}

/** Minimal module handle used by most lazy Caravan screens. */
interface CaravanDisposable {
  /** Releases listeners/timers/resources owned by the module. */
  remove: () => void;
}

/** Initial menu module handle. */
interface CaravanMenuModule extends CaravanDisposable {
  /** Optional module identifier. */
  id?: string;
}

/** Main-menu factory. */
type CaravanMenuFactory = (api: CaravanMenuApi) => CaravanMenuModule;

/** Play/Bet menu factory. */
type CaravanPlayMenuFactory = (api: CaravanPlayMenuApi) => CaravanDisposable;

/** Compact post-game menu factory. */
type CaravanReturnMenuFactory = (api: CaravanMenuApi) => CaravanDisposable;

/** Tutorial module options. */
interface CaravanTutorialApi {
  /** SD-card filesystem object when supplied by a parent menu. */
  fs?: typeof fs;
  /** Caravan device directory. */
  basePath?: string;
  /** Called when the final tutorial page exits. */
  onExit?: (() => void) | 0;
}

/** Tutorial factory. */
type CaravanTutorialFactory = (api: CaravanTutorialApi) => CaravanMenuModule;

/** Common filesystem/base-path options for audio and result helpers. */
interface CaravanFileApi {
  /** SD-card filesystem object. */
  fs: typeof fs;
  /** Caravan device directory. */
  basePath: string;
}

/** Volume menu options. */
interface CaravanVolumeApi extends CaravanFileApi {
  /** Called when the user leaves Volume Adjustment. */
  onBack?: (() => void) | 0;
}

/** Volume menu factory. */
type CaravanVolumeFactory = (api: CaravanVolumeApi) => CaravanMenuModule;

/** Temporary music-volume patcher options. */
type CaravanVolumeApplyApi = CaravanFileApi;

/** Music-volume patcher module. */
interface CaravanVolumeApplyModule {
  /** Applies the selected music level. 2 means asynchronous work started. */
  apply: (done: (ok: number) => void) => number;
}

/** Music-volume patcher factory. */
type CaravanVolumeApplyFactory = (
  api: CaravanVolumeApplyApi,
) => CaravanVolumeApplyModule;

/** WAV preview module options. */
interface CaravanVolumePreviewApi {
  /** Caravan device directory. */
  basePath: string;
}

/** Small preview callbacks used by Volume Adjustment. */
type CaravanPreviewCallback = (() => void) | 0;

/** WAV preview module. */
interface CaravanVolumePreviewModule extends CaravanDisposable {
  /** Starts one WAV preview. */
  start: (
    fileName: string,
    volumeLevel: number,
    startedCallback?: CaravanPreviewCallback,
    doneCallback?: CaravanPreviewCallback,
  ) => number;
  /** Stops the current preview. */
  stop: () => void;
  /** Returns whether a preview is active. */
  isActive: () => number;
  /** Returns whether deferred preview startup is waiting. */
  isWaiting: () => number;
}

/** WAV preview module factory. */
type CaravanVolumePreviewFactory = (
  api: CaravanVolumePreviewApi,
) => CaravanVolumePreviewModule;

/** Type-only common factory shape used by the lazy Volume preview loader. */
type CaravanPreviewFactory = (
  api: CaravanFileApi | CaravanVolumePreviewApi,
) => CaravanSfxModule | CaravanVolumePreviewModule;

/** Card-SFX bank clip location tuple: byte offset and total clip length. */
type CaravanSfxInfo = [number, number];

/** SFX bank preview module. */
interface CaravanSfxModule extends CaravanDisposable {
  /** Returns metadata for a clip/volume combination. */
  info: (clipId: number, volumeLevel: number) => CaravanSfxInfo;
  /** Reads part of one clip into a new buffer. */
  readPayload: (
    clipId: number,
    volumeLevel: number,
    startBlock: number,
    blockCount: number,
  ) => string | 0;
  /** Starts a card/discard preview. */
  startPreview: (
    clipId: number,
    volumeLevel: number,
    onStart?: CaravanPreviewCallback,
    onDone?: CaravanPreviewCallback,
  ) => number;
  /** Stops the current preview. */
  stopPreview: () => void;
  /** Returns 1 while preview audio is active. */
  isPreviewing: () => number;
  /** Full path of the SFX bank. */
  bankPath: string;
}

/** SFX bank module factory. */
type CaravanSfxFactory = (api: CaravanFileApi) => CaravanSfxModule;

/** State tuple consumed by the low-memory renderer. */
type CaravanRenderState = [
  string,
  number[],
  CaravanCaravans,
  CaravanCaravans,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  string,
  number,
  number,
];

/** Renderer module API tuple: filesystem and base path. */
type CaravanRendererApi = [typeof fs, string];

/** Low-memory renderer module. */
type CaravanRenderer = [
  (state: CaravanRenderState) => void,
  (state: CaravanRenderState, previous: number) => void,
  (state: CaravanRenderState, previous: number) => void,
  (state: CaravanRenderState) => void,
  (state: CaravanRenderState, face: number, previous?: number) => void,
  (
    state: CaravanRenderState,
    previousLane: number,
    previousBase: number,
  ) => void,
  () => void,
];

/** Renderer factory. */
type CaravanRendererFactory = (api: CaravanRendererApi) => CaravanRenderer;

/** Three-lane direction array. */
type CaravanDirections = Int8Array;

/** Stateless rules/CPU engine exposed as a compact function tuple. */
type CaravanEngine = [
  (card: number) => boolean,
  (caravans: CaravanCaravans) => boolean,
  (cards: CaravanCards) => number,
  (cards: CaravanCards, numberPosition: number) => number,
  (
    caravans: CaravanCaravans,
    directions: CaravanDirections,
    laneIndex: number,
    card: number,
  ) => number | boolean,
  (
    caravans: CaravanCaravans,
    directions: CaravanDirections,
    laneIndex: number,
    card: number,
  ) => void,
  (
    caravans: CaravanCaravans,
    directions: CaravanDirections,
    laneIndex: number,
    baseIndex: number,
    card: number,
    playerCaravans: CaravanCaravans,
    cpuCaravans: CaravanCaravans,
    playerDirections: CaravanDirections,
    cpuDirections: CaravanDirections,
  ) => number,
  (
    playerCaravans: CaravanCaravans,
    cpuCaravans: CaravanCaravans,
    turnCount: number,
    playerHand: number[],
    cpuHand: number[],
  ) => CaravanOutcome,
  (cpuDeck: number | boolean) => Uint8Array,
  (deck: Uint8Array) => Uint8Array,
  (deck: Uint8Array) => void,
  () => number,
  (
    hand: number[],
    cpuCaravans: CaravanCaravans,
    cpuDirections: CaravanDirections,
    playerCaravans: CaravanCaravans,
    playerDirections: CaravanDirections,
  ) => number,
];

/** Engine factory. */
type CaravanEngineFactory = () => CaravanEngine;

/** Gameplay audio module API tuple. */
type CaravanGameAudioApi = [typeof fs, string];

/** Gameplay audio controller. */
type CaravanGameAudio = [
  () => void,
  (kind: number) => void,
  () => void,
  () => void,
];

/** Gameplay audio factory. */
type CaravanGameAudioFactory = (api: CaravanGameAudioApi) => CaravanGameAudio;

/** Controls module API tuple. */
type CaravanControlsApi = [KnobHandler, KnobHandler];

/** Controls factory. */
type CaravanControlsFactory = (api: CaravanControlsApi) => number;

/** Match-controller API tuple. */
type CaravanGameApi = [
  typeof fs,
  string,
  string,
  ((outcome: CaravanOutcome) => void) | 0,
];

/** Resident gameplay controller. */
type CaravanGameModule = [
  () => void,
  (newOpponent?: string) => void,
  () => void,
  () => void,
];

/** Match-controller factory. */
type CaravanGameFactory = (api: CaravanGameApi) => CaravanGameModule;

/** Result-screen callback; optional opponent argument is used for new challenges. */
type CaravanResultCallback = ((newOpponent?: string) => void) | 0;

/** Result screen callback bundle. */
interface CaravanResultState {
  /** Match result. */
  outcome?: CaravanOutcome;
  /** Signed bottle-cap change. */
  delta?: number;
  /** Current opponent. */
  opponent?: string;
  /** Player bottle caps after the match. */
  funds?: number;
  /** Opponent bottle caps after the match. */
  opponentFunds?: number;
  /** Rematch callback. */
  onRematch?: CaravanResultCallback;
  /** New-opponent callback. */
  onNewOpponent?: CaravanResultCallback;
  /** Return-to-menu callback. */
  onBack?: CaravanResultCallback;
}

/** Result screen module. */
interface CaravanResultModule extends CaravanDisposable {
  /** Displays the Results screen. */
  show: (state: CaravanResultState) => void;
  /** Hides the Results screen and releases its input/audio. */
  hide: () => void;
}

/** Result factory. */
type CaravanResultFactory = (api: CaravanFileApi) => CaravanResultModule;

/** Post-game win-audio API tuple. */
type CaravanWinAudioApi = [typeof fs, string, CaravanOutcome, (() => void) | 0];

/** Post-game win-audio factory. */
type CaravanWinAudioFactory = (api: CaravanWinAudioApi) => CaravanDisposable;

/** Lazy module union returned by the match controller's generic loader. */
type CaravanLoadedModule = CaravanEngine | CaravanRenderer | CaravanGameAudio;

/** Type-only common callable shape for the resident game's lazy loader. */
type CaravanLoadedModuleFactory = (
  api?: CaravanRendererApi | CaravanGameAudioApi,
) => CaravanLoadedModule;

/**
 * Espruino API overloads used by Caravan's hardware-tested SFX path that are
 * not yet present in PR #113's shared declarations. These merge with the
 * repository ambient types and erase completely from the device build.
 */
interface EspruinoUtils {
  /** Returns the flat memory address of a typed-array backing buffer. */
  getAddressOf(value: ArrayBuffer | Uint8Array, flat?: boolean): number;
}

/** Writes a binary string directly to RAM; used by the proven SFX loader. */
declare function poke8(address: number, value: string): void;
