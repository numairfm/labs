# Jukebox Mobile Interface & Premium Tools Design Spec

- **Date**: 2026-05-20
- **Author**: Antigravity (AI assistant)
- **Status**: Approved by User

---

## 1. Goal & Context

This design specification outlines the technical plan to upgrade the **Jukebox Hub** and its static client-side games and utilities to be fully compatible with mobile platforms. It focuses on beautiful neobrutalist styling, latency-free touch controls, and high-reliability client-side features.

### Objectives:
1. **Redesign the Jukebox Hub Interface:** Implement a premium responsive slide-out hamburger navigation drawer to hold search tools, filters, and theme toggles on mobile screens.
2. **Touch-Optimize the Game Suite:**
   * **Snake:** Implement a hybrid D-pad overlay with physical click depression alongside a gesture swipe detection engine, toggled directly in the game HUD.
   * **Doodle Jump:** Replace traditional touch buttons with intuitive screen-split tap regions (left/right halves) accompanied by elegant translucent indicator glows.
   * **GD Wave & Minesweeper:** Add scroll-locking during pointer interactions, preventing browser panning/zooming, and refining cell-tap registration.
3. **Downloaders Resiliency Upgrades (YouTube & Spotify):** Build an auto-rotating pool of 4 Cobalt mirrors that automatically switches mirrors upon network failure, timeout, or CORS blocks, saving the last active server to local storage.
4. **Mobile Drawing Optimization (Image BG Remover):** Map canvas click and touch events to high-resolution pixel positions, locking browser scroll states during manual brushing or color keys.

---

## 2. Directory Mapping & Architecture

```
src/
├── assets/
│   ├── css/
│   │   ├── main.css          # Design system variables & media breakpoints
│   │   └── components.css    # Unified drawer & neobrutalist animations
│   └── js/
│       ├── utils.js          # Theme toggles & dynamic toasts
│       └── manifest.json     # Auto-discovered tool registries
├── index.html                # Jukebox Hub Home Page
├── main.js                   # Homepage drawer scripting
└── tools/
    ├── snake/                # Snake Game (D-pad & swiping)
    ├── doodle-jump/          # Doodle Jump (Split-screen taps)
    ├── gd-wave/              # Geometry Dash Wave (Pointer events)
    ├── minesweeper/          # Minesweeper (Flag mode & long-press block)
    ├── image-bg-remover/     # BG Remover (Touch canvas scaling)
    ├── youtube-downloader/   # YouTube Downloader (Mirror rotation pool)
    └── spotify-downloader/   # Spotify Downloader (Vinyl turntable & mirror pool)
```

---

## 3. Detailed Specifications

### Section 1: Mobile Hub & Sliding Off-Canvas Menu
* **Hamburger Trigger:** Built using a three-bar CSS line vector button. On toggle, it transitions into an "X" via CSS rotations.
* **Neobrutalist Drawer:** Styled with `var(--bg-card)`, thick `2px` outlines, and a sharp solid shadow (`box-shadow: 4px 4px 0px hsl(0,0%,0%)`). It occupies `300px` width and slides in snappy from `right: -320px` to `right: 0` using CSS transition `transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)`.
* **Fading Overlay:** A dark, clickable backdrop overlay (`rgba(10, 10, 15, 0.6)`) that fades in synchronously. Tapping it slides the drawer back out.
* **Component Reshuffling:** Under `< 768px` screen widths, the main category chips, search bar, and theme toggle are moved into the drawer. On desktop, they automatically return to their standard inline horizontal headers.

### Section 2: Immersive Touch Controls for Games
1. **Snake (Hybrid Inputs):**
   * **Tactile D-pad:** On-screen keys with active states that translate `2px` down and lose their solid shadow on finger touch.
   * **Swipe Engine:** Captures coordinate deltas on canvas `touchstart`/`touchend` vectors:
     $$\Delta X = X_{\text{end}} - X_{\text{start}},\quad \Delta Y = Y_{\text{end}} - Y_{\text{start}}$$
     If $\max(|\Delta X|, |\Delta Y|) > 30\text{px}$, registers swipe. Toggles direction securely to prevent 180° instant-death.
   * **HUD Option Pill:** Toggles visually between "CONTROLS: DPAD" and "CONTROLS: SWIPE".
2. **Doodle Jump (Screen-Split Tap):**
   * **Immersive Playing Field:** Tapping left half of mobile screen maps to `ArrowLeft`, right half maps to `ArrowRight`.
   * **Tap Indicators:** Translucent glowing visual blocks at the bottom left and right corners illuminate satisfyingly during active touches.
3. **GD Wave & Minesweeper:**
   * **Bounce Locks:** Add standard listeners on game canvas touch inputs:
     ```javascript
     canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
     ```
     This blocks browser scrolling, keeping the viewport fully steady.
   * **Minesweeper Flag Bar:** Styled with tactile HSL button options, ensuring fast responsive digging or flagging. Blocks traditional right-click browser menu popups on cell long-presses.

### Section 3: High-Reliability Auto-Rotating Downloader Pool
* **The Mirrors Pool:**
  ```javascript
  const COBALT_MIRRORS = [
    'https://api.cobalt.tools',
    'https://cobalt.api.ryz.cx',
    'https://cobalt-api.kwiateknadziany.pl',
    'https://cobalt.api.g45.su'
  ];
  ```
* **Rotational Retries:** Wrap the POST network requests in a loop:
  1. Fetch using current mirror URL.
  2. If network fails or returns error state, log warning in retro logger screen: `[WARNING] Server failed. Rotating to <next_mirror>...`.
  3. Swap mirror index and try up to 3 times before declaring an error.
  4. Write the successful mirror URL to `localStorage.setItem('cobalt_instance', url)`.

### Section 4: Scale-Aware Touch Brushes for BG Remover
* **Touch-to-Canvas Pixel Translation:** Translate coordinates by calculating the scale ratio between physical pixel size and visual client dimension:
  $$X_{\text{canvas}} = (X_{\text{touch}} - \text{rect.left}) \times \frac{\text{canvas.width}}{\text{rect.width}}$$
  $$Y_{\text{canvas}} = (Y_{\text{touch}} - \text{rect.top}) \times \frac{\text{canvas.height}}{\text{rect.height}}$$
  This prevents brushing offsets on zoomed or resized device viewports.
* **Canvas Lock:** Prevent page scrolling when manual color key eraser brushes are actively dragging on touch monitors.

---

## 4. Verification & Validation Plan

### Automated Verification
* Verify `npm run build` bundles all tools cleanly without Vite warnings.

### Manual Mobile Verification
1. **Drawer UI:** Shrink screen below 768px. Tap hamburger. Ensure search, filter chips, and theme settings function correctly inside the drawer.
2. **Snake Game:** Start game on mobile view. Verify swipe controls and D-pad overlays trigger direction changes cleanly.
3. **Doodle Jump:** Tap left and right halves of the screen. Ensure the character moves and side lights flash.
4. **Downloaders:** Insert test links. Verify if rotation fallback catches offline servers and completes downloads cleanly.
5. **BG Remover:** Test manual color key selection and manual brush erasure on touch viewports. Verify no touch offsets or document scrolling occurs.
