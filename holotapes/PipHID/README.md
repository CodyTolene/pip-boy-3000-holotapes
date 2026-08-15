# PipHID

### Info

**Author:** Aidan Lee-Calamera (NightmareGoggles on the discord server)

**Website(s):**

- [Personal Site](http://AidansLab.com/)
- [GitHub](https://github.com/AidansLab)

### Description

Turns the Pip-Boy into a USB HID device for a computer, a PC, or anything else
that takes a USB keyboard. This is a port of the "EXT TERMINAL" attachment
(`submenuExtTerminal`) from the Pip-Boy 3000 Mk V firmware, with a full
on-screen keyboard added on top.

### Setup

USB HID only takes effect once the host re-enumerates the device, so:

1. Start the holotape. The screen shows `Connecting...` and
   `Please reconnect USB`.
2. Unplug the USB-C cable and plug it back in.
3. The key map appears as soon as the host accepts a report. The Pip-Boy is now
   a keyboard.

### Controls

**Key map screen**

- Scroll the front-left wheel (knob1) up/down to send the **UP** / **DOWN**
  arrow keys.
- Scroll the top-right wheel (knob2) left/right to send the **LEFT** / **RIGHT**
  arrow keys.
- Short-press the front-left wheel (knob1) to send **ENTER**.
- **STATS** cycles the box in the lower right through TAB, SPACE, DEL, BACK,
  HOME, END and ESC.
- **DATA** sends whichever of those keys is selected.
- Long-press the front-left wheel (knob1) to open the on-screen keyboard.
- **ITEMS** exits the holotape.

Each key lights up on the map as it is sent.

**Keyboard screen**

- Scroll knob2 to move along a row, scroll knob1 to change row.
- Short-press knob1 to type the highlighted key. It is sent to the host
  immediately, not buffered, the text box is only an echo of what you typed.
- Shift works as a toggle and applies to the next key you press.
- Choosing Enter sends ENTER and starts a fresh line.
- Long-press knob1 to close the keyboard and go back to the key map.
- **ITEMS** still exits the holotape.

### Notes

- STATS and DATA normally switch Pip-OS mode and would drop straight out of the
  app, so the holotape intercepts both while it is running. ITEMS is
  deliberately left alone as the way out.
- The keyboard sends keys by grid position plus a shift modifier, so the host's
  own layout decides the resulting character. On a keyboard layout other than
  the one the Pip-Boy draws, a few symbol keys will differ from the printed
  glyph.
- The Mk V used its TORCH button for ESC and TUNE UP / TUNE DOWN to change the
  selectable key. The Pip-Boy 3000 has no equivalent buttons, so ESC moved into
  the selectable key list and STATS / DATA took over selecting and sending.
- The display timeout is disabled while the holotape is running and restored on
  exit, so the Pip-Boy will not sleep mid-session.
- Exiting drops the HID profile and releases any held key. As with enabling it,
  the change only applies the next time the cable is re-plugged.
- While HID is active the USB serial console may be unavailable, so expect the
  Espruino Web IDE to disconnect.

### Credits

The original implementation is the `submenuExtTerminal` function from The Wand
Company's Pip-Boy 3000 Mk V firmware. This holotape is a port of that code as a
Pip-Boy 3000 holotape.
