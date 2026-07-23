# HAMCo LED Control

### Info

**Author(s):**

- [@joemto20-tech](https://github.com/joemto20-tech)

### Description

Radiation RGB color control and safe LED hardware tester for the Pip-Boy 3000.

### CONTROLS

Either knob: move up/down Left wheel press: select Any normal mode button: leave
the app and return to Pip-OS

### WHAT IT CONTROLS

The radiation lamp is true RGB and supports: Default, Red, Green, Blue, Cyan,
Purple, Amber, White, and Off.

The chosen radiation color remains active after leaving the app for the current
powered session. The choice is saved and reapplied whenever the app is opened. A
reboot loads normal Pip-OS lighting until the app is opened again.

"RESET DEFAULT + EXIT" removes the runtime override and immediately restores
standard Pip-OS LED behavior.

### DOWNWARD LIGHT LIMIT

LED_DOWNFIRE is one single hardware channel used by the charging system. It is
not an RGB lamp, so software cannot physically recolor it blue. The app can:

DEFAULT / CHARGE - preserve normal charging behavior (recommended) FORCED ON -
keep the factory-color downlight on FORCED OFF - keep it off

### OTHER LEDS FOUND

The hardware exposes these controllable outputs:

LED_RED, LED_GREEN, LED_BLUE LED_STATS, LED_ITEMS, LED_DATA LED_TORCH
LED_DOWNFIRE

Use "TEST OTHER LEDS" to preview them. Button/status LEDs and the torch are only
tested temporarily, then restored so the Pip-Boy keeps behaving normally.

### SAFETY

Default downlight mode is recommended because LED_DOWNFIRE communicates USB and
charging status. The radiation override does not replace the firmware's direct
critical-battery red pulse.
