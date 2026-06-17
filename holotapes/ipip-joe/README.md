iPip Media Player v1.3.0 – Joe Modifications to Cody Build

Base Version:

* Cody Update build

Current Version:

* Cody/Joe Hybrid build

FEATURE CHANGES

1. Added Upload-Order Song Sorting

* Added a third sort mode: UPLOAD.
* Original build only supported A-Z and Z-A sorting.
* Upload order is now the default mode.
* Added upload-order backup array (ao) to preserve the original file order.

2. Added Upload/A-Z/Z-A Sort Cycling

* Sort menu now cycles:
  UPLOAD → A-Z → Z-A → UPLOAD
* Previously only toggled:
  A-Z ↔ Z-A

3. Increased Filename/Path Limit

* Raised path-length limit from 56 characters to 200 characters.
* Longer song names that previously displayed "FILE NAME TOO LONG" now load and play normally.

4. Added Long Song Title Scrolling

* Added scrollTitle() system.
* Long titles now scroll across the currently-playing display area.
* Includes pause before scrolling begins.
* Continuously loops while the song is playing.

PLAYBACK CHANGES

5. Modified Song Selection Behavior

* Selecting an individual song now prepares sequential playback continuation.
* Current song position is tracked so playback can continue correctly afterward.

6. Modified Play-All Logic

* Play-all position is recalculated after sorting changes.
* Current song is preserved when sort order changes during playback.

7. Modified Audio-Stopped Callback

* Added delayed advancement during sequential playback.
* Play-all now advances through a timeout instead of immediately.
* Intended to reduce callback-related instability and crashes.

RANDOM PLAYBACK CHANGES

8. Reworked Random Queue Construction

* Random queue now builds manually from valid songs.
* Random playback continues to avoid replaying the current song immediately after reshuffle.

USER INTERFACE CHANGES

9. Simplified Main Menu Labels

* Removed:
  SHUFFLE PLAY ALL
  PLAY ALL (TOP-DOWN)
  BACK TO PLAYLISTS

* Replaced with:
  RANDOMIZE
  BACK

10. Updated Sort Menu Display

* Sort setting now displays:
  UPLOAD
  A-Z
  Z-A

instead of only:
A-Z
Z-A

11. Updated Playback Status Text

* Random mode status text updated to match RANDOMIZE terminology.

PERFORMANCE / RESPONSIVENESS CHANGES

12. Increased Wheel Responsiveness

* Thumbwheel debounce reduced from 50ms to 5ms.
* Wheel feels significantly more responsive.

13. Reduced Navigation Throttle

* Navigation throttle changed from 30ms to 0ms.
* Menu scrolling reacts immediately to wheel movement.

14. Increased Default Volume

* Startup volume increased from 20 to 27.

15. Increased Volume Overlay Visibility

* Volume display timeout increased from 1.5 seconds to 3 seconds.

INTERNAL CODE CHANGES

16. Added Upload-Order Backup Array

* Added:
  ao = []

* Stores original song order independently of active sort order.

17. Replaced Built-In Sort Method

* Original version used Array.sort().
* Hybrid version uses custom insertion sort logic.
* Allows upload-order preservation and sort-mode switching.

18. Added Scrolling Title State Variables

* Added:
  ts
  tsLast
  tsName

* Used by scrolling title system.

19. Modified Waveform Refresh Timer

* Waveform refresh timer now also updates scrolling titles during playback.

STABILITY CHANGES

20. Addressed Sort-Related Memory Issues

* Sort implementation changed to avoid some memory-related crashes encountered during development and testing.

21. Improved Sort/Playback Synchronization

* Sorting while playback is active now attempts to preserve the correct next-song position.

Overall Goal:

* Preserve Cody's original functionality while improving ease of use, adding upload-order playback, longer filename support, scrolling titles, improved responsiveness, and more flexible sorting behavior.
