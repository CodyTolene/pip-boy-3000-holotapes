/** Fixed screen geometry for the Sudoku holotape, in pixels. */
interface SudokuLayout {
  /** Width and height of a single grid cell. */
  cell: number;
  /** Left edge of the 9x9 grid. */
  gridX: number;
  /** Top edge of the 9x9 grid. */
  gridY: number;
  /** Left edge of the status panel beside the grid. */
  panelX: number;
  /** Right edge of the status panel. */
  panelR: number;
  /** Horizontal centre of the status panel. */
  panelMid: number;
}
