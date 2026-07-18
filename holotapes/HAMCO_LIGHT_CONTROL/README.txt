HAMCo LED CONTROL v1.0.2
========================

PRIMARY INSTALL
---------------
Copy these folders to the ROOT of the Pip-Boy SD card:

  /APPINFO/LEDCOLOR.info
  /HOLO/LEDCOLOR/APP.JS
  /HOLO/LEDCOLOR/LED.JSON

The app should appear as "HAMCo LED Control" in your holotape/custom-app list.

FALLBACK INSTALL
----------------
If your firmware only lists USER apps, also copy:

  /USER_FALLBACK/LEDCOLOR.JS

to:

  /USER/LEDCOLOR.JS

Do not install both versions if both appear in your menus.

CONTROLS
--------
Right knob: move up/down
Left wheel press: select
Any normal mode button: leave the app and return to Pip-OS

WHAT IT CONTROLS
----------------
The radiation lamp is true RGB and supports:
Default, Red, Green, Blue, Cyan, Purple, Amber, White, and Off.

The chosen radiation color remains active after leaving the app for the current
powered session. The choice is saved and reapplied whenever the app is opened.
A reboot loads normal Pip-OS lighting until the app is opened again.

"RESET DEFAULT + EXIT" removes the runtime override and immediately restores
standard Pip-OS LED behavior.

DOWNWARD LIGHT LIMIT
--------------------
LED_DOWNFIRE is one single hardware channel used by the charging system. It is
not an RGB lamp, so software cannot physically recolor it blue. The app can:

  DEFAULT / CHARGE  - preserve normal charging behavior (recommended)
  FORCED ON         - keep the factory-color downlight on
  FORCED OFF        - keep it off

OTHER LEDS FOUND
----------------
The hardware exposes these controllable outputs:

  LED_RED, LED_GREEN, LED_BLUE
  LED_STATS, LED_ITEMS, LED_DATA
  LED_TORCH
  LED_DOWNFIRE

Use "TEST OTHER LEDS" to preview them. Button/status LEDs and the torch are only
tested temporarily, then restored so the Pip-Boy keeps behaving normally.

SAFETY
------
Default downlight mode is recommended because LED_DOWNFIRE communicates USB and
charging status. The radiation override does not replace the firmware's direct
critical-battery red pulse.


v1.0.2 FIX
- App cleanup is now re-entry safe on firmware that caches custom app objects.
- Restores the full screen clip and drawing colors on every launch.


RE-ENTRY LISTENER RESET (v1.0.2)
--------------------------------
On every launch, the app clears the previous LED Control runtime, removes its knob1/knob2 listeners, and cancels test timers before registering new controls.
