/*
 * CARAVAN - CARAVAN_CONTROLS.JS
 * One-shot gameplay control attachment.
 * Both wheels rotate for navigation; only the left-wheel press confirms.
 */
(function (api: CaravanControlsApi): number {
  const leftHandler = api[0],
    rightHandler = api[1];
  Pip.onExclusive('knob1', leftHandler);
  try {
    Pip.onExclusive('knob2', rightHandler);
  } catch (error) {
    Pip.removeListener('knob1', leftHandler);
    throw error;
  }
  return 1;
});
